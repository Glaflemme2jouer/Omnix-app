import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Sidebar, type NavSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { JarvisDrawer } from './components/JarvisDrawer';
import { OverviewView } from './components/views/OverviewView';
import { AiStudioView } from './components/views/AiStudioView';
import { ProjectsView } from './components/views/ProjectsView';
import { CalendarView } from './components/views/CalendarView';
import { ProspectsOutreachView } from './components/views/ProspectsOutreachView';
import { IntegrationsHubView } from './components/views/IntegrationsHubView';
import { TeamFinanceView } from './components/views/TeamFinanceView';
import { ShieldCheck, LogOut } from 'lucide-react';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { googleSignIn, initAuth, logoutGoogle } from './lib/firebaseAuth';
import type {
  AgencyAppointment,
  AgencyState,
  ClientProject,
  FinanceEntry,
  KanbanTask,
  Prospect,
  TeamMember,
  ThirdPartyProviderStatus,
} from './types';

interface GateState {
  checked: boolean;
  lockEnabled: boolean;
  agencyName: string;
  hasAdmin: boolean;
  authorized: boolean;
  email: string | null;
  isAdmin: boolean;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jarvisOpen, setJarvisOpen] = useState(false);

  const [gate, setGate] = useState<GateState>({
    checked: false,
    lockEnabled: true,
    agencyName: 'Omnix',
    hasAdmin: false,
    authorized: false,
    email: null,
    isAdmin: false,
  });
  const [gateError, setGateError] = useState('');

  const [state, setState] = useState<AgencyState | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ThirdPartyProviderStatus[]>([]);

  const fetchAgencyState = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/state');
      if (res.status === 401 || res.status === 403) {
        setGate((prev) => ({ ...prev, checked: true, authorized: false }));
        setState(null);
        return;
      }
      if (!res.ok) throw new Error('Impossible de charger les données de l’agence.');
      const data = (await res.json()) as AgencyState;
      setState(data);
      setLoadError('');
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setLoadingState(false);
    }
  }, []);

  const fetchOAuthStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/oauth/status');
      if (!res.ok) return;
      const data = (await res.json()) as { statuses: ThirdPartyProviderStatus[] };
      setProviderStatuses(data.statuses || []);
    } catch {
      // Non-blocking status check
    }
  }, []);

  const refreshGateAndData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/gate');
      if (!res.ok) throw new Error('Impossible de vérifier l’accès.');
      const data = await res.json();
      setGate({
        checked: true,
        lockEnabled: Boolean(data.lockEnabled),
        agencyName: data.agencyName || 'Omnix',
        hasAdmin: Boolean(data.hasAdmin),
        authorized: Boolean(data.authorized),
        email: data.email || null,
        isAdmin: Boolean(data.isAdmin),
      });
      if (data.authorized) {
        await Promise.all([fetchAgencyState(), fetchOAuthStatuses()]);
      } else {
        setLoadingState(false);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Erreur réseau.');
      setLoadingState(false);
    }
  }, [fetchAgencyState, fetchOAuthStatuses]);

  useEffect(() => {
    refreshGateAndData();
  }, [refreshGateAndData]);

  const establishServerSession = useCallback(
    async (firebaseUser: User) => {
      const idToken = await firebaseUser.getIdToken();
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        setGate((prev) => ({
          ...prev,
          checked: true,
          authorized: false,
          email: firebaseUser.email || null,
        }));
        setGateError(
          sessionData.error || 'Votre compte Google n’est pas autorisé à accéder à Omnix.'
        );
        setLoadingState(false);
        return false;
      }

      setGateError('');
      setGate((prev) => ({
        ...prev,
        checked: true,
        authorized: true,
        hasAdmin: true,
        email: sessionData.email || firebaseUser.email || null,
        isAdmin: Boolean(sessionData.isAdmin),
      }));

      if (firebaseUser.email) {
        try {
          const regRes = await fetch('/api/agency/team/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              photoUrl: firebaseUser.photoURL || undefined,
            }),
          });
          if (regRes.ok) {
            const regData = await regRes.json();
            if (regData.state) setState(regData.state);
          }
        } catch {
          // ignore registration sync error
        }
      }

      await Promise.all([fetchAgencyState(), fetchOAuthStatuses()]);
      return true;
    },
    [fetchAgencyState, fetchOAuthStatuses]
  );

  // Listen for Google Auth state
  useEffect(() => {
    const unsub = initAuth(async (firebaseUser, token) => {
      setUser(firebaseUser);
      setWorkspaceToken(token);
      if (firebaseUser) {
        await establishServerSession(firebaseUser);
      }
    });
    return () => unsub();
  }, [establishServerSession]);

  // Listen for 3P OAuth popup completion messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchOAuthStatuses();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchOAuthStatuses]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setGateError('');
    try {
      const { user: signedUser, accessToken } = await googleSignIn();
      setUser(signedUser);
      setWorkspaceToken(accessToken);
      await establishServerSession(signedUser);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setGateError(err?.message || 'Échec de la connexion Google.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await logoutGoogle();
    setUser(null);
    setWorkspaceToken(null);
    setGateError('');
    await refreshGateAndData();
  };

  // --- Agency Mutations ---
  const handleToggleChecklist = async (id: string, completed: boolean) => {
    const res = await fetch(`/api/agency/checklist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) setState(await res.json());
  };

  const handleToggleRoadmapTask = async (weekId: string, taskId: string, completed: boolean) => {
    const res = await fetch(`/api/agency/roadmap/${weekId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) setState(await res.json());
  };

  const handleCreateProject = async (payload: Partial<ClientProject>) => {
    const res = await fetch('/api/agency/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.state);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<ClientProject>) => {
    const res = await fetch(`/api/agency/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.state);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const res = await fetch(`/api/agency/projects/${id}`, { method: 'DELETE' });
    if (res.ok) setState(await res.json());
  };

  const handleCreateTask = async (payload: Partial<KanbanTask>) => {
    const res = await fetch('/api/agency/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) setState(await res.json());
  };

  const handleUpdateTask = async (id: string, updates: Partial<KanbanTask>) => {
    const res = await fetch(`/api/agency/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) setState(await res.json());
  };

  const handleDeleteTask = async (id: string) => {
    const res = await fetch(`/api/agency/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) setState(await res.json());
  };

  const handleCreateAppointment = async (payload: Partial<AgencyAppointment>) => {
    const res = await fetch('/api/agency/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.state);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const res = await fetch(`/api/agency/appointments/${id}`, { method: 'DELETE' });
    if (res.ok) setState(await res.json());
  };

  const handleCreateProspect = async (payload: Partial<Prospect>) => {
    const res = await fetch('/api/agency/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) setState(await res.json());
  };

  const handleUpdateProspect = async (id: string, updates: Partial<Prospect>) => {
    const res = await fetch(`/api/agency/prospects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) setState(await res.json());
  };

  const handleDeleteProspect = async (id: string) => {
    const res = await fetch(`/api/agency/prospects/${id}`, { method: 'DELETE' });
    if (res.ok) setState(await res.json());
  };

  const handleUpdateMember = async (id: string, updates: Partial<TeamMember>) => {
    const res = await fetch(`/api/agency/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) setState(await res.json());
  };

  const handleAddMember = async (payload: Partial<TeamMember>) => {
    const res = await fetch('/api/agency/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) setState(await res.json());
  };

  const handleAddFinance = async (payload: Partial<FinanceEntry>) => {
    const res = await fetch('/api/agency/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) setState(await res.json());
  };

  const handleUpdateSettings = async (updates: Partial<AgencyState['settings']>) => {
    const res = await fetch('/api/agency/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) setState(await res.json());
  };

  if (!gate.checked || (gate.authorized && loadingState)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] text-sm text-slate-500">
        Vérification de votre accès à Omnix...
      </div>
    );
  }

  if (!gate.authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white tracking-wide">
              OM
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                {gate.agencyName} — Accès équipe
              </h1>
              <p className="text-xs text-slate-500">
                Espace partagé protégé par liste blanche Google
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                {gate.hasAdmin
                  ? 'Espace privé réservé aux membres invités'
                  : 'Initialisation du premier administrateur'}
              </span>
            </div>
            <p className="text-slate-600">
              {gate.hasAdmin
                ? 'Connectez-vous avec votre adresse Google autorisée pour accéder aux projets, à la caisse et à Jarvis. Les comptes externes sont automatiquement bloqués.'
                : 'C’est le premier lancement : le premier compte Google qui se connecte devient administrateur et pourra autoriser votre fils et ses coéquipiers.'}
            </p>
          </div>

          {gateError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-2">
              <p>{gateError}</p>
              {user && (
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="inline-flex items-center gap-1.5 font-semibold text-red-800 hover:underline"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Changer de compte Google</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              loading={signingIn}
              label="Se connecter avec Google"
            />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">
            {loadError || 'Erreur de chargement.'}
          </p>
          <button
            type="button"
            onClick={fetchAgencyState}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const connectedThirdPartyCount = providerStatuses.filter((p) => p.connected).length;

  return (
    <div className="flex min-h-screen bg-[#f5f6f8] text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        agencyName={state.settings.agencyName}
        currentMonthLabel={state.settings.currentMonthLabel}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        connectedGoogle={Boolean(workspaceToken)}
        connectedThirdPartyCount={connectedThirdPartyCount}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          agencyName={state.settings.agencyName}
          user={user}
          hasWorkspaceToken={Boolean(workspaceToken)}
          signingIn={signingIn}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleGoogleSignOut}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickOpenStudio={() => setActiveSection('ai-studio')}
          onOpenJarvis={() => setJarvisOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewView
              state={state}
              hasWorkspaceToken={Boolean(workspaceToken)}
              providerStatuses={providerStatuses}
              onToggleChecklist={handleToggleChecklist}
              onToggleRoadmapTask={handleToggleRoadmapTask}
              onUpdateSettings={handleUpdateSettings}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'ai-studio' && (
            <AiStudioView
              projects={state.projects}
              workspaceToken={workspaceToken}
              providerStatuses={providerStatuses}
              onSaveProjectHtml={async (projectId, html) => {
                await handleUpdateProject(projectId, { generatedHtml: html });
              }}
              onCreateProjectWithHtml={async (clientName, html) => {
                await handleCreateProject({
                  clientName,
                  generatedHtml: html,
                  isDemo: true,
                  step: 5,
                });
              }}
            />
          )}

          {activeSection === 'projects' && (
            <ProjectsView
              state={state}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenAiStudio={() => setActiveSection('ai-studio')}
            />
          )}

          {activeSection === 'calendar' && (
            <CalendarView
              state={state}
              workspaceToken={workspaceToken}
              onSignInGoogle={handleGoogleSignIn}
              onCreateAppointment={handleCreateAppointment}
              onDeleteAppointment={handleDeleteAppointment}
            />
          )}

          {activeSection === 'prospects' && (
            <ProspectsOutreachView
              state={state}
              workspaceToken={workspaceToken}
              onSignInGoogle={handleGoogleSignIn}
              onCreateProspect={handleCreateProspect}
              onUpdateProspect={handleUpdateProspect}
              onDeleteProspect={handleDeleteProspect}
              onSaveDefaultFormId={(formId) =>
                handleUpdateSettings({ defaultGoogleFormId: formId })
              }
            />
          )}

          {activeSection === 'integrations' && (
            <IntegrationsHubView
              state={state}
              workspaceToken={workspaceToken}
              providerStatuses={providerStatuses}
              onSignInGoogle={handleGoogleSignIn}
              onRefreshOAuthStatuses={fetchOAuthStatuses}
              onSaveSettings={handleUpdateSettings}
            />
          )}

          {activeSection === 'team-finance' && (
            <TeamFinanceView
              state={state}
              currentUserEmail={gate.email || user?.email || ''}
              onUpdateMember={handleUpdateMember}
              onAddMember={handleAddMember}
              onAddFinance={handleAddFinance}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </main>
      </div>

      <JarvisDrawer
        open={jarvisOpen}
        onClose={() => setJarvisOpen(false)}
        state={state}
        user={user}
        workspaceToken={workspaceToken}
        providerStatuses={providerStatuses}
      />
    </div>
  );
}
