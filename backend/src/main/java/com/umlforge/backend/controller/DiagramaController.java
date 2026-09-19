package com.umlforge.backend.controller;

import com.umlforge.backend.dto.DiagramaNombreRequest;
import com.umlforge.backend.dto.DiagramaRequest;
import com.umlforge.backend.dto.DiagramaResponse;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.DiagramaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DiagramaController {

    private final DiagramaService diagramaService;
    private final UsuarioRepository usuarioRepository;

    private Usuario getActor(Authentication authentication) {
        return usuarioRepository.findByCorreo(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no autenticado"));
    }

    @PostMapping("/proyectos/{proyectoId}/diagramas")
    public ResponseEntity<DiagramaResponse> crearDiagrama(
            @PathVariable Long proyectoId,
            @RequestBody DiagramaRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(diagramaService.crearDiagrama(proyectoId, request, getActor(authentication)));
    }

    @GetMapping("/proyectos/{proyectoId}/diagramas")
    public ResponseEntity<List<DiagramaResponse>> listarDiagramas(
            @PathVariable Long proyectoId,
            Authentication authentication) {
        return ResponseEntity.ok(diagramaService.listarDiagramas(proyectoId, getActor(authentication)));
    }

    @GetMapping("/diagramas/{id}")
    public ResponseEntity<DiagramaResponse> obtenerDiagrama(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(diagramaService.obtenerDiagrama(id, getActor(authentication)));
    }

    @PutMapping("/diagramas/{id}")
    public ResponseEntity<DiagramaResponse> modificarDiagrama(
            @PathVariable Long id,
            @RequestBody DiagramaRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(diagramaService.modificarDiagrama(id, request, getActor(authentication)));
    }

    @PatchMapping("/diagramas/{id}/nombre")
    public ResponseEntity<DiagramaResponse> cambiarNombre(
            @PathVariable Long id,
            @RequestBody DiagramaNombreRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(diagramaService.cambiarNombre(id, request.getNombre(), getActor(authentication)));
    }

    @PatchMapping("/diagramas/{id}/estado")
    public ResponseEntity<DiagramaResponse> cambiarEstado(
            @PathVariable Long id,
            @RequestParam boolean activo,
            Authentication authentication) {
        return ResponseEntity.ok(diagramaService.cambiarEstado(id, activo, getActor(authentication)));
    }
}
