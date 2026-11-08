package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.MensajeChatProyecto;
import com.umlforge.backend.entity.TipoEmisorChat;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChatIAPromptBuilderTest {

    @Test
    void exigeTarjetaDeRelacionYTrataNmComoValidaSinInventarClaseIntermedia() {
        Diagrama diagram = new Diagrama();
        diagram.setId(5L);
        diagram.setNombre("Biblioteca");
        diagram.setVersion(8L);
        diagram.setModeloJson("""
                {"clases":[{"id":"u1","nombre":"Usuario"},{"id":"l1","nombre":"Libro"}],"relaciones":[]}
                """);
        MensajeChatProyecto request = new MensajeChatProyecto();
        request.setTipoEmisor(TipoEmisorChat.USUARIO);
        request.setContenido("¿Un Usuario puede llevarse varios Libros? ¿Necesito una clase intermedia?");
        request.setMetadatos("{}");

        String prompt = new ChatIAPromptBuilder(new ObjectMapper())
                .build(diagram, List.of(), List.of(), request);

        assertThat(prompt)
                .contains("no basta describirla en respuesta")
                .contains("AGREGAR_RELACION aplicable")
                .contains("Una asociacion muchos-a-muchos directa es UML valido")
                .contains("fechas, estado, cantidad")
                .contains("No confundas una propuesta de IA con una decision aprobada")
                .contains("no hay evidencia en el historial disponible")
                .contains("pendiente hasta que el backend cree la clase y resuelva su UUID")
                .contains("El MODELO UML ACTUAL persistido es la unica fuente")
                .contains("Cada alternativa contiene exclusivamente sus")
                .contains("propias operaciones")
                .contains("Ninguna alternativa se aplica sola");
    }

    @Test
    void declaraCambiosLocalesSinConfundirlosConElModeloConfirmado() {
        Diagrama diagram = new Diagrama();
        diagram.setId(5L); diagram.setNombre("Biblioteca"); diagram.setVersion(7L);
        diagram.setModeloJson("{\"clases\":[{\"id\":\"p1\",\"nombre\":\"Prestamo\"}],\"relaciones\":[]}");
        MensajeChatProyecto request = new MensajeChatProyecto();
        request.setContenido("¿Existe Prestamo?");
        request.setMetadatos("{\"cambiosLocalesSinGuardar\":true}");

        String prompt = new ChatIAPromptBuilder(new ObjectMapper())
                .build(diagram, List.of(), List.of(), request);

        assertThat(prompt).contains("Hay cambios locales sin guardar")
                .contains("ultima version confirmada del servidor")
                .contains("\"nombre\":\"Prestamo\"");
    }
}
