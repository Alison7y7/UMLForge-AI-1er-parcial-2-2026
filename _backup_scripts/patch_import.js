const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');

// Replace new UmlRelation(a, b, c, d, e, f, g) with new UmlRelation(a, b, c, d, e, f, g, "", "")
code = code.replace(
    /new XmiImportResponse\.UmlRelation\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,\)]+)\s*\)/g,
    'new XmiImportResponse.UmlRelation($1, $2, $3, $4, $5, $6, $7, "", "")'
);

fs.writeFileSync(file, code, 'utf8');
