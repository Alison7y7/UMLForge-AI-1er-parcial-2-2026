const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

const regexOrigen = /<input \s*\n\s*className="w-full px-2 py-1\.5 bg-bg-main border border-gray-200 rounded-md text-xs \nfocus:outline-none focus:ring-2 focus:ring-lila-main"\s*\n\s*placeholder="ej: 1"\s*\n\s*value={selectedEdge\.data\?\.multiplicidadOrigen as string \|\| ''}\s*\n\s*onChange={\(e\) => \{\s*\n\s*handleUpdateEdgeData\(selectedEdge\.id, \{ multiplicidadOrigen: e\.target\.value \}\);\s*\n\s*\}\}\s*\n\s*\/>/g;

code = code.replace(/placeholder="ej: 1"/g, 'list="multiplicities" placeholder="ej: 1"');
code = code.replace(/placeholder="ej: 0..\*"/g, 'list="multiplicities" placeholder="ej: 0..*"');

const datalist = `
      {/* DATALIST PARA MULTIPLICIDADES */}
      <datalist id="multiplicities">
        <option value="1" />
        <option value="0..1" />
        <option value="1..*" />
        <option value="0..*" />
        <option value="*" />
        <option value="0" />
        <option value="N" />
      </datalist>
`;

if (!code.includes('<datalist id="multiplicities">')) {
    code = code.replace('{/* MODAL HISTORIAL */}', datalist + '\n        {/* MODAL HISTORIAL */}');
}

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
