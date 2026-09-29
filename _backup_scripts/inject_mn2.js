const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

const target = `  const handleUpdateEdgeData = (eid: string, data: any) => {
    setEdges(edges.map(e => e.id === eid ? { ...e, data: { ...e.data, ...data } } : e));
    const edge = edges.find(e => e.id === eid);
    if (edge) broadcastEvent('EDGE_UPDATED', eid, { ...edge.data, ...data });
  };`;

const replacement = `  const handleUpdateEdgeData = (eid: string, data: any) => {
    const edge = edges.find(e => e.id === eid);
    if (!edge) return;

    const mergedData = { ...edge.data, ...data };
    
    // Detectar M:N
    const isMN = (mult: string) => /^\\*$|^[0-9]+\\.\\.\\*$|^n$|^N$/.test((mult || '').trim());
    
    if (isMN(mergedData.multiplicidadOrigen) && isMN(mergedData.multiplicidadDestino)) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        // Calcular posicion intermedia
        const posX = (sourceNode.position.x + targetNode.position.x) / 2;
        const posY = (sourceNode.position.y + targetNode.position.y) / 2;
        
        const interId = generateId();
        const interNode = {
           id: interId,
           type: 'umlClass',
           position: { x: posX, y: posY },
           data: {
             nombre: 'Detalle',
             atributos: [],
             metodos: []
           }
        };
        
        const edge1 = {
           id: generateId(),
           source: sourceNode.id,
           target: interId,
           type: 'umlRelation',
           data: {
              tipo: 'ASOCIACION',
              nombre: mergedData.nombre || '',
              multiplicidadOrigen: mergedData.multiplicidadOrigen,
              multiplicidadDestino: '1..1',
              rolOrigen: mergedData.rolOrigen || '',
              rolDestino: ''
           }
        };
        
        const edge2 = {
           id: generateId(),
           source: interId,
           target: targetNode.id,
           type: 'umlRelation',
           data: {
              tipo: 'ASOCIACION',
              nombre: '',
              multiplicidadOrigen: '1..1',
              multiplicidadDestino: mergedData.multiplicidadDestino,
              rolOrigen: '',
              rolDestino: mergedData.rolDestino || ''
           }
        };
        
        const newNodes = [...nodes, interNode as any];
        const newEdges = [...edges.filter(e => e.id !== eid), edge1 as any, edge2 as any];
        
        setNodes(newNodes);
        setEdges(newEdges);
        setSelectedEdgeId(null);
        setSelectedNodeId(interId);
        
        broadcastEvent('NODE_CREATED', interId, interNode);
        broadcastEvent('EDGE_DELETED', eid);
        broadcastEvent('EDGE_CREATED', edge1.id, edge1);
        broadcastEvent('EDGE_CREATED', edge2.id, edge2);
        
        return;
      }
    }

    setEdges(edges.map(e => e.id === eid ? { ...e, data: mergedData } : e));
    broadcastEvent('EDGE_UPDATED', eid, mergedData);
  };`;

// Use simple string replacement, ignoring exact whitespace issues by taking pieces.
const startIndex = code.indexOf('const handleUpdateEdgeData =');
const endIndex = code.indexOf('useEffect(() => {', startIndex);
if (startIndex !== -1 && endIndex !== -1) {
   const before = code.substring(0, startIndex);
   const after = code.substring(endIndex);
   code = before + replacement + '\n\n  ' + after;
   fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
} else {
   console.log('Could not find indices.');
}
