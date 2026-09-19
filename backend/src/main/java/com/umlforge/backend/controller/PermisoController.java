package com.umlforge.backend.controller;

import com.umlforge.backend.dto.PermisoResponse;
import com.umlforge.backend.service.RolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/permisos")
@RequiredArgsConstructor
public class PermisoController {
    
    private final RolService rolService;

    @GetMapping
    @PreAuthorize("hasAuthority('GESTIONAR_ROLES')")
    public ResponseEntity<List<PermisoResponse>> listarPermisos() {
        return ResponseEntity.ok(rolService.listarPermisos());
    }
}
