const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// buildCurrentModel
code = code.replace(
    /multiplicidadDestino: e\.data\?\.multiplicidadDestino as string \|\| ''\s*\}\)\)/,
    "multiplicidadDestino: e.data?.multiplicidadDestino as string || '',\n        rolOrigen: e.data?.rolOrigen as string || '',\n        rolDestino: e.data?.rolDestino as string || ''\n      }))"
);

// applyUmlModel
code = code.replace(
    /multiplicidadDestino: relation\.multiplicidadDestino \|\| ''\s*\},/g,
    "multiplicidadDestino: relation.multiplicidadDestino || '',\n          rolOrigen: relation.rolOrigen || '',\n          rolDestino: relation.rolDestino || ''\n        },"
);

// onConnect
code = code.replace(
    /multiplicidadDestino: '' \}, markerEnd/g,
    "multiplicidadDestino: '', rolOrigen: '', rolDestino: '' }, markerEnd"
);

// handleNodeClick
code = code.replace(
    /multiplicidadDestino: ''\s*\},/g,
    "multiplicidadDestino: '',\n          rolOrigen: '',\n          rolDestino: ''\n        },"
);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
