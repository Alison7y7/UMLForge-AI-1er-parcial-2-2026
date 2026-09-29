const fs = require('fs');
const file = 'backend/src/main/java/com/umlforge/backend/service/XmiImportService.java';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/new XmiImportResponse\.UmlRelation\(([\s\S]*?)\)/g, (match, inner) => {
    // split by comma, but be careful with nested method calls.
    // In our case, the inner arguments are: "id", idMap.get(..), idMap.get(..), "TYPE", ..., "", ""
    // We can just append , "", "" if it doesn't already have 9 arguments.
    const parts = inner.split(',');
    if (parts.length === 7 || parts.length === 8) {
        // Just cheat: replace the last empty string if it's there
        return 'new XmiImportResponse.UmlRelation(' + inner + ', "", "")';
    }
    return match;
});

fs.writeFileSync(file, code, 'utf8');
