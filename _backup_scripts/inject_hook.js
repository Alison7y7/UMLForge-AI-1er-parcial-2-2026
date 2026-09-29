const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

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
        // Las acciones secundarias miden aproximadamente 700px. + Avatares y botón Guardar (200px) = 900px.
        // Lo pondremos en 900px para estar seguros.
        if (leftWidth + 900 + 48 <= available) {
          setMenuMode('full');
        }
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [menuMode]);`;

code = code.replace("const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);", hooks);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
