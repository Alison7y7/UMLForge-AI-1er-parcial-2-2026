const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /properties\.setAttribute\(\"sType\", \"Class\"\);/,
    `boolean isAssocClass = false;
            for (XmiImportResponse.UmlRelation rel : modelo.relaciones()) {
                if (umlClass.id().equals(rel.claseAsociacion())) {
                    isAssocClass = true;
                    break;
                }
            }
            properties.setAttribute("sType", isAssocClass ? "AssociationClass" : "Class");`
);

fs.writeFileSync(file, code, 'utf8');
