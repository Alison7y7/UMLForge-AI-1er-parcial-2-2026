package com.umlforge.backend.service.ia;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import com.umlforge.backend.dto.UmlModelDto;

final class UmlJsonSupport {

    private static final double DEFAULT_X = 100.0;
    private static final double DEFAULT_Y = 100.0;
    private static final double HORIZONTAL_SPACING = 300.0;
    private static final double VERTICAL_SPACING = 250.0;
    private static final int GRID_COLUMNS = 3;

    private UmlJsonSupport() {}

    static UmlModelDto parseModel(ObjectMapper objectMapper, String response) {
        return parseModel(objectMapper, response, false);
    }

    static UmlModelDto parseOllamaModel(ObjectMapper objectMapper, String response) {
        return parseModel(objectMapper, response, true);
    }

    private static UmlModelDto parseModel(
            ObjectMapper objectMapper,
            String response,
            boolean normalizePositions) {
        if (response == null || response.isBlank()) {
            throw new IAProviderException("El proveedor devolvió una respuesta vacía");
        }

        String json = extractJson(response.trim());
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode modelNode = root.has("modelo") ? root.get("modelo") : root;
            if (normalizePositions) {
                normalizeClassPositions(modelNode);
            }
            return objectMapper.treeToValue(modelNode, UmlModelDto.class);
        } catch (JacksonException e) {
            throw new IAProviderException("El proveedor no devolvió un modelo UML JSON válido", e);
        }
    }

    private static void normalizeClassPositions(JsonNode modelNode) {
        if (modelNode == null) {
            return;
        }

        JsonNode classes = modelNode.get("clases");
        if (classes == null || !classes.isArray()) {
            return;
        }

        for (int index = 0; index < classes.size(); index++) {
            JsonNode classNode = classes.get(index);
            if (!(classNode instanceof ObjectNode umlClass)) {
                continue;
            }

            double defaultX = DEFAULT_X + (index % GRID_COLUMNS) * HORIZONTAL_SPACING;
            double defaultY = DEFAULT_Y + (index / GRID_COLUMNS) * VERTICAL_SPACING;
            putDefaultWhenMissingOrNull(umlClass, "posicionX", defaultX);
            putDefaultWhenMissingOrNull(umlClass, "posicionY", defaultY);
        }
    }

    private static void putDefaultWhenMissingOrNull(ObjectNode umlClass, String field, double value) {
        JsonNode coordinate = umlClass.get(field);
        if (coordinate == null || coordinate.isNull()) {
            umlClass.put(field, value);
        }
    }

    private static String extractJson(String value) {
        if (value.startsWith("```")) {
            int firstLineEnd = value.indexOf('\n');
            int closingFence = value.lastIndexOf("```");
            if (firstLineEnd >= 0 && closingFence > firstLineEnd) {
                return value.substring(firstLineEnd + 1, closingFence).trim();
            }
        }
        int objectStart = value.indexOf('{');
        int objectEnd = value.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            return value.substring(objectStart, objectEnd + 1);
        }
        return value;
    }
}
