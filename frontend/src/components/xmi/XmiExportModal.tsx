import { useMemo, useState } from 'react';
import axios from 'axios';
import { Download, FileText, X } from 'lucide-react';
import { api } from '../../api/axios';
import type { UmlModelJson } from '../../types/uml';

interface XmiExportModalProps {
  diagramName: string;
  model: UmlModelJson;
  onClose: () => void;
}

export default function XmiExportModal({
  diagramName,
  model,
  onClose
}: XmiExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const summary = useMemo(() => ({
    classes: model.clases.length,
    attributes: model.clases.reduce((total, umlClass) => total + umlClass.atributos.length, 0),
    relations: model.relaciones.length
  }), [model]);

  const suggestedFilename = `${sanitizeFilename(diagramName)}.xmi`;

  const handleDownload = async () => {
    if (model.clases.length === 0) {
      setError('No hay elementos UML para exportar.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post<Blob>(
        '/xmi/exportar',
        { nombre: diagramName, modelo: model },
        { responseType: 'blob' }
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/xml' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = suggestedFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      onClose();
    } catch (requestError: unknown) {
      setError(await exportErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="xmi-export-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="xmi-export-title" className="text-lg font-bold text-gray-800">Exportar modelo XMI</h2>
            <p className="mt-1 text-xs text-gray-500">Enterprise Architect, UML 2.x y XMI 2.1</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 transition-colors hover:text-gray-700"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-5">
            <FileText className="h-6 w-6 shrink-0 text-lila-main" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-800">{suggestedFilename}</div>
              <div className="text-xs text-gray-500">Modelo UML editable en formato XMI</div>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-4 text-center text-sm">
            <div><dd className="text-lg font-bold text-gray-800">{summary.classes}</dd><dt className="text-gray-500">Clases</dt></div>
            <div><dd className="text-lg font-bold text-gray-800">{summary.attributes}</dd><dt className="text-gray-500">Atributos</dt></div>
            <div><dd className="text-lg font-bold text-gray-800">{summary.relations}</dd><dt className="text-gray-500">Relaciones</dt></div>
          </dl>

          {model.clases.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No hay elementos UML para exportar.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={model.clases.length === 0 || loading}
            className="flex items-center gap-2 rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading ? 'Generando XMI...' : 'Descargar XMI'}
          </button>
        </div>
      </div>
    </div>
  );
}

function sanitizeFilename(value: string) {
  const sanitized = (value || 'diagrama-uml')
    .trim()
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'diagrama-uml';
}

async function exportErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'No se pudo generar el archivo XMI.';
  const responseData = error.response?.data;
  if (responseData instanceof Blob) {
    try {
      const parsed = JSON.parse(await responseData.text()) as { message?: string };
      return parsed.message || 'No se pudo generar el archivo XMI.';
    } catch {
      return 'No se pudo generar el archivo XMI.';
    }
  }
  if (typeof responseData === 'string') return responseData;
  return (responseData as { message?: string } | undefined)?.message
    || 'No se pudo generar el archivo XMI.';
}
