const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf-8');

// 1. Destructuring useCollaboration
content = content.replace('historyEvents, connectedUsers, lockedElements, connectionStatus,\n    broadcastEvent, attemptLock, releaseLock', 'historyEvents, connectedUsers, connectionStatus,\n    broadcastEvent');

// 2. useEffect attemptLock
let target = '  useEffect(() => {\n    if (selectedNodeId) attemptLock(selectedNodeId);\n    return () => { if (selectedNodeId) releaseLock(selectedNodeId); };\n  }, [selectedNodeId, attemptLock, releaseLock]);\n';
content = content.replace(target, '');

// 3. mappedNodes
let mappedNodesTarget = '  const mappedNodes = useMemo(() => {\n    return nodes.map(n => ({\n      ...n,\n      draggable: lockedElements[n.id] && lockedElements[n.id] !== user?.nombre ? false : true,\n      data: { ...n.data, lockedBy: lockedElements[n.id] }\n    }));\n  }, [nodes, lockedElements, user?.nombre]);\n';
content = content.replace(mappedNodesTarget, '');
content = content.replace('nodes={mappedNodes}', 'nodes={nodes}');

// 4. onNodeClick
let nodeClickTarget = "              if (lockedElements[node.id] && lockedElements[node.id] !== user?.nombre) {\n                alert(lockedElements[node.id] + ' está editando. Espera a que termine.');\n                return;\n              }\n";
content = content.replace(nodeClickTarget, '');

// 5. onEdgeClick
let edgeClickTarget = "              if (lockedElements[edge.id] && lockedElements[edge.id] !== user?.nombre) {\n                alert(lockedElements[edge.id] + ' está editando. Espera a que termine.');\n                return;\n              }\n";
content = content.replace(edgeClickTarget, '');

// 6. Editando ahora section - find it exactly
let editandoAhoraTarget = '                <div>\n                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Editando ahora</h3>\n                  <div className="space-y-2">\n                    {Object.keys(lockedElements).length === 0 ? (\n                      <div className="text-sm text-gray-400">Nadie está editando un elemento en este momento.</div>\n                    ) : (\n                      Object.entries(lockedElements).map(([elId, userName]) => {\n                        const classNode = nodes.find(n => n.id === elId);\n                        const relEdge = edges.find(e => e.id === elId);\n                        let elName = \'un elemento\';\n                        if (classNode) elName = classNode.data.nombre as string || \'una clase\';\n                        if (relEdge) elName = \'la relación \' + (relEdge.data?.nombre || \'\');\n                        return (\n                          <div key={elId} className="flex flex-col text-sm text-gray-700 bg-orange-50 p-2 rounded">\n                            <span className="font-medium">{userName}</span>\n                            <span className="text-xs text-gray-500\">está editando {elName}</span>\n                          </div>\n                        );\n                      })\n                    )}\n                  </div>\n                </div>\n';
content = content.replace(editandoAhoraTarget, '');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', content, 'utf-8');
console.log('Done!');
