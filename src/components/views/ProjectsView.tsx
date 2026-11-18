import React, { useEffect, useState } from 'react';
import {
  Plus,
  CheckSquare,
  Square,
  Trash2,
  ChevronRight,
  FileText,
  Sparkles,
  FolderKanban,
} from 'lucide-react';
import type {
  AgencyState,
  ClientProject,
  KanbanTask,
  OfferTier,
  ProjectStep,
  TaskColumn,
} from '../../types';

interface ProjectsViewProps {
  state: AgencyState;
  onCreateProject: (payload: Partial<ClientProject>) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<ClientProject>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateTask: (payload: Partial<KanbanTask>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<KanbanTask>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onOpenAiStudio: () => void;
}

const STEPS: Array<{ num: ProjectStep; label: string }> = [
  { num: 1, label: '1. Premier contact' },
  { num: 2, label: '2. Brief' },
  { num: 3, label: '3. Devis (30%)' },
  { num: 4, label: '4. Maquette' },
  { num: 5, label: '5. Construction' },
  { num: 6, label: '6. Tests' },
  { num: 7, label: '7. Mise en ligne' },
];

const KANBAN_COLS: TaskColumn[] = ['À faire', 'En cours', 'À valider', 'Terminé'];

const OFFER_DEFAULTS: Record<OfferTier, { price: number; desc: string }> = {
  Départ: { price: 200, desc: '1 page avec contact, horaires, plan (150 à 250 €)' },
  Standard: { price: 380, desc: '3 à 5 pages, formulaire, fiche Google Business (300 à 500 €)' },
  Suivi: { price: 25, desc: 'Modifications de texte et sauvegarde (15 à 30 €/mois)' },
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  state,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onOpenAiStudio,
}) => {
  const [subTab, setSubTab] = useState<'pipeline' | 'kanban'>('pipeline');
  const [selectedId, setSelectedId] = useState<string>(state.projects[0]?.id || '');
  const selectedProject = state.projects.find((p) => p.id === selectedId) || state.projects[0];

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSector, setNewSector] = useState('Commerce local');
  const [newTier, setNewTier] = useState<OfferTier>('Standard');
  const [newIsDemo, setNewIsDemo] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(state.members[0]?.id || '');

  useEffect(() => {
    if (state.projects.length > 0 && !state.projects.some((p) => p.id === selectedId)) {
      setSelectedId(state.projects[0].id);
    }
  }, [state.projects, selectedId]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreateProject({
      clientName: newName.trim(),
      sector: newSector,
      offerTier: newTier,
      totalPriceEur: OFFER_DEFAULTS[newTier].price,
      isDemo: newIsDemo,
      step: 1,
    });
    setNewName('');
    setShowNewForm(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await onCreateTask({
      projectId: selectedProject?.id || state.projects[0]?.id || '',
      title: newTaskTitle.trim(),
      column: 'À faire',
      assigneeMemberId: newTaskAssignee || state.members[0]?.id || '',
    });
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setSubTab('pipeline')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
              subTab === 'pipeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Pipeline Projets (7 étapes)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kanban')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
              subTab === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Tableau des Tâches (4 colonnes)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm(!showNewForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nouveau projet</span>
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleAddProject}
          className="rounded-xl border border-slate-200/90 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-4 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nom du client / démo</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex : Boulangerie du Centre"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Secteur</label>
            <input
              type="text"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Formule</label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as OfferTier)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="Départ">Départ (150–250 €)</option>
              <option value="Standard">Standard (300–500 €)</option>
              <option value="Suivi">Suivi (15–30 €/mois)</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={newIsDemo}
                onChange={(e) => setNewIsDemo(e.target.checked)}
              />
              <span>Site démo</span>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Créer
            </button>
          </div>
        </form>
      )}

      {subTab === 'pipeline' ? (
        state.projects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white py-16 px-6 text-center flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 mb-4">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Aucun projet enregistré</h2>
            <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
              Créez un premier site démo pour votre portfolio ou ajoutez un vrai projet client pour suivre les 7 étapes, le brief en 8 questions et les points de contrôle.
            </p>
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter un premier projet</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 h-fit">
              {state.projects.map((proj) => {
                const active = proj.id === selectedProject?.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setSelectedId(proj.id)}
                    className={`flex w-full items-center justify-between gap-3 p-4 text-left transition-colors ${
                      active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {proj.clientName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                        Étape {proj.step}/7 · {proj.offerTier} · {proj.totalPriceEur} €
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>

            {selectedProject && (
              <div className="xl:col-span-2 space-y-6">
                <div className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        {selectedProject.isDemo ? 'Site Démo Portfolio' : 'Projet Client'} · {selectedProject.sector}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {selectedProject.clientName}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenAiStudio}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Construire dans Studio IA</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(selectedProject.id)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-red-600"
                        title="Supprimer ce projet"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-700 mb-2">
                      Avancement du projet (durée cible : 7 à 10 jours)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                      {STEPS.map((st) => {
                        const active = selectedProject.step === st.num;
                        const done = selectedProject.step > st.num;
                        return (
                          <button
                            key={st.num}
                            type="button"
                            onClick={() => onUpdateProject(selectedProject.id, { step: st.num })}
                            className={`rounded-lg border px-2 py-2 text-left text-[11px] font-medium transition-colors ${
                              active
                                ? 'border-blue-600 bg-blue-50 text-blue-800'
                                : done
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-slate-100 pt-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Formule choisie
                      </label>
                      <select
                        value={selectedProject.offerTier}
                        onChange={(e) => {
                          const tier = e.target.value as OfferTier;
                          onUpdateProject(selectedProject.id, {
                            offerTier: tier,
                            totalPriceEur: OFFER_DEFAULTS[tier].price,
                          });
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <option value="Départ">Départ (150–250 €)</option>
                        <option value="Standard">Standard (300–500 €)</option>
                        <option value="Suivi">Suivi (15–30 €/mois)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Prix total devis (€)
                      </label>
                      <input
                        type="number"
                        value={selectedProject.totalPriceEur}
                        onChange={(e) =>
                          onUpdateProject(selectedProject.id, {
                            totalPriceEur: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono tabular-nums"
                      />
                      <span className="mt-1 block text-[11px] text-slate-500 font-mono tabular-nums">
                        Acompte 30 % : {Math.round(selectedProject.totalPriceEur * 0.3)} € · {selectedProject.revisionsIncluded} retours inclus
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Livraison prévue
                      </label>
                      <input
                        type="date"
                        value={selectedProject.deliveryTargetDate}
                        onChange={(e) =>
                          onUpdateProject(selectedProject.id, { deliveryTargetDate: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="text-xs font-semibold text-slate-900 mb-2">
                      Points à vérifier avant livraison (Guide §4)
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        { key: 'aiCopyReviewed', label: 'Textes de l’IA relus (horaires, prix, noms)' },
                        { key: 'mobileTested', label: 'Site testé sur téléphone' },
                        { key: 'imageRightsVerified', label: 'Droits de chaque image vérifiés' },
                        { key: 'legalMentionsAdded', label: 'Page mentions légales ajoutée' },
                      ].map((chk) => {
                        const checked = selectedProject.qualityChecks[
                          chk.key as keyof typeof selectedProject.qualityChecks
                        ];
                        return (
                          <button
                            key={chk.key}
                            type="button"
                            onClick={() =>
                              onUpdateProject(selectedProject.id, {
                                qualityChecks: {
                                  ...selectedProject.qualityChecks,
                                  [chk.key]: !checked,
                                },
                              })
                            }
                            className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"
                          >
                            {checked ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <span className={checked ? 'text-slate-800 font-medium' : 'text-slate-600'}>
                              {chk.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Questionnaire de brief client (les 8 questions du guide)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { key: 'activitySummary', label: '1. Quelle est ton activité en deux phrases ?' },
                      { key: 'targetClients', label: '2. Qui sont tes clients ?' },
                      { key: 'desiredPages', label: '3. Quelles pages veux-tu ?' },
                      { key: 'inspirationSites', label: '4. Quels sites te plaisent ?' },
                      { key: 'existingAssets', label: '5. As-tu un logo, des photos, des textes ?' },
                      { key: 'hoursAddressPhone', label: '6. Quels sont tes horaires, adresse, téléphone ?' },
                      { key: 'primaryVisitorAction', label: '7. Quelle action doit faire le visiteur ?' },
                      { key: 'budgetRange', label: '8. Quel est ton budget ?' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {field.label}
                        </label>
                        <textarea
                          rows={2}
                          value={
                            selectedProject.brief[
                              field.key as keyof typeof selectedProject.brief
                            ]
                          }
                          onChange={(e) =>
                            onUpdateProject(selectedProject.id, {
                              brief: {
                                ...selectedProject.brief,
                                [field.key]: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="space-y-5">
          <form
            onSubmit={handleAddTask}
            className="rounded-xl border border-slate-200/90 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nouvelle tâche (ex : Préparer les 3 sites démo pour le portfolio)..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {state.members.length > 0 && (
              <select
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                {state.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Ajouter au tableau
            </button>
          </form>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {KANBAN_COLS.map((col) => {
              const colTasks = state.tasks.filter((t) => t.column === col);
              return (
                <div key={col} className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-semibold text-slate-900">{col}</h3>
                    <span className="font-mono tabular-nums text-xs text-slate-500">
                      {colTasks.length}
                    </span>
                  </div>

                  {colTasks.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Aucune carte</p>
                  ) : (
                    <div className="space-y-3">
                      {colTasks.map((task) => {
                        const assignee = state.members.find((m) => m.id === task.assigneeMemberId);
                        const proj = state.projects.find((p) => p.id === task.projectId);
                        return (
                          <div
                            key={task.id}
                            className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                          >
                            <div className="text-xs font-medium text-slate-900">{task.title}</div>
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {assignee?.name || 'Équipe'} · Échéance {task.dueDate}
                            </div>
                            {proj && (
                              <div className="text-[11px] text-blue-700 truncate">{proj.clientName}</div>
                            )}
                            <div className="flex items-center justify-between pt-1">
                              <select
                                value={task.column}
                                onChange={(e) =>
                                  onUpdateTask(task.id, { column: e.target.value as TaskColumn })
                                }
                                className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px]"
                              >
                                {KANBAN_COLS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Supprimer la tâche"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
