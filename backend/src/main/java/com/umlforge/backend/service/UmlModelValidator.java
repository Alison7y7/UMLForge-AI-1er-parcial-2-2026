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
        "protected",
        "unspecified"
    );

    private static final Set<String> ALLOWED_ATTRIBUTE_TYPE_ORIGINS = Set.of(
        "IMAGEN",
        "SUGERIDO",
        "USUARIO",
        "INDETERMINADO"
    );

    public void validate(UmlModelDto model) {
        if (model == null) {
            throw new IllegalArgumentException("El modelo UML no puede ser nulo.");
        }

        List<UmlModelDto.UmlClass> classes = requireList(model.clases(), "clases");
        List<UmlModelDto.UmlRelation> relations = requireList(model.relaciones(), "relaciones");
        Set<String> allIds = new HashSet<>();
        Set<String> classIds = new HashSet<>();
        Set<String> associationClassIds = new HashSet<>();

        requireList(model.advertencias(), "advertencias").forEach(warning -> {
            if (warning == null || warning.isBlank()) {
                throw new IllegalArgumentException("Las advertencias no pueden contener valores vacios.");
            }
        });

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
                validateAttributeTypeOrigin(attribute);
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
            String associationClassId = relation.claseAsociacion();
            if (associationClassId != null && !associationClassId.isBlank()) {
                if (!"ASOCIACION".equals(relation.tipo())) {
                    throw new IllegalArgumentException(
                        "Una clase de asociacion solo puede pertenecer a una relacion ASOCIACION: "
                            + relation.id()
                    );
                }
                if (!classIds.contains(associationClassId)) {
                    throw new IllegalArgumentException(
                        "La relacion " + relation.id()
                            + " referencia una clase de asociacion inexistente: " + associationClassId
                    );
                }
                if (associationClassId.equals(relation.origen())
                        || associationClassId.equals(relation.destino())) {
                    throw new IllegalArgumentException(
                        "La clase de asociacion debe ser distinta de los extremos: " + relation.id()
                    );
                }
                if (!associationClassIds.add(associationClassId)) {
                    throw new IllegalArgumentException(
                        "La clase de asociacion ya pertenece a otra relacion: " + associationClassId
                    );
                }
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

    private void validateAttributeTypeOrigin(UmlModelDto.UmlAttribute attribute) {
        String origin = attribute.origenTipo();
        if (origin == null || origin.isBlank()) {
            return;
        }
        if (!ALLOWED_ATTRIBUTE_TYPE_ORIGINS.contains(origin)) {
            throw new IllegalArgumentException(
                "Origen de tipo no permitido en atributo " + attribute.id() + ": " + origin
            );
        }
        if (!"INDETERMINADO".equals(origin)
                && (attribute.tipo() == null || attribute.tipo().isBlank())) {
            throw new IllegalArgumentException(
                "El atributo " + attribute.id() + " requiere un tipo para el origen " + origin
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
