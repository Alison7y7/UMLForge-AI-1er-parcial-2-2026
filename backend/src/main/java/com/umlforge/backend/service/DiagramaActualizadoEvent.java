package com.umlforge.backend.service;

public record DiagramaActualizadoEvent(
        Long proyectoId,
        Long diagramaId,
        Long usuarioId,
        String usuarioNombre,
        String recomendacionId,
        Long version,
        String modeloJson) {
}
