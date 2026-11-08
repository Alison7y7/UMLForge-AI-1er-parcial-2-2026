package com.umlforge.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AplicarRecomendacionRequest(
        @NotNull @Positive Long mensajeId,
        boolean confirmarEliminacion) {
    public AplicarRecomendacionRequest(Long mensajeId) {
        this(mensajeId, false);
    }
}
