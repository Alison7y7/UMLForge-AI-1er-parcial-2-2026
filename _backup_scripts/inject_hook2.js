const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

code = code.replace(/import \{ useEffect, useState \} from 'react';/, "import { useEffect, useState, useRef } from 'react';");

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
      
      // En modo 'full', calculamos el scrollWidth real.
      // Si desborda, pasamos a compact.
      if (menuMode === 'full') {
        const rightWidth = rightRef.current.scrollWidth;
        if (leftWidth + rightWidth + 48 > available) {
          setMenuMode('compact');
        }
      } else {
        // En modo compact, estimamos cuánto mediría el menú full.
        if (leftWidth + 900 + 48 <= available) {
          setMenuMode('full');
        }
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [menuMode]);`;

code = code.replace("const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);", hooks);

// Add refs to HTML:
// 1. <header ...
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
code = code.replace(
  /<div className="flex items-center gap-2 md:gap-4 shrink-0">/g,
  (match, offset, fullString) => {
    // Only replace the second occurrence which is right after the first
    if (offset > code.indexOf('w-5 h-5') + 100) {
       return `<div ref={rightRef} className="flex items-center gap-2 md:gap-4 shrink-0">`;
    }
    return match; // First occurrence is already replaced or handled separately above
  }
);

// Now apply menuMode to the classes
code = code.replace(
  /<div className="hidden xl:flex items-center gap-2 border-r border-gray-200 pr-4">/g,
  `{menuMode === 'full' && (<div className="hidden md:flex items-center gap-2 border-r border-gray-200 pr-4">)}`
);

code = code.replace(
  /<div className="hidden xl:flex items-center gap-1">/g,
  `{menuMode === 'full' && (<div className="hidden md:flex items-center gap-1">)}`
);

// Fix the closing tags for those conditionals
// This is fragile. I will instead just change the classNames to use conditional logic!
// Let's rewrite the script to do this safer.
