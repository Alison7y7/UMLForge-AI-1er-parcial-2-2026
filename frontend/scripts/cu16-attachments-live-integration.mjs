import crypto from 'node:crypto';
import fs from 'node:fs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const origin = 'http://localhost';
const apiBase = `${origin}/api`;
const wsUrl = `${origin}/ws-uml`;
const projectId = 2;
const members = [
  'AlejandroAdmin@gmail.com',
  'NoeAliAnfitrion@gmail.com',
  'ElenaColaborador@gmail.com',
];
const outsider = 'pedroColaborador@gmail.com';
const pdfPath = new URL('./fixtures/cu16-adjunto-prueba.pdf', import.meta.url);
const imagePath = new URL('../public/icons/icon-192.png', import.meta.url);

const credentialsSource = fs.readFileSync(
  new URL('../src/components/demo/DemoCredentialsAccordion.tsx', import.meta.url),
  'utf8'
);
const password = credentialsSource.match(/TEMPORAL_PASSWORD\s*=\s*'([^']+)'/)?.[1];
if (!password) throw new Error('No se pudo obtener la credencial local de demostracion');

async function request(path, options = {}) {
  return fetch(`${apiBase}${path}`, options);
}

async function login(email) {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, password }),
  });
  if (!response.ok) throw new Error(`Login ${email}: ${response.status}`);
  return (await response.json()).token;
}

async function history(token) {
  const response = await request(`/proyectos/${projectId}/chat/mensajes?pagina=0&tamano=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Historial: ${response.status} ${await response.text()}`);
  return response.json();
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
  const state = { email, messages: new Map() };
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 0,
  });
  const connected = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout STOMP para ${email}`)), 15000);
    client.onConnect = () => {
      client.subscribe(`/topic/proyectos/${projectId}/chat`, (frame) => {
        const message = JSON.parse(frame.body);
        if (message?.id) state.messages.set(Number(message.id), message);
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

async function upload(token, filePath, filename, mimeType, content) {
  const bytes = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('contenido', content);
  form.append('metadatos', JSON.stringify({ prueba: 'CU16-adjuntos' }));
  form.append('archivos', new Blob([bytes], { type: mimeType }), filename);
  const response = await request(`/proyectos/${projectId}/chat/mensajes/con-adjuntos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) throw new Error(`Carga ${filename}: ${response.status} ${await response.text()}`);
  return { message: await response.json(), bytes };
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const tokens = new Map();
for (const email of [...members, outsider]) tokens.set(email, await login(email));
const participants = members.map((email) => connectParticipant(email, tokens.get(email)));

try {
  await Promise.all(participants.map((participant) => participant.connected));

  const pdf = await upload(
    tokens.get('NoeAliAnfitrion@gmail.com'),
    pdfPath,
    'cu16-adjunto-prueba.pdf',
    'application/pdf',
    'PDF compartido por el anfitrion'
  );
  const image = await upload(
    tokens.get('ElenaColaborador@gmail.com'),
    imagePath,
    'cu16-imagen-prueba.png',
    'image/png',
    'Imagen compartida por la colaboradora'
  );
  const uploaded = [pdf, image];
  const messageIds = uploaded.map(({ message }) => Number(message.id));

  await waitUntil(
    () => participants.every(({ state }) => messageIds.every((id) => state.messages.has(id))),
    10000,
    'distribucion STOMP de ambos adjuntos'
  );

  for (const { state } of participants) {
    for (const id of messageIds) {
      const event = state.messages.get(id);
      if (event.adjuntos?.length !== 1) {
        throw new Error(`${state.email} recibio metadatos incompletos para ${id}`);
      }
      if (!String(event.fechaHora).endsWith('Z')) {
        throw new Error(`${state.email} recibio una fecha sin UTC Z para ${id}`);
      }
    }
  }

  for (const email of members) {
    const persisted = await history(tokens.get(email));
    for (const { message } of uploaded) {
      const matches = persisted.mensajes.filter((candidate) => Number(candidate.id) === Number(message.id));
      if (matches.length !== 1 || matches[0].adjuntos?.length !== 1) {
        throw new Error(`${email} no recupero exactamente una copia completa de ${message.id}`);
      }
    }
  }

  const downloadChecks = [];
  for (const email of members) {
    for (const item of uploaded) {
      const attachment = item.message.adjuntos[0];
      const response = await fetch(`${origin}${attachment.contenidoUrl}`, {
        headers: { Authorization: `Bearer ${tokens.get(email)}` },
      });
      const downloaded = Buffer.from(await response.arrayBuffer());
      if (!response.ok || sha256(downloaded) !== sha256(item.bytes)) {
        throw new Error(`Descarga alterada o denegada para ${email}: ${response.status}`);
      }
      downloadChecks.push({ email, attachmentId: attachment.id, status: response.status });
    }
  }

  const protectedUrl = uploaded[0].message.adjuntos[0].contenidoUrl;
  const anonymousDownload = await fetch(`${origin}${protectedUrl}`);
  const outsiderDownload = await fetch(`${origin}${protectedUrl}`, {
    headers: { Authorization: `Bearer ${tokens.get(outsider)}` },
  });
  const outsiderHistory = await request(`/proyectos/${projectId}/chat/mensajes?pagina=0&tamano=20`, {
    headers: { Authorization: `Bearer ${tokens.get(outsider)}` },
  });

  const outsiderForm = new FormData();
  outsiderForm.append('contenido', 'Intento externo');
  outsiderForm.append('archivos', new Blob([pdf.bytes], { type: 'application/pdf' }), 'externo.pdf');
  const outsiderUpload = await request(`/proyectos/${projectId}/chat/mensajes/con-adjuntos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.get(outsider)}` },
    body: outsiderForm,
  });
  if (![401, 403].includes(anonymousDownload.status) || outsiderDownload.status !== 403
      || outsiderHistory.status !== 403 || outsiderUpload.status !== 403) {
    throw new Error(`Proteccion inesperada: ${JSON.stringify({
      anonymousDownload: anonymousDownload.status,
      outsiderDownload: outsiderDownload.status,
      outsiderHistory: outsiderHistory.status,
      outsiderUpload: outsiderUpload.status,
    })}`);
  }

  const beforeInvalid = await history(tokens.get(members[0]));
  const invalidForm = new FormData();
  invalidForm.append('contenido', 'No debe persistirse');
  invalidForm.append('archivos', new Blob(['no es un PDF'], { type: 'application/pdf' }), 'falso.pdf');
  const invalidUpload = await request(`/proyectos/${projectId}/chat/mensajes/con-adjuntos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.get(members[0])}` },
    body: invalidForm,
  });
  const afterInvalid = await history(tokens.get(members[0]));
  if (invalidUpload.status !== 400 || afterInvalid.totalElementos !== beforeInvalid.totalElementos) {
    throw new Error(`Archivo invalido no fue atomico: ${invalidUpload.status}`);
  }

  process.stdout.write(JSON.stringify({
    projectId,
    memberCount: members.length,
    uploaded: uploaded.map(({ message }) => ({
      messageId: message.id,
      attachmentId: message.adjuntos[0].id,
      category: message.adjuntos[0].categoria,
      mimeType: message.adjuntos[0].mimeType,
      utc: message.fechaHora,
    })),
    stompReceivedByAll: true,
    persistedOnceForAll: true,
    authenticatedDownloads: downloadChecks.length,
    accessControl: {
      anonymousDownload: anonymousDownload.status,
      outsiderDownload: outsiderDownload.status,
      outsiderHistory: outsiderHistory.status,
      outsiderUpload: outsiderUpload.status,
    },
    invalidFileStatus: invalidUpload.status,
    invalidFilePersistedMessages: afterInvalid.totalElementos - beforeInvalid.totalElementos,
  }));
} finally {
  await Promise.all(participants.map(({ client }) => client.deactivate()));
}
