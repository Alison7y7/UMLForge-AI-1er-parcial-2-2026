package com.umlforge.backend.dto;

public record PushSettingsResponse(boolean configured, String publicKey, boolean subscribed,
        boolean invitaciones, boolean menciones, boolean recomendaciones, boolean cambiosUml) {}
