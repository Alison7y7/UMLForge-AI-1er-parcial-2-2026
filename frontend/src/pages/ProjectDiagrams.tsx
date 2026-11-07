import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { 
  ArrowLeft, ArrowRight, Plus, FileJson, LayoutTemplate, 
  Edit2, Play, Square, CheckCircle2, XCircle, Search, 
  Users, Mail, Copy, ChevronDown, Clock, X, MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import BottomNav from '../components/BottomNav';
import { formatRole } from '../utils/roleUtils';
import ProjectChat from '../components/chat/ProjectChat';

interface Diagrama {
  id: number;
  nombre: string;
  fechaActualizacion: string;
  activo: boolean;
}

interface ProyectoInfo {
  id: number;
  nombre: string;
  descripcion: string;
  anfitrionId: number;
  anfitrionNombre?: string;
}

export default function ProjectDiagrams() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [diagramas, setDiagramas] = useState<Diagrama[]>([]);
  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<'diagramas' | 'participantes' | 'chat'>('diagramas');
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [invitaciones, setInvitaciones] = useState<any[]>([]);
  const [correoParticipante, setCorreoParticipante] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // State
  const [nombreDiagrama, setNombreDiagrama] = useState('');
  const [diagramaSeleccionado, setDiagramaSeleccionado] = useState<Diagrama | null>(null);

  // Invitation Modal State
  const [showInvitacionModal, setShowInvitacionModal] = useState(false);
  const [invitationStep, setInvitationStep] = useState(1);
  const [usuarioVerificado, setUsuarioVerificado] = useState<any>(null);
  const [verificacionError, setVerificacionError] = useState('');

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  // Toasts
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  const verificarUsuario = async () => {
    setVerificacionError('');
    setUsuarioVerificado(null);
    if (!correoParticipante.trim()) return;
    try {
      const res = await api.get('/invitaciones/verificar-usuario', {
        params: { correo: correoParticipante }
      });
      setUsuarioVerificado(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setVerificacionError('No existe un usuario registrado con este correo.');
      } else {
        setVerificacionError(err.response?.data?.message || 'Error al verificar el usuario.');
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const projRes = await api.get(`/proyectos/${id}`);
      setProyecto(projRes.data);

      const diagRes = await api.get(`/proyectos/${id}/diagramas`);
      setDiagramas(diagRes.data);

      try {
        const partRes = await api.get(`/proyectos/${id}/participantes`);
        setParticipantes(partRes.data);
        
        // Cargar invitaciones
        if (canEditHelper(projRes.data)) {
          const invRes = await api.get(`/proyectos/${id}/invitaciones`);
          setInvitaciones(invRes.data);
        }
      } catch (err) {
        console.error("Error al cargar participantes:", err);
      }

    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      const message = status === 401
        ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
        : status === 403
          ? 'No tienes acceso a este proyecto o a sus diagramas.'
          : status === 404
            ? 'El proyecto solicitado no existe.'
            : 'No se pudo cargar la información del proyecto.';
      setLoadError(message);
      setDiagramas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const canEditHelper = (proj: ProyectoInfo | null) => {
    if (!user || !proj) return false;
    if (user.id === proj.anfitrionId) return true;
    if (user.rol === 'ADMIN' || user.rol === 'ROLE_ADMIN') return true;
    return false;
  };

  const canEdit = () => canEditHelper(proyecto);

  const openCreateModal = () => {
    setIsEditing(false);
    setDiagramaSeleccionado(null);
    setNombreDiagrama('');
    setShowModal(true);
  };

  const openEditModal = (d: Diagrama, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setDiagramaSeleccionado(d);
    setNombreDiagrama(d.nombre);
    setShowModal(true);
  };

  const openStatusModal = (d: Diagrama, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiagramaSeleccionado(d);
    setShowStatusModal(true);
  };

  const handleCrearOEditarDiagrama = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDiagrama.trim()) return;

    try {
      if (isEditing && diagramaSeleccionado) {
        await api.put(`/diagramas/${diagramaSeleccionado.id}`, { nombre: nombreDiagrama });
        showMessage('Diagrama actualizado correctamente');
      } else {
        await api.post(`/proyectos/${id}/diagramas`, { nombre: nombreDiagrama });
        showMessage('Diagrama creado correctamente');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Error al guardar el diagrama');
    }
  };

  const handleToggleStatus = async () => {
    if (!diagramaSeleccionado) return;
    try {
      await api.patch(`/diagramas/${diagramaSeleccionado.id}/estado?activo=${!diagramaSeleccionado.activo}`);
      showMessage(`Diagrama ${!diagramaSeleccionado.activo ? 'activado' : 'desactivado'} correctamente`);
      setShowStatusModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Error al cambiar el estado del diagrama');
    }
  };

  const handleAddParticipante = async () => {
    if (!correoParticipante.trim()) {
      showError('Ingresa un correo');
      return;
    }
    if (participantes.some(p => p.correo === correoParticipante)) {
      showError('El usuario ya es participante');
      return;
    }

    try {
      await api.post(`/proyectos/${id}/invitaciones`, { emailInvitado: correoParticipante });
      showMessage('Invitación enviada correctamente');
      setCorreoParticipante('');
      setUsuarioVerificado(null);
      setShowInvitacionModal(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('pendiente')) {
        showError('Ya existe una invitación pendiente duplicada');
      } else if (msg.includes('encontrado')) {
        showError('Usuario inexistente');
      } else {
        showError('Error al enviar invitación');
      }
    }
  };

  const handleRemoveParticipante = async (usuarioId: number) => {
    if (!window.confirm("¿Deseas quitar a este participante?")) return;
    try {
      await api.delete(`/proyectos/${id}/participantes/${usuarioId}`);
      showMessage('Participante eliminado');
      fetchData();
    } catch (err: any) {
      if (err.response?.status === 403) {
        showError('Sin permisos para quitar participantes');
      } else {
        showError('Error al eliminar participante');
      }
    }
  };

  const handleCancelInvitacion = async (invId: number) => {
    if (!window.confirm("¿Deseas cancelar esta invitación?")) return;
    try {
      await api.delete(`/proyectos/${id}/invitaciones/${invId}`);
      showMessage('Invitación cancelada');
      fetchData();
    } catch (err: any) {
      showError('Error al cancelar la invitación');
    }
  };

  const handleCopyToken = (token: string) => {
    const url = `${window.location.origin}/invitaciones/${token}`;
    navigator.clipboard.writeText(url);
    showMessage('Enlace copiado al portapapeles');
  };

  const filteredParticipantes = participantes.filter(p => 
    (p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || '') || 
    (p.correo?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  const filteredInvitaciones = invitaciones.filter(inv => 
    inv.emailInvitado?.toLowerCase().includes(searchTerm.toLowerCase()) || ''
  );

  return (
    <div className="min-h-[100dvh] bg-bg-main relative overflow-x-hidden font-sans flex flex-col">
      {/* Background Decorativo Global */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-lila-light rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none"></div>
      
      {/* Navbar Superior Responsivo */}
      <nav 
        className="relative z-20 bg-white/85 backdrop-blur-md border-b border-lila-light/50 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shadow-xs shrink-0"
        style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-2">
          <button
            type="button"
            onClick={() => navigate('/proyectos')} 
            className="p-2 text-gray-500 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Volver a proyectos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-text-dark tracking-tight truncate max-w-[200px] sm:max-w-md">
              {loading ? 'Cargando proyecto...' : (proyecto?.nombre || '')}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate max-w-[220px] sm:max-w-lg">
              {loading ? 'Cargando...' : (proyecto?.descripcion || 'Gestión de diagramas')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
              activeTab === 'chat'
                ? 'bg-lila-main text-white shadow-xs'
                : 'bg-lila-light/40 text-lila-main hover:bg-lila-light/70'
            }`}
            title="Abrir chat del proyecto"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat del proyecto</span>
            <span className="sm:hidden">Chat</span>
          </button>

          <div className="hidden sm:flex flex-col items-end text-right">
            <p className="text-xs font-bold text-text-dark">{user?.nombre} {user?.apellido}</p>
            <p className="text-[10px] font-semibold text-lila-main uppercase tracking-wider">{formatRole(user?.rol)}</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner text-sm">
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main 
        className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-10"
        style={{
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Tabs de Navegación */}
        <div className="flex gap-2 sm:gap-6 border-b border-gray-200 mb-6 sm:mb-8 overflow-x-auto">
          <button 
            type="button"
            onClick={() => setActiveTab('diagramas')}
            className={`pb-3 px-2 sm:px-3 font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap min-h-[44px] flex items-center ${
              activeTab === 'diagramas' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Diagramas UML
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('participantes')}
            className={`pb-3 px-2 sm:px-3 font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap min-h-[44px] flex items-center ${
              activeTab === 'participantes' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Equipo del proyecto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`pb-3 px-2 sm:px-3 font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'chat' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat del proyecto</span>
          </button>
        </div>

        {activeTab === 'diagramas' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-text-dark tracking-tight">
                Diagramas UML
              </h2>
              {canEdit() && (
                <button 
                  type="button"
                  onClick={openCreateModal}
                  className="group relative flex justify-center items-center gap-2 px-5 py-3 border border-transparent text-xs sm:text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 transition-all shadow-md shadow-pink-main/20 w-full sm:w-auto min-h-[48px]"
                >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Nuevo diagrama</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main"></div>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 bg-white/70 backdrop-blur-sm rounded-3xl border border-red-100 px-4 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 text-red-500">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-dark">No se pudieron cargar los diagramas</h3>
                <p className="text-gray-500 mt-2 mb-6 max-w-md text-xs sm:text-sm font-medium">{loadError}</p>
                <button
                  type="button"
                  onClick={fetchData}
                  className="px-5 py-3 bg-lila-main text-white rounded-xl text-sm font-bold hover:opacity-90 min-h-[44px]"
                >
                  Reintentar
                </button>
              </div>
            ) : diagramas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 bg-white/60 backdrop-blur-sm rounded-3xl border border-dashed border-lila-light px-4 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pink-light/50 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-5 text-pink-main rotate-3">
                  <LayoutTemplate className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-dark">Aún no hay diagramas</h3>
                <p className="text-gray-500 mt-2 mb-6 max-w-sm text-xs sm:text-sm font-medium">
                  Crea tu primer diagrama en este proyecto para comenzar a organizar tus clases UML.
                </p>
                {canEdit() && (
                  <button 
                    type="button"
                    onClick={openCreateModal}
                    className="text-lila-main font-bold hover:text-pink-main transition-colors flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
                  >
                    <span>Crear diagrama ahora</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {diagramas.map((d) => (
                  <div 
                    key={d.id} 
                    className="group relative bg-white/85 backdrop-blur-md rounded-3xl border border-white hover:border-lila-light/50 shadow-xs hover:shadow-xl hover:shadow-lila-main/10 transition-all duration-300 flex flex-col overflow-visible cursor-pointer" 
                    onClick={() => navigate(`/diagramas/${d.id}`)}
                  >
                    <div className="p-5 sm:p-6 flex-grow flex items-start gap-3.5">
                      <div className="w-11 h-11 bg-lila-light/50 text-lila-main rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileJson className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-text-dark line-clamp-2 leading-tight pr-2">
                          {d.nombre}
                        </h3>
                        <p className="text-[11px] font-medium text-gray-400 mt-1.5">
                          {d.fechaActualizacion ? new Date(d.fechaActualizacion).toLocaleDateString() : 'Reciente'}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          d.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {d.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="flex flex-col items-end justify-between ml-1 gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          onClick={() => navigate(`/diagramas/${d.id}`)}
                          className="p-2 text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Abrir diagrama"
                          aria-label="Abrir diagrama"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        {canEdit() && (
                          <div className="flex gap-1">
                            <button 
                              type="button"
                              onClick={(e) => openEditModal(d, e)}
                              className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Renombrar diagrama"
                              aria-label="Renombrar diagrama"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => openStatusModal(d, e)}
                              className={`p-2 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                d.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                              }`}
                              title={d.activo ? "Desactivar" : "Activar"}
                              aria-label={d.activo ? "Desactivar diagrama" : "Activar diagrama"}
                            >
                              {d.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'participantes' && (
          <div className="max-w-5xl">
            <h2 className="text-xl sm:text-2xl font-bold text-text-dark tracking-tight mb-1">
              Equipo del proyecto
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm font-medium mb-6">
              Gestiona las personas que pueden colaborar en este proyecto.
            </p>

            {/* Estadísticas de Equipo Adaptadas a Pantallas Pequeñas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white/80 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-white shadow-xs flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Miembros activos</span>
                <span className="text-2xl sm:text-3xl font-bold text-lila-main">{participantes.length}</span>
              </div>
              <div className="bg-white/80 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-white shadow-xs flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invitaciones pendientes</span>
                <span className="text-2xl sm:text-3xl font-bold text-yellow-500">{invitaciones.length}</span>
              </div>
              <div className="bg-white/80 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-white shadow-xs flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Anfitrión del proyecto</span>
                <span className="text-base sm:text-lg font-bold text-pink-main truncate">{proyecto?.anfitrionNombre || 'N/A'}</span>
              </div>
            </div>

            {/* Búsqueda y Botón Invitar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-full sm:flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/85 backdrop-blur-sm border border-white rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 shadow-xs text-sm"
                />
              </div>
              {canEdit() && (
                <button 
                  type="button"
                  onClick={() => {
                    setCorreoParticipante('');
                    setUsuarioVerificado(null);
                    setVerificacionError('');
                    setInvitationStep(1);
                    setShowInvitacionModal(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-lila-main to-pink-main text-white font-bold rounded-xl sm:rounded-2xl hover:opacity-90 transition-all shadow-md shadow-pink-main/20 shrink-0 text-sm min-h-[48px]"
                >
                  <Plus className="w-5 h-5" />
                  <span>Invitar persona</span>
                </button>
              )}
            </div>

            {/* Lista de Miembros */}
            <div className="mb-8">
              <h3 className="text-base sm:text-lg font-bold text-text-dark mb-3 px-1 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-lila-main" /> Miembros del proyecto
              </h3>
              <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-[2rem] border border-white shadow-xs overflow-visible">
                {filteredParticipantes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 font-medium text-sm">No se encontraron miembros.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredParticipantes.map((p) => (
                      <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/50 transition-colors gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner shrink-0 text-base sm:text-lg">
                            {p.nombre?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm sm:text-base text-text-dark truncate">{p.nombre} {p.apellido}</p>
                              {p.id === proyecto?.anfitrionId && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border bg-pink-50 text-pink-600 border-pink-200">ANFITRIÓN</span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{p.correo}</p>
                            
                            {/* Badges Visibles en Celular (Requisito 9) */}
                            <div className="flex md:hidden items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {p.id === proyecto?.anfitrionId ? 'Anfitrión' : 'Colaborador'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                p.activo !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {p.activo !== false ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <div className="hidden md:block text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Perfil</p>
                            <p className="text-sm font-bold text-gray-700">
                              {p.id === proyecto?.anfitrionId ? 'Anfitrión' : 'Colaborador'}
                            </p>
                          </div>
                          <div className="hidden md:block text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Estado</p>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${p.activo !== false ? 'text-green-500' : 'text-red-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${p.activo !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {p.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </div>
                          
                          {canEdit() && p.id !== user?.id && p.id !== proyecto?.anfitrionId ? (
                            <div className="relative ml-auto sm:ml-0">
                              <button 
                                type="button"
                                onClick={() => setActiveDropdown(activeDropdown === p.id ? null : p.id)}
                                onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                                className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs sm:text-sm font-bold transition-colors border border-gray-200 min-h-[40px]"
                              >
                                <span>Administrar</span>
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              {activeDropdown === p.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95">
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveParticipante(p.id)}
                                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Quitar del proyecto
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="hidden sm:block w-[124px]"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Invitaciones Pendientes */}
            {canEdit() && (
              <div className="mb-8">
                <h3 className="text-base sm:text-lg font-bold text-text-dark mb-3 px-1 tracking-tight flex items-center gap-2">
                  <Mail className="w-5 h-5 text-yellow-500" /> Invitaciones pendientes
                </h3>
                <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-[2rem] border border-white shadow-xs overflow-hidden">
                  {filteredInvitaciones.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-medium text-sm">No hay invitaciones pendientes.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredInvitaciones.map((inv) => (
                        <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/50 transition-colors gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm sm:text-base text-text-dark truncate">{inv.emailInvitado}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border bg-yellow-50 text-yellow-600 border-yellow-200">
                                  PENDIENTE
                                </span>
                                {inv.fechaCreacion && (
                                  <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                                    <Clock className="w-3 h-3" /> {new Date(inv.fechaCreacion).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            <button 
                              type="button"
                              onClick={() => handleCopyToken(inv.token)}
                              className="flex-1 sm:flex-none px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-[40px]"
                            >
                              <Copy className="w-3.5 h-3.5" /> 
                              <span>Copiar enlace</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleCancelInvitacion(inv.id)}
                              className="flex-1 sm:flex-none px-3.5 py-2 text-xs sm:text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors min-h-[40px] text-center"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto h-[calc(100dvh-240px)] min-h-[500px]">
            <ProjectChat
              proyectoId={id}
              proyectoNombre={proyecto?.nombre}
              variant="embedded"
            />
          </div>
        )}
      </main>

      {/* Modal Nuevo/Editar Diagrama */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          ></div>
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-md relative z-10 overflow-hidden transform transition-all border border-white my-auto max-h-[90dvh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-text-dark flex items-center gap-2.5">
                <LayoutTemplate className="w-5 h-5 text-lila-main shrink-0" /> 
                <span>{isEditing ? 'Renombrar diagrama' : 'Nuevo diagrama'}</span>
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
            <form onSubmit={handleCrearOEditarDiagrama} className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">
                  Nombre del diagrama *
                </label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={nombreDiagrama}
                  onChange={(e) => setNombreDiagrama(e.target.value)}
                  className="w-full px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-main/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Ej. Clases de Inventario"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-100 rounded-xl sm:rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all min-h-[48px]"
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

      {/* Modal Invitar Colaborador */}
      {showInvitacionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
            onClick={() => setShowInvitacionModal(false)}
            aria-hidden="true"
          ></div>
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-2xl relative z-10 overflow-hidden transform transition-all border border-white flex flex-col my-auto max-h-[90dvh]"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-text-dark flex items-center gap-2">
                  <Plus className="w-5 h-5 text-lila-main" /> 
                  <span>Invitar colaborador</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowInvitacionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center justify-center w-full max-w-sm mx-auto">
                <div className="flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <span className={`${invitationStep >= 1 ? 'text-lila-main' : 'text-gray-400'} flex items-center gap-1.5`}>
                    <span className="text-base leading-none">{invitationStep >= 1 ? '●' : '○'}</span> Usuario
                  </span>
                  <div className={`w-4 sm:w-12 h-px mx-1.5 sm:mx-3 ${invitationStep >= 2 ? 'bg-lila-main' : 'bg-gray-200'}`}></div>
                  <span className={`${invitationStep >= 2 ? 'text-lila-main' : 'text-gray-400'} flex items-center gap-1.5`}>
                    <span className="text-base leading-none">{invitationStep >= 2 ? '●' : '○'}</span> Acceso
                  </span>
                  <div className={`w-4 sm:w-12 h-px mx-1.5 sm:mx-3 ${invitationStep >= 3 ? 'bg-lila-main' : 'bg-gray-200'}`}></div>
                  <span className={`${invitationStep >= 3 ? 'text-lila-main' : 'text-gray-400'} flex items-center gap-1.5`}>
                    <span className="text-base leading-none">{invitationStep >= 3 ? '●' : '○'}</span> Confirmar
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
              {invitationStep === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-1 mb-6 sm:mb-8">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">
                      Correo electrónico
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                      <input 
                        type="email" 
                        value={correoParticipante}
                        onChange={(e) => setCorreoParticipante(e.target.value)}
                        className="flex-1 px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-main/60 border border-gray-200 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-sm sm:text-base"
                        placeholder="correo@ejemplo.com"
                      />
                      <button 
                        type="button" 
                        onClick={verificarUsuario}
                        className="w-full sm:w-auto px-5 py-3 bg-lila-light/60 text-lila-main font-bold rounded-xl sm:rounded-2xl hover:bg-lila-light transition-colors text-xs sm:text-sm shrink-0 min-h-[44px]"
                      >
                        Buscar usuario
                      </button>
                    </div>
                    {verificacionError && (
                      <p className="text-xs sm:text-sm font-bold text-red-500 mt-2 ml-1">
                        {verificacionError}
                      </p>
                    )}
                  </div>

                  {usuarioVerificado && (
                    <div className="p-4 sm:p-5 bg-green-50/40 border border-green-100 rounded-2xl flex items-center gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-green-200 to-green-100 flex items-center justify-center text-green-700 font-bold border border-white shadow-inner shrink-0 text-base sm:text-lg">
                        {usuarioVerificado.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-green-600 uppercase tracking-wider mb-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Usuario encontrado
                        </p>
                        <p className="font-bold text-text-dark text-sm sm:text-base truncate">{usuarioVerificado.nombre} {usuarioVerificado.apellido}</p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{usuarioVerificado.correo}</p>
                        <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                          Rol: <span className="font-bold text-lila-main">{formatRole(usuarioVerificado.rol)}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {invitationStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1 uppercase tracking-tight">Perfil de acceso</label>
                    <div className="flex items-center gap-3 px-4 py-3 border border-lila-main/30 bg-lila-50/40 rounded-xl cursor-default">
                      <input type="radio" checked readOnly className="text-lila-main pointer-events-none" />
                      <span className="font-bold text-xs sm:text-sm text-text-dark">Colaborador del proyecto</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="ml-1">
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-tight">Permisos del proyecto</label>
                      <p className="text-xs text-gray-500 mt-0.5">Capacidades dentro de este proyecto:</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5 border border-gray-100 rounded-2xl bg-gray-50/40">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-lila-main shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm font-bold text-text-dark">Ver diagramas</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-lila-main shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm font-bold text-text-dark">Editar diagramas</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-lila-main shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm font-bold text-text-dark">Utilizar IA</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {invitationStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Usuario</p>
                        <p className="text-xs sm:text-sm font-bold text-text-dark">{usuarioVerificado?.nombre} {usuarioVerificado?.apellido}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Correo</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-700 truncate">{usuarioVerificado?.correo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Proyecto</p>
                        <p className="text-xs sm:text-sm font-bold text-lila-main truncate">{proyecto?.nombre}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Perfil asignado</p>
                        <p className="text-xs sm:text-sm font-bold text-gray-700">Colaborador</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100 text-xs sm:text-sm">
                    <Mail className="w-4 h-4 shrink-0" />
                    <p className="font-medium">La invitación quedará pendiente hasta que el usuario la acepte.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 sm:px-8 py-3.5 sm:py-5 border-t border-gray-100 bg-gray-50/60 shrink-0 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-4">
              {invitationStep === 1 ? (
                <button 
                  type="button" 
                  onClick={() => setShowInvitacionModal(false)}
                  className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setInvitationStep(prev => prev - 1)}
                  className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" /> 
                  <span>Volver</span>
                </button>
              )}
              
              {invitationStep < 3 ? (
                <button 
                  type="button"
                  onClick={() => setInvitationStep(prev => prev + 1)}
                  disabled={!usuarioVerificado}
                  className="w-full sm:flex-1 py-3 px-5 bg-lila-main text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-lila-dark transition-all shadow-md shadow-lila-main/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleAddParticipante}
                  className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Mail className="w-4 h-4" /> 
                  <span>Enviar invitación</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Desactivar/Activar Diagrama */}
      {showStatusModal && diagramaSeleccionado && (
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
              diagramaSeleccionado.activo ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
            }`}>
              {diagramaSeleccionado.activo ? <Square className="w-7 h-7 sm:w-8 sm:h-8" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8" />}
            </div>
            
            <h3 className="text-lg sm:text-xl font-bold text-text-dark mb-2">
              {diagramaSeleccionado.activo ? 'Desactivar diagrama' : 'Activar diagrama'}
            </h3>
            <p className="text-gray-500 font-medium mb-6 leading-relaxed text-xs sm:text-sm">
              ¿Deseas {diagramaSeleccionado.activo ? 'desactivar' : 'activar'} este diagrama?
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
                  diagramaSeleccionado.activo ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {diagramaSeleccionado.activo ? 'Desactivar' : 'Activar'}
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

      {/* Navegación Inferior para Móviles */}
      <BottomNav />
    </div>
  );
}
