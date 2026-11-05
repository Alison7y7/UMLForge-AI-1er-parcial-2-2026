package com.umlforge.backend.service.ia;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UmlPromptFactoryTest {

    @Test
    void keepsTheOllamaPromptCompactAndComplete() {
        String prompt = UmlPromptFactory.buildForOllama(
                "Crear Cliente y Pedido con relación uno a muchos"
        );

        assertThat(prompt.length()).isLessThan(2_500);
        assertThat(prompt)
                .contains("\"clases\"")
                .contains("\"relaciones\"")
                .contains("\"multiplicidadOrigen\"")
                .contains("\"multiplicidadDestino\"")
                .contains("Una relación UML va solo en relaciones")
                .contains("exactamente esas dos clases y una ASOCIACION")
                .contains("posicionX y posicionY son números JSON obligatorios")
                .contains("Si la solicitud enumera clases exactas, no agregues ninguna otra")
                .contains("Uno-a-muchos siempre requiere un objeto en relaciones")
                .contains("Crear Cliente y Pedido con relación uno a muchos");
    }
}
