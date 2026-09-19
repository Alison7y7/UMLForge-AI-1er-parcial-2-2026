package com.umlforge.backend.controller;

import com.umlforge.backend.dto.ParticipanteRequest;
import com.umlforge.backend.dto.ParticipanteResponse;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.ParticipanteProyectoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proyectos/{proyectoId}/participantes")
@RequiredArgsConstructor
public class ParticipanteProyectoController {
    
    private final ParticipanteProyectoService participanteService;
    private final UsuarioRepository usuarioRepository;

    private Usuario getActor(Authentication authentication) {
        return usuarioRepository.findByCorreo(authentication.getName()).orElseThrow(() -> new RuntimeException("Usuario no autenticado"));
    }

    @GetMapping
    public ResponseEntity<List<ParticipanteResponse>> listarParticipantes(@PathVariable Long proyectoId, Authentication authentication) {
        return ResponseEntity.ok(participanteService.listarParticipantes(proyectoId, getActor(authentication)));
    }

    @PostMapping
    public ResponseEntity<ParticipanteResponse> agregarParticipante(@PathVariable Long proyectoId, @RequestBody ParticipanteRequest request, Authentication authentication) {
        return ResponseEntity.ok(participanteService.agregarParticipante(proyectoId, request, getActor(authentication)));
    }

    @DeleteMapping("/{usuarioId}")
    public ResponseEntity<Void> quitarParticipante(@PathVariable Long proyectoId, @PathVariable Long usuarioId, Authentication authentication) {
        participanteService.quitarParticipante(proyectoId, usuarioId, getActor(authentication));
        return ResponseEntity.noContent().build();
    }
}
