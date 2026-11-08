package com.umlforge.backend.dto;

import jakarta.validation.constraints.NotNull;

public record ElegirAlternativaRequest(@NotNull Long mensajeId) {
}
