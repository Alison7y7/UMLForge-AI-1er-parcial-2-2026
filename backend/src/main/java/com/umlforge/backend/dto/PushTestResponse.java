package com.umlforge.backend.dto;

public record PushTestResponse(
        boolean success,
        int activeSubscriptions,
        int deliveredCount,
        int failedCount,
        String message
) {}
