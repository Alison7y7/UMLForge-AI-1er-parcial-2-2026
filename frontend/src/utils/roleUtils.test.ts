import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRole, isRoleColaborador, isRoleAnfitrion, isRoleAdmin } from './roleUtils.ts';

describe('formatRole y validaciones de rol', () => {
  it('formatea correctamente el rol ADMIN y ROLE_ADMIN como Administrador', () => {
    assert.equal(formatRole('ADMIN'), 'Administrador');
    assert.equal(formatRole('ROLE_ADMIN'), 'Administrador');
    assert.equal(formatRole('admin'), 'Administrador');
    assert.equal(isRoleAdmin('ADMIN'), true);
    assert.equal(isRoleAdmin('COLABORADOR'), false);
  });

  it('formatea correctamente el rol ANFITRION y ROLE_ANFITRION como Anfitrión', () => {
    assert.equal(formatRole('ANFITRION'), 'Anfitrión');
    assert.equal(formatRole('ROLE_ANFITRION'), 'Anfitrión');
    assert.equal(formatRole('anfitrion'), 'Anfitrión');
    assert.equal(isRoleAnfitrion('ANFITRION'), true);
    assert.equal(isRoleAnfitrion('COLABORADOR'), false);
  });

  it('formatea correctamente el rol COLABORADOR sin confundirlo con Anfitrión', () => {
    // Requisito 9: Mostrar correctamente el rol Colaborador, sin identificarlo como Anfitrión.
    assert.equal(formatRole('COLABORADOR'), 'Colaborador');
    assert.equal(formatRole('ROLE_COLABORADOR'), 'Colaborador');
    assert.equal(formatRole('colaborador'), 'Colaborador');
    assert.notEqual(formatRole('COLABORADOR'), 'Anfitrión');
    assert.notEqual(formatRole('ROLE_COLABORADOR'), 'Anfitrión');
    assert.equal(isRoleColaborador('COLABORADOR'), true);
    assert.equal(isRoleColaborador('ROLE_COLABORADOR'), true);
  });

  it('maneja valores vacíos, nulos o no definidos de forma segura', () => {
    assert.equal(formatRole(''), '');
    assert.equal(formatRole(null), '');
    assert.equal(formatRole(undefined), '');
    assert.equal(isRoleColaborador(null), false);
    assert.equal(isRoleAnfitrion(undefined), false);
    assert.equal(isRoleAdmin(null), false);
  });
});
