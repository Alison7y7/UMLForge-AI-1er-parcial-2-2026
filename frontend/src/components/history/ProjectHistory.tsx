import { useCallback, useEffect, useState } from 'react';
import { Bot, CheckCircle2, Clock3, FileClock, GitBranch, MessageSquare, Search } from 'lucide-react';
import { api } from '../../api/axios';
import type { ProjectHistoryEvent, ProjectHistoryResponse } from '../../types/projectHistory';

interface Props {
  projectId: number | string;
  participants: Array<{ id: number; nombre?: string; apellido?: string }>;
  diagrams: Array<{ id: number; nombre: string }>;
  onOpenDiagram: (id: number) => void;
}

const iconFor = (type: ProjectHistoryEvent['tipo']) => {
  if (type === 'RESPUESTA_IA') return Bot;
  if (type === 'CONVERSACION') return MessageSquare;
  if (type === 'CAMBIO_UML') return GitBranch;
  if (type === 'DECISION') return CheckCircle2;
  return FileClock;
};

export default function ProjectHistory({ projectId, participants, diagrams, onOpenDiagram }: Props) {
  const [events, setEvents] = useState<ProjectHistoryEvent[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', type: '', participant: '', diagram: '', from: '', to: '' });

  const downloadAttachment = async (url: string, name: string) => {
    const apiPath = url.startsWith('/api/') ? url.slice(4) : url;
    const response = await api.get(apiPath, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const load = useCallback(async (next?: string, append = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ProjectHistoryResponse>(`/proyectos/${projectId}/historial`, {
        params: {
          cursor: next || undefined,
          limite: 30,
          busqueda: filters.search || undefined,
          tipo: filters.type || undefined,
          participanteId: filters.participant || undefined,
          diagramaId: filters.diagram || undefined,
          desde: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
          hasta: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
        },
      });
      setEvents(previous => append
        ? [...previous, ...response.data.eventos.filter(item => !previous.some(old => old.id === item.id))]
        : response.data.eventos);
      setCursor(response.data.siguienteCursor);
      setHasMore(response.data.hayMas);
    } catch (requestError: any) {
      const status = requestError.response?.status;
      setError(requestError.response?.data?.message
        || (status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
          : status === 403 ? 'No tienes permiso para consultar el historial de este proyecto.'
          : status === 404 ? 'El proyecto solicitado ya no existe.'
          : status && status >= 500 ? 'El servidor no pudo consultar el historial. Reintenta o revisa los logs del backend.'
          : 'No se pudo cargar el historial del proyecto.'));
    } finally {
      setLoading(false);
    }
  }, [filters, projectId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <section className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-text-dark">Historial y actividad</h2>
        <p className="text-sm text-gray-500 mt-1">Conversaciones, decisiones y cambios persistidos del proyecto.</p>
      </div>
      <div className="bg-white/80 border border-white rounded-3xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
        <label className="relative sm:col-span-2">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input aria-label="Buscar en historial" value={filters.search}
            onChange={event => setFilters(value => ({ ...value, search: event.target.value }))}
            placeholder="Buscar mensajes o cambios" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm" />
        </label>
        <select aria-label="Filtrar por tipo" value={filters.type}
          onChange={event => setFilters(value => ({ ...value, type: event.target.value }))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos los tipos</option><option value="CONVERSACION">Conversación</option>
          <option value="RESPUESTA_IA">Respuesta IA</option><option value="DECISION">Decisión</option>
          <option value="CAMBIO_UML">Cambio UML</option><option value="ACTIVIDAD">Actividad</option>
        </select>
        <select aria-label="Filtrar por participante" value={filters.participant}
          onChange={event => setFilters(value => ({ ...value, participant: event.target.value }))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos los participantes</option>
          {participants.map(item => <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>)}
        </select>
        <select aria-label="Filtrar por diagrama" value={filters.diagram}
          onChange={event => setFilters(value => ({ ...value, diagram: event.target.value }))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Todos los diagramas</option>
          {diagrams.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
        <input aria-label="Fecha desde" type="date" value={filters.from}
          onChange={event => setFilters(value => ({ ...value, from: event.target.value }))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
        <input aria-label="Fecha hasta" type="date" value={filters.to}
          onChange={event => setFilters(value => ({ ...value, to: event.target.value }))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>{error}</span>
        <button type="button" onClick={() => void load()} className="px-4 py-2 rounded-xl bg-white border border-red-200 font-bold text-red-700">Reintentar</button>
      </div>}
      {!loading && !error && events.length === 0 && <div className="p-10 bg-white/70 rounded-3xl text-center text-gray-500">
        {Object.values(filters).some(Boolean) ? 'No hay actividad que coincida con los filtros.' : 'Todavía no hay actividad registrada.'}
      </div>}
      <div className="space-y-3">
        {events.map(event => {
          const Icon = iconFor(event.tipo);
          const recommendations = Array.isArray(event.metadatos?.recomendaciones) ? event.metadatos.recomendaciones : [];
          return <article key={event.id} className="bg-white/85 border border-white rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-lila-light/60 text-lila-main flex items-center justify-center"><Icon className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="font-bold text-text-dark">{event.titulo}</h3><p className="text-xs text-gray-500">{event.participanteNombre || 'Sistema'}</p></div>
                  <time className="text-xs text-gray-400 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{new Date(event.fechaHora).toLocaleString()}</time>
                </div>
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap break-words">{event.detalle}</p>
                {event.adjuntos && event.adjuntos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                  {event.adjuntos.map(attachment => <button key={attachment.id} type="button"
                    onClick={() => void downloadAttachment(attachment.contenidoUrl, attachment.nombre)}
                    className="px-3 py-2 rounded-xl bg-pink-light/40 text-pink-700 text-xs font-semibold border border-pink-100">
                    {attachment.nombre}
                  </button>)}
                </div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{event.tipo.replace('_', ' ')}</span>
                  {event.diagramaId && <button type="button" onClick={() => onOpenDiagram(event.diagramaId!)} className="text-[11px] font-bold px-2 py-1 rounded-full bg-lila-light text-lila-main">Abrir {event.diagramaNombre || 'diagrama'}</button>}
                </div>
                {recommendations.length > 0 && <div className="mt-3 grid gap-2">
                  {recommendations.map((item: any) => <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs">
                    <div className="flex justify-between gap-2"><span className="font-semibold text-gray-700">{item.descripcion}</span><span className="font-bold text-lila-main">{item.estadoHistorial}</span></div>
                  </div>)}
                </div>}
              </div>
            </div>
          </article>;
        })}
      </div>
      {loading && <div className="text-center py-6 text-sm text-gray-500">Cargando actividad…</div>}
      {hasMore && !loading && <button type="button" onClick={() => void load(cursor, true)} className="w-full py-3 rounded-2xl bg-white text-lila-main font-bold border border-lila-light">Cargar actividad anterior</button>}
    </section>
  );
}
