package com.umlforge.backend.service;

import com.umlforge.backend.dto.MensajeChatResponse;

public record MensajeChatPublicadoEvent(Long proyectoId, MensajeChatResponse mensaje) {
}
