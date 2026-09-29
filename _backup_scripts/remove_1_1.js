const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

code = code.replace(/multiplicidadDestino: '1\.\.1',/g, "multiplicidadDestino: '',");
code = code.replace(/multiplicidadOrigen: '1\.\.1',/g, "multiplicidadOrigen: '',");

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
