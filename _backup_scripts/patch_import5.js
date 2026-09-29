const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/return new XmiImportResponse\.UmlRelation\([\s\S]*?multiplicityFor\(ends, targetClass\)\s*\);/g, 
    'return new XmiImportResponse.UmlRelation(\n' +
    '            "xmi-relacion-" + (++counters.relation),\n' +
    '            idMap.get(sourceClass),\n' +
    '            idMap.get(targetClass),\n' +
    '            type,\n' +
    '            firstNonBlank(\n' +
    '                plainAttribute(association, "name"),\n' +
    '                connector == null ? "" : connector.name\n' +
    '            ),\n' +
    '            multiplicityFor(ends, sourceClass),\n' +
    '            multiplicityFor(ends, targetClass),\n' +
    '            "",\n' +
    '            ""\n' +
    '        );');

fs.writeFileSync(file, code, 'utf8');
