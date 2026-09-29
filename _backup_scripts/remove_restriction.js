const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

const regex = /if\s*\(pendingRelationSourceId\s*===\s*node\.id\)\s*\{\s*setRelationError\([^)]+\);\s*return;\s*\}/g;
code = code.replace(regex, '// Autorrelaciones permitidas');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
