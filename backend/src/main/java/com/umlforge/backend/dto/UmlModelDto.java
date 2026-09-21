package com.umlforge.backend.dto;

import java.util.List;

public record UmlModelDto(
    List<UmlClass> clases,
    List<UmlRelation> relaciones
) {
    public record UmlClass(
        String id,
        String nombre,
        String estereotipo,
        double posicionX,
        double posicionY,
        List<UmlAttribute> atributos,
        List<UmlMethod> metodos
    ) {}

    public record UmlAttribute(
        String id,
        String nombre,
        String tipo,
        String visibilidad
    ) {}

    public record UmlMethod(
        String id,
        String nombre,
        String tipoRetorno,
        String visibilidad,
        List<UmlParameter> parametros
    ) {}

    public record UmlParameter(
        String nombre,
        String tipo
    ) {}

    public record UmlRelation(
        String id,
        String origen,
        String destino,
        String tipo,
        String nombre,
        String multiplicidadOrigen,
        String multiplicidadDestino
    ) {}
}
