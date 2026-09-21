package com.umlforge.backend.dto;

public record BackendGenerationRequest(
    UmlModelDto umlModel,
    DatabaseConfig databaseConfig
) {}
