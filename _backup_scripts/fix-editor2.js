const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/UMLEditor.tsx', 'utf8');

// Replace header
let headerRegex = /<header className="h-auto min-h-\[3\.5rem\] py-2 bg-white\/95 backdrop-blur-md border-b border-lila-light\/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 overflow-x-auto w-full">([\s\S]*?)<\/header>/;

let newHeader = `<header className="h-14 bg-white/95 backdrop-blur-md border-b border-lila-light/50 flex items-center justify-between gap-3 px-3 lg:px-6 z-50 shadow-sm shrink-0 w-full relative">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="lg:hidden p-1.5 hover:bg-lila-light/30 rounded-lg text-text-light hover:text-lila-main transition-colors"
            title="Herramientas"
          >
            <Wrench className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => navigate(proyectoId ? \`/proyectos/\${proyectoId}\` : '/dashboard')}
            className="hidden md:block p-1.5 hover:bg-lila-light/30 rounded-lg text-text-light hover:text-lila-main transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="hidden md:block h-4 w-px bg-gray-200"></div>
          
          <input 
            value={nombreDiagrama}
            onChange={(e) => setNombreDiagrama(e.target.value)}
            className="font-bold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-lila-light/50 rounded px-1 md:px-2 py-1 max-w-[120px] md:max-w-[200px]"
            placeholder="Nombre"
          />
          <span className="hidden md:inline text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full">Guardado manual</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-2 border-r border-gray-200 pr-4">
            <span className={\`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider \${connectionStatus === 'Sin conexión' ? 'text-red-500' : connectionStatus === 'Sincronizado' ? 'text-green-500' : 'text-yellow-500'}\`}>
              <div className={\`w-2 h-2 rounded-full \${connectionStatus === 'Sin conexión' ? 'bg-red-500' : connectionStatus === 'Sincronizado' ? 'bg-green-500' : 'bg-yellow-500'}\`}></div>
              {connectionStatus === 'Sincronizado'
                ? \`En línea · \${connectedUsers.length} \${connectedUsers.length === 1 ? 'colaborador' : 'colaboradores'}\`
                : connectionStatus}
            </span>
            {connectionStatus === "Sincronizado" && connectedUsers.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <div className="flex -space-x-2">
                  {connectedUsers.map(u => (
                    <div key={u.id} title={\`\${u.nombre} — \${u.rol}\`} className="w-7 h-7 rounded-full bg-lila-light border-2 border-white flex items-center justify-center text-[10px] font-bold text-lila-main">
                      {getInitials(u.nombre)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden lg:flex items-center gap-1">
            <button onClick={() => setShowHistory(true)} className="px-3 py-1.5 text-xs font-bold text-lila-main bg-lila-light/10 hover:bg-lila-light/20 rounded-lg transition-colors">Actividad</button>
            <button onClick={() => setShowIaModal(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Asistente IA</button>
            <button onClick={() => setShowImageModal(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Imagen</button>
            <button onClick={() => setShowXmiImport(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Importar XMI</button>
            <button onClick={() => setShowXmiExport(true)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors">Exportar XMI</button>
            <button onClick={() => setShowGenerateBackendModal(true)} disabled={isGeneratingBackend} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
              {isGeneratingBackend ? 'Generando backend...' : 'Generar backend'}
            </button>
            <button onClick={() => setShowGenerateMobileModal(true)} disabled={isGeneratingMobile} className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50">
              {isGeneratingMobile ? 'Generando app...' : 'Generar App Móvil'}
            </button>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
             <MoreVertical className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="lg:hidden p-1.5 hover:bg-lila-light/30 rounded-lg text-text-light hover:text-lila-main transition-colors"
            title="Inspector"
          >
            <PanelRightOpen className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleSave}
            className="ml-1 md:ml-2 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-lila-main to-pink-main text-white text-xs md:text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1 md:gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span className="hidden md:inline">Guardar</span>
          </button>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        {isMobileMenuOpen && (
           <div className="absolute top-16 right-4 w-56 bg-white shadow-xl border border-gray-100 rounded-xl p-2 z-50 flex flex-col gap-1 lg:hidden">
             <button onClick={() => { setIsMobileMenuOpen(false); setShowHistory(true); }} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Actividad</button>
             <button onClick={() => { setIsMobileMenuOpen(false); setShowIaModal(true); }} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Asistente IA</button>
             <button onClick={() => { setIsMobileMenuOpen(false); setShowImageModal(true); }} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Importar de Imagen</button>
             <button onClick={() => { setIsMobileMenuOpen(false); setShowXmiImport(true); }} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Importar XMI</button>
             <button onClick={() => { setIsMobileMenuOpen(false); setShowXmiExport(true); }} className="px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Exportar XMI</button>
             <div className="h-px bg-gray-100 my-1"></div>
             <button onClick={() => { setIsMobileMenuOpen(false); setShowGenerateBackendModal(true); }} className="px-3 py-2 text-left text-sm font-semibold text-lila-main hover:bg-lila-50 rounded-lg">Generar Backend</button>
             <button onClick={() => { setIsMobileMenuOpen(false); setShowGenerateMobileModal(true); }} className="px-3 py-2 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg">Generar App Móvil</button>
             <div className="h-px bg-gray-100 my-1"></div>
             <button onClick={() => { setIsMobileMenuOpen(false); navigate(proyectoId ? \`/proyectos/\${proyectoId}\` : '/dashboard'); }} className="px-3 py-2 text-left text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-lg">Volver atrás</button>
           </div>
        )}
      </header>`;

code = code.replace(headerRegex, newHeader);

// Adjust the sidebars to be drawers on mobile
let leftPanelRegex = /<aside className="w-14 lg:w-48 bg-white\/95 backdrop-blur-md border-r border-lila-light\/50 flex flex-col py-4 z-40 shadow-\[4px_0_24px_rgba\(139,92,246,0\.03\)\] overflow-y-auto shrink-0 h-full">([\s\S]*?)<\/aside>/;

let newLeftPanel = `<aside className={\`
          fixed inset-y-0 left-0 z-50 w-14 lg:w-48 bg-white/95 backdrop-blur-md border-r border-lila-light/50 flex flex-col py-4 shadow-[4px_0_24px_rgba(139,92,246,0.03)] overflow-y-auto h-full transition-transform duration-300 ease-in-out
          \${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 shrink-0
        \`}>$1</aside>
        
        {isLeftPanelOpen && (
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsLeftPanelOpen(false)}></div>
        )}`;

code = code.replace(leftPanelRegex, newLeftPanel);

// Adjust the right panel to be a drawer on mobile
let rightPanelRegex = /<aside className="hidden lg:flex absolute inset-y-0 right-0 w-80 max-w-\[calc\(100%_-_3\.5rem\)\] lg:static lg:max-w-none bg-white\/95 backdrop-blur-md border-l border-lila-light\/50 shadow-\[-4px_0_24px_rgba\(139,92,246,0\.03\)\] flex-col z-40 overflow-hidden shrink-0">([\s\S]*?)<\/aside>/;

let newRightPanel = `<aside className={\`
          fixed inset-y-0 right-0 z-50 w-80 max-w-[calc(100%-3.5rem)] lg:max-w-none bg-white/95 backdrop-blur-md border-l border-lila-light/50 shadow-[-4px_0_24px_rgba(139,92,246,0.03)] flex flex-col overflow-hidden h-full transition-transform duration-300 ease-in-out
          \${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:relative lg:translate-x-0 shrink-0
        \`}>$1</aside>
        
        {isRightPanelOpen && (
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsRightPanelOpen(false)}></div>
        )}`;

code = code.replace(rightPanelRegex, newRightPanel);

fs.writeFileSync('frontend/src/pages/UMLEditor.tsx', code, 'utf8');
