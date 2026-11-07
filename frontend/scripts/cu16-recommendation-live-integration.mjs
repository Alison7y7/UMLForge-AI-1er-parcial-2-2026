import fs from 'node:fs';

const origin = 'http://localhost';
const apiBase = `${origin}/api`;
const projectId = 2;
const diagramId = 4;
const aiMessageId = 39;
const recommendationId = '13591761-2263-4256-b967-a3998df38327';
const obsoleteRecommendationId = 'dcf12203-95e5-43cb-a8b8-e888be66dd5b';

const credentialsSource = fs.readFileSync(
  new URL('../src/components/demo/DemoCredentialsAccordion.tsx', import.meta.url),
  'utf8'
);
const password = credentialsSource.match(/TEMPORAL_PASSWORD\s*=\s*'([^']+)'/)?.[1];
if (!password) throw new Error('No se encontro la credencial de demostracion');

async function login(email) {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, password }),
  });
  if (!res.ok) throw new Error(`Login ${email}: ${res.status}`);
  return (await res.json()).token;
}

const adminToken = await login('AlejandroAdmin@gmail.com');
const collabToken = await login('ElenaColaborador@gmail.com');
const outsiderToken = await login('pedroColaborador@gmail.com');

// 1. Bloqueo a usuario externo (403)
const outsiderApplyRes = await fetch(
  `${apiBase}/proyectos/${projectId}/chat/recomendaciones/${encodeURIComponent(recommendationId)}/aplicar`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${outsiderToken}`,
    },
    body: JSON.stringify({ mensajeId: aiMessageId }),
  }
);
if (outsiderApplyRes.status !== 403) {
  throw new Error(`Usuario externo no fue bloqueado: status ${outsiderApplyRes.status}`);
}

// 2. Idempotencia: reintentar recomendación ya aplicada retorna 409 CONFLICT
const reapplyRes = await fetch(
  `${apiBase}/proyectos/${projectId}/chat/recomendaciones/${encodeURIComponent(recommendationId)}/aplicar`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collabToken}`,
    },
    body: JSON.stringify({ mensajeId: aiMessageId }),
  }
);
if (reapplyRes.status !== 409) {
  throw new Error(`Reaplicacion no retorno 409 CONFLICT: status ${reapplyRes.status}`);
}

// 3. Conflicto de versión: recomendación generada en versión previa rechazada con 409 CONFLICT
const conflictRes = await fetch(
  `${apiBase}/proyectos/${projectId}/chat/recomendaciones/${encodeURIComponent(obsoleteRecommendationId)}/aplicar`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collabToken}`,
    },
    body: JSON.stringify({ mensajeId: aiMessageId }),
  }
);
if (conflictRes.status !== 409) {
  throw new Error(`Conflicto de version no retorno 409 CONFLICT: status ${conflictRes.status}`);
}

// 4. Verificación de persistencia en PostgreSQL
const reloadRes = await fetch(`${apiBase}/diagramas/${diagramId}`, {
  headers: { Authorization: `Bearer ${collabToken}` },
});
if (!reloadRes.ok) throw new Error(`Error al recargar diagrama: ${reloadRes.status}`);
const reloadedDiagram = await reloadRes.json();
const reloadedModel = JSON.parse(reloadedDiagram.modeloJson);
const ventaClass = reloadedModel.clases.find((c) => c.id === 'c1');
const hasCalcularTotal = ventaClass?.metodos?.some((m) => m.nombre === 'calcularTotal');
if (!hasCalcularTotal) {
  throw new Error('El modelo recargado no contiene el metodo calcularTotal aplicado');
}

// 5. Verificación de registro en bitácora
const auditRes = await fetch(`${apiBase}/bitacoras`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
const auditList = await auditRes.json();
const applyAudit = auditList.find((b) => b.accion === 'APLICAR_RECOMENDACION_IA');
if (!applyAudit) {
  throw new Error('No se encontro el registro de bitacora APLICAR_RECOMENDACION_IA');
}

// 6. Verificación de mensaje de sistema en el historial del chat
const chatRes = await fetch(`${apiBase}/proyectos/${projectId}/chat/mensajes?pagina=0&tamano=20`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
const chatData = await chatRes.json();
const systemMsg = chatData.mensajes.find(
  (m) => m.tipoEmisor === 'SISTEMA' && m.metadatos?.evento === 'recomendacion_aplicada'
);
if (!systemMsg) {
  throw new Error('No se encontro el mensaje de sistema de recomendacion aplicada');
}

console.log(JSON.stringify({
  success: true,
  outsiderBlockedStatus: outsiderApplyRes.status,
  persistedMethodInPostgres: 'calcularTotal',
  diagramVersion: reloadedDiagram.version,
  idempotency409Verified: reapplyRes.status === 409,
  obsoleteVersionConflict409Verified: conflictRes.status === 409,
  auditRegistered: {
    accion: applyAudit.accion,
    usuario: applyAudit.usuarioNombre,
    descripcion: applyAudit.descripcion,
  },
  systemMessageBroadcasted: {
    tipoEmisor: systemMsg.tipoEmisor,
    contenido: systemMsg.contenido,
    evento: systemMsg.metadatos?.evento,
  },
}, null, 2));
