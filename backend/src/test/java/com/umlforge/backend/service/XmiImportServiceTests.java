package com.umlforge.backend.service;

import com.umlforge.backend.dto.XmiImportResponse;
import com.umlforge.backend.exception.XmiImportException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class XmiImportServiceTests {

    private XmiImportService service;

    @BeforeEach
    void setUp() {
        service = new XmiImportService();
    }

    @Test
    void importaClasesUml() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");

        assertEquals(3, model.clases().size());
        assertTrue(model.clases().stream().anyMatch(umlClass -> umlClass.nombre().equals("Persona")));
        assertTrue(model.clases().stream().anyMatch(umlClass -> umlClass.nombre().equals("Casa")));
    }

    @Test
    void importaAtributosConTipoYVisibilidad() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");
        XmiImportResponse.UmlClass persona = findClass(model, "Persona");

        assertEquals(2, persona.atributos().size());
        assertTrue(persona.atributos().stream().anyMatch(attribute ->
            attribute.nombre().equals("id")
                && attribute.tipo().equals("Long")
                && attribute.visibilidad().equals("private")
        ));
        assertTrue(persona.atributos().stream().anyMatch(attribute ->
            attribute.nombre().equals("nombre") && attribute.tipo().equals("String")
        ));
    }

    @Test
    void importaMetodosParametrosYRetorno() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");
        XmiImportResponse.UmlMethod method = findClass(model, "Persona").metodos().get(0);

        assertEquals("registrar", method.nombre());
        assertEquals("void", method.tipoRetorno());
        assertEquals("public", method.visibilidad());
        assertEquals(1, method.parametros().size());
        assertEquals("Casa", method.parametros().get(0).tipo());
    }

    @Test
    void importaAsociacionUnoAMuchos() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");
        XmiImportResponse.UmlRelation relation = model.relaciones().stream()
            .filter(item -> item.tipo().equals("ASOCIACION"))
            .findFirst()
            .orElseThrow();

        assertEquals("habita", relation.nombre());
        assertEquals("1", relation.multiplicidadOrigen());
        assertEquals("0..*", relation.multiplicidadDestino());
    }

    @Test
    void importaComposicionConExtremoPropietario() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");
        XmiImportResponse.UmlRelation relation = model.relaciones().stream()
            .filter(item -> item.tipo().equals("COMPOSICION"))
            .findFirst()
            .orElseThrow();

        assertEquals("Casa", classNameById(model, relation.origen()));
        assertEquals("Persona", classNameById(model, relation.destino()));
    }

    @Test
    void importaGeneralizacionComoHerencia() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");
        XmiImportResponse.UmlRelation relation = model.relaciones().stream()
            .filter(item -> item.tipo().equals("HERENCIA"))
            .findFirst()
            .orElseThrow();

        assertEquals("Cliente", classNameById(model, relation.origen()));
        assertEquals("Persona", classNameById(model, relation.destino()));
    }

    @Test
    void conservaDistribucionDeCoordenadasEa() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea.xmi");
        XmiImportResponse.UmlClass persona = findClass(model, "Persona");
        XmiImportResponse.UmlClass casa = findClass(model, "Casa");

        assertNotEquals(persona.posicionX(), casa.posicionX());
        assertEquals("entity", persona.estereotipo());
    }

    @Test
    void conservaTiposAunqueElAtributoTengaMultiplicidadIlimitada() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea-fidelidad.xmi");

        assertAttributeType(findClass(model, "Persona"), "ID", "Long");
        assertAttributeType(findClass(model, "Persona"), "Nombre", "String");
        assertAttributeType(findClass(model, "Casa"), "Direccion", "Long");
        assertAttributeType(findClass(model, "Casa"), "ID", "String");
    }

    @Test
    void conservaNombreExtremosMultiplicidadesYPosicionesDeEa() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea-fidelidad.xmi");
        XmiImportResponse.UmlClass persona = findClass(model, "Persona");
        XmiImportResponse.UmlClass casa = findClass(model, "Casa");
        XmiImportResponse.UmlRelation relation = model.relaciones().get(0);

        assertEquals("realiza", relation.nombre());
        assertEquals("ASOCIACION", relation.tipo());
        assertEquals(persona.id(), relation.origen());
        assertEquals(casa.id(), relation.destino());
        assertEquals("0..*", relation.multiplicidadOrigen());
        assertEquals("0..*", relation.multiplicidadDestino());
        assertTrue(persona.posicionX() < casa.posicionX());
    }

    @Test
    void noConvierteElementosGraficosSparxEnClasesDuplicadas() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea-duplicados.xmi");
        XmiImportResponse.UmlClass vehiculo = findClass(model, "vehiculo");
        XmiImportResponse.UmlClass direccion = findClass(model, "Direccion");

        assertEquals(2, model.clases().size());
        assertEquals(3, vehiculo.atributos().size());
        assertEquals(3, direccion.atributos().size());
        assertTrue(model.clases().stream().noneMatch(umlClass -> umlClass.atributos().isEmpty()));
        assertTrue(vehiculo.posicionX() < direccion.posicionX());
    }

    @Test
    void noDuplicaAsociacionPorElConectorGraficoSparx() throws IOException {
        XmiImportResponse model = importFixture("modelo-ea-duplicados.xmi");
        XmiImportResponse.UmlClass vehiculo = findClass(model, "vehiculo");
        XmiImportResponse.UmlClass direccion = findClass(model, "Direccion");

        assertEquals(1, model.relaciones().size());
        XmiImportResponse.UmlRelation relation = model.relaciones().get(0);
        assertEquals("total", relation.nombre());
        assertEquals("ASOCIACION", relation.tipo());
        assertEquals(vehiculo.id(), relation.origen());
        assertEquals(direccion.id(), relation.destino());
        assertTrue(model.clases().stream().anyMatch(umlClass -> umlClass.id().equals(relation.origen())));
        assertTrue(model.clases().stream().anyMatch(umlClass -> umlClass.id().equals(relation.destino())));
    }

    @Test
    void rechazaXmiInvalido() throws IOException {
        XmiImportException exception = assertThrows(
            XmiImportException.class,
            () -> importFixture("invalido.xmi")
        );

        assertEquals("El archivo no contiene XML válido.", exception.getMessage());
    }

    @Test
    void rechazaDoctypeYEntidadesExternas() {
        String maliciousXml = """
            <?xml version="1.0"?>
            <!DOCTYPE xmi:XMI [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
            <xmi:XMI xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmi:version="2.1">&xxe;</xmi:XMI>
            """;
        MockMultipartFile file = new MockMultipartFile(
            "archivo",
            "xxe.xmi",
            "application/xml",
            maliciousXml.getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );

        XmiImportException exception = assertThrows(XmiImportException.class, () -> service.importar(file));
        assertEquals("El archivo no contiene XML válido.", exception.getMessage());
    }

    private XmiImportResponse importFixture(String filename) throws IOException {
        try (InputStream input = getClass().getResourceAsStream("/xmi/" + filename)) {
            assertFalse(input == null, "No se encontró el fixture " + filename);
            MockMultipartFile file = new MockMultipartFile(
                "archivo",
                filename,
                "application/xml",
                input
            );
            return service.importar(file);
        }
    }

    private XmiImportResponse.UmlClass findClass(XmiImportResponse model, String name) {
        return model.clases().stream()
            .filter(umlClass -> umlClass.nombre().equals(name))
            .findFirst()
            .orElseThrow();
    }

    private void assertAttributeType(XmiImportResponse.UmlClass umlClass, String name, String type) {
        assertTrue(umlClass.atributos().stream().anyMatch(attribute ->
            attribute.nombre().equals(name) && attribute.tipo().equals(type)
        ));
    }

    private String classNameById(XmiImportResponse model, String id) {
        return model.clases().stream()
            .filter(umlClass -> umlClass.id().equals(id))
            .map(XmiImportResponse.UmlClass::nombre)
            .findFirst()
            .orElseThrow();
    }

    @Test
    void reconstruyeBidireccionalmenteAssociationClassYGeometria() throws Exception {
        String xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <xmi:XMI xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmi:version="2.1">
                <uml:Model xmi:id="MODEL" name="Diagrama">
                    <packagedElement xmi:type="uml:Package" xmi:id="PKG" name="Diagrama">
                        <packagedElement xmi:type="uml:Class" xmi:id="C1" name="Venta" />
                        <packagedElement xmi:type="uml:Class" xmi:id="C2" name="Producto" />
                        <packagedElement xmi:type="uml:AssociationClass" xmi:id="C3" name="Detalle" memberEnd="E1 E2">
                            <ownedEnd xmi:id="E1" type="C1" name="ventas" />
                            <ownedEnd xmi:id="E2" type="C2" name="productos" />
                        </packagedElement>
                    </packagedElement>
                </uml:Model>
                <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
                    <elements>
                        <element xmi:idref="C1" xmi:type="uml:Class" name="Venta">
                            <properties sType="Class" />
                        </element>
                        <element xmi:idref="C2" xmi:type="uml:Class" name="Producto">
                            <properties sType="Class" />
                        </element>
                        <element xmi:idref="C3" xmi:type="uml:AssociationClass" name="Detalle">
                            <properties sType="AssociationClass" />
                            <extendedProperties associationclass="R1" />
                        </element>
                    </elements>
                    <connectors>
                        <connector xmi:idref="R1">
                            <source xmi:idref="C1">
                                <role name="ventas"/>
                                <type multiplicity="1..*"/>
                            </source>
                            <target xmi:idref="C2">
                                <role name="productos"/>
                                <type multiplicity="1..*"/>
                            </target>
                            <properties ea_type="AssociationClass"/>
                            <extendedProperties associationclass="C3"/>
                        </connector>
                    </connectors>
                    <diagrams>
                        <diagram xmi:id="D1">
                            <elements>
                                <element geometry="Left=100;Top=100;Right=240;Bottom=220;" subject="C1" />
                                <element geometry="Left=300;Top=100;Right=440;Bottom=220;" subject="C2" />
                                <element geometry="Left=200;Top=200;Right=340;Bottom=320;" subject="C3" />
                            </elements>
                        </diagram>
                    </diagrams>
                </xmi:Extension>
            </xmi:XMI>
            """;
            
        XmiImportResponse response = service.importar(new MockMultipartFile("archivo", "diagrama.xmi", "application/xml", xml.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        
        assertEquals(3, response.clases().size());
        XmiImportResponse.UmlClass detalle = findClass(response, "Detalle");
        assertEquals(140.0, detalle.ancho());
        assertEquals(120.0, detalle.alto());
        
        assertEquals(1, response.relaciones().size());
        XmiImportResponse.UmlRelation relacion = response.relaciones().get(0);
        assertEquals(detalle.id(), relacion.claseAsociacion());
        assertEquals("ventas", relacion.rolOrigen());
        assertEquals("productos", relacion.rolDestino());
    }
}
