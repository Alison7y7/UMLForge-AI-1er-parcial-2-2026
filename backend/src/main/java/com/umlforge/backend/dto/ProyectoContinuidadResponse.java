package com.umlforge.backend.dto;

import java.time.Instant;
import java.util.List;

public record ProyectoContinuidadResponse(
        DiagramaContinuidad ultimoDiagrama,
        Instant ultimaActividad,
        List<ProyectoHistorialEventoResponse> cambiosRecientes,
        long recomendacionesPendientes,
        List<RecomendacionPendiente> pendientesRecientes) {

    public record DiagramaContinuidad(Long id, String nombre, Long version, Instant fechaActualizacion) {}
    public record RecomendacionPendiente(Long mensajeId, String recomendacionId, Long diagramaId,
            String descripcion, String estado) {}
}
