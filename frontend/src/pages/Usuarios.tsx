import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { 
  Plus, Edit2, Play, Square, 
  Users, CheckCircle2, XCircle, Eye, Trash2, X
} from 'lucide-react';
import Layout from '../components/Layout';
import { formatRole } from '../utils/roleUtils';

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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);

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
        showErrorToast('No puedes desactivar tu propia cuenta');
      } else {
        showErrorToast('Error al cambiar el estado del usuario');
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
      if (msgStr.toLowerCase().includes('propio usuario')) {
        showErrorToast('No puedes eliminar tu propia cuenta');
      } else {
        showErrorToast('Error al eliminar usuario');
      }
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim() || !apellido.trim() || !correo.trim() || rolId === '') {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (!isEditing && !password.trim()) {
      setError('La contraseña es obligatoria.');
      return;
    }

    try {
      if (isEditing && currentUserId) {
        await api.put(`/usuarios/${currentUserId}`, {
          nombre,
          apellido,
          correo,
          rolId: Number(rolId),
          activo
        });
        showMessage('Usuario actualizado correctamente');
      } else {
        await api.post('/usuarios', {
          nombre,
          apellido,
          correo,
          password,
          rolId: Number(rolId),
          activo: true
        });
        showMessage('Usuario creado correctamente');
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.response?.data || 'Error al guardar los cambios');
    }
  };

  return (
    <Layout>
      <div className="w-full">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark tracking-tight mb-2">
              Gestión de usuarios
            </h1>
            <p className="text-gray-500 font-medium text-xs sm:text-sm lg:text-base">
              Administra las cuentas y roles registrados en IA de UMLForge.
            </p>
          </div>
          <button 
            type="button"
            onClick={openModalCrear}
            className="group relative flex justify-center items-center gap-2 px-5 py-3.5 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-lila-main to-pink-main hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex-shrink-0 w-full sm:w-auto min-h-[48px]"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Nuevo usuario</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lila-main"></div>
          </div>
        ) : (
          <>
            {/* VISTA ESCRITORIO / TABLET: Tabla Completa */}
            <div className="hidden md:block bg-white/85 backdrop-blur-md rounded-[2rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-white overflow-hidden pb-4">
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
                            {formatRole(u.rol)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-max ${
                            u.activo ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {u.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{u.activo ? 'Activo' : 'Inactivo'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              type="button"
                              onClick={() => openModalVer(u)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Ver detalles"
                              aria-label="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => openModalEditar(u)}
                              className="p-2 text-gray-400 hover:text-lila-main hover:bg-lila-light/50 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                              title="Editar usuario"
                              aria-label="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => confirmToggleStatus(u)}
                              title={u.activo ? "Desactivar usuario" : "Activar usuario"}
                              aria-label={u.activo ? "Desactivar usuario" : "Activar usuario"}
                              className={`p-2 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                u.activo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                              }`}
                            >
                              {u.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => confirmDelete(u)}
                              title="Eliminar usuario"
                              aria-label="Eliminar usuario"
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
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

            {/* VISTA MÓVIL: Tarjetas de Usuarios Legibles (Requisito 5) */}
            <div className="md:hidden space-y-3.5">
              {usuarios.map(u => (
                <div 
                  key={u.id}
                  className="bg-white/90 backdrop-blur-md rounded-2xl border border-white shadow-xs p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner shrink-0 text-base">
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-text-dark truncate">
                          {u.nombre} {u.apellido}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{u.correo}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      u.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Fila de Rol */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-xs">
                    <span className="font-medium text-gray-400">Rol:</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600">
                      {formatRole(u.rol)}
                    </span>
                  </div>

                  {/* Acciones Táctiles Cómodas */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100/60">
                    <button
                      type="button"
                      onClick={() => openModalVer(u)}
                      className="p-2.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl border border-gray-200/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Ver detalles"
                      aria-label="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openModalEditar(u)}
                      className="p-2.5 bg-gray-50 hover:bg-lila-light/40 text-gray-600 hover:text-lila-main rounded-xl border border-gray-200/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Editar usuario"
                      aria-label="Editar usuario"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmToggleStatus(u)}
                      className={`p-2.5 rounded-xl border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        u.activo ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                      }`}
                      title={u.activo ? "Desactivar" : "Activar"}
                      aria-label={u.activo ? "Desactivar" : "Activar"}
                    >
                      {u.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(u)}
                      className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl border border-gray-200/60 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Eliminar usuario"
                      aria-label="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contenedor de Modales */}
      <div id="modals-container">
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
                  {isEditing ? (
                    <><Edit2 className="w-5 h-5 text-pink-main shrink-0" /> <span>Editar usuario</span></>
                  ) : (
                    <><Users className="w-5 h-5 text-lila-main shrink-0" /> <span>Nuevo usuario</span></>
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

              <form onSubmit={handleSubmitModal} className="p-5 sm:p-8 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Nombre</label>
                    <input 
                      type="text" 
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base"
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Apellido</label>
                    <input 
                      type="text" 
                      required
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Correo electrónico</label>
                  <input 
                    type="email" 
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base"
                    placeholder="ejemplo@correo.com"
                  />
                </div>

                {!isEditing && (
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Contraseña</label>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Rol</label>
                    <select 
                      value={rolId}
                      onChange={(e) => setRolId(Number(e.target.value))}
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base cursor-pointer"
                    >
                      <option value="" disabled>Selecciona un rol</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{formatRole(r.nombre)}</option>
                      ))}
                    </select>
                  </div>
                  
                  {isEditing && (
                    <div className="space-y-1">
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Estado</label>
                      <div className="flex items-center h-[46px] px-2">
                        <label className="flex items-center cursor-pointer relative">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={activo} 
                            onChange={(e) => setActivo(e.target.checked)} 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700">{activo ? 'Activo' : 'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs sm:text-sm font-medium text-center">
                    {error}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-100 rounded-xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 group min-h-[44px]"
                  >
                    <span>Guardar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ver Usuario */}
        {showViewModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div 
              className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
              onClick={() => setShowViewModal(false)}
              aria-hidden="true"
            ></div>
            
            <div 
              className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-sm relative z-10 overflow-hidden transform transition-all border border-white p-6 sm:p-8 my-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex justify-end mb-1">
                <button 
                  type="button"
                  onClick={() => setShowViewModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Cerrar detalles"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border-4 border-white shadow-lg text-3xl sm:text-4xl mb-4 sm:mb-5">
                  {currentUser.nombre.charAt(0).toUpperCase()}
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold text-text-dark tracking-tight">
                  {currentUser.nombre} {currentUser.apellido}
                </h3>
                <p className="text-gray-500 font-medium text-xs sm:text-sm mb-5 truncate max-w-full">
                  {currentUser.correo}
                </p>
                
                <div className="flex flex-wrap justify-center gap-2 mb-6 w-full">
                  <span className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    {formatRole(currentUser.rol)}
                  </span>
                  <span className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border ${
                    currentUser.activo ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                  }`}>
                    {currentUser.activo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{currentUser.activo ? 'Activo' : 'Inactivo'}</span>
                  </span>
                </div>

                {currentUser.fechaCreacion && (
                  <div className="w-full bg-gray-50 rounded-2xl p-3.5 mb-6 border border-gray-100 text-left text-xs sm:text-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Fecha de registro</p>
                    <p className="font-medium text-gray-700">
                      {new Date(currentUser.fechaCreacion).toLocaleDateString()} a las {new Date(currentUser.fechaCreacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                )}

                <button 
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-5 py-3 bg-gray-100 text-gray-700 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-gray-200 transition-all min-h-[44px]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirmar Desactivación */}
        {showConfirmModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
              onClick={() => setShowConfirmModal(false)}
              aria-hidden="true"
            ></div>
            
            <div 
              className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-red-500/10 w-full max-w-sm relative z-10 overflow-hidden transform transition-all border border-white p-6 sm:p-8 text-center my-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              
              <h3 className="text-lg sm:text-xl font-bold text-text-dark mb-2">Desactivar usuario</h3>
              <p className="text-gray-500 font-medium mb-6 text-xs sm:text-sm">
                ¿Deseas desactivar a <span className="font-bold text-text-dark">{currentUser.nombre}</span>? No podrá iniciar sesión.
              </p>
              
              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
                <button 
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-200 transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleToggleStatus(currentUser.id, true)}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-red-600 transition-all shadow-md shadow-red-500/25 min-h-[44px]"
                >
                  Desactivar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirmar Eliminación */}
        {showDeleteModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" 
              onClick={() => setShowDeleteModal(false)}
              aria-hidden="true"
            ></div>
            
            <div 
              className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-red-500/20 w-full max-w-sm relative z-10 overflow-hidden transform transition-all border border-white p-6 sm:p-8 text-center my-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Trash2 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              
              <h3 className="text-lg sm:text-xl font-bold text-text-dark mb-2">Eliminar usuario</h3>
              <p className="text-gray-500 font-medium mb-6 leading-relaxed text-xs sm:text-sm">
                ¿Deseas eliminar a <span className="font-bold text-text-dark">{currentUser.nombre}</span>? Esta acción no se puede deshacer.
              </p>
              
              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-200 transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDelete(currentUser.id)}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all bg-red-500 text-white font-bold hover:bg-red-600 shadow-md shadow-red-500/25 min-h-[44px]"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toasts */}
      {message && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-white text-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium text-xs sm:text-sm">
          <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <span>{message}</span>
        </div>
      )}
      {globalError && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-white text-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium text-xs sm:text-sm">
          <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <span>{globalError}</span>
        </div>
      )}
    </Layout>
  );
}
