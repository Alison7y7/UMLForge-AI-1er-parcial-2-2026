const fs = require('fs');
const file = 'frontend/src/pages/UMLEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

const startStr = "const isMN = (mult: string) => /^\\*$|^[0-9]+\\.\\.\\*$|^n$|^N$/.test((mult || '').trim());";
const endStr = "broadcastEvent('EDGE_UPDATED', eid, mergedData);\n    };";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = startStr + `
      
      if (isMN(mergedData.multiplicidadOrigen) && isMN(mergedData.multiplicidadDestino)) {
        if (!mergedData.claseAsociacion) {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          if (sourceNode && targetNode) {
            const posX = (sourceNode.position.x + targetNode.position.x) / 2;
            const posY = (sourceNode.position.y + targetNode.position.y) / 2 + 100;
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
            mergedData.claseAsociacion = interId;
            setNodes(nds => [...nds, interNode as any]);
            broadcastEvent('NODE_CREATED', interId, interNode);
          }
        }
      }
      
      const newEdge = { ...edge, data: mergedData };
      setEdges(edges.map(e => e.id === eid ? newEdge : e));
      broadcastEvent('EDGE_UPDATED', eid, newEdge);
    };`;

  code = code.substring(0, startIdx) + replacement + code.substring(endIdx + endStr.length);
  fs.writeFileSync(file, code, 'utf8');
  console.log('Replaced successfully!');
} else {
  console.log('Not found!', startIdx, endIdx);
}
