const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// Change avatars container:
code = code.replace(
  '<div className="hidden lg:flex items-center gap-2 border-r border-gray-200 pr-4">',
  '<div className="hidden xl:flex items-center gap-2 border-r border-gray-200 pr-4">'
);

// Change action buttons container:
code = code.replace(
  '<div className="hidden lg:flex items-center gap-1">',
  '<div className="hidden xl:flex items-center gap-1">'
);

// Change MoreVertical button:
code = code.replace(
  '<button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">',
  '<button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="xl:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">'
);

// Change Dropdown container:
code = code.replace(
  '<div className="absolute top-16 right-4 w-56 bg-white shadow-xl border border-gray-100 rounded-xl p-2 z-50 flex flex-col gap-1 lg:hidden">',
  '<div className="absolute top-16 right-4 w-56 bg-white shadow-xl border border-gray-100 rounded-xl p-2 z-50 flex flex-col gap-1 xl:hidden">'
);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
