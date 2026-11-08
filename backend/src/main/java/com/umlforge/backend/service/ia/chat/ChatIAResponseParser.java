package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.dto.RecomendacionUml;
import com.umlforge.backend.dto.HallazgoRevisionUml;
import com.umlforge.backend.dto.TipoCambioUml;
import com.umlforge.backend.dto.TipoElementoUml;
import com.umlforge.backend.entity.Diagrama;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.*;
import java.util.regex.Pattern;

@Component
public class ChatIAResponseParser {
    private static final int MAX_RESPONSE_LENGTH = 20000;
    private static final Pattern MULTIPLICITY = Pattern.compile("^(?:\\*|\\d+|\\d+\\.\\.(?:\\d+|\\*))$");
    private static final Set<String> RELATION_TYPES = Set.of(
            "ASOCIACION", "HERENCIA", "AGREGACION", "COMPOSICION", "GENERALIZACION", "DEPENDENCIA");
    private final ObjectMapper mapper;

    public ChatIAResponseParser(ObjectMapper mapper) { this.mapper = mapper; }

    public ChatIAParsedResponse parse(String raw, Diagrama diagrama) {
        try {
            String json = stripFence(raw);
            JsonNode root = mapper.readTree(json);
            String respuesta = root.path("respuesta").asText("").trim();
            if (respuesta.isBlank() || respuesta.length() > MAX_RESPONSE_LENGTH) {
                throw new ChatIAProviderException("Respuesta estructurada vacia o demasiado extensa");
            }
            ModelIndex elementos = indexar(diagrama.getModeloJson());
            List<RecomendacionUml> validas = new ArrayList<>();
            int descartadas = 0;
            JsonNode recomendaciones = root.path("recomendaciones");
            Set<String> clasesPropuestas = proposedClassNames(recomendaciones);
            if (recomendaciones.isArray()) {
                for (JsonNode node : recomendaciones) {
                    RecomendacionUml rec = validar(node, diagrama, elementos, clasesPropuestas);
                    if (rec == null) descartadas++; else validas.add(rec);
                }
            }
            return new ChatIAParsedResponse(respuesta, List.copyOf(validas), descartadas,
                    parseFindings(root.path("hallazgos"), elementos));
        } catch (ChatIAProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ChatIAProviderException("El proveedor no devolvio el contrato JSON requerido", e);
        }
    }

    private RecomendacionUml validar(JsonNode node, Diagrama diagrama,
            ModelIndex elementos, Set<String> clasesPropuestas) {
        try {
            TipoCambioUml cambio = TipoCambioUml.valueOf(node.path("tipoCambio").asText());
            TipoElementoUml tipo = TipoElementoUml.valueOf(node.path("elementoTipo").asText());
            String id = node.path("elementoId").asText("").trim();
            String descripcion = node.path("descripcion").asText("").trim();
            JsonNode propuesta = node.path("cambioPropuesto");
            boolean newClass = cambio == TipoCambioUml.AGREGAR_CLASE;
            if (cambio == TipoCambioUml.AGREGAR_RELACION) {
                return validateNewRelation(node, diagrama, elementos, clasesPropuestas, descripcion, propuesta);
            }
            String nombre = newClass ? propuesta.path("nombre").asText("").trim()
                    : elementos.byType().getOrDefault(tipo, Map.of()).get(id);
            if ((newClass && (tipo != TipoElementoUml.CLASE || nombre.isBlank()))
                    || (!newClass && nombre == null) || descripcion.isBlank() || descripcion.length() > 2000
                    || !propuesta.isObject() || propuesta.has("id")
                    || contieneReferenciaInvalida(propuesta, elementos, clasesPropuestas, newClass)) {
                return null;
            }
            return new RecomendacionUml(UUID.randomUUID().toString(), diagrama.getId(),
                    diagrama.getVersion(), cambio, descripcion,
                    new RecomendacionUml.ElementoUmlAfectado(tipo, id, nombre), propuesta.deepCopy());
        } catch (Exception e) {
            return null;
        }
    }

    private RecomendacionUml validateNewRelation(JsonNode node, Diagrama diagram, ModelIndex index,
            Set<String> proposedClasses, String description, JsonNode proposal) {
        if (node.path("elementoTipo").asText().isBlank() || description.isBlank()
                || description.length() > 2000 || !(proposal instanceof ObjectNode source)
                || proposal.has("id")) return null;
        String originReference = firstText(source, "origen", "origenId", "origenNombre");
        if (originReference.isBlank()) originReference = node.path("elementoId").asText("").trim();
        String destinationReference = firstText(source, "destino", "destinoId", "destinoNombre");
        String origin = resolveClassReference(originReference, index, proposedClasses);
        String destination = resolveClassReference(destinationReference, index, proposedClasses);
        String type = source.path("tipo").asText("ASOCIACION").trim().toUpperCase(Locale.ROOT);
        if (origin == null || destination == null || !RELATION_TYPES.contains(type)
                || !validMultiplicity(source.path("multiplicidadOrigen").asText("1"))
                || !validMultiplicity(source.path("multiplicidadDestino").asText("0..*"))) return null;

        ObjectNode normalized = source.deepCopy();
        normalized.put("origen", origin);
        normalized.put("destino", destination);
        normalized.put("origenNombre", classLabel(origin, originReference, index));
        normalized.put("destinoNombre", classLabel(destination, destinationReference, index));
        normalized.put("tipo", type);
        String originId = index.byType().get(TipoElementoUml.CLASE).containsKey(origin) ? origin : "";
        String originName = classLabel(origin, originReference, index);
        return new RecomendacionUml(UUID.randomUUID().toString(), diagram.getId(), diagram.getVersion(),
                TipoCambioUml.AGREGAR_RELACION, description,
                new RecomendacionUml.ElementoUmlAfectado(TipoElementoUml.CLASE, originId, originName), normalized);
    }

    private boolean contieneReferenciaInvalida(JsonNode propuesta,
            ModelIndex elementos, Set<String> clasesPropuestas, boolean allowProposedClasses) {
        Set<String> ids = new HashSet<>();
        elementos.byType().values().forEach(m -> ids.addAll(m.keySet()));
        return containsInvalidReference(propuesta, ids, elementos,
                allowProposedClasses ? clasesPropuestas : Set.of());
    }

    private boolean containsInvalidReference(JsonNode node, Set<String> ids, ModelIndex index,
            Set<String> proposedClasses) {
        if (node.isObject()) {
            for (String field : List.of("origen", "destino", "origenId", "destinoId", "claseId", "elementoId")) {
                JsonNode value = node.get(field);
                if (value != null && value.isTextual() && !ids.contains(value.asText())
                        && resolveClassReference(value.asText(), index, proposedClasses) == null) return true;
            }
            Iterator<Map.Entry<String, JsonNode>> fields = node.properties().iterator();
            while (fields.hasNext()) if (containsInvalidReference(fields.next().getValue(), ids, index, proposedClasses)) return true;
        } else if (node.isArray()) {
            for (JsonNode child : node) if (containsInvalidReference(child, ids, index, proposedClasses)) return true;
        }
        return false;
    }

    private List<HallazgoRevisionUml> parseFindings(JsonNode source,
            ModelIndex elements) {
        if (!source.isArray()) return List.of();
        List<HallazgoRevisionUml> result = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        elements.byType().values().forEach(values -> ids.addAll(values.keySet()));
        for (JsonNode node : source) {
            try {
                String elementId = node.path("elementoId").asText("").trim();
                if (!elementId.isBlank() && !ids.contains(elementId)) continue;
                String explanation = node.path("explicacion").asText("").trim();
                String evidence = node.path("evidencia").asText("").trim();
                String proposal = node.path("propuesta").asText("").trim();
                if (explanation.isBlank() || evidence.isBlank() || proposal.isBlank()) continue;
                result.add(new HallazgoRevisionUml(UUID.randomUUID().toString(),
                        HallazgoRevisionUml.Severidad.valueOf(node.path("severidad").asText()),
                        node.path("categoria").asText("DISEÑO"),
                        node.path("elementoTipo").asText("DIAGRAMA"), elementId,
                        node.path("elementoNombre").asText(""), explanation, evidence, proposal,
                        HallazgoRevisionUml.Estado.PENDIENTE));
            } catch (Exception ignored) { }
        }
        return List.copyOf(result);
    }

    private ModelIndex indexar(String modeloJson) throws Exception {
        Map<TipoElementoUml, Map<String, String>> result = new EnumMap<>(TipoElementoUml.class);
        Map<String, String> classNameToId = new HashMap<>();
        Set<String> ambiguousClassNames = new HashSet<>();
        for (TipoElementoUml tipo : TipoElementoUml.values()) result.put(tipo, new HashMap<>());
        JsonNode root = mapper.readTree(modeloJson == null || modeloJson.isBlank() ? "{}" : modeloJson);
        for (JsonNode clase : root.path("clases")) {
            agregar(result.get(TipoElementoUml.CLASE), clase);
            String classId = clase.path("id").asText("").trim();
            String className = clase.path("nombre").asText("").trim().toLowerCase(Locale.ROOT);
            if (!classId.isBlank() && !className.isBlank()) {
                String previous = classNameToId.putIfAbsent(className, classId);
                if (previous != null && !previous.equals(classId)) ambiguousClassNames.add(className);
            }
            for (JsonNode atributo : clase.path("atributos")) agregar(result.get(TipoElementoUml.ATRIBUTO), atributo);
            for (JsonNode metodo : clase.path("metodos")) agregar(result.get(TipoElementoUml.METODO), metodo);
        }
        for (JsonNode relacion : root.path("relaciones")) agregar(result.get(TipoElementoUml.RELACION), relacion);
        return new ModelIndex(result, classNameToId, ambiguousClassNames);
    }

    private Set<String> proposedClassNames(JsonNode recommendations) {
        Set<String> result = new HashSet<>();
        if (!recommendations.isArray()) return result;
        for (JsonNode recommendation : recommendations) {
            if (!"AGREGAR_CLASE".equals(recommendation.path("tipoCambio").asText())) continue;
            String name = recommendation.path("cambioPropuesto").path("nombre").asText("").trim();
            if (!name.isBlank()) result.add(name.toLowerCase(Locale.ROOT));
        }
        return result;
    }

    private String resolveClassReference(String reference, ModelIndex index, Set<String> proposedClasses) {
        if (reference == null || reference.isBlank()) return null;
        String trimmed = reference.trim();
        if (index.byType().get(TipoElementoUml.CLASE).containsKey(trimmed)) return trimmed;
        String normalized = trimmed.toLowerCase(Locale.ROOT);
        if (index.ambiguousClassNames().contains(normalized)) return null;
        String existingId = index.classNameToId().get(normalized);
        if (existingId != null) return existingId;
        return proposedClasses.contains(normalized) ? trimmed : null;
    }

    private String classLabel(String resolved, String original, ModelIndex index) {
        String existing = index.byType().get(TipoElementoUml.CLASE).get(resolved);
        return existing == null || existing.isBlank() ? original.trim() : existing;
    }

    private boolean validMultiplicity(String value) {
        return value == null || value.isBlank() || MULTIPLICITY.matcher(value.trim()).matches();
    }

    private String firstText(JsonNode source, String... fields) {
        for (String field : fields) {
            String value = source.path(field).asText("").trim();
            if (!value.isBlank()) return value;
        }
        return "";
    }

    private void agregar(Map<String, String> destino, JsonNode node) {
        String id = node.path("id").asText("").trim();
        if (!id.isBlank()) destino.put(id, node.path("nombre").asText(id));
    }

    private String stripFence(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.startsWith("```")) {
            int firstBreak = trimmed.indexOf('\n');
            int last = trimmed.lastIndexOf("```");
            if (firstBreak > 0 && last > firstBreak) return trimmed.substring(firstBreak + 1, last).trim();
        }
        return trimmed;
    }

    private record ModelIndex(Map<TipoElementoUml, Map<String, String>> byType,
            Map<String, String> classNameToId, Set<String> ambiguousClassNames) { }
}
