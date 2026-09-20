package com.umlforge.backend.service;

import com.umlforge.backend.dto.XmiImportResponse;
import com.umlforge.backend.exception.XmiExportException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class XmiExportServiceTests {

    private XmiExportService exportService;

    @BeforeEach
    void setUp() {
        exportService = new XmiExportService();
    }

    @Test
    void exportaUnaClaseUmlReal() throws Exception {
        XmiImportResponse oneClass = new XmiImportResponse(
            List.of(umlClass("cliente", "Cliente", 80, 100, List.of(), List.of())),
            List.of()
        );

        Document document = parse(exportService.exportar("Ventas", oneClass));

        assertEquals(1, elementsByXmiType(document, "uml:Class").size());
        assertEquals("Cliente", elementsByXmiType(document, "uml:Class").get(0).getAttribute("name"));
    }

    @Test
    void exportaAtributosConTiposYVisibilidad() throws Exception {
        Document document = parseExportedSample();
        Element cliente = classByName(document, "Cliente");
        List<Element> attributes = directChildren(cliente, "ownedAttribute");

        assertEquals(2, attributes.size());
        assertEquals("private", attributes.get(0).getAttribute("visibility"));
        assertTrue(directChildren(attributes.get(0), "type").get(0).getAttribute("href").endsWith("#Long"));
        assertTrue(directChildren(attributes.get(1), "type").get(0).getAttribute("href").endsWith("#String"));
    }

    @Test
    void exportaMetodosParametrosYRetorno() throws Exception {
        Document document = parseExportedSample();
        Element operation = directChildren(classByName(document, "Cliente"), "ownedOperation").get(0);
        List<Element> parameters = directChildren(operation, "ownedParameter");

        assertEquals("registrar", operation.getAttribute("name"));
        assertEquals("public", operation.getAttribute("visibility"));
        assertEquals(2, parameters.size());
        assertEquals("in", parameters.get(0).getAttribute("direction"));
        assertEquals(classByName(document, "Pedido").getAttribute("xmi:id"), parameters.get(0).getAttribute("type"));
        assertEquals("return", parameters.get(1).getAttribute("direction"));
        assertTrue(directChildren(parameters.get(1), "type").get(0).getAttribute("href").endsWith("#Boolean"));
    }

    @Test
    void exportaAsociacionConNombre() throws Exception {
        Document document = parseExportedSample();
        Element association = relationByName(document, "uml:Association", "realiza");

        assertNotNull(association);
        assertEquals(2, directChildren(association, "ownedEnd").size());
    }

    @Test
    void exportaMultiplicidadUnoACeroMuchos() throws Exception {
        Document document = parseExportedSample();
        List<Element> ends = directChildren(relationByName(document, "uml:Association", "realiza"), "ownedEnd");

        assertMultiplicity(ends.get(0), "1", "1");
        assertMultiplicity(ends.get(1), "0", "*");
        assertEquals("uml:LiteralUnlimitedNatural", directChildren(ends.get(1), "upperValue").get(0).getAttribute("xmi:type"));
    }

    @Test
    void exportaComposicion() throws Exception {
        Document document = parseExportedSample();
        Element composition = relationByName(document, "uml:Association", "contiene");
        List<Element> ends = directChildren(composition, "ownedEnd");

        assertEquals("", ends.get(0).getAttribute("aggregation"));
        assertEquals("composite", ends.get(1).getAttribute("aggregation"));
    }

    @Test
    void exportaGeneralizacionEnClaseHija() throws Exception {
        Document document = parseExportedSample();
        Element clienteEspecial = classByName(document, "ClienteEspecial");
        Element generalization = directChildren(clienteEspecial, "generalization").get(0);

        assertEquals("uml:Generalization", generalization.getAttribute("xmi:type"));
        assertEquals(classByName(document, "Cliente").getAttribute("xmi:id"), generalization.getAttribute("general"));
    }

    @Test
    void exportaDependencia() throws Exception {
        Document document = parseExportedSample();
        Element dependency = elementsByXmiType(document, "uml:Dependency").get(0);

        assertEquals(classByName(document, "Cliente").getAttribute("xmi:id"), dependency.getAttribute("client"));
        assertEquals(classByName(document, "Detalle").getAttribute("xmi:id"), dependency.getAttribute("supplier"));
    }

    @Test
    void generaXmlXmiValidoConNamespaces() throws Exception {
        Document document = parseExportedSample();
        Element root = document.getDocumentElement();

        assertEquals("XMI", root.getLocalName());
        assertEquals("2.1", root.getAttribute("xmi:version"));
        assertEquals("http://schema.omg.org/spec/XMI/2.1", root.lookupNamespaceURI("xmi"));
        assertEquals("http://schema.omg.org/spec/UML/2.1", root.lookupNamespaceURI("uml"));
    }

    @Test
    void generaExtensionVisualEaConPosicionesYVisibilidad() throws Exception {
        Document document = parseExportedSample();
        Element extension = (Element) document.getElementsByTagNameNS(
            "http://schema.omg.org/spec/XMI/2.1",
            "Extension"
        ).item(0);
        Element diagram = (Element) extension.getElementsByTagName("diagram").item(0);
        String style = ((Element) diagram.getElementsByTagName("style1").item(0)).getAttribute("value");
        List<Element> diagramElements = directChildren(
            (Element) diagram.getElementsByTagName("elements").item(0),
            "element"
        );

        assertNotNull(extension);
        assertTrue(style.contains("HideAtts=0"));
        assertTrue(style.contains("HideOps=0"));
        assertTrue(style.contains("ShowPrivate=1"));
        assertTrue(style.contains("ShowProtected=1"));
        assertTrue(style.contains("ShowPublic=1"));
        assertTrue(style.contains("OpParams=1"));
        assertTrue(style.contains("VisibleAttributeDetail=0"));
        assertTrue(style.contains("ShowOpRetType=1"));
        assertEquals(4, diagramElements.size());
        assertTrue(left(diagramElements.get(0)) < left(diagramElements.get(1)));
        assertEquals(4, directChildren(
            (Element) diagram.getElementsByTagName("links").item(0),
            "link"
        ).size());
    }

    @Test
    void generaClassDiagramSparxConIdsYReferenciasCoherentes() throws Exception {
        Document document = parseExportedSample();
        Element documentation = (Element) document.getElementsByTagNameNS(
            "http://schema.omg.org/spec/XMI/2.1",
            "Documentation"
        ).item(0);
        Element extension = (Element) document.getElementsByTagNameNS(
            "http://schema.omg.org/spec/XMI/2.1",
            "Extension"
        ).item(0);

        assertEquals("Enterprise Architect", documentation.getAttribute("exporter"));
        assertEquals("6.5", documentation.getAttribute("exporterVersion"));
        assertEquals("1554", documentation.getAttribute("exporterID"));
        assertEquals("Enterprise Architect", extension.getAttribute("extender"));

        Element semanticPackage = elementsByXmiType(document, "uml:Package").get(0);
        String packageId = semanticPackage.getAttribute("xmi:id");
        assertTrue(packageId.matches("EAPK_[0-9A-F]{8}_[0-9A-F]{4}_[0-9A-F]{4}_[0-9A-F]{4}_[0-9A-F]{12}"));
        assertEquals(41, packageId.length());

        Element extensionElements = directChildren(extension, "elements").get(0);
        Element sparxPackage = directChildren(extensionElements, "element").stream()
            .filter(element -> "uml:Package".equals(element.getAttribute("xmi:type")))
            .findFirst()
            .orElseThrow();
        assertEquals(packageId, sparxPackage.getAttribute("xmi:idref"));

        Set<String> semanticClassIds = idsByXmiTypes(document, Set.of("uml:Class"));
        Set<String> semanticRelationIds = idsByXmiTypes(
            document,
            Set.of("uml:Association", "uml:Generalization", "uml:Dependency")
        );
        assertTrue(semanticClassIds.stream().allMatch(this::isCompactEaId));
        assertTrue(semanticRelationIds.stream().allMatch(this::isCompactEaId));

        Element diagram = directChildren(directChildren(extension, "diagrams").get(0), "diagram").get(0);
        assertTrue(isCompactEaId(diagram.getAttribute("xmi:id")));

        Element diagramModel = directChildren(diagram, "model").get(0);
        assertEquals(packageId, diagramModel.getAttribute("package"));
        assertEquals(packageId, diagramModel.getAttribute("owner"));
        assertEquals("Logical", directChildren(diagram, "properties").get(0).getAttribute("type"));
        assertEquals(1, directChildren(diagram, "style2").size());
        assertEquals(0, directChildren(diagram, "swimlanes").size());
        assertEquals(0, directChildren(diagram, "matrixitems").size());
        assertEquals(1, directChildren(diagram, "extendedProperties").size());

        String style = directChildren(diagram, "style1").get(0).getAttribute("value");
        assertEquals(
            "ShowPrivate=1;ShowProtected=1;ShowPublic=1;OpParams=1;"
                + "VisibleAttributeDetail=0;ShowOpRetType=1;HideAtts=0;HideOps=0;",
            style
        );
        assertEquals(
            "VisibleAttributeDetail=0;ShowOpRetType=1;",
            directChildren(diagram, "style2").get(0).getAttribute("value")
        );

        List<Element> graphicalElements = directChildren(
            directChildren(diagram, "elements").get(0),
            "element"
        );
        assertEquals(semanticClassIds.size(), graphicalElements.size());
        assertEquals(semanticClassIds, graphicalElements.stream()
            .map(element -> element.getAttribute("subject"))
            .collect(java.util.stream.Collectors.toSet()));
        graphicalElements.forEach(element -> {
            assertTrue(element.getAttribute("geometry").matches(
                "Left=-?\\d+;Top=-?\\d+;Right=-?\\d+;Bottom=-?\\d+;"
            ));
            assertTrue(element.getAttribute("style").matches("DUID=[0-9A-F]{8};"));
        });

        Element extensionConnectors = directChildren(extension, "connectors").get(0);
        List<Element> connectors = directChildren(extensionConnectors, "connector");
        assertEquals(semanticRelationIds, connectors.stream()
            .map(connector -> connector.getAttribute("xmi:idref"))
            .collect(java.util.stream.Collectors.toSet()));
        connectors.forEach(connector -> {
            assertTrue(semanticClassIds.contains(
                directChildren(connector, "source").get(0).getAttribute("xmi:idref")
            ));
            assertTrue(semanticClassIds.contains(
                directChildren(connector, "target").get(0).getAttribute("xmi:idref")
            ));
        });

        List<Element> graphicalLinks = directChildren(
            directChildren(diagram, "links").get(0),
            "link"
        );
        assertEquals(semanticRelationIds.size(), graphicalLinks.size());
        assertEquals(semanticRelationIds, graphicalLinks.stream()
            .map(link -> link.getAttribute("connector"))
            .collect(java.util.stream.Collectors.toSet()));
        graphicalLinks.forEach(link -> {
            assertTrue(link.getAttribute("geometry").contains("EDGE=3"));
            assertTrue(link.getAttribute("style").matches(
                "Mode=3;EOID=[0-9A-F]{8};SOID=[0-9A-F]{8};Color=-1;LWidth=0;"
            ));
        });
    }

    @Test
    void limitaAtributosDeExtensionAlFormatoCompactoDeEa() throws Exception {
        Document document = parseExportedSample();
        Element extension = (Element) document.getElementsByTagNameNS(
            "http://schema.omg.org/spec/XMI/2.1",
            "Extension"
        ).item(0);
        Element diagram = directChildren(directChildren(extension, "diagrams").get(0), "diagram").get(0);
        Element diagramModel = directChildren(diagram, "model").get(0);
        String style1 = directChildren(diagram, "style1").get(0).getAttribute("value");
        String style2 = directChildren(diagram, "style2").get(0).getAttribute("value");

        assertTrue(style1.length() <= 255);
        assertTrue(style2.length() <= 64);
        assertTrue(diagramModel.getAttribute("package").matches(
            "EAPK_[0-9A-F]{8}_[0-9A-F]{4}_[0-9A-F]{4}_[0-9A-F]{4}_[0-9A-F]{12}"
        ));
        assertEquals(diagramModel.getAttribute("package"), diagramModel.getAttribute("owner"));

        List<Element> graphicalElements = directChildren(
            directChildren(diagram, "elements").get(0),
            "element"
        );
        graphicalElements.forEach(element -> {
            assertTrue(element.getAttribute("geometry").length() <= 80);
            assertTrue(element.getAttribute("style").matches("DUID=[0-9A-F]{8};"));
        });

        assertExtensionAttributesAtMost(extension, 255);
    }

    @Test
    void conservaModeloEnRoundTripParcial() {
        XmiImportResponse source = sampleModel();
        byte[] exported = exportService.exportar("Ventas", source);
        MockMultipartFile file = new MockMultipartFile(
            "archivo",
            "ventas.xmi",
            "application/xml",
            exported
        );

        XmiImportResponse imported = new XmiImportService().importar(file);

        assertEquals(4, imported.clases().size());
        assertEquals(4, imported.relaciones().size());
        assertEquals(2, findClass(imported, "Cliente").atributos().size());
        assertEquals(1, findClass(imported, "Cliente").metodos().size());
        assertTrue(imported.relaciones().stream().anyMatch(relation ->
            relation.tipo().equals("ASOCIACION")
                && relation.nombre().equals("realiza")
                && relation.multiplicidadOrigen().equals("1")
                && relation.multiplicidadDestino().equals("0..*")
        ));
        assertTrue(imported.relaciones().stream().anyMatch(relation -> relation.tipo().equals("COMPOSICION")));
        assertTrue(imported.relaciones().stream().anyMatch(relation -> relation.tipo().equals("HERENCIA")));
        assertTrue(imported.relaciones().stream().anyMatch(relation -> relation.tipo().equals("DEPENDENCIA")));
    }

    @Test
    void rechazaModeloSinClasesConMensajeControlado() {
        XmiExportException exception = assertThrows(
            XmiExportException.class,
            () -> exportService.exportar("Vacío", new XmiImportResponse(List.of(), List.of()))
        );

        assertEquals("No hay elementos UML para exportar.", exception.getMessage());
    }

    @Test
    void rechazaRelacionConExtremoInexistente() {
        XmiImportResponse invalidModel = new XmiImportResponse(
            List.of(umlClass("cliente", "Cliente", 0, 0, List.of(), List.of())),
            List.of(relation("r1", "cliente", "ausente", "ASOCIACION", "", "", ""))
        );

        XmiExportException exception = assertThrows(
            XmiExportException.class,
            () -> exportService.exportar("Inválido", invalidModel)
        );

        assertEquals("No se pudo generar el archivo XMI.", exception.getMessage());
    }

    private Document parseExportedSample() throws Exception {
        return parse(exportService.exportar("Ventas", sampleModel()));
    }

    private Document parse(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
    }

    private XmiImportResponse sampleModel() {
        XmiImportResponse.UmlMethod method = new XmiImportResponse.UmlMethod(
            "method-1",
            "registrar",
            "Boolean",
            "public",
            List.of(new XmiImportResponse.UmlParameter("pedido", "Pedido"))
        );
        List<XmiImportResponse.UmlClass> classes = List.of(
            umlClass("cliente", "Cliente", 80, 100, List.of(
                attribute("cliente-id", "id", "Long"),
                attribute("cliente-nombre", "nombre", "String")
            ), List.of(method)),
            umlClass("pedido", "Pedido", 430, 100, List.of(
                attribute("pedido-id", "id", "Long"),
                attribute("pedido-fecha", "fecha", "Date")
            ), List.of()),
            umlClass("detalle", "Detalle", 760, 100, List.of(), List.of()),
            umlClass("especial", "ClienteEspecial", 80, 380, List.of(), List.of())
        );
        List<XmiImportResponse.UmlRelation> relations = List.of(
            relation("r1", "cliente", "pedido", "ASOCIACION", "realiza", "1", "0..*"),
            relation("r2", "pedido", "detalle", "COMPOSICION", "contiene", "1", "1..*"),
            relation("r3", "especial", "cliente", "HERENCIA", "", "", ""),
            relation("r4", "cliente", "detalle", "DEPENDENCIA", "usa", "", "")
        );
        return new XmiImportResponse(classes, relations);
    }

    private XmiImportResponse.UmlClass umlClass(
            String id,
            String name,
            double x,
            double y,
            List<XmiImportResponse.UmlAttribute> attributes,
            List<XmiImportResponse.UmlMethod> methods) {
        return new XmiImportResponse.UmlClass(id, name, "", x, y, attributes, methods);
    }

    private XmiImportResponse.UmlAttribute attribute(String id, String name, String type) {
        return new XmiImportResponse.UmlAttribute(id, name, type, "private");
    }

    private XmiImportResponse.UmlRelation relation(
            String id,
            String source,
            String target,
            String type,
            String name,
            String sourceMultiplicity,
            String targetMultiplicity) {
        return new XmiImportResponse.UmlRelation(
            id,
            source,
            target,
            type,
            name,
            sourceMultiplicity,
            targetMultiplicity
        );
    }

    private List<Element> elementsByXmiType(Document document, String type) {
        NodeList nodes = document.getElementsByTagName("packagedElement");
        java.util.ArrayList<Element> result = new java.util.ArrayList<>();
        for (int index = 0; index < nodes.getLength(); index++) {
            Element element = (Element) nodes.item(index);
            if (type.equals(element.getAttribute("xmi:type"))) result.add(element);
        }
        return result;
    }

    private Element classByName(Document document, String name) {
        return elementsByXmiType(document, "uml:Class").stream()
            .filter(element -> name.equals(element.getAttribute("name")))
            .findFirst()
            .orElseThrow();
    }

    private Element relationByName(Document document, String type, String name) {
        return elementsByXmiType(document, type).stream()
            .filter(element -> name.equals(element.getAttribute("name")))
            .findFirst()
            .orElseThrow();
    }

    private List<Element> directChildren(Element parent, String name) {
        java.util.ArrayList<Element> result = new java.util.ArrayList<>();
        NodeList nodes = parent.getChildNodes();
        for (int index = 0; index < nodes.getLength(); index++) {
            if (nodes.item(index) instanceof Element element && name.equals(element.getNodeName())) {
                result.add(element);
            }
        }
        return result;
    }

    private void assertMultiplicity(Element end, String lower, String upper) {
        assertEquals(lower, directChildren(end, "lowerValue").get(0).getAttribute("value"));
        assertEquals(upper, directChildren(end, "upperValue").get(0).getAttribute("value"));
    }

    private int left(Element element) {
        String geometry = element.getAttribute("geometry");
        String value = geometry.substring(geometry.indexOf("Left=") + 5, geometry.indexOf(';'));
        return Integer.parseInt(value);
    }

    private Set<String> idsByXmiTypes(Document document, Set<String> types) {
        Set<String> ids = new HashSet<>();
        NodeList nodes = document.getElementsByTagName("*");
        for (int index = 0; index < nodes.getLength(); index++) {
            Element element = (Element) nodes.item(index);
            if (types.contains(element.getAttribute("xmi:type"))
                    && !element.getAttribute("xmi:id").isBlank()) {
                ids.add(element.getAttribute("xmi:id"));
            }
        }
        return ids;
    }

    private boolean isCompactEaId(String value) {
        return value.matches(
            "EAID_[0-9A-F]{8}_[0-9A-F]{4}_[0-9A-F]{4}_[0-9A-F]{4}_[0-9A-F]{12}"
        ) && value.length() == 41;
    }

    private void assertExtensionAttributesAtMost(Element extension, int maximumLength) {
        assertElementAttributesAtMost(extension, maximumLength);
        NodeList descendants = extension.getElementsByTagName("*");
        for (int index = 0; index < descendants.getLength(); index++) {
            assertElementAttributesAtMost((Element) descendants.item(index), maximumLength);
        }
    }

    private void assertElementAttributesAtMost(Element element, int maximumLength) {
        var attributes = element.getAttributes();
        for (int index = 0; index < attributes.getLength(); index++) {
            var attribute = attributes.item(index);
            String location = element.getNodeName() + "@" + attribute.getNodeName();
            assertTrue(
                attribute.getNodeValue().length() <= maximumLength,
                () -> location + " supera " + maximumLength + " caracteres"
            );
        }
    }

    private XmiImportResponse.UmlClass findClass(XmiImportResponse model, String name) {
        return model.clases().stream()
            .filter(umlClass -> umlClass.nombre().equals(name))
            .findFirst()
            .orElseThrow();
    }
}
