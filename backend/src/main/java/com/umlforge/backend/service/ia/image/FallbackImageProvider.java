package com.umlforge.backend.service.ia.image;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class FallbackImageProvider implements ImageIAProvider {

    @Override
    public String getName() {
        return "fallback-local-image";
    }

    @Override
    public int getPriority() {
        return 100;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public ImageIAProviderResult analyze(byte[] image, String mimeType, String prompt) {
        log.warn("Se utilizara el fallback local de imagen; no se pudo ejecutar un proveedor de vision");
        return new ImageIAProviderResult("""
            {
              "clases": [{
                "id": "clase-reconstruida-1",
                "nombre": "ElementoReconstruido",
                "estereotipo": "entity",
                "posicionX": 100.0,
                "posicionY": 100.0,
                "atributos": [{
                  "id": "atributo-reconstruido-1",
                  "nombre": "id",
                  "tipo": "Long",
                  "visibilidad": "private"
                }],
                "metodos": []
              }],
              "relaciones": []
            }
            """, null);
    }
}
