const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// We locate the edge inspector block
const startMarker = '{selectedEdge && (';
const endMarker = '</>\\n              )}';

let startIndex = code.indexOf(startMarker);
let endIndex = code.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    let newInspector = `{selectedEdge && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Relación</label>
                    <select 
                      className="w-full px-3 py-2 bg-bg-main border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-lila-main"
                      value={selectedEdge.data?.tipo as string || 'ASOCIACION'}
                      onChange={(e) => {
                        handleUpdateEdgeData(selectedEdge.id, { tipo: e.target.value });
                        setEdges(edges.map(edge => edge.id === selectedEdge.id ? { ...edge, markerEnd: getMarkerEnd(e.target.value) } : edge));
                      }}
                    >
                      <option value="ASOCIACION">Asociación</option>
                      <option value="AGREGACION">Agregación</option>
                      <option value="COMPOSICION">Composición</option>
                      <option value="GENERALIZACION">Generalización</option>
                      <option value="DEPENDENCIA">Dependencia</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de la Relación</label>
                    <input 
                      className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                      placeholder="ej: +Realiza"
                      value={selectedEdge.data?.nombre as string || ''}
                      onChange={(e) => handleUpdateEdgeData(selectedEdge.id, { nombre: e.target.value })}
                    />
                  </div>
  
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mult. Origen</label>
                      <input 
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: 1"
                        value={selectedEdge.data?.multiplicidadOrigen as string || ''}
                        onChange={(e) => handleUpdateEdgeData(selectedEdge.id, { multiplicidadOrigen: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mult. Destino</label>
                      <input 
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: 0..*"
                        value={selectedEdge.data?.multiplicidadDestino as string || ''}
                        onChange={(e) => handleUpdateEdgeData(selectedEdge.id, { multiplicidadDestino: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rol Origen</label>
                      <input 
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: cliente"
                        value={selectedEdge.data?.rolOrigen as string || ''}
                        onChange={(e) => handleUpdateEdgeData(selectedEdge.id, { rolOrigen: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rol Destino</label>
                      <input 
                        className="w-full px-2 py-1.5 bg-bg-main border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-lila-main"
                        placeholder="ej: venta"
                        value={selectedEdge.data?.rolDestino as string || ''}
                        onChange={(e) => handleUpdateEdgeData(selectedEdge.id, { rolDestino: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setEdges(edges.filter(e => e.id !== selectedEdge.id));
                      broadcastEvent('EDGE_DELETED', selectedEdge.id);
                    }}
                    className="w-full mt-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar relación
                  </button>
                </div>
              )}`;

    code = code.substring(0, startIndex) + newInspector + code.substring(endIndex - 15);
    fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
}
