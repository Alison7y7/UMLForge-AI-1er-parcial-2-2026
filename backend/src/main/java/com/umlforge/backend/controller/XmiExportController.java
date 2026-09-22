package com.umlforge.backend.controller;

import com.umlforge.backend.dto.XmiExportRequest;
import com.umlforge.backend.service.XmiExportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/xmi")
public class XmiExportController {

    private final XmiExportService xmiExportService;
    private final com.umlforge.backend.service.BitacoraService bitacoraService;
    private final com.umlforge.backend.repository.UsuarioRepository usuarioRepository;

    public XmiExportController(XmiExportService xmiExportService,
                               com.umlforge.backend.service.BitacoraService bitacoraService,
                               com.umlforge.backend.repository.UsuarioRepository usuarioRepository) {
        this.xmiExportService = xmiExportService;
        this.bitacoraService = bitacoraService;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping(
        value = "/exportar",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_XML_VALUE
    )
    public ResponseEntity<byte[]> exportar(@RequestBody XmiExportRequest request, org.springframework.security.core.Authentication authentication) {
        byte[] xmi = xmiExportService.exportar(request.nombre(), request.modelo());
        
        if (authentication != null) {
            usuarioRepository.findByCorreo(authentication.getName()).ifPresent(usuario -> 
                bitacoraService.registrarAccion(usuario, null, "EXPORTAR_XMI", "Exportó el diagrama a XMI: " + request.nombre())
            );
        }
        ContentDisposition disposition = ContentDisposition.attachment()
            .filename(xmiExportService.nombreArchivo(request.nombre()), StandardCharsets.UTF_8)
            .build();

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_XML)
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .contentLength(xmi.length)
            .body(xmi);
    }
}
