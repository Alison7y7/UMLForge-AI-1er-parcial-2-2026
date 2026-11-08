import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/axios';
import { stompService } from '../services/stompService';
import type { ProjectHistoryEvent, ProjectHistoryResponse } from '../types/projectHistory';
import { mergeRecentActivity } from '../utils/projectActivity';

export function useProjectRecentActivity(projectId: number | null, committedDiagramSignal?: unknown) {
  const [events, setEvents] = useState<ProjectHistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (background = false) => {
    if (!projectId) return;
    if (!background) setLoading(true);
    try {
      const response = await api.get<ProjectHistoryResponse>(`/proyectos/${projectId}/historial`, {
        params: { limite: 10 }
      });
      if (!mountedRef.current) return;
      setEvents(mergeRecentActivity(response.data.eventos, [], 8));
      setError('');
    } catch (requestError: any) {
      if (!mountedRef.current) return;
      const status = requestError.response?.status;
      setError(status === 403
        ? 'No tienes permiso para consultar la actividad de este proyecto.'
        : 'No se pudo cargar la actividad reciente.');
    } finally {
      if (mountedRef.current && !background) setLoading(false);
    }
  }, [projectId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => void load(true), 250);
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    setEvents([]);
    setError('');
    void load();
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (committedDiagramSignal) scheduleRefresh();
  }, [committedDiagramSignal, scheduleRefresh]);

  useEffect(() => {
    if (!projectId) return;
    const unsubscribeChat = stompService.subscribe(`/topic/proyectos/${projectId}/chat`, scheduleRefresh);
    const unsubscribeStatus = stompService.addStatusListener(status => {
      if (status === 'Sincronizado') scheduleRefresh();
    });
    return () => {
      unsubscribeChat();
      unsubscribeStatus();
    };
  }, [projectId, scheduleRefresh]);

  return { events, loading, error, retry: () => load(false) };
}
