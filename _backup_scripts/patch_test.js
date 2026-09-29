const fs = require('fs');
const file = 'backend/src/test/java/com/umlforge/backend/service/XmiExportServiceTests.java';
let code = fs.readFileSync(file, 'utf8');

const regex = /private XmiImportResponse\.UmlRelation relation\(\s*String id,\s*String source,\s*String target,\s*String type,\s*String name,\s*String sourceMultiplicity,\s*String targetMultiplicity\)\s*\{/;

const replacement = `private XmiImportResponse.UmlRelation relation(
            String id,
            String source,
            String target,
            String type,
            String name,
            String sourceMultiplicity,
            String targetMultiplicity,
            String... extra) {`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code, 'utf8');
