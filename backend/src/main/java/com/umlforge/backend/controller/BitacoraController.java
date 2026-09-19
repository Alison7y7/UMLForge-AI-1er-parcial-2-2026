package com.umlforge.backend.controller;

import com.umlforge.backend.dto.BitacoraResponse;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.BitacoraService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bitacoras")
@RequiredArgsConstructor
public class BitacoraController {

    private final BitacoraService bitacoraService;
    private final UsuarioRepository usuarioRepository;

    private Usuario getActor(Authentication authentication) {
        return usuarioRepository.findByCorreo(authentication.getName()).orElseThrow(() -> new RuntimeException("Usuario no autenticado"));
    }

    @GetMapping
    public ResponseEntity<List<BitacoraResponse>> listarBitacoras(Authentication authentication) {
        Usuario actor = getActor(authentication);
        
        boolean puedeConsultarTodo = actor.getPermisos().stream().anyMatch(p -> p.getCodigo().equals("CONSULTAR_BITACORA"));
        if (puedeConsultarTodo) {
            return ResponseEntity.ok(bitacoraService.listarTodaLaBitacora());
        } else {
            return ResponseEntity.ok(bitacoraService.listarBitacoraPorAnfitrion(actor.getId()));
        }
    }
}
