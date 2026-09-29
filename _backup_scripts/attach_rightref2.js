const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

const target = 'rounded-full">Guardado manual</span>';
const index = code.indexOf(target);
if (index !== -1) {
    const after = code.substring(index);
    const divTarget = '<div className="flex items-center gap-2 md:gap-4 shrink-0">';
    const replaced = after.replace(divTarget, '<div ref={rightRef} className="flex items-center gap-2 md:gap-4 shrink-0">');
    code = code.substring(0, index) + replaced;
    fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
}
