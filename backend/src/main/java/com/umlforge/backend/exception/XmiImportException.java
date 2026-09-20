package com.umlforge.backend.exception;

import org.springframework.http.HttpStatus;

public class XmiImportException extends RuntimeException {
    private final HttpStatus status;

    public XmiImportException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
