const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

const svgDefs = `
            <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
              <defs>
                <marker id="agregacion-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <polygon points="10,0 20,10 10,20 0,10" fill="white" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
                <marker id="composicion-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <polygon points="10,0 20,10 10,20 0,10" fill="#8B5CF6" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
                <marker id="generalizacion-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <polygon points="0,0 20,10 0,20" fill="white" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
                <marker id="dependencia-marker" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                  <path d="M0,0 L20,10 L0,20" fill="none" stroke="#8B5CF6" strokeWidth="1" />
                </marker>
              </defs>
            </svg>
`;

code = code.replace('<Background color="#8B5CF6" gap={24} size={1} />', svgDefs + '\n            <Background color="#8B5CF6" gap={24} size={1} />');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
