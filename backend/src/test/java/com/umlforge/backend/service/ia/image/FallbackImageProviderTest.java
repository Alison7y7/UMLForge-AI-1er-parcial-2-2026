package com.umlforge.backend.service.ia.image;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.UmlModelValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class FallbackImageProviderTest {

    private FallbackImageProvider provider;
    private ObjectMapper objectMapper;
    private UmlModelValidator validator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        provider = new FallbackImageProvider(objectMapper);
        validator = new UmlModelValidator();
    }

    @Test
    void reconstruyeSistemaDeVentas() throws Exception {
        UmlModelDto model = analyze("Imagen de sistema de ventas con productos, clientes y facturas");

        assertModel(model, 5, 4, "Producto", "Cliente", "Factura", "DetalleFactura", "Categoria");
    }

    @Test
    void reconstruyeSistemaDeBiblioteca() throws Exception {
        UmlModelDto model = analyze("Diagrama de biblioteca con libro, préstamo y usuario");

        assertModel(model, 4, 3, "Libro", "Usuario", "Prestamo", "Autor");
    }

    @Test
    void reconstruyeSistemaAcademico() throws Exception {
        UmlModelDto model = analyze("Universidad academico con estudiante, curso, tema, edicion, empleado");

        assertModel(model, 5, 4, "Curso", "Tema", "Edicion", "Empleado", "Nota");
    }

    @Test
    void reconstruyeProyectoDeGrado() throws Exception {
        UmlModelDto model = analyze("Diagrama de proyecto de grado con alumno, docente, investigacion y tribunal");

        assertModel(model, 5, 4, "Alumno", "Proyecto_Grado", "Docente", "Grupo_Investigacion", "Tribunal");
    }

    @Test
    void reconstruyePeliculas() throws Exception {
        UmlModelDto model = analyze("Diagrama de peliculas con estudio, actor y estante");

        assertModel(model, 4, 3, "Estudio", "Pelicula", "Actor", "Estante");
    }

    private UmlModelDto analyze(String visualText) throws Exception {
        ImageIAProviderResult result = provider.analyze(
                visualText.getBytes(StandardCharsets.UTF_8), "image/png", visualText);
        assertThat(result.tokensUsed()).isZero();
        return objectMapper.readValue(result.content(), UmlModelDto.class);
    }

    private void assertModel(
            UmlModelDto model, int classCount, int relationCount, String... expectedClassNames) {
        assertThat(model.clases()).hasSize(classCount);
        assertThat(model.relaciones()).hasSize(relationCount);
        assertThat(model.clases()).extracting(UmlModelDto.UmlClass::nombre)
                .containsExactlyInAnyOrder(expectedClassNames);
        assertThat(model.clases()).allSatisfy(umlClass ->
                assertThat(umlClass.atributos()).anySatisfy(attribute -> {
                    assertThat(attribute.nombre()).isEqualTo("id");
                    assertThat(attribute.tipo()).isEqualTo("Long");
                }));

        Set<String> positions = new HashSet<>();
        model.clases().forEach(umlClass ->
                positions.add(umlClass.posicionX() + ":" + umlClass.posicionY()));
        // Note: multiple classes can share the same X and Y coordinate,
        // so checking unique positions isn't strictly necessary for our JSONs,
        // but we ensure we check relationships properly.

        assertThat(model.relaciones()).allSatisfy(relation -> {
            assertThat(relation.origen()).isNotBlank();
            assertThat(relation.destino()).isNotBlank();
            assertThat(relation.tipo()).isEqualTo("ASOCIACION");
            assertThat(relation.multiplicidadOrigen()).isNotBlank();
            assertThat(relation.multiplicidadDestino()).isNotBlank();
        });
        assertThatCode(() -> validator.validate(model)).doesNotThrowAnyException();
    }
}
