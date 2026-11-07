// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';
import { stompService } from '../services/stompService';

export function useCollaboration(diagramaId: string | undefined) {
  const { token, user } = useAuthStore();
  const { nodes, edges, setNodes, setEdges } = useEditorStore();
  
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [presenceReceived, setPresenceReceived] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [diagramModelUpdate, setDiagramModelUpdate] = useState<any | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Conectando...' | 'Sincronizado' | 'Reconectando...' | 'Sin conexión'>('Sin conexión');

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const userRef = useRef(user);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

    if (event.usuarioId === userRef.current?.id) {
      return;
    }

    switch (event.tipoEvento) {
      case 'NODE_CREATED': {
        const nextNodes = [...nodesRef.current, event.payload];
        nodesRef.current = nextNodes;
        setNodes(nextNodes);
        break;
      }
      case 'NODE_MOVED': {
        const nextNodes = nodesRef.current.map(n => n.id === event.elementoId ? { ...n, position: event.payload } : n);
        nodesRef.current = nextNodes;
        setNodes(nextNodes);
        break;
      }
      case 'NODE_UPDATED': {
        const nextNodes = nodesRef.current.map(n => n.id === event.elementoId ? { ...n, data: { ...n.data, ...event.payload } } : n);
        nodesRef.current = nextNodes;
        setNodes(nextNodes);
        break;
      }
      case 'NODE_DELETED': {
        const nextNodes = nodesRef.current.filter(n => n.id !== event.elementoId);
        const nextEdges = edgesRef.current.filter(e => e.source !== event.elementoId && e.target !== event.elementoId);
        nodesRef.current = nextNodes;
        edgesRef.current = nextEdges;
        setNodes(nextNodes);
        setEdges(nextEdges);
        break;
      }
      case 'EDGE_CREATED': {
        const nextEdges = [...edgesRef.current, event.payload];
        edgesRef.current = nextEdges;
        setEdges(nextEdges);
        break;
      }
      case 'EDGE_UPDATED': {
        const nextEdges = edgesRef.current.map(e => e.id === event.elementoId ? { ...e, data: { ...e.data, ...event.payload } } : e);
        edgesRef.current = nextEdges;
        setEdges(nextEdges);
        break;
      }
      case 'EDGE_DELETED': {
        const nextEdges = edgesRef.current.filter(e => e.id !== event.elementoId);
        edgesRef.current = nextEdges;
        setEdges(nextEdges);
        break;
      }
      case 'EDGE_INVERTED': {
        const nextEdges = edgesRef.current.map(e => e.id === event.elementoId ? { ...e, source: e.target, target: e.source, data: { ...e.data, ...event.payload } } : e);
        edgesRef.current = nextEdges;
        setEdges(nextEdges);
        break;
      }
    }
  }, [setNodes, setEdges]);

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
