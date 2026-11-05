package com.umlforge.backend.service.ia;

public interface IAProvider {

    String getName();

    int getPriority();

    boolean isAvailable();

    default String getUnavailableReason() {
        return "proveedor deshabilitado o sin configuracion valida";
    }

    IAProviderResult generate(String prompt);
}
