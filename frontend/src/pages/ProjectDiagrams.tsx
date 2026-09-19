import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { ArrowLeft, ArrowRight, Plus, FileJson, LayoutTemplate, Edit2, Play, Square, CheckCircle2, XCircle, Search, Users, Mail, Copy, ChevronDown, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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
  const [activeTab, setActiveTab] = useState<'diagramas' | 'participantes'>('diagramas');
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
      } catch (e) {
        console.error("No se pudieron cargar los participantes o invitaciones", e);
      }
    } catch (err) {
      console.error(err);
      alert('Error cargando el proyecto o no tienes permiso.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const canEditHelper = (proj: ProyectoInfo) => {
    if (!user || !proj) return false;
    if (user.id === proj.anfitrionId) return true;
    if (user.permisos?.includes('GESTIONAR_PROYECTOS')) return true;
    if (user.rol === 'ADMIN' || user.rol === 'ROLE_ADMIN') return true;
    return false;
  };

  const canEdit = () => canEditHelper(proyecto!);

  const handleCrearOEditarDiagrama = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDiagrama.trim()) {
      showError('El nombre es obligatorio');
      return;
    }

    try {
      if (isEditing && diagramaSeleccionado) {
        await api.patch(`/diagramas/${diagramaSeleccionado.id}/nombre`, { nombre: nombreDiagrama });
        showMessage('Nombre del diagrama actualizado correctamente');
        setShowModal(false);
        fetchData();
      } else {
        const nuevoModelo = { clases: [], relaciones: [] };
        await api.post(`/proyectos/${id}/diagramas`, {
          nombre: nombreDiagrama,
          modeloJson: JSON.stringify(nuevoModelo)
        });
        setShowModal(false);
        showMessage('Diagrama creado correctamente');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      showError('Error al guardar el diagrama');
    }
  };

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

  const handleToggleStatus = async () => {
    if (!diagramaSeleccionado) return;
    try {
      await api.patch(`/diagramas/${diagramaSeleccionado.id}/estado?activo=${!diagramaSeleccionado.activo}`);
      showMessage(`Diagrama ${!diagramaSeleccionado.activo ? 'activado' : 'desactivado'} correctamente`);
      setShowStatusModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showError('Error al cambiar el estado del diagrama.');
    }
  };

  const handleAddParticipante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correoParticipante.trim()) return;
    if (correoParticipante === user?.correo) {
      showError('No puedes invitarte a ti mismo');
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
        showError('sin permisos');
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
    navigator.clipboard.writeText(`http://localhost:5173/invitaciones/${token}`);
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
    <div className="min-h-screen bg-bg-main relative overflow-hidden font-sans flex flex-col">
      {/* Background Decorativo Global */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-lila-light rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-pink-light rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none"></div>
      
      {/* Navbar */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-lila-light/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/proyectos')} className="p-2 text-gray-500 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-dark tracking-tight">
              {loading ? 'Cargando proyecto...' : (proyecto?.nombre || '')}
            </h1>
            <p className="text-sm font-medium text-gray-500">
              {loading ? 'Cargando...' : (proyecto?.descripcion || 'Gestión de diagramas')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner">
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-6 py-10">
        
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-8">
          <button 
            onClick={() => setActiveTab('diagramas')}
            className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'diagramas' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Diagramas UML
          </button>
          <button 
            onClick={() => setActiveTab('participantes')}
            className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'participantes' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Equipo del proyecto
          </button>
        </div>

        {activeTab === 'diagramas' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl font-bold text-text-dark tracking-tight">Diagramas UML</h2>
              {canEdit() && (
                <button 
                  onClick={openCreateModal}
                  className="group relative flex justify-center items-center gap-2 px-6 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 transition-all shadow-md shadow-pink-main/20 w-full sm:w-auto"
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
            ) : diagramas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-lila-light">
                <div className="w-20 h-20 bg-pink-light/50 rounded-[2rem] flex items-center justify-center mb-6 text-pink-main rotate-3">
                  <LayoutTemplate className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-text-dark">Aún no hay diagramas</h3>
                <p className="text-gray-500 mt-2 mb-8 text-center max-w-sm font-medium">
                  Crea tu primer diagrama en este proyecto para comenzar a organizar tus clases UML.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                {diagramas.map((d) => (
                  <div 
                    key={d.id} 
                    className="group relative bg-white/80 backdrop-blur-md rounded-[2rem] border border-white hover:border-lila-light/50 shadow-sm hover:shadow-xl hover:shadow-lila-main/10 transition-all duration-300 flex flex-col overflow-visible cursor-pointer" 
                    onClick={() => navigate(`/diagramas/${d.id}`)}
                  >
                    <div className="p-6 flex-grow flex items-start gap-4">
                      <div className="w-12 h-12 bg-lila-light/50 text-lila-main rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <FileJson className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-text-dark line-clamp-2 leading-tight pr-4">{d.nombre}</h3>
                        <p className="text-xs font-medium text-gray-400 mt-2">
                          Editado: {new Date(d.fechaActualizacion).toLocaleDateString()}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${d.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {d.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="flex flex-col items-end justify-between ml-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => navigate(`/diagramas/${d.id}`)}
                          className="p-2 text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors"
                          title="Abrir diagrama"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        {canEdit() && (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => openEditModal(d, e)}
                              className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-colors"
                              title="Renombrar diagrama"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => openStatusModal(d, e)}
                              className={`p-2 rounded-xl transition-colors ${d.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                              title={d.activo ? "Desactivar" : "Activar"}
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
            <h2 className="text-2xl font-bold text-text-dark tracking-tight mb-2">Equipo del proyecto</h2>
            <p className="text-gray-500 font-medium mb-8">Gestiona las personas que pueden colaborar en este proyecto.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 p-5 rounded-[2rem] border border-white shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Miembros activos</span>
                <span className="text-3xl font-bold text-lila-main">{participantes.length}</span>
              </div>
              <div className="bg-white/80 p-5 rounded-[2rem] border border-white shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invitaciones pendientes</span>
                <span className="text-3xl font-bold text-yellow-500">{invitaciones.length}</span>
              </div>
              <div className="bg-white/80 p-5 rounded-[2rem] border border-white shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Anfitrión del proyecto</span>
                <span className="text-xl font-bold text-pink-main truncate">{proyecto?.anfitrionNombre || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/80 backdrop-blur-sm border border-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 shadow-sm"
                />
              </div>
              {canEdit() && (
                <button 
                  onClick={() => {
                    setCorreoParticipante('');
                    setUsuarioVerificado(null);
                    setVerificacionError('');
                    setInvitationStep(1);
                    setShowInvitacionModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-pink-main/20 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  Invitar persona
                </button>
              )}
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-text-dark mb-4 px-2 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-lila-main" /> Miembros del proyecto
              </h3>
              <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-white shadow-sm overflow-visible">
                {filteredParticipantes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 font-medium">No se encontraron miembros.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredParticipantes.map((p) => (
                      <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/50 transition-colors gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner shrink-0 text-lg">
                            {p.nombre?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-text-dark truncate">{p.nombre} {p.apellido}</p>
                              {p.id === proyecto?.anfitrionId && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border bg-pink-50 text-pink-600 border-pink-200">ANFITRIÓN</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{p.correo}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 sm:justify-end shrink-0">
                          <div className="hidden md:block text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Perfil</p>
                            <p className="text-sm font-bold text-gray-700">{p.id === proyecto?.anfitrionId ? 'Administrador' : 'Colaborador'}</p>
                          </div>
                          <div className="hidden md:block text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Estado</p>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${p.activo !== false ? 'text-green-500' : 'text-red-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${p.activo !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {p.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </div>
                          
                          {canEdit() && p.id !== user?.id && p.id !== proyecto?.anfitrionId ? (
                            <div className="relative">
                              <button 
                                onClick={() => setActiveDropdown(activeDropdown === p.id ? null : p.id)}
                                onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                                className="flex items-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-colors border border-gray-200"
                              >
                                Administrar <ChevronDown className="w-4 h-4" />
                              </button>
                              {activeDropdown === p.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95">
                                  <button 
                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Ver acceso
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveParticipante(p.id)}
                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    Quitar del proyecto
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-[124px]"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {canEdit() && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-text-dark mb-4 px-2 tracking-tight flex items-center gap-2">
                  <Mail className="w-5 h-5 text-yellow-500" /> Invitaciones pendientes
                </h3>
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-white shadow-sm overflow-hidden">
                  {filteredInvitaciones.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-medium">No hay invitaciones pendientes.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredInvitaciones.map((inv) => (
                        <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/50 transition-colors gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-text-dark truncate">{inv.emailInvitado}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border bg-yellow-50 text-yellow-600 border-yellow-200">PENDIENTE</span>
                                {inv.fechaCreacion && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                                    <Clock className="w-3 h-3" /> {new Date(inv.fechaCreacion).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => handleCopyToken(inv.token)}
                              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" /> Copiar enlace
                            </button>
                            <button 
                              onClick={() => handleCancelInvitacion(inv.id)}
                              className="px-4 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                            >
                              Cancelar invitación
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
      </main>

      {/* Modal Nuevo/Editar Diagrama */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-md relative z-10 overflow-hidden transform transition-all border border-white">
            <div className="px-8 py-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-text-dark flex items-center gap-3">
                <LayoutTemplate className="w-6 h-6 text-lila-main" /> {isEditing ? 'Renombrar diagrama' : 'Nuevo diagrama'}
              </h3>
            </div>
            <form onSubmit={handleCrearOEditarDiagrama} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700 ml-1">Nombre del diagrama *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={nombreDiagrama}
                  onChange={(e) => setNombreDiagrama(e.target.value)}
                  className="w-full px-5 py-3.5 bg-bg-main/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main focus:border-transparent transition-all font-medium text-text-dark placeholder-gray-400"
                  placeholder="Ej. Clases de Inventario"
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

      {/* Modal Invitar Colaborador */}
      {showInvitacionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowInvitacionModal(false)}></div>
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-2xl relative z-10 overflow-hidden transform transition-all border border-white flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold text-text-dark flex items-center gap-3 mb-6">
                <Plus className="w-6 h-6 text-lila-main" /> Invitar colaborador
              </h3>
              
              <div className="flex items-center justify-center w-full max-w-sm mx-auto">
                <div className="flex items-center text-xs font-bold uppercase tracking-wider">
                  <span className={`${invitationStep >= 1 ? 'text-lila-main' : 'text-gray-400'} flex items-center gap-2`}>
                    <span className="text-lg leading-none">{invitationStep >= 1 ? '●' : '○'}</span> Usuario
                  </span>
                  <div className={`w-8 sm:w-16 h-px mx-2 sm:mx-4 ${invitationStep >= 2 ? 'bg-lila-main' : 'bg-gray-200'}`}></div>
                  <span className={`${invitationStep >= 2 ? 'text-lila-main' : 'text-gray-400'} flex items-center gap-2`}>
                    <span className="text-lg leading-none">{invitationStep >= 2 ? '●' : '○'}</span> Acceso
                  </span>
                  <div className={`w-8 sm:w-16 h-px mx-2 sm:mx-4 ${invitationStep >= 3 ? 'bg-lila-main' : 'bg-gray-200'}`}></div>
                  <span className={`${invitationStep >= 3 ? 'text-lila-main' : 'text-gray-400'} flex items-center gap-2`}>
                    <span className="text-lg leading-none">{invitationStep >= 3 ? '●' : '○'}</span> Confirmación
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {invitationStep === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-1 mb-8">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Correo electrónico</label>
                    <div className="flex gap-3">
                      <input 
                        type="email" 
                        value={correoParticipante}
                        onChange={(e) => setCorreoParticipante(e.target.value)}
                        className="flex-1 px-5 py-3.5 bg-bg-main/50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400"
                        placeholder="correo@gmail.com"
                      />
                      <button 
                        type="button"
                        onClick={verificarUsuario}
                        className="px-6 py-3 bg-lila-light/50 text-lila-main font-bold rounded-2xl hover:bg-lila-light transition-colors text-sm shrink-0"
                      >
                        Buscar usuario
                      </button>
                    </div>
                    {verificacionError && <p className="text-sm font-bold text-red-500 mt-2 ml-1">{verificacionError}</p>}
                  </div>

                  {usuarioVerificado && (
                    <div className="p-5 bg-green-50/30 border border-green-100 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-200 to-green-100 flex items-center justify-center text-green-700 font-bold border border-white shadow-inner shrink-0 text-lg">
                        {usuarioVerificado.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="flex items-center gap-1 text-xs font-bold text-green-600 uppercase tracking-wider mb-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Usuario encontrado
                        </p>
                        <p className="font-bold text-text-dark text-base">{usuarioVerificado.nombre} {usuarioVerificado.apellido}</p>
                        <p className="text-sm text-gray-500 mb-1">{usuarioVerificado.correo}</p>
                        <p className="text-xs text-gray-600 font-medium">Rol actual: <span className="font-bold">{usuarioVerificado.rol || 'COLABORADOR'}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {invitationStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 space-y-8">
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 ml-1 uppercase tracking-tight">Perfil de acceso</label>
                    <div className="flex items-center gap-3 px-4 py-3 border border-lila-main/30 bg-lila-50/30 rounded-xl cursor-not-allowed">
                      <input type="radio" checked readOnly className="text-lila-main focus:ring-lila-main pointer-events-none" />
                      <span className="font-bold text-sm text-text-dark">Colaborador</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="ml-1">
                      <label className="block text-sm font-bold text-gray-700 uppercase tracking-tight">Permisos del proyecto</label>
                      <p className="text-xs text-gray-500 mt-0.5">Estas capacidades corresponden únicamente a su participación en este proyecto.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-gray-100 rounded-2xl bg-gray-50/30">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-lila-main shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-text-dark">Ver diagramas</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-lila-main shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-text-dark">Editar diagramas</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-lila-main shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-text-dark">Utilizar Inteligencia Artificial</span>
                      </div>
                      <div className="flex items-start gap-3 opacity-50">
                        <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5"><span className="w-4 h-4 rounded-full border-2 border-gray-300"></span></span>
                        <span className="text-sm font-medium text-gray-500">Importar/Exportar XMI</span>
                      </div>
                      <div className="flex items-start gap-3 opacity-50">
                        <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5"><span className="w-4 h-4 rounded-full border-2 border-gray-300"></span></span>
                        <span className="text-sm font-medium text-gray-500">Generar backend</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {invitationStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Usuario</p>
                        <p className="text-sm font-bold text-text-dark">{usuarioVerificado?.nombre} {usuarioVerificado?.apellido}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Correo</p>
                        <p className="text-sm font-bold text-gray-700">{usuarioVerificado?.correo}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Proyecto</p>
                        <p className="text-sm font-bold text-lila-main">{proyecto?.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Perfil</p>
                        <p className="text-sm font-bold text-gray-700">Colaborador</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-100">
                    <Mail className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">La invitación quedará pendiente hasta que el usuario la acepte.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0 flex gap-4">
              {invitationStep === 1 ? (
                <button 
                  type="button" 
                  onClick={() => setShowInvitacionModal(false)}
                  className="flex-1 px-5 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Cancelar
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setInvitationStep(prev => prev - 1)}
                  className="flex-1 px-5 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </button>
              )}
              
              {invitationStep < 3 ? (
                <button 
                  onClick={() => setInvitationStep(prev => prev + 1)}
                  disabled={!usuarioVerificado}
                  className="flex-1 px-5 py-3.5 bg-lila-main text-white rounded-2xl text-sm font-bold hover:bg-lila-dark transition-all shadow-md shadow-lila-main/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleAddParticipante}
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Enviar invitación
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Desactivar/Activar Diagrama */}
      {showStatusModal && diagramaSeleccionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}></div>
          
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-sm relative z-10 p-8 text-center border border-white">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${diagramaSeleccionado.activo ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {diagramaSeleccionado.activo ? <Square className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </div>
            
            <h3 className="text-xl font-bold text-text-dark mb-2">
              {diagramaSeleccionado.activo ? 'Desactivar diagrama' : 'Activar diagrama'}
            </h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed text-sm">
              ¿Deseas {diagramaSeleccionado.activo ? 'desactivar' : 'activar'} este diagrama?
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
                className={`flex-1 px-5 py-3 rounded-xl text-sm transition-all text-white font-semibold ${diagramaSeleccionado.activo ? 'bg-red-500 hover:bg-red-600 border-red-500' : 'bg-green-500 hover:bg-green-600 border-green-500'}`}
              >
                {diagramaSeleccionado.activo ? 'Desactivar' : 'Activar'}
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
