package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.dto.RecomendacionUml;
import com.umlforge.backend.dto.TipoCambioUml;
import com.umlforge.backend.dto.TipoElementoUml;
import com.umlforge.backend.entity.Diagrama;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.*;

@Component
public class ChatIAResponseParser {
    private static final int MAX_RESPONSE_LENGTH = 20000;
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
            Map<TipoElementoUml, Map<String, String>> elementos = indexar(diagrama.getModeloJson());
            List<RecomendacionUml> validas = new ArrayList<>();
            int descartadas = 0;
            JsonNode recomendaciones = root.path("recomendaciones");
            if (recomendaciones.isArray()) {
                for (JsonNode node : recomendaciones) {
                    RecomendacionUml rec = validar(node, diagrama, elementos);
                    if (rec == null) descartadas++; else validas.add(rec);
                }
            }
            return new ChatIAParsedResponse(respuesta, List.copyOf(validas), descartadas);
        } catch (ChatIAProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ChatIAProviderException("El proveedor no devolvio el contrato JSON requerido", e);
        }
    }

    private RecomendacionUml validar(JsonNode node, Diagrama diagrama,
            Map<TipoElementoUml, Map<String, String>> elementos) {
        try {
            TipoCambioUml cambio = TipoCambioUml.valueOf(node.path("tipoCambio").asText());
            TipoElementoUml tipo = TipoElementoUml.valueOf(node.path("elementoTipo").asText());
            String id = node.path("elementoId").asText("").trim();
            String descripcion = node.path("descripcion").asText("").trim();
            JsonNode propuesta = node.path("cambioPropuesto");
            String nombre = elementos.getOrDefault(tipo, Map.of()).get(id);
            if (nombre == null || descripcion.isBlank() || descripcion.length() > 2000
                    || !propuesta.isObject() || propuesta.has("id") || contieneReferenciaInvalida(propuesta, elementos)) {
                return null;
            }
            return new RecomendacionUml(UUID.randomUUID().toString(), diagrama.getId(),
                    diagrama.getVersion(), cambio, descripcion,
                    new RecomendacionUml.ElementoUmlAfectado(tipo, id, nombre), propuesta.deepCopy());
        } catch (Exception e) {
            return null;
        }
    }

    private boolean contieneReferenciaInvalida(JsonNode propuesta,
            Map<TipoElementoUml, Map<String, String>> elementos) {
        Set<String> ids = new HashSet<>();
        elementos.values().forEach(m -> ids.addAll(m.keySet()));
        for (String campo : List.of("origen", "destino", "origenId", "destinoId", "claseId", "elementoId")) {
            JsonNode valor = propuesta.get(campo);
            if (valor != null && valor.isTextual() && !ids.contains(valor.asText())) return true;
        }
        return false;
    }

    private Map<TipoElementoUml, Map<String, String>> indexar(String modeloJson) throws Exception {
        Map<TipoElementoUml, Map<String, String>> result = new EnumMap<>(TipoElementoUml.class);
        for (TipoElementoUml tipo : TipoElementoUml.values()) result.put(tipo, new HashMap<>());
        JsonNode root = mapper.readTree(modeloJson == null || modeloJson.isBlank() ? "{}" : modeloJson);
        for (JsonNode clase : root.path("clases")) {
            agregar(result.get(TipoElementoUml.CLASE), clase);
            for (JsonNode atributo : clase.path("atributos")) agregar(result.get(TipoElementoUml.ATRIBUTO), atributo);
            for (JsonNode metodo : clase.path("metodos")) agregar(result.get(TipoElementoUml.METODO), metodo);
        }
        for (JsonNode relacion : root.path("relaciones")) agregar(result.get(TipoElementoUml.RELACION), relacion);
        return result;
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
}
