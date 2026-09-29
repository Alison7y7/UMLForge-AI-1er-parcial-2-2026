const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /properties\.setAttribute\(\"ea_type\", eaRelationType\(type\)\);/,
    `boolean isAssocRel = relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank() && classIds.containsKey(relation.claseAsociacion());
            properties.setAttribute("ea_type", isAssocRel ? "AssociationClass" : eaRelationType(type));`
);

fs.writeFileSync(file, code, 'utf8');
