package com.umlforge.backend.controller;

import com.umlforge.backend.dto.RolRequest;
import com.umlforge.backend.dto.RolResponse;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.RolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolController {
    
    private final RolService rolService;
    private final UsuarioRepository usuarioRepository;

    private Usuario getActor(Authentication authentication) {
        return usuarioRepository.findByCorreo(authentication.getName()).orElseThrow(() -> new RuntimeException("Usuario no autenticado"));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<List<RolResponse>> listarRoles() {
        return ResponseEntity.ok(rolService.listarRoles());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<RolResponse> crearRol(@RequestBody RolRequest request, Authentication authentication) {
        return ResponseEntity.ok(rolService.crearRol(request, request.getPermisos(), getActor(authentication)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<RolResponse> modificarRol(@PathVariable Long id, @RequestBody RolRequest request, Authentication authentication) {
        RolResponse res = rolService.modificarRol(id, request, getActor(authentication));
        if (request.getPermisos() != null) {
            res = rolService.actualizarPermisos(id, request.getPermisos(), getActor(authentication));
        }
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{id}/permisos")
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<RolResponse> actualizarPermisos(@PathVariable Long id, @RequestBody com.umlforge.backend.dto.PermisosRequest request, Authentication authentication) {
        return ResponseEntity.ok(rolService.actualizarPermisos(id, request.getPermisos(), getActor(authentication)));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<RolResponse> cambiarEstadoRol(@PathVariable Long id, @RequestParam boolean activo, Authentication authentication) {
        return ResponseEntity.ok(rolService.cambiarEstadoRol(id, activo, getActor(authentication)));
    }
}
