package com.umlforge.backend.dto;

public record PushPreferencesRequest(boolean invitaciones, boolean menciones,
        boolean recomendaciones, boolean cambiosUml) {}
