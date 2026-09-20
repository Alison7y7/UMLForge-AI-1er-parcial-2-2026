package com.umlforge.backend.controller;

import com.umlforge.backend.dto.XmiImportResponse;
import com.umlforge.backend.service.XmiImportService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/xmi")
public class XmiController {

    private final XmiImportService xmiImportService;

    public XmiController(XmiImportService xmiImportService) {
        this.xmiImportService = xmiImportService;
    }

    @PostMapping(value = "/importar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<XmiImportResponse> importar(@RequestParam("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(xmiImportService.importar(archivo));
    }
}
