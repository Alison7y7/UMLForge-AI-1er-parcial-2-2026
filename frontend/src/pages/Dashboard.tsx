import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/axios';
import { 
  LogOut, Folder, Plus, Edit2, Play, Square, ExternalLink, 
  LayoutDashboard, Users, Shield, Clock, Menu, X, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import Logo from '../components/Logo';

interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  anfitrionNombre: string;
}

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [invitaciones, setInvitaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProyectoId, setCurrentProyectoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const fetchProyectos = async () => {
    try {
      const { data } = await api.get('/proyectos');
      setProyectos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitaciones = async () => {
    try {
      const { data } = await api.get('/invitaciones/mis-invitaciones');
      setInvitaciones(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProyectos();
    fetchInvitaciones();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openModalCrear = () => {
    setIsEditing(false);
    setCurrentProyectoId(null);
    setNombre('');
    setDescripcion('');
    setShowModal(true);
  };

  const openModalEditar = (p: Proyecto) => {
    setIsEditing(true);
    setCurrentProyectoId(p.id);
    setNombre(p.nombre);
    setDescripcion(p.descripcion);
    setShowModal(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    try {
      if (isEditing && currentProyectoId) {
        await api.put(`/proyectos/${currentProyectoId}`, { nombre, descripcion });
      } else {
        await api.post('/proyectos', { nombre, descripcion, activo: true });
      }
      setShowModal(false);
      fetchProyectos();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el proyecto');
    }
  };

  const handleCambiarEstado = async (id: number, actual: boolean) => {
    try {
      await api.patch(`/proyectos/${id}/estado?activo=${!actual}`);
      fetchProyectos();
    } catch (err) {
      console.error(err);
      alert('Error al cambiar el estado. ¿Tienes permisos?');
    }
  };

  const handleAceptarInvitacion = async (token: string) => {
    try {
      await api.post(`/invitaciones/${token}/aceptar`);
      fetchInvitaciones();
      fetchProyectos();
    } catch (err) {
      console.error(err);
      alert('Error al aceptar invitación');
    }
  };

  const handleRechazarInvitacion = async (token: string) => {
    try {
      await api.post(`/invitaciones/${token}/rechazar`);
      fetchInvitaciones();
    } catch (err) {
      console.error(err);
      alert('Error al rechazar invitación');
    }
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
          
          <Link to="/dashboard" className="flex items-center px-4 py-3 bg-lila-light/50 text-lila-main rounded-2xl font-semibold transition-all">
            <LayoutDashboard className="w-5 h-5 mr-3" /> Panel
          </Link>
          <a href="#" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
            <Folder className="w-5 h-5 mr-3 text-gray-400 group-hover:text-pink-main transition-colors" /> Proyectos
          </a>

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
                <Link to="/bitacora" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
                  <Clock className="w-5 h-5 mr-3 text-gray-400 group-hover:text-pink-main transition-colors" /> Bitácora
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
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-12 py-8 lg:py-12 flex-1 flex flex-col">
          
          {/* Header Superior Dinámico */}
          <header className="flex items-center justify-end mb-8 lg:mb-12">
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-lila-light/50 shadow-sm">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-text-dark">{user?.nombre} {user?.apellido}</p>
                <p className="text-[11px] font-medium text-lila-main uppercase tracking-wider">{user?.rol === 'ROLE_ADMIN' || user?.rol === 'ADMIN' ? 'Administrador' : 'Anfitrión'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Bloque de Bienvenida Sutil */}
          <div className="bg-white/70 backdrop-blur-lg border border-white rounded-[2rem] p-8 lg:p-10 mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
            {/* Decors dentro del header */}
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-pink-light/40 to-transparent pointer-events-none"></div>
            <svg className="absolute -right-10 -bottom-10 w-48 h-48 text-lila-main/10 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
              <rect x="20" y="20" width="30" height="20" rx="4" />
              <rect x="60" y="50" width="30" height="20" rx="4" />
              <path d="M35 40 L65 50" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            
            <div className="relative z-10">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-text-dark mb-3 tracking-tight">
                Hola, {user?.nombre || 'Administrador'}
              </h1>
              <p className="text-gray-500 text-lg max-w-xl font-medium">
                Administra tus proyectos y continúa trabajando en tus diagramas.
              </p>
            </div>
          </div>

          {/* Invitaciones */}
          {invitaciones.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-text-dark tracking-tight mb-6">Invitaciones pendientes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invitaciones.map(inv => (
                  <div key={inv.id} className="bg-white/80 backdrop-blur-md rounded-2xl border border-yellow-200 shadow-sm p-5 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-text-dark">{inv.anfitrionNombre} te invitó a colaborar</p>
                      <p className="text-sm text-gray-500 mt-1">Revisa tu invitación para unirte al proyecto.</p>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => handleAceptarInvitacion(inv.token)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-lila-main to-pink-main text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-pink-main/20"
                      >
                        Aceptar
                      </button>
                      <button 
                        onClick={() => handleRechazarInvitacion(inv.token)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección Mis Proyectos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-bold text-text-dark tracking-tight">Mis proyectos</h2>
            
            <button 
              onClick={openModalCrear}
              className="group relative flex justify-center items-center gap-2 px-6 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lila-main transition-all shadow-md shadow-pink-main/20 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Nuevo proyecto</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main"></div>
            </div>
          ) : proyectos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-lila-light">
              <div className="w-20 h-20 bg-pink-light/50 rounded-[2rem] flex items-center justify-center mb-6 text-pink-main rotate-3">
                <Folder className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-text-dark">Aún no tienes proyectos</h3>
              <p className="text-gray-500 mt-2 mb-8 text-center max-w-sm font-medium">
                Crea tu primer proyecto para comenzar a diseñar diagramas de clase de manera simple.
              </p>
              <button 
                onClick={openModalCrear}
                className="text-lila-main font-semibold hover:text-pink-main transition-colors flex items-center gap-2"
              >
                <span>Crear mi primer proyecto</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {proyectos.map((p) => (
                <div key={p.id} className={`group bg-white/80 backdrop-blur-md rounded-[2rem] border shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-lila-main/10 transition-all duration-300 overflow-hidden flex flex-col ${!p.activo ? 'opacity-80 border-gray-100 grayscale-[0.2]' : 'border-white hover:border-lila-light/50'}`}>
                  <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-text-dark line-clamp-1 flex-1 pr-3" title={p.nombre}>{p.nombre}</h3>
                      <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${p.activo ? 'bg-lila-light/70 text-lila-main' : 'bg-gray-100 text-gray-500'}`}>
                        {p.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem] font-medium leading-relaxed">
                      {p.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                  
                  <div className="px-6 py-4 border-t border-gray-100/50 bg-gray-50/30 flex items-center justify-between">
                    <button 
                      disabled={!p.activo}
                      onClick={() => navigate(`/proyectos/${p.id}`)}
                      className="flex items-center gap-2 text-sm font-bold text-lila-main hover:text-pink-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir</span>
                    </button>
                    
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => openModalEditar(p)}
                        className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleCambiarEstado(p.id, p.activo)}
                        title={p.activo ? "Desactivar" : "Activar"}
                        className={`p-2 rounded-xl transition-all ${p.activo ? 'text-gray-400 hover:text-pink-500 hover:bg-pink-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                      >
                        {p.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear/Editar Elegante */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-lg relative z-10 overflow-hidden transform transition-all border border-white">
            
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-text-dark flex items-center gap-3">
                {isEditing ? (
                  <><Edit2 className="w-6 h-6 text-pink-main" /> Editar proyecto</>
                ) : (
                  <><Folder className="w-6 h-6 text-lila-main" /> Nuevo proyecto</>
                )}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700 ml-1">Nombre del proyecto</label>
                <input 
                  type="text" 
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-main/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400"
                  placeholder="Ej. Sistema de Biblioteca"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700 ml-1">Descripción</label>
                <textarea 
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-main/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400 resize-none"
                  placeholder="Añade una descripción breve o propósito de los diagramas..."
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 group"
                >
                  Guardar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
