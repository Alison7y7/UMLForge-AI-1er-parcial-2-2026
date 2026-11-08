package com.umlforge.backend.dto;

import tools.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;

public record ProyectoHistorialEventoResponse(
        String id,
        String tipo,
        Instant fechaHora,
        Long participanteId,
        String participanteNombre,
        Long diagramaId,
        String diagramaNombre,
        String titulo,
        String detalle,
        String estado,
        JsonNode metadatos,
        List<AdjuntoChatResponse> adjuntos) {
}
