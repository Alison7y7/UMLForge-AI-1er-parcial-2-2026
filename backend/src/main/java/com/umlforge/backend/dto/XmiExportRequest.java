package com.umlforge.backend.dto;

public record XmiExportRequest(
    String nombre,
    XmiImportResponse modelo
) {}
