import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');

test('CU16 audio solicita permiso y exige revision antes de enviar', () => {
  assert.match(source, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(source, /Revisar nota de voz antes de enviar/);
  assert.match(source, /clearVoiceRecording/);
  assert.match(source, /recorderRef\.current\.onstop = null/);
});

test('CU16 dictado solo actualiza el campo y no envia automaticamente', () => {
  const start = source.indexOf('const startDictation');
  const end = source.indexOf('const selectFiles', start);
  const implementation = source.slice(start, end);
  assert.match(implementation, /setInputTexto/);
  assert.doesNotMatch(implementation, /handleSend|enviarMensaje/);
});

test('CU16 separa visualmente adjuntar, grabar audio y dictar', () => {
  assert.match(source, /title="Adjuntar archivo"/);
  assert.match(source, /title="Grabar audio"/);
  assert.match(source, /title="Dictar mensaje"/);
});

test('CU16 muestra indicador IA a partir de actividad compartida y accesible', () => {
  assert.match(source, /iaActivities\.map/);
  assert.match(source, /UMLForge AI está escribiendo/);
  assert.match(source, /role="status" aria-live="polite"/);
});
