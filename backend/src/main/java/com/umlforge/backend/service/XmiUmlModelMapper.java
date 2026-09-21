package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.XmiImportResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class XmiUmlModelMapper {

    public UmlModelDto toUmlModel(XmiImportResponse source) {
        List<UmlModelDto.UmlClass> classes = source.clases().stream()
            .map(umlClass -> new UmlModelDto.UmlClass(
                umlClass.id(),
                umlClass.nombre(),
                umlClass.estereotipo(),
                umlClass.posicionX(),
                umlClass.posicionY(),
                umlClass.atributos().stream()
                    .map(attribute -> new UmlModelDto.UmlAttribute(
                        attribute.id(),
                        attribute.nombre(),
                        attribute.tipo(),
                        attribute.visibilidad()
                    ))
                    .toList(),
                umlClass.metodos().stream()
                    .map(method -> new UmlModelDto.UmlMethod(
                        method.id(),
                        method.nombre(),
                        method.tipoRetorno(),
                        method.visibilidad(),
                        method.parametros().stream()
                            .map(parameter -> new UmlModelDto.UmlParameter(
                                parameter.nombre(),
                                parameter.tipo()
                            ))
                            .toList()
                    ))
                    .toList()
            ))
            .toList();

        List<UmlModelDto.UmlRelation> relations = source.relaciones().stream()
            .map(relation -> new UmlModelDto.UmlRelation(
                relation.id(),
                relation.origen(),
                relation.destino(),
                relation.tipo(),
                relation.nombre(),
                relation.multiplicidadOrigen(),
                relation.multiplicidadDestino()
            ))
            .toList();

        return new UmlModelDto(classes, relations);
    }
}
