import React, { useState } from 'react';
import {
  ArrowRight,
  CheckSquare,
  Square,
  Calendar,
  Sparkles,
  FolderGit2,
  FolderKanban,
  Wallet,
  Target,
  PlugZap,
  Plus,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import type { AgencyState, ThirdPartyProviderStatus } from '../../types';
import type { NavSection } from '../Sidebar';

interface OverviewViewProps {
  state: AgencyState;
  hasWorkspaceToken: boolean;
  providerStatuses: ThirdPartyProviderStatus[];
  onToggleChecklist: (id: string, completed: boolean) => Promise<void>;
  onToggleRoadmapTask: (weekId: string, taskId: string, completed: boolean) => Promise<void>;
  onUpdateSettings: (updates: Partial<AgencyState['settings']>) => Promise<void>;
  onNavigate: (section: NavSection) => void;
  onOpenNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenAiStudio: (projectId?: string) => void;
}

const STEP_NAMES: Record<number, string> = {
  1: 'Premier contact',
  2: 'Brief',
  3: 'Devis',
  4: 'Maquette',
  5: 'Construction IA',
  6: 'Tests',
  7: 'Mise en ligne',
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  state,
  hasWorkspaceToken,
  providerStatuses,
  onToggleChecklist,
  onToggleRoadmapTask,
  onUpdateSettings,
  onNavigate,
  onOpenNewProject,
  onOpenProject,
  onOpenAiStudio,
}) => {
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [nameInput, setNameInput] = useState(state.settings.agencyName);
  const [cityInput, setCityInput] = useState(state.settings.city);

  const realProjects = state.projects.filter((p) => !p.isDemo);
  const demoProjects = state.projects.filter((p) => p.isDemo);
  const totalRevenue = state.finances
    .filter((f) => f.status === 'Payé' && f.type !== 'Dépense caisse commune')
    .reduce((sum, f) => sum + f.amountEur, 0);
  const expenses = state.finances
    .filter((f) => f.type === 'Dépense caisse commune')
    .reduce((sum, f) => sum + f.amountEur, 0);
  const commonPot = Math.max(0, Math.round((totalRevenue * 0.2 - expenses) * 100) / 100);

  const checklistDone = state.preSaleChecklist.filter((c) => c.completed).length;
  const upcomingAppointments = [...state.appointments]
    .sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime())
    .slice(0, 4);

  const connected3p = providerStatuses.filter((p) => p.connected).length;
  const totalConnected = (hasWorkspaceToken ? 1 : 0) + 1 + connected3p;

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || savingIdentity) return;
    setSavingIdentity(true);
    try {
      await onUpdateSettings({
        agencyName: nameInput.trim(),
        city: cityInput.trim(),
      });
      setEditingIdentity(false);
    } catch {
      // Error surfaced by App banner
    } finally {
      setSavingIdentity(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Agency Header */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          {editingIdentity ? (
            <form onSubmit={handleSaveIdentity} className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nom de votre agence"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900"
              />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Votre ville"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
              />
              <button
                type="submit"
                disabled={savingIdentity}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{savingIdentity ? 'Validation...' : 'Valider'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingIdentity(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                <span>Annuler</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {state.settings.agencyName}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNameInput(state.settings.agencyName);
                  setCityInput(state.settings.city);
                  setEditingIdentity(true);
                }}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Personnaliser le nom et la ville"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            Espace de pilotage vierge prêt à accueillir votre équipe{state.settings.city ? ` à ${state.settings.city}` : ''}. Connectez vos comptes, créez votre premier site démo avec Google AI Studio et suivez vos clients étape par étape.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenAiStudio()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Créer un site avec l’IA</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewProject}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau projet</span>
          </button>
        </div>
      </section>

      {/* Top KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Clients (Mois 1 → 3)</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {realProjects.length} <span className="text-sm font-normal text-slate-400">/ 5 clients</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {demoProjects.length} site(s) démo dans le portfolio
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Chiffre & Réserve (20 %)</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalRevenue} €
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Caisse commune : {commonPot} €
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Prospection locale</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {state.prospects.length} <span className="text-sm font-normal text-slate-400">/ 30 cibles</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {state.prospects.filter((p) => p.status === 'Relance J+5 à faire').length} relance(s) J+5 en attente
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Comptes connectés</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
              <PlugZap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalConnected} <span className="text-sm font-normal text-slate-400">/ 6 services</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Google AI Studio actif · Google {hasWorkspaceToken ? 'connecté' : 'à lier'}
          </p>
        </div>
      </section>

      {/* Main Split: Active Projects + Appointments */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-200/90 bg-white p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Avancement des projets (7 étapes)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivez chaque site du premier contact à la mise en ligne
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              <span>Ouvrir Projets</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {state.projects.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 mb-3">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Aucun projet pour le moment</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Commencez par créer un site démo dans Studio IA ou ajoutez votre premier projet client.
              </p>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Créer le premier projet</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {state.projects.map((project) => {
                const owner = state.members.find((m) => m.id === project.ownerMemberId);
                const pct = Math.round((project.step / 7) * 100);
                return (
                  <div
                    key={project.id}
                    className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(project.id)}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-600 truncate block text-left"
                      >
                        {project.clientName}
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{project.sector}</span>
                        <span aria-hidden="true">·</span>
                        <span>Formule {project.offerTier}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{project.totalPriceEur} €</span>
                        <span aria-hidden="true">·</span>
                        <span>Chef : {owner?.name || 'À assigner'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-36">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">
                            {project.step}/7 · {STEP_NAMES[project.step]}
                          </span>
                          <span className="font-mono tabular-nums text-slate-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenAiStudio(project.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        Studio IA
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Prochains rendez-vous</h2>
              <p className="text-xs text-slate-500 mt-0.5">Clients & réunions d’équipe</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              <span>Agenda</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Agenda vide</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                Planifiez votre réunion du lundi ou votre premier rendez-vous client.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter un créneau</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {upcomingAppointments.map((appt) => {
                const dt = new Date(appt.dateIso);
                return (
                  <div key={appt.id} className="py-3.5">
                    <div className="text-sm font-medium text-slate-900">{appt.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {dt.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span aria-hidden="true">·</span>
                      <span>{appt.durationMin} min</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 30-Day Roadmap & Pre-Sale Checklist */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Checklist avant la 1re vente
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Les 7 prérequis du guide de lancement
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs font-semibold text-slate-700">
              {checklistDone}/{state.preSaleChecklist.length}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {state.preSaleChecklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleChecklist(item.id, !item.completed)}
                className="flex w-full items-start gap-3 rounded-lg p-2 text-left text-xs hover:bg-slate-50 transition-colors"
              >
                {item.completed ? (
                  <CheckSquare className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                )}
                <span className={item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-xl border border-slate-200/90 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Plan des 30 premiers jours
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cochez vos étapes semaine après semaine avec votre équipe
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('integrations')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <FolderGit2 className="h-3.5 w-3.5" />
              <span>Connecter les comptes</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            {state.roadmap.map((week) => {
              const done = week.tasks.filter((t) => t.completed).length;
              return (
                <div key={week.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-semibold text-slate-900">{week.title}</h3>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {done}/{week.tasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {week.tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onToggleRoadmapTask(week.id, task.id, !task.completed)}
                        className="flex w-full items-start gap-2.5 rounded-md py-1 px-1.5 text-left text-xs hover:bg-white transition-colors"
                      >
                        {task.completed ? (
                          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                        ) : (
                          <Square className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        )}
                        <span className={task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}>
                          {task.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
