import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { getBitacoras } from '../services/bitacoraService';
import type { Bitacora } from '../services/bitacoraService';
import { 
  LogOut, Folder, LayoutDashboard, Users, Shield, Clock, Menu, X, Search, Calendar, Activity
} from 'lucide-react';
import Logo from '../components/Logo';

export default function BitacoraVista() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [bitacoras, setBitacoras] = useState<Bitacora[]>([]);
  const [filteredBitacoras, setFilteredBitacoras] = useState<Bitacora[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Filters state
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const fetchBitacoras = async () => {
    try {
      const data = await getBitacoras();
      setBitacoras(data);
      setFilteredBitacoras(data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la bitácora. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitacoras();
  }, []);

  useEffect(() => {
    let result = bitacoras;
    
    if (filtroUsuario) {
      const lowerUser = filtroUsuario.toLowerCase();
      result = result.filter(b => b.usuarioNombre?.toLowerCase().includes(lowerUser));
    }
    
    if (filtroAccion) {
      const lowerAction = filtroAccion.toLowerCase();
      result = result.filter(b => b.accion?.toLowerCase().includes(lowerAction));
    }
    
    if (filtroFecha) {
      result = result.filter(b => {
        if (!b.fechaHora) return false;
        const datePart = b.fechaHora.split('T')[0];
        return datePart === filtroFecha;
      });
    }

    setFilteredBitacoras(result);
  }, [filtroUsuario, filtroAccion, filtroFecha, bitacoras]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Background Decorativo Global */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-lila-light rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none"></div>
      <div className="absolute top-[30%] right-[20%] w-[30rem] h-[30rem] bg-blue-pastel rounded-full mix-blend-multiply filter blur-[90px] opacity-20 pointer-events-none"></div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-lila-light/50 shadow-sm relative z-50">
        <div className="flex items-center space-x-3">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-text-dark tracking-tight">IA de UMLForge</span>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:text-lila-main transition-colors">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur-xl border-r border-lila-light/50 shadow-[4px_0_24px_rgba(139,92,246,0.03)] transform transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden md:flex items-center gap-3">
          <Logo className="w-9 h-9" />
          <span className="font-bold text-xl text-text-dark tracking-tight">IA de UMLForge</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-1.5">
          <div className="text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mt-2 mb-3 px-4">Principal</div>
          
          <Link to="/dashboard" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
            <LayoutDashboard className="w-5 h-5 mr-3 text-gray-400 group-hover:text-lila-main transition-colors" /> Panel
          </Link>
          <Link to="/proyectos" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
            <Folder className="w-5 h-5 mr-3 text-gray-400 group-hover:text-pink-main transition-colors" /> Proyectos
          </Link>

          {(user?.permisos?.includes('GESTIONAR_USUARIOS') || user?.permisos?.includes('GESTIONAR_ROLES') || user?.permisos?.includes('CONSULTAR_BITACORA')) && (
            <>
              <div className="text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mt-8 mb-3 px-4">Administración</div>
              {user?.permisos?.includes('GESTIONAR_USUARIOS') && (
                <Link to="/usuarios" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
                  <Users className="w-5 h-5 mr-3 text-gray-400 group-hover:text-lila-main transition-colors" /> Usuarios
                </Link>
              )}
              {user?.permisos?.includes('GESTIONAR_ROLES') && (
                <Link to="/roles" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
                  <Shield className="w-5 h-5 mr-3 text-gray-400 group-hover:text-lila-main transition-colors" /> Roles
                </Link>
              )}
              {user?.permisos?.includes('CONSULTAR_BITACORA') && (
                <Link to="/bitacora" className="flex items-center px-4 py-3 bg-lila-light/50 text-lila-main rounded-2xl font-semibold transition-all">
                  <Clock className="w-5 h-5 mr-3" /> Bitácora
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

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full h-screen overflow-y-auto custom-scrollbar">
        <div className="p-6 md:p-12 max-w-7xl mx-auto min-h-full">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-text-dark tracking-tight mb-3 flex items-center gap-4">
                Bitácora de actividades
              </h1>
              <p className="text-gray-500 text-lg font-medium max-w-2xl leading-relaxed">
                Revisa el historial de acciones y eventos realizados en el sistema.
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-10">
            <div className="p-6 md:p-8 border-b border-gray-100/80">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Filtrar por usuario..."
                    value={filtroUsuario}
                    onChange={(e) => setFiltroUsuario(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Filtrar por acción (ej. LOGIN)..."
                    value={filtroAccion}
                    onChange={(e) => setFiltroAccion(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lila-main mb-4"></div>
                <p className="text-gray-500 font-medium">Cargando historial...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-text-dark mb-2">Error de conexión</h3>
                <p className="text-gray-500 font-medium">{error}</p>
                <button 
                  onClick={fetchBitacoras}
                  className="mt-6 px-6 py-2.5 bg-lila-main text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredBitacoras.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-[2rem] flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-text-dark">No se encontraron registros</h3>
                <p className="text-gray-500 mt-2 font-medium max-w-sm">
                  Aún no hay actividades registradas en el sistema o ningún evento coincide con tus filtros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="px-6 md:px-8 py-5 border-b border-gray-100/80">Fecha/Hora</th>
                      <th className="px-6 md:px-8 py-5 border-b border-gray-100/80">Usuario</th>
                      <th className="px-6 md:px-8 py-5 border-b border-gray-100/80">Acción</th>
                      <th className="px-6 md:px-8 py-5 border-b border-gray-100/80">Descripción</th>
                      <th className="px-6 md:px-8 py-5 border-b border-gray-100/80">Proyecto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBitacoras.map((b) => {
                      const fecha = new Date(b.fechaHora);
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-text-dark">{fecha.toLocaleDateString()}</span>
                            <span className="text-xs font-medium text-gray-500 ml-2">{fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                              {b.usuarioNombre || 'Sistema'}
                            </span>
                          </td>
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-lila-main bg-lila-light/30 px-3 py-1.5 rounded-lg tracking-wide">
                              {b.accion}
                            </span>
                          </td>
                          <td className="px-6 md:px-8 py-4 text-sm font-medium text-gray-600 max-w-xs truncate" title={b.descripcion}>
                            {b.descripcion}
                          </td>
                          <td className="px-6 md:px-8 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-500">
                              {b.proyectoNombre || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
