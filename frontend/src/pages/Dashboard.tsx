import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { 
  Folder, Plus, Edit2, Play, Square, ExternalLink, 
  X, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import Layout from '../components/Layout';

interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  anfitrionNombre: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [invitaciones, setInvitaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <Layout>
      {/* Bloque de Bienvenida Sutil */}
      <div className="bg-white/70 backdrop-blur-lg border border-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 lg:p-10 mb-8 sm:mb-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
        {/* Decoración dentro del banner */}
        <div className="absolute right-0 top-0 w-48 sm:w-64 h-full bg-gradient-to-l from-pink-light/30 to-transparent pointer-events-none"></div>
        <svg className="hidden sm:block absolute -right-8 -bottom-8 w-40 h-40 text-lila-main/10 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
          <rect x="20" y="20" width="30" height="20" rx="4" />
          <rect x="60" y="50" width="30" height="20" rx="4" />
          <path d="M35 40 L65 50" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark mb-2 tracking-tight">
            Hola, {user?.nombre || 'Usuario'}
          </h1>
          <p className="text-gray-500 text-sm sm:text-base lg:text-lg max-w-xl font-medium">
            Administra tus proyectos y continúa trabajando en tus diagramas UML.
          </p>
        </div>
      </div>

      {/* Invitaciones Pendientes */}
      {invitaciones.length > 0 && (
        <div className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-text-dark tracking-tight mb-4">
            Invitaciones pendientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="bg-white/85 backdrop-blur-md rounded-2xl border border-yellow-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-text-dark text-sm sm:text-base">
                    {inv.anfitrionNombre} te invitó a colaborar
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Revisa tu invitación para unirte al proyecto.
                  </p>
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button 
                    type="button"
                    onClick={() => handleAceptarInvitacion(inv.token)}
                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-lila-main to-pink-main text-white text-xs sm:text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-xs min-h-[44px]"
                  >
                    Aceptar
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleRechazarInvitacion(inv.token)}
                    className="flex-1 py-2.5 px-3 bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[44px]"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-text-dark tracking-tight">
          Mis proyectos
        </h2>
        
        <button 
          type="button"
          onClick={openModalCrear}
          className="group relative flex justify-center items-center gap-2 px-5 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lila-main transition-all shadow-md shadow-pink-main/20 w-full sm:w-auto min-h-[48px]"
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
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 bg-white/60 backdrop-blur-sm rounded-3xl sm:rounded-[2rem] border border-dashed border-lila-light px-4 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pink-light/50 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-5 text-pink-main rotate-3">
            <Folder className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-text-dark">Aún no tienes proyectos</h3>
          <p className="text-gray-500 mt-2 mb-6 max-w-sm text-xs sm:text-sm font-medium">
            Crea tu primer proyecto para comenzar a diseñar diagramas de clase de manera simple.
          </p>
          <button 
            type="button"
            onClick={openModalCrear}
            className="text-lila-main font-bold hover:text-pink-main transition-colors flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
          >
            <span>Crear mi primer proyecto</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {proyectos.map((p) => (
            <div 
              key={p.id} 
              className={`group bg-white/85 backdrop-blur-md rounded-3xl border shadow-xs hover:shadow-xl hover:shadow-lila-main/10 transition-all duration-300 overflow-hidden flex flex-col ${
                !p.activo ? 'opacity-85 border-gray-100 grayscale-[0.2]' : 'border-white hover:border-lila-light/50'
              }`}
            >
              <div className="p-5 sm:p-6 flex-grow">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-text-dark line-clamp-1 flex-1" title={p.nombre}>
                    {p.nombre}
                  </h3>
                  <div className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                    p.activo ? 'bg-lila-light/70 text-lila-main' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{p.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 min-h-[2.5rem] font-medium leading-relaxed">
                  {p.descripcion || 'Sin descripción'}
                </p>
              </div>
              
              <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100/70 bg-gray-50/40 flex items-center justify-between">
                <button 
                  type="button"
                  disabled={!p.activo}
                  onClick={() => navigate(`/proyectos/${p.id}`)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-lila-main hover:text-pink-main disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir</span>
                </button>
                
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => openModalEditar(p)}
                    className="p-2.5 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Editar proyecto"
                    aria-label="Editar proyecto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleCambiarEstado(p.id, p.activo)}
                    title={p.activo ? "Desactivar proyecto" : "Activar proyecto"}
                    aria-label={p.activo ? "Desactivar proyecto" : "Activar proyecto"}
                    className={`p-2.5 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                      p.activo ? 'text-gray-400 hover:text-pink-500 hover:bg-pink-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                    }`}
                  >
                    {p.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Elegante y Adaptable a Móvil */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          ></div>
          
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-lg relative z-10 overflow-hidden transform transition-all border border-white my-auto max-h-[90dvh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-text-dark flex items-center gap-2.5">
                {isEditing ? (
                  <><Edit2 className="w-5 h-5 text-pink-main shrink-0" /> <span>Editar proyecto</span></>
                ) : (
                  <><Folder className="w-5 h-5 text-lila-main shrink-0" /> <span>Nuevo proyecto</span></>
                )}
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">
                  Nombre del proyecto *
                </label>
                <input 
                  type="text" 
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-main/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Ej. Sistema de Biblioteca"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">
                  Descripción
                </label>
                <textarea 
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-main/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400 resize-none text-sm sm:text-base"
                  placeholder="Añade una descripción breve o propósito de los diagramas..."
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-100 rounded-xl sm:rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all min-h-[48px]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl sm:rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 group min-h-[48px]"
                >
                  <span>Guardar</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
