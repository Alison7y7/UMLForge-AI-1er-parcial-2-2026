package com.umlforge.backend.service.ia;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.UmlModelValidator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UmlJsonSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UmlModelValidator validator = new UmlModelValidator();

    @Test
    void normalizesNullPositionsAndPreservesRelations() {
        UmlModelDto model = parse("""
            {
              "clases": [
                {
                  "id": "clase-cliente",
                  "nombre": "Cliente",
                  "estereotipo": "entity",
                  "posicionX": 50.0,
                  "posicionY": 75.0,
                  "atributos": [],
                  "metodos": []
                },
                {
                  "id": "clase-pedido",
                  "nombre": "Pedido",
                  "estereotipo": "entity",
                  "posicionX": null,
                  "posicionY": null,
                  "atributos": [],
                  "metodos": []
                }
              ],
              "relaciones": [
                {
                  "id": "relacion-cliente-pedidos",
                  "origen": "clase-cliente",
                  "destino": "clase-pedido",
                  "tipo": "ASOCIACION",
                  "nombre": "pedidos",
                  "multiplicidadOrigen": "1",
                  "multiplicidadDestino": "0..*"
                }
              ]
            }
            """);

        validator.validate(model);
        assertThat(model.clases().get(0).posicionX()).isEqualTo(50.0);
        assertThat(model.clases().get(0).posicionY()).isEqualTo(75.0);
        assertThat(model.clases().get(1).posicionX()).isEqualTo(400.0);
        assertThat(model.clases().get(1).posicionY()).isEqualTo(100.0);
        assertThat(model.relaciones()).singleElement()
                .extracting(
                        UmlModelDto.UmlRelation::origen,
                        UmlModelDto.UmlRelation::destino,
                        UmlModelDto.UmlRelation::tipo,
                        UmlModelDto.UmlRelation::multiplicidadOrigen,
                        UmlModelDto.UmlRelation::multiplicidadDestino
                )
                .containsExactly("clase-cliente", "clase-pedido", "ASOCIACION", "1", "0..*");
    }

    @Test
    void normalizesMissingPositionsOnAGridWithoutOverlap() {
        UmlModelDto model = parse("""
            {
              "clases": [
                {"id":"c1","nombre":"Uno","estereotipo":"entity","atributos":[],"metodos":[]},
                {"id":"c2","nombre":"Dos","estereotipo":"entity","atributos":[],"metodos":[]},
                {"id":"c3","nombre":"Tres","estereotipo":"entity","atributos":[],"metodos":[]},
                {"id":"c4","nombre":"Cuatro","estereotipo":"entity","atributos":[],"metodos":[]}
              ],
              "relaciones": []
            }
            """);

        validator.validate(model);
        assertPosition(model.clases().get(0), 100.0, 100.0);
        assertPosition(model.clases().get(1), 400.0, 100.0);
        assertPosition(model.clases().get(2), 700.0, 100.0);
        assertPosition(model.clases().get(3), 100.0, 350.0);

        Set<String> positions = new HashSet<>();
        model.clases().forEach(umlClass ->
                positions.add(umlClass.posicionX() + ":" + umlClass.posicionY()));
        assertThat(positions).hasSize(model.clases().size());
    }

    @Test
    void keepsValidPositionsUnchanged() {
        UmlModelDto model = parse("""
            {
              "clases": [
                {
                  "id": "clase-valida",
                  "nombre": "Valida",
                  "estereotipo": "entity",
                  "posicionX": 245.5,
                  "posicionY": 612.25,
                  "atributos": [],
                  "metodos": []
                }
              ],
              "relaciones": []
            }
            """);

        validator.validate(model);
        assertPosition(model.clases().get(0), 245.5, 612.25);
    }

    @Test
    void stillRejectsNonNumericPositions() {
        String response = """
            {
              "clases": [
                {
                  "id": "clase-invalida",
                  "nombre": "Invalida",
                  "estereotipo": "entity",
                  "posicionX": "no-es-un-numero",
                  "posicionY": 100.0,
                  "atributos": [],
                  "metodos": []
                }
              ],
              "relaciones": []
            }
            """;

        assertThatThrownBy(() -> parse(response))
                .isInstanceOf(IAProviderException.class)
                .hasMessageContaining("modelo UML JSON válido");
    }

    @Test
    void keepsTheGenericProviderParserStrictForNullPositions() {
        String response = """
            {
              "clases": [
                {
                  "id": "clase-generica",
                  "nombre": "Generica",
                  "estereotipo": "entity",
                  "posicionX": null,
                  "posicionY": 100.0,
                  "atributos": [],
                  "metodos": []
                }
              ],
              "relaciones": []
            }
            """;

        assertThatThrownBy(() -> UmlJsonSupport.parseModel(objectMapper, response))
                .isInstanceOf(IAProviderException.class)
                .hasMessageContaining("modelo UML JSON válido");
    }

    private UmlModelDto parse(String response) {
        return UmlJsonSupport.parseOllamaModel(objectMapper, response);
    }

    private void assertPosition(UmlModelDto.UmlClass umlClass, double expectedX, double expectedY) {
        assertThat(umlClass.posicionX()).isEqualTo(expectedX);
        assertThat(umlClass.posicionY()).isEqualTo(expectedY);
    }
}
