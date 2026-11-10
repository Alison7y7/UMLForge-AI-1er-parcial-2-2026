import { api } from '../api/axios';
import { urlBase64ToUint8Array } from '../utils/pushUtils';

export type PushCompatibility = 'supported' | 'unsupported' | 'insecure' | 'denied' | 'ios-install-required';
export interface PushSettings {
  configured: boolean; publicKey: string; subscribed: boolean;
  invitaciones: boolean; menciones: boolean; recomendaciones: boolean; cambiosUml: boolean;
}

export function pushCompatibility(): PushCompatibility {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (isIos && !standalone) return 'ios-install-required';
  if (Notification.permission === 'denied') return 'denied';
  return 'supported';
}

export async function getPushSettings(): Promise<PushSettings> {
  return (await api.get<PushSettings>('/notificaciones/push/configuracion')).data;
}

export async function enablePush(publicKey: string): Promise<PushSubscription> {
  if (pushCompatibility() !== 'supported') throw new Error('Este navegador no puede activar notificaciones en el contexto actual.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('El permiso de notificaciones no fue concedido.');
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('El navegador devolvió una suscripción incompleta.');
  await api.post('/notificaciones/push/suscripciones', {
    endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
    dispositivo: navigator.userAgent.slice(0, 120)
  });
  return subscription;
}

export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await api.delete('/notificaciones/push/suscripciones', { data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}
