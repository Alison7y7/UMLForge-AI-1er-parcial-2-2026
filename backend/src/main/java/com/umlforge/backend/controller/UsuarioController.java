package com.umlforge.backend.controller;

import com.umlforge.backend.dto.UsuarioListResponse;
import com.umlforge.backend.dto.UsuarioRequest;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {
    
    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final com.umlforge.backend.repository.PermisoRepository permisoRepository;

    private Usuario getActor(Authentication authentication) {
        return usuarioRepository.findByCorreo(authentication.getName()).orElseThrow(() -> new RuntimeException("Usuario no autenticado"));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GESTIONAR_USUARIOS')")
    public ResponseEntity<List<UsuarioListResponse>> listarUsuarios() {
        return ResponseEntity.ok(usuarioService.listarUsuarios());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_USUARIOS')")
    public ResponseEntity<UsuarioListResponse> obtenerUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.obtenerUsuario(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GESTIONAR_USUARIOS')")
    public ResponseEntity<UsuarioListResponse> crearUsuario(@RequestBody UsuarioRequest request, Authentication authentication) {
        return ResponseEntity.ok(usuarioService.crearUsuario(request, getActor(authentication)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_USUARIOS')")
    public ResponseEntity<UsuarioListResponse> modificarUsuario(@PathVariable Long id, @RequestBody UsuarioRequest request, Authentication authentication) {
        return ResponseEntity.ok(usuarioService.modificarUsuario(id, request, getActor(authentication)));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('GESTIONAR_USUARIOS')")
    public ResponseEntity<UsuarioListResponse> cambiarEstadoUsuario(@PathVariable Long id, @RequestParam boolean activo, Authentication authentication) {
        return ResponseEntity.ok(usuarioService.cambiarEstadoUsuario(id, activo, getActor(authentication)));
    }

    @PutMapping("/{id}/accesos")
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<UsuarioListResponse> cambiarAccesosUsuario(@PathVariable Long id, @RequestBody com.umlforge.backend.dto.AccesosRequest request, Authentication authentication) {
        return ResponseEntity.ok(usuarioService.cambiarAccesosUsuario(id, request.getRolId(), request.getPermisos(), getActor(authentication), permisoRepository));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_USUARIOS')")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id, Authentication authentication) {
        usuarioService.eliminarUsuario(id, getActor(authentication));
        return ResponseEntity.noContent().build();
    }
}
