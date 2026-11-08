package com.umlforge.backend.dto;

import java.util.List;

public record AplicarLoteRecomendacionesResponse(
        Long diagramaId,
        Long versionAnterior,
        Long versionNueva,
        List<String> recomendacionesAplicadasIds,
        List<String> recomendacionesOmitidasIds,
        String modeloJson,
        MensajeChatResponse mensajeSistema) {
}
