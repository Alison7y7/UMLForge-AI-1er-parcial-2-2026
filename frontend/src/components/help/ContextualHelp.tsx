import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, CircleHelp, ExternalLink, RotateCcw, Search, Send, Sparkles, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api/axios';

interface HelpResponse {
  answer: string;
  steps: string[];
  links: { label: string; url: string }[];
  context: string;
  source: string;
  readOnly: boolean;
}

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  answer: string;
  steps: string[];
  links: { label: string; url: string }[];
  contexts: string[];
  searchTerms: string[];
  permissionNote: string;
}

interface HelpManual {
  title: string;
  description: string;
  topics: { id: string; title: string; description: string; articles: HelpArticle[] }[];
  suggestedQuestions: string[];
  readOnly: boolean;
}

interface HelpTurn {
  id: number;
  question: string;
  pending: boolean;
  response?: HelpResponse;
  error?: string;
}

function routeContext(path: string, search: string) {
  if (path === '/dashboard') return 'dashboard';
  if (path === '/proyectos') return 'proyectos';
  if (/^\/diagramas\//.test(path)) return 'editor';
  if (/^\/proyectos\//.test(path) && search.includes('tab=historial')) return 'historial';
  if (/^\/proyectos\//.test(path) && search.includes('tab=chat')) return 'chat';
  if (/^\/proyectos\//.test(path)) return 'proyecto';
  if (path.includes('/configuracion/notificaciones')) return 'notificaciones';
  return window.innerWidth < 768 ? 'mobile' : 'general';
}

const suggestions: Record<string, string[]> = {
  dashboard: ['¿Cómo creo un proyecto?', '¿Qué diferencia hay entre los roles?'],
  proyectos: ['¿Cómo creo un proyecto?', '¿Cómo incorporo a otra persona al proyecto?'],
  proyecto: ['¿Cómo incorporo a otra persona al proyecto?', '¿Cómo recupero una conversación anterior?', '¿Cómo continúo una sesión anterior?'],
  editor: ['¿Cómo agrego una clase al diagrama?', '¿Cómo relaciono dos clases?', '¿Cómo exporto el modelo XMI?'],
  chat: ['¿Cómo recupero una conversación anterior?', '¿Cómo reviso recomendaciones?', '¿Cómo descarto una alternativa?'],
  historial: ['¿Cómo filtro el historial?', '¿Cómo continúo una sesión anterior?'],
  mobile: ['¿Cómo veo el diagrama desde el celular?', '¿Cómo configuro notificaciones móviles?'],
  notificaciones: ['¿Cómo activo las notificaciones push?', '¿Por qué necesito HTTPS?'],
  general: ['¿Cómo creo un proyecto?', '¿Cómo uso el editor UML?']
};

function normalize(value: string) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export default function ContextualHelp() {
  const token = useAuthStore(state => state.token);
  const location = useLocation();
  const context = useMemo(
    () => routeContext(location.pathname, location.search),
    [location.pathname, location.search]
  );
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ask' | 'manual'>('ask');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<HelpTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState<HelpManual | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('umlforge:open-help', handleOpen);
    return () => window.removeEventListener('umlforge:open-help', handleOpen);
  }, []);

  const loadManual = async () => {
    if (manualLoading) return;
    setManualLoading(true);
    setManualError('');
    try {
      setManual((await api.get<HelpManual>('/ayuda/manual')).data);
    } catch {
      setManualError('No se pudo cargar el manual.');
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    if (open && token && !manual && !manualLoading && !manualError) void loadManual();
  }, [open, token, manual, manualLoading, manualError]);

  const filteredTopics = useMemo(() => {
    if (!manual) return [];
    const query = normalize(manualSearch.trim());
    if (!query) return manual.topics;
    return manual.topics
      .map(topic => ({
        ...topic,
        articles: topic.articles.filter(article => normalize([
          article.title,
          article.summary,
          article.answer,
          ...article.searchTerms
        ].join(' ')).includes(query))
      }))
      .filter(topic => topic.articles.length > 0 || normalize(`${topic.title} ${topic.description}`).includes(query));
  }, [manual, manualSearch]);

  if (!token) return null;

  const ask = async (value = question) => {
    const clean = value.trim();
    if (!clean || loading) return;
    const id = Date.now();
    setQuestion('');
    setLoading(true);
    setTurns(previous => [...previous, { id, question: clean, pending: true }].slice(-8));
    try {
      const response = (await api.post<HelpResponse>('/ayuda/contextual', { question: clean, context })).data;
      setTurns(previous => previous.map(turn => turn.id === id
        ? { ...turn, pending: false, response, error: undefined }
        : turn));
    } catch {
      setTurns(previous => previous.map(turn => turn.id === id
        ? { ...turn, pending: false, error: 'No se pudo consultar la ayuda.' }
        : turn));
    } finally {
      setLoading(false);
    }
  };

  const contextualSuggestions = suggestions[context] || suggestions.general;

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`fixed z-[90] right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:right-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] text-white shadow-xl px-4 py-3 font-bold text-sm ${location.pathname.startsWith('/diagramas') ? 'hidden md:flex' : ''}`}
      aria-label="Abrir ayuda contextual"
    >
      <CircleHelp className="w-5 h-5" />
      <span className="hidden sm:inline">¿Necesitas ayuda?</span>
    </button>

    {open && <div
      className="fixed z-[100] inset-0 bg-gray-950/30 flex items-end sm:items-center justify-center sm:justify-end sm:p-5"
      onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden"
      >
        <header className="p-4 sm:p-5 bg-gradient-to-r from-lila-light/70 to-pink-light/60 flex justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-lila-main">Ayuda de uso</p>
            <h2 id="help-title" className="font-bold text-xl text-text-dark">UMLForge AI</h2>
            <p className="text-xs text-gray-600 mt-1">Explica el sistema; no modifica proyectos ni diagramas.</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar ayuda" className="p-2 h-fit rounded-xl hover:bg-white/60"><X /></button>
        </header>

        <div className="px-4 sm:px-5 pt-3 flex gap-2 border-b border-gray-100" role="tablist" aria-label="Secciones de ayuda">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ask'}
            onClick={() => setTab('ask')}
            className={`px-3 py-2 text-sm font-bold border-b-2 ${tab === 'ask' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500'}`}
          >Preguntar</button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            onClick={() => setTab('manual')}
            className={`px-3 py-2 text-sm font-bold border-b-2 flex items-center gap-1.5 ${tab === 'manual' ? 'border-lila-main text-lila-main' : 'border-transparent text-gray-500'}`}
          ><BookOpen className="w-4 h-4" />Manual y tutorial</button>
        </div>

        {tab === 'ask' ? <>
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex flex-wrap gap-2">
              {contextualSuggestions.map(item => <button
                type="button"
                key={item}
                onClick={() => void ask(item)}
                disabled={loading}
                className="text-left text-xs px-3 py-2 rounded-xl bg-lila-light/30 text-lila-main font-semibold hover:bg-lila-light/60 disabled:opacity-50"
              >{item}</button>)}
            </div>

            {turns.length === 0 && <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              Escribe una pregunta con tus propias palabras o elige una sugerencia. También puedes abrir el manual por temas.
            </div>}

            {turns.map(turn => <article key={turn.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-lila-main px-3 py-2 text-sm text-white">{turn.question}</p>
              <div className="rounded-2xl border border-lila-light p-4 space-y-3">
                {turn.pending && <p className="text-sm text-gray-500">Buscando en el manual local…</p>}
                {turn.response && <>
                  <div className="flex gap-2"><Sparkles className="w-5 h-5 text-lila-main shrink-0" /><p className="text-sm text-gray-700 leading-relaxed">{turn.response.answer}</p></div>
                  {turn.response.steps.length > 0 && <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1">{turn.response.steps.map(step => <li key={step}>{step}</li>)}</ol>}
                  {turn.response.links.length > 0 && <div className="flex flex-wrap gap-3">{turn.response.links.map(link => <Link onClick={() => setOpen(false)} key={`${turn.id}-${link.url}`} to={link.url} className="inline-flex gap-1 items-center text-sm font-bold text-lila-main">{link.label}<ExternalLink className="w-3 h-3" /></Link>)}</div>}
                  <p className="text-[10px] text-gray-400">Fuente: manual local verificado · Solo lectura</p>
                </>}
                {turn.error && <div role="alert" className="flex items-center justify-between gap-3 text-sm text-red-600">
                  <span>{turn.error}</span>
                  <button type="button" onClick={() => void ask(turn.question)} disabled={loading} className="font-bold inline-flex items-center gap-1"><RotateCcw className="w-4 h-4" />Reintentar</button>
                </div>}
              </div>
            </article>)}
          </div>

          <form onSubmit={event => { event.preventDefault(); void ask(); }} className="p-4 border-t border-gray-100 flex gap-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <label className="sr-only" htmlFor="help-question">Pregunta</label>
            <input id="help-question" maxLength={500} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Pregunta cómo usar UMLForge AI…" className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lila-main" />
            <button disabled={loading || !question.trim()} className="p-3 rounded-2xl bg-lila-main text-white disabled:opacity-40" aria-label="Enviar pregunta"><Send className="w-5 h-5" /></button>
          </form>
        </> : <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <p className="text-sm text-gray-600">{manual?.description || 'Explora las funciones disponibles por tema.'}</p>
            <label className="relative mt-3 block">
              <span className="sr-only">Buscar en el manual</span>
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={manualSearch} onChange={event => setManualSearch(event.target.value)} placeholder="Buscar clase, XMI, invitación…" className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-lila-main" />
            </label>
          </div>

          {manualLoading && <p className="text-sm text-gray-500">Cargando manual…</p>}
          {manualError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{manualError}</span>
            <button type="button" onClick={() => { setManualError(''); void loadManual(); }} className="font-bold inline-flex items-center gap-1"><RotateCcw className="w-4 h-4" />Reintentar</button>
          </div>}

          {!manualLoading && manual && filteredTopics.length === 0 && <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No hay un tema que coincida. Prueba otra palabra o formula una pregunta.</p>}

          {filteredTopics.map(topic => <section key={topic.id} className="space-y-2">
            <div><h3 className="font-bold text-text-dark">{topic.title}</h3><p className="text-xs text-gray-500">{topic.description}</p></div>
            <div className="space-y-2">{topic.articles.map(article => {
              const expanded = expandedArticle === article.id;
              return <article key={article.id} className="rounded-2xl border border-gray-200 overflow-hidden">
                <button type="button" onClick={() => setExpandedArticle(expanded ? null : article.id)} aria-expanded={expanded} className="w-full p-3 text-left flex items-start justify-between gap-3 hover:bg-gray-50">
                  <span><span className="block text-sm font-bold text-gray-800">{article.title}</span><span className="block text-xs text-gray-500 mt-0.5">{article.summary}</span></span>
                  <ChevronDown className={`w-4 h-4 mt-1 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && <div className="border-t border-gray-100 p-3 space-y-3 text-sm text-gray-600">
                  <p>{article.answer}</p>
                  {article.permissionNote && <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800"><strong>Permiso:</strong> {article.permissionNote}</p>}
                  {article.steps.length > 0 && <ol className="list-decimal pl-5 space-y-1">{article.steps.map(step => <li key={step}>{step}</li>)}</ol>}
                  {article.links.length > 0 && <div className="flex flex-wrap gap-3">{article.links.map(link => <Link onClick={() => setOpen(false)} key={`${article.id}-${link.url}`} to={link.url} className="inline-flex gap-1 items-center font-bold text-lila-main">{link.label}<ExternalLink className="w-3 h-3" /></Link>)}</div>}
                </div>}
              </article>;
            })}</div>
          </section>)}
        </div>}
      </section>
    </div>}
  </>;
}
