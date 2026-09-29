const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

// 1. Add isStatic, isReadOnly, isUnique, isOrdered
code = code.replace(
    /ownedAttribute\.setAttribute\(\"visibility\"[\s\S]*?\);/,
    `$&
            ownedAttribute.setAttribute("isStatic", "false");
            ownedAttribute.setAttribute("isReadOnly", "false");
            ownedAttribute.setAttribute("isUnique", "true");
            ownedAttribute.setAttribute("isOrdered", "false");`
);

// 2. Add extendedProperties associationclass to connector
code = code.replace(
    /connector\.appendChild\(document\.createElement\(\"extendedProperties\"\)\);/,
    `Element extProps = document.createElement("extendedProperties");
            if (relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank() && classIds.containsKey(relation.claseAsociacion())) {
                extProps.setAttribute("associationclass", classIds.get(relation.claseAsociacion()));
            }
            connector.appendChild(extProps);`
);

fs.writeFileSync(file, code, 'utf8');
