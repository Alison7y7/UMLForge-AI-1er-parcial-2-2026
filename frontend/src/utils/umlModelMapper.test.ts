import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUmlModel, relationData } from './umlModelMapper.ts';

test('preserva claseAsociacion al construir, serializar, cargar e importar el modelo', () => {
  const nodes = [
    { id: 'VENTA_ID', position: { x: 10, y: 20 }, data: { nombre: 'Venta', atributos: [], metodos: [] } },
    { id: 'PRODUCTO_ID', position: { x: 300, y: 20 }, data: { nombre: 'Producto', atributos: [], metodos: [] } },
    { id: 'DETALLE_ID', position: { x: 150, y: 180 }, data: { nombre: 'Detalle', atributos: [], metodos: [] } }
  ];
  const edges = [{
    id: 'RELACION_ID',
    source: 'VENTA_ID',
    target: 'PRODUCTO_ID',
    data: {
      tipo: 'ASOCIACION',
      multiplicidadOrigen: '*',
      multiplicidadDestino: '0..*',
      claseAsociacion: 'DETALLE_ID'
    }
  }];

  const model = buildUmlModel(nodes, edges);
  assert.equal(model.relaciones.length, 1);
  assert.deepEqual(
    {
      source: model.relaciones[0].origen,
      target: model.relaciones[0].destino,
      claseAsociacion: model.relaciones[0].claseAsociacion
    },
    { source: 'VENTA_ID', target: 'PRODUCTO_ID', claseAsociacion: 'DETALLE_ID' }
  );

  const persisted = JSON.parse(JSON.stringify(model));
  assert.equal(persisted.relaciones[0].claseAsociacion, 'DETALLE_ID');
  assert.equal(relationData(persisted.relaciones[0]).claseAsociacion, 'DETALLE_ID');
});
