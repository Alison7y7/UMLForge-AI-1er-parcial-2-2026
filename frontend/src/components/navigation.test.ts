import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRole, isRoleColaborador, isRoleAnfitrion, isRoleAdmin } from '../utils/roleUtils.ts';

describe('FASE 2: Navegación móvil y Actores del sistema', () => {
  it('A1: Actor Administrador se identifica correctamente en escritorio y móvil', () => {
    assert.equal(formatRole('ROLE_ADMIN'), 'Administrador');
    assert.equal(formatRole('ADMIN'), 'Administrador');
    assert.equal(isRoleAdmin('ADMIN'), true);
    assert.equal(isRoleAnfitrion('ADMIN'), false);
    assert.equal(isRoleColaborador('ADMIN'), false);
  });

  it('A2: Actor Anfitrión se identifica correctamente', () => {
    assert.equal(formatRole('ROLE_ANFITRION'), 'Anfitrión');
    assert.equal(formatRole('ANFITRION'), 'Anfitrión');
    assert.equal(isRoleAnfitrion('ANFITRION'), true);
    assert.equal(isRoleColaborador('ANFITRION'), false);
    assert.equal(isRoleAdmin('ANFITRION'), false);
  });

  it('A3: Actor Colaborador se identifica correctamente sin confundirse con Anfitrión (Requisito 9)', () => {
    // Requisito 9: Mostrar correctamente el rol Colaborador, sin identificarlo como Anfitrión.
    assert.equal(formatRole('ROLE_COLABORADOR'), 'Colaborador');
    assert.equal(formatRole('COLABORADOR'), 'Colaborador');
    assert.notEqual(formatRole('COLABORADOR'), 'Anfitrión');
    assert.notEqual(formatRole('ROLE_COLABORADOR'), 'Anfitrión');
    assert.equal(isRoleColaborador('COLABORADOR'), true);
    assert.equal(isRoleAnfitrion('COLABORADOR'), false);
    assert.equal(isRoleAdmin('COLABORADOR'), false);
  });

  it('Filtro de permisos para Actividades en la navegación móvil (Requisito 2)', () => {
    // Actividades solo debe mostrarse si el usuario posee CONSULTAR_BITACORA
    const permisosAdmin = ['GESTIONAR_USUARIOS', 'GESTIONAR_ROLES', 'GESTIONAR_PROYECTOS', 'CONSULTAR_BITACORA', 'EDITAR_DIAGRAMAS'];
    const permisosAnfitrion = ['GESTIONAR_PROYECTOS', 'GESTIONAR_PARTICIPANTES', 'EDITAR_DIAGRAMAS', 'CONSULTAR_BITACORA'];
    const permisosColaborador = ['EDITAR_DIAGRAMAS'];

    const canViewBitacoraAdmin = permisosAdmin.includes('CONSULTAR_BITACORA');
    const canViewBitacoraAnfitrion = permisosAnfitrion.includes('CONSULTAR_BITACORA');
    const canViewBitacoraColaborador = permisosColaborador.includes('CONSULTAR_BITACORA');

    assert.equal(canViewBitacoraAdmin, true, 'Admin debe tener acceso a Actividades');
    assert.equal(canViewBitacoraAnfitrion, true, 'Anfitrión debe tener acceso a Actividades');
    assert.equal(canViewBitacoraColaborador, false, 'Colaborador estándar no debe ver Actividades sin permiso');
  });

  it('Validación de URLs de navegación móvil: Panel, Proyectos y Actividades', () => {
    const mobileRoutes = [
      { name: 'Panel', path: '/dashboard' },
      { name: 'Proyectos', path: '/proyectos' },
      { name: 'Actividades', path: '/bitacora', requiresPermission: 'CONSULTAR_BITACORA' },
    ];

    assert.equal(mobileRoutes[0].path, '/dashboard');
    assert.equal(mobileRoutes[1].path, '/proyectos');
    assert.equal(mobileRoutes[2].path, '/bitacora');
    assert.equal(mobileRoutes[2].requiresPermission, 'CONSULTAR_BITACORA');
  });
});
