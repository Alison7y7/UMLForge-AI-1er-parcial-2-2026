import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/axios';
import { 
  LogOut, Folder, Plus, Edit2, Play, Square, 
  LayoutDashboard, Users, Shield, Clock, Menu, X, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import Logo from '../components/Logo';

interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  anfitrionNombre: string;
  anfitrionId: number;
  fechaCreacion?: string;
}

export default function Proyectos() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [currentProyectoId, setCurrentProyectoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);

  // Status toggle state
  const [proyectoToToggle, setProyectoToToggle] = useState<Proyecto | null>(null);

  // Messages
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchProyectos = async () => {
    try {
      const res = await api.get('/proyectos');
      setProyectos(res.data);
    } catch (err) {
      console.error(err);
      showError('Error al obtener los proyectos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentProyectoId(null);
    setNombre('');
    setDescripcion('');
    setActivo(true);
    setShowModal(true);
  };

  const openEditModal = (p: Proyecto) => {
    setIsEditing(true);
    setCurrentProyectoId(p.id);
    setNombre(p.nombre);
    setDescripcion(p.descripcion || '');
    setActivo(p.activo);
    setShowModal(true);
  };

  const openStatusModal = (p: Proyecto) => {
    setProyectoToToggle(p);
    setShowStatusModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!nombre.trim()) {
      showError('Completa los campos obligatorios.');
      return;
    }

    try {
      const payload = {
        nombre,
        descripcion,
        activo
      };

      if (isEditing && currentProyectoId) {
        await api.put(`/proyectos/${currentProyectoId}`, payload);
        showMessage('Proyecto actualizado correctamente');
      } else {
        await api.post('/proyectos', payload);
        showMessage('Proyecto creado correctamente');
      }
      setShowModal(false);
      fetchProyectos();
    } catch (err: any) {
      console.error(err);
      showError('No se pudieron guardar los cambios.');
    }
  };

  const handleToggleStatus = async () => {
    if (!proyectoToToggle) return;
    try {
      await api.patch(`/proyectos/${proyectoToToggle.id}/estado?activo=${!proyectoToToggle.activo}`);
      showMessage(`Proyecto ${!proyectoToToggle.activo ? 'activado' : 'desactivado'} correctamente`);
      setShowStatusModal(false);
      fetchProyectos();
    } catch (err: any) {
      console.error(err);
      showError('Error al cambiar el estado.');
    }
  };

  const canEdit = (p: Proyecto) => {
    if (!user) return false;
    if (user.id === p.anfitrionId) return true;
    if (user.permisos?.includes('GESTIONAR_PROYECTOS')) return true;
    if (user.rol === 'ADMIN') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Background Decorativo Global */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-lila-light rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none"></div>
      
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
          <Link to="/proyectos" className="flex items-center px-4 py-3 bg-lila-light/50 text-lila-main rounded-2xl font-semibold transition-all">
            <Folder className="w-5 h-5 mr-3" /> Proyectos
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
                <a href="#" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
                  <Clock className="w-5 h-5 mr-3 text-gray-400 group-hover:text-pink-main transition-colors" /> Bitácora
                </a>
              )}
            </>
          )}
        </div>

        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center justify-center w-full px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-2xl font-medium transition-all border border-transparent hover:border-red-100">
            <LogOut className="w-5 h-5 mr-2" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        {/* Top Navbar */}
        <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white shadow-[0_4px_30px_rgba(0,0,0,0.02)] px-8 py-4 flex items-center justify-end">
          <div className="flex items-center gap-4 bg-white/80 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-text-dark">{user?.nombre} {user?.apellido}</p>
              <p className="text-[11px] font-medium text-lila-main uppercase tracking-wider">{user?.rol}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner">
              {user?.nombre?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-12 max-w-7xl mx-auto w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-text-dark tracking-tight mb-2">
                Proyectos UML
              </h1>
              <p className="text-gray-500 font-medium text-lg">
                Gestiona tus proyectos y colabora con otros.
              </p>
            </div>
            <button 
              onClick={openCreateModal}
              className="flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-pink-main/30"
            >
              <Plus className="w-5 h-5 mr-2" /> Nuevo proyecto
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100/80 bg-gray-50/30">
                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/3">Proyecto</th>
                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Anfitrión</th>
                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Fecha Creación</th>
                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/80">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lila-main mx-auto"></div>
                      </td>
                    </tr>
                  ) : proyectos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No tienes acceso a ningún proyecto actualmente.
                      </td>
                    </tr>
                  ) : (
                    proyectos.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-lila-light/30 flex items-center justify-center text-lila-main shrink-0">
                              <Folder className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-text-dark">{p.nombre}</p>
                              <p className="text-sm text-gray-500 line-clamp-1">{p.descripcion || 'Sin descripción'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 hidden md:table-cell">
                          <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                            {p.anfitrionNombre}
                          </span>
                        </td>
                        <td className="px-6 py-5 hidden lg:table-cell text-sm font-medium text-gray-500">
                          {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${p.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2 transition-opacity">
                            <button 
                              onClick={() => navigate(`/proyectos/${p.id}`)}
                              className="p-2 text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors"
                              title="Abrir proyecto"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                            {canEdit(p) && (
                              <>
                                <button 
                                  onClick={() => openEditModal(p)}
                                  className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => openStatusModal(p)}
                                  className={`p-2 rounded-xl transition-colors ${p.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                                  title={p.activo ? "Desactivar" : "Activar"}
                                >
                                  {p.activo ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-lg relative z-10 overflow-hidden transform transition-all border border-white my-8 flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-text-dark flex items-center gap-3">
                <Folder className="w-6 h-6 text-lila-main" />
                {isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Nombre del proyecto *</label>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark"
                  placeholder="Ej. Sistema de Inventario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Descripción</label>
                <textarea 
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark resize-none h-24"
                  placeholder="Opcional"
                />
              </div>
              
              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3.5 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Desactivar/Activar */}
      {showStatusModal && proyectoToToggle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}></div>
          
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-sm relative z-10 p-8 text-center border border-white">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${proyectoToToggle.activo ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {proyectoToToggle.activo ? <Square className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </div>
            
            <h3 className="text-xl font-bold text-text-dark mb-2">
              {proyectoToToggle.activo ? 'Desactivar proyecto' : 'Activar proyecto'}
            </h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed text-sm">
              ¿Deseas {proyectoToToggle.activo ? 'desactivar' : 'activar'} este proyecto? {proyectoToToggle.activo ? 'Podrás volver a activarlo más adelante.' : ''}
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all border border-transparent"
              >
                Cancelar
              </button>
              <button 
                onClick={handleToggleStatus}
                className={`flex-1 px-5 py-3 rounded-xl text-sm transition-all text-white font-semibold ${proyectoToToggle.activo ? 'bg-red-500 hover:bg-red-600 border-red-500' : 'bg-green-500 hover:bg-green-600 border-green-500'}`}
              >
                {proyectoToToggle.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {message && (
        <div className="fixed bottom-6 right-6 z-[70] bg-white text-gray-900 px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium">
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          {message}
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 z-[70] bg-white text-gray-900 px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          {error}
        </div>
      )}

    </div>
  );
}
