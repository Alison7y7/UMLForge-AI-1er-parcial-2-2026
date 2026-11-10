import { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { Download, Smartphone, X, Check, Share, Info } from 'lucide-react';

interface Props {
  className?: string;
  variant?: 'compact' | 'full';
}

export default function PwaInstallButton({ className = '', variant = 'compact' }: Props) {
  const { isInstallable, isInstalled, platform, installPwa } = usePWA();
  const [showInstructions, setShowInstructions] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Si ya está ejecutándose como PWA instalada, no mostramos el botón
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await installPwa();
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      } else if (outcome === 'manual') {
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        title="Instalar UMLForge AI en este dispositivo"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm border border-lila-light/60 bg-white/90 hover:bg-lila-light/20 text-lila-main hover:text-text-dark cursor-pointer active:scale-95 ${className}`}
      >
        {installSuccess ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span>¡Instalado!</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4 text-lila-main" />
            <span>{variant === 'full' ? 'Instalar aplicación' : 'Instalar App'}</span>
          </>
        )}
      </button>

      {/* Modal de instrucciones para navegadores sin prompt automático (iOS o navegadores de escritorio) */}
      {showInstructions && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowInstructions(false); }}
        >
          <div className="relative w-full max-w-md max-h-[88dvh] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden my-auto">
            
            {/* Header del modal fijo arriba */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-white/95 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-lila-light/40 flex items-center justify-center text-lila-main font-bold shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate">Instalar UMLForge AI</h3>
                  <p className="text-xs text-gray-500 truncate">Úsala como aplicación nativa en tu dispositivo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
                aria-label="Cerrar instrucciones"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido según plataforma con scroll interno */}
            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 text-sm text-gray-700 flex-1">
              {platform === 'ios' ? (
                <div className="space-y-3">
                  <p className="font-medium text-gray-800">
                    En Safari en iPhone o iPad, sigue estos 3 pasos:
                  </p>
                  <ol className="space-y-2.5 list-decimal list-inside text-xs leading-relaxed text-gray-600 bg-gray-50 p-4 rounded-2xl">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lila-main">1.</span>
                      <span>Toca el botón <strong className="text-gray-800">Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-500" /> en la barra inferior de Safari.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lila-main">2.</span>
                      <span>Desplázate hacia abajo y selecciona <strong className="text-gray-800">«Añadir a la pantalla de inicio»</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lila-main">3.</span>
                      <span>Toca <strong className="text-gray-800">«Añadir»</strong> en la esquina superior derecha.</span>
                    </li>
                  </ol>
                </div>
              ) : platform === 'android' ? (
                <div className="space-y-3">
                  <p className="font-medium text-gray-800">
                    En Chrome o Edge para Android:
                  </p>
                  <ol className="space-y-2.5 text-xs leading-relaxed text-gray-600 bg-gray-50 p-4 rounded-2xl">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lila-main">1.</span>
                      <span>Pulsa el menú de opciones <strong className="text-gray-800">(⋮)</strong> en la esquina superior derecha.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lila-main">2.</span>
                      <span>Selecciona <strong className="text-gray-800">«Instalar aplicación»</strong> o <strong className="text-gray-800">«Añadir a pantalla de inicio»</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lila-main">3.</span>
                      <span>Confirma en <strong className="text-gray-800">«Instalar»</strong> para tenerla lista en tu cajón de apps.</span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-medium text-gray-800">
                    En tu computadora (Chrome, Edge o Brave):
                  </p>
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2 text-gray-800 font-semibold">
                      <Info className="w-4 h-4 text-lila-main shrink-0" />
                      <span>Instalación desde la barra de direcciones</span>
                    </div>
                    <p>
                      Haz clic en el icono de instalación <strong className="text-gray-800">⨁ o [↓]</strong> ubicado en el extremo derecho de la barra de direcciones de tu navegador, y pulsa <strong className="text-gray-800">«Instalar»</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-lila-main to-pink-main text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
                >
                  Entendido
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
