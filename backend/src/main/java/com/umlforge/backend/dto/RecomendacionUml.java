package com.umlforge.backend.dto;

import tools.jackson.databind.JsonNode;

public record RecomendacionUml(
        String id,
        Long diagramaId,
        Long versionDiagrama,
        TipoCambioUml tipoCambio,
        String descripcion,
        ElementoUmlAfectado elementoAfectado,
        JsonNode cambioPropuesto) {

    public record ElementoUmlAfectado(
            TipoElementoUml tipo,
            String id,
            String nombre) {
    }
}
