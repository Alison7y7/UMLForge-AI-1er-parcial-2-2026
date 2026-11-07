package com.umlforge.backend.dto;

import com.umlforge.backend.entity.EstadoSolicitudIAChat;

public record SolicitudIAChatResponse(
        String solicitudId,
        EstadoSolicitudIAChat estado,
        String proveedor,
        MensajeChatResponse mensaje) {
}
