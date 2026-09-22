package com.umlforge.backend.service.ia;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.umlforge.backend.dto.UmlModelDto;

final class UmlJsonSupport {

    private UmlJsonSupport() {}

    static UmlModelDto parseModel(ObjectMapper objectMapper, String response) {
        if (response == null || response.isBlank()) {
            throw new IAProviderException("El proveedor devolvió una respuesta vacía");
        }

        String json = extractJson(response.trim());
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode modelNode = root.has("modelo") ? root.get("modelo") : root;
            return objectMapper.treeToValue(modelNode, UmlModelDto.class);
        } catch (JacksonException e) {
            throw new IAProviderException("El proveedor no devolvió un modelo UML JSON válido", e);
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
