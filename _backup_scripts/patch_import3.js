const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /result\.add\(new XmiImportResponse\.UmlRelation\(\s*"xmi-relacion-" \+ \(\+\+counters\.relation\),\s*idMap\.get\(client\),\s*idMap\.get\(supplier\),\s*"DEPENDENCIA",\s*plainAttribute\(element, "name"\),\s*"",\s*""\s*\)\);/g,
    'result.add(new XmiImportResponse.UmlRelation(\n' +
    '                    "xmi-relacion-" + (++counters.relation),\n' +
    '                    idMap.get(client),\n' +
    '                    idMap.get(supplier),\n' +
    '                    "DEPENDENCIA",\n' +
    '                    plainAttribute(element, "name"),\n' +
    '                    "",\n' +
    '                    "",\n' +
    '                    "",\n' +
    '                    ""\n' +
    '                ));'
);

code = code.replace(
    /return new XmiImportResponse\.UmlRelation\(\s*"xmi-relacion-" \+ \(\+\+counters\.relation\),\s*idMap\.get\(sourceClass\),\s*idMap\.get\(targetClass\),\s*type,\s*firstNonBlank\(\s*plainAttribute\(association, "name"\),\s*connector == null \? "" : connector\.name\s*\),\s*multiplicityFor\(ends, sourceClass\),\s*multiplicityFor\(ends, targetClass\)\s*\);/g,
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
    '        );'
);

code = code.replace(
    /relations\.add\(new XmiImportResponse\.UmlRelation\(\s*"xmi-relacion-" \+ \(\+\+counters\.relation\),\s*idMap\.get\(childId\),\s*idMap\.get\(parentId\),\s*"HERENCIA",\s*plainAttribute\(element, "name"\),\s*"",\s*""\s*\)\);/g,
    'relations.add(new XmiImportResponse.UmlRelation(\n' +
    '            "xmi-relacion-" + (++counters.relation),\n' +
    '            idMap.get(childId),\n' +
    '            idMap.get(parentId),\n' +
    '            "HERENCIA",\n' +
    '            plainAttribute(element, "name"),\n' +
    '            "",\n' +
    '            "",\n' +
    '            "",\n' +
    '            ""\n' +
    '        ));'
);

fs.writeFileSync(file, code, 'utf8');
