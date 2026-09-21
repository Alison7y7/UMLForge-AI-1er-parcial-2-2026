package com.umlforge.backend.dto;

public record DatabaseConfig(
    String host,
    Integer port,
    String databaseName,
    String username,
    String password
) {}
