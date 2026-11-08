package com.umlforge.backend.service;

import com.umlforge.backend.dto.HallazgoRevisionUml;
import com.umlforge.backend.entity.Diagrama;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UmlDeterministicReviewService {
    private static final Pattern MULTIPLICITY = Pattern.compile(
            "^(?:\\*|\\d+|\\d+\\.\\.(?:\\d+|\\*)|\\d+\\.\\.<\\d+)$");
    private final ObjectMapper mapper;

    public List<HallazgoRevisionUml> analyze(Diagrama diagram) {
        List<HallazgoRevisionUml> findings = new ArrayList<>();
        try {
            JsonNode root = mapper.readTree(diagram.getModeloJson());
            Map<String, JsonNode> classes = new LinkedHashMap<>();
            Set<String> classNames = new HashSet<>();
            for (JsonNode umlClass : root.path("clases")) {
                String id = text(umlClass, "id");
                String name = text(umlClass, "nombre");
                if (!id.isBlank()) classes.put(id, umlClass);
                if (name.isBlank()) {
                    findings.add(finding(HallazgoRevisionUml.Severidad.ERROR, "NOMENCLATURA",
                            "CLASE", id, name, "La clase no tiene un nombre válido.",
                            "El campo nombre está vacío.", "Asignar un nombre único y expresivo."));
                } else if (!classNames.add(name.toLowerCase(Locale.ROOT))) {
                    findings.add(finding(HallazgoRevisionUml.Severidad.ERROR, "DUPLICIDAD",
                            "CLASE", id, name, "Hay clases con el mismo nombre.",
                            "El nombre '" + name + "' aparece más de una vez.", "Renombrar o consolidar responsabilidades."));
                }
                checkMembers(umlClass, id, name, "atributos", findings);
                checkMembers(umlClass, id, name, "metodos", findings);
            }
            Set<String> relationKeys = new HashSet<>();
            for (JsonNode relation : root.path("relaciones")) {
                String id = text(relation, "id");
                String origin = text(relation, "origen");
                String destination = text(relation, "destino");
                if (!classes.containsKey(origin) || !classes.containsKey(destination)) {
                    findings.add(finding(HallazgoRevisionUml.Severidad.ERROR, "INTEGRIDAD",
                            "RELACION", id, text(relation, "nombre"), "La relación referencia una clase inexistente.",
                            "Origen=" + origin + ", destino=" + destination + ".", "Corregir los extremos o eliminar la relación inválida."));
                }
                for (String field : List.of("multiplicidadOrigen", "multiplicidadDestino")) {
                    String value = text(relation, field);
                    if (!value.isBlank() && !MULTIPLICITY.matcher(value).matches()) {
                        findings.add(finding(HallazgoRevisionUml.Severidad.ERROR, "MULTIPLICIDAD",
                                "RELACION", id, text(relation, "nombre"), "La multiplicidad no usa una notación UML válida.",
                                field + "='" + value + "'.", "Usar valores como 1, 0..1, 1..* o *."));
                    }
                }
                String key = origin + "|" + destination + "|" + text(relation, "tipo") + "|" + text(relation, "nombre");
                if (!relationKeys.add(key)) {
                    findings.add(finding(HallazgoRevisionUml.Severidad.ADVERTENCIA, "DUPLICIDAD",
                            "RELACION", id, text(relation, "nombre"), "Existe una relación UML potencialmente duplicada.",
                            "Coinciden origen, destino, tipo y nombre.", "Revisar si ambas relaciones representan conceptos distintos."));
                }
            }
        } catch (Exception e) {
            findings.add(finding(HallazgoRevisionUml.Severidad.ERROR, "MODELO",
                    "DIAGRAMA", String.valueOf(diagram.getId()), diagram.getNombre(),
                    "El modelo persistido no pudo analizarse.", "modeloJson no es JSON UML válido.",
                    "Corregir el modelo antes de solicitar recomendaciones."));
        }
        return List.copyOf(findings);
    }

    private void checkMembers(JsonNode umlClass, String classId, String className, String field,
            List<HallazgoRevisionUml> findings) {
        Set<String> names = new HashSet<>();
        for (JsonNode member : umlClass.path(field)) {
            String name = text(member, "nombre");
            if (!name.isBlank() && !names.add(name.toLowerCase(Locale.ROOT))) {
                findings.add(finding(HallazgoRevisionUml.Severidad.ADVERTENCIA, "DUPLICIDAD",
                        field.equals("atributos") ? "ATRIBUTO" : "METODO", text(member, "id"), name,
                        "La clase contiene miembros con el mismo nombre.",
                        "Clase '" + className + "' (" + classId + "), miembro '" + name + "'.",
                        "Revisar firmas y responsabilidades para evitar ambigüedad."));
            }
        }
    }

    private HallazgoRevisionUml finding(HallazgoRevisionUml.Severidad severity, String category,
            String elementType, String elementId, String elementName, String explanation,
            String evidence, String proposal) {
        return new HallazgoRevisionUml(UUID.randomUUID().toString(), severity, category,
                elementType, elementId, elementName, explanation, evidence, proposal,
                HallazgoRevisionUml.Estado.PENDIENTE);
    }

    private String text(JsonNode node, String field) {
        return node.path(field).asText("").trim();
    }
}
