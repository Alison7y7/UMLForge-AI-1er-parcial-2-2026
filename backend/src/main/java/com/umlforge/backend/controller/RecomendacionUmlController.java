package com.umlforge.backend.controller;

import com.umlforge.backend.dto.AplicarLoteRecomendacionesResponse;
import com.umlforge.backend.dto.AplicarRecomendacionRequest;
import com.umlforge.backend.dto.AplicarRecomendacionResponse;
import com.umlforge.backend.dto.RevalidacionRecomendacionResponse;
import com.umlforge.backend.service.RecomendacionUmlApplicationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}/chat/recomendaciones")
@RequiredArgsConstructor
@Validated
public class RecomendacionUmlController {
    private final RecomendacionUmlApplicationService service;

    @PostMapping("/{recomendacionId}/aplicar")
    public ResponseEntity<AplicarRecomendacionResponse> aplicar(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @NotBlank String recomendacionId,
            @Valid @RequestBody AplicarRecomendacionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.aplicar(
                proyectoId, recomendacionId, request, authentication.getName()));
    }

    @PostMapping("/{recomendacionId}/descartar")
    public ResponseEntity<com.umlforge.backend.dto.MensajeChatResponse> descartar(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @NotBlank String recomendacionId,
            @Valid @RequestBody AplicarRecomendacionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.descartar(
                proyectoId, recomendacionId, request, authentication.getName()));
    }

    @GetMapping("/{recomendacionId}/revalidar")
    public ResponseEntity<RevalidacionRecomendacionResponse> revalidar(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @NotBlank String recomendacionId,
            @RequestParam @Positive Long mensajeId,
            Authentication authentication) {
        return ResponseEntity.ok(service.revalidar(
                proyectoId, recomendacionId, mensajeId, authentication.getName()));
    }

    @PostMapping("/{recomendacionId}/revalidar")
    public ResponseEntity<RevalidacionRecomendacionResponse> revalidarPost(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @NotBlank String recomendacionId,
            @Valid @RequestBody AplicarRecomendacionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.revalidar(
                proyectoId, recomendacionId, request.mensajeId(), authentication.getName()));
    }

    @PostMapping("/mensajes/{mensajeId}/aplicar-compatibles")
    public ResponseEntity<AplicarLoteRecomendacionesResponse> aplicarCompatibles(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @Positive Long mensajeId,
            Authentication authentication) {
        return ResponseEntity.ok(service.aplicarCompatibles(
                proyectoId, mensajeId, authentication.getName()));
    }

    @PostMapping("/alternativas/{alternativaId}/elegir")
    public ResponseEntity<com.umlforge.backend.dto.MensajeChatResponse> elegirAlternativa(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @NotBlank String alternativaId,
            @Valid @RequestBody com.umlforge.backend.dto.ElegirAlternativaRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.elegirAlternativa(
                proyectoId, request.mensajeId(), alternativaId, authentication.getName()));
    }

    @PostMapping("/alternativas/{alternativaId}/descartar")
    public ResponseEntity<com.umlforge.backend.dto.MensajeChatResponse> descartarAlternativa(
            @PathVariable @Positive Long proyectoId,
            @PathVariable @NotBlank String alternativaId,
            @Valid @RequestBody com.umlforge.backend.dto.ElegirAlternativaRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.descartarAlternativa(
                proyectoId, request.mensajeId(), alternativaId, authentication.getName()));
    }
}
