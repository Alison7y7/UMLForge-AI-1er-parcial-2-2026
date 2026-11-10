package com.umlforge.backend.dto;

import java.util.List;

public record ContextualHelpResponse(String answer, List<String> steps, List<HelpLink> links,
        String context, String source, boolean readOnly) {
    public record HelpLink(String label, String url) {}
}
