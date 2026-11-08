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
                .contains("pendiente hasta que el backend cree la clase y resuelva su UUID");
    }
}
