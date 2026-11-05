package com.umlforge.backend.service.ia.image;

import org.springframework.stereotype.Component;

/**
 * Marker provider kept for dependency compatibility.
 *
 * Local templates cannot inspect pixels and therefore must never be returned as
 * a successful reconstruction from an arbitrary user image.
 */
@Component
public class FallbackImageProvider implements ImageIAProvider {

    @Override
    public String getName() {
        return "fallback-local-image-template";
    }

    @Override
    public int getPriority() {
        return 100;
    }

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public ImageIAProviderResult analyze(byte[] image, String mimeType, String prompt) {
        throw new ImageIAProviderException(
                "Las plantillas locales no realizan reconocimiento visual");
    }
}
