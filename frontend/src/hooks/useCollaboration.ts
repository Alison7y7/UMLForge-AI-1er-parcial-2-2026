// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';

export function useCollaboration(diagramaId: string | undefined) {
  const { token, user } = useAuthStore();
  const { nodes, edges, setNodes, setEdges } = useEditorStore();
  
  const clientRef = useRef<Client | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
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
      setConnectionStatus('Sincronizado');
      return;
    }

    if (event.tipoEvento === 'HISTORY_UPDATE') {
      setHistoryEvents(event.payload || []);
      return;
    }

    if (event.usuarioId === userRef.current?.id) {
      return;
    }

    switch (event.tipoEvento) {
      case 'NODE_CREATED':
        setNodes([...nodesRef.current, event.payload]);
        break;
      case 'NODE_MOVED':
        setNodes(nodesRef.current.map(n => n.id === event.elementoId ? { ...n, position: event.payload } : n));
        break;
      case 'NODE_UPDATED':
        setNodes(nodesRef.current.map(n => n.id === event.elementoId ? { ...n, data: { ...n.data, ...event.payload } } : n));
        break;
      case 'NODE_DELETED':
        setNodes(nodesRef.current.filter(n => n.id !== event.elementoId));
        setEdges(edgesRef.current.filter(e => e.source !== event.elementoId && e.target !== event.elementoId));
        break;
      case 'EDGE_CREATED':
        setEdges([...edgesRef.current, event.payload]);
        break;
      case 'EDGE_UPDATED':
        setEdges(edgesRef.current.map(e => e.id === event.elementoId ? { ...e, data: { ...e.data, ...event.payload } } : e));
        break;
      case 'EDGE_DELETED':
        setEdges(edgesRef.current.filter(e => e.id !== event.elementoId));
        break;
      case 'EDGE_INVERTED':
        setEdges(edgesRef.current.map(e => e.id === event.elementoId ? { ...e, source: e.target, target: e.source, data: { ...e.data, ...event.payload } } : e));
        break;
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!diagramaId || !token || !user) return;

    let isIntentionalDisconnect = false;
    setConnectionStatus('Conectando...');

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-uml'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/diagramas/${diagramaId}`, (message) => {
          const event = JSON.parse(message.body);
          handleRemoteEvent(event);
        });

        client.publish({ destination: `/app/diagramas/${diagramaId}/join`, body: JSON.stringify({}) });
        client.publish({ destination: `/app/diagramas/${diagramaId}/presence`, body: JSON.stringify({}) });
      },
      onStompError: () => {
        if (!isIntentionalDisconnect) setConnectionStatus('Sin conexión');
      },
      onWebSocketClose: () => {
        if (!isIntentionalDisconnect) setConnectionStatus('Reconectando...');
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      isIntentionalDisconnect = true;
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [diagramaId, token, user, handleRemoteEvent]);

  const broadcastEvent = useCallback((tipoEvento: string, elementoId: string, payload: any = null) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: `/app/diagramas/${diagramaId}/event`,
        body: JSON.stringify({ tipoEvento, elementoId, payload })
      });
    }
  }, [diagramaId]);

  return {
    historyEvents,
    connectedUsers,
    connectionStatus,
    broadcastEvent
  };
}
