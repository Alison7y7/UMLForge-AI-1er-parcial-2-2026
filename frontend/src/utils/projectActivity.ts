import type { ProjectHistoryEvent } from '../types/projectHistory';

export const mergeRecentActivity = (
  incoming: ProjectHistoryEvent[],
  current: ProjectHistoryEvent[] = [],
  limit = 8
): ProjectHistoryEvent[] => {
  const byId = new Map<string, ProjectHistoryEvent>();
  [...current, ...incoming].forEach(event => {
    if (event?.id) byId.set(event.id, event);
  });
  const ordered = [...byId.values()]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
      || b.id.localeCompare(a.id));
  const uniqueActions: ProjectHistoryEvent[] = [];
  for (const event of ordered) {
    if (!uniqueActions.some(previous => sameConfirmedAction(previous, event))) uniqueActions.push(event);
    if (uniqueActions.length === limit) break;
  }
  return uniqueActions;
};

const actionKind = (event: ProjectHistoryEvent): string => {
  const eventName = String(event.metadatos?.evento || '').toUpperCase();
  const title = event.titulo.toUpperCase();
  if (eventName.includes('RECOMENDACION') && eventName.includes('APLICAD')) return 'RECOMENDACION_APLICADA';
  if (title.includes('APLICAR RECOMENDACION')) return 'RECOMENDACION_APLICADA';
  if (title.includes('ELIMINAR CLASE') || title.includes('ELIMINAR RELACION')) return 'ELIMINACION';
  if (title.includes('MODIFICAR DIAGRAMA')) return 'MODIFICACION_GENERICA';
  return '';
};

const sameConfirmedAction = (first: ProjectHistoryEvent, second: ProjectHistoryEvent): boolean => {
  const firstKind = actionKind(first);
  const secondKind = actionKind(second);
  if (!firstKind || !secondKind || first.diagramaId !== second.diagramaId) return false;
  const closeInTime = Math.abs(new Date(first.fechaHora).getTime() - new Date(second.fechaHora).getTime()) <= 2_000;
  if (!closeInTime) return false;
  if (firstKind === 'RECOMENDACION_APLICADA' && secondKind === firstKind) return true;
  return new Set([firstKind, secondKind]).has('ELIMINACION')
    && new Set([firstKind, secondKind]).has('MODIFICACION_GENERICA');
};

export const formatActivityDate = (iso: string, now = new Date()): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((startToday.getTime() - startDate.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  if (dayDifference === 0) return `Hoy, ${time}`;
  if (dayDifference === 1) return `Ayer, ${time}`;
  return date.toLocaleString('es-BO', {
    day: 'numeric', month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    hour: '2-digit', minute: '2-digit'
  });
};
