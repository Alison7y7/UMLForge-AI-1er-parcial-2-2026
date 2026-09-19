import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { ArrowLeft, ArrowRight, Plus, FileJson, LayoutTemplate, Edit2, Play, Square, CheckCircle2, XCircle } from 'lucide-react';
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
}

export default function ProjectDiagrams() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [diagramas, setDiagramas] = useState<Diagrama[]>([]);
  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // State
  const [nombreDiagrama, setNombreDiagrama] = useState('');
  const [diagramaSeleccionado, setDiagramaSeleccionado] = useState<Diagrama | null>(null);

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

  const fetchData = async () => {
    try {
      const projRes = await api.get(`/proyectos/${id}`);
      setProyecto(projRes.data);

      const diagRes = await api.get(`/proyectos/${id}/diagramas`);
      setDiagramas(diagRes.data);
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

  const canEdit = () => {
    if (!user || !proyecto) return false;
    if (user.id === proyecto.anfitrionId) return true;
    if (user.permisos?.includes('GESTIONAR_PROYECTOS')) return true;
    if (user.rol === 'ADMIN') return true;
    return false;
  };

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
            <h1 className="text-xl font-bold text-text-dark tracking-tight">{proyecto?.nombre || 'Cargando proyecto...'}</h1>
            <p className="text-sm font-medium text-gray-500">{proyecto?.descripcion || 'Gestión de diagramas'}</p>
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
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 px-5 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20">Guardar</button>
              </div>
            </form>
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
