package com.umlforge.backend.dto;

public record IAModelResponse(
    Long peticionId,
    String proveedor,
    UmlModelDto modelo,
    Integer tokensUsados
) {}
