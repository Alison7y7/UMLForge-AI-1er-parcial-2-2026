package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.service.ia.FallbackUmlProvider;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeterministicUmlChatProviderTest {
    private final DeterministicUmlChatProvider provider =
            new DeterministicUmlChatProvider(new FallbackUmlProvider(), new ObjectMapper());

    @Test
    void aceptaSoloInstruccionDirectaConPlantillaConocida() {
        var result = provider.generate(prompt("Crea un sistema de biblioteca"));
        assertThat(result.structuredJson()).contains("Libro", "Prestamo")
                .doesNotContain("aplicado");
    }

    @Test
    void noInventaRespuestaParaPreguntaConversacional() {
        assertThatThrownBy(() -> provider.generate(prompt("¿Cómo diseñar un sistema de biblioteca?")))
                .isInstanceOf(ChatIAProviderException.class)
                .hasMessageContaining("no admite esta consulta conversacional");
    }

    @Test
    void rechazaInstruccionSinPlantillaCompatible() {
        assertThatThrownBy(() -> provider.generate(prompt("Crea un sistema de vuelos")))
                .isInstanceOf(ChatIAProviderException.class);
    }

    @Test
    void ofreceAlternativasDeRelacionSinConsumirProveedorExterno() throws Exception {
        String prompt = """
                DIAGRAMA SELECCIONADO
                modeloJson: {"clases":[{"id":"u1","nombre":"Usuario"},{"id":"l1","nombre":"Libro"}],"relaciones":[]}

                HISTORIAL COMPARTIDO DEL PROYECTO

                NUEVA SOLICITUD DEL USUARIO:
                ¿Cómo debería relacionar Usuario y Libro?
                """;

        var result = provider.generate(prompt);
        var root = new ObjectMapper().readTree(result.structuredJson());

        assertThat(root.path("recomendaciones")).isEmpty();
        assertThat(root.path("alternativas")).hasSize(3);
        assertThat(root.path("alternativas").toString())
                .contains("Conservar estructura actual", "Asociación directa", "Prestamo");
    }

    private String prompt(String request) {
        return "contexto compartido\nNUEVA SOLICITUD DEL USUARIO:\n" + request;
    }
}
