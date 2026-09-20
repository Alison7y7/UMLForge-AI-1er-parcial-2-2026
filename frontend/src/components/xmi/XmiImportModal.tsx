import { useMemo, useState } from 'react';
import axios from 'axios';
import { FileText, Upload, X } from 'lucide-react';
import { api } from '../../api/axios';
import type { UmlModelJson } from '../../types/uml';

interface XmiImportModalProps {
  hasExistingContent: boolean;
  onClose: () => void;
  onImport: (model: UmlModelJson) => void;
}

export default function XmiImportModal({
  hasExistingContent,
  onClose,
  onImport
}: XmiImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<UmlModelJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    if (!model) return null;
    return {
      classes: model.clases.length,
      attributes: model.clases.reduce((total, umlClass) => total + umlClass.atributos.length, 0),
      methods: model.clases.reduce((total, umlClass) => total + umlClass.metodos.length, 0),
      relations: model.relaciones.length
    };
  }, [model]);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setModel(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Selecciona un archivo XMI o XML.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo XMI supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    setLoading(true);
    setError('');
    setModel(null);

    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const response = await api.post<UmlModelJson>('/xmi/importar', formData);
      setModel(response.data);
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError)) {
        const responseData = requestError.response?.data as { message?: string } | string | undefined;
        setError(
          typeof responseData === 'string'
            ? responseData
            : responseData?.message || 'No se pudo analizar el archivo XMI.'
        );
      } else {
        setError('No se pudo analizar el archivo XMI.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!model) return;
    if (hasExistingContent) {
      const confirmed = window.confirm(
        'El diagrama actual contiene elementos.\n' +
        'La importación reemplazará el contenido actual del lienzo.\n' +
        '¿Deseas continuar?'
      );
      if (!confirmed) return;
    }
    onImport(model);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Importar modelo XMI</h2>
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
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Archivo
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-lila-light bg-bg-main px-4 py-4 text-sm text-gray-600 transition-colors hover:border-lila-main">
              <Upload className="h-5 w-5 shrink-0 text-lila-main" />
              <span className="min-w-0 flex-1 truncate">
                {file ? file.name : 'Seleccionar archivo .xmi o .xml'}
              </span>
              <input
                type="file"
                accept=".xmi,.xml,application/xml,text/xml"
                className="sr-only"
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-4 text-sm font-medium text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-lila-main border-t-transparent" />
              Analizando modelo...
            </div>
          )}

          {summary && (
            <div className="border-t border-gray-200 pt-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-lila-main" />
                <h3 className="font-bold text-gray-800">Modelo detectado</h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Clases</dt><dd className="font-bold text-gray-800">{summary.classes}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Atributos</dt><dd className="font-bold text-gray-800">{summary.attributes}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Métodos</dt><dd className="font-bold text-gray-800">{summary.methods}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Relaciones</dt><dd className="font-bold text-gray-800">{summary.relations}</dd></div>
              </dl>
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
          {!model ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Analizando...' : 'Analizar XMI'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              className="rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Importar al diagrama
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
