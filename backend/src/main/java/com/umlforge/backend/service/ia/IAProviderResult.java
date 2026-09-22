package com.umlforge.backend.service.ia;

import com.umlforge.backend.dto.UmlModelDto;

public record IAProviderResult(
    UmlModelDto model,
    Integer tokensUsed
) {}
