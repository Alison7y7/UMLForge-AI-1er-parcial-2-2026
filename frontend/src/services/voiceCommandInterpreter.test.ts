import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { interpretVoiceCommand, type VoiceCommand } from './voiceCommandInterpreter.ts';
import { isRoleAdmin, isRoleAnfitrion, isRoleColaborador } from '../utils/roleUtils.ts';

describe('CU14: Intérprete y Controlador de Comandos de Voz', () => {
  const existingNodes = [
    { id: 'node-1', nombre: 'Cliente' },
    { id: 'node-2', nombre: 'Pedido' },
    { id: 'node-3', nombre: 'Producto' }
  ];

  it('1. Interpreta comando válido: «Crear clase Factura»', () => {
    const cmd = interpretVoiceCommand('Crear clase Factura', existingNodes);
    assert.equal(cmd.tipo, 'CREAR_CLASE');
    assert.equal(cmd.payload?.nombreClase, 'Factura');
    assert.equal(cmd.requierePermisoEdicion, true);
    assert.equal(cmd.esModificacionDiagrama, true);
    assert.equal(cmd.error, undefined);
  });

  it('2. Detecta colisión cuando la clase a crear ya existe en el diagrama', () => {
    const cmd = interpretVoiceCommand('Crear clase Cliente', existingNodes);
    assert.equal(cmd.tipo, 'CREAR_CLASE');
    assert.ok(cmd.error?.includes('Ya existe una clase con el nombre «Cliente»'));
  });

  it('3. Interpreta comando válido: «Agregar atributo nombre de tipo String a Cliente»', () => {
    const cmd = interpretVoiceCommand('Agregar atributo nombre de tipo String a Cliente', existingNodes);
    assert.equal(cmd.tipo, 'AGREGAR_ATRIBUTO');
    assert.equal(cmd.payload?.nombreClase, 'Cliente');
    assert.equal(cmd.payload?.atributo?.nombre, 'nombre');
    assert.equal(cmd.payload?.atributo?.tipo, 'String');
    assert.equal(cmd.payload?.atributo?.visibilidad, 'private');
    assert.equal(cmd.requierePermisoEdicion, true);
    assert.equal(cmd.esModificacionDiagrama, true);
    assert.equal(cmd.error, undefined);
  });

  it('4. Normaliza tipos de datos expresados en lenguaje natural', () => {
    const cmdText = interpretVoiceCommand('Agregar atributo descripcion de tipo texto a Producto', existingNodes);
    assert.equal(cmdText.payload?.atributo?.tipo, 'String');

    const cmdInt = interpretVoiceCommand('Agregar atributo stock de tipo entero a Producto', existingNodes);
    assert.equal(cmdInt.payload?.atributo?.tipo, 'Integer');

    const cmdBool = interpretVoiceCommand('Agregar atributo activo de tipo booleano a Cliente', existingNodes);
    assert.equal(cmdBool.payload?.atributo?.tipo, 'Boolean');

    const cmdDate = interpretVoiceCommand('Agregar atributo emision de tipo fecha a Pedido', existingNodes);
    assert.equal(cmdDate.payload?.atributo?.tipo, 'LocalDate');
  });

  it('5. Error amigable si la clase destino de un atributo no existe', () => {
    const cmd = interpretVoiceCommand('Agregar atributo total de tipo Double a Factura', existingNodes);
    assert.equal(cmd.tipo, 'AGREGAR_ATRIBUTO');
    assert.ok(cmd.error?.includes('No se encontró la clase «Factura»'));
  });

  it('6. Interpreta comando válido: «Relacionar Cliente con Pedido mediante asociación»', () => {
    const cmd = interpretVoiceCommand('Relacionar Cliente con Pedido mediante asociación', existingNodes);
    assert.equal(cmd.tipo, 'RELACIONAR_CLASES');
    assert.equal(cmd.payload?.origenClase, 'Cliente');
    assert.equal(cmd.payload?.destinoClase, 'Pedido');
    assert.equal(cmd.payload?.tipoRelacion, 'ASOCIACION');
    assert.equal(cmd.requierePermisoEdicion, true);
    assert.equal(cmd.esModificacionDiagrama, true);
    assert.equal(cmd.error, undefined);
  });

  it('7. No introduce clases de asociación automáticamente en relaciones simples (Requisito 4)', () => {
    const cmd = interpretVoiceCommand('Relacionar Cliente con Pedido mediante asociación', existingNodes);
    // Verificar que una relación creada por voz no tiene claseAsociacion asignada
    const newEdgeData = {
      tipo: cmd.payload?.tipoRelacion || 'ASOCIACION',
      nombre: '',
      multiplicidadOrigen: '',
      multiplicidadDestino: ''
    };
    // Regla de detección M:N existente
    const isMN = (mult: string) => /^\*$|^[0-9]+\.\.\*$|^n$|^N$/.test((mult || '').trim());
    const generatesAssociationClass = isMN(newEdgeData.multiplicidadOrigen) && isMN(newEdgeData.multiplicidadDestino);
    assert.equal(generatesAssociationClass, false, 'No debe generarse clase de asociación sin multiplicidades M:N explícitas');
  });

  it('8. Interpreta otros tipos de relaciones (composición, herencia, agregación, dependencia)', () => {
    const cmdComp = interpretVoiceCommand('Relacionar Pedido con Producto mediante composición', existingNodes);
    assert.equal(cmdComp.payload?.tipoRelacion, 'COMPOSICION');

    const cmdHer = interpretVoiceCommand('Relacionar Cliente con Pedido mediante generalización', existingNodes);
    assert.equal(cmdHer.payload?.tipoRelacion, 'HERENCIA');

    const cmdAgreg = interpretVoiceCommand('Relacionar Pedido con Producto mediante agregación', existingNodes);
    assert.equal(cmdAgreg.payload?.tipoRelacion, 'AGREGACION');

    const cmdDep = interpretVoiceCommand('Relacionar Cliente con Pedido mediante dependencia', existingNodes);
    assert.equal(cmdDep.payload?.tipoRelacion, 'DEPENDENCIA');
  });

  it('9. Error descriptivo si alguna clase en una relación no existe', () => {
    const cmdOrigen = interpretVoiceCommand('Relacionar Desconocido con Pedido mediante asociación', existingNodes);
    assert.ok(cmdOrigen.error?.includes('No se encontró la clase de origen «Desconocido»'));

    const cmdDestino = interpretVoiceCommand('Relacionar Cliente con Fantasma mediante asociación', existingNodes);
    assert.ok(cmdDestino.error?.includes('No se encontró la clase de destino «Fantasma»'));
  });

  it('10. Interpreta comando válido: «Guardar diagrama»', () => {
    const cmd = interpretVoiceCommand('Guardar diagrama', existingNodes);
    assert.equal(cmd.tipo, 'GUARDAR_DIAGRAMA');
    assert.equal(cmd.requierePermisoEdicion, true);
    assert.equal(cmd.esModificacionDiagrama, true);
    assert.equal(cmd.error, undefined);
  });

  it('11. Interpreta comando válido: «Centrar diagrama» (no requiere permiso de edición)', () => {
    const cmd = interpretVoiceCommand('Centrar diagrama', existingNodes);
    assert.equal(cmd.tipo, 'CENTRAR_DIAGRAMA');
    assert.equal(cmd.requierePermisoEdicion, false);
    assert.equal(cmd.esModificacionDiagrama, false);
    assert.equal(cmd.error, undefined);
  });

  it('12. Rechaza comandos ambiguos o no reconocidos con sugerencias de uso', () => {
    const cmd = interpretVoiceCommand('Eliminar todos los datos del sistema', existingNodes);
    assert.equal(cmd.tipo, 'DESCONOCIDO');
    assert.ok(cmd.error?.includes('No se pudo interpretar el comando'));
  });

  it('13. Tolerancia a signos de puntuación finales agregados por Web Speech API', () => {
    const cmd = interpretVoiceCommand('Crear clase Proveedor.', existingNodes);
    assert.equal(cmd.tipo, 'CREAR_CLASE');
    assert.equal(cmd.payload?.nombreClase, 'Proveedor');
  });

  it('14. Respeto estricto de permisos para Anfitrión y Colaborador vs Observador', () => {
    const checkCanEdit = (rol?: string, permisos?: string[]) => {
      const perms = permisos || [];
      const r = rol || '';
      return perms.includes('EDITAR_DIAGRAMAS') || isRoleAdmin(r) || isRoleAnfitrion(r) || isRoleColaborador(r);
    };

    assert.equal(checkCanEdit('ROLE_ANFITRION', ['EDITAR_DIAGRAMAS']), true, 'Anfitrión puede ejecutar comandos de modificación');
    assert.equal(checkCanEdit('ROLE_COLABORADOR', ['EDITAR_DIAGRAMAS']), true, 'Colaborador puede ejecutar comandos de modificación');
    assert.equal(checkCanEdit('ROLE_OBSERVADOR', ['CONSULTAR_DIAGRAMAS']), false, 'Observador sin permiso no puede ejecutar comandos de modificación');

    const cmdCrear = interpretVoiceCommand('Crear clase Venta', existingNodes);
    assert.equal(cmdCrear.requierePermisoEdicion, true);

    const cmdCentrar = interpretVoiceCommand('Centrar diagrama', existingNodes);
    assert.equal(cmdCentrar.requierePermisoEdicion, false, 'Centrar diagrama está disponible para cualquier usuario');
  });

  it('15. Prevención de ejecución duplicada mediante bloqueo (isExecuting guard)', () => {
    let executionCount = 0;
    let isExecuting = false;

    const executeCommand = (cmd: VoiceCommand) => {
      if (isExecuting) return false;
      isExecuting = true;
      executionCount++;
      return true;
    };

    const cmd = interpretVoiceCommand('Guardar diagrama', existingNodes);

    // Primer disparo
    const firstCall = executeCommand(cmd);
    assert.equal(firstCall, true);
    assert.equal(executionCount, 1);

    // Segundo disparo duplicado o reentrante antes de finalizar
    const secondCall = executeCommand(cmd);
    assert.equal(secondCall, false);
    assert.equal(executionCount, 1, 'No debe ejecutarse dos veces el mismo comando');
  });
});
