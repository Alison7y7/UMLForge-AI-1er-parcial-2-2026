package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlModelDto;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class UmlModelValidator {

    private static final Set<String> ALLOWED_RELATION_TYPES = Set.of(
        "ASOCIACION",
        "HERENCIA",
        "AGREGACION",
        "COMPOSICION",
        "GENERALIZACION",
        "DEPENDENCIA"
    );

    private static final Set<String> ALLOWED_VISIBILITIES = Set.of(
        "public",
        "private",
        "protected"
    );

    public void validate(UmlModelDto model) {
        if (model == null) {
            throw new IllegalArgumentException("El modelo UML no puede ser nulo.");
        }

        List<UmlModelDto.UmlClass> classes = requireList(model.clases(), "clases");
        List<UmlModelDto.UmlRelation> relations = requireList(model.relaciones(), "relaciones");
        Set<String> allIds = new HashSet<>();
        Set<String> classIds = new HashSet<>();

        for (UmlModelDto.UmlClass umlClass : classes) {
            if (umlClass == null) {
                throw new IllegalArgumentException("La lista de clases no puede contener valores nulos.");
            }
            registerUniqueId(umlClass.id(), "clase", allIds);
            classIds.add(umlClass.id());

            for (UmlModelDto.UmlAttribute attribute : requireList(umlClass.atributos(), "atributos")) {
                if (attribute == null) {
                    throw new IllegalArgumentException("La lista de atributos no puede contener valores nulos.");
                }
                registerUniqueId(attribute.id(), "atributo", allIds);
                validateVisibility(attribute.visibilidad(), "atributo " + attribute.id());
            }

            for (UmlModelDto.UmlMethod method : requireList(umlClass.metodos(), "métodos")) {
                if (method == null) {
                    throw new IllegalArgumentException("La lista de métodos no puede contener valores nulos.");
                }
                registerUniqueId(method.id(), "método", allIds);
                validateVisibility(method.visibilidad(), "método " + method.id());
                requireList(method.parametros(), "parámetros");
            }
        }

        for (UmlModelDto.UmlRelation relation : relations) {
            if (relation == null) {
                throw new IllegalArgumentException("La lista de relaciones no puede contener valores nulos.");
            }
            registerUniqueId(relation.id(), "relación", allIds);
            if (!classIds.contains(relation.origen())) {
                throw new IllegalArgumentException(
                    "La relación " + relation.id() + " referencia un origen inexistente: " + relation.origen()
                );
            }
            if (!classIds.contains(relation.destino())) {
                throw new IllegalArgumentException(
                    "La relación " + relation.id() + " referencia un destino inexistente: " + relation.destino()
                );
            }
            if (!ALLOWED_RELATION_TYPES.contains(relation.tipo())) {
                throw new IllegalArgumentException(
                    "Tipo de relación UML no permitido en " + relation.id() + ": " + relation.tipo()
                );
            }
        }
    }

    private void registerUniqueId(String id, String elementType, Set<String> ids) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("El ID de " + elementType + " no puede estar vacío.");
        }
        if (!ids.add(id)) {
            throw new IllegalArgumentException("ID UML duplicado: " + id);
        }
    }

    private void validateVisibility(String visibility, String elementDescription) {
        if (!ALLOWED_VISIBILITIES.contains(visibility)) {
            throw new IllegalArgumentException(
                "Visibilidad UML no permitida en " + elementDescription + ": " + visibility
            );
        }
    }

    private <T> List<T> requireList(List<T> value, String fieldName) {
        if (value == null) {
            throw new IllegalArgumentException("La lista de " + fieldName + " no puede ser nula.");
        }
        return value;
    }
}
