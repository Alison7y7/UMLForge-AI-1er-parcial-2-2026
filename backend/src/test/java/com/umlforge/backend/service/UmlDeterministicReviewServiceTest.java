package com.umlforge.backend.service;

import com.umlforge.backend.dto.HallazgoRevisionUml;
import com.umlforge.backend.entity.Diagrama;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class UmlDeterministicReviewServiceTest {
    private final UmlDeterministicReviewService service = new UmlDeterministicReviewService(new ObjectMapper());

    @Test
    void detectsInvalidMultiplicityDuplicateMembersAndDanglingRelations() {
        Diagrama diagram = new Diagrama();
        diagram.setId(4L); diagram.setNombre("Ventas");
        diagram.setModeloJson("""
                {"clases":[{"id":"c1","nombre":"Cliente","atributos":[{"id":"a1","nombre":"email"},{"id":"a2","nombre":"email"}],"metodos":[]}],
                 "relaciones":[{"id":"r1","origen":"c1","destino":"missing","tipo":"ASOCIACION","multiplicidadOrigen":"muchos","multiplicidadDestino":"1"}]}
                """);

        var findings = service.analyze(diagram);

        assertThat(findings).extracting(HallazgoRevisionUml::categoria)
                .contains("DUPLICIDAD", "INTEGRIDAD", "MULTIPLICIDAD");
        assertThat(findings).allMatch(f -> f.estado() == HallazgoRevisionUml.Estado.PENDIENTE);
    }

    @Test
    void validDiagramHasNoFormalErrors() {
        Diagrama diagram = new Diagrama();
        diagram.setId(4L); diagram.setNombre("Ventas");
        diagram.setModeloJson("{\"clases\":[{\"id\":\"c1\",\"nombre\":\"Cliente\",\"atributos\":[],\"metodos\":[]}],\"relaciones\":[]}");
        assertThat(service.analyze(diagram)).isEmpty();
    }

    @Test
    void directManyToManyIsValidUmlAndIsNotReportedAsFormalError() {
        Diagrama diagram = new Diagrama();
        diagram.setId(5L); diagram.setNombre("Biblioteca");
        diagram.setModeloJson("""
                {"clases":[
                  {"id":"u1","nombre":"Usuario","atributos":[],"metodos":[]},
                  {"id":"l1","nombre":"Libro","atributos":[],"metodos":[]}
                ],"relaciones":[
                  {"id":"r1","origen":"u1","destino":"l1","tipo":"ASOCIACION","nombre":"consulta","multiplicidadOrigen":"0..*","multiplicidadDestino":"0..*"}
                ]}
                """);

        assertThat(service.analyze(diagram)).isEmpty();
    }
}
