const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    'connector.appendChild(document.createElement("extendedProperties"));',
    `Element extProps = document.createElement("extendedProperties");
            if (relation.claseAsociacion() != null && !relation.claseAsociacion().isBlank()) {
                extProps.setAttribute("associationclass", classIds.get(relation.claseAsociacion()));
            }
            connector.appendChild(extProps);`
);

fs.writeFileSync(file, code, 'utf8');
