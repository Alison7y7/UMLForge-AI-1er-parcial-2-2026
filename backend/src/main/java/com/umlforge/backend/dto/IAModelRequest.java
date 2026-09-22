package com.umlforge.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record IAModelRequest(
    Long diagramaId,

    @NotBlank(message = "El prompt es obligatorio")
    @Size(max = 4000, message = "El prompt no puede superar 4000 caracteres")
    String prompt
) {}
