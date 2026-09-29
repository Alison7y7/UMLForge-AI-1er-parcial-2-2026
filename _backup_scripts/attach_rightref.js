const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

code = code.replace(
  'rounded-full">Guardado manual</span>\n          </div>\n\n          <div className="flex items-center gap-2 md:gap-4 shrink-0">',
  'rounded-full">Guardado manual</span>\n          </div>\n\n          <div ref={rightRef} className="flex items-center gap-2 md:gap-4 shrink-0">'
);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
