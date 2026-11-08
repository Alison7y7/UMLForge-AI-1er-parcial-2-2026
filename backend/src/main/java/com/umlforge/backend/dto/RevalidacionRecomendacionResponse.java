package com.umlforge.backend.dto;

public record RevalidacionRecomendacionResponse(
        String recomendacionId,
        Long diagramaId,
        Long versionOriginal,
        Long versionActual,
        boolean compatible,
        boolean pendienteDependencia,
        String dependenciaRequerida,
        String estado,
        String detalle) {
}
