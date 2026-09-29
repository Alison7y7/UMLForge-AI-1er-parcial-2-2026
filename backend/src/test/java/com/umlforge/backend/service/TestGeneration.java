package com.umlforge.backend.service;
import org.junit.jupiter.api.Test;
import com.umlforge.backend.dto.XmiImportResponse;
import java.util.List;
import java.nio.file.Files;
import java.nio.file.Paths;

public class TestGeneration {
    @Test
    public void generateOutput() throws Exception {
        List<XmiImportResponse.UmlClass> classes = List.of(
            new XmiImportResponse.UmlClass("venta", "Venta", "", 10.0, 10.0, List.of(
                new XmiImportResponse.UmlAttribute("v1", "id", "int", "private")
            ), List.of()),
            new XmiImportResponse.UmlClass("producto", "Producto", "", 200.0, 10.0, List.of(
                new XmiImportResponse.UmlAttribute("p1", "id", "int", "private")
            ), List.of()),
            new XmiImportResponse.UmlClass("detalle", "Detalle", "", 100.0, 200.0, List.of(
                new XmiImportResponse.UmlAttribute("d1", "cantidad", "String", "private")
            ), List.of())
        );
        List<XmiImportResponse.UmlRelation> relations = List.of(
            new XmiImportResponse.UmlRelation("r1", "venta", "producto", "ASOCIACION", "", "*", "0..*", "", "", "detalle")
        );
        XmiImportResponse request = new XmiImportResponse(classes, relations);
        byte[] output = new XmiExportService().exportar("TestDiagram", request);
        Files.write(Paths.get("../test-output.xmi"), output);
    }
}
