const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /safeText\(multiplicidadDestino\)\s*\)/g,
    'safeText(multiplicidadDestino), "", "")'
);

code = code.replace(
    /idMap\.get\(supplier\),\n\s*"DEPENDENCIA",\n\s*name,\n\s*"",\n\s*""\n\s*\)/g,
    'idMap.get(supplier),\n                    "DEPENDENCIA",\n                    name,\n                    "",\n                    "",\n                    "",\n                    "")'
);

code = code.replace(
    /idMap\.get\(parentId\),\n\s*"HERENCIA",\n\s*"",\n\s*"",\n\s*""\n\s*\)/g,
    'idMap.get(parentId),\n                    "HERENCIA",\n                    "",\n                    "",\n                    "",\n                    "",\n                    "")'
);

fs.writeFileSync(file, code, 'utf8');
