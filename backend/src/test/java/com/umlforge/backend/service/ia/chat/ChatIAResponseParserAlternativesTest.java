package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.entity.Diagrama;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class ChatIAResponseParserAlternativesTest {
    @Test
    void mantieneAlternativasIncompatiblesSeparadasEInertes() {
        Diagrama diagram = new Diagrama();
        diagram.setId(5L);
        diagram.setVersion(7L);
        diagram.setModeloJson("""
                {"clases":[{"id":"u1","nombre":"Usuario","atributos":[],"metodos":[]},
                {"id":"l1","nombre":"Libro","atributos":[],"metodos":[]}],"relaciones":[]}
                """);
        String response = """
                {"respuesta":"Hay varias opciones válidas.","hallazgos":[],"recomendaciones":[],"alternativas":[
                  {"id":"directa","nombre":"Asociación directa","descripcion":"Modelo simple","ventajas":["Menos elementos"],"limitaciones":["No guarda fechas"],"recomendada":false,"recomendaciones":[
                    {"tipoCambio":"AGREGAR_RELACION","descripcion":"Usuario a Libro","elementoTipo":"CLASE","elementoId":"u1","cambioPropuesto":{"origen":"u1","destino":"l1","tipo":"ASOCIACION","multiplicidadOrigen":"0..*","multiplicidadDestino":"0..*"}}]},
                  {"id":"prestamo","nombre":"Clase Prestamo","descripcion":"Registra la transacción","ventajas":["Guarda fechas"],"limitaciones":["Más complejidad"],"recomendada":true,"recomendaciones":[
                    {"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Prestamo","elementoTipo":"CLASE","elementoId":"","cambioPropuesto":{"nombre":"Prestamo"}}]}
                ]}
                """;

        ChatIAParsedResponse parsed = new ChatIAResponseParser(new ObjectMapper()).parse(response, diagram);

        assertThat(parsed.recomendaciones()).isEmpty();
        assertThat(parsed.alternativas()).hasSize(2);
        assertThat(parsed.alternativas().get(0).recomendaciones()).hasSize(1);
        assertThat(parsed.alternativas().get(1).recomendaciones()).hasSize(1);
        assertThat(parsed.alternativas().get(0).recomendaciones().get(0).id())
                .isNotEqualTo(parsed.alternativas().get(1).recomendaciones().get(0).id());
    }
}
