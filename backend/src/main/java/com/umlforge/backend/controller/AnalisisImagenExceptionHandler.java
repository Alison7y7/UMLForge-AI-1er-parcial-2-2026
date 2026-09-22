package com.umlforge.backend.controller;

import com.umlforge.backend.service.AnalisisImagenServiceException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(assignableTypes = AnalisisImagenController.class)
public class AnalisisImagenExceptionHandler {

    @ExceptionHandler(AnalisisImagenServiceException.class)
    public ResponseEntity<Map<String, Object>> handleServiceError(AnalisisImagenServiceException exception) {
        return error(exception.getStatus().value(), exception.getStatus().getReasonPhrase(), exception.getMessage());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(
            MissingServletRequestParameterException exception) {
        return error(400, "Bad Request", "Debe adjuntar el campo archivo");
    }

    private ResponseEntity<Map<String, Object>> error(int status, String reason, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status);
        body.put("error", reason);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
