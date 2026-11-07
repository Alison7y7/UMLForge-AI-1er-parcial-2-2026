package com.umlforge.backend.dto;

import java.time.Instant;

public record ActividadIAChatResponse(
        String solicitudId,
        Long usuarioId,
        String usuarioNombre,
        String estado,
        Instant fechaHora) {
}
