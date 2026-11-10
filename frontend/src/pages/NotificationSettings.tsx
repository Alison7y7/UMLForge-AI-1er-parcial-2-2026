import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, ShieldCheck, Smartphone, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../api/axios';
import { disablePush, enablePush, getPushSettings, pushCompatibility, type PushSettings } from '../services/pushNotifications';

const compatibilityText = {
  supported: 'El navegador admite Web Push en este contexto seguro.',
  unsupported: 'Este navegador no ofrece Service Worker, Push API y Notifications API compatibles.',
  insecure: 'Web Push requiere HTTPS. localhost funciona para desarrollo, pero una IP LAN por HTTP no es suficiente.',
  denied: 'El permiso está denegado en el navegador. Debes habilitarlo desde la configuración del sitio.',
  'ios-install-required': 'En iPhone o iPad, añade UMLForge AI a la pantalla de inicio y abre la aplicación instalada antes de activar Web Push.'
};

export default function NotificationSettings() {
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [currentSubscribed, setCurrentSubscribed] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const compatibility = pushCompatibility();

  const load = async () => {
    setLoading(true); setError('');
    try {
      setSettings(await getPushSettings());
      if (pushCompatibility() === 'supported') {
        const registration = await navigator.serviceWorker.ready;
        setCurrentSubscribed(Boolean(await registration.pushManager.getSubscription()));
      } else setCurrentSubscribed(false);
    }
    catch { setError('No se pudo cargar la configuración de notificaciones.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const activate = async () => {
    if (!settings?.configured) return;
    setWorking(true); setError(''); setMessage('');
    try { await enablePush(settings.publicKey); await load(); setMessage('Notificaciones activadas para este dispositivo.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo activar este dispositivo.'); }
    finally { setWorking(false); }
  };
  const deactivate = async () => {
    setWorking(true); setError(''); setMessage('');
    try { await disablePush(); await load(); setMessage('Notificaciones desactivadas en este dispositivo.'); }
    catch { setError('No se pudo eliminar la suscripción. Reintenta.'); }
    finally { setWorking(false); }
  };
  const updatePreference = async (key: keyof Pick<PushSettings, 'invitaciones'|'menciones'|'recomendaciones'|'cambiosUml'>, value: boolean) => {
    if (!settings) return;
    const next = { ...settings, [key]: value }; setSettings(next);
    try { setSettings((await api.put('/notificaciones/push/preferencias', next)).data); }
    catch { setSettings(settings); setError('No se pudo guardar la preferencia.'); }
  };
  const sendTest = async () => {
    setWorking(true); setError(''); setMessage('');
    try { await api.post('/notificaciones/push/prueba'); setMessage('Prueba enviada a tus dispositivos activos.'); }
    catch { setError('No se pudo enviar la prueba. Verifica VAPID y la suscripción.'); }
    finally { setWorking(false); }
  };

  return <Layout><main className="relative z-10 w-full max-w-4xl mx-auto p-4 sm:p-8 pb-28">
    <div className="mb-7"><p className="text-xs font-bold tracking-[.2em] uppercase text-lila-main">Configuración</p><h1 className="text-2xl sm:text-3xl font-bold text-text-dark mt-1">Notificaciones</h1><p className="text-gray-500 mt-2">Decide qué avisos útiles puede mostrar UMLForge AI, incluso con la pestaña cerrada.</p></div>
    <section className="bg-white/90 border border-lila-light rounded-3xl shadow-sm p-5 sm:p-7 space-y-6">
      <div className="flex gap-4 items-start"><div className="p-3 rounded-2xl bg-lila-light/60 text-lila-main">{currentSubscribed ? <Bell/> : <BellOff/>}</div><div><h2 className="font-bold text-text-dark">{currentSubscribed ? 'Activadas en este dispositivo' : 'Desactivadas'}</h2><p className="text-sm text-gray-500 mt-1">{compatibilityText[compatibility]}</p>{settings && !settings.configured && <p className="text-sm text-amber-700 mt-2">El servidor aún no tiene configuradas las claves VAPID.</p>}</div></div>
      {loading ? <p className="text-sm text-gray-500">Cargando configuración…</p> : error && !settings ? <button onClick={load} className="flex gap-2 items-center text-lila-main font-bold"><RefreshCw className="w-4 h-4"/>Reintentar</button> : settings && <>
        <div className="flex flex-wrap gap-3">
          {!currentSubscribed ? <button type="button" disabled={working || compatibility !== 'supported' || !settings.configured} onClick={activate} className="px-5 py-3 rounded-2xl bg-lila-main text-white font-bold disabled:opacity-40">Activar notificaciones</button> : <button type="button" disabled={working} onClick={deactivate} className="px-5 py-3 rounded-2xl border border-pink-main text-pink-main font-bold disabled:opacity-40">Desactivar dispositivo</button>}
          {currentSubscribed && <button type="button" disabled={working} onClick={sendTest} className="px-5 py-3 rounded-2xl bg-pink-light/50 text-text-dark font-bold disabled:opacity-40">Enviar prueba</button>}
        </div>
        <div className="border-t border-gray-100 pt-5"><h3 className="font-bold text-text-dark mb-3">Qué deseas recibir</h3><div className="grid sm:grid-cols-2 gap-3">
          {([['invitaciones','Invitaciones a proyectos'],['menciones','Menciones inequívocas en el chat'],['recomendaciones','Recomendaciones aplicadas y decisiones'],['cambiosUml','Cambios UML relevantes']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50"><span className="text-sm font-semibold text-gray-700">{label}</span><input aria-label={label} type="checkbox" checked={settings[key]} onChange={e => updatePreference(key,e.target.checked)} className="w-5 h-5 accent-violet-600"/></label>)}
        </div></div>
      </>}
      {message && <p role="status" className="flex gap-2 text-sm text-emerald-700"><CheckCircle2 className="w-5 h-5"/>{message}</p>}{error && settings && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600"><div className="p-4 bg-lila-light/20 rounded-2xl flex gap-3"><ShieldCheck className="w-5 h-5 text-lila-main shrink-0"/><p>El permiso siempre se solicita desde este botón. Desactivar push no afecta tus proyectos.</p></div><div className="p-4 bg-pink-light/20 rounded-2xl flex gap-3"><Smartphone className="w-5 h-5 text-pink-main shrink-0"/><p>En iPhone/iPad instala primero la web app en la pantalla de inicio y ábrela desde allí. En dispositivos remotos usa HTTPS.</p></div></div>
    </section>
  </main></Layout>;
}
