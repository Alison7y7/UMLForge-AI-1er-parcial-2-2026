import os

filepath = r"c:\Users\yesen\Desktop\1er Parcial SW1\UMLForge-AI\frontend\src\pages\UMLEditor.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Imports
code = code.replace(
    "import type { UmlModelJson } from '../types/uml';",
    "import type { UmlModelJson } from '../types/uml';\nimport { useCollaboration } from '../hooks/useCollaboration';\nimport { useAuthStore } from '../store/authStore';"
)

# State
code = code.replace(
    "  const { id } = useParams();\n  const navigate = useNavigate();\n  // const { user } = useAuthStore();",
    "  const { id } = useParams();\n  const navigate = useNavigate();\n  const { user } = useAuthStore();\n  const { historyEvents, connectedUsers, lockedElements, connectionStatus, broadcastEvent, attemptLock, releaseLock } = useCollaboration(id);\n  const [rightTab, setRightTab] = useState<'inspector' | 'colaboracion'>('inspector');\n  const [showHistory, setShowHistory] = useState(false);"
)

# AutoSave and handle methods
code = code.replace(
    "  const handleSave = async () => {",
    """  useEffect(() => {
    if (selectedNodeId) attemptLock(selectedNodeId);
    return () => { if (selectedNodeId) releaseLock(selectedNodeId); };
  }, [selectedNodeId, attemptLock, releaseLock]);

  const handleUpdateNodeData = (nid: string, data: any) => {
    updateNodeData(nid, data);
    const n = nodes.find(x => x.id === nid);
    if (n) broadcastEvent('NODE_UPDATED', nid, { ...n.data, ...data });
  };
  const handleUpdateEdgeData = (eid: string, data: any) => {
    setEdges(edges.map(e => e.id === eid ? { ...e, data: { ...e.data, ...data } } : e));
    const edge = edges.find(e => e.id === eid);
    if (edge) broadcastEvent('EDGE_UPDATED', eid, { ...edge.data, ...data });
  };

  const handleAutoSave = async () => {
    if (!nombreDiagrama.trim() || nombreDiagrama === 'Cargando...') return;
    try {
      const modelo = {
        clases: nodes.map(n => ({ id: n.id, nombre: n.data.nombre, estereotipo: n.data.estereotipo || '', posicionX: n.position.x, posicionY: n.position.y, atributos: n.data.atributos, metodos: n.data.metodos })),
        relaciones: edges.map(e => ({ id: e.id, origen: e.source, destino: e.target, tipo: e.data?.tipo || 'ASOCIACION', nombre: e.data?.nombre || '', multiplicidadOrigen: e.data?.multiplicidadOrigen || '', multiplicidadDestino: e.data?.multiplicidadDestino || '' }))
      };
      await api.put(/diagramas/, { nombre: nombreDiagrama, modeloJson: JSON.stringify(modelo) });
    } catch (_e) {}
  };

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => handleAutoSave(), 3000);
    return () => clearTimeout(t);
  }, [nodes, edges, nombreDiagrama]);

  const handleSave = async () => {"""
)

# Update node data usage
code = code.replace("updateNodeData(selectedNode.id,", "handleUpdateNodeData(selectedNode.id,")

# Broadcast creates/deletes
code = code.replace("addNode(newNode);", "addNode(newNode);\n    broadcastEvent('NODE_CREATED', newNode.id, newNode);")
code = code.replace("setNodes(nodes.filter(n => n.id !== nodeId));", "setNodes(nodes.filter(n => n.id !== nodeId));\n      broadcastEvent('NODE_DELETED', nodeId);")
code = code.replace("setEdges([...edges, newEdge]);", "setEdges([...edges, newEdge]);\n      broadcastEvent('EDGE_CREATED', newEdge.id, newEdge);")

# ReactFlow
code = code.replace("nodes={nodes}", "nodes={nodes.map(n => ({ ...n, draggable: lockedElements[n.id] && lockedElements[n.id] !== user?.nombre ? false : true, data: { ...n.data, lockedBy: lockedElements[n.id] } }))}")
code = code.replace("onNodesChange={onNodesChange}", "onNodesChange={onNodesChange}\n            onNodeDragStop={(e, node) => broadcastEvent('NODE_MOVED', node.id, node.position)}")

# onNodeClick
code = code.replace(
    "onNodeClick={(_, node) => {",
    "onNodeClick={(_, node) => {\n              if (lockedElements[node.id] && lockedElements[node.id] !== user?.nombre) {\n                alert(lockedElements[node.id] + ' está editando. Espera a que termine.');\n                return;\n              }"
)

# Header connections
code = code.replace(
    '<div className="flex items-center gap-1">',
    '''<div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
              <span className={lex items-center gap-1.5 text-xs font-bold uppercase tracking-wider }>
                <div className={w-2 h-2 rounded-full }></div>
                {connectionStatus}
              </span>
              {connectionStatus === "Sincronizado" && connectedUsers.length > 0 && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs font-medium text-gray-500">{connectedUsers.length} colaboradores</span>
                  <div className="flex -space-x-2">
                    {connectedUsers.map(u => (
                      <div key={u.id} title={${u.nombre} ()} className="w-7 h-7 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-[10px] font-bold text-lila-main">
                        {u.nombre.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
            <button onClick={() => setShowHistory(true)} className="px-3 py-1.5 text-xs font-bold text-lila-main bg-lila-light/10 hover:bg-lila-light/20 rounded-lg transition-colors">Actividad</button>'''
)

# Header closed div
code = code.replace("</header>", "</div></header>")

# Edge props
code = code.replace(
    "setEdges(edges.map(edge => \n                        edge.id === selectedEdge.id \n                        ? { ...edge, data: { ...edge.data, tipo: e.target.value }, markerEnd: getMarkerEnd(e.target.value) } \n                        : edge\n                      ));",
    "handleUpdateEdgeData(selectedEdge.id, { tipo: e.target.value });"
)
code = code.replace(
    "setEdges(edges.map(edge => \n                          edge.id === selectedEdge.id \n                          ? { ...edge, data: { ...edge.data, multiplicidadOrigen: e.target.value } } \n                          : edge\n                        ));",
    "handleUpdateEdgeData(selectedEdge.id, { multiplicidadOrigen: e.target.value });"
)
code = code.replace(
    "setEdges(edges.map(edge => \n                          edge.id === selectedEdge.id \n                          ? { ...edge, data: { ...edge.data, multiplicidadDestino: e.target.value } } \n                          : edge\n                        ));",
    "handleUpdateEdgeData(selectedEdge.id, { multiplicidadDestino: e.target.value });"
)
code = code.replace("setEdges(edges.filter(e => e.id !== selectedEdge.id))", "setEdges(edges.filter(e => e.id !== selectedEdge.id));\n                  broadcastEvent('EDGE_DELETED', selectedEdge.id);")

# Right panel properties tabs
code = code.replace(
    "        <aside className={w-80 bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col z-40 transform transition-transform duration-300 overflow-y-auto }>\n          <div className=\"p-5 border-b border-lila-light/50 flex items-center gap-3\">\n            <Settings2 className=\"w-5 h-5 text-lila-main\" />\n            <h2 className=\"font-bold text-text-dark\">Propiedades</h2>\n          </div>\n\n          <div className=\"p-5\">\n            {/* Si es CLASE */}",
    """        {/* PANEL DE PROPIEDADES DERECHO */}
        <aside className={w-80 bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col z-40 transform transition-transform duration-300 overflow-y-auto }>
          <div className="flex border-b border-lila-light/50 bg-gray-50/50">
            <button 
              className={lex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors }
              onClick={() => setRightTab('inspector')}
            >
              <div className="flex items-center justify-center gap-2">
                <Settings2 className="w-4 h-4" /> Inspector
              </div>
            </button>
            <button 
              className={lex-1 py-4 text-xs font-bold tracking-wider uppercase transition-colors }
              onClick={() => setRightTab('colaboracion')}
            >
              Colaboración
            </button>
          </div>

          <div className="p-5">
            {rightTab === 'inspector' && (
              <>
                {!selectedNode && !selectedEdge && (
                  <div className="text-sm text-gray-500 text-center mt-10">Selecciona una clase o relación para editarla.</div>
                )}
            {/* Si es CLASE */}"""
)

# Right panel bottom
code = code.replace(
    "               <div className=\"text-center text-gray-400 text-sm mt-10\">\n                 Selecciona una clase o una relacin para editar sus propiedades.\n               </div>\n            )}\n          </div>\n        </aside>\n\n      </div>\n    </div>\n  );\n}",
    """               </div>
            )}
              </>
            )}

            {/* CONTENIDO COLABORACIÓN */}
            {rightTab === 'colaboracion' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conectados ahora</h3>
                  <div className="space-y-2">
                    {connectedUsers.length === 0 ? (
                      <div className="text-sm text-gray-400">Nadie está conectado.</div>
                    ) : (
                      connectedUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="font-medium">{u.nombre}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Editando ahora</h3>
                  <div className="space-y-2">
                    {Object.keys(lockedElements).length === 0 ? (
                      <div className="text-sm text-gray-400">Nadie está editando un elemento en este momento.</div>
                    ) : (
                      Object.entries(lockedElements).map(([elId, userName]) => {
                        const classNode = nodes.find(n => n.id === elId);
                        const relEdge = edges.find(e => e.id === elId);
                        let elName = 'un elemento';
                        if (classNode) elName = classNode.data.nombre as string || 'una clase';
                        if (relEdge) elName = 'la relación ' + (relEdge.data?.nombre || '');
                        return (
                          <div key={elId} className="flex flex-col text-sm text-gray-700 bg-orange-50 p-2 rounded">
                            <span className="font-medium">{userName}</span>
                            <span className="text-xs text-gray-500">está editando {elName}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    Actividad reciente
                    <button onClick={() => setShowHistory(true)} className="text-[10px] bg-lila-light/20 text-lila-main px-2 py-1 rounded hover:bg-lila-light/40 transition-colors">Ver historial</button>
                  </h3>
                  <div className="space-y-3">
                    {historyEvents.slice(0, 5).map((ev: any, idx: number) => (
                         <div key={idx} className="text-[11px] text-gray-600 border-l-2 border-lila-light pl-2">
                           <span className="font-bold text-gray-800">{ev.usuarioNombre}</span>
                           {" "}
                           {ev.tipoEvento === 'NODE_CREATED' ? 'creó una clase' :
                            ev.tipoEvento === 'NODE_MOVED' ? 'movió una clase' :
                            ev.tipoEvento === 'NODE_UPDATED' ? 'actualizó una clase' :
                            ev.tipoEvento === 'NODE_DELETED' ? 'eliminó una clase' :
                            ev.tipoEvento === 'EDGE_CREATED' ? 'creó una relación' :
                            ev.tipoEvento === 'EDGE_UPDATED' ? 'actualizó una relación' :
                            ev.tipoEvento === 'EDGE_DELETED' ? 'eliminó una relación' :
                            ev.tipoEvento === 'USER_JOINED' ? 'se conectó a la sesión' :
                            ev.tipoEvento === 'USER_LEFT' ? 'salió de la sesión' :
                            ev.tipoEvento}
                         </div>
                    ))}
                    {historyEvents.length === 0 && <div className="text-xs text-gray-400">Sin actividad reciente.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      
      {/* MODAL HISTORIAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Historial del diagrama</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-800">Cerrar</button>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-4 border-b">Usuario</th>
                    <th className="p-4 border-b">Acción</th>
                    <th className="p-4 border-b">Elemento</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {historyEvents.map((ev: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{ev.usuarioNombre}</td>
                      <td className="p-4">
                        {ev.tipoEvento === 'NODE_CREATED' ? 'Creó clase' :
                         ev.tipoEvento === 'NODE_MOVED' ? 'Movió clase' :
                         ev.tipoEvento === 'NODE_UPDATED' ? 'Actualizó clase' :
                         ev.tipoEvento === 'NODE_DELETED' ? 'Eliminó clase' :
                         ev.tipoEvento === 'EDGE_CREATED' ? 'Creó relación' :
                         ev.tipoEvento === 'EDGE_UPDATED' ? 'Actualizó relación' :
                         ev.tipoEvento === 'EDGE_DELETED' ? 'Eliminó relación' :
                         ev.tipoEvento === 'USER_JOINED' ? 'Conexión' :
                         ev.tipoEvento === 'USER_LEFT' ? 'Desconexión' :
                         ev.tipoEvento}
                      </td>
                      <td className="p-4 text-gray-500">
                         {ev.tipoEvento.startsWith('USER') ? '-' : (ev.elementoId || '-')}
                      </td>
                    </tr>
                  ))}
                  {historyEvents.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-gray-400">No hay eventos en el historial.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""
)

# Text fixes for broken characters
code = code.replace("Asociacin", "Asociación")
code = code.replace("Agregacin", "Agregación")
code = code.replace("Composicin", "Composición")
code = code.replace("Generalizacin", "Generalización")
code = code.replace("relacin", "relación")
code = code.replace("Relacin", "Relación")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
