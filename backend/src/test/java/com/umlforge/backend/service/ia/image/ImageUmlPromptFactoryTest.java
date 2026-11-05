package com.umlforge.backend.service.ia.image;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageUmlPromptFactoryTest {

    @Test
    void explainsMultiplicityEndpointsAssociationClassesAndUncertainty() {
        String prompt = ImageUmlPromptFactory.build();

        assertThat(prompt)
                .contains("multiplicidadOrigen es el texto escrito junto al extremo")
                .contains("multiplicidadDestino es el texto escrito junto al extremo")
                .contains("linea discontinua al centro de una asociacion")
                .contains("claseAsociacion")
                .contains("No crees una relacion directa adicional")
                .contains("conservalo exactamente como aparece")
                .contains("origenTipo \"IMAGEN\"")
                .contains("origenTipo \"SUGERIDO\"")
                .contains("origenTipo \"INDETERMINADO\"")
                .contains("segun su nombre, la clase y")
                .contains("advertencias")
                .contains("unspecified")
                .doesNotContain("Venta", "Producto", "Cliente", "Vendedor", "Detalle");
    }
}
