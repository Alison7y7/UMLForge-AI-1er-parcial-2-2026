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
  const [presenceReceived, setPresenceReceived] = useState(false);
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
      setPresenceReceived(true);
      setConnectionStatus('Sincronizado');
      return;
    }

    if (event.tipoEvento === 'HISTORY_UPDATE') {
      setHistoryEvents(Array.isArray(event.payload) ? event.payload : []);
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

    let isIntentionalDisconnect = false;
    setConnectedUsers([]);
    setPresenceReceived(false);
    setConnectionStatus('Conectando...');

    const client = new Client({
      webSocketFactory: () => new SockJS(
        import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws-uml'
      ),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      onConnect: () => {
        if (isIntentionalDisconnect) {
          void client.deactivate();
          return;
        }

        setPresenceReceived(false);
        client.subscribe(`/topic/diagramas/${diagramaId}`, (message) => {
          if (isIntentionalDisconnect) return;
          const event = JSON.parse(message.body);
          handleRemoteEvent(event);
        });

        client.publish({ destination: `/app/diagramas/${diagramaId}/join`, body: JSON.stringify({}) });
        client.publish({ destination: `/app/diagramas/${diagramaId}/presence`, body: JSON.stringify({}) });
      },
      onStompError: () => {
        if (!isIntentionalDisconnect) {
          setPresenceReceived(false);
          setConnectionStatus('Sin conexión');
        }
      },
      onWebSocketClose: () => {
        if (!isIntentionalDisconnect) {
          setPresenceReceived(false);
          setConnectionStatus('Reconectando...');
        }
      }
    });

    clientRef.current = client;
    client.activate();

    return () => {
      isIntentionalDisconnect = true;
      if (clientRef.current === client) {
        clientRef.current = null;
      }
      void client.deactivate();
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
    presenceReceived,
    connectionStatus,
    broadcastEvent
  };
}
