import { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { RefreshCw, X } from 'lucide-react';

export default function PwaUpdateToast() {
  const { hasUpdate, updatePwa } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Notificación de actualización de la aplicación"
      className="fixed bottom-4 right-4 z-50 max-w-sm bg-white/95 backdrop-blur-md border border-lila-main/30 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-slide-up"
    >
      <div className="w-9 h-9 rounded-xl bg-lila-light/30 flex items-center justify-center text-lila-main shrink-0">
        <RefreshCw className="w-4 h-4 animate-spin-slow" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 leading-tight">Nueva versión disponible</p>
        <p className="text-[11px] text-gray-500 truncate">Actualiza para recibir mejoras recientes</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={updatePwa}
          className="px-3 py-1.5 bg-gradient-to-r from-lila-main to-pink-main text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          Actualizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          title="Descartar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
