const fs = require('fs');
const file = 'backend/src/test/java/com/umlforge/backend/service/XmiExportServiceTests.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/exportar\(request, "TestDiagram"\)/, 'exportar("TestDiagram", request)');
fs.writeFileSync(file, code, 'utf8');
