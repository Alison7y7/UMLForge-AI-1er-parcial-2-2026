const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf-8');

// 1. Destructuring useCollaboration
content = content.replace(/historyEvents, connectedUsers, lockedElements, connectionStatus,[\s\n]*broadcastEvent, attemptLock, releaseLock/g, 'historyEvents, connectedUsers, connectionStatus,\n    broadcastEvent');

// 2. useEffect attemptLock
content = content.replace(/\s*useEffect\(\(\) => \{\n\s*if \(selectedNodeId\) attemptLock\(selectedNodeId\);\n\s*return \(\) => \{ if \(selectedNodeId\) releaseLock\(selectedNodeId\); \};\n\s*\}, \[selectedNodeId, attemptLock, releaseLock\]\);\n/g, '');

// 3. mappedNodes
content = content.replace(/\s*const mappedNodes = useMemo\(\(\) => \{[\s\S]*?\}, \[nodes, lockedElements, user\?\.nombre\]\);\n/g, '');
content = content.replace(/nodes=\{mappedNodes\}/g, 'nodes={nodes}');

// 4. onNodeClick
content = content.replace(/\s*if \(lockedElements\[node\.id\] && lockedElements\[node\.id\] !== user\?\.nombre\) \{[\s\S]*?return;\n\s*\}/g, '');

// 5. onEdgeClick
content = content.replace(/\s*if \(lockedElements\[edge\.id\] && lockedElements\[edge\.id\] !== user\?\.nombre\) \{[\s\S]*?return;\n\s*\}/g, '');

// 6. Editando ahora section - find it and replace
content = content.replace(/\s*<div>\n\s*<h3 className=\"text-xs font-bold text-gray-500 uppercase tracking-wider mb-3\">Editando ahora<\/h3>[\s\S]*?<\/div>\n\s*<\/div>/g, '');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', content, 'utf-8');
console.log('Done!');
