import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Folder, LayoutDashboard, Users, Shield, Clock, Menu, X } from 'lucide-react';
import Logo from './Logo';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-[100dvh] bg-bg-main flex flex-col md:flex-row relative font-sans overflow-x-hidden">
      
      {/* Background Decorativo Global */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-lila-light rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none z-0"></div>
      <div className="absolute top-[30%] right-[20%] w-[30rem] h-[30rem] bg-blue-pastel rounded-full mix-blend-multiply filter blur-[90px] opacity-20 pointer-events-none z-0"></div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-lila-light/50 shadow-sm relative z-40 shrink-0">
        <div className="flex items-center space-x-3">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-text-dark tracking-tight">IA de UMLForge</span>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:text-lila-main transition-colors z-50">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay para móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 md:hidden" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-xl border-r border-lila-light/50 shadow-[4px_0_24px_rgba(139,92,246,0.03)] transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 md:p-8 flex items-center justify-between md:justify-start gap-3 border-b md:border-none border-lila-light/30">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9" />
            <span className="font-bold text-xl text-text-dark tracking-tight">IA de UMLForge</span>
          </div>
          <button onClick={closeSidebar} className="md:hidden p-2 text-gray-500 hover:text-lila-main transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-1.5">
          <div className="text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mt-2 mb-3 px-4">Principal</div>
          
          <Link to="/dashboard" onClick={closeSidebar} className={`flex items-center px-4 py-3 rounded-2xl font-semibold transition-all ${isActive('/dashboard') ? 'bg-lila-light/50 text-lila-main' : 'text-gray-500 hover:bg-gray-50 hover:text-text-dark group'}`}>
            <LayoutDashboard className={`w-5 h-5 mr-3 ${isActive('/dashboard') ? '' : 'text-gray-400 group-hover:text-lila-main transition-colors'}`} /> Panel
          </Link>
          <Link to="/proyectos" onClick={closeSidebar} className={`flex items-center px-4 py-3 rounded-2xl font-semibold transition-all ${isActive('/proyectos') ? 'bg-lila-light/50 text-lila-main' : 'text-gray-500 hover:bg-gray-50 hover:text-text-dark group'}`}>
            <Folder className={`w-5 h-5 mr-3 ${isActive('/proyectos') ? '' : 'text-gray-400 group-hover:text-pink-main transition-colors'}`} /> Proyectos
          </Link>

          {(user?.permisos?.includes('GESTIONAR_USUARIOS') || user?.permisos?.includes('GESTIONAR_ROLES') || user?.permisos?.includes('CONSULTAR_BITACORA')) && (
            <>
              <div className="text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mt-8 mb-3 px-4">Administración</div>
              {user?.permisos?.includes('GESTIONAR_USUARIOS') && (
                <Link to="/usuarios" onClick={closeSidebar} className={`flex items-center px-4 py-3 rounded-2xl font-semibold transition-all ${isActive('/usuarios') ? 'bg-lila-light/50 text-lila-main' : 'text-gray-500 hover:bg-gray-50 hover:text-text-dark group'}`}>
                  <Users className={`w-5 h-5 mr-3 ${isActive('/usuarios') ? '' : 'text-gray-400 group-hover:text-lila-main transition-colors'}`} /> Usuarios
                </Link>
              )}
              {user?.permisos?.includes('GESTIONAR_ROLES') && (
                <Link to="/roles" onClick={closeSidebar} className={`flex items-center px-4 py-3 rounded-2xl font-semibold transition-all ${isActive('/roles') ? 'bg-lila-light/50 text-lila-main' : 'text-gray-500 hover:bg-gray-50 hover:text-text-dark group'}`}>
                  <Shield className={`w-5 h-5 mr-3 ${isActive('/roles') ? '' : 'text-gray-400 group-hover:text-lila-main transition-colors'}`} /> Roles
                </Link>
              )}
              {user?.permisos?.includes('CONSULTAR_BITACORA') && (
                <Link to="/bitacora" onClick={closeSidebar} className={`flex items-center px-4 py-3 rounded-2xl font-semibold transition-all ${isActive('/bitacora') ? 'bg-lila-light/50 text-lila-main' : 'text-gray-500 hover:bg-gray-50 hover:text-text-dark group'}`}>
                  <Clock className={`w-5 h-5 mr-3 ${isActive('/bitacora') ? '' : 'text-gray-400 group-hover:text-pink-main transition-colors'}`} /> Bitácora
                </Link>
              )}
            </>
          )}
        </div>

        <div className="p-6">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-2xl font-medium transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5 mr-2" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[calc(100dvh-73px)] md:h-[100dvh] overflow-x-hidden relative z-10 w-full overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-6 lg:py-12 flex-1 flex flex-col">
          
          {/* Header Superior Dinámico */}
          <header className="flex items-center justify-end mb-6 lg:mb-12">
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-lila-light/50 shadow-sm w-full md:w-auto justify-end">
              <div className="text-right flex flex-col items-end">
                <p className="text-sm font-semibold text-text-dark truncate max-w-[150px] sm:max-w-[200px]">{user?.nombre} {user?.apellido}</p>
                <p className="text-[11px] font-medium text-lila-main uppercase tracking-wider">{user?.rol === 'ROLE_ADMIN' || user?.rol === 'ADMIN' ? 'Administrador' : 'Anfitrión'}</p>
              </div>
              <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          
          {children}
          
        </div>
      </main>
    </div>
  );
}
