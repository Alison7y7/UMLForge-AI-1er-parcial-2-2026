package com.umlforge.backend.service.ia;

public interface IAProvider {

    String getName();

    int getPriority();

    boolean isAvailable();

    IAProviderResult generate(String prompt);
}
