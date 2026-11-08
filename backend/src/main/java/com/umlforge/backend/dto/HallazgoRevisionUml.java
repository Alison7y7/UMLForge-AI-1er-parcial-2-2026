package com.umlforge.backend.dto;

public record HallazgoRevisionUml(
        String id,
        Severidad severidad,
        String categoria,
        String elementoTipo,
        String elementoId,
        String elementoNombre,
        String explicacion,
        String evidencia,
        String propuesta,
        Estado estado) {

    public enum Severidad { ERROR, ADVERTENCIA, SUGERENCIA }
    public enum Estado { PENDIENTE, APLICADA, DESCARTADA, OBSOLETA }
}
