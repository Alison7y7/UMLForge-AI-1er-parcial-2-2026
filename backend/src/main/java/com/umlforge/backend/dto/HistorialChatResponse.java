package com.umlforge.backend.dto;

import java.util.List;

public record HistorialChatResponse(
        List<MensajeChatResponse> mensajes,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas,
        boolean ultima) {
}
