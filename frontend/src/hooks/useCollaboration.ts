// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';

export function useCollaboration(diagramaId: string | undefined) {
  const { token, user } = useAuthStore();
  const { nodes, edges, setNodes, setEdges } = useEditorStore();
  
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [lockedElements, setLockedElements] = useState<Record<string, string>>({}); // id -> userName
  const [connectionStatus, setConnectionStatus] = useState<'Sincronizado' | 'Reconectando...' | 'Sin conexiÃƒÆ’Ã‚Â³n'>('Sin conexiÃƒÆ’Ã‚Â³n');

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    if (!diagramaId || !token || !user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-uml'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (_str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnectionStatus('Sincronizado');
        
        client.subscribe(`/topic/diagramas/${diagramaId}`, (message) => {
          const event = JSON.parse(message.body);
          handleRemoteEvent(event);
        });

        // Join
        client.publish({ destination: `/app/diagramas/${diagramaId}/join`, body: JSON.stringify({}) });
      },
      onStompError: () => {
        setConnectionStatus('Sin conexiÃƒÆ’Ã‚Â³n');
      },
      onWebSocketClose: () => {
        setConnectionStatus('Reconectando...');
      }
    });

    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, [diagramaId, token]);

  const handleRemoteEvent = (event: any) => {
    if (event.usuarioId === user?.id && event.tipoEvento !== 'LOCK_ELEMENT' && event.tipoEvento !== 'UNLOCK_ELEMENT') {
      return; // Ignore own non-lock events
    }

    switch (event.tipoEvento) {
      case 'HISTORY_UPDATE':
        setHistoryEvents(event.payload || []);
        break;
      case 'PRESENCE_UPDATE':
        setConnectedUsers(event.payload || []);
        break;
      case 'LOCK_ELEMENT':
        setLockedElements(prev => ({ ...prev, [event.elementoId]: event.usuarioNombre }));
        break;
      case 'UNLOCK_ELEMENT':
        setLockedElements(prev => {
          const next = { ...prev };
          delete next[event.elementoId];
          return next;
        });
        break;
      case 'NODE_CREATED':
        setNodes([...nodesRef.current, event.payload]);
        break;
      case 'NODE_MOVED':
        setNodes(nodesRef.current.map(n => n.id === event.elementoId ? { ...n, position: event.payload } : n));
        break;
      case 'NODE_UPDATED':
        setNodes(nodesRef.current.map(n => n.id === event.elementoId ? { ...n, data: event.payload } : n));
        break;
      case 'NODE_DELETED':
        setNodes(nodesRef.current.filter(n => n.id !== event.elementoId));
        setEdges(edgesRef.current.filter(e => e.source !== event.elementoId && e.target !== event.elementoId));
        break;
      case 'EDGE_CREATED':
        setEdges([...edgesRef.current, event.payload]);
        break;
      case 'EDGE_UPDATED':
        setEdges(edgesRef.current.map(e => e.id === event.elementoId ? { ...e, data: event.payload } : e));
        break;
      case 'EDGE_DELETED':
        setEdges(edgesRef.current.filter(e => e.id !== event.elementoId));
        break;
      case 'EDGE_INVERTED':
        setEdges(edgesRef.current.map(e => e.id === event.elementoId ? { ...e, source: e.target, target: e.source, data: event.payload } : e));
        break;
    }
  };

  const broadcastEvent = (tipoEvento: string, elementoId: string, payload: any = null) => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: `/app/diagramas/${diagramaId}/event`,
        body: JSON.stringify({ tipoEvento, elementoId, payload })
      });
    }
  };

  const attemptLock = (elementoId: string) => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: `/app/diagramas/${diagramaId}/lock`,
        body: JSON.stringify({ tipoEvento: 'LOCK_ELEMENT', elementoId })
      });
    }
  };

  const releaseLock = (elementoId: string) => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: `/app/diagramas/${diagramaId}/lock`,
        body: JSON.stringify({ tipoEvento: 'UNLOCK_ELEMENT', elementoId })
      });
    }
  };

  return {
    historyEvents,
    connectedUsers,
    lockedElements,
    connectionStatus,
    broadcastEvent,
    attemptLock,
    releaseLock
  };
}





