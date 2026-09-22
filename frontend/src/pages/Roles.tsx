import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, LayoutDashboard, Folder, Users, Clock, LogOut, X, Menu, CheckCircle2, XCircle, Plus, Edit2, Play, Square, Settings } from 'lucide-react';
import { api } from '../api/axios';
import { useAuthStore } from '../store/authStore';

import Logo from '../components/Logo';

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
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
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

  const handleLogout = () => logout();

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
        rolId: selectedRolId,
        permisos: selectedUserPermisos
      });
      showSuccessToast('Accesos de usuario actualizados correctamente');
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data || '';
      showErrorToast(typeof msg === 'string' ? msg : 'Error al guardar accesos');
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

  const openEditRoleModal = (r: Rol) => {
    setIsEditingRole(true);
    setCurrentRoleFormId(r.id);
    setRoleNombre(r.nombre);
    setRoleDescripcion(r.descripcion || '');
    setRoleActivo(r.activo);
    setSelectedRolePermisos(r.permisos || []);
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
      showErrorToast('El nombre del rol es obligatorio');
      return;
    }
    try {
      const payload = {
        nombre: roleNombre,
        descripcion: roleDescripcion,
        activo: roleActivo,
        permisos: selectedRolePermisos
      };

      if (isEditingRole && currentRoleFormId) {
        await api.put(`/roles/${currentRoleFormId}`, payload);
        showSuccessToast('Rol actualizado correctamente');
      } else {
        await api.post('/roles', payload);
        showSuccessToast('Rol creado correctamente');
      }
      setShowRoleModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data || '';
      showErrorToast(typeof msg === 'string' ? msg : 'Error al guardar el rol');
    }
  };

  const toggleRoleStatus = async (r: Rol) => {
    try {
      await api.patch(`/roles/${r.id}/estado?activo=${!r.activo}`);
      showSuccessToast(`Rol ${!r.activo ? 'activado' : 'desactivado'} correctamente`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showErrorToast('Error al cambiar estado del rol');
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row relative overflow-hidden font-sans">
      
      {/* Background Decorativo */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-lila-light rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"></div>
      
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
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur-xl border-r border-lila-light/50 shadow-sm transform transition-transform duration-300 ease-in-out flex flex-col md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                <Link to="/usuarios" className="flex items-center px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-text-dark rounded-2xl font-medium transition-all group">
                  <Users className="w-5 h-5 mr-3 text-gray-400 group-hover:text-lila-main transition-colors" /> Usuarios
                </Link>
              )}
              {user?.permisos?.includes('GESTIONAR_ROLES') && (
                <Link to="/roles" className="flex items-center px-4 py-3 bg-lila-light/50 text-lila-main rounded-2xl font-semibold transition-all">
                  <Shield className="w-5 h-5 mr-3" /> Roles
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
          <button onClick={handleLogout} className="flex items-center justify-center w-full px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-2xl font-medium transition-all border border-transparent hover:border-red-100">
            <LogOut className="w-5 h-5 mr-2" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-12 py-8 lg:py-12 flex-1 flex flex-col">
          
          <header className="flex items-center justify-end mb-8 lg:mb-12">
            <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-lila-light/50 shadow-sm">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-text-dark">{user?.nombre} {user?.apellido}</p>
                <p className="text-[11px] font-medium text-lila-main uppercase tracking-wider">{user?.rol}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lila-light to-pink-light flex items-center justify-center text-lila-main font-bold border border-white shadow-inner">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-2">Roles y permisos</h1>
              <p className="text-gray-500 font-medium">Administra los roles del sistema y el acceso individual de los usuarios.</p>
            </div>
            {activeTab === 'roles' && (
              <button 
                onClick={openCreateRoleModal}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-pink-main/30"
              >
                <Plus className="w-5 h-5 mr-2" /> Nuevo rol
              </button>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-white/60 p-1.5 rounded-2xl border border-gray-100 w-full sm:w-auto self-start mb-6">
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'roles' 
                  ? 'bg-white text-lila-main shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:text-text-dark hover:bg-gray-50/50'
              }`}
            >
              Roles
            </button>
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'usuarios' 
                  ? 'bg-white text-lila-main shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:text-text-dark hover:bg-gray-50/50'
              }`}
            >
              Usuarios y permisos
            </button>
          </div>

          {/* Tab Content: ROLES */}
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(rol => (
                <div key={rol.id} className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 hover:shadow-lg transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-lila-light/30 flex items-center justify-center text-lila-main group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${rol.activo ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {rol.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text-dark mb-2">{rol.nombre}</h3>
                  <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-3">{rol.descripcion || 'Sin descripción'}</p>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      {rol.permisos?.length || 0} permisos
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => openEditRoleModal(rol)}
                      className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-lila-light/30 text-gray-600 hover:text-lila-main rounded-xl font-bold text-sm transition-colors border border-gray-100 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                    {rol.nombre !== 'ADMIN' && (
                      <button 
                        onClick={() => toggleRoleStatus(rol)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border flex items-center justify-center ${
                          rol.activo 
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100' 
                            : 'bg-green-50 hover:bg-green-100 text-green-600 border-green-100'
                        }`}
                        title={rol.activo ? "Desactivar" : "Activar"}
                      >
                        {rol.activo ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content: USUARIOS Y PERMISOS */}
          {activeTab === 'usuarios' && (
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100/80">
                      <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                      <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Rol Actual</th>
                      <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Permisos Personalizados</th>
                      <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {usuarios.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-lila-light/30 flex items-center justify-center text-lila-main font-bold text-sm">
                              {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-text-dark">{u.nombre} {u.apellido}</p>
                              <p className="text-sm text-gray-500 font-medium">{u.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold border border-gray-200">
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {u.permisos?.length || 0} habilitados
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openUserModal(u)}
                            className="px-4 py-2 bg-lila-light/50 text-lila-main hover:bg-lila-light hover:text-lila-dark rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ml-auto"
                          >
                            <Settings className="w-4 h-4" /> Gestionar acceso
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">No hay usuarios</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modals Container */}
      <div id="modals-container">
        
        {/* Modal: GESTIONAR ACCESO DE USUARIO */}
        {showUserModal && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setShowUserModal(false)}></div>
            
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-2xl relative z-10 overflow-hidden transform transition-all border border-white my-8 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-text-dark flex items-center gap-3">
                  <Settings className="w-6 h-6 text-lila-main" /> Gestionar acceso
                </h3>
                <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-6">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-lila-main font-bold text-lg shadow-sm">
                    {currentUser.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-text-dark text-lg">{currentUser.nombre} {currentUser.apellido}</p>
                    <p className="text-sm text-gray-500 font-medium">{currentUser.correo}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700 ml-1">Rol</label>
                  <select 
                    value={selectedRolId}
                    onChange={handleUserRoleChange}
                    className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark text-sm"
                  >
                    <option value="" disabled>Selecciona un rol</option>
                    {roles.filter(r => r.activo || r.id === selectedRolId).map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 ml-1 mt-1 font-medium">Cambiar el rol actualizará la plantilla de permisos debajo.</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 ml-1">Permisos Específicos (Prioridad sobre rol)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {permisosGlobales.map(p => {
                      const checked = selectedUserPermisos.includes(p.codigo);
                      return (
                        <div 
                          key={p.codigo}
                          onClick={() => handleUserPermisoToggle(p.codigo)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-lila-main bg-lila-light/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${checked ? 'bg-lila-main border-lila-main text-white' : 'border-gray-300 bg-white'}`}>
                            {checked && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${checked ? 'text-lila-main' : 'text-gray-700'}`}>{p.nombre}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 leading-tight">{p.descripcion}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-gray-100 flex gap-4 shrink-0 bg-white">
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-5 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveUserAccesos}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2"
                >
                  Guardar accesos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: CREAR/EDITAR ROL */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}></div>
            
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-lila-main/10 w-full max-w-2xl relative z-10 overflow-hidden transform transition-all border border-white my-8 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-text-dark flex items-center gap-3">
                  <Shield className="w-6 h-6 text-lila-main" /> {isEditingRole ? 'Editar Rol' : 'Nuevo Rol'}
                </h3>
                <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Nombre del rol</label>
                    <input 
                      type="text" 
                      value={roleNombre}
                      onChange={e => setRoleNombre(e.target.value.toUpperCase())}
                      placeholder="Ej. DISEÑADOR"
                      disabled={isEditingRole && ['ADMIN','ANFITRION','COLABORADOR'].includes(roleNombre)}
                      className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Descripción</label>
                    <input 
                      type="text" 
                      value={roleDescripcion}
                      onChange={e => setRoleDescripcion(e.target.value)}
                      placeholder="Breve descripción de este rol"
                      className="w-full px-5 py-3 bg-bg-main/50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-lila-main transition-all font-medium text-text-dark"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 ml-1">Permisos por Defecto</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {permisosGlobales.map(p => {
                      const checked = selectedRolePermisos.includes(p.codigo);
                      return (
                        <div 
                          key={p.codigo}
                          onClick={() => handleRolePermisoToggle(p.codigo)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-lila-main bg-lila-light/10' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${checked ? 'bg-lila-main border-lila-main text-white' : 'border-gray-300 bg-white'}`}>
                            {checked && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${checked ? 'text-lila-main' : 'text-gray-700'}`}>{p.nombre}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 leading-tight">{p.descripcion}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-gray-100 flex gap-4 shrink-0 bg-white">
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-5 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveRole}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-lila-main to-pink-main text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-pink-main/20 flex items-center justify-center gap-2"
                >
                  Guardar rol
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        {message && (
          <div className="fixed bottom-6 right-6 z-[60] bg-white text-gray-900 px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            {message}
          </div>
        )}
        {globalError && (
          <div className="fixed bottom-6 right-6 z-[60] bg-white text-gray-900 px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 font-medium">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            {globalError}
          </div>
        )}
      </div>
    </div>
  );
}
