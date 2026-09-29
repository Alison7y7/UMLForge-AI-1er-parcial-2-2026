const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

if (!code.includes('useRef')) {
  code = code.replace(/import \{ useEffect, useState \} from 'react';/, "import { useEffect, useState, useRef } from 'react';");
}

const hooks = `  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<'full' | 'compact'>('full');
  const headerRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!headerRef.current || !leftRef.current || !rightRef.current) return;
      const available = headerRef.current.offsetWidth;
      const leftWidth = leftRef.current.offsetWidth;
      
      if (menuMode === 'full') {
        const rightWidth = rightRef.current.scrollWidth;
        if (leftWidth + rightWidth + 24 > available) {
          setMenuMode('compact');
        }
      } else {
        if (leftWidth + 900 + 24 <= available) {
          setMenuMode('full');
        }
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [menuMode]);`;

if (!code.includes('menuMode')) {
  code = code.replace("const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);", hooks);
}

// 1. <header
code = code.replace(
  /<header className="h-14 bg-white\/95 backdrop-blur-md border-b border-lila-light\/50 flex items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 w-full relative">/,
  `<header ref={headerRef} className="h-14 bg-white/95 backdrop-blur-md border-b border-lila-light/50 flex items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 w-full relative">`
);

// 2. Left side:
code = code.replace(
  /<div className="flex items-center gap-2 md:gap-4 shrink-0">/,
  `<div ref={leftRef} className="flex items-center gap-2 md:gap-4 shrink-0">`
);

// 3. Right side:
let replacedRight = false;
code = code.replace(
  /<div className="flex items-center gap-2 md:gap-4 shrink-0">/g,
  (match) => {
    if (!replacedRight) {
       replacedRight = true;
       return match; // First occurrence is already replaced
    }
    return `<div ref={rightRef} className="flex items-center gap-2 md:gap-4 shrink-0">`;
  }
);

// Now apply menuMode to the classes
code = code.replace(
  /className="hidden xl:flex items-center gap-2 border-r border-gray-200 pr-4"/g,
  "className={`hidden md:flex items-center gap-2 border-r border-gray-200 pr-4 ${menuMode === 'compact' ? '!hidden' : ''}`}"
);

code = code.replace(
  /className="hidden xl:flex items-center gap-1"/g,
  "className={`hidden md:flex items-center gap-1 ${menuMode === 'compact' ? '!hidden' : ''}`}"
);

code = code.replace(
  /className="xl:hidden p-1\.5 rounded-lg hover:bg-gray-100 text-gray-600"/g,
  "className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 ${menuMode === 'full' ? 'hidden' : 'block'}`}"
);

code = code.replace(
  /className="absolute top-16 right-4 w-56 bg-white shadow-xl border border-gray-100 rounded-xl p-2 z-50 flex flex-col gap-1 xl:hidden"/g,
  "className={`absolute top-16 right-4 w-56 bg-white shadow-xl border border-gray-100 rounded-xl p-2 z-50 flex flex-col gap-1 ${menuMode === 'full' ? 'hidden' : 'flex'}`}"
);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
