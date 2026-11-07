package com.umlforge.backend.controller;

import com.umlforge.backend.dto.SolicitudIAChatRequest;
import com.umlforge.backend.dto.SolicitudIAChatResponse;
import com.umlforge.backend.entity.EstadoSolicitudIAChat;
import com.umlforge.backend.service.ChatIAProyectoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}/chat/ia/solicitudes")
@RequiredArgsConstructor
@Validated
public class ChatIAProyectoController {
    private final ChatIAProyectoService service;

    @PostMapping
    public ResponseEntity<SolicitudIAChatResponse> solicitar(
            @PathVariable @Positive Long proyectoId,
            @Valid @RequestBody SolicitudIAChatRequest request,
            Authentication authentication) {
        SolicitudIAChatResponse response = service.solicitar(proyectoId, request, authentication.getName());
        return response.estado() == EstadoSolicitudIAChat.ERROR
                ? ResponseEntity.status(502).body(response)
                : ResponseEntity.ok(response);
    }
}
