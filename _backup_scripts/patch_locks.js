const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf-8');

// Replace mappedNodes with normal nodes mapped without lockedElements
content = content.replace(/const mappedNodes = useMemo\(\(\) => \{[\s\S]*?\}, \[nodes, lockedElements, user\?\.nombre\]\);/g, '');
content = content.replace(/nodes=\{mappedNodes\}/g, 'nodes={nodes}');

// Remove onNodeClick lock check
content = content.replace(/if \(lockedElements\[node\.id\][\s\S]*?return;\n\s*\}/g, '');

// Remove onEdgeClick lock check
content = content.replace(/if \(lockedElements\[edge\.id\][\s\S]*?return;\n\s*\}/g, '');

// Remove 'Editando ahora' section
content = content.replace(/<div>\s*<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Editando ahora<\/h3>[\s\S]*?<\/div>\s*<\/div>/g, '</div>');

// Remove from destructuring
content = content.replace(/, lockedElements/g, '');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', content, 'utf-8');
console.log('Removed lockedElements references');
