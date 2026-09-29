const fs = require('fs');
const file = 'frontend/src/components/editor/UmlRelationEdge.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /return\s*\(\s*<>\s*<BaseEdge\s+path=\{edgePath\}\s+markerEnd=\{markerEnd\}\s+style=\{customStyle\}\s+id=\{id\}\s*\/>/;

const replacement = `const assocNode = useInternalNode(data?.claseAsociacion as string || '');
  let assocPath = '';
  if (assocNode && assocNode.positionAbsolute) {
    const ax = assocNode.positionAbsolute.x + (assocNode.measured?.width || 120) / 2;
    const ay = assocNode.positionAbsolute.y + (assocNode.measured?.height || 60) / 2;
    assocPath = \`M \${labelX} \${labelY} L \${ax} \${ay}\`;
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={customStyle} id={id} />
      {assocPath && <path d={assocPath} stroke="#666" strokeWidth={1} strokeDasharray="5,5" fill="none" />}`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code, 'utf8');
