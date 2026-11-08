package com.umlforge.backend.controller;

import com.umlforge.backend.dto.ProyectoContinuidadResponse;
import com.umlforge.backend.dto.ProyectoHistorialResponse;
import com.umlforge.backend.service.ProyectoHistorialService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}")
@RequiredArgsConstructor
@Validated
public class ProyectoHistorialController {
    private final ProyectoHistorialService service;

    @GetMapping("/historial")
    public ProyectoHistorialResponse history(@PathVariable @Positive Long proyectoId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "30") @Min(1) @Max(50) int limite,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(required = false) Long participanteId,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String busqueda,
            @RequestParam(required = false) Long diagramaId,
            Authentication authentication) {
        return service.obtener(proyectoId, authentication.getName(), cursor, limite, desde, hasta,
                participanteId, tipo, busqueda, diagramaId);
    }

    @GetMapping("/continuidad")
    public ProyectoContinuidadResponse continuity(@PathVariable @Positive Long proyectoId,
            Authentication authentication) {
        return service.continuidad(proyectoId, authentication.getName());
    }
}
