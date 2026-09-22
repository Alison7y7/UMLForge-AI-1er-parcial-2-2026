package com.umlforge.backend.service;

import org.springframework.http.HttpStatus;

public class AnalisisImagenServiceException extends RuntimeException {

    private final HttpStatus status;

    public AnalisisImagenServiceException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public AnalisisImagenServiceException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
