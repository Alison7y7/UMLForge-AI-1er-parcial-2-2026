package com.umlforge.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContextualHelpRequest(@NotBlank @Size(max=500) String question,
        @Size(max=40) String context) {}
