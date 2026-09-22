package com.umlforge.backend.dto;

public record AnalisisImagenResponse(
    Long analisisId,
    String proveedor,
    UmlModelDto modelo,
    Integer tokensUsados
) {}
