package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.entity.Diagrama;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class ChatIAResponseParserTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final ChatIAResponseParser parser = new ChatIAResponseParser(mapper);

    @Test
    void conservaSoloRecomendacionesVinculadasAElementosReales() {
        Diagrama diagrama = diagrama();
        String response = """
                {"respuesta":"Conviene agregar un atributo.","recomendaciones":[
                  {"tipoCambio":"AGREGAR_ATRIBUTO","descripcion":"Agregar email","elementoTipo":"CLASE","elementoId":"clase-1","cambioPropuesto":{"nombre":"email","tipo":"String"}},
                  {"tipoCambio":"ELIMINAR_RELACION","descripcion":"Inventada","elementoTipo":"RELACION","elementoId":"no-existe","cambioPropuesto":{}}
                ]}
                """;

        ChatIAParsedResponse result = parser.parse(response, diagrama);

        assertThat(result.recomendaciones()).hasSize(1);
        assertThat(result.recomendaciones().get(0).elementoAfectado().id()).isEqualTo("clase-1");
        assertThat(result.recomendaciones().get(0).diagramaId()).isEqualTo(7L);
        assertThat(result.recomendaciones().get(0).versionDiagrama()).isEqualTo(3L);
        assertThat(result.recomendacionesDescartadas()).isEqualTo(1);
    }

    @Test
    void rechazaIdsInventadosDentroDelCambioPropuesto() {
        String response = """
                {"respuesta":"Propuesta","recomendaciones":[
                  {"tipoCambio":"AGREGAR_RELACION","descripcion":"Relacionar","elementoTipo":"CLASE","elementoId":"clase-1","cambioPropuesto":{"origenId":"clase-1","destinoId":"inventada"}}
                ]}
                """;
        assertThat(parser.parse(response, diagrama()).recomendaciones()).isEmpty();
    }

    private Diagrama diagrama() {
        Diagrama d = new Diagrama();
        d.setId(7L);
        d.setVersion(3L);
        d.setModeloJson("""
                {"clases":[{"id":"clase-1","nombre":"Cliente","atributos":[{"id":"attr-1","nombre":"nombre"}],"metodos":[]}],"relaciones":[]}
                """);
        return d;
    }
}
