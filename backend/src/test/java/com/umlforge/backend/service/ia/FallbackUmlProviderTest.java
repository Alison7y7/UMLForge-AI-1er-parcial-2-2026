package com.umlforge.backend.service.ia;

import com.umlforge.backend.service.UmlModelValidator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FallbackUmlProviderTest {

    private final FallbackUmlProvider provider = new FallbackUmlProvider();
    private final UmlModelValidator validator = new UmlModelValidator();

    @Test
    void createsValidLibraryModel() {
        IAProviderResult result = provider.generate("Crear sistema de biblioteca con libros y préstamos");

        validator.validate(result.model());
        assertThat(result.model().clases()).extracting("nombre")
                .containsExactly("Libro", "Usuario", "Prestamo");
        assertThat(result.model().relaciones()).hasSize(2);
        assertThat(result.tokensUsed()).isZero();
    }

    @Test
    void createsValidModelsForSupportedScenarios() {
        List<String> prompts = List.of(
                "Crear sistema de veterinaria con mascotas, dueños, veterinarios y consultas",
                "Crear sistema universitario con estudiantes, cursos y profesores",
                "Crear sistema de tienda con productos, clientes y ventas",
                "Crear sistema de clínica con pacientes, médicos, citas e historiales médicos"
        );

        for (String prompt : prompts) {
            IAProviderResult result = provider.generate(prompt);
            validator.validate(result.model());
            assertThat(result.model().clases()).hasSize(4);
            assertThat(result.model().relaciones()).hasSize(3);
            assertThat(result.model().clases())
                    .allSatisfy(umlClass -> assertThat(umlClass.atributos())
                            .anySatisfy(attribute -> {
                                assertThat(attribute.nombre()).isEqualTo("id");
                                assertThat(attribute.tipo()).isEqualTo("Long");
                            }));
        }
    }
}
