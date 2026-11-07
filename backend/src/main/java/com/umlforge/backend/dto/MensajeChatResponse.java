package com.umlforge.backend.dto;

import tools.jackson.databind.JsonNode;
import com.umlforge.backend.entity.EstadoMensajeChat;
import com.umlforge.backend.entity.TipoEmisorChat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

public record MensajeChatResponse(
        Long id,
        Long proyectoId,
        Long emisorId,
        String emisorNombre,
        TipoEmisorChat tipoEmisor,
        String contenido,
        Instant fechaHora,
        EstadoMensajeChat estado,
        String correlacionId,
        JsonNode metadatos,
        List<AdjuntoChatResponse> adjuntos) {

    public MensajeChatResponse(Long id, Long proyectoId, Long emisorId, String emisorNombre,
            TipoEmisorChat tipoEmisor, String contenido, Instant fechaHora,
            EstadoMensajeChat estado, String correlacionId, JsonNode metadatos) {
        this(id, proyectoId, emisorId, emisorNombre, tipoEmisor, contenido, fechaHora,
                estado, correlacionId, metadatos, List.of());
    }

    public MensajeChatResponse(Long id, Long proyectoId, Long emisorId, String emisorNombre,
            TipoEmisorChat tipoEmisor, String contenido, LocalDateTime fechaHora,
            EstadoMensajeChat estado, String correlacionId, JsonNode metadatos) {
        this(id, proyectoId, emisorId, emisorNombre, tipoEmisor, contenido,
                fechaHora == null ? null : fechaHora.toInstant(ZoneOffset.UTC),
                estado, correlacionId, metadatos, List.of());
    }
}
