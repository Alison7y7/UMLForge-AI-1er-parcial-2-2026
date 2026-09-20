package com.umlforge.backend.controller;

import com.umlforge.backend.exception.XmiImportException;
import com.umlforge.backend.exception.XmiExportException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
public class XmiExceptionHandler {

    @ExceptionHandler(XmiExportException.class)
    public ResponseEntity<Map<String, String>> handleXmiExport(XmiExportException exception) {
        return ResponseEntity
            .status(exception.getStatus())
            .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(XmiImportException.class)
    public ResponseEntity<Map<String, String>> handleXmiImport(XmiImportException exception) {
        return ResponseEntity
            .status(exception.getStatus())
            .body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUploadSize() {
        return ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(Map.of("message", "El archivo XMI supera el tamaño máximo permitido de 10 MB."));
    }
}
