import { useMemo, useState } from 'react';
import { Bot, Sparkles, X } from 'lucide-react';
import type { UmlModelJson } from '../../types/uml';
import {
  generarModeloUml,
  obtenerMensajeErrorIA,
  type IAModelResponse
} from '../../services/iaService';

interface IAModelModalProps {
  diagramaId: number | null;
  hasExistingContent: boolean;
  onClose: () => void;
  onApply: (model: UmlModelJson) => void;
}

const UML_EXAMPLES = [
  {
    icon: '📚',
    name: 'Biblioteca',
    prompt: 'Crear sistema de biblioteca con libros, usuarios y préstamos',
    classes: ['Libro', 'Usuario', 'Prestamo'],
  },
  {
    icon: '🐶',
    name: 'Veterinaria',
    prompt: 'Crear sistema de veterinaria con mascotas, dueños, veterinarios y consultas',
    classes: ['Mascota', 'Dueño', 'Veterinario', 'Consulta'],
  },
  {
    icon: '🎓',
    name: 'Universidad',
    prompt: 'Crear sistema universitario con estudiantes, cursos y profesores',
    classes: ['Estudiante', 'Curso', 'Profesor', 'Inscripcion'],
  },
  {
    icon: '🛒',
    name: 'Tienda',
    prompt: 'Crear sistema de tienda con productos, clientes y ventas',
    classes: ['Producto', 'Cliente', 'Venta', 'DetalleVenta'],
  },
  {
    icon: '🏥',
    name: 'Clínica Médica',
    prompt: 'Crear sistema de clínica con pacientes, médicos, citas e historiales médicos',
    classes: ['Paciente', 'Medico', 'Cita', 'HistorialMedico'],
  },
] as const;

export default function IAModelModal({
  diagramaId,
  hasExistingContent,
  onClose,
  onApply
}: IAModelModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<IAModelResponse | null>(null);

  const summary = useMemo(() => {
    if (!result) return null;
    const classNames = new Map(result.modelo.clases.map(umlClass => [umlClass.id, umlClass.nombre]));
    return {
      classes: result.modelo.clases.length,
      attributes: result.modelo.clases.reduce(
        (total, umlClass) => total + umlClass.atributos.length,
        0
      ),
      relations: result.modelo.relaciones.length,
      classNames,
    };
  }, [result]);

  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError('Describe el sistema que deseas modelar.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await generarModeloUml({ diagramaId, prompt: cleanPrompt });
      setResult(response);
    } catch (requestError: unknown) {
      setError(obtenerMensajeErrorIA(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    if (hasExistingContent) {
      const confirmed = window.confirm(
        'El diagrama actual contiene elementos.\n' +
        'El modelo generado reemplazará el contenido actual del lienzo.\n' +
        '¿Deseas continuar?'
      );
      if (!confirmed) return;
    }
    onApply(result.modelo);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ia-model-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lila-light/50 text-lila-main">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="ia-model-title" className="text-lg font-bold text-gray-800">
                Modelar con Inteligencia Artificial
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Describe el sistema y revisa el modelo antes de aplicarlo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Ejemplos de sistemas UML
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {UML_EXAMPLES.map(example => (
                <button
                  key={example.name}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setPrompt(example.prompt);
                    setResult(null);
                    setError('');
                  }}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:border-lila-main hover:bg-lila-light/10 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center gap-2 font-bold text-gray-800">
                    <span className="text-lg" aria-hidden="true">{example.icon}</span>
                    {example.name}
                  </div>
                  <div className="mt-2 text-[11px] leading-relaxed text-gray-500">
                    <span className="font-bold text-gray-600">Prompt:</span> {example.prompt}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">
                    <span className="font-bold text-gray-600">Genera:</span>{' '}
                    {example.classes.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label htmlFor="ia-prompt" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Descripción del sistema
              </label>
              <span className="text-xs text-gray-400">{prompt.length}/4000</span>
            </div>
            <textarea
              id="ia-prompt"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              maxLength={4000}
              rows={5}
              disabled={loading}
              placeholder="Ejemplo: Crear un sistema de biblioteca con libros, usuarios y préstamos..."
              className="w-full resize-y rounded-lg border border-gray-200 bg-bg-main/50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-lila-main focus:bg-white focus:ring-2 focus:ring-lila-light/50 disabled:opacity-60"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-lila-light/60 bg-lila-light/10 px-4 py-4 text-sm font-medium text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-lila-main border-t-transparent" />
              Generando y validando el modelo UML...
            </div>
          )}

          {result && summary && (
            <div className="space-y-5 border-t border-gray-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-lila-main" />
                  <h3 className="font-bold text-gray-800">Vista previa del modelo</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-lila-light/40 px-3 py-1 text-lila-main">
                    Proveedor: {result.proveedor}
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
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Clases y atributos</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.modelo.clases.map(umlClass => (
                    <div key={umlClass.id} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="font-bold text-gray-800">{umlClass.nombre}</div>
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        {umlClass.atributos.length > 0 ? umlClass.atributos.map(attribute => (
                          <div key={attribute.id} className="font-mono">
                            {attribute.nombre}: {attribute.tipo}
                          </div>
                        )) : <div className="italic text-gray-400">Sin atributos</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Relaciones</h4>
                {result.modelo.relaciones.length > 0 ? (
                  <div className="space-y-2">
                    {result.modelo.relaciones.map(relation => (
                      <div key={relation.id} className="rounded-lg border border-gray-200 bg-bg-main px-3 py-2 text-xs text-gray-700">
                        <span className="font-bold">{summary.classNames.get(relation.origen) || relation.origen}</span>
                        <span className="mx-2 text-lila-main">— {relation.tipo} →</span>
                        <span className="font-bold">{summary.classNames.get(relation.destino) || relation.destino}</span>
                        <span className="ml-2 text-gray-500">
                          ({relation.multiplicidadOrigen} / {relation.multiplicidadDestino})
                        </span>
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

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          {!result ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generando...' : 'Generar modelo'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-lila-main transition-colors hover:bg-lila-light/30 disabled:opacity-50"
              >
                Generar nuevamente
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-md bg-lila-main px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Aplicar al diagrama
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
