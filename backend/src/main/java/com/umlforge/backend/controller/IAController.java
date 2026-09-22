package com.umlforge.backend.controller;

import com.umlforge.backend.dto.IAModelRequest;
import com.umlforge.backend.dto.IAModelResponse;
import com.umlforge.backend.service.IAService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ia")
@RequiredArgsConstructor
public class IAController {

    private final IAService iaService;

    @PostMapping("/modelar")
    public ResponseEntity<IAModelResponse> modelar(
            @Valid @RequestBody IAModelRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(iaService.modelar(request, authentication.getName()));
    }
}
