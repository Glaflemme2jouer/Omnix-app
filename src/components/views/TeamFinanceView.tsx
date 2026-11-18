import React, { useState } from 'react';
import {
  Plus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wallet,
  Copy,
  Check,
  Trash2,
  Lock,
} from 'lucide-react';
import type {
  AgencyRole,
  AgencyState,
  BillingFramework,
  FinanceEntry,
  TeamMember,
} from '../../types';

interface TeamFinanceViewProps {
  state: AgencyState;
  currentUserEmail: string;
  onUpdateMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  onAddMember: (payload: Partial<TeamMember>) => Promise<void>;
  onAddFinance: (payload: Partial<FinanceEntry>) => Promise<void>;
  onUpdateSettings: (updates: Partial<AgencyState['settings']>) => Promise<void>;
}

const ROLES: AgencyRole[] = [
  'Chef de projet',
  'Designer',
  'Développeur',
  'Commercial',
  'Rédacteur',
];

const FREQUENT_ERRORS = [
  'Travailler sans devis signé.',
  'Promettre un délai impossible pour décrocher la vente.',
  'Laisser une seule personne porter tout le projet.',
  'Copier des textes ou des images protégés.',
  'Oublier les mentions légales.',
  'Garder les accès du client pour toi sans le prévenir.',
  'Négliger l’école. Si les notes baissent, l’équipe réduit le rythme.',
];

export const TeamFinanceView: React.FC<TeamFinanceViewProps> = ({
  state,
  currentUserEmail,
  onUpdateMember,
  onAddMember,
  onAddFinance,
  onUpdateSettings,
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<AgencyRole>('Chef de projet');

  const [finClient, setFinClient] = useState('');
  const [finAmount, setFinAmount] = useState(150);
  const [finType, setFinType] = useState<FinanceEntry['type']>('Acompte 30 %');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const normalizedUserEmail = currentUserEmail.trim().toLowerCase();
  const isAdmin =
    state.settings.adminEmails.length === 0 ||
    (normalizedUserEmail !== '' && state.settings.adminEmails.includes(normalizedUserEmail));

  const sharedAppUrl =
    typeof window !== 'undefined'
      ? window.location.origin.replace('ais-dev-', 'ais-pre-')
      : '';

  const handleCopyShareLink = async () => {
    if (!sharedAppUrl) return;
    await navigator.clipboard.writeText(sharedAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddAllowedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inviteEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) return;
    const nextAllowed = Array.from(new Set([...state.settings.allowedEmails, cleaned]));
    const nextAdmins = inviteAsAdmin
      ? Array.from(new Set([...state.settings.adminEmails, cleaned]))
      : state.settings.adminEmails;
    await onUpdateSettings({ allowedEmails: nextAllowed, adminEmails: nextAdmins });
    setInviteEmail('');
    setInviteAsAdmin(false);
  };

  const handleToggleAdmin = async (email: string) => {
    const isCurrentlyAdmin = state.settings.adminEmails.includes(email);
    if (isCurrentlyAdmin && state.settings.adminEmails.length <= 1) return;
    const nextAdmins = isCurrentlyAdmin
      ? state.settings.adminEmails.filter((a) => a !== email)
      : [...state.settings.adminEmails, email];
    await onUpdateSettings({ adminEmails: nextAdmins });
  };

  const handleRemoveAllowedEmail = async (email: string) => {
    const nextAllowed = state.settings.allowedEmails.filter((e) => e !== email);
    const nextAdmins = state.settings.adminEmails.filter((a) => a !== email);
    if (state.settings.lockEnabled && nextAdmins.length === 0) return;
    await onUpdateSettings({ allowedEmails: nextAllowed, adminEmails: nextAdmins });
  };

  const paidRevenue = state.finances
    .filter((f) => f.status === 'Payé' && f.type !== 'Dépense caisse commune')
    .reduce((sum, f) => sum + f.amountEur, 0);
  const expenses = state.finances
    .filter((f) => f.type === 'Dépense caisse commune')
    .reduce((sum, f) => sum + f.amountEur, 0);

  const poolHours70 = paidRevenue * 0.7;
  const commonPot20 = Math.max(0, paidRevenue * 0.2 - expenses);
  const commercialBonus10 = paidRevenue * 0.1;

  const totalWeeklyHours = state.members.reduce((sum, m) => sum + (m.weeklyHours || 0), 0);

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    await onAddMember({ name: newMemberName.trim(), role: newMemberRole });
    setNewMemberName('');
  };

  const handleAddFinanceEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finClient.trim()) return;
    await onAddFinance({
      clientName: finClient.trim(),
      label: `${finType} — ${finClient.trim()}`,
      amountEur: finAmount,
      type: finType,
      status: 'Payé',
      billingParentOrEntity: state.settings.billingFramework,
    });
    setFinClient('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Accès sécurisé & partage d’équipe (anti-inconnus)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Seules les adresses Google ci-dessous peuvent ouvrir {state.settings.agencyName}. Toute autre personne est bloquée automatiquement.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onUpdateSettings({ lockEnabled: !state.settings.lockEnabled })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                state.settings.lockEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>
                {state.settings.lockEnabled
                  ? 'Protection active (liste blanche)'
                  : 'Protection désactivée'}
              </span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-800">
              1. Lien partagé à envoyer à votre fils et ses potes
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={sharedAppUrl}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Tous les membres connectés sur ce lien travaillent sur le même espace Omnix (mêmes projets, tâches, caisse et Jarvis). Pensez aussi à ajouter leurs adresses Gmail dans{' '}
              <span className="font-medium text-slate-700">
                Google Cloud Console → Écran de consentement OAuth → Utilisateurs test
              </span>{' '}
              pour qu’ils puissent activer Calendar, Drive et Gmail.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-800">
              2. Adresses Google autorisées ({state.settings.allowedEmails.length})
            </div>

            {isAdmin && (
              <form onSubmit={handleAddAllowedEmail} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="prenom.pote@gmail.com"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Autoriser</span>
                  </button>
                </div>
                <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteAsAdmin}
                    onChange={(e) => setInviteAsAdmin(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Donner les droits d’administrateur (pour qu’il puisse gérer ses potes)</span>
                </label>
              </form>
            )}

            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
              {state.settings.allowedEmails.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-slate-500">
                  Aucun e-mail enregistré pour l’instant.
                </p>
              ) : (
                state.settings.allowedEmails.map((email) => {
                  const isItemAdmin = state.settings.adminEmails.includes(email);
                  const isLastAdmin = isItemAdmin && state.settings.adminEmails.length <= 1;
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-slate-800">{email}</span>
                        <span className="ml-2 text-[11px] text-slate-500">
                          · {isItemAdmin ? 'Admin' : 'Membre'}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isLastAdmin}
                            onClick={() => handleToggleAdmin(email)}
                            className="text-[11px] font-medium text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline"
                          >
                            {isItemAdmin ? 'Retirer admin' : 'Passer admin'}
                          </button>
                          {!isLastAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAllowedEmail(email)}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Retirer l’accès"
                              aria-label={`Retirer ${email}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Cadre légal, parents & partage de l’argent (Guide §2 & §5)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Règle de départ : un parent doit connaître chaque vente et valider le cadre d’encaissement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={state.settings.billingFramework}
            onChange={(e) =>
              onUpdateSettings({ billingFramework: e.target.value as BillingFramework })
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="Facturation via parent">Facturation au nom d’un parent</option>
            <option value="Micro-entreprise (accord parental)">
              Micro-entreprise (accord écrit des représentants légaux)
            </option>
            <option value="Association loi 1901">Association loi 1901</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total encaissé</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {paidRevenue.toFixed(0)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">Devis signés & preuves conservées</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">70 % · Partagés selon les heures</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {poolHours70.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            Base {totalWeeklyHours.toFixed(1)}h cumulées
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">20 % · Caisse commune (frais)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {commonPot20.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">Noms de domaine, cartes, outils</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">10 % · Prime commercial</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {commercialBonus10.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-slate-500">Pour celui qui a trouvé le client</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Équipe & rotation mensuelle des rôles
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chaque personne qui se connecte avec Google apparaît ici automatiquement, ou ajoutez un membre manuellement.
            </p>
          </div>

          <form onSubmit={handleAddTeamMember} className="flex items-center gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Prénom du membre..."
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
            />
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as AgencyRole)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter</span>
            </button>
          </form>
        </div>

        {state.members.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 mb-3">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-900">Aucun membre inscrit pour le moment</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Connectez-vous avec Google en haut à droite ou ajoutez vos prénoms ci-dessus pour attribuer les 5 rôles du mois.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Membre</th>
                  <th className="px-4 py-3 font-semibold">Rôle du mois</th>
                  <th className="px-4 py-3 font-semibold">Heures cette semaine</th>
                  <th className="px-4 py-3 font-semibold text-right">Part estimée (70 %)</th>
                  <th className="px-4 py-3 font-semibold">Accord parental</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.members.map((m) => {
                  const shareEur =
                    totalWeeklyHours > 0 ? (m.weeklyHours / totalWeeklyHours) * poolHours70 : 0;
                  const overLimit = m.weeklyHours > m.maxWeeklyHours;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-slate-400">{m.email || 'Ajouté manuellement'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={m.role}
                          onChange={(e) =>
                            onUpdateMember(m.id, { role: e.target.value as AgencyRole })
                          }
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono tabular-nums">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={m.weeklyHours}
                            onChange={(e) =>
                              onUpdateMember(m.id, { weeklyHours: Number(e.target.value) || 0 })
                            }
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                          />
                          <span className={overLimit ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
                            / {m.maxWeeklyHours}h {overLimit ? '(Attention école)' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {shareEur.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateMember(m.id, { parentApproved: !m.parentApproved })
                          }
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            m.parentApproved ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {m.parentApproved ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Validé ({m.parentName})</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>En attente parent</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-200/90 bg-white p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Journal des ventes & caisse commune
          </h3>

          <form onSubmit={handleAddFinanceEntry} className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Client / Libellé</label>
              <input
                type="text"
                required
                value={finClient}
                onChange={(e) => setFinClient(e.target.value)}
                placeholder="Ex : Premier client"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <select
                value={finType}
                onChange={(e) => setFinType(e.target.value as FinanceEntry['type'])}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="Acompte 30 %">Acompte 30 %</option>
                <option value="Solde">Solde</option>
                <option value="Suivi mensuel">Suivi mensuel</option>
                <option value="Dépense caisse commune">Dépense caisse commune</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Montant (€)</label>
              <input
                type="number"
                value={finAmount}
                onChange={(e) => setFinAmount(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Enregistrer
            </button>
          </form>

          {state.finances.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 mb-3">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-800">Aucune écriture comptable</p>
              <p className="mt-1 text-xs text-slate-500">
                Chaque acompte, solde ou dépense enregistré ici calculera automatiquement le partage 70 / 20 / 10.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {state.finances.map((f) => (
                <div key={f.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{f.label}</div>
                    <div className="text-slate-500 mt-0.5 font-mono tabular-nums">
                      {f.invoiceRef} · {f.date} · {f.billingParentOrEntity}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-slate-900">
                    {f.type === 'Dépense caisse commune' ? '-' : '+'}
                    {f.amountEur} €
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              7 erreurs fréquentes à éviter (Guide §10)
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            {FREQUENT_ERRORS.map((err, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-mono tabular-nums text-slate-400">0{i + 1}.</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
