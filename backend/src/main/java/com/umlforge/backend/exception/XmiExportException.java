package com.umlforge.backend.exception;

import org.springframework.http.HttpStatus;

public class XmiExportException extends RuntimeException {
    private final HttpStatus status;

    public XmiExportException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
