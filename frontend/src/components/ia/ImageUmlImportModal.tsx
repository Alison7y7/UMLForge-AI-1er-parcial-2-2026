import { useEffect, useMemo, useState } from 'react';
import { Bot, Image as ImageIcon, Upload, X } from 'lucide-react';
import type { UmlModelJson } from '../../types/uml';
import {
  attributeTypeOriginLabel,
  updatePreviewAttributeType
} from '../../utils/imageAttributeTypes';
import {
  obtenerMensajeErrorImagen,
  reconstruirDiagramaDesdeImagen,
  type ImageUmlResponse
} from '../../services/imagenService';

interface ImageUmlImportModalProps {
  diagramaId: number | null;
  hasExistingContent: boolean;
  onClose: () => void;
  onApply: (model: UmlModelJson) => void;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);


export default function ImageUmlImportModal({
  diagramaId,
  hasExistingContent,
  onClose,
  onApply
}: ImageUmlImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImageUmlResponse | null>(null);

  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : '', [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const summary = useMemo(() => {
    if (!result) return null;
    return {
      classes: result.modelo.clases.length,
      attributes: result.modelo.clases.reduce(
        (total, umlClass) => total + umlClass.atributos.length,
        0
      ),
      relations: result.modelo.relaciones.length,
      classNames: new Map(
        result.modelo.clases.map(umlClass => [umlClass.id, umlClass.nombre])
      )
    };
  }, [result]);

  const handleFileChange = (selectedFile: File | null) => {
    setResult(null);
    setError('');

    if (!selectedFile) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.has(selectedFile.type)) {
      setFile(null);
      setError('Selecciona una imagen PNG, JPEG o WebP.');
      return;
    }
    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setError('La imagen supera el tamaño máximo permitido de 10 MB.');
      return;
    }
    setFile(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Selecciona una imagen UML.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await reconstruirDiagramaDesdeImagen({ archivo: file, diagramaId });
      if (response.proveedor.startsWith('fallback-local-image')) {
        setError('Una plantilla local no puede considerarse reconocimiento visual. El diagrama no fue modificado.');
        return;
      }
      setResult(response);
    } catch (requestError: unknown) {
      setError(obtenerMensajeErrorImagen(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    if (hasExistingContent) {
      const confirmed = window.confirm(
        'El diagrama actual contiene elementos.\n' +
        'El modelo reconstruido reemplazará el contenido actual del lienzo.\n' +
        '¿Deseas continuar?'
      );
      if (!confirmed) return;
    }
    onApply(result.modelo);
  };

  const handleAttributeTypeChange = (
    classId: string,
    attributeId: string,
    type: string
  ) => {
    setResult(current => current ? {
      ...current,
      modelo: updatePreviewAttributeType(current.modelo, classId, attributeId, type)
    } : current);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-uml-title"
        className="flex max-h-[92dvh] sm:max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-lila-light/50 text-lila-main">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="image-uml-title" className="text-base sm:text-lg font-bold text-gray-800 truncate">
                Reconstruir diagrama desde imagen
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 truncate">
                Sube una imagen UML y revisa el resultado antes de aplicarlo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50 shrink-0"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 sm:space-y-5 overflow-y-auto p-4 sm:p-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Imagen del diagrama UML
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-lila-light bg-bg-main px-4 py-4 text-sm text-gray-600 transition-colors hover:border-lila-main">
              <Upload className="h-5 w-5 shrink-0 text-lila-main" />
              <span className="min-w-0 flex-1 truncate">
                {file ? file.name : 'Seleccionar imagen PNG, JPEG o WebP'}
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                disabled={loading}
                className="sr-only"
                onChange={event => handleFileChange(event.target.files?.[0] || null)}
              />
            </label>
            <p className="mt-2 text-xs text-gray-400">Tamaño máximo: 10 MB.</p>
          </div>

          {previewUrl && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3">
              <img
                src={previewUrl}
                alt="Vista previa del diagrama UML seleccionado"
                className="mx-auto max-h-64 max-w-full rounded object-contain"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-lila-light/60 bg-lila-light/10 px-4 py-4 text-sm font-medium text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-lila-main border-t-transparent" />
              Analizando la imagen y reconstruyendo el modelo UML...
            </div>
          )}

          {result && summary && (
            <div className="space-y-5 border-t border-gray-200 pt-5">
              {(result.modelo.advertencias?.length || 0) > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="font-bold">Información pendiente de revisión</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {result.modelo.advertencias?.map((warning, index) => (
                      <li key={`${index}-${warning}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-lila-main" />
                  <h3 className="font-bold text-gray-800">Modelo reconstruido</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-lila-light/40 px-3 py-1 text-lila-main">
                    Proveedor: {result.proveedor === 'fallback-local-image' ? 'Motor de Pruebas Locales UML' : result.proveedor === 'gemini-vision' ? 'Gemini Vision' : result.proveedor === 'ollama-vision' ? 'Ollama Vision' : result.proveedor}
                  </span>
                  {result.tokensUsados !== null && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                      Tokens: {result.tokensUsados}
                    </span>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-lg bg-bg-main px-3 py-3">
                  <dd className="text-lg font-bold text-gray-800">{summary.classes}</dd>
                  <dt className="text-gray-500">Clases</dt>
                </div>
                <div className="rounded-lg bg-bg-main px-3 py-3">
                  <dd className="text-lg font-bold text-gray-800">{summary.attributes}</dd>
                  <dt className="text-gray-500">Atributos</dt>
                </div>
                <div className="rounded-lg bg-bg-main px-3 py-3">
                  <dd className="text-lg font-bold text-gray-800">{summary.relations}</dd>
                  <dt className="text-gray-500">Relaciones</dt>
                </div>
              </dl>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Clases y atributos
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.modelo.clases.map(umlClass => (
                    <div key={umlClass.id} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="font-bold text-gray-800">{umlClass.nombre}</div>
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        {umlClass.atributos.length > 0 ? umlClass.atributos.map(attribute => (
                          <div key={attribute.id} className="rounded border border-gray-100 bg-gray-50 p-2">
                            <label className="flex items-center gap-1 font-mono">
                              <span className="shrink-0">{attribute.nombre}:</span>
                              <input
                                type="text"
                                value={attribute.tipo}
                                onChange={event => handleAttributeTypeChange(
                                  umlClass.id,
                                  attribute.id,
                                  event.target.value
                                )}
                                placeholder="Tipo pendiente"
                                aria-label={`Tipo de ${attribute.nombre}`}
                                className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-1 font-mono text-xs text-gray-700 outline-none focus:border-lila-main"
                              />
                            </label>
                            <div className={`mt-1 text-[10px] font-semibold ${
                              attribute.origenTipo === 'SUGERIDO'
                                ? 'text-amber-700'
                                : attribute.origenTipo === 'IMAGEN'
                                  ? 'text-emerald-700'
                                  : attribute.origenTipo === 'USUARIO'
                                    ? 'text-blue-700'
                                    : 'text-gray-500'
                            }`}>
                              {attributeTypeOriginLabel(attribute)}
                            </div>
                          </div>
                        )) : <div className="italic text-gray-400">Sin atributos</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Relaciones
                </h4>
                {result.modelo.relaciones.length > 0 ? (
                  <div className="space-y-2">
                    {result.modelo.relaciones.map(relation => (
                      <div key={relation.id} className="rounded-lg border border-gray-200 bg-bg-main px-3 py-2 text-xs text-gray-700">
                        <span className="font-bold">
                          {summary.classNames.get(relation.origen) || relation.origen}
                        </span>
                        <span className="mx-2 text-lila-main">— {relation.tipo} →</span>
                        <span className="font-bold">
                          {summary.classNames.get(relation.destino) || relation.destino}
                        </span>
                        <span className="ml-2 text-gray-500">
                          ({relation.multiplicidadOrigen || 'por revisar'} / {relation.multiplicidadDestino || 'por revisar'})
                        </span>
                        {relation.claseAsociacion && (
                          <span className="ml-2 font-semibold text-amber-700">
                            Clase de asociación: {summary.classNames.get(relation.claseAsociacion) || relation.claseAsociacion}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 px-3 py-3 text-sm italic text-gray-400">
                    El modelo no contiene relaciones.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-5 sm:py-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 min-h-[44px] flex items-center justify-center text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          {!result ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full sm:w-auto rounded-lg bg-lila-main px-4 py-2.5 sm:py-2 min-h-[44px] text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? 'Analizando...' : 'Analizar imagen'}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 min-h-[44px] text-sm font-semibold text-lila-main transition-colors hover:bg-lila-light/30 rounded-lg disabled:opacity-50"
              >
                Analizar nuevamente
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="w-full sm:w-auto rounded-lg bg-lila-main px-4 py-2.5 sm:py-2 min-h-[44px] text-sm font-bold text-white transition-opacity hover:opacity-90 flex items-center justify-center"
              >
                Aplicar al diagrama
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
