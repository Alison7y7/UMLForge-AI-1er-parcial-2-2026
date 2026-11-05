import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('PWA Manifest es válido y cumple los requisitos de instalación', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest debe existir');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.strictEqual(manifest.name, 'UMLForge AI');
  assert.strictEqual(manifest.short_name, 'UMLForge');
  assert.strictEqual(manifest.display, 'standalone');
  assert.strictEqual(manifest.theme_color, '#8B5CF6');
  assert.strictEqual(manifest.background_color, '#FAFAFC');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Debe incluir al menos 4 iconos');

  const has192 = manifest.icons.some((i: any) => i.sizes === '192x192' && i.purpose === 'any');
  const has512 = manifest.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'any');
  const hasMaskable = manifest.icons.some((i: any) => i.purpose === 'maskable');

  assert.ok(has192, 'Debe tener icono 192x192 any');
  assert.ok(has512, 'Debe tener icono 512x512 any');
  assert.ok(hasMaskable, 'Debe tener icono maskable para Android');
});

test('Los iconos físicos PNG y SVG referenciados existen y son no-vacíos', () => {
  const iconFiles = [
    'public/icons/icon.svg',
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-maskable-192.png',
    'public/icons/icon-maskable-512.png',
    'public/icons/apple-touch-icon.png',
  ];

  for (const relPath of iconFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `El icono ${relPath} debe existir`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 500, `El icono ${relPath} debe ser un archivo válido no vacío (tamaño: ${stat.size} bytes)`);
  }
});

test('Service Worker cumple con las políticas de seguridad y no intercepta API ni WebSockets', () => {
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js debe existir');

  const swContent = fs.readFileSync(swPath, 'utf8');

  // No debe cachear API ni sockets
  assert.ok(swContent.includes("url.pathname.startsWith('/api')"), 'Debe excluir endpoints /api/');
  assert.ok(swContent.includes("url.pathname.startsWith('/ws')"), 'Debe excluir WebSockets /ws/');
  assert.ok(swContent.includes("url.pathname.includes('sockjs')"), 'Debe excluir SockJS');

  // Solo debe interceptar GET
  assert.ok(swContent.includes("request.method !== 'GET'"), 'Debe ignorar solicitudes no GET (POST/PUT/DELETE)');

  // Control de actualizaciones
  assert.ok(swContent.includes('SKIP_WAITING'), 'Debe soportar SKIP_WAITING para control de actualizaciones');
  assert.ok(swContent.includes('clients.claim()'), 'Debe activar clients.claim() al activarse');
});
