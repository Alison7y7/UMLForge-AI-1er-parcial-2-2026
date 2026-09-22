package com.umlforge.backend.service.ia;

public class IAProviderException extends RuntimeException {

    public IAProviderException(String message) {
        super(message);
    }

    public IAProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
