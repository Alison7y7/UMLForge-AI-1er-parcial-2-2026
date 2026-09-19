const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf-8');

// 1. Remove lockedElements, attemptLock, releaseLock from useCollaboration destructuring
content = content.replace(
    /historyEvents, connectedUsers, lockedElements, connectionStatus,[\s\S]*?broadcastEvent, attemptLock, releaseLock/g,
    'historyEvents, connectedUsers, connectionStatus,\n    broadcastEvent'
);

// 2. Remove useEffect for attemptLock / releaseLock
content = content.replace(
    /useEffect\(\(\) => \{\n\s*if \(selectedNodeId\) attemptLock\(selectedNodeId\);\n\s*return \(\) => \{ if \(selectedNodeId\) releaseLock\(selectedNodeId\); \};\n\s*\}, \[selectedNodeId, attemptLock, releaseLock\]\);/g,
    ''
);

// 3. Remove handleAutoSave and its useEffect completely
content = content.replace(
    /const handleAutoSave = async \(\) => \{[\s\S]*?\};\n\n\s*useEffect\(\(\) => \{\n\s*if \(loading\) return;\n\s*const t = setTimeout\(\(\) => handleAutoSave\(\), 3000\);\n\s*return \(\) => clearTimeout\(t\);\n\s*\}, \[nodes, edges, nombreDiagrama\]\);\n/g,
    ''
);

// 4. Fix Initials function and Top bar UI
const initials_func = `
const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};
`;
content = content.replace('export default function UMLEditor() {', initials_func + '\nexport default function UMLEditor() {');

// 5. Cambios guardados -> Guardado manual
content = content.replace('Cambios guardados', 'Guardado manual');

// 6. Topbar presence
const topbar_presence_old = /\{connectedUsers\.map\(u => \([\s\S]*?className=\"w-7 h-7 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-\[10px\] font-bold text-lila-main\">[\s\S]*?\{u\.nombre\.substring\(0, 2\)\.toUpperCase\(\)\}[\s\S]*?<\/div>\n\s*\)\)\}/g;
const topbar_presence_new = '{connectedUsers.map(u => (\n                    <div key={u.id} title={`${u.nombre} — ${u.rol}`} className="w-7 h-7 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-[10px] font-bold text-lila-main">\n                      {getInitials(u.nombre)}\n                    </div>\n                  ))}';
content = content.replace(topbar_presence_old, topbar_presence_new);

// 7. Sidebar text hide on mobile and right panel toggle
content = content.replace('<aside className="w-48 bg-white/95 backdrop-blur-md border-r border-lila-light/50 flex flex-col py-4 z-40 shadow-[4px_0_24px_rgba(139,92,246,0.03)] overflow-y-auto shrink-0">', '<aside className="w-14 lg:w-48 bg-white/95 backdrop-blur-md border-r border-lila-light/50 flex flex-col py-4 z-40 shadow-[4px_0_24px_rgba(139,92,246,0.03)] overflow-y-auto shrink-0 transition-all">');

content = content.replace('<div className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Herramientas</div>', '<div className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden lg:block">Herramientas</div>');
content = content.replace('<div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Relaciones</div>', '<div className="px-4 mt-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden lg:block">Relaciones</div>');

content = content.replace(/<MousePointer2 className="w-4 h-4" \/> Seleccionar/g, '<MousePointer2 className="w-4 h-4" /> <span className="hidden lg:inline">Seleccionar</span>');
content = content.replace(/<Square className="w-4 h-4" \/> Clase/g, '<Square className="w-4 h-4" /> <span className="hidden lg:inline">Clase</span>');
content = content.replace(/<ArrowRight className="w-4 h-4" \/> Asociación/g, '<ArrowRight className="w-4 h-4" /> <span className="hidden lg:inline">Asociación</span>');
content = content.replace(/<Diamond className="w-4 h-4" \/> Agregación/g, '<Diamond className="w-4 h-4" /> <span className="hidden lg:inline">Agregación</span>');
content = content.replace(/<Layers className="w-4 h-4" \/> Composición/g, '<Layers className="w-4 h-4" /> <span className="hidden lg:inline">Composición</span>');
content = content.replace(/<Triangle className="w-4 h-4" \/> Generalización/g, '<Triangle className="w-4 h-4" /> <span className="hidden lg:inline">Generalización</span>');
content = content.replace(/<MoveRight className="w-4 h-4" \/> Dependencia/g, '<MoveRight className="w-4 h-4" /> <span className="hidden lg:inline">Dependencia</span>');


// 8. Main flex-1 min-w-0 min-h-0
content = content.replace('<div className="flex-1 flex overflow-hidden">', '<div className="flex-1 flex overflow-hidden relative min-h-0">');
content = content.replace('<main className="flex-1 relative bg-[#FAFAFC]">', '<main className="flex-1 min-w-0 min-h-0 relative bg-[#FAFAFC]">');

// 9. Right panel responsive overlay
content = content.replace("const [selectedTool, setSelectedTool] = useState('select');", "const [selectedTool, setSelectedTool] = useState('select');\n  const [showRightPanelMobile, setShowRightPanelMobile] = useState(false);");

content = content.replace('<aside className="w-80 bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col z-40 overflow-y-auto shrink-0">', '<aside className={`absolute right-0 top-0 bottom-0 lg:static w-80 bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col z-40 overflow-y-auto shrink-0 max-w-[320px] transition-transform ${showRightPanelMobile ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>');

// Menu toggle button
content = content.replace('</header>', '  <button onClick={() => setShowRightPanelMobile(!showRightPanelMobile)} className="lg:hidden ml-2 px-3 py-1.5 bg-gray-100 rounded text-gray-600 border border-gray-200 font-bold text-xs">Menú</button>\n      </header>');


// 10. mappedNodes lockedBy logic removal
const mapped_nodes_old = /const mappedNodes = useMemo\(\(\) => \{\n\s*return nodes\.map\(n => \(\{\n\s*\.\.\.n,\n\s*draggable: lockedElements\[n\.id\] && lockedElements\[n\.id\] !== user\?\.nombre \? false : true,\n\s*data: \{ \.\.\.n\.data, lockedBy: lockedElements\[n\.id\] \}\n\s*\}\)\);\n\s*\}, \[nodes, lockedElements, user\?\.nombre\]\);/g;
const mapped_nodes_new = `const mappedNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      draggable: true,
      data: { ...n.data, lockedBy: null }
    }));
  }, [nodes]);`;
content = content.replace(mapped_nodes_old, mapped_nodes_new);


// 11. Lock alerts on click removal
content = content.replace(/if \(lockedElements\[node\.id\][\s\S]*?return;\n\s*\}/g, '');
content = content.replace(/if \(lockedElements\[edge\.id\][\s\S]*?return;\n\s*\}/g, '');

// 12. Editando ahora section removal
content = content.replace(/<div>\n\s*<h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Editando ahora<\/h3>[\s\S]*?<\/div>\n\s*<\/div>/g, '</div>');


// 13. Collaboration connected logic text
const collab_conn_old = /\{connectedUsers\.length === 0 \? \(\n\s*<div className="text-sm text-gray-400">Nadie está conectado\.<\/div>\n\s*\) : \(/g;
const collab_conn_new = `{connectedUsers.length === 0 ? (
                      <div className="text-sm text-gray-400">{connectionStatus === 'Sincronizado' ? 'Nadie está conectado.' : 'Actualizando presencia...'}</div>
                    ) : (`;
content = content.replace(collab_conn_old, collab_conn_new);

// 14. Text corrections
content = content.replace(/MÃ©todos/g, 'Métodos');
content = content.replace(/ParÃ¡metros/g, 'Parámetros');
content = content.replace(/Tipo de RelaciÃ³n/g, 'Tipo de Relación');
content = content.replace(/Sin conexiÃ³n/g, 'Sin conexión');
content = content.replace(/CreÃ³/g, 'Creó');
content = content.replace(/MoviÃ³/g, 'Movió');
content = content.replace(/ActualizÃ³/g, 'Actualizó');
content = content.replace(/EliminÃ³/g, 'Eliminó');
content = content.replace(/ConexiÃ³n/g, 'Conexión');

// Replace "Add" with "Agregar"
content = content.replace(/PlusSquare className="w-3 h-3" \/> Add/g, 'PlusSquare className="w-3 h-3" /> Agregar');

// Remove Desconectado usage in top bar connection status
content = content.replace(/connectionStatus === "Desconectado"/g, 'connectionStatus === "Sin conexión"');

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', content, 'utf-8');
console.log('Done!');
