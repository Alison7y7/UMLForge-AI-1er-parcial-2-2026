package com.umlforge.backend.controller;

import com.umlforge.backend.dto.BackendGenerationRequest;
import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.codegen.BackendGeneratorFacade;
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
@RequestMapping("/api/generate")
public class BackendGeneratorController {

    private final BackendGeneratorFacade backendGeneratorFacade;

    public BackendGeneratorController(BackendGeneratorFacade backendGeneratorFacade) {
        this.backendGeneratorFacade = backendGeneratorFacade;
    }

    @PostMapping(
        value = "/backend", 
        consumes = MediaType.APPLICATION_JSON_VALUE, 
        produces = "application/zip"
    )
    public ResponseEntity<byte[]> generateBackend(@RequestBody BackendGenerationRequest request) {
        byte[] zipData = backendGeneratorFacade.generateBackend(request);

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("umlforge-generated-backend.zip", StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentLength(zipData.length)
                .body(zipData);
    }
}
