package com.umlforge.backend.controller;

import com.umlforge.backend.service.ChatAttachmentService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}/chat/adjuntos")
@RequiredArgsConstructor
@Validated
public class ChatAttachmentController {
    private final ChatAttachmentService service;

    @GetMapping("/{adjuntoId}/contenido")
    public ResponseEntity<Resource> descargar(
            @PathVariable @Positive Long proyectoId,
            @PathVariable String adjuntoId,
            Authentication authentication) {
        return service.descargar(proyectoId, adjuntoId, authentication.getName());
    }
}
