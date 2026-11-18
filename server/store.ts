import fs from 'fs';
import path from 'path';
import type { AgencyState } from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'agency-db.json');

export function getInitialState(): AgencyState {
  const today = new Date();

  return {
    settings: {
      agencyName: 'Omnix',
      city: '',
      billingFramework: 'Facturation via parent',
      discordWebhookUrl: '',
      defaultGoogleFormId: '',
      defaultDriveFolderId: '',
      teamRulesAccepted: false,
      revenueSplitWritten: false,
      currentMonthLabel: today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      allowedEmails: [],
      adminEmails: [],
      lockEnabled: true,
    },
    members: [],
    projects: [],
    tasks: [],
    appointments: [],
    prospects: [],
    finances: [],
    preSaleChecklist: [
      { id: 'chk-1', label: 'Accord des parents obtenu pour chaque membre', completed: false },
      { id: 'chk-2', label: 'Rôles mensuels et règles d’équipe écrits', completed: false },
      { id: 'chk-3', label: 'Règle de partage de l’argent (70 / 20 / 10) écrite', completed: false },
      { id: 'chk-4', label: '3 sites démo en ligne pour le portfolio', completed: false },
      { id: 'chk-5', label: 'Modèle de devis prêt (acompte 30 %, 2 retours)', completed: false },
      { id: 'chk-6', label: 'Liste de 30 prospects locaux constituée', completed: false },
      { id: 'chk-7', label: 'Message de démarchage prêt et testé', completed: false },
    ],
    roadmap: [
      {
        id: 'wk-1',
        weekNumber: 1,
        title: 'Semaine 1 : Le cadre',
        tasks: [
          { id: 'w1-1', label: 'Obtenir l’accord écrit des parents', completed: false },
          { id: 'w1-2', label: 'Choisir le nom de l’équipe', completed: false },
          { id: 'w1-3', label: 'Répartir les 5 rôles du mois', completed: false },
          { id: 'w1-4', label: 'Connecter Drive, GitHub et Discord dans l’app', completed: false },
          { id: 'w1-5', label: 'Valider les règles d’équipe et le partage 70/20/10', completed: false },
        ],
      },
      {
        id: 'wk-2',
        weekNumber: 2,
        title: 'Semaine 2 : Le portfolio',
        tasks: [
          { id: 'w2-1', label: 'Générer 4 sites démo avec Studio IA (boulangerie, club, coach, artisan)', completed: false },
          { id: 'w2-2', label: 'Voter en équipe pour les 3 meilleurs sites', completed: false },
          { id: 'w2-3', label: 'Mettre en ligne sur GitHub Pages ou Netlify', completed: false },
        ],
      },
      {
        id: 'wk-3',
        weekNumber: 3,
        title: 'Semaine 3 : Le démarchage',
        tasks: [
          { id: 'w3-1', label: 'Lister 30 commerces ou clubs sans site via Google Maps / Mairie', completed: false },
          { id: 'w3-2', label: 'Réaliser des visites sur place et envoyer les messages', completed: false },
          { id: 'w3-3', label: 'Atteindre l’objectif de 10 conversations', completed: false },
        ],
      },
      {
        id: 'wk-4',
        weekNumber: 4,
        title: 'Semaine 4 : Le premier client',
        tasks: [
          { id: 'w4-1', label: 'Envoyer le premier devis avec acompte 30 %', completed: false },
          { id: 'w4-2', label: 'Proposer tarif découverte contre avis Google + autorisation portfolio', completed: false },
          { id: 'w4-3', label: 'Lancer et livrer le premier vrai projet en 7 à 10 jours', completed: false },
        ],
      },
    ],
  };
}

export function loadAgencyState(): AgencyState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initial = getInitialState();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as AgencyState;
    parsed.settings = {
      ...getInitialState().settings,
      ...(parsed.settings || {}),
      allowedEmails: Array.isArray(parsed.settings?.allowedEmails)
        ? parsed.settings.allowedEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
        : [],
      adminEmails: Array.isArray(parsed.settings?.adminEmails)
        ? parsed.settings.adminEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
        : [],
      lockEnabled:
        typeof parsed.settings?.lockEnabled === 'boolean' ? parsed.settings.lockEnabled : true,
    };
    return parsed;
  } catch {
    return getInitialState();
  }
}

export function saveAgencyState(state: AgencyState): AgencyState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
  return state;
}

export function resetAgencyState(): AgencyState {
  return saveAgencyState(getInitialState());
}
