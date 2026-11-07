package com.umlforge.backend.controller;

import com.umlforge.backend.dto.ActividadIAChatResponse;
import com.umlforge.backend.service.ChatIAActivityService;
import com.umlforge.backend.service.ProjectAccessService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}/chat/ia/estado")
@RequiredArgsConstructor
@Validated
public class ChatIAActivityController {
    private final ChatIAActivityService activityService;
    private final ProjectAccessService accessService;

    @GetMapping
    public ResponseEntity<List<ActividadIAChatResponse>> obtener(
            @PathVariable @Positive Long proyectoId, Authentication authentication) {
        accessService.requireProjectAccess(proyectoId, authentication.getName());
        return ResponseEntity.ok(activityService.snapshot(proyectoId));
    }
}
