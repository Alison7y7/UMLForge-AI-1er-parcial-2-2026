const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /modifiers\.setAttribute\("isOrdered", "false"\);/g,
    'modifiers.setAttribute("isOrdered", "false");\n        modifiers.setAttribute("isUnique", "true");'
);

fs.writeFileSync(file, code, 'utf8');
