const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// The block we want to replace:
const targetOrigen = `                      <input 
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: 1"
                        value={selectedEdge.data?.multiplicidadOrigen as string || ''}
                        onChange={(e) => {
                           handleUpdateEdgeData(selectedEdge.id, { multiplicidadOrigen: e.target.value });
                        }}
                      />`;

const replacementOrigen = `                      <input 
                        list="multiplicities"
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: 1"
                        value={selectedEdge.data?.multiplicidadOrigen as string || ''}
                        onChange={(e) => {
                           handleUpdateEdgeData(selectedEdge.id, { multiplicidadOrigen: e.target.value });
                        }}
                      />`;

code = code.replace(targetOrigen, replacementOrigen);

const targetDestino = `                      <input 
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: 0..*"
                        value={selectedEdge.data?.multiplicidadDestino as string || ''}
                        onChange={(e) => {
                           handleUpdateEdgeData(selectedEdge.id, { multiplicidadDestino: e.target.value });
                        }}
                      />`;

const replacementDestino = `                      <input 
                        list="multiplicities"
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: 0..*"
                        value={selectedEdge.data?.multiplicidadDestino as string || ''}
                        onChange={(e) => {
                           handleUpdateEdgeData(selectedEdge.id, { multiplicidadDestino: e.target.value });
                        }}
                      />`;

code = code.replace(targetDestino, replacementDestino);

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

code = code.replace('{/* MODAL HISTORIAL */}', datalist + '\n        {/* MODAL HISTORIAL */}');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
