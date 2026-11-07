import { useEffect, useState } from 'react';
import { Download, File, FileCode2, FileText, Image as ImageIcon, Loader2, Music2 } from 'lucide-react';
import { api } from '../../api/axios';
import type { AdjuntoChat } from '../../types/chat';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function apiPath(url: string): string {
  return url.startsWith('/api') ? url.slice(4) : url;
}

export default function ChatAttachmentView({ adjunto }: { adjunto: AdjuntoChat }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(adjunto.categoria === 'IMAGEN' || adjunto.categoria === 'AUDIO');
  const [error, setError] = useState('');

  useEffect(() => {
    if (adjunto.categoria !== 'IMAGEN' && adjunto.categoria !== 'AUDIO') return;
    let active = true;
    let localUrl: string | null = null;
    api.get(apiPath(adjunto.contenidoUrl), { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return;
        localUrl = URL.createObjectURL(data);
        setObjectUrl(localUrl);
      })
      .catch(() => active && setError('No se pudo cargar el adjunto'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [adjunto.categoria, adjunto.contenidoUrl]);

  const download = async () => {
    setError('');
    try {
      const { data } = await api.get(apiPath(adjunto.contenidoUrl), { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = adjunto.nombre;
      anchor.rel = 'noopener';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('No tienes acceso o el archivo ya no está disponible');
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs py-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando adjunto...</div>;
  }

  if (adjunto.categoria === 'IMAGEN' && objectUrl) {
    return (
      <div className="mt-2 max-w-sm">
        <a href={objectUrl} target="_blank" rel="noreferrer" title={`Abrir ${adjunto.nombre}`}>
          <img src={objectUrl} alt={adjunto.nombre} className="max-h-64 w-auto rounded-xl border border-white/50 object-contain bg-white" />
        </a>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] opacity-75">
          <ImageIcon className="w-3 h-3" /> {adjunto.nombre} · {formatBytes(adjunto.tamanoBytes)}
        </div>
      </div>
    );
  }

  if (adjunto.categoria === 'AUDIO' && objectUrl) {
    return (
      <div className="mt-2 min-w-[220px] max-w-sm rounded-xl bg-white/70 p-2 text-gray-800">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold"><Music2 className="w-3.5 h-3.5 text-lila-main" /> Nota de voz · {formatBytes(adjunto.tamanoBytes)}</div>
        <audio src={objectUrl} controls preload="metadata" className="h-9 w-full" aria-label={`Nota de voz de ${adjunto.nombre}`} />
      </div>
    );
  }

  const Icon = adjunto.categoria === 'DATOS' ? FileCode2
    : adjunto.mimeType === 'application/pdf' ? FileText : File;
  return (
    <div className="mt-2 rounded-xl border border-white/50 bg-white/70 p-2.5 text-gray-800">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0 text-lila-main" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold" title={adjunto.nombre}>{adjunto.nombre}</p>
          <p className="text-[10px] text-gray-500">{formatBytes(adjunto.tamanoBytes)} · {adjunto.mimeType}</p>
        </div>
        <button type="button" onClick={download} className="p-2 rounded-lg text-lila-main hover:bg-lila-light/50" aria-label={`Descargar ${adjunto.nombre}`}>
          <Download className="w-4 h-4" />
        </button>
      </div>
      {(error) && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
