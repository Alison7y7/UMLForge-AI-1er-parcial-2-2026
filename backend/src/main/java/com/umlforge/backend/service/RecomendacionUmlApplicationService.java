package com.umlforge.backend.service;

import com.umlforge.backend.dto.*;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.MensajeChatProyectoRepository;
import com.umlforge.backend.repository.RecomendacionAplicadaProyectoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.Collections;
import java.util.Iterator;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.Locale;
import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class RecomendacionUmlApplicationService {
    private static final Set<String> VISIBILITIES = Set.of("public", "private", "protected", "unspecified");
    private static final Set<String> RELATION_TYPES = Set.of(
            "ASOCIACION", "HERENCIA", "AGREGACION", "COMPOSICION", "GENERALIZACION", "DEPENDENCIA");
    private static final Pattern MULTIPLICITY = Pattern.compile("^(?:\\*|\\d+|\\d+\\.\\.(?:\\d+|\\*))$");

    private final ProjectAccessService accessService;
    private final MensajeChatProyectoRepository messageRepository;
    private final DiagramaRepository diagramRepository;
    private final RecomendacionAplicadaProyectoRepository appliedRepository;
    private final BitacoraService bitacoraService;
    private final ChatProyectoService chatService;
    private final ObjectMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public AplicarRecomendacionResponse aplicar(Long projectId, String recommendationId,
            AplicarRecomendacionRequest request, String email) {
        Usuario actor = accessService.requireUser(email);
        Proyecto project = accessService.requireProjectAccess(projectId, actor);
        requireEditPermission(actor);

        MensajeChatProyecto aiMessage = messageRepository.findById(request.mensajeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mensaje de IA no encontrado"));
        if (!projectId.equals(aiMessage.getProyecto().getId()) || aiMessage.getTipoEmisor() != TipoEmisorChat.IA) {
            throw new ResponseStatusException(NOT_FOUND, "La recomendacion no pertenece al proyecto");
        }

        RecomendacionUml recommendation = findPersistedRecommendation(aiMessage, recommendationId);
        Diagrama diagram = diagramRepository.findByIdForUpdate(recommendation.diagramaId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado"));
        if (!projectId.equals(diagram.getProyecto().getId()) || Boolean.FALSE.equals(diagram.getActivo())) {
            throw new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado en el proyecto");
        }
        if (appliedRepository.existsByMensajeIaIdAndRecomendacionId(aiMessage.getId(), recommendationId)) {
            throw new ResponseStatusException(CONFLICT, "La recomendacion ya fue aplicada");
        }

        Long currentVersion = diagram.getVersion();
        Long originalProposedVersion = recommendation.versionDiagrama();
        boolean sameVersion = Objects.equals(currentVersion, originalProposedVersion);

        ObjectNode model = readModel(diagram.getModeloJson());

        if (!sameVersion || recommendation.tipoCambio() == TipoCambioUml.AGREGAR_RELACION
                || recommendation.tipoCambio() == TipoCambioUml.AGREGAR_CLASE) {
            RevalidationResult reval = revalidateProposal(model, recommendation, aiMessage);
            if (!reval.compatible()) {
                throw new ResponseStatusException(CONFLICT,
                        "La recomendacion no es compatible con la version actual (" + currentVersion + ") del diagrama: " + reval.reason());
            }
        }

        if (recommendation.tipoCambio() == TipoCambioUml.ELIMINAR_CLASE && !request.confirmarEliminacion()) {
            long affectedRelations = countRelations(model, recommendation.elementoAfectado().id());
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY,
                    "La eliminacion requiere confirmacion especial; tambien eliminara "
                            + affectedRelations + " relacion(es) dependiente(s)");
        }

        applySupportedChange(model, recommendation);
        try {
            diagram.setModeloJson(mapper.writeValueAsString(model));
        } catch (JacksonException e) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "No se pudo serializar el modelo UML", e);
        }
        diagramRepository.saveAndFlush(diagram);
        Long resultVersion = diagram.getVersion();

        RecomendacionAplicadaProyecto applied = new RecomendacionAplicadaProyecto();
        applied.setRecomendacionId(recommendationId);
        applied.setMensajeIa(aiMessage);
        applied.setProyecto(project);
        applied.setDiagrama(diagram);
        applied.setAplicadaPor(actor);
        applied.setTipoCambio(recommendation.tipoCambio().name());
        applied.setVersionOrigen(currentVersion);
        applied.setVersionResultado(resultVersion);
        appliedRepository.save(applied);

        String actorName = fullName(actor);
        String versionTrace = sameVersion
                ? " (v" + currentVersion + " ➔ v" + resultVersion + ")"
                : " (propuesta original v" + originalProposedVersion + ", revalidada y aplicada sobre v" + currentVersion + " ➔ v" + resultVersion + ")";
        bitacoraService.registrarAccion(actor, project, "APLICAR_RECOMENDACION_IA",
                actorName + " aplico " + recommendation.tipoCambio().name()
                        + " en el diagrama " + diagram.getNombre() + versionTrace);

        ObjectNode metadata = mapper.createObjectNode();
        metadata.put("cu", "CU16");
        metadata.put("evento", "recomendacion_aplicada");
        metadata.put("recomendacionId", recommendationId);
        metadata.put("diagramaId", diagram.getId());
        metadata.put("diagramaVersion", resultVersion);
        metadata.put("versionOriginal", originalProposedVersion);
        metadata.put("versionEfectiva", currentVersion);
        metadata.put("aplicadaPorId", actor.getId());
        MensajeChatResponse systemMessage = chatService.persistirMensajeInterno(
                project, TipoEmisorChat.SISTEMA,
                actorName + " aplico la recomendacion UML: " + recommendation.descripcion() + versionTrace,
                EstadoMensajeChat.COMPLETADO, aiMessage.getCorrelacionId(), metadata);

        eventPublisher.publishEvent(new DiagramaActualizadoEvent(
                projectId, diagram.getId(), actor.getId(), actorName,
                recommendationId, "AI_RECOMMENDATION", diagram.getNombre(), resultVersion, diagram.getModeloJson()));

        return new AplicarRecomendacionResponse(recommendationId, diagram.getId(),
                currentVersion, resultVersion, diagram.getModeloJson(), systemMessage);
    }

    @Transactional(readOnly = true)
    public RevalidacionRecomendacionResponse revalidar(Long projectId, String recommendationId,
            Long messageId, String email) {
        Usuario actor = accessService.requireUser(email);
        accessService.requireProjectAccess(projectId, actor);

        MensajeChatProyecto aiMessage = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mensaje de IA no encontrado"));
        RecomendacionUml recommendation = findPersistedRecommendation(aiMessage, recommendationId);
        Diagrama diagram = diagramRepository.findById(recommendation.diagramaId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado"));

        boolean alreadyApplied = appliedRepository.existsByMensajeIaIdAndRecomendacionId(aiMessage.getId(), recommendationId);
        boolean alreadyDiscarded = isDiscarded(aiMessage, recommendationId);
        Long currentVersion = diagram.getVersion();
        Long originalVersion = recommendation.versionDiagrama();

        if (alreadyApplied) {
            return new RevalidacionRecomendacionResponse(recommendationId, diagram.getId(),
                    originalVersion, currentVersion, false, false, null, "APLICADA", "La recomendación ya fue aplicada");
        }
        if (alreadyDiscarded) {
            return new RevalidacionRecomendacionResponse(recommendationId, diagram.getId(),
                    originalVersion, currentVersion, false, false, null, "DESCARTADA", "La recomendación fue descartada");
        }

        ObjectNode model = readModel(diagram.getModeloJson());
        RevalidationResult result = revalidateProposal(model, recommendation, aiMessage);

        String estado = result.compatible() ? "COMPATIBLE"
                : (result.missingDependency() != null ? "PENDIENTE_DEPENDENCIA" : "OBSOLETA");

        return new RevalidacionRecomendacionResponse(recommendationId, diagram.getId(),
                originalVersion, currentVersion, result.compatible(),
                result.missingDependency() != null, result.missingDependency(),
                estado, result.reason());
    }

    @Transactional
    public AplicarLoteRecomendacionesResponse aplicarCompatibles(Long projectId, Long messageId, String email) {
        Usuario actor = accessService.requireUser(email);
        Proyecto project = accessService.requireProjectAccess(projectId, actor);
        requireEditPermission(actor);

        MensajeChatProyecto aiMessage = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mensaje de IA no encontrado"));
        if (!projectId.equals(aiMessage.getProyecto().getId()) || aiMessage.getTipoEmisor() != TipoEmisorChat.IA) {
            throw new ResponseStatusException(NOT_FOUND, "La recomendacion no pertenece al proyecto");
        }

        List<RecomendacionUml> recommendations = extractAllRecommendations(aiMessage);
        if (recommendations.isEmpty()) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "El mensaje no contiene recomendaciones");
        }

        Long diagramId = recommendations.get(0).diagramaId();
        Diagrama diagram = diagramRepository.findByIdForUpdate(diagramId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado"));
        if (!projectId.equals(diagram.getProyecto().getId()) || Boolean.FALSE.equals(diagram.getActivo())) {
            throw new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado en el proyecto");
        }

        Long versionAnterior = diagram.getVersion();
        ObjectNode model = readModel(diagram.getModeloJson());

        List<String> aplicadasIds = new ArrayList<>();
        List<String> omitidasIds = new ArrayList<>();

        List<RecomendacionUml> ordenadas = sortRecommendationsForBatch(recommendations);

        List<RecomendacionUml> pendientes = new ArrayList<>();
        for (RecomendacionUml rec : ordenadas) {
            if (appliedRepository.existsByMensajeIaIdAndRecomendacionId(aiMessage.getId(), rec.id())
                    || isDiscarded(aiMessage, rec.id())
                    || rec.tipoCambio() == TipoCambioUml.ELIMINAR_CLASE) {
                omitidasIds.add(rec.id());
            } else {
                pendientes.add(rec);
            }
        }
        boolean progress;
        do {
            progress = false;
            Iterator<RecomendacionUml> iterator = pendientes.iterator();
            while (iterator.hasNext()) {
                RecomendacionUml rec = iterator.next();
                RevalidationResult candidate = revalidateProposal(model, rec, aiMessage);
                if (candidate.compatible()) {
                    applySupportedChange(model, rec);
                    aplicadasIds.add(rec.id());
                    iterator.remove();
                    progress = true;
                } else if (candidate.missingDependency() == null) {
                    omitidasIds.add(rec.id());
                    iterator.remove();
                }
            }
        } while (progress && !pendientes.isEmpty());
        for (RecomendacionUml pending : pendientes) {
            omitidasIds.add(pending.id());
        }

        if (aplicadasIds.isEmpty()) {
            throw new ResponseStatusException(CONFLICT,
                    "Ninguna recomendación pendiente es compatible para aplicación en lote");
        }

        try {
            diagram.setModeloJson(mapper.writeValueAsString(model));
        } catch (JacksonException e) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "No se pudo serializar el modelo UML", e);
        }
        diagramRepository.saveAndFlush(diagram);
        Long versionNueva = diagram.getVersion();

        for (String recId : aplicadasIds) {
            RecomendacionUml rec = findPersistedRecommendation(aiMessage, recId);
            RecomendacionAplicadaProyecto applied = new RecomendacionAplicadaProyecto();
            applied.setRecomendacionId(recId);
            applied.setMensajeIa(aiMessage);
            applied.setProyecto(project);
            applied.setDiagrama(diagram);
            applied.setAplicadaPor(actor);
            applied.setTipoCambio(rec.tipoCambio().name());
            applied.setVersionOrigen(versionAnterior);
            applied.setVersionResultado(versionNueva);
            appliedRepository.save(applied);
        }

        String actorName = fullName(actor);
        bitacoraService.registrarAccion(actor, project, "APLICAR_RECOMENDACIONES_LOTE",
                actorName + " aplico en lote " + aplicadasIds.size() + " recomendaciones en el diagrama "
                        + diagram.getNombre() + " (v" + versionAnterior + " ➔ v" + versionNueva + ")");

        ObjectNode metadata = mapper.createObjectNode();
        metadata.put("cu", "CU16");
        metadata.put("evento", "recomendaciones_lote_aplicadas");
        metadata.put("diagramaId", diagram.getId());
        metadata.put("diagramaVersion", versionNueva);
        metadata.put("aplicadaPorId", actor.getId());
        ArrayNode idsArray = metadata.putArray("recomendacionesIds");
        aplicadasIds.forEach(idsArray::add);

        MensajeChatResponse systemMessage = chatService.persistirMensajeInterno(
                project, TipoEmisorChat.SISTEMA,
                actorName + " aplico en lote " + aplicadasIds.size() + " recomendaciones compatibles en "
                        + diagram.getNombre() + ".",
                EstadoMensajeChat.COMPLETADO, aiMessage.getCorrelacionId(), metadata);

        eventPublisher.publishEvent(new DiagramaActualizadoEvent(
                projectId, diagram.getId(), actor.getId(), actorName,
                String.join(",", aplicadasIds), "AI_RECOMMENDATION_BATCH", diagram.getNombre(), versionNueva, diagram.getModeloJson()));

        return new AplicarLoteRecomendacionesResponse(diagram.getId(), versionAnterior, versionNueva,
                aplicadasIds, omitidasIds, diagram.getModeloJson(), systemMessage);
    }

    @Transactional
    public MensajeChatResponse descartar(Long projectId, String recommendationId,
            AplicarRecomendacionRequest request, String email) {
        Usuario actor = accessService.requireUser(email);
        Proyecto project = accessService.requireProjectAccess(projectId, actor);
        MensajeChatProyecto aiMessage = messageRepository.findById(request.mensajeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mensaje de IA no encontrado"));
        if (!projectId.equals(aiMessage.getProyecto().getId()) || aiMessage.getTipoEmisor() != TipoEmisorChat.IA) {
            throw new ResponseStatusException(NOT_FOUND, "La recomendacion no pertenece al proyecto");
        }
        findPersistedRecommendation(aiMessage, recommendationId);
        if (appliedRepository.existsByMensajeIaIdAndRecomendacionId(aiMessage.getId(), recommendationId)) {
            throw new ResponseStatusException(CONFLICT, "La recomendacion ya fue aplicada");
        }
        try {
            JsonNode metadataNode = mapper.readTree(aiMessage.getMetadatos());
            if (!(metadataNode instanceof ObjectNode root)) {
                throw new ResponseStatusException(UNPROCESSABLE_ENTITY,
                        "La recomendacion persistida no tiene metadatos validos");
            }
            ArrayNode discarded = root.withArray("recomendacionesDescartadasIds");
            for (JsonNode value : discarded) {
                if (recommendationId.equals(value.asText())) {
                    throw new ResponseStatusException(CONFLICT, "La recomendacion ya fue descartada");
                }
            }
            discarded.add(recommendationId);
            aiMessage.setMetadatos(mapper.writeValueAsString(root));
            messageRepository.saveAndFlush(aiMessage);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "No se pudo actualizar la recomendacion", e);
        }
        String actorName = fullName(actor);
        ObjectNode metadata = mapper.createObjectNode();
        metadata.put("cu", "CU17");
        metadata.put("evento", "recomendacion_descartada");
        metadata.put("recomendacionId", recommendationId);
        metadata.put("descartadaPorId", actor.getId());
        bitacoraService.registrarAccion(actor, project, "DESCARTAR_RECOMENDACION_IA",
                actorName + " descarto una recomendacion UML sin modificar el diagrama");
        return chatService.persistirMensajeInterno(project, TipoEmisorChat.SISTEMA,
                actorName + " descarto una recomendacion UML.", EstadoMensajeChat.COMPLETADO,
                aiMessage.getCorrelacionId(), metadata);
    }

    private RecomendacionUml deserializeRecommendation(JsonNode node) {
        JsonNode affected = node.path("elementoAfectado");
        return new RecomendacionUml(
                node.path("id").asText(),
                node.path("diagramaId").longValue(),
                node.path("versionDiagrama").isNumber() ? node.path("versionDiagrama").longValue() : null,
                TipoCambioUml.valueOf(node.path("tipoCambio").asText()),
                node.path("descripcion").asText(),
                new RecomendacionUml.ElementoUmlAfectado(
                        TipoElementoUml.valueOf(affected.path("tipo").asText()),
                        affected.path("id").asText(), affected.path("nombre").asText()),
                node.path("cambioPropuesto").deepCopy());
    }

    private RecomendacionUml findPersistedRecommendation(MensajeChatProyecto message, String recommendationId) {
        try {
            JsonNode root = mapper.readTree(message.getMetadatos());
            for (JsonNode node : root.path("recomendaciones")) {
                if (!recommendationId.equals(node.path("id").asText())) continue;
                return deserializeRecommendation(node);
            }
        } catch (Exception e) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY,
                    "La recomendacion persistida no tiene un formato valido", e);
        }
        throw new ResponseStatusException(NOT_FOUND, "Recomendacion no encontrada en el mensaje original");
    }

    private ObjectNode readModel(String json) {
        try {
            JsonNode parsed = mapper.readTree(json == null || json.isBlank()
                    ? "{\"clases\":[],\"relaciones\":[]}" : json);
            if (!(parsed instanceof ObjectNode root)
                    || !(root.path("clases") instanceof ArrayNode)
                    || !(root.path("relaciones") instanceof ArrayNode)) {
                throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "El modelo UML persistido es invalido");
            }
            return root;
        } catch (JacksonException e) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "El modelo UML persistido es invalido", e);
        }
    }

    private void applySupportedChange(ObjectNode model, RecomendacionUml recommendation) {
        JsonNode proposal = recommendation.cambioPropuesto();
        if (!proposal.isObject() || proposal.has("id")) invalid("La propuesta contiene datos no permitidos");
        String targetId = recommendation.elementoAfectado().id();
        switch (recommendation.tipoCambio()) {
            case AGREGAR_CLASE -> addClass(model, recommendation);
            case RENOMBRAR_CLASE -> {
                requireType(recommendation, TipoElementoUml.CLASE);
                ObjectNode target = requireClass(model, targetId);
                verifyOriginalName(target, recommendation);
                String newName = requiredText(proposal, "nombre", 120);
                requireUniqueClassName(model, newName, targetId);
                target.put("nombre", newName);
            }
            case ELIMINAR_CLASE -> deleteClass(model, recommendation);
            case AGREGAR_ATRIBUTO -> {
                requireType(recommendation, TipoElementoUml.CLASE);
                ObjectNode owner = requireClass(model, targetId);
                ObjectNode attribute = mapper.createObjectNode();
                attribute.put("id", UUID.randomUUID().toString());
                String name = requiredText(proposal, "nombre", 120);
                requireUniqueMember(owner.withArray("atributos"), name, null, "atributo");
                attribute.put("nombre", name);
                attribute.put("tipo", requiredText(proposal, "tipo", 120));
                attribute.put("visibilidad", allowedText(proposal, "visibilidad", "private", VISIBILITIES));
                attribute.put("origenTipo", "SUGERIDO");
                ((ArrayNode) owner.withArray("atributos")).add(attribute);
            }
            case MODIFICAR_ATRIBUTO -> updateAttribute(model, recommendation, false);
            case ELIMINAR_ATRIBUTO -> updateAttribute(model, recommendation, true);
            case AGREGAR_METODO -> {
                requireType(recommendation, TipoElementoUml.CLASE);
                ObjectNode owner = requireClass(model, targetId);
                ObjectNode method = mapper.createObjectNode();
                method.put("id", UUID.randomUUID().toString());
                String name = requiredText(proposal, "nombre", 120);
                requireUniqueMember(owner.withArray("metodos"), name, null, "metodo");
                method.put("nombre", name);
                method.put("tipoRetorno", text(proposal, "tipoRetorno", "void", 120));
                method.put("visibilidad", allowedText(proposal, "visibilidad", "public", VISIBILITIES));
                JsonNode parameters = proposal.path("parametros");
                method.set("parametros", parameters.isArray() ? sanitizeParameters(parameters) : mapper.createArrayNode());
                ((ArrayNode) owner.withArray("metodos")).add(method);
            }
            case MODIFICAR_METODO -> updateMethod(model, recommendation, false);
            case ELIMINAR_METODO -> updateMethod(model, recommendation, true);
            case AGREGAR_RELACION -> addRelation(model, recommendation);
            case MODIFICAR_RELACION -> updateRelation(model, recommendation, false);
            case ELIMINAR_RELACION -> updateRelation(model, recommendation, true);
            case OTRO -> invalid("El tipo de recomendacion no admite aplicacion automatica");
        }
    }

    private void addClass(ObjectNode model, RecomendacionUml recommendation) {
        requireType(recommendation, TipoElementoUml.CLASE);
        JsonNode proposal = recommendation.cambioPropuesto();
        String name = requiredText(proposal, "nombre", 120);
        requireUniqueClassName(model, name, null);
        String classId = UUID.randomUUID().toString();
        ObjectNode umlClass = mapper.createObjectNode();
        umlClass.put("id", classId);
        umlClass.put("nombre", name);
        umlClass.put("estereotipo", text(proposal, "estereotipo", "", 80));
        umlClass.put("posicionX", boundedNumber(proposal, "posicionX", 120));
        umlClass.put("posicionY", boundedNumber(proposal, "posicionY", 120));
        umlClass.set("atributos", sanitizeNewMembers(proposal.path("atributos"), true));
        umlClass.set("metodos", sanitizeNewMembers(proposal.path("metodos"), false));
        ((ArrayNode) model.path("clases")).add(umlClass);

        JsonNode relations = proposal.path("relaciones");
        if (relations.isArray()) {
            if (relations.size() > 30) invalid("La propuesta contiene demasiadas relaciones");
            for (JsonNode relationProposal : relations) {
                if (!(relationProposal instanceof ObjectNode)) invalid("La relacion propuesta es invalida");
                ObjectNode normalized = (ObjectNode) relationProposal.deepCopy();
                normalized.put("origen", classId);
                addRelationFromProposal(model, normalized);
            }
        }
    }

    private ArrayNode sanitizeNewMembers(JsonNode source, boolean attributes) {
        ArrayNode result = mapper.createArrayNode();
        if (!source.isArray()) return result;
        if (source.size() > 50) invalid("La propuesta contiene demasiados miembros");
        Set<String> names = new HashSet<>();
        for (JsonNode member : source) {
            String name = requiredText(member, "nombre", 120);
            if (!names.add(name.toLowerCase(Locale.ROOT))) invalid("La propuesta contiene miembros duplicados");
            ObjectNode clean = mapper.createObjectNode();
            clean.put("id", UUID.randomUUID().toString());
            clean.put("nombre", name);
            clean.put("visibilidad", allowedText(member, "visibilidad", attributes ? "private" : "public", VISIBILITIES));
            if (attributes) {
                clean.put("tipo", requiredText(member, "tipo", 120));
                clean.put("origenTipo", "SUGERIDO");
            } else {
                clean.put("tipoRetorno", text(member, "tipoRetorno", "void", 120));
                clean.set("parametros", member.path("parametros").isArray()
                        ? sanitizeParameters(member.path("parametros")) : mapper.createArrayNode());
            }
            result.add(clean);
        }
        return result;
    }

    private int boundedNumber(JsonNode source, String field, int fallback) {
        JsonNode value = source.get(field);
        if (value == null) return fallback;
        if (!value.isNumber()) invalid("El campo " + field + " es invalido");
        return Math.max(-10000, Math.min(10000, value.intValue()));
    }

    private void deleteClass(ObjectNode model, RecomendacionUml recommendation) {
        requireType(recommendation, TipoElementoUml.CLASE);
        LocatedNode located = requireTopLevel((ArrayNode) model.path("clases"), recommendation.elementoAfectado().id());
        verifyOriginalName(located.node(), recommendation);
        String id = located.node().path("id").asText();
        located.array().remove(located.index());
        ArrayNode relations = (ArrayNode) model.path("relaciones");
        for (int index = relations.size() - 1; index >= 0; index--) {
            JsonNode relation = relations.get(index);
            if (id.equals(relation.path("origen").asText()) || id.equals(relation.path("destino").asText())) {
                relations.remove(index);
            }
        }
    }

    private long countRelations(ObjectNode model, String classId) {
        long count = 0;
        for (JsonNode relation : model.path("relaciones")) {
            if (classId.equals(relation.path("origen").asText())
                    || classId.equals(relation.path("destino").asText())) count++;
        }
        return count;
    }

    private void updateAttribute(ObjectNode model, RecomendacionUml recommendation, boolean remove) {
        requireType(recommendation, TipoElementoUml.ATRIBUTO);
        LocatedNode located = requireNested(model, "atributos", recommendation.elementoAfectado().id());
        verifyOriginalName(located.node(), recommendation);
        if (remove) { located.array().remove(located.index()); return; }
        JsonNode proposal = recommendation.cambioPropuesto();
        if (proposal.has("nombre")) {
            String name = requiredText(proposal, "nombre", 120);
            requireUniqueMember(located.array(), name, located.node().path("id").asText(), "atributo");
            located.node().put("nombre", name);
        }
        if (proposal.has("tipo")) located.node().put("tipo", requiredText(proposal, "tipo", 120));
        if (proposal.has("visibilidad")) located.node().put("visibilidad",
                allowedText(proposal, "visibilidad", "private", VISIBILITIES));
        located.node().put("origenTipo", "SUGERIDO");
    }

    private void updateMethod(ObjectNode model, RecomendacionUml recommendation, boolean remove) {
        requireType(recommendation, TipoElementoUml.METODO);
        LocatedNode located = requireNested(model, "metodos", recommendation.elementoAfectado().id());
        verifyOriginalName(located.node(), recommendation);
        if (remove) { located.array().remove(located.index()); return; }
        JsonNode proposal = recommendation.cambioPropuesto();
        if (proposal.has("nombre")) {
            String name = requiredText(proposal, "nombre", 120);
            requireUniqueMember(located.array(), name, located.node().path("id").asText(), "metodo");
            located.node().put("nombre", name);
        }
        if (proposal.has("tipoRetorno")) located.node().put("tipoRetorno", text(proposal, "tipoRetorno", "void", 120));
        if (proposal.has("visibilidad")) located.node().put("visibilidad",
                allowedText(proposal, "visibilidad", "public", VISIBILITIES));
        if (proposal.has("parametros")) located.node().set("parametros", sanitizeParameters(proposal.path("parametros")));
    }

    private void addRelation(ObjectNode model, RecomendacionUml recommendation) {
        requireType(recommendation, TipoElementoUml.CLASE);
        JsonNode proposal = recommendation.cambioPropuesto();
        String origin = text(proposal, "origen", recommendation.elementoAfectado().id(), 80);
        String destination = requiredText(proposal, "destino", 80);
        requireClass(model, origin);
        requireClass(model, destination);
        ObjectNode normalized = (ObjectNode) proposal.deepCopy();
        normalized.put("origen", origin);
        addRelationFromProposal(model, normalized);
    }

    private void addRelationFromProposal(ObjectNode model, JsonNode proposal) {
        String origin = requiredText(proposal, "origen", 80);
        String destination = requiredText(proposal, "destino", 80);
        ObjectNode originClass = requireClass(model, origin);
        ObjectNode destinationClass = requireClass(model, destination);
        String originId = originClass.path("id").asText();
        String destinationId = destinationClass.path("id").asText();
        String type = allowedText(proposal, "tipo", "ASOCIACION", RELATION_TYPES);
        String name = text(proposal, "nombre", "", 120);
        requireUniqueRelation(model, originId, destinationId, type, name, null);
        ObjectNode relation = mapper.createObjectNode();
        relation.put("id", UUID.randomUUID().toString());
        relation.put("origen", originId);
        relation.put("destino", destinationId);
        relation.put("tipo", type);
        relation.put("nombre", name);
        relation.put("multiplicidadOrigen", multiplicity(proposal, "multiplicidadOrigen", "1"));
        relation.put("multiplicidadDestino", multiplicity(proposal, "multiplicidadDestino", "0..*"));
        ((ArrayNode) model.path("relaciones")).add(relation);
    }

    private void updateRelation(ObjectNode model, RecomendacionUml recommendation, boolean remove) {
        requireType(recommendation, TipoElementoUml.RELACION);
        LocatedNode located = requireTopLevel((ArrayNode) model.path("relaciones"), recommendation.elementoAfectado().id());
        if (remove) { located.array().remove(located.index()); return; }
        JsonNode proposal = recommendation.cambioPropuesto();
        if (proposal.has("origen")) { String value = requiredText(proposal, "origen", 80); requireClass(model, value); located.node().put("origen", value); }
        if (proposal.has("destino")) { String value = requiredText(proposal, "destino", 80); requireClass(model, value); located.node().put("destino", value); }
        if (proposal.has("tipo")) located.node().put("tipo", allowedText(proposal, "tipo", "ASOCIACION", RELATION_TYPES));
        for (String field : Set.of("nombre", "multiplicidadOrigen", "multiplicidadDestino", "rolOrigen", "rolDestino")) {
            if (proposal.has(field)) located.node().put(field,
                    field.startsWith("multiplicidad") ? multiplicity(proposal, field, "") : text(proposal, field, "", 120));
        }
        requireUniqueRelation(model,
                located.node().path("origen").asText(),
                located.node().path("destino").asText(),
                located.node().path("tipo").asText("ASOCIACION"),
                located.node().path("nombre").asText(""),
                located.node().path("id").asText());
    }

    private String multiplicity(JsonNode source, String field, String fallback) {
        String value = text(source, field, fallback, 30);
        if (!value.isBlank() && !MULTIPLICITY.matcher(value).matches()) invalid("La multiplicidad no es valida");
        return value;
    }

    private void requireUniqueClassName(ObjectNode model, String name, String exceptId) {
        for (JsonNode candidate : model.path("clases")) {
            if (!candidate.path("id").asText().equals(exceptId)
                    && candidate.path("nombre").asText().equalsIgnoreCase(name)) {
                throw new ResponseStatusException(CONFLICT, "Ya existe una clase con ese nombre");
            }
        }
    }

    private void requireUniqueMember(ArrayNode members, String name, String exceptId, String kind) {
        for (JsonNode candidate : members) {
            if (!candidate.path("id").asText().equals(exceptId)
                    && candidate.path("nombre").asText().equalsIgnoreCase(name)) {
                throw new ResponseStatusException(CONFLICT, "Ya existe un " + kind + " con ese nombre");
            }
        }
    }

    private void requireUniqueRelation(ObjectNode model, String origin, String destination,
            String type, String name, String exceptId) {
        for (JsonNode candidate : model.path("relaciones")) {
            if (!candidate.path("id").asText().equals(exceptId)
                    && origin.equals(candidate.path("origen").asText())
                    && destination.equals(candidate.path("destino").asText())
                    && type.equals(candidate.path("tipo").asText())
                    && name.equalsIgnoreCase(candidate.path("nombre").asText())) {
                throw new ResponseStatusException(CONFLICT, "La relacion propuesta ya existe");
            }
        }
    }

    private ArrayNode sanitizeParameters(JsonNode source) {
        if (!source.isArray() || source.size() > 30) invalid("Los parametros del metodo son invalidos");
        ArrayNode result = mapper.createArrayNode();
        for (JsonNode parameter : source) {
            ObjectNode clean = mapper.createObjectNode();
            clean.put("nombre", requiredText(parameter, "nombre", 120));
            clean.put("tipo", requiredText(parameter, "tipo", 120));
            result.add(clean);
        }
        return result;
    }

    private ObjectNode findClass(ObjectNode model, String id, String name) {
        if (model == null || !(model.path("clases") instanceof ArrayNode classes)) return null;
        ObjectNode nameMatch = null;
        for (JsonNode candidate : classes) {
            if (!(candidate instanceof ObjectNode object)) continue;
            if (id != null && !id.isBlank() && id.equals(object.path("id").asText())) {
                return object;
            }
            if (name != null && !name.isBlank() && name.equalsIgnoreCase(object.path("nombre").asText())) {
                if (nameMatch != null) return null;
                nameMatch = object;
            }
        }
        return nameMatch;
    }

    private ObjectNode requireClass(ObjectNode model, String idOrName) {
        ObjectNode found = findClass(model, idOrName, idOrName);
        if (found != null) {
            return found;
        }
        throw new ResponseStatusException(CONFLICT, "El elemento afectado ya no existe en el modelo");
    }

    private LocatedNode requireNested(ObjectNode model, String field, String id) {
        for (JsonNode classNode : model.path("clases")) {
            if (!(classNode instanceof ObjectNode owner)) continue;
            ArrayNode array = owner.withArray(field);
            for (int index = 0; index < array.size(); index++) {
                JsonNode candidate = array.get(index);
                if (candidate instanceof ObjectNode object && id.equals(object.path("id").asText())) {
                    return new LocatedNode(object, array, index);
                }
            }
        }
        throw new ResponseStatusException(CONFLICT, "El elemento afectado ya no existe en el modelo");
    }

    private LocatedNode requireTopLevel(ArrayNode array, String id) {
        for (int index = 0; index < array.size(); index++) {
            JsonNode candidate = array.get(index);
            if (candidate instanceof ObjectNode object && id.equals(object.path("id").asText())) {
                return new LocatedNode(object, array, index);
            }
        }
        throw new ResponseStatusException(CONFLICT, "El elemento afectado ya no existe en el modelo");
    }

    private void verifyOriginalName(ObjectNode node, RecomendacionUml recommendation) {
        String expected = recommendation.elementoAfectado().nombre();
        if (expected != null && !expected.isBlank() && !expected.equals(node.path("nombre").asText())) {
            throw new ResponseStatusException(CONFLICT, "El elemento afectado cambio desde que se genero la recomendacion");
        }
    }

    private void requireType(RecomendacionUml recommendation, TipoElementoUml expected) {
        if (recommendation.elementoAfectado().tipo() != expected) invalid("La recomendacion no coincide con el tipo de elemento");
    }

    private String requiredText(JsonNode node, String field, int max) {
        String value = text(node, field, "", max);
        if (value.isBlank()) invalid("El campo " + field + " es obligatorio");
        return value;
    }

    private String text(JsonNode node, String field, String fallback, int max) {
        JsonNode valueNode = node.get(field);
        String value = valueNode == null ? fallback : valueNode.asText("").trim();
        if (value.length() > max || value.contains("\u0000")) invalid("El campo " + field + " es invalido");
        return value;
    }

    private String allowedText(JsonNode node, String field, String fallback, Set<String> allowed) {
        String value = text(node, field, fallback, 40);
        if (!allowed.contains(value)) invalid("El campo " + field + " no contiene un valor soportado");
        return value;
    }

    private void requireEditPermission(Usuario user) {
        boolean roleAllowed = user.getRol() != null
                && Set.of("ADMIN", "ANFITRION", "COLABORADOR").contains(user.getRol().getNombre());
        boolean explicit = user.getPermisos().stream().anyMatch(p -> "EDITAR_DIAGRAMAS".equals(p.getCodigo()));
        boolean rolePermission = user.getRol() != null && user.getRol().getPermisos().stream()
                .anyMatch(p -> "EDITAR_DIAGRAMAS".equals(p.getCodigo()));
        if (!roleAllowed && !explicit && !rolePermission) {
            throw new org.springframework.security.access.AccessDeniedException("No tiene permiso para editar diagramas");
        }
    }

    private String fullName(Usuario user) {
        String full = ((user.getNombre() == null ? "" : user.getNombre()) + " "
                + (user.getApellido() == null ? "" : user.getApellido())).trim();
        return full.isBlank() ? user.getCorreo() : full;
    }

    private void invalid(String message) {
        throw new ResponseStatusException(UNPROCESSABLE_ENTITY, message);
    }

    public record RevalidationResult(boolean compatible, String missingDependency, String reason) {
        public static RevalidationResult ok() {
            return new RevalidationResult(true, null, "La recomendación es compatible con el modelo actual");
        }

        public static RevalidationResult fail(String reason) {
            return new RevalidationResult(false, null, reason);
        }

        public static RevalidationResult dependency(String reason, String dep) {
            return new RevalidationResult(false, dep, reason);
        }
    }

    private boolean isDiscarded(MensajeChatProyecto aiMessage, String recommendationId) {
        if (aiMessage.getMetadatos() == null || aiMessage.getMetadatos().isBlank()) return false;
        try {
            JsonNode meta = mapper.readTree(aiMessage.getMetadatos());
            JsonNode discarded = meta.path("recomendacionesDescartadasIds");
            if (discarded.isArray()) {
                for (JsonNode item : discarded) {
                    if (recommendationId.equals(item.asText())) return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    private List<RecomendacionUml> extractAllRecommendations(MensajeChatProyecto aiMessage) {
        if (aiMessage.getMetadatos() == null || aiMessage.getMetadatos().isBlank()) {
            return Collections.emptyList();
        }
        try {
            JsonNode root = mapper.readTree(aiMessage.getMetadatos());
            JsonNode recsNode = root.path("recomendaciones");
            if (!recsNode.isArray()) return Collections.emptyList();
            List<RecomendacionUml> result = new ArrayList<>();
            for (JsonNode item : recsNode) {
                result.add(deserializeRecommendation(item));
            }
            return result;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<RecomendacionUml> sortRecommendationsForBatch(List<RecomendacionUml> list) {
        List<RecomendacionUml> result = new ArrayList<>(list);
        result.sort((a, b) -> {
            int priorityA = getBatchPriority(a);
            int priorityB = getBatchPriority(b);
            return Integer.compare(priorityA, priorityB);
        });
        return result;
    }

    private int getBatchPriority(RecomendacionUml r) {
        if (r.tipoCambio() == TipoCambioUml.AGREGAR_CLASE) {
            JsonNode relations = r.cambioPropuesto() != null ? r.cambioPropuesto().path("relaciones") : null;
            if (relations == null || !relations.isArray() || relations.isEmpty()) {
                return 1;
            }
            return 2;
        }
        if (r.tipoCambio() == TipoCambioUml.AGREGAR_ATRIBUTO || r.tipoCambio() == TipoCambioUml.AGREGAR_METODO) return 3;
        if (r.tipoCambio() == TipoCambioUml.AGREGAR_RELACION) return 4;
        if (r.tipoCambio() == TipoCambioUml.MODIFICAR_ATRIBUTO || r.tipoCambio() == TipoCambioUml.MODIFICAR_METODO) return 5;
        if (r.tipoCambio() == TipoCambioUml.RENOMBRAR_CLASE) return 6;
        return 7;
    }

    private RevalidationResult revalidateProposal(ObjectNode model, RecomendacionUml recommendation, MensajeChatProyecto aiMessage) {
        JsonNode proposal = recommendation.cambioPropuesto();
        List<RecomendacionUml> allRecs = extractAllRecommendations(aiMessage);
        Set<String> pendingProposedClasses = allRecs.stream()
                .filter(r -> !r.id().equals(recommendation.id())
                        && r.tipoCambio() == TipoCambioUml.AGREGAR_CLASE
                        && !appliedRepository.existsByMensajeIaIdAndRecomendacionId(aiMessage.getId(), r.id())
                        && !isDiscarded(aiMessage, r.id()))
                .map(r -> {
                    JsonNode p = r.cambioPropuesto();
                    String n = p != null && p.has("nombre") ? p.path("nombre").asText() : r.elementoAfectado().nombre();
                    return n != null ? n.trim().toLowerCase(Locale.ROOT) : "";
                })
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());

        switch (recommendation.tipoCambio()) {
            case AGREGAR_CLASE -> {
                String className = proposal != null && proposal.has("nombre")
                        ? proposal.path("nombre").asText().trim()
                        : (recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().nombre() : "");
                if (className == null || className.isBlank()) {
                    return RevalidationResult.fail("La clase propuesta no especifica un nombre válido");
                }
                if (findClass(model, null, className) != null) {
                    return RevalidationResult.fail("La clase '" + className + "' ya existe en el modelo actual");
                }
                JsonNode relations = proposal != null ? proposal.path("relaciones") : null;
                if (relations != null && relations.isArray()) {
                    for (JsonNode rel : relations) {
                        String dest = rel.path("destino").asText("");
                        if (dest.isBlank()) dest = rel.path("destinoNombre").asText("");
                        if (!dest.isBlank() && findClass(model, dest, dest) == null) {
                            if (pendingProposedClasses.contains(dest.toLowerCase(Locale.ROOT))) {
                                return RevalidationResult.dependency(
                                        "Requiere que la clase '" + dest + "' sea creada primero", dest);
                            } else {
                                return RevalidationResult.fail(
                                        "La clase destino '" + dest + "' de la relación no existe en el diagrama");
                            }
                        }
                    }
                }
                return RevalidationResult.ok();
            }
            case AGREGAR_RELACION -> {
                String origen = proposal.has("origen") ? proposal.path("origen").asText() : (recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().id() : "");
                if (origen.isBlank()) origen = proposal.path("origenNombre").asText("");
                String destino = proposal.path("destino").asText("");
                if (destino.isBlank()) destino = proposal.path("destinoNombre").asText("");

                ObjectNode originClass = findClass(model, origen, origen);
                if (originClass == null) {
                    if (pendingProposedClasses.contains(origen.toLowerCase(Locale.ROOT))) {
                        return RevalidationResult.dependency(
                                "Requiere que la clase origen '" + origen + "' sea creada primero", origen);
                    }
                    return RevalidationResult.fail("La clase origen '" + origen + "' no existe en el diagrama");
                }
                ObjectNode destinationClass = findClass(model, destino, destino);
                if (destinationClass == null) {
                    if (pendingProposedClasses.contains(destino.toLowerCase(Locale.ROOT))) {
                        return RevalidationResult.dependency(
                                "Requiere que la clase destino '" + destino + "' sea creada primero", destino);
                    }
                    return RevalidationResult.fail("La clase destino '" + destino + "' no existe en el diagrama");
                }
                String relationType = proposal.path("tipo").asText("ASOCIACION").toUpperCase(Locale.ROOT);
                if (!RELATION_TYPES.contains(relationType)) {
                    return RevalidationResult.fail("El tipo de relacion propuesto no es valido");
                }
                for (String field : List.of("multiplicidadOrigen", "multiplicidadDestino")) {
                    String value = proposal.path(field).asText("").trim();
                    if (!value.isBlank() && !MULTIPLICITY.matcher(value).matches()) {
                        return RevalidationResult.fail("La multiplicidad '" + value + "' no es valida");
                    }
                }
                String relationName = proposal.path("nombre").asText("");
                for (JsonNode current : model.path("relaciones")) {
                    if (originClass.path("id").asText().equals(current.path("origen").asText())
                            && destinationClass.path("id").asText().equals(current.path("destino").asText())
                            && relationType.equals(current.path("tipo").asText())
                            && relationName.equalsIgnoreCase(current.path("nombre").asText(""))) {
                        return RevalidationResult.fail("La relacion propuesta ya existe en el modelo actual");
                    }
                }
                return RevalidationResult.ok();
            }
            case RENOMBRAR_CLASE -> {
                String targetId = recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().id() : null;
                String targetName = recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().nombre() : null;
                ObjectNode target = findClass(model, targetId, targetName);
                if (target == null) {
                    return RevalidationResult.fail("La clase a renombrar ya no existe en el modelo");
                }
                String newName = proposal.path("nombre").asText().trim();
                ObjectNode existingWithNewName = findClass(model, null, newName);
                if (existingWithNewName != null && !target.path("id").asText().equals(existingWithNewName.path("id").asText())) {
                    return RevalidationResult.fail("Ya existe otra clase con el nombre '" + newName + "'");
                }
                return RevalidationResult.ok();
            }
            case ELIMINAR_CLASE -> {
                String targetId = recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().id() : null;
                String targetName = recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().nombre() : null;
                if (findClass(model, targetId, targetName) == null) {
                    return RevalidationResult.fail("La clase a eliminar ya no existe en el modelo");
                }
                return RevalidationResult.ok();
            }
            case AGREGAR_ATRIBUTO, MODIFICAR_ATRIBUTO, ELIMINAR_ATRIBUTO,
                 AGREGAR_METODO, MODIFICAR_METODO, ELIMINAR_METODO -> {
                String targetId = recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().id() : null;
                String targetName = recommendation.elementoAfectado() != null ? recommendation.elementoAfectado().nombre() : null;
                if (findClass(model, targetId, targetName) == null) {
                    return RevalidationResult.fail("La clase contenedora ya no existe en el modelo");
                }
                return RevalidationResult.ok();
            }
            default -> {
                return RevalidationResult.ok();
            }
        }
    }

    private record LocatedNode(ObjectNode node, ArrayNode array, int index) {}
}
