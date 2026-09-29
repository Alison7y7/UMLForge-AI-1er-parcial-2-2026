const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/editor/UmlRelationEdge.tsx', 'utf8');

// I just want to restore standard backticks in template literals.
// Let's replace whatever got messed up.
code = code.replace(/transform: `translate\(-50%, -50%\) translate\(\$\{labelX\}px, \$\{labelY\}px\)`/g, "transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`");

code = code.replace(/transform: `translate\(-50%, -50%\) translate\(\$\{sx \+ \(labelX - sx\)\*0\.25\}px, \$\{sy \+ \(labelY - sy\)\*0\.25\}px\)`/g, "transform: `translate(-50%, -50%) translate(${sx + (labelX - sx)*0.25}px, ${sy + (labelY - sy)*0.25}px)`");

code = code.replace(/transform: `translate\(-50%, -50%\) translate\(\$\{tx \+ \(labelX - tx\)\*0\.25\}px, \$\{ty \+ \(labelY - ty\)\*0\.25\}px\)`/g, "transform: `translate(-50%, -50%) translate(${tx + (labelX - tx)*0.25}px, ${ty + (labelY - ty)*0.25}px)`");

fs.writeFileSync('frontend/src/components/editor/UmlRelationEdge.tsx', code, 'utf8');
