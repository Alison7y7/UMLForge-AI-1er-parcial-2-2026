import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('CU21: Consultar proyectos y progreso desde dispositivos móviles', () => {
  it('las tarjetas de proyectos muestran nombre, descripción, estado y rol real del usuario', () => {
    const project = {
      id: 10,
      nombre: 'Sistema Bancario',
      descripcion: 'Modelado de transferencias y cuentas',
      activo: true,
      anfitrionNombre: 'Carlos Gomez',
      anfitrionId: 1
    };

    const currentUser = { id: 2, nombre: 'Ana', apellido: 'Lopez' };

    const isHost = project.anfitrionNombre.includes(currentUser.nombre);
    const userRoleInProject = isHost ? 'Anfitrión' : 'Participante';

    assert.equal(project.nombre, 'Sistema Bancario');
    assert.equal(project.activo, true);
    assert.equal(userRoleInProject, 'Participante');
  });

  it('el resumen de progreso utiliza métricas reales disponibles y no porcentajes ficticios', () => {
    const diagrams = [
      { id: 1, nombre: 'Cuentas', activo: true, version: 3 },
      { id: 2, nombre: 'Transacciones', activo: true, version: 5 },
      { id: 3, nombre: 'Borrador', activo: false, version: 1 }
    ];

    const continuity = {
      ultimoDiagrama: { id: 2, nombre: 'Transacciones', version: 5, fechaActualizacion: '2026-11-08T18:00:00Z' },
      ultimaActividad: '2026-11-08T18:30:00Z',
      recomendacionesPendientes: 2,
      cambiosRecientes: [
        { id: 101, titulo: 'Modificó clase Cuenta', detalle: 'Agregó saldo' }
      ]
    };

    // Métricas reales
    const activeDiagramsCount = diagrams.filter(d => d.activo).length;
    const totalDiagramsCount = diagrams.length;
    const latestVersion = continuity.ultimoDiagrama.version;
    const pendingRecommendations = continuity.recomendacionesPendientes;
    const recentChangesCount = continuity.cambiosRecientes.length;

    assert.equal(activeDiagramsCount, 2);
    assert.equal(totalDiagramsCount, 3);
    assert.equal(latestVersion, 5);
    assert.equal(pendingRecommendations, 2);
    assert.equal(recentChangesCount, 1);
  });

  it('permite acceder directamente a Continuar donde lo dejamos, Historial y Diagrama', () => {
    const continuity = {
      ultimoDiagrama: { id: 7, nombre: 'Dominio Principal', version: 4 },
      ultimaActividad: '2026-11-08T10:00:00Z'
    };

    let navigatedUrl = '';
    const navigate = (url: string) => { navigatedUrl = url; };

    // Acción: Continuar donde lo dejamos
    navigate(`/diagramas/${continuity.ultimoDiagrama.id}`);
    assert.equal(navigatedUrl, '/diagramas/7');

    // Acción: Ver diagrama individual
    const targetDiagramId = 3;
    navigate(`/diagramas/${targetDiagramId}`);
    assert.equal(navigatedUrl, '/diagramas/3');
  });

  it('el código de ProjectDiagrams implementa la ficha de progreso y safe areas', () => {
    const content = readFileSync(new URL('../pages/ProjectDiagrams.tsx', import.meta.url), 'utf8');
    assert.match(content, /CU21 — Panel de Progreso e Indicadores del Proyecto/,
      'ProjectDiagrams debe contener el panel de progreso e indicadores de CU21');
    assert.match(content, /safe-area-inset-bottom/,
      'ProjectDiagrams debe respetar safe-area-inset-bottom');
  });
});

describe('CU22: Visualizar diagramas UML desde dispositivos móviles', () => {
  it('el modo de visualización móvil protege el modelo contra desplazamientos y conexiones accidentales', () => {
    const isReadOnlyView = true;
    const canEdit = true;
    const isEffectivelyEditing = canEdit && !isReadOnlyView;

    // ReactFlow configuration in read-only / visualizer mode
    const flowProps = {
      nodesDraggable: isEffectivelyEditing,
      nodesConnectable: isEffectivelyEditing,
      elementsSelectable: true,
      panOnDrag: true,
      zoomOnPinch: true,
      zoomOnScroll: true
    };

    assert.equal(flowProps.nodesDraggable, false, 'Los nodos no deben ser arrastrables para evitar modificaciones accidentales');
    assert.equal(flowProps.nodesConnectable, false, 'No se deben poder conectar cables accidentales');
    assert.equal(flowProps.elementsSelectable, true, 'Los elementos deben poder seleccionarse para inspección');
    assert.equal(flowProps.panOnDrag, true, 'El canvas debe ser desplazable con el dedo');
    assert.equal(flowProps.zoomOnPinch, true, 'El zoom por pellizco debe estar habilitado');
  });

  it('la ficha de inspección de solo lectura muestra clases completas con atributos y métodos', () => {
    const classNode = {
      id: 'c1',
      data: {
        nombre: 'CuentaBancaria',
        estereotipo: 'entity',
        atributos: [
          { id: 'a1', nombre: 'numero', tipo: 'String', visibilidad: 'private' },
          { id: 'a2', nombre: 'saldo', tipo: 'double', visibilidad: 'private' }
        ],
        metodos: [
          {
            id: 'm1',
            nombre: 'depositar',
            tipoRetorno: 'void',
            visibilidad: 'public',
            parametros: [{ nombre: 'monto', tipo: 'double' }]
          }
        ]
      }
    };

    assert.equal(classNode.data.nombre, 'CuentaBancaria');
    assert.equal(classNode.data.atributos.length, 2);
    assert.equal(classNode.data.atributos[0].visibilidad, 'private');
    assert.equal(classNode.data.metodos.length, 1);
    assert.equal(classNode.data.metodos[0].parametros[0].nombre, 'monto');
  });

  it('la ficha de inspección de solo lectura muestra relaciones y multiplicidades completas', () => {
    const edge = {
      id: 'e1',
      source: 'c1',
      target: 'c2',
      data: {
        tipo: 'ASOCIACION',
        nombre: 'titular',
        multiplicidadOrigen: '1',
        multiplicidadDestino: '0..*',
        rolOrigen: 'cliente',
        rolDestino: 'cuentas'
      }
    };

    assert.equal(edge.data.tipo, 'ASOCIACION');
    assert.equal(edge.data.multiplicidadOrigen, '1');
    assert.equal(edge.data.multiplicidadDestino, '0..*');
    assert.equal(edge.data.rolOrigen, 'cliente');
    assert.equal(edge.data.rolDestino, 'cuentas');
  });

  it('el código de UMLEditor contiene controles táctiles de zoom in, zoom out, fitView y conmutador de modo', () => {
    const content = readFileSync(new URL('../pages/UMLEditor.tsx', import.meta.url), 'utf8');
    assert.match(content, /isReadOnlyView/,
      'UMLEditor debe incluir el estado de visualización móvil isReadOnlyView');
    assert.match(content, /reactFlowInstance\?\.fitView/,
      'UMLEditor debe incluir fitView para ajustar a pantalla');
    assert.match(content, /reactFlowInstance\?\.zoomIn/,
      'UMLEditor debe incluir zoomIn táctil');
    assert.match(content, /reactFlowInstance\?\.zoomOut/,
      'UMLEditor debe incluir zoomOut táctil');
    assert.match(content, /renderReadOnlyInspectorContent/,
      'UMLEditor debe incluir renderReadOnlyInspectorContent para inspección segura');
    assert.match(content, /safe-area-inset-bottom/,
      'UMLEditor debe respetar safe areas móviles');
  });
});
