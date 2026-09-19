package com.umlforge.backend.controller;

import com.umlforge.backend.dto.ProyectoRequest;
import com.umlforge.backend.dto.ProyectoResponse;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.ProyectoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proyectos")
@RequiredArgsConstructor
public class ProyectoController {
    
    private final ProyectoService proyectoService;
    private final UsuarioRepository usuarioRepository;

    private Usuario getActor(Authentication authentication) {
        return usuarioRepository.findByCorreo(authentication.getName()).orElseThrow(() -> new RuntimeException("Usuario no autenticado"));
    }

    @GetMapping
    public ResponseEntity<List<ProyectoResponse>> listarProyectos(Authentication authentication) {
        return ResponseEntity.ok(proyectoService.listarProyectos(getActor(authentication)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProyectoResponse> obtenerProyecto(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(proyectoService.obtenerProyecto(id, getActor(authentication)));
    }

    @PostMapping
    public ResponseEntity<ProyectoResponse> crearProyecto(@RequestBody ProyectoRequest request, Authentication authentication) {
        return ResponseEntity.ok(proyectoService.crearProyecto(request, getActor(authentication)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProyectoResponse> modificarProyecto(@PathVariable Long id, @RequestBody ProyectoRequest request, Authentication authentication) {
        return ResponseEntity.ok(proyectoService.modificarProyecto(id, request, getActor(authentication)));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<ProyectoResponse> cambiarEstadoProyecto(@PathVariable Long id, @RequestParam boolean activo, Authentication authentication) {
        return ResponseEntity.ok(proyectoService.cambiarEstadoProyecto(id, activo, getActor(authentication)));
    }
}
