package com.umlforge.backend.dto;

import java.util.List;

public record HelpManualResponse(
        String title,
        String description,
        List<HelpTopic> topics,
        List<String> suggestedQuestions,
        boolean readOnly) {

    public record HelpTopic(
            String id,
            String title,
            String description,
            List<HelpArticle> articles) {}

    public record HelpArticle(
            String id,
            String title,
            String summary,
            String answer,
            List<String> steps,
            List<ContextualHelpResponse.HelpLink> links,
            List<String> contexts,
            List<String> searchTerms,
            String permissionNote) {}
}
