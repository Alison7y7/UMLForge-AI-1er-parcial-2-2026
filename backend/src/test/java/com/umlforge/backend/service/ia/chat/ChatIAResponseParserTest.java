package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.dto.RecomendacionUml;
import com.umlforge.backend.entity.Diagrama;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    void aceptaClaseNuevaSinExigirIdPreexistenteYConservaReferenciasReales() {
        String response = """
                {"respuesta":"Sugiero Pago","recomendaciones":[
                  {"tipoCambio":"AGREGAR_CLASE","descripcion":"Separar pagos de Cliente","elementoTipo":"CLASE","elementoId":"","cambioPropuesto":{"nombre":"Pago","responsabilidad":"Registrar cobros","atributos":[{"nombre":"monto","tipo":"Decimal"}],"metodos":[{"nombre":"confirmar","tipoRetorno":"void"}],"relaciones":[{"destino":"clase-1","tipo":"ASOCIACION","multiplicidadDestino":"1"}]}}
                ]}
                """;

        var result = parser.parse(response, diagrama());

        assertThat(result.recomendaciones()).hasSize(1);
        assertThat(result.recomendaciones().get(0).tipoCambio().name()).isEqualTo("AGREGAR_CLASE");
        assertThat(result.recomendaciones().get(0).elementoAfectado().id()).isEmpty();
        assertThat(result.recomendaciones().get(0).elementoAfectado().nombre()).isEqualTo("Pago");
    }

    @Test
    void rechazaClaseNuevaQueRelacionaUnElementoInventado() {
        String response = """
                {"respuesta":"Sugiero Pago","recomendaciones":[
                  {"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Pago","elementoTipo":"CLASE","elementoId":"","cambioPropuesto":{"nombre":"Pago","relaciones":[{"destino":"inventada"}]}}
                ]}
                """;
        assertThat(parser.parse(response, diagrama()).recomendaciones()).isEmpty();
    }

    @Test
    void conservaAgregarRelacionConIdsRealesMultiplicidadesYNombresDePresentacion() {
        String response = """
                {"respuesta":"Usuario puede solicitar varios libros.","recomendaciones":[
                  {"tipoCambio":"AGREGAR_RELACION","descripcion":"Relación recomendada: Usuario — Libro","elementoTipo":"RELACION","elementoId":"","cambioPropuesto":{"origen":"usuario-1","destino":"libro-1","tipo":"ASOCIACION","nombre":"solicita","multiplicidadOrigen":"0..*","multiplicidadDestino":"0..*","justificacion":"Hipótesis pendiente de confirmar"}}
                ]}
                """;

        var result = parser.parse(response, diagramaBiblioteca());

        assertThat(result.recomendaciones()).hasSize(1);
        RecomendacionUml relation = result.recomendaciones().get(0);
        assertThat(relation.tipoCambio()).isEqualTo(com.umlforge.backend.dto.TipoCambioUml.AGREGAR_RELACION);
        assertThat(relation.elementoAfectado().id()).isEqualTo("usuario-1");
        assertThat(relation.elementoAfectado().nombre()).isEqualTo("Usuario");
        assertThat(relation.cambioPropuesto().path("destino").asText()).isEqualTo("libro-1");
        assertThat(relation.cambioPropuesto().path("destinoNombre").asText()).isEqualTo("Libro");
        assertThat(relation.cambioPropuesto().path("multiplicidadDestino").asText()).isEqualTo("0..*");
    }

    @Test
    void conservaRelacionPendienteHaciaClaseNuevaDeLaMismaRespuesta() {
        String response = """
                {"respuesta":"Conviene registrar el préstamo como concepto de negocio.","recomendaciones":[
                  {"tipoCambio":"AGREGAR_CLASE","descripcion":"Registrar fechas y estado","elementoTipo":"CLASE","elementoId":"","cambioPropuesto":{"nombre":"Préstamo","atributos":[{"nombre":"fechaPrestamo","tipo":"Date"}]}},
                  {"tipoCambio":"AGREGAR_RELACION","descripcion":"Relacionar Usuario con Préstamo","elementoTipo":"CLASE","elementoId":"usuario-1","cambioPropuesto":{"origen":"usuario-1","destino":"Préstamo","tipo":"ASOCIACION","multiplicidadOrigen":"1","multiplicidadDestino":"0..*"}}
                ]}
                """;

        var result = parser.parse(response, diagramaBiblioteca());

        assertThat(result.recomendaciones()).hasSize(2);
        assertThat(result.recomendaciones().get(1).cambioPropuesto().path("destino").asText())
                .isEqualTo("Préstamo");
    }

    @Test
    void descartaRelacionConMultiplicidadInvalidaYNoFabricaTarjetaDesdeTexto() {
        String invalid = """
                {"respuesta":"Propongo una relación.","recomendaciones":[
                  {"tipoCambio":"AGREGAR_RELACION","descripcion":"Relacionar","elementoTipo":"CLASE","elementoId":"usuario-1","cambioPropuesto":{"origen":"usuario-1","destino":"libro-1","tipo":"ASOCIACION","multiplicidadOrigen":"muchos","multiplicidadDestino":"1"}}
                ]}
                """;
        assertThat(parser.parse(invalid, diagramaBiblioteca()).recomendaciones()).isEmpty();
        assertThatThrownBy(() -> parser.parse("Propongo una relación entre Usuario y Libro", diagramaBiblioteca()))
                .isInstanceOf(ChatIAProviderException.class)
                .hasMessageContaining("contrato JSON");
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

    private Diagrama diagramaBiblioteca() {
        Diagrama d = new Diagrama();
        d.setId(5L);
        d.setVersion(8L);
        d.setModeloJson("""
                {"clases":[
                  {"id":"usuario-1","nombre":"Usuario","atributos":[],"metodos":[]},
                  {"id":"libro-1","nombre":"Libro","atributos":[],"metodos":[]}
                ],"relaciones":[]}
                """);
        return d;
    }
}
