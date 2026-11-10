package com.umlforge.backend.controller;

import com.umlforge.backend.dto.*;
import com.umlforge.backend.service.ContextualHelpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ayuda")
public class ContextualHelpController {
    private final ContextualHelpService help;

    @PostMapping("/contextual")
    public ContextualHelpResponse answer(@Valid @RequestBody ContextualHelpRequest request, Authentication auth) {
        return help.answer(request.question(), request.context(), auth.getName());
    }

    @GetMapping("/manual")
    public HelpManualResponse manual(Authentication auth) {
        return help.manual(auth.getName());
    }
}
