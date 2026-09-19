const fs = require('fs');
let code = fs.readFileSync('c:/Users/yesen/Desktop/1er Parcial SW1/UMLForge-AI/frontend/src/pages/UMLEditor.tsx', 'utf8');

code = code.replace(/import type \{ UmlModelJson \} from '\.\.\/types\/uml';/, 
\import type { UmlModelJson } from '../types/uml';
import { useCollaboration } from '../hooks/useCollaboration';
import { useAuthStore } from '../store/authStore';\);

code = code.replace(/const \{ id \} = useParams\(\);[\s\S]*?const \{/,
\const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    historyEvents, connectedUsers, lockedElements, connectionStatus, broadcastEvent, attemptLock, releaseLock
  } = useCollaboration(id);
  const [rightTab, setRightTab] = useState<'inspector' | 'colaboracion'>('inspector');
  const [showHistory, setShowHistory] = useState(false);
  const {\);

code = code.replace(/const handleSave = async \(\) => \{/,
\useEffect(() => {
    if (selectedNodeId) attemptLock(selectedNodeId);
    return () => { if (selectedNodeId) releaseLock(selectedNodeId); };
  }, [selectedNodeId]);

  const handleUpdateNodeData = (nid, data) => {
    updateNodeData(nid, data);
    const n = nodes.find(x => x.id === nid);
    if (n) broadcastEvent('NODE_UPDATED', nid, { ...n.data, ...data });
  };
  const handleUpdateEdgeData = (eid, data) => {
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
      await api.put(\\\/diagramas/\\\\\\, { nombre: nombreDiagrama, modeloJson: JSON.stringify(modelo) });
    } catch (_e) {}
  };

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => handleAutoSave(), 3000);
    return () => clearTimeout(t);
  }, [nodes, edges, nombreDiagrama]);

  const handleSave = async () => {\);

code = code.replace(/updateNodeData\\(selectedNode\\.id,/g, 'handleUpdateNodeData(selectedNode.id,');

code = code.replace(/addNode\\(newNode\\);/, \ddNode(newNode); broadcastEvent('NODE_CREATED', newNode.id, newNode);\);
code = code.replace(/setNodes\\(nodes\\.filter\\(n => n\\.id !== nodeId\\)\\);/, \setNodes(nodes.filter(n => n.id !== nodeId)); broadcastEvent('NODE_DELETED', nodeId);\);
code = code.replace(/setEdges\\(\\[\\.\\.\\.edges, newEdge\\]\\);/, \setEdges([...edges, newEdge]); broadcastEvent('EDGE_CREATED', newEdge.id, newEdge);\);

code = code.replace(/<ReactFlow\\s+style=\\{\\{ width: '100%', height: '100%' \\}\\}\\s+nodes=\\{nodes\\}\\s+edges=\\{edges\\}/,
  \<ReactFlow
            style={{ width: '100%', height: '100%' }}
            nodes={nodes.map(n => ({ ...n, draggable: lockedElements[n.id] && lockedElements[n.id] !== user?.nombre ? false : true, data: { ...n.data, lockedBy: lockedElements[n.id] } }))}
            edges={edges}
            onNodeDragStop={(e, node) => broadcastEvent('NODE_MOVED', node.id, node.position)}\);

code = code.replace(/onNodeClick=\\{\\(_, node\\) => \\{/, \onNodeClick={(_, node) => {
              if (lockedElements[node.id] && lockedElements[node.id] !== user?.nombre) {
                alert(lockedElements[node.id] + ' está editando. Espera a que termine.');
                return;
              }\);

code = code.replace(/<div className="flex items-center gap-1">/, \<div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider \">
                <div className="w-2 h-2 rounded-full \"></div>
                {connectionStatus}
              </span>
              {connectionStatus === "Sincronizado" && connectedUsers.length > 0 && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs font-medium text-gray-500">{connectedUsers.length} colaboradores</span>
                  <div className="flex -space-x-2">
                    {connectedUsers.map(u => (
                      <div key={u.id} title="\ (\)" className="w-7 h-7 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-[10px] font-bold text-lila-main">
                        {u.nombre.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
            <button onClick={() => setShowHistory(true)} className="px-3 py-1.5 text-xs font-bold text-lila-main bg-lila-light/10 hover:bg-lila-light/20 rounded-lg transition-colors">Actividad</button>\);

code = code.replace(/<\\/header>/, '</div></header>');

fs.writeFileSync('c:/Users/yesen/Desktop/1er Parcial SW1/UMLForge-AI/frontend/src/pages/UMLEditor.tsx', code);
