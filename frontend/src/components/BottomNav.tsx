import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Folder, Clock, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface BottomNavProps {
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
}

export default function BottomNav({ onToggleMenu, isMenuOpen }: BottomNavProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Requisito 2: Respetar los permisos del usuario para Actividades (CONSULTAR_BITACORA)
  const canViewBitacora = Boolean(user?.permisos?.includes('CONSULTAR_BITACORA'));

  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-lila-light/60 shadow-[0_-4px_20px_rgba(139,92,246,0.08)] transition-all"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-1.5 max-w-md mx-auto">
        {/* Acceso a Panel */}
        <Link
          to="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl min-h-[48px] transition-all select-none ${
            isActive('/dashboard')
              ? 'text-lila-main font-bold bg-lila-light/50'
              : 'text-gray-500 hover:text-text-dark font-medium'
          }`}
          aria-current={isActive('/dashboard') ? 'page' : undefined}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${isActive('/dashboard') ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Panel</span>
        </Link>

        {/* Acceso a Proyectos */}
        <Link
          to="/proyectos"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl min-h-[48px] transition-all select-none ${
            isActive('/proyectos')
              ? 'text-lila-main font-bold bg-lila-light/50'
              : 'text-gray-500 hover:text-text-dark font-medium'
          }`}
          aria-current={isActive('/proyectos') ? 'page' : undefined}
        >
          <Folder className={`w-5 h-5 mb-0.5 ${isActive('/proyectos') ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Proyectos</span>
        </Link>

        {/* Acceso a Actividades (respetando permisos) */}
        {canViewBitacora && (
          <Link
            to="/bitacora"
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl min-h-[48px] transition-all select-none ${
              isActive('/bitacora')
                ? 'text-lila-main font-bold bg-lila-light/50'
                : 'text-gray-500 hover:text-text-dark font-medium'
            }`}
            aria-current={isActive('/bitacora') ? 'page' : undefined}
          >
            <Clock className={`w-5 h-5 mb-0.5 ${isActive('/bitacora') ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">Actividades</span>
          </Link>
        )}

        {/* Acceso rápido a Menú completo / Drawer */}
        {onToggleMenu && (
          <button
            type="button"
            onClick={onToggleMenu}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl min-h-[48px] transition-all select-none ${
              isMenuOpen
                ? 'text-lila-main font-bold bg-lila-light/50'
                : 'text-gray-500 hover:text-text-dark font-medium'
            }`}
            aria-label="Abrir menú completo"
            aria-expanded={isMenuOpen}
          >
            <Menu className={`w-5 h-5 mb-0.5 ${isMenuOpen ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] tracking-tight">Menú</span>
          </button>
        )}
      </div>
    </nav>
  );
}
