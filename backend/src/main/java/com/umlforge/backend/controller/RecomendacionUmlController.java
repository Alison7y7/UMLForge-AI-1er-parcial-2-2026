package com.umlforge.backend.controller;

import com.umlforge.backend.dto.AplicarRecomendacionRequest;
import com.umlforge.backend.dto.AplicarRecomendacionResponse;
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
}
