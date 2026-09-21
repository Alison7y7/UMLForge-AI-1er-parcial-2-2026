package com.umlforge.backend.service.codegen;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.dto.UmlModelDto.UmlAttribute;
import com.umlforge.backend.dto.UmlModelDto.UmlClass;
import com.umlforge.backend.dto.UmlModelDto.UmlRelation;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.io.*;
import java.nio.file.*;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IntegrationCompilationTest {

    @Autowired
    private BackendGeneratorFacade facade;

    @Test
    void testGeneratedProjectCompilesWithoutDuplicateAttributes() throws Exception {
        // 1. Cliente 1 ---- * Pedido
        UmlAttribute cId = new UmlAttribute("a1", "id", "Long", "public");
        UmlClass cliente = new UmlClass("c1", "Cliente", null, 0, 0, List.of(cId), List.of());

        UmlAttribute pId = new UmlAttribute("a3", "id", "Long", "public");
        UmlClass pedido = new UmlClass("c2", "Pedido", null, 0, 0, List.of(pId), List.of());

        UmlRelation rel1 = new UmlRelation("r1", "c1", "c2", "ASOCIACION", "", "1", "*");

        // 2. Alumno * ---- * Materia
        UmlClass alumno = new UmlClass("c3", "Alumno", null, 0, 0, List.of(cId), List.of());
        UmlClass materia = new UmlClass("c4", "Materia", null, 0, 0, List.of(cId), List.of());
        UmlRelation rel2 = new UmlRelation("r2", "c3", "c4", "ASOCIACION", "", "*", "*");

        // 3. Persona 1 ---- 1 Carnet
        UmlClass persona = new UmlClass("c5", "Persona", null, 0, 0, List.of(cId), List.of());
        UmlClass carnet = new UmlClass("c6", "Carnet", null, 0, 0, List.of(cId), List.of());
        UmlRelation rel3 = new UmlRelation("r3", "c5", "c6", "ASOCIACION", "", "1", "1");

        // 4. Pedido ◆---- * DetallePedido (Composicion)
        UmlClass detalle = new UmlClass("c7", "DetallePedido", null, 0, 0, List.of(cId), List.of());
        UmlRelation rel4 = new UmlRelation("r4", "c2", "c7", "COMPOSICION", "", "1", "*");

        // 5. Animal <|-- Perro (Herencia)
        UmlClass animal = new UmlClass("c8", "Animal", null, 0, 0, List.of(cId), List.of());
        UmlClass perro = new UmlClass("c9", "Perro", null, 0, 0, List.of(cId), List.of());
        UmlRelation rel5 = new UmlRelation("r5", "c9", "c8", "HERENCIA", "", "", ""); // c9 origin, c8 dest

        UmlModelDto modelDto = new UmlModelDto(
            List.of(cliente, pedido, alumno, materia, persona, carnet, detalle, animal, perro), 
            List.of(rel1, rel2, rel3, rel4, rel5)
        );
        
        com.umlforge.backend.dto.DatabaseConfig dbConfig = new com.umlforge.backend.dto.DatabaseConfig("localhost", 5432, "generated_db", "postgres", "postgres");
        com.umlforge.backend.dto.BackendGenerationRequest request = new com.umlforge.backend.dto.BackendGenerationRequest(modelDto, dbConfig);

        byte[] zipContent = facade.generateBackend(request);
        assertNotNull(zipContent);

        // Extract ZIP
        Path tempDir = Files.createTempDirectory("generated_project_test");
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipContent))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path filePath = tempDir.resolve(entry.getName());
                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    Files.createDirectories(filePath.getParent());
                    Files.copy(zis, filePath);
                }
            }
        }

        Path backendDir = tempDir;
        
        Path entityDir = backendDir.resolve("src/main/java/com/generated/backend/entity");
        String clienteEntity = Files.readString(entityDir.resolve("Cliente.java"));
        String pedidoEntity = Files.readString(entityDir.resolve("Pedido.java"));
        String alumnoEntity = Files.readString(entityDir.resolve("Alumno.java"));
        String personaEntity = Files.readString(entityDir.resolve("Persona.java"));
        String animalEntity = Files.readString(entityDir.resolve("Animal.java"));
        String perroEntity = Files.readString(entityDir.resolve("Perro.java"));

        // Caso 1: 1-to-N
        assertTrue(clienteEntity.contains("@OneToMany("), "Cliente debe tener @OneToMany");
        assertTrue(clienteEntity.contains("mappedBy = \"cliente\""), "Cliente debe tener mappedBy=\"cliente\"");
        assertTrue(pedidoEntity.contains("@ManyToOne"), "Pedido debe tener @ManyToOne");
        assertTrue(pedidoEntity.contains("@JoinColumn(name=\"cliente_id\")"), "Pedido debe tener @JoinColumn");

        // Caso 2: N-to-N
        assertTrue(alumnoEntity.contains("@ManyToMany"), "Alumno debe tener @ManyToMany");
        assertTrue(alumnoEntity.contains("@JoinTable("), "Alumno debe tener @JoinTable");

        // Caso 3: 1-to-1
        assertTrue(personaEntity.contains("@OneToOne"), "Persona debe tener @OneToOne");

        // Caso 4: Composicion
        assertTrue(pedidoEntity.contains("cascade = CascadeType.ALL"), "Pedido debe tener cascade ALL");
        assertTrue(pedidoEntity.contains("orphanRemoval = true"), "Pedido debe tener orphanRemoval = true");

        // Caso 5: Herencia
        assertTrue(animalEntity.contains("@Inheritance(strategy = InheritanceType.JOINED)"), "Animal debe tener @Inheritance");
        assertTrue(perroEntity.contains("public class Perro extends Animal"), "Perro debe heredar de Animal");
        assertEquals(1, countOccurrences(pedidoEntity, "private Long id;"), "Debe haber exactamente un id en Pedido.java");

        // Assert exactly one "Long id" in DTO Responses
        Path dtoDir = backendDir.resolve("src/main/java/com/generated/backend/dto");
        String clienteResponse = Files.readString(dtoDir.resolve("ClienteResponse.java"));
        String pedidoResponse = Files.readString(dtoDir.resolve("PedidoResponse.java"));
        
        assertEquals(1, countOccurrences(clienteResponse, "Long id"), "Debe haber exactamente un id en ClienteResponse.java");
        assertEquals(1, countOccurrences(pedidoResponse, "Long id"), "Debe haber exactamente un id en PedidoResponse.java");
        
        // Run mvn clean compile
        ProcessBuilder pb;
        if (System.getProperty("os.name").toLowerCase().contains("win")) {
            pb = new ProcessBuilder("cmd", "/c", "mvn clean compile");
        } else {
            pb = new ProcessBuilder("mvn", "clean", "compile");
        }
        pb.directory(backendDir.toFile());
        pb.redirectErrorStream(true);
        Process process = pb.start();
        
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line;
        StringBuilder output = new StringBuilder();
        while ((line = reader.readLine()) != null) {
            output.append(line).append("\n");
        }
        
        int exitCode = process.waitFor();
        assertEquals(0, exitCode, "La compilación del proyecto falló:\n" + output.toString());
    }
    
    private int countOccurrences(String text, String searchStr) {
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(searchStr, idx)) != -1) {
            count++;
            idx += searchStr.length();
        }
        return count;
    }
}
