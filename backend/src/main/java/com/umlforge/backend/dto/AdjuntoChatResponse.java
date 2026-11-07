package com.umlforge.backend.dto;

import com.umlforge.backend.entity.CategoriaAdjuntoChat;

public record AdjuntoChatResponse(
        String id,
        String nombre,
        long tamanoBytes,
        String mimeType,
        CategoriaAdjuntoChat categoria,
        String contenidoUrl) {
}
