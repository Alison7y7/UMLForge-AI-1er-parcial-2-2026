import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { 
  Folder, Plus, Edit2, Play, Square, 
  X, CheckCircle2, XCircle, ArrowRight, Calendar, User as UserIcon
} from 'lucide-react';
import Layout from '../components/Layout';

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
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
    if (user.rol === 'ADMIN' || user.rol === 'ROLE_ADMIN') return true;
    return false;
  };

  return (
    <Layout>
      <div className="w-full">
        {/* Encabezado y Acción */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark tracking-tight mb-2">
              Proyectos UML
            </h1>
            <p className="text-gray-500 font-medium text-sm sm:text-base lg:text-lg">
              Gestiona tus proyectos y colabora con otros usuarios.
            </p>
          </div>
          <button 
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center px-5 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/25 w-full sm:w-auto min-h-[48px] shrink-0"
          >
            <Plus className="w-5 h-5 mr-2" /> 
            <span>Nuevo proyecto</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main"></div>
          </div>
        ) : proyectos.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-dashed border-lila-light/70 p-12 text-center">
            <div className="w-16 h-16 bg-pink-light/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-pink-main">
              <Folder className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-text-dark">No hay proyectos disponibles</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              No tienes acceso a ningún proyecto actualmente. Crea uno nuevo para comenzar.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA ESCRITORIO / TABLET: Tabla Completa */}
            <div className="hidden md:block bg-white/85 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-[2rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/40">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/3">Proyecto</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Anfitrión</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Fecha Creación</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/80">
                    {proyectos.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-lila-light/40 flex items-center justify-center text-lila-main shrink-0">
                              <Folder className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-text-dark truncate">{p.nombre}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{p.descripcion || 'Sin descripción'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                            {p.anfitrionNombre}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell text-xs font-medium text-gray-500">
                          {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            p.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              type="button"
                              onClick={() => navigate(`/proyectos/${p.id}`)}
                              className="p-2 text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Abrir proyecto"
                              aria-label="Abrir proyecto"
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                            {canEdit(p) && (
                              <>
                                <button 
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                                  title="Editar"
                                  aria-label="Editar proyecto"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => openStatusModal(p)}
                                  className={`p-2 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                    p.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                                  }`}
                                  title={p.activo ? "Desactivar" : "Activar"}
                                  aria-label={p.activo ? "Desactivar proyecto" : "Activar proyecto"}
                                >
                                  {p.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VISTA MÓVIL: Tarjetas Legibles y Cómodas (Requisito 5) */}
            <div className="md:hidden space-y-3.5">
              {proyectos.map((p) => (
                <div 
                  key={p.id}
                  className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white shadow-xs p-4 sm:p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-lila-light/50 flex items-center justify-center text-lila-main shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-text-dark truncate">{p.nombre}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{p.descripcion || 'Sin descripción'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      p.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Metadatos en Móvil */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                      <UserIcon className="w-3 h-3 text-gray-400" />
                      <span className="font-medium truncate max-w-[150px]">{p.anfitrionNombre}</span>
                    </span>
                    {p.fechaCreacion && (
                      <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{new Date(p.fechaCreacion).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>

                  {/* Acciones Táctiles Cómodas */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100/60">
                    <button
                      type="button"
                      onClick={() => navigate(`/proyectos/${p.id}`)}
                      className="flex-1 py-2.5 px-3 bg-gradient-to-r from-lila-main to-pink-main text-white font-bold text-xs sm:text-sm rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <span>Abrir proyecto</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {canEdit(p) && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-2.5 bg-gray-50 hover:bg-lila-light/40 text-gray-600 hover:text-lila-main rounded-xl border border-gray-200/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Editar proyecto"
                          aria-label="Editar proyecto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(p)}
                          className={`p-2.5 rounded-xl border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                            p.activo 
                              ? 'bg-red-50 text-red-600 border-red-100' 
                              : 'bg-green-50 text-green-600 border-green-100'
                          }`}
                          title={p.activo ? "Desactivar proyecto" : "Activar proyecto"}
                          aria-label={p.activo ? "Desactivar proyecto" : "Activar proyecto"}
                        >
                          {p.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
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
                <Folder className="w-5 h-5 text-lila-main shrink-0" />
                <span>{isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}</span>
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

            <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 ml-1">
                  Nombre del proyecto *
                </label>
                <input 
                  type="text" 
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-main/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base"
                  placeholder="Ej. Sistema de Inventario"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 ml-1">
                  Descripción
                </label>
                <textarea 
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-main/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark resize-none text-sm sm:text-base"
                  placeholder="Opcional: propósito o alcance"
                />
              </div>
              
              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
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

      {/* Modal Desactivar/Activar */}
      {showStatusModal && proyectoToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
            onClick={() => setShowStatusModal(false)}
            aria-hidden="true"
          ></div>
          
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-sm relative z-10 p-6 sm:p-8 text-center border border-white my-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner ${
              proyectoToToggle.activo ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
            }`}>
              {proyectoToToggle.activo ? <Square className="w-7 h-7 sm:w-8 sm:h-8" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8" />}
            </div>
            
            <h3 className="text-lg sm:text-xl font-bold text-text-dark mb-2">
              {proyectoToToggle.activo ? 'Desactivar proyecto' : 'Activar proyecto'}
            </h3>
            <p className="text-gray-500 font-medium mb-6 leading-relaxed text-xs sm:text-sm">
              ¿Deseas {proyectoToToggle.activo ? 'desactivar' : 'activar'} este proyecto? {proyectoToToggle.activo ? 'Podrás volver a activarlo más adelante.' : ''}
            </p>
            
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button 
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-full sm:flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all min-h-[44px]"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleToggleStatus}
                className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all text-white min-h-[44px] ${
                  proyectoToToggle.activo ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {proyectoToToggle.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {message && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-white text-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium text-xs sm:text-sm">
          <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-white text-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium text-xs sm:text-sm">
          <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <span>{error}</span>
        </div>
      )}
    </Layout>
  );
}
