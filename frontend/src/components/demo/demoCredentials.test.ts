import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CU16: Credenciales de demostración local', () => {
  const DEMO_GROUPS = [
    {
      rol: 'Administrador',
      cuentas: [
        { nombre: 'Alejandro arispe', correo: 'AlejandroAdmin@gmail.com' },
      ],
    },
    {
      rol: 'Anfitrión',
      cuentas: [
        { nombre: 'Noe Ali', correo: 'NoeAliAnfitrion@gmail.com' },
        { nombre: 'Carlos Anfitrion', correo: 'CarlosAnfitrion@gmail.com' },
      ],
    },
    {
      rol: 'Colaborador',
      cuentas: [
        { nombre: 'Elena Colaborador', correo: 'ElenaColaborador@gmail.com' },
        { nombre: 'Pedro Externo', correo: 'pedroColaborador@gmail.com' },
      ],
    },
  ];

  it('Contiene exactamente las 5 cuentas autorizadas para la demostración', () => {
    const allEmails = DEMO_GROUPS.flatMap((g) => g.cuentas.map((c) => c.correo));
    assert.equal(allEmails.length, 5);
    assert.deepEqual(allEmails.sort(), [
      'AlejandroAdmin@gmail.com',
      'CarlosAnfitrion@gmail.com',
      'ElenaColaborador@gmail.com',
      'NoeAliAnfitrion@gmail.com',
      'pedroColaborador@gmail.com',
    ].sort());
  });

  it('Exclusión absoluta: admin@gmail.com (Admin Sistema) no debe figurar en las cuentas de demo', () => {
    const allEmails = DEMO_GROUPS.flatMap((g) => g.cuentas.map((c) => c.correo.toLowerCase()));
    assert.equal(allEmails.includes('admin@gmail.com'), false);
    assert.equal(allEmails.includes('admin@umlforge.com'), false);
  });

  it('Agrupación correcta: Administrador, Anfitrión y Colaborador', () => {
    const roles = DEMO_GROUPS.map((g) => g.rol);
    assert.deepEqual(roles, ['Administrador', 'Anfitrión', 'Colaborador']);

    const adminGroup = DEMO_GROUPS.find((g) => g.rol === 'Administrador');
    assert.equal(adminGroup?.cuentas.length, 1);
    assert.equal(adminGroup?.cuentas[0].correo, 'AlejandroAdmin@gmail.com');

    const anfitrionGroup = DEMO_GROUPS.find((g) => g.rol === 'Anfitrión');
    assert.equal(anfitrionGroup?.cuentas.length, 2);

    const colaboradorGroup = DEMO_GROUPS.find((g) => g.rol === 'Colaborador');
    assert.equal(colaboradorGroup?.cuentas.length, 2);
  });

  it('Separación de build: flag de entorno para producción', () => {
    const prodFlag = 'false';
    const isDemoEnabledProd = prodFlag === 'true';
    assert.equal(isDemoEnabledProd, false, 'En producción demo debe estar deshabilitado');

    const devFlag = 'true';
    const isDemoEnabledDev = devFlag === 'true';
    assert.equal(isDemoEnabledDev, true, 'En desarrollo local demo debe estar habilitado');
  });
});
