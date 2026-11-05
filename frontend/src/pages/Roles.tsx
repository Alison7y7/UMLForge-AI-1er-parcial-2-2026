import { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle2, XCircle, Plus, Edit2, Play, Square, Settings, X 
} from 'lucide-react';
import { api } from '../api/axios';
import Layout from '../components/Layout';
import { formatRole } from '../utils/roleUtils';

interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  permisos: string[];
}

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  permisos: string[];
}

export default function Roles() {
  const [activeTab, setActiveTab] = useState<'roles' | 'usuarios'>('roles');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisosGlobales, setPermisosGlobales] = useState<Permiso[]>([]);

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // User Form
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [selectedRolId, setSelectedRolId] = useState<number | ''>('');
  const [selectedUserPermisos, setSelectedUserPermisos] = useState<string[]>([]);
  
  // Role Form
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [currentRoleFormId, setCurrentRoleFormId] = useState<number | null>(null);
  const [roleNombre, setRoleNombre] = useState('');
  const [roleDescripcion, setRoleDescripcion] = useState('');
  const [roleActivo, setRoleActivo] = useState(true);
  const [selectedRolePermisos, setSelectedRolePermisos] = useState<string[]>([]);

  const [message, setMessage] = useState('');
  const [globalError, setGlobalError] = useState('');

  const fetchData = async () => {
    try {
      const [resUsers, resRoles, resPermisos] = await Promise.all([
        api.get('/usuarios'),
        api.get('/roles'),
        api.get('/permisos')
      ]);
      setUsuarios(resUsers.data);
      setRoles(resRoles.data);
      setPermisosGlobales(resPermisos.data);
    } catch (error) {
      console.error(error);
      showErrorToast('Error al obtener datos');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccessToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const showErrorToast = (msg: string) => {
    setGlobalError(msg);
    setTimeout(() => setGlobalError(''), 3000);
  };

  // --- TAB USUARIOS ---
  const openUserModal = (u: Usuario) => {
    setCurrentUser(u);
    const userRole = roles.find(r => r.nombre === u.rol);
    setSelectedRolId(userRole ? userRole.id : '');
    setSelectedUserPermisos(u.permisos || []);
    setShowUserModal(true);
  };

  const handleUserRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rolId = Number(e.target.value);
    setSelectedRolId(rolId);
    
    // Auto-select permissions for that role as suggestion
    const r = roles.find(ro => ro.id === rolId);
    if (r && r.permisos) {
      setSelectedUserPermisos(r.permisos);
    }
  };

  const handleUserPermisoToggle = (codigo: string) => {
    if (selectedUserPermisos.includes(codigo)) {
      setSelectedUserPermisos(selectedUserPermisos.filter(p => p !== codigo));
    } else {
      setSelectedUserPermisos([...selectedUserPermisos, codigo]);
    }
  };

  const saveUserAccesos = async () => {
    if (!currentUser || selectedRolId === '') return;
    try {
      await api.put(`/usuarios/${currentUser.id}/accesos`, {
        rolId: Number(selectedRolId),
        permisos: selectedUserPermisos
      });
      showSuccessToast('Accesos de usuario actualizados correctamente');
      setShowUserModal(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.response?.data || '';
      const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (msgStr.toLowerCase().includes('esenciales')) {
        showErrorToast('No puedes quitarte a ti mismo los permisos administrativos');
      } else {
        showErrorToast('Error al actualizar accesos del usuario');
      }
    }
  };

  // --- TAB ROLES ---
  const openCreateRoleModal = () => {
    setIsEditingRole(false);
    setCurrentRoleFormId(null);
    setRoleNombre('');
    setRoleDescripcion('');
    setRoleActivo(true);
    setSelectedRolePermisos([]);
    setShowRoleModal(true);
  };

  const openEditRoleModal = (rol: Rol) => {
    setIsEditingRole(true);
    setCurrentRoleFormId(rol.id);
    setRoleNombre(rol.nombre);
    setRoleDescripcion(rol.descripcion || '');
    setRoleActivo(rol.activo);
    setSelectedRolePermisos(rol.permisos || []);
    setShowRoleModal(true);
  };

  const handleRolePermisoToggle = (codigo: string) => {
    if (selectedRolePermisos.includes(codigo)) {
      setSelectedRolePermisos(selectedRolePermisos.filter(p => p !== codigo));
    } else {
      setSelectedRolePermisos([...selectedRolePermisos, codigo]);
    }
  };

  const saveRole = async () => {
    if (!roleNombre.trim()) {
      showErrorToast('El nombre del rol es requerido');
      return;
    }

    try {
      if (isEditingRole && currentRoleFormId) {
        await api.put(`/roles/${currentRoleFormId}`, {
          nombre: roleNombre,
          descripcion: roleDescripcion,
          activo: roleActivo,
          permisos: selectedRolePermisos
        });
        showSuccessToast('Rol actualizado correctamente');
      } else {
        await api.post('/roles', {
          nombre: roleNombre,
          descripcion: roleDescripcion,
          activo: true,
          permisos: selectedRolePermisos
        });
        showSuccessToast('Rol creado correctamente');
      }
      setShowRoleModal(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      showErrorToast(error.response?.data?.message || 'Error al guardar el rol');
    }
  };

  const toggleRoleStatus = async (rol: Rol) => {
    try {
      await api.patch(`/roles/${rol.id}/estado?activo=${!rol.activo}`);
      showSuccessToast(`Rol ${!rol.activo ? 'activado' : 'desactivado'} correctamente`);
      fetchData();
    } catch (error: any) {
      console.error(error);
      showErrorToast(error.response?.data?.message || 'No se puede cambiar el estado de este rol');
    }
  };

  return (
    <Layout>
      <div className="w-full">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-dark tracking-tight mb-2">
              Roles y permisos
            </h1>
            <p className="text-gray-500 font-medium text-xs sm:text-sm lg:text-base">
              Configura los roles del sistema y la asignación de permisos a usuarios.
            </p>
          </div>
          {activeTab === 'roles' && (
            <button 
              type="button"
              onClick={openCreateRoleModal}
              className="flex items-center justify-center px-5 py-3.5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex-shrink-0 w-full sm:w-auto min-h-[48px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span>Nuevo rol</span>
            </button>
          )}
        </div>

        {/* Tabs de Navegación Responsivos */}
        <div className="flex space-x-1 bg-white/70 p-1.5 rounded-2xl border border-gray-100 w-full sm:w-auto self-start mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all min-h-[40px] flex items-center justify-center ${
              activeTab === 'roles' 
                ? 'bg-white text-lila-main shadow-xs border border-gray-100' 
                : 'text-gray-500 hover:text-text-dark hover:bg-gray-50/50'
            }`}
          >
            Roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all min-h-[40px] flex items-center justify-center ${
              activeTab === 'usuarios' 
                ? 'bg-white text-lila-main shadow-xs border border-gray-100' 
                : 'text-gray-500 hover:text-text-dark hover:bg-gray-50/50'
            }`}
          >
            Usuarios y permisos
          </button>
        </div>

        {/* TAB 1: ROLES */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {roles.map(rol => (
              <div key={rol.id} className="bg-white/85 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-3xl p-5 sm:p-6 hover:shadow-lg transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-lila-light/40 flex items-center justify-center text-lila-main group-hover:scale-105 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    rol.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {rol.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-dark mb-1.5">{formatRole(rol.nombre)}</h3>
                <p className="text-gray-500 text-xs sm:text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">
                  {rol.descripcion || 'Sin descripción'}
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                    {rol.permisos?.length || 0} permisos
                  </span>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => openEditRoleModal(rol)}
                    className="flex-1 px-3.5 py-2.5 bg-gray-50 hover:bg-lila-light/30 text-gray-700 hover:text-lila-main rounded-xl font-bold text-xs sm:text-sm transition-colors border border-gray-100 flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Edit2 className="w-4 h-4" /> 
                    <span>Editar</span>
                  </button>
                  {rol.nombre !== 'ADMIN' && (
                    <button 
                      type="button"
                      onClick={() => toggleRoleStatus(rol)}
                      className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors border flex items-center justify-center min-h-[44px] min-w-[44px] ${
                        rol.activo 
                          ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100' 
                          : 'bg-green-50 hover:bg-green-100 text-green-600 border-green-100'
                      }`}
                      title={rol.activo ? "Desactivar rol" : "Activar rol"}
                      aria-label={rol.activo ? "Desactivar rol" : "Activar rol"}
                    >
                      {rol.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: USUARIOS Y PERMISOS */}
        {activeTab === 'usuarios' && (
          <>
            {/* VISTA ESCRITORIO / TABLET: Tabla Completa */}
            <div className="hidden md:block bg-white/85 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-[2rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100/80 bg-gray-50/40">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Rol Actual</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Permisos Personalizados</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {usuarios.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-lila-light/40 flex items-center justify-center text-lila-main font-bold text-sm shrink-0">
                              {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-text-dark text-sm truncate">{u.nombre} {u.apellido}</p>
                              <p className="text-xs text-gray-500 font-medium truncate">{u.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">
                            {formatRole(u.rol)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs sm:text-sm font-medium text-gray-500">
                          {u.permisos?.length || 0} habilitados
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            type="button"
                            onClick={() => openUserModal(u)}
                            className="px-4 py-2 bg-lila-light/50 text-lila-main hover:bg-lila-light rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 ml-auto min-h-[40px]"
                          >
                            <Settings className="w-4 h-4" /> 
                            <span>Gestionar acceso</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">No hay usuarios registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VISTA MÓVIL: Tarjetas de Permisos por Usuario (Requisito 5) */}
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
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 font-medium">Rol:</span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600">
                        {formatRole(u.rol)}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {u.permisos?.length || 0} permisos habilitados
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100/60">
                    <button
                      type="button"
                      onClick={() => openUserModal(u)}
                      className="w-full py-2.5 px-3 bg-lila-light/50 hover:bg-lila-light text-lila-main font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Gestionar acceso</span>
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
        
        {/* Modal: GESTIONAR ACCESO DE USUARIO */}
        {showUserModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div 
              className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
              onClick={() => setShowUserModal(false)}
              aria-hidden="true"
            ></div>
            
            <div 
              className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-2xl relative z-10 overflow-hidden transform transition-all border border-white my-auto flex flex-col max-h-[90dvh]"
              role="dialog"
              aria-modal="true"
            >
              <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg sm:text-xl font-bold text-text-dark flex items-center gap-2.5">
                  <Settings className="w-5 h-5 text-lila-main shrink-0" /> 
                  <span>Gestionar acceso</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowUserModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-5 sm:space-y-6">
                <div className="flex items-center gap-3.5 bg-gray-50 p-3.5 sm:p-4 rounded-2xl border border-gray-100">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center text-lila-main font-bold text-base sm:text-lg shadow-xs shrink-0">
                    {currentUser.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-text-dark text-sm sm:text-base truncate">{currentUser.nombre} {currentUser.apellido}</p>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{currentUser.correo}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 ml-1">Rol</label>
                  <select 
                    value={selectedRolId}
                    onChange={handleUserRoleChange}
                    className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base cursor-pointer"
                  >
                    <option value="" disabled>Selecciona un rol</option>
                    {roles.filter(r => r.activo || r.id === selectedRolId).map(r => (
                      <option key={r.id} value={r.id}>{formatRole(r.nombre)}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 ml-1 mt-1 font-medium">Cambiar el rol actualizará la plantilla de permisos debajo.</p>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-2.5 ml-1">
                    Permisos específicos asignados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {permisosGlobales.map(p => {
                      const checked = selectedUserPermisos.includes(p.codigo);
                      return (
                        <div 
                          key={p.codigo}
                          onClick={() => handleUserPermisoToggle(p.codigo)}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all min-h-[50px] ${
                            checked ? 'border-lila-main bg-lila-light/15' : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                            checked ? 'bg-lila-main border-lila-main text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {checked && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs sm:text-sm font-bold ${checked ? 'text-lila-main' : 'text-gray-700'}`}>
                              {p.nombre}
                            </p>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-tight">
                              {p.descripcion}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-8 py-3.5 sm:py-5 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-4 shrink-0 bg-white">
                <button 
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-100 rounded-xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={saveUserAccesos}
                  className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  Guardar accesos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: CREAR/EDITAR ROL */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div 
              className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" 
              onClick={() => setShowRoleModal(false)}
              aria-hidden="true"
            ></div>
            
            <div 
              className="bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-2xl relative z-10 overflow-hidden transform transition-all border border-white my-auto flex flex-col max-h-[90dvh]"
              role="dialog"
              aria-modal="true"
            >
              <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg sm:text-xl font-bold text-text-dark flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-lila-main shrink-0" /> 
                  <span>{isEditingRole ? 'Editar Rol' : 'Nuevo Rol'}</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowRoleModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
                <div className="space-y-3.5 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 ml-1">
                      Nombre del rol
                    </label>
                    <input 
                      type="text" 
                      value={roleNombre}
                      onChange={e => setRoleNombre(e.target.value.toUpperCase())}
                      placeholder="Ej. DISEÑADOR"
                      disabled={isEditingRole && ['ADMIN','ANFITRION','COLABORADOR'].includes(roleNombre)}
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 ml-1">
                      Descripción
                    </label>
                    <input 
                      type="text" 
                      value={roleDescripcion}
                      onChange={e => setRoleDescripcion(e.target.value)}
                      placeholder="Breve descripción de este rol"
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 bg-bg-main/60 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-2.5 ml-1">
                    Permisos por defecto
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {permisosGlobales.map(p => {
                      const checked = selectedRolePermisos.includes(p.codigo);
                      return (
                        <div 
                          key={p.codigo}
                          onClick={() => handleRolePermisoToggle(p.codigo)}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all min-h-[50px] ${
                            checked ? 'border-lila-main bg-lila-light/15' : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                            checked ? 'bg-lila-main border-lila-main text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {checked && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs sm:text-sm font-bold ${checked ? 'text-lila-main' : 'text-gray-700'}`}>
                              {p.nombre}
                            </p>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-tight">
                              {p.descripcion}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-8 py-3.5 sm:py-5 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-4 shrink-0 bg-white">
                <button 
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="w-full sm:flex-1 py-3 px-5 bg-white border-2 border-gray-100 rounded-xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all min-h-[44px]"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={saveRole}
                  className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  Guardar rol
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
        {globalError && (
          <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-white text-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium text-xs sm:text-sm">
            <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <span>{globalError}</span>
          </div>
        )}
      </div>
    </Layout>
  );
}
