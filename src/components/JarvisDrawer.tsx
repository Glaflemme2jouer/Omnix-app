import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, RotateCcw, Send, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AgencyState, ThirdPartyProviderStatus } from '../types';

interface JarvisMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourcesLabel?: string;
}

interface JarvisDrawerProps {
  open: boolean;
  onClose: () => void;
  state: AgencyState;
  user: User | null;
  workspaceToken: string | null;
  providerStatuses: ThirdPartyProviderStatus[];
}

const STARTER_QUESTIONS = [
  'Combien a-t-on de chiffre d’affaires et de réserve ?',
  'Où en sont nos projets et tâches en cours ?',
  'Quels comptes et outils sont connectés actuellement ?',
  'Quels sont nos prochains rendez-vous et relances ?',
];

export const JarvisDrawer: React.FC<JarvisDrawerProps> = ({
  open,
  onClose,
  state,
  user,
  workspaceToken,
  providerStatuses,
}) => {
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const liveMetrics = useMemo(() => {
    const paidRevenue = state.finances
      .filter((f) => f.status === 'Payé' && f.type !== 'Dépense caisse commune')
      .reduce((acc, f) => acc + f.amountEur, 0);
    const expenses = state.finances
      .filter((f) => f.type === 'Dépense caisse commune')
      .reduce((acc, f) => acc + f.amountEur, 0);
    const reserve = Math.max(0, Math.round((paidRevenue * 0.2 - expenses) * 100) / 100);

    const activeSources: string[] = [`Base ${state.settings.agencyName || 'Omnix'}`];
    if (workspaceToken) activeSources.push('Google Workspace');
    providerStatuses
      .filter((p) => p.connected)
      .forEach((p) => {
        activeSources.push(p.provider.charAt(0).toUpperCase() + p.provider.slice(1));
      });

    return {
      paidRevenue: Math.round(paidRevenue * 100) / 100,
      reserve,
      projectsCount: state.projects.length,
      appointmentsCount: state.appointments.length,
      activeSources,
    };
  }, [state, workspaceToken, providerStatuses]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: JarvisMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (workspaceToken) {
        headers.Authorization = `Bearer ${workspaceToken}`;
      }

      const res = await fetch('/api/ai/jarvis', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          workspaceUserName: user?.displayName || undefined,
          workspaceUserEmail: user?.email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Jarvis n’a pas pu répondre.');
      }

      const observedList: string[] = [state.settings.agencyName || 'Omnix'];
      if (data.observedSources?.googleWorkspace) observedList.push('Google Workspace');
      if (data.observedSources?.github) observedList.push('GitHub');
      if (data.observedSources?.discord) observedList.push('Discord');
      if (data.observedSources?.figma) observedList.push('Figma');
      if (data.observedSources?.netlify) observedList.push('Netlify');

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply || 'Aucune réponse générée.',
          sourcesLabel: observedList.join(' · '),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Impossible de contacter Jarvis.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jarvis-drawer-title"
    >
      <div className="flex-1" onClick={onClose} aria-hidden="true" />

      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-blue-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 id="jarvis-drawer-title" className="text-sm font-semibold text-slate-900">
                Jarvis · {state.settings.agencyName || 'Omnix'}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                Sources observées : {liveMetrics.activeSources.join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError('');
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer Jarvis"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <p className="text-xs font-medium text-slate-800">
                  Observation en direct de {state.settings.agencyName || 'Omnix'}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="text-[11px] text-slate-500">CA encaissé</div>
                    <div className="text-base font-semibold text-slate-900 tabular-nums">
                      {liveMetrics.paidRevenue} €
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Réserve (20 %)</div>
                    <div className="text-base font-semibold text-slate-900 tabular-nums">
                      {liveMetrics.reserve} €
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Projets</div>
                    <div className="text-sm font-semibold text-slate-900 tabular-nums">
                      {liveMetrics.projectsCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Rendez-vous</div>
                    <div className="text-sm font-semibold text-slate-900 tabular-nums">
                      {liveMetrics.appointmentsCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">
                  Questions rapides
                </p>
                <div className="space-y-2">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendQuestion(q)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-slate-50/90 text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === 'assistant' && msg.sourcesLabel && (
                  <span className="mt-1 px-1 text-[10px] text-slate-400">
                    Observé : {msg.sourcesLabel}
                  </span>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-start">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                Jarvis analyse les comptes et les chiffres d’{state.settings.agencyName || 'Omnix'}...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(input);
          }}
          className="border-t border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question à Jarvis..."
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Envoyer</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
