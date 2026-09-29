const fs = require('fs');
const file = 'backend/src/test/java/com/umlforge/backend/service/XmiExportServiceTests.java';
let code = fs.readFileSync(file, 'utf8');

const testCode = `
    @Test
    void testOutputAssociationClass() throws Exception {
        List<XmiImportResponse.UmlClass> classes = List.of(
            umlClass("venta", "Venta", 10, 10, List.of(attribute("v1", "id", "int")), List.of()),
            umlClass("producto", "Producto", 200, 10, List.of(attribute("p1", "id", "int")), List.of()),
            umlClass("detalle", "Detalle", 100, 200, List.of(attribute("d1", "cantidad", "String")), List.of())
        );
        List<XmiImportResponse.UmlRelation> relations = List.of(
            new XmiImportResponse.UmlRelation("r1", "venta", "producto", "ASOCIACION", "", "*", "0..*", "", "", "detalle")
        );
        XmiImportResponse request = new XmiImportResponse(classes, relations);
        
        byte[] output = new XmiExportService().exportar(request, "TestDiagram");
        System.out.println("=== XMI OUTPUT START ===");
        System.out.println(new String(output));
        System.out.println("=== XMI OUTPUT END ===");
    }
`;

code = code.replace(/class XmiExportServiceTests \{/, 'class XmiExportServiceTests {' + testCode);
fs.writeFileSync(file, code, 'utf8');
