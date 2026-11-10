import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { urlBase64ToUint8Array } from '../utils/pushUtils.ts';

describe('CU23 Web Push', () => {
  it('convierte correctamente la clave pública VAPID base64url', () => {
    assert.deepEqual([...urlBase64ToUint8Array('AQIDBA')], [1,2,3,4]);
  });
  it('el permiso solo se solicita desde una acción explícita y registra la suscripción autenticada', () => {
    const source=readFileSync(new URL('../services/pushNotifications.ts',import.meta.url),'utf8');
    assert.match(source,/Notification\.requestPermission\(\)/); assert.match(source,/pushManager\.subscribe/);
    assert.match(source,/api\.post\('\/notificaciones\/push\/suscripciones'/);
  });
  it('el service worker recibe push y abre únicamente rutas locales seguras', () => {
    const sw=readFileSync(new URL('../../public/sw.js',import.meta.url),'utf8');
    assert.match(sw,/addEventListener\('push'/); assert.match(sw,/showNotification/);
    assert.match(sw,/addEventListener\('notificationclick'/); assert.match(sw,/!data\.url\.startsWith\('\/\/'\)/);
  });
  it('la interfaz contempla incompatibilidad, permiso denegado, HTTPS y responsive', () => {
    const source=readFileSync(new URL('../pages/NotificationSettings.tsx',import.meta.url),'utf8');
    assert.match(source,/unsupported/); assert.match(source,/denied/); assert.match(source,/ios-install-required/); assert.match(source,/requiere HTTPS/);
    assert.match(source,/sm:grid-cols-2/); assert.match(source,/Desactivar dispositivo/);
  });
});

describe('CU24 ayuda contextual', () => {
  it('usa un único panel global y adapta preguntas a la ruta', () => {
    const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
    const panel=readFileSync(new URL('./help/ContextualHelp.tsx',import.meta.url),'utf8');
    assert.equal((app.match(/<ContextualHelp\s*\/>/g)||[]).length,1);
    assert.match(panel,/routeContext/); assert.match(panel,/fixed z-\[100\]/); assert.match(panel,/max-h-\[88dvh\]/);
  });
  it('declara explícitamente que es de solo lectura y no sustituye el chat', () => {
    const panel=readFileSync(new URL('./help/ContextualHelp.tsx',import.meta.url),'utf8');
    assert.match(panel,/no modifica proyectos ni diagramas/);
    const api=readFileSync(new URL('../../../backend/src/main/java/com/umlforge/backend/controller/ContextualHelpController.java',import.meta.url),'utf8');
    assert.doesNotMatch(api,/@PutMapping|@DeleteMapping|@PatchMapping/);
  });
  it('permite preguntas consecutivas sin reutilizar una respuesta fallida', () => {
    const panel=readFileSync(new URL('./help/ContextualHelp.tsx',import.meta.url),'utf8');
    assert.match(panel,/interface HelpTurn/);
    assert.match(panel,/setTurns\(previous => \[\.\.\.previous/);
    assert.match(panel,/turn\.id === id/);
    assert.match(panel,/setQuestion\(''\)/);
    assert.match(panel,/Reintentar/);
  });
  it('integra un manual navegable, búsqueda por temas y enlaces reales', () => {
    const panel=readFileSync(new URL('./help/ContextualHelp.tsx',import.meta.url),'utf8');
    assert.match(panel,/Manual y tutorial/);
    assert.match(panel,/api\.get<HelpManual>\('\/ayuda\/manual'\)/);
    assert.match(panel,/Buscar en el manual/);
    assert.match(panel,/filteredTopics/);
    assert.match(panel,/<Link/);
  });
  it('mantiene comportamiento responsive y estados de carga, vacío y error', () => {
    const panel=readFileSync(new URL('./help/ContextualHelp.tsx',import.meta.url),'utf8');
    assert.match(panel,/max-h-\[92dvh\]/);
    assert.match(panel,/sm:max-w-xl/);
    assert.match(panel,/Cargando manual/);
    assert.match(panel,/No hay un tema que coincida/);
    assert.match(panel,/role="alert"/);
  });
});
