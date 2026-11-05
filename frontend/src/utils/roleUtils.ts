/**
 * Utilidades para formatear y verificar roles de usuario.
 * Cumple con el requisito de mostrar correctamente el rol Colaborador,
 * sin identificarlo erróneamente como Anfitrión.
 */

export function formatRole(rol?: string | null): string {
  if (!rol) return '';
  const r = rol.trim().toUpperCase();
  if (r === 'ROLE_ADMIN' || r === 'ADMIN') {
    return 'Administrador';
  }
  if (r === 'ROLE_COLABORADOR' || r === 'COLABORADOR') {
    return 'Colaborador';
  }
  if (r === 'ROLE_ANFITRION' || r === 'ANFITRION') {
    return 'Anfitrión';
  }
  return rol;
}

export function isRoleColaborador(rol?: string | null): boolean {
  if (!rol) return false;
  const r = rol.trim().toUpperCase();
  return r === 'ROLE_COLABORADOR' || r === 'COLABORADOR';
}

export function isRoleAnfitrion(rol?: string | null): boolean {
  if (!rol) return false;
  const r = rol.trim().toUpperCase();
  return r === 'ROLE_ANFITRION' || r === 'ANFITRION';
}

export function isRoleAdmin(rol?: string | null): boolean {
  if (!rol) return false;
  const r = rol.trim().toUpperCase();
  return r === 'ROLE_ADMIN' || r === 'ADMIN';
}
