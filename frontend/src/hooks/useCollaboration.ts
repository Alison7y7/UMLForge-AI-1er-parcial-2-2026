// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { stompService } from '../services/stompService';

export function useCollaboration(diagramaId: string | undefined) {
  const { token, user } = useAuthStore();
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [presenceReceived, setPresenceReceived] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [diagramModelUpdate, setDiagramModelUpdate] = useState<any | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Conectando...' | 'Sincronizado' | 'Reconectando...' | 'Sin conexión'>('Sin conexión');

  const handleRemoteEvent = useCallback((event: any) => {
    if (event.tipoEvento === 'PRESENCE_UPDATE') {
      setConnectedUsers(Array.isArray(event.payload) ? event.payload : []);
      setPresenceReceived(true);
      setConnectionStatus('Sincronizado');
      return;
    }

    if (event.tipoEvento === 'HISTORY_UPDATE') {
      setHistoryEvents(Array.isArray(event.payload) ? event.payload : []);
      return;
    }

    if (event.tipoEvento === 'DIAGRAM_MODEL_UPDATED') {
      setDiagramModelUpdate(event);
      return;
    }

    // Granular edit events are useful for activity/history, but they are not a
    // committed model. Applying them here used to make observers falsely dirty.
    // React Flow is reconciled only from DIAGRAM_MODEL_UPDATED (AFTER_COMMIT).
  }, []);

  useEffect(() => {
    if (!diagramaId || !token || !user) {
      setConnectedUsers([]);
      setPresenceReceived(false);
      setConnectionStatus('Sin conexión');
      return;
    }

    setConnectedUsers([]);
    setPresenceReceived(false);
    setConnectionStatus('Conectando...');

    const destination = `/topic/diagramas/${diagramaId}`;

    const unsubStatus = stompService.addStatusListener((status) => {
      setConnectionStatus(status);
      if (status === 'Sincronizado') {
        stompService.publish(`/app/diagramas/${diagramaId}/join`, {});
        stompService.publish(`/app/diagramas/${diagramaId}/presence`, {});
      } else {
        setPresenceReceived(false);
      }
    });

    const unsubTopic = stompService.subscribe(destination, (event) => {
      handleRemoteEvent(event);
    });

    if (stompService.getStatus() === 'Sincronizado') {
      stompService.publish(`/app/diagramas/${diagramaId}/join`, {});
      stompService.publish(`/app/diagramas/${diagramaId}/presence`, {});
    }

    return () => {
      unsubStatus();
      unsubTopic();
    };
  }, [diagramaId, token, user, handleRemoteEvent]);

  const broadcastEvent = useCallback((tipoEvento: string, elementoId: string, payload: any = null) => {
    stompService.publish(`/app/diagramas/${diagramaId}/event`, { tipoEvento, elementoId, payload });
  }, [diagramaId]);

  return {
    historyEvents,
    diagramModelUpdate,
    connectedUsers,
    presenceReceived,
    connectionStatus,
    broadcastEvent
  };
}
