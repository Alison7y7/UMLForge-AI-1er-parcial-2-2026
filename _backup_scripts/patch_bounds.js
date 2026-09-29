const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiExportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /setXmiAttribute\(lower, "type", "uml:LiteralInteger"\);/g,
    'setXmiAttribute(lower, "type", bounds.lower().equals("*") ? "uml:LiteralString" : "uml:LiteralInteger");'
);

code = code.replace(
    /setXmiAttribute\(upper, "type", "uml:LiteralUnlimitedNatural"\);/g,
    'setXmiAttribute(upper, "type", bounds.upper().equals("*") ? "uml:LiteralUnlimitedNatural" : "uml:LiteralInteger");'
);

fs.writeFileSync(file, code, 'utf8');
