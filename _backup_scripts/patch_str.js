const fs = require('fs');
let file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/\"\",\s*\"\",\s*\"\",\s*\"\"\)\);/g, '\"\", \"\", \"\"));');
code = code.replace(/\"\",\s*\"\",\s*\"\"\)\);/g, '\"\", \"\", \"\"));');
code = code.replace(/\"\", \"\", \"\"\)\);/g, '\"\", \"\", \"\", \"\", \"\"));');
fs.writeFileSync(file, code, 'utf8');

file = 'backend/src/test/java/com/umlforge/backend/service/XmiExportServiceTests.java';
code = fs.readFileSync(file, 'utf8');
code = code.replace(/\"\",\s*\"\",\s*\"\",\s*\"\"\);/g, '\"\", \"\", \"\");');
code = code.replace(/\"\",\s*\"\",\s*\"\"\);/g, '\"\", \"\", \"\");');
code = code.replace(/\"\", \"\", \"\"\);/g, '\"\", \"\", \"\", \"\", \"\");');
fs.writeFileSync(file, code, 'utf8');
