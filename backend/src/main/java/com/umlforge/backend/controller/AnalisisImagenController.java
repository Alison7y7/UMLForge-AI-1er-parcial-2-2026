package com.umlforge.backend.controller;

import com.umlforge.backend.dto.AnalisisImagenResponse;
import com.umlforge.backend.service.AnalisisImagenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ia")
@RequiredArgsConstructor
public class AnalisisImagenController {

    private final AnalisisImagenService analisisImagenService;

    @PostMapping(value = "/reconstruir-imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnalisisImagenResponse> reconstruirImagen(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "diagramaId", required = false) Long diagramaId,
            Authentication authentication) {
        return ResponseEntity.ok(analisisImagenService.reconstruir(
                archivo, diagramaId, authentication.getName()));
    }
}
