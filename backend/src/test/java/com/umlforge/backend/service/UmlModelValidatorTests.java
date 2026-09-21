package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlModelDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class UmlModelValidatorTests {

    private UmlModelValidator validator;

    @BeforeEach
    void setUp() {
        validator = new UmlModelValidator();
    }

    @Test
    void aceptaModeloValido() {
        assertDoesNotThrow(() -> validator.validate(validModel()));
    }

    @Test
    void rechazaIdsDuplicados() {
        UmlModelDto model = new UmlModelDto(
            List.of(umlClass("persona"), umlClass("persona")),
            List.of()
        );

        assertThrows(IllegalArgumentException.class, () -> validator.validate(model));
    }

    @Test
    void rechazaOrigenInexistente() {
        UmlModelDto model = new UmlModelDto(
            List.of(umlClass("persona")),
            List.of(relation("rel-1", "casa", "persona", "ASOCIACION"))
        );

        assertThrows(IllegalArgumentException.class, () -> validator.validate(model));
    }

    @Test
    void rechazaDestinoInexistente() {
        UmlModelDto model = new UmlModelDto(
            List.of(umlClass("persona")),
            List.of(relation("rel-1", "persona", "casa", "ASOCIACION"))
        );

        assertThrows(IllegalArgumentException.class, () -> validator.validate(model));
    }

    @Test
    void rechazaTipoDeRelacionInvalido() {
        UmlModelDto model = new UmlModelDto(
            List.of(umlClass("persona"), umlClass("casa")),
            List.of(relation("rel-1", "persona", "casa", "RELACION_DESCONOCIDA"))
        );

        assertThrows(IllegalArgumentException.class, () -> validator.validate(model));
    }

    @Test
    void rechazaVisibilidadDeAtributoInvalida() {
        UmlModelDto.UmlAttribute attribute = new UmlModelDto.UmlAttribute(
            "attr-1", "nombre", "String", "package"
        );
        UmlModelDto.UmlClass umlClass = new UmlModelDto.UmlClass(
            "persona", "Persona", "", 0, 0, List.of(attribute), List.of()
        );

        assertThrows(
            IllegalArgumentException.class,
            () -> validator.validate(new UmlModelDto(List.of(umlClass), List.of()))
        );
    }

    @Test
    void rechazaVisibilidadDeMetodoInvalida() {
        UmlModelDto.UmlMethod method = new UmlModelDto.UmlMethod(
            "method-1", "crear", "void", "internal", List.of()
        );
        UmlModelDto.UmlClass umlClass = new UmlModelDto.UmlClass(
            "persona", "Persona", "", 0, 0, List.of(), List.of(method)
        );

        assertThrows(
            IllegalArgumentException.class,
            () -> validator.validate(new UmlModelDto(List.of(umlClass), List.of()))
        );
    }

    private UmlModelDto validModel() {
        return new UmlModelDto(
            List.of(umlClass("persona"), umlClass("casa")),
            List.of(relation("rel-1", "persona", "casa", "COMPOSICION"))
        );
    }

    private UmlModelDto.UmlClass umlClass(String id) {
        UmlModelDto.UmlAttribute attribute = new UmlModelDto.UmlAttribute(
            id + "-attr", "id", "Long", "private"
        );
        UmlModelDto.UmlMethod method = new UmlModelDto.UmlMethod(
            id + "-method", "crear", "void", "public", List.of()
        );
        return new UmlModelDto.UmlClass(
            id, id, "", 10, 20, List.of(attribute), List.of(method)
        );
    }

    private UmlModelDto.UmlRelation relation(
        String id,
        String source,
        String target,
        String type
    ) {
        return new UmlModelDto.UmlRelation(id, source, target, type, "", "1", "0..*");
    }
}
