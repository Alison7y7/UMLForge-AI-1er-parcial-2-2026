import test from 'node:test';
import assert from 'node:assert/strict';
import { formatChatTime, parseChatInstant } from './chatDateTime.ts';

test('interpreta timestamps historicos sin zona como UTC', () => {
  assert.equal(parseChatInstant('2026-11-07T02:30:00')?.toISOString(), '2026-11-07T02:30:00.000Z');
});

test('muestra el mismo instante correctamente en Bolivia y otra zona', () => {
  const instant = '2026-11-07T02:30:00Z';
  assert.match(formatChatTime(instant, 'en-GB', 'America/La_Paz'), /22:30/);
  assert.match(formatChatTime(instant, 'en-GB', 'Europe/Madrid'), /03:30/);
});
