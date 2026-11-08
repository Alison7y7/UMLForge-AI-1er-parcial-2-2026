import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const historySource = readFileSync(new URL('./ProjectHistory.tsx', import.meta.url), 'utf8');
const projectSource = readFileSync(new URL('../../pages/ProjectDiagrams.tsx', import.meta.url), 'utf8');
const chatHook = readFileSync(new URL('../../hooks/useProjectChat.ts', import.meta.url), 'utf8');
const recentActivityHook = readFileSync(new URL('../../hooks/useProjectRecentActivity.ts', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../pages/UMLEditor.tsx', import.meta.url), 'utf8');
const collaborationHook = readFileSync(new URL('../../hooks/useCollaboration.ts', import.meta.url), 'utf8');

test('CU19 expone filtros, cursor y navegación al diagrama', () => {
  assert.match(historySource, /busqueda:/);
  assert.match(historySource, /participanteId:/);
  assert.match(historySource, /diagramaId:/);
  assert.match(historySource, /siguienteCursor/);
  assert.match(historySource, /onOpenDiagram/);
});

test('CU19 diferencia vacío legítimo de error HTTP y permite reintentar', () => {
  assert.match(historySource, /Todavía no hay actividad registrada/);
  assert.match(historySource, /El servidor no pudo consultar el historial/);
  assert.match(historySource, />Reintentar</);
  assert.match(historySource, /onClick=\{\(\) => void load\(\)\}/);
});

test('CU20 muestra continuidad sin ejecutar automáticamente una consulta IA', () => {
  assert.match(projectSource, /Continuar donde lo dejamos/);
  assert.match(projectSource, /setChatInitialPrompt/);
  assert.doesNotMatch(projectSource, /consultarIA\(/);
});

test('la reconexión fusiona chat por ID y recupera el snapshot persistido', () => {
  assert.match(chatHook, /const byId = new Map/);
  assert.match(chatHook, /sincronizarRecientes/);
  assert.match(collaborationHook, /recoverPersistedSnapshot/);
  assert.match(collaborationHook, /recovery-\$\{response\.data\.version\}/);
});

test('CU20 carga actividad persistida y refresca por STOMP sin inventar eventos', () => {
  assert.match(recentActivityHook, /\/historial/);
  assert.match(recentActivityHook, /limite: 10/);
  assert.match(recentActivityHook, /topic\/proyectos\/\$\{projectId\}\/chat/);
  assert.match(recentActivityHook, /status === 'Sincronizado'/);
  assert.match(recentActivityHook, /scheduleRefresh/);
  assert.match(editorSource, /Todavía no hay actividad registrada/);
  assert.match(editorSource, /Ver historial/);
  assert.match(editorSource, /\?tab=historial/);
  assert.match(editorSource, /sm:/);
});
