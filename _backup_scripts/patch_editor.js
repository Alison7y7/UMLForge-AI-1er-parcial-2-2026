const fs = require('fs');
const file = 'frontend/src/pages/UMLEditor.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /if\s*\(isMN\(mergedData\.multiplicidadOrigen\)\s*&&\s*isMN\(mergedData\.multiplicidadDestino\)\)\s*\{[\s\S]*?setEdges\(eds\s*=>\s*eds\.filter\(e\s*=>\s*e\.id\s*!==\s*edgeId\)\.concat\(edge1,\s*edge2\)\);[\s\S]*?\} else \{[\s\S]*?setEdges\(eds\s*=>\s*eds\.map\(e\s*=>\s*e\.id\s*===\s*edgeId\s*\?\s*\{\s*\.\.\.e,\s*data:\s*mergedData\s*\}\s*:\s*e\)\);[\s\S]*?\}/;

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
            setNodes(nds => [...nds, interNode]);
          }
        }
      }
      
      setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, data: mergedData } : e));`;

code = code.replace(regex, replacement);

fs.writeFileSync(file, code, 'utf8');
