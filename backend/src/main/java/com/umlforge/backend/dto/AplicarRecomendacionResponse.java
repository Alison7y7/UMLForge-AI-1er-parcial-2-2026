package com.umlforge.backend.dto;

public record AplicarRecomendacionResponse(
        String recomendacionId,
        Long diagramaId,
        Long versionAnterior,
        Long versionNueva,
        String modeloJson,
        MensajeChatResponse mensajeSistema) {
}
