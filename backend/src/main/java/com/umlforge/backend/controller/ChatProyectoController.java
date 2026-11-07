package com.umlforge.backend.controller;

import com.umlforge.backend.dto.HistorialChatResponse;
import com.umlforge.backend.dto.MensajeChatRequest;
import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.service.ChatProyectoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}/chat/mensajes")
@RequiredArgsConstructor
@Validated
public class ChatProyectoController {

    private final ChatProyectoService chatProyectoService;

    @GetMapping
    public ResponseEntity<HistorialChatResponse> obtenerHistorial(
            @PathVariable @Positive Long proyectoId,
            @RequestParam(defaultValue = "0") @Min(0) int pagina,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int tamano,
            Authentication authentication) {
        return ResponseEntity.ok(chatProyectoService.obtenerHistorial(
                proyectoId, authentication.getName(), pagina, tamano));
    }

    @PostMapping
    public ResponseEntity<MensajeChatResponse> enviarMensaje(
            @PathVariable @Positive Long proyectoId,
            @Valid @RequestBody MensajeChatRequest request,
            Authentication authentication) {
        MensajeChatResponse response = chatProyectoService.enviarMensaje(
                proyectoId, request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/con-adjuntos", consumes = "multipart/form-data")
    public ResponseEntity<MensajeChatResponse> enviarMensajeConAdjuntos(
            @PathVariable @Positive Long proyectoId,
            @RequestPart(required = false) String contenido,
            @RequestPart(required = false) String metadatos,
            @RequestPart("archivos") List<MultipartFile> archivos,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                chatProyectoService.enviarMensajeConAdjuntos(
                        proyectoId, contenido, metadatos, archivos, authentication.getName()));
    }

}
