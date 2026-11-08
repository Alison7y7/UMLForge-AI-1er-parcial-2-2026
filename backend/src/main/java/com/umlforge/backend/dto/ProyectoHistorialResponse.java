package com.umlforge.backend.dto;

import java.util.List;

public record ProyectoHistorialResponse(
        List<ProyectoHistorialEventoResponse> eventos,
        String siguienteCursor,
        boolean hayMas) {
}
