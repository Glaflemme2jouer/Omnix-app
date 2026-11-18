import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import type { AgencyAppointment, AgencyState } from '../../types';
import {
  createGoogleCalendarEvent,
  listGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from '../../lib/googleWorkspace';
import { ConfirmModal } from '../ConfirmModal';
import { GoogleSignInButton } from '../GoogleSignInButton';

interface CalendarViewProps {
  state: AgencyState;
  workspaceToken: string | null;
  onSignInGoogle: () => void;
  onCreateAppointment: (payload: Partial<AgencyAppointment>) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  state,
  workspaceToken,
  onSignInGoogle,
  onCreateAppointment,
  onDeleteAppointment,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AgencyAppointment['type']>('Client (20 min)');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState('17:30');
  const [durationMin, setDurationMin] = useState(20);
  const [notes, setNotes] = useState('');
  const [syncToGoogle, setSyncToGoogle] = useState(true);

  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadGoogleEvents = async () => {
    if (!workspaceToken) return;
    setLoadingGoogle(true);
    setGoogleError('');
    try {
      const items = await listGoogleCalendarEvents(workspaceToken);
      setGoogleEvents(items);
    } catch (err: any) {
      setGoogleError(err.message);
    } finally {
      setLoadingGoogle(false);
    }
  };

  useEffect(() => {
    if (workspaceToken) {
      loadGoogleEvents();
    }
  }, [workspaceToken]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (syncToGoogle && workspaceToken) {
      setConfirmOpen(true);
    } else {
      executeCreate(false);
    }
  };

  const executeCreate = async (pushGoogle: boolean) => {
    setSaving(true);
    try {
      const dateIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      let googleCalendarEventId: string | undefined;
      if (pushGoogle && workspaceToken) {
        const created = await createGoogleCalendarEvent(workspaceToken, {
          summary: title.trim(),
          description: notes || `Rendez-vous agence (${type})`,
          startIso: dateIso,
          durationMin,
        });
        googleCalendarEventId = created.id;
        await loadGoogleEvents();
      }
      await onCreateAppointment({
        title: title.trim(),
        type,
        dateIso,
        durationMin,
        notes,
        googleCalendarEventId,
      });
      setTitle('');
      setNotes('');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const sortedAppointments = [...state.appointments].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={confirmOpen}
        title="Ajouter dans votre Google Agenda ?"
        description={`L’événement "${title}" (${dateStr} à ${timeStr}, ${durationMin} min) sera créé dans votre Google Calendar connecté ainsi que dans l’agenda d’équipe.`}
        loading={saving}
        onConfirm={() => executeCreate(true)}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4">
          <div className="text-xs font-semibold text-slate-900">Lundi · Réunion 15 min</div>
          <p className="mt-1 text-xs text-slate-500">
            Chacun annonce son objectif de la semaine (règle : 5h max/semaine).
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4">
          <div className="text-xs font-semibold text-slate-900">Mercredi · Point Discord 5 min</div>
          <p className="mt-1 text-xs text-slate-500">
            Point rapide pour débloquer les tâches en cours ou les maquettes.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4">
          <div className="text-xs font-semibold text-slate-900">Dimanche · Bilan écrit</div>
          <p className="mt-1 text-xs text-slate-500">
            Ce qui avance, ce qui bloque, et préparation des rendez-vous clients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={handleSubmitForm}
          className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Planifier un rendez-vous</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Titre</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : RDV Premier contact — Salon Élodie"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Type de créneau</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AgencyAppointment['type'])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="Client (20 min)">Client (20 min · max 2 membres)</option>
              <option value="Maquette">Présentation Maquette</option>
              <option value="Livraison">Livraison & formation client</option>
              <option value="Réunion Lundi (15 min)">Réunion Lundi (15 min)</option>
              <option value="Point Discord Mercredi (5 min)">Point Discord Mercredi (5 min)</option>
              <option value="Bilan Dimanche">Bilan Dimanche</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Heure</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Durée (minutes)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 20)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rappel des questions de brief à poser..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          {workspaceToken && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
              />
              <span>Synchroniser aussi dans mon Google Calendar</span>
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Enregistrer le rendez-vous
          </button>
        </form>

        <div className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Agenda partagé de l’équipe</h2>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              {sortedAppointments.length}
            </span>
          </div>

          {sortedAppointments.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 mb-3">
                <CalendarDays className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-slate-800">Aucun rendez-vous planifié</p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                Utilisez le formulaire à gauche pour ajouter vos réunions hebdomadaires ou vos rendez-vous clients.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedAppointments.map((appt) => {
                const dt = new Date(appt.dateIso);
                return (
                  <div key={appt.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{appt.title}</div>
                      <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                        {dt.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })} ·{' '}
                        {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {appt.durationMin} min
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {appt.type}
                        {appt.googleCalendarEventId ? ' · Synchronisé Google Agenda' : ''}
                      </div>
                      {appt.notes && <p className="mt-1 text-xs text-slate-600">{appt.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAppointment(appt.id)}
                      className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Mon Google Calendar en direct</h2>
            </div>
            {workspaceToken && (
              <button
                type="button"
                onClick={loadGoogleEvents}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                title="Actualiser"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingGoogle ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {!workspaceToken ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Connectez votre compte Google pour afficher et créer vos rendez-vous directement dans Google Calendar.
              </p>
              <GoogleSignInButton onClick={onSignInGoogle} label="Connecter Google Calendar" />
            </div>
          ) : googleError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {googleError}
            </div>
          ) : googleEvents.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              Aucun événement à venir trouvé sur votre agenda principal.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {googleEvents.map((ev) => {
                const startVal = ev.start.dateTime || ev.start.date || '';
                const d = startVal ? new Date(startVal) : null;
                return (
                  <div key={ev.id} className="py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {ev.summary || '(Sans titre)'}
                      </div>
                      {d && (
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                          {d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}{' '}
                          {ev.start.dateTime
                            ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : 'Journée'}
                        </div>
                      )}
                    </div>
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600 p-1 shrink-0"
                        title="Voir dans Google Agenda"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
