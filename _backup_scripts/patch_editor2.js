const fs = require('fs');
const file = 'frontend/src/pages/UMLEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /if\s*\(isMN\(mergedData\.multiplicidadOrigen\)\s*&&\s*isMN\(mergedData\.multiplicidadDestino\)\)\s*\{[\s\S]*?broadcastEvent\('EDGE_CREATED', edge2\.id, edge2\);\s*\}\s*else\s*\{[\s\S]*?broadcastEvent\('EDGE_UPDATED', eid, \{ \.\.\.edge, data: mergedData \}\);\s*\}/;

const replacement = `if (isMN(mergedData.multiplicidadOrigen) && isMN(mergedData.multiplicidadDestino)) {
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
      broadcastEvent('EDGE_UPDATED', eid, newEdge);`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code, 'utf8');
