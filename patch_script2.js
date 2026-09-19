const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/editor/UmlClassNode.tsx', 'utf-8');

let target1 = " ${data.lockedBy ? 'ring-2 ring-orange-400 border-orange-400' : ''}";
let target2 = "      {data.lockedBy && (\n        <div className=\"absolute top-0 right-0 bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md\">\n          {data.lockedBy} editando\n        </div>\n      )}\n";

content = content.replace(target1, '');
content = content.replace(target2, '');

fs.writeFileSync('frontend/src/components/editor/UmlClassNode.tsx', content, 'utf-8');
console.log('Removed lockedBy visual from UmlClassNode');
