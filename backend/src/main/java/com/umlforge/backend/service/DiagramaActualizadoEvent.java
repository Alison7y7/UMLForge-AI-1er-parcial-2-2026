package com.umlforge.backend.service;

public record DiagramaActualizadoEvent(
        Long proyectoId,
        Long diagramaId,
        Long usuarioId,
        String usuarioNombre,
        String changeId,
        String updateType,
        String diagramName,
        Long version,
        String modeloJson) {
}
