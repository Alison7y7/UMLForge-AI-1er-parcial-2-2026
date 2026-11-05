package com.umlforge.backend.service.ia.image;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FallbackImageProviderTest {

    private final FallbackImageProvider provider = new FallbackImageProvider();

    @Test
    void isNotAvailableForRealImageReconstruction() {
        assertThat(provider.getName()).isEqualTo("fallback-local-image-template");
        assertThat(provider.isAvailable()).isFalse();
    }

    @Test
    void neverReturnsACompiledTemplateOrGenericDiagram() {
        assertThatThrownBy(() -> provider.analyze(
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff},
                "image/jpeg",
                "Diagrama de ventas con Producto y Cliente"))
                .isInstanceOf(ImageIAProviderException.class)
                .hasMessageContaining("no realizan reconocimiento visual");
    }
}
