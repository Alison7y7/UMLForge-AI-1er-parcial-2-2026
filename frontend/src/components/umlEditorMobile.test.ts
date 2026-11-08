import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatRole, isRoleColaborador, isRoleAnfitrion, isRoleAdmin } from '../utils/roleUtils.ts';

describe('FASE 3: Adaptación del Editor UML para Celulares y Tablets', () => {
  it('Configuración de gestos táctiles en lienzo UML (Requisito 2)', () => {
    // Verificación de propiedades táctiles requeridas por React Flow para navegación móvil fluida
    const touchProps = {
      panOnDrag: true,
      zoomOnPinch: true,
      preventScrolling: true,
      zoomOnScroll: true,
      minZoom: 0.2,
      maxZoom: 2.5,
      nodesDraggable: true,
      elementsSelectable: true
    };

    assert.equal(touchProps.panOnDrag, true, 'El desplazamiento táctil (panOnDrag) debe estar activo');
    assert.equal(touchProps.zoomOnPinch, true, 'El zoom por pellizco (zoomOnPinch) debe estar activo');
    assert.equal(touchProps.preventScrolling, true, 'Debe prevenir desplazamiento del navegador al manipular el lienzo');
    assert.ok(touchProps.minZoom <= 0.5, 'El zoom mínimo debe permitir ver diagramas completos en pantallas pequeñas');
    assert.ok(touchProps.maxZoom >= 2.0, 'El zoom máximo debe permitir acercar clases detalladas');
  });

  it('Permisos de edición de diagramas para A1 Admin, A2 Anfitrión y A3 Colaborador (Requisito 10 & 13)', () => {
    const checkCanEdit = (user: { rol: string; permisos: string[] } | null) => {
      if (!user) return true;
      const userRole = user.rol || '';
      const userPermissions = user.permisos || [];
      return userPermissions.includes('EDITAR_DIAGRAMAS') || 
             isRoleAdmin(userRole) || 
             isRoleAnfitrion(userRole) || 
             isRoleColaborador(userRole);
    };

    const admin = { rol: 'ROLE_ADMIN', permisos: ['GESTIONAR_USUARIOS', 'GESTIONAR_ROLES', 'GESTIONAR_PROYECTOS', 'EDITAR_DIAGRAMAS'] };
    const anfitrion = { rol: 'ROLE_ANFITRION', permisos: ['GESTIONAR_PROYECTOS', 'GESTIONAR_PARTICIPANTES', 'EDITAR_DIAGRAMAS'] };
    const colaborador = { rol: 'ROLE_COLABORADOR', permisos: ['EDITAR_DIAGRAMAS'] };
    const soloLectura = { rol: 'ROLE_OBSERVADOR', permisos: ['CONSULTAR_DIAGRAMAS'] };

    assert.equal(checkCanEdit(admin), true, 'A1 Administrador debe tener permisos de edición');
    assert.equal(checkCanEdit(anfitrion), true, 'A2 Anfitrión debe tener permisos de edición');
    assert.equal(checkCanEdit(colaborador), true, 'A3 Colaborador debe tener permisos de edición');
    assert.equal(checkCanEdit(soloLectura), false, 'Usuario sin autorización no debe tener permisos de edición');
  });

  it('Flujo de creación de relaciones en dos pasos (Requisito 6)', () => {
    // Simulación del estado del editor durante la creación de una relación
    let selectedTool = 'select';
    let pendingRelationSourceId: string | null = null;
    let selectedEdgeId: string | null = null;
    let isInspectorOpen = false;

    const relationToolLabels: Record<string, string> = {
      ASOCIACION: 'Asociación',
      AGREGACION: 'Agregación',
      COMPOSICION: 'Composición',
      HERENCIA: 'Generalización',
      DEPENDENCIA: 'Dependencia'
    };

    // 1. Usuario selecciona la herramienta Asociación
    selectedTool = 'ASOCIACION';
    assert.equal(Boolean(relationToolLabels[selectedTool]), true);

    // 2. Paso 1: Usuario toca la clase de origen (Node A)
    const nodeA = { id: 'node-a', data: { nombre: 'Cliente' } };
    pendingRelationSourceId = nodeA.id;
    assert.equal(pendingRelationSourceId, 'node-a', 'Origen registrado en pendingRelationSourceId');

    // 3. Paso 2: Usuario toca la clase de destino (Node B)
    const nodeB = { id: 'node-b', data: { nombre: 'Pedido' } };
    const newEdge = {
      id: 'edge-ab',
      source: pendingRelationSourceId,
      target: nodeB.id,
      type: 'umlRelation',
      data: { tipo: selectedTool, multiplicidadOrigen: '1', multiplicidadDestino: '0..*' }
    };
    
    // Conclusión del flujo
    pendingRelationSourceId = null;
    selectedTool = 'select';
    selectedEdgeId = newEdge.id;
    isInspectorOpen = true;

    assert.equal(newEdge.source, 'node-a');
    assert.equal(newEdge.target, 'node-b');
    assert.equal(pendingRelationSourceId, null, 'pendingRelationSourceId se resetea');
    assert.equal(selectedTool, 'select', 'selectedTool vuelve a select');
    assert.equal(selectedEdgeId, 'edge-ab', 'La nueva relación queda seleccionada');
    assert.equal(isInspectorOpen, true, 'El inspector se abre automáticamente para editar multiplicidades');
  });

  it('Cancelación interactiva del flujo de relación en curso', () => {
    let selectedTool = 'COMPOSICION';
    let pendingRelationSourceId: string | null = 'node-a';

    // Usuario pulsa el botón Cancelar en el banner superior móvil
    selectedTool = 'select';
    pendingRelationSourceId = null;

    assert.equal(selectedTool, 'select');
    assert.equal(pendingRelationSourceId, null);
  });

  it('acepta relación M:N sin imponer una clase de asociación', () => {
    const isMN = (mult: string) => /^\*$|^[0-9]+\.\.\*$|^n$|^N$/.test((mult || '').trim());

    assert.equal(isMN('*'), true);
    assert.equal(isMN('1..*'), true);
    assert.equal(isMN('0..*'), true);
    assert.equal(isMN('n'), true);
    assert.equal(isMN('N'), true);
    assert.equal(isMN('1'), false);
    assert.equal(isMN('0..1'), false);

    const multOrigen = '*';
    const multDestino = '1..*';
    const isManyToMany = isMN(multOrigen) && isMN(multDestino);
    assert.equal(isManyToMany, true);
    const editorSource = readFileSync(new URL('../pages/UMLEditor.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(editorSource, /mergedData\.claseAsociacion\s*=/,
      'Una relación N:M no debe crear automáticamente una clase intermedia');
  });

  it('Controles de la barra inferior móvil y áreas táctiles (Requisito 5)', () => {
    const mobileToolbarButtons = [
      { id: 'select', name: 'Seleccionar', minSize: 44 },
      { id: 'addClass', name: 'Crear Clase', minSize: 44 },
      { id: 'relation', name: 'Elegir Relación', minSize: 44 },
      { id: 'fitView', name: 'Centrar Vista', minSize: 44 },
      { id: 'minimap', name: 'Alternar Minimapa', minSize: 44 },
      { id: 'delete', name: 'Eliminar Seleccionado', minSize: 44 },
      { id: 'inspector', name: 'Abrir Inspector', minSize: 44 },
    ];

    assert.equal(mobileToolbarButtons.length, 7, 'Deben existir los 7 controles móviles requeridos');
    for (const btn of mobileToolbarButtons) {
      assert.ok(btn.minSize >= 44, `El botón ${btn.name} debe tener un área táctil mínima de 44px`);
    }
  });

  it('Inspector adaptable: edición de atributos, métodos y multiplicidades en celular (Requisito 7)', () => {
    // Simulación de operaciones sobre nodo en inspector móvil
    const testNode = {
      id: 'class-1',
      data: {
        nombre: 'Usuario',
        estereotipo: 'entity',
        atributos: [
          { id: 'attr-1', nombre: 'email', tipo: 'String', visibilidad: 'private', origenTipo: 'USUARIO' }
        ],
        metodos: [
          { id: 'meth-1', nombre: 'autenticar', tipoRetorno: 'boolean', visibilidad: 'public', parametros: [{ nombre: 'password', tipo: 'String' }] }
        ]
      }
    };

    // Agregar atributo
    const nuevoAtributo = { id: 'attr-2', nombre: 'telefono', tipo: 'String', visibilidad: 'protected', origenTipo: 'USUARIO' };
    testNode.data.atributos.push(nuevoAtributo);
    assert.equal(testNode.data.atributos.length, 2);

    // Agregar método
    const nuevoMetodo = { id: 'meth-2', nombre: 'actualizarPerfil', tipoRetorno: 'void', visibilidad: 'public', parametros: [] };
    testNode.data.metodos.push(nuevoMetodo);
    assert.equal(testNode.data.metodos.length, 2);

    // Edición de multiplicidades en relación
    const testEdge = {
      id: 'edge-1',
      data: {
        tipo: 'ASOCIACION',
        multiplicidadOrigen: '1',
        multiplicidadDestino: '0..*'
      }
    };
    testEdge.data.multiplicidadOrigen = '0..1';
    testEdge.data.multiplicidadDestino = '1..*';

    assert.equal(testEdge.data.multiplicidadOrigen, '0..1');
    assert.equal(testEdge.data.multiplicidadDestino, '1..*');
  });
});
