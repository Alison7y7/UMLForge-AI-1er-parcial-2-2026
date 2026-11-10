package com.umlforge.backend.service;

import java.util.Set;

public record PushNotificationEvent(String eventKey, PushCategory category, Long projectId,
        Long actorId, Set<Long> explicitRecipients, String title, String body, String url) {
    public static PushNotificationEvent invitation(String key, Long projectId, Long actorId,
            Long recipientId, String projectName) {
        return new PushNotificationEvent(key, PushCategory.INVITACION, projectId, actorId,
                Set.of(recipientId), "Invitación a un proyecto",
                "Te invitaron a colaborar en " + safe(projectName), "/proyectos");
    }
    private static String safe(String value) {
        if (value == null || value.isBlank()) return "un proyecto de UMLForge AI";
        return value.length() > 80 ? value.substring(0, 80) : value;
    }
}
