const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

const regex = /Element classElement = packagedElement\(\s*document,\s*\"uml:Class\",\s*xmiId,\s*normalizedName\(umlClass\.nombre\(\), \"Clase\"\)\s*\);/;

const replacement = `boolean isAssocClass = false;
                for (XmiImportResponse.UmlRelation rel : modelo.relaciones()) {
                    if (umlClass.id().equals(rel.claseAsociacion())) {
                        isAssocClass = true;
                        break;
                    }
                }
                Element classElement = packagedElement(
                    document,
                    isAssocClass ? "uml:AssociationClass" : "uml:Class",
                    xmiId,
                    normalizedName(umlClass.nombre(), "Clase")
                );`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code, 'utf8');
