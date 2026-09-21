package com.umlforge.backend.service.codegen.flutter;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.io.ByteArrayInputStream;

public class FlutterProjectFacadeTest {

    @Test
    public void testGenerateAndExtract() throws Exception {
        FlutterStructureGenerator structureGen = new FlutterStructureGenerator();
        FlutterModelGenerator modelGen = new FlutterModelGenerator();
        FlutterServiceGenerator serviceGen = new FlutterServiceGenerator();
        FlutterScreenGenerator screenGen = new FlutterScreenGenerator();
        
        FlutterProjectFacade facade = new FlutterProjectFacade(structureGen, modelGen, serviceGen, screenGen);
        
        UmlAttribute attr1 = new UmlAttribute("1", "ID", "Long", "public");
        UmlAttribute attr2 = new UmlAttribute("2", "Nombre", "String", "public");
        UmlAttribute attr3 = new UmlAttribute("3", "Total", "BigDecimal", "public");
        UmlAttribute attr4 = new UmlAttribute("4", "Activo", "bool", "public");
        UmlClass pedidoClass = new UmlClass("c1", "Pedido", "Entity", 0, 0, List.of(attr1, attr2, attr3, attr4), List.of());
        
        UmlModelDto modelDto = new UmlModelDto(List.of(pedidoClass), List.of());
        
        byte[] zipData = facade.generateMobileApp(modelDto);
        
        File outputDir = new File("target/flutter_test_project");
        if (outputDir.exists()) {
            deleteDirectory(outputDir);
        }
        outputDir.mkdirs();
        
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipData))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                File outFile = new File(outputDir, entry.getName());
                if (entry.isDirectory()) {
                    outFile.mkdirs();
                } else {
                    outFile.getParentFile().mkdirs();
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
            }
        }
    }
    
    @Test
    public void testGenerateAndAnalyzeWithRelations() throws Exception {
        FlutterStructureGenerator structureGen = new FlutterStructureGenerator();
        FlutterModelGenerator modelGen = new FlutterModelGenerator();
        FlutterServiceGenerator serviceGen = new FlutterServiceGenerator();
        FlutterScreenGenerator screenGen = new FlutterScreenGenerator();
        
        FlutterProjectFacade facade = new FlutterProjectFacade(structureGen, modelGen, serviceGen, screenGen);
        
        UmlAttribute pAttr1 = new UmlAttribute("p1", "id", "Long", "public");
        UmlAttribute pAttr2 = new UmlAttribute("p2", "nombre", "String", "public");
        UmlClass personaClass = new UmlClass("c1", "Persona", "Entity", 0, 0, List.of(pAttr1, pAttr2), List.of());
        
        UmlAttribute lAttr1 = new UmlAttribute("l1", "id", "Long", "public");
        UmlAttribute lAttr2 = new UmlAttribute("l2", "direccion", "String", "public");
        UmlClass lugarClass = new UmlClass("c2", "Lugar", "Entity", 0, 0, List.of(lAttr1, lAttr2), List.of());
        
        // Persona * ---- 1 Lugar
        com.umlforge.backend.dto.UmlModelDto.UmlRelation relation = new com.umlforge.backend.dto.UmlModelDto.UmlRelation(
            "r1", "c1", "c2", "ASOCIACION", "", "*", "1"
        );
        
        UmlModelDto modelDto = new UmlModelDto(List.of(personaClass, lugarClass), List.of(relation));
        
        byte[] zipData = facade.generateMobileApp(modelDto);
        
        File outputDir = new File("target/flutter_analyze_project");
        if (outputDir.exists()) {
            deleteDirectory(outputDir);
        }
        outputDir.mkdirs();
        
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipData))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                File outFile = new File(outputDir, entry.getName());
                if (entry.isDirectory()) {
                    outFile.mkdirs();
                } else {
                    outFile.getParentFile().mkdirs();
                    try (FileOutputStream fos = new FileOutputStream(outFile)) {
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
            }
        }

        // Run flutter commands
        ProcessBuilder pbCreate = new ProcessBuilder("flutter.bat", "create", ".");
        pbCreate.directory(outputDir);
        Process pCreate = pbCreate.start();
        pCreate.waitFor();

        ProcessBuilder pbAnalyze = new ProcessBuilder("flutter.bat", "analyze");
        pbAnalyze.directory(outputDir);
        Process pAnalyze = pbAnalyze.start();
        int exitCode = pAnalyze.waitFor();
        
        String output = new String(pAnalyze.getInputStream().readAllBytes());
        String errors = new String(pAnalyze.getErrorStream().readAllBytes());
        System.out.println("Flutter analyze output:\n" + output);
        if (exitCode != 0) {
            System.err.println("Flutter analyze errors:\n" + errors);
            throw new RuntimeException("Flutter analyze failed with code " + exitCode + ". Output:\n" + output);
        }
        
        org.junit.jupiter.api.Assertions.assertEquals(0, exitCode, "Flutter analyze should pass");
    }
    
    private void deleteDirectory(File directoryToBeDeleted) {
        File[] allContents = directoryToBeDeleted.listFiles();
        if (allContents != null) {
            for (File file : allContents) {
                deleteDirectory(file);
            }
        }
        directoryToBeDeleted.delete();
    }
}
