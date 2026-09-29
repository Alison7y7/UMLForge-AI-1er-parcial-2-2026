const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// 1. Add new state variables
code = code.replace(
  "const [relationError, setRelationError] = useState('');",
  "const [relationError, setRelationError] = useState('');\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);\n  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);"
);

// 2. Add icons
code = code.replace(
  "MoveRight } from 'lucide-react';",
  "MoveRight, Menu, X, MoreVertical, Wrench, PanelRightOpen, PanelLeftOpen } from 'lucide-react';"
);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
