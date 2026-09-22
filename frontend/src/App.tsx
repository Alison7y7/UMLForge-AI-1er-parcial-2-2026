import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Roles from './pages/Roles';
import ProjectDiagrams from './pages/ProjectDiagrams';
import UMLEditor from './pages/UMLEditor';
import Proyectos from './pages/Proyectos';
import Bitacora from './pages/Bitacora';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PermissionRoute({ children, permission }: { children: React.ReactNode, permission: string }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.permisos?.includes(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/usuarios" element={<PermissionRoute permission="GESTIONAR_USUARIOS"><Usuarios /></PermissionRoute>} />
        <Route path="/roles" element={<PermissionRoute permission="GESTIONAR_ROLES"><Roles /></PermissionRoute>} />
        <Route path="/proyectos" element={<ProtectedRoute><Proyectos /></ProtectedRoute>} />
        <Route path="/proyectos/:id" element={<ProtectedRoute><ProjectDiagrams /></ProtectedRoute>} />
        <Route path="/diagramas/:id" element={<ProtectedRoute><UMLEditor /></ProtectedRoute>} />
        <Route path="/bitacora" element={<PermissionRoute permission="CONSULTAR_BITACORA"><Bitacora /></PermissionRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

