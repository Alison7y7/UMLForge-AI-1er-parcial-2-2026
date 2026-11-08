import test from 'node:test';
import assert from 'node:assert/strict';
import { formatActivityDate, mergeRecentActivity } from './projectActivity.ts';
import type { ProjectHistoryEvent } from '../types/projectHistory.ts';

const event = (id: string, fechaHora: string, diagramaId = 5): ProjectHistoryEvent => ({
  id, fechaHora, diagramaId, diagramaNombre: `Diagrama ${diagramaId}`,
  tipo: 'CAMBIO_UML', titulo: `Cambio ${id}`, detalle: id, estado: 'REGISTRADA'
});

test('muestra actividad de ayer y de días anteriores sin límite por antigüedad', () => {
  const now = new Date(2026, 10, 8, 12, 0);
  assert.match(formatActivityDate(new Date(2026, 10, 7, 18, 30).toISOString(), now), /^Ayer,/);
  assert.match(formatActivityDate(new Date(2026, 10, 3, 9, 15).toISOString(), now), /3 nov/i);
});

test('ordena las últimas actividades y elimina duplicados por ID', () => {
  const merged = mergeRecentActivity([
    event('ACTIVIDAD:1', '2026-11-05T10:00:00Z', 4),
    event('CHAT:2', '2026-11-08T10:00:00Z', 5),
    event('ACTIVIDAD:1', '2026-11-05T10:00:00Z', 4)
  ], [event('CHAT:3', '2026-11-07T10:00:00Z', 5)]);
  assert.deepEqual(merged.map(item => item.id), ['CHAT:2', 'CHAT:3', 'ACTIVIDAD:1']);
  assert.deepEqual(new Set(merged.map(item => item.diagramaId)), new Set([4, 5]));
});

test('proyecto sin eventos conserva un vacío legítimo', () => {
  assert.deepEqual(mergeRecentActivity([]), []);
});

test('colapsa decisión y bitácora de una misma recomendación confirmada', () => {
  const decision = { ...event('CHAT:10', '2026-11-08T10:00:00.100Z'), tipo: 'DECISION' as const,
    metadatos: { evento: 'recomendacion_aplicada' }, titulo: 'Decisión del proyecto' };
  const audit = { ...event('ACTIVIDAD:10', '2026-11-08T10:00:00.090Z'),
    titulo: 'APLICAR RECOMENDACION IA' };
  const result = mergeRecentActivity([audit, decision]);
  assert.deepEqual(result.map(item => item.id), ['CHAT:10']);
});
