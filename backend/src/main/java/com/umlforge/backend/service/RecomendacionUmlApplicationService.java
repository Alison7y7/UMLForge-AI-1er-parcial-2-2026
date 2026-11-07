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

import java.util.Iterator;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class RecomendacionUmlApplicationService {
    private static final Set<String> VISIBILITIES = Set.of("public", "private", "protected", "unspecified");
    private static final Set<String> RELATION_TYPES = Set.of(
            "ASOCIACION", "HERENCIA", "AGREGACION", "COMPOSICION", "GENERALIZACION", "DEPENDENCIA");

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

        Long originVersion = diagram.getVersion();
        if (!Objects.equals(originVersion, recommendation.versionDiagrama())) {
            throw new ResponseStatusException(CONFLICT,
                    "La recomendacion esta obsoleta porque el diagrama cambio desde que fue generada");
        }

        ObjectNode model = readModel(diagram.getModeloJson());
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
        applied.setVersionOrigen(originVersion);
        applied.setVersionResultado(resultVersion);
        appliedRepository.save(applied);

        String actorName = fullName(actor);
        bitacoraService.registrarAccion(actor, project, "APLICAR_RECOMENDACION_IA",
                actorName + " aplico " + recommendation.tipoCambio().name()
                        + " en el diagrama " + diagram.getNombre());

        ObjectNode metadata = mapper.createObjectNode();
        metadata.put("cu", "CU16");
        metadata.put("evento", "recomendacion_aplicada");
        metadata.put("recomendacionId", recommendationId);
        metadata.put("diagramaId", diagram.getId());
        metadata.put("diagramaVersion", resultVersion);
        metadata.put("aplicadaPorId", actor.getId());
        MensajeChatResponse systemMessage = chatService.persistirMensajeInterno(
                project, TipoEmisorChat.SISTEMA,
                actorName + " aplico la recomendacion UML: " + recommendation.descripcion(),
                EstadoMensajeChat.COMPLETADO, aiMessage.getCorrelacionId(), metadata);

        eventPublisher.publishEvent(new DiagramaActualizadoEvent(
                projectId, diagram.getId(), actor.getId(), actorName,
                recommendationId, resultVersion, diagram.getModeloJson()));

        return new AplicarRecomendacionResponse(recommendationId, diagram.getId(),
                originVersion, resultVersion, diagram.getModeloJson(), systemMessage);
    }

    private RecomendacionUml findPersistedRecommendation(MensajeChatProyecto message, String recommendationId) {
        try {
            JsonNode root = mapper.readTree(message.getMetadatos());
            for (JsonNode node : root.path("recomendaciones")) {
                if (!recommendationId.equals(node.path("id").asText())) continue;
                JsonNode affected = node.path("elementoAfectado");
                return new RecomendacionUml(
                        recommendationId,
                        node.path("diagramaId").longValue(),
                        node.path("versionDiagrama").isNumber() ? node.path("versionDiagrama").longValue() : null,
                        TipoCambioUml.valueOf(node.path("tipoCambio").asText()),
                        node.path("descripcion").asText(),
                        new RecomendacionUml.ElementoUmlAfectado(
                                TipoElementoUml.valueOf(affected.path("tipo").asText()),
                                affected.path("id").asText(), affected.path("nombre").asText()),
                        node.path("cambioPropuesto").deepCopy());
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
            case RENOMBRAR_CLASE -> {
                requireType(recommendation, TipoElementoUml.CLASE);
                ObjectNode target = requireClass(model, targetId);
                verifyOriginalName(target, recommendation);
                target.put("nombre", requiredText(proposal, "nombre", 120));
            }
            case AGREGAR_ATRIBUTO -> {
                requireType(recommendation, TipoElementoUml.CLASE);
                ObjectNode owner = requireClass(model, targetId);
                ObjectNode attribute = mapper.createObjectNode();
                attribute.put("id", UUID.randomUUID().toString());
                attribute.put("nombre", requiredText(proposal, "nombre", 120));
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
                method.put("nombre", requiredText(proposal, "nombre", 120));
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

    private void updateAttribute(ObjectNode model, RecomendacionUml recommendation, boolean remove) {
        requireType(recommendation, TipoElementoUml.ATRIBUTO);
        LocatedNode located = requireNested(model, "atributos", recommendation.elementoAfectado().id());
        verifyOriginalName(located.node(), recommendation);
        if (remove) { located.array().remove(located.index()); return; }
        JsonNode proposal = recommendation.cambioPropuesto();
        if (proposal.has("nombre")) located.node().put("nombre", requiredText(proposal, "nombre", 120));
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
        if (proposal.has("nombre")) located.node().put("nombre", requiredText(proposal, "nombre", 120));
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
        ObjectNode relation = mapper.createObjectNode();
        relation.put("id", UUID.randomUUID().toString());
        relation.put("origen", origin);
        relation.put("destino", destination);
        relation.put("tipo", allowedText(proposal, "tipo", "ASOCIACION", RELATION_TYPES));
        relation.put("nombre", text(proposal, "nombre", "", 120));
        relation.put("multiplicidadOrigen", text(proposal, "multiplicidadOrigen", "1", 30));
        relation.put("multiplicidadDestino", text(proposal, "multiplicidadDestino", "0..*", 30));
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
            if (proposal.has(field)) located.node().put(field, text(proposal, field, "", 120));
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

    private ObjectNode requireClass(ObjectNode model, String id) {
        return requireTopLevel((ArrayNode) model.path("clases"), id).node();
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

    private record LocatedNode(ObjectNode node, ArrayNode array, int index) {}
}
