import fs from 'node:fs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const apiBase = 'http://localhost/api';
const wsUrl = 'http://localhost/ws-uml';
const projectId = 2;
const diagramId = 4;
const accounts = [
  'AlejandroAdmin@gmail.com',
  'NoeAliAnfitrion@gmail.com',
  'ElenaColaborador@gmail.com',
];

const credentialsSource = fs.readFileSync(
  new URL('../src/components/demo/DemoCredentialsAccordion.tsx', import.meta.url),
  'utf8'
);
const password = credentialsSource.match(/TEMPORAL_PASSWORD\s*=\s*'([^']+)'/)?.[1];
if (!password) throw new Error('No se pudo obtener la credencial local de demostracion');

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${path} respondio ${response.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}

async function login(email) {
  const auth = await jsonRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo: email, password }),
  });
  return auth.token;
}

function waitUntil(predicate, timeoutMs, description) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timeout esperando ${description}`));
      }
    }, 50);
  });
}

function connectParticipant(email, token) {
  const state = { email, chatIds: new Set(), maxPresence: 0 };
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 0,
  });

  const connected = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout STOMP para ${email}`)), 15000);
    client.onConnect = () => {
      client.subscribe(`/topic/proyectos/${projectId}/chat`, (message) => {
        const payload = JSON.parse(message.body);
        if (payload?.id) state.chatIds.add(Number(payload.id));
      });
      client.subscribe(`/topic/diagramas/${diagramId}`, (message) => {
        const payload = JSON.parse(message.body);
        if (payload?.tipoEvento === 'PRESENCE_UPDATE' && Array.isArray(payload.payload)) {
          state.maxPresence = Math.max(state.maxPresence, payload.payload.length);
        }
      });
      clearTimeout(timeout);
      resolve();
    };
    client.onStompError = (frame) => reject(new Error(frame.headers.message || 'Error STOMP'));
    client.onWebSocketError = () => reject(new Error(`Error WebSocket para ${email}`));
  });

  client.activate();
  return { client, state, connected };
}

const tokens = new Map();
for (const email of accounts) tokens.set(email, await login(email));

const participants = accounts.map((email) => connectParticipant(email, tokens.get(email)));
try {
  await Promise.all(participants.map((participant) => participant.connected));
  for (const { client } of participants) {
    client.publish({ destination: `/app/diagramas/${diagramId}/join`, body: '{}' });
    client.publish({ destination: `/app/diagramas/${diagramId}/presence`, body: '{}' });
  }

  await waitUntil(
    () => participants.every(({ state }) => state.maxPresence >= accounts.length),
    10000,
    'presencia de los tres participantes'
  );

  const runId = Date.now();
  const sentMessages = [];
  for (const email of accounts) {
    sentMessages.push(
      await jsonRequest(`/proyectos/${projectId}/chat/mensajes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.get(email)}` },
        body: JSON.stringify({
          contenido: `CU16-STOMP-${runId} mensaje de ${email}`,
          metadatos: { prueba: 'CU16-STOMP', runId },
        }),
      })
    );
  }
  const expectedIds = sentMessages.map((message) => Number(message.id));

  await waitUntil(
    () => participants.every(({ state }) => expectedIds.every((id) => state.chatIds.has(id))),
    10000,
    'difusion STOMP del chat a los tres participantes'
  );

  for (const email of accounts) {
    const history = await jsonRequest(
      `/proyectos/${projectId}/chat/mensajes?pagina=0&tamano=50`,
      { headers: { Authorization: `Bearer ${tokens.get(email)}` } }
    );
    for (const id of expectedIds) {
      const occurrences = history.mensajes.filter((message) => Number(message.id) === id).length;
      if (occurrences !== 1) {
        throw new Error(`${email} recupero ${occurrences} copias del mensaje ${id}`);
      }
    }
  }

  console.log(JSON.stringify({
    projectId,
    diagramId,
    connectedParticipants: participants.length,
    maxPresence: participants.map(({ state }) => state.maxPresence),
    sharedMessageIds: expectedIds,
    receivedPerParticipant: participants.map(({ state }) => state.chatIds.size),
    persistedWithoutDuplicates: true,
  }));
} finally {
  await Promise.all(participants.map(({ client }) => client.deactivate()));
}
