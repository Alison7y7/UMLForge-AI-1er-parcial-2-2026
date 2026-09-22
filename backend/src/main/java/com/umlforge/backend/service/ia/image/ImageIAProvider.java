package com.umlforge.backend.service.ia.image;

public interface ImageIAProvider {

    String getName();

    int getPriority();

    boolean isAvailable();

    ImageIAProviderResult analyze(byte[] image, String mimeType, String prompt);
}
