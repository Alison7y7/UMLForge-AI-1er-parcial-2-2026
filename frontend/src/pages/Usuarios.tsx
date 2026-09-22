import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/axios';
import { 
  LogOut, Folder, Plus, Edit2, Play, Square, 
  LayoutDashboard, Users, Shield, Clock, Menu, X, CheckCircle2, XCircle, Eye, Trash2
} from 'lucide-react';
import Logo from '../components/Logo';

interface Rol {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  activo: boolean;
  fechaCreacion?: string;
}

export default function Usuarios() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rolId, setRolId] = useState<number | ''>('');
  const [activo, setActivo] = useState(true);

  // Error and messages
  const [error, setError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [message, setMessage] = useState('');

  const fetchUsuarios = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsuarios(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const showErrorToast = (msg: string) => {
    setGlobalError(msg);
    setTimeout(() => setGlobalError(''), 3000);
  };

  const openModalCrear = () => {
    setIsEditing(false);
    setCurrentUserId(null);
    setNombre('');
    setApellido('');
    setCorreo('');
    setPassword('');
    setRolId('');
    setActivo(true);
    setError('');
    setShowModal(true);
  };

  const openModalEditar = (u: Usuario) => {
    setIsEditing(true);
    setCurrentUserId(u.id);
    setNombre(u.nombre);
    setApellido(u.apellido);
    setCorreo(u.correo);
    setPassword(''); // No mostrar contraseña
    
    const userRole = roles.find(r => r.nombre === u.rol);
    setRolId(userRole ? userRole.id : '');
    
    setActivo(u.activo);
    setError('');
    setShowModal(true);
  };

  const openModalVer = (u: Usuario) => {
    setCurrentUser(u);
    setShowViewModal(true);
  };

  const confirmToggleStatus = (u: Usuario) => {
    if (u.activo) {
      setCurrentUser(u);
      setShowConfirmModal(true);
    } else {
      // Activar directamente
      handleToggleStatus(u.id, false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.patch(`/usuarios/${id}/estado?activo=${!currentStatus}`);
      fetchUsuarios();
      setShowConfirmModal(false);
      showMessage(!currentStatus ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente');
    } catch (err: any) {
      console.error(err);
      setShowConfirmModal(false);
      const msg = err.response?.data?.message || err.response?.data || '';
      const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (msgStr.toLowerCase().includes('propio usuario')) {
        showErrorToast('No puedes desactivar tu propio usuario');
      } else {
        showErrorToast('No se pudo cambiar el estado del usuario');
      }
    }
  };

  const confirmDelete = (u: Usuario) => {
    setCurrentUser(u);
    setShowDeleteModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/usuarios/${id}`);
      fetchUsuarios();
      setShowDeleteModal(false);
      showMessage('Usuario eliminado correctamente');
    } catch (err: any) {
      console.error(err);
      setShowDeleteModal(false);
      const msg = err.response?.data?.message || err.response?.data || '';
      const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (err.response?.status === 409 || msgStr.toLowerCase().includes('asociada')) {
        showErrorToast('No se puede eliminar este usuario porque tiene información asociada');
      } else if (msgStr.toLowerCase().includes('propio usuario')) {
        showErrorToast('No puedes eliminar tu propio usuario');
      } else {
        showErrorToast(msgStr || 'Error al eliminar el usuario');
      }
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim() || !apellido.trim() || !correo.trim() || rolId === '') {
      setError('Completa los campos obligatorios.');
      return;
    }

    if (!isEditing && !password.trim()) {
      setError('Completa los campos obligatorios.');
      return;
    }

    try {
      const payload = {
        nombre,
        apellido,
        correo,
        password: isEditing ? undefined : password,
        rolId: Number(rolId),
        activo
      };

      if (isEditing && currentUserId) {
        await api.put(`/usuarios/${currentUserId}`, payload);
        showMessage('Usuario actualizado correctamente');
      } else {
        await api.post('/usuarios', payload);
        showMessage('Usuario creado correctamente');
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data || '';
      const msgStr = typeof msg === 'string' ? msg.toLowerCase() : JSON.stringify(msg).toLowerCase();
      if (err.response?.status === 409 || msgStr.includes('correo')) {
        setError('Ya existe un usuario con este correo.');
      } else {
        setError('No se pudo guardar la información.');
      }
    }
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
          <a href="#" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
            <Folder className="w-5 h-5 mr-3 text-gray-400 group-hover:text-pink-main transition-colors" /> Proyectos
          </a>

          {(user?.permisos?.includes('GESTIONAR_USUARIOS') || user?.permisos?.includes('GESTIONAR_ROLES') || user?.permisos?.includes('CONSULTAR_BITACORA')) && (
            <>
              <div className="text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mt-8 mb-3 px-4">Administración</div>
              {user?.permisos?.includes('GESTIONAR_USUARIOS') && (
                <Link to="/usuarios" className="flex items-center px-4 py-3 bg-lila-light/50 text-lila-main rounded-2xl font-semibold transition-all">
                  <Users className="w-5 h-5 mr-3" /> Usuarios
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
                <p className="text-[11px] font-medium text-lila-main uppercase tracking-wider">Administrador</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Toast de mensajes - Contenedor estable */}
          <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            {message && (
              <div className="bg-white border border-gray-100 text-gray-900 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up pointer-events-auto">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold">{message}</span>
              </div>
            )}

            {globalError && (
              <div className="bg-white border border-red-100 text-gray-900 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up pointer-events-auto">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-semibold">{globalError}</span>
              </div>
            )}
          </div>

          {/* Bloque de Título */}
          <div className="bg-white/70 backdrop-blur-lg border border-white rounded-[2rem] p-8 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-text-dark mb-2 tracking-tight">Gestión de usuarios</h1>
              <p className="text-gray-500 font-medium">
                Administra las cuentas registradas en IA de UMLForge.
              </p>
            </div>
            <button 
              onClick={openModalCrear}
              className="group relative flex justify-center items-center gap-2 px-6 py-3.5 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex-shrink-0"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Nuevo usuario</span>
            </button>
          </div>

          {/* Tabla de Usuarios */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main"></div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-white overflow-hidden pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre completo</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Correo</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rol</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {usuarios.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-text-dark">{u.nombre} {u.apellido}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm font-medium">{u.correo}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-max ${u.activo ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {u.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openModalVer(u)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openModalEditar(u)}
                              className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => confirmToggleStatus(u)}
                              title={u.activo ? "Desactivar" : "Activar"}
                              className={`p-2 rounded-xl transition-all ${u.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                            >
                              {u.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => confirmDelete(u)}
                              title="Eliminar"
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Contenedor estable para Modales */}
      <div id="modals-container">
        {/* Modal Crear/Editar */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
            
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-lg relative z-10 overflow-hidden transform transition-all border border-white my-8">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-text-dark flex items-center gap-3">
                  {isEditing ? (
                    <><Edit2 className="w-6 h-6 text-pink-main" /> Editar usuario</>
                  ) : (
                    <><Users className="w-6 h-6 text-lila-main" /> Nuevo usuario</>
                  )}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitModal} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Nombre</label>
                    <input 
                      type="text" 
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-sm"
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Apellido</label>
                    <input 
                      type="text" 
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-sm"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Correo electrónico</label>
                  <input 
                    type="email" 
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-sm"
                    placeholder="ejemplo@correo.com"
                  />
                </div>

                {!isEditing && (
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Contraseña</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700 ml-1">Rol</label>
                    <select 
                      value={rolId}
                      onChange={(e) => setRolId(Number(e.target.value))}
                      className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm appearance-none"
                    >
                      <option value="" disabled>Selecciona un rol</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                  
                  {isEditing && (
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-gray-700 ml-1">Estado</label>
                      <div className="flex items-center h-[46px] px-2">
                        <label className="flex items-center cursor-pointer relative">
                          <input type="checkbox" className="sr-only peer" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">{activo ? 'Activo' : 'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium text-center">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-4 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-5 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 group"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ver Usuario */}
        {showViewModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowViewModal(false)}></div>
            
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-sm relative z-10 overflow-hidden transform transition-all border border-white p-8">
              <div className="flex justify-end mb-2">
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100/50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border-4 border-white shadow-lg text-4xl mb-5">
                  {currentUser.nombre.charAt(0).toUpperCase()}
                </div>
                
                <h3 className="text-2xl font-bold text-text-dark tracking-tight">{currentUser.nombre} {currentUser.apellido}</h3>
                <p className="text-gray-500 font-medium text-sm mb-6">{currentUser.correo}</p>
                
                <div className="flex flex-wrap justify-center gap-3 mb-8 w-full">
                  <span className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                    {currentUser.rol}
                  </span>
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border shadow-sm ${currentUser.activo ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {currentUser.activo ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {currentUser.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {currentUser.fechaCreacion && (
                  <div className="w-full bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100 text-left">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha de registro</p>
                    <p className="text-sm font-medium text-gray-700">{new Date(currentUser.fechaCreacion).toLocaleDateString()} a las {new Date(currentUser.fechaCreacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                )}

                <button 
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-5 py-3.5 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all border border-transparent"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirmar Desactivación */}
        {showConfirmModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowConfirmModal(false)}></div>
            
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-red-500/10 w-full max-w-sm relative z-10 overflow-hidden transform transition-all border border-white p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                <XCircle className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-text-dark mb-2">Desactivar usuario</h3>
              <p className="text-gray-500 font-medium mb-8">
                ¿Deseas desactivar este usuario? No podrá iniciar sesión.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all border border-transparent"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleToggleStatus(currentUser.id, true)}
                  className="flex-1 px-5 py-3 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition-all shadow-md shadow-pink-500/30"
                >
                  Desactivar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirmar Eliminación */}
        {showDeleteModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-red-500/20 w-full max-w-sm relative z-10 overflow-hidden transform transition-all border border-white p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-text-dark mb-2">Eliminar usuario</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                ¿Deseas eliminar este usuario? Esta acción no se puede deshacer.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all border border-transparent"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(currentUser.id)}
                  className="flex-1 px-5 py-3 rounded-xl text-sm transition-all bg-red-500 text-white font-semibold hover:bg-red-600 border border-red-500 opacity-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
