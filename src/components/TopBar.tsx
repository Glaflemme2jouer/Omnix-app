import React from 'react';
import { Bot, Menu, LogOut, Sparkles } from 'lucide-react';
import type { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PWAInstallButton } from './PWAInstallButton';
import type { NavSection } from './Sidebar';

interface TopBarProps {
  activeSection: NavSection;
  agencyName: string;
  gateEmail?: string | null;
  user: User | null;
  hasWorkspaceToken: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenMobileMenu: () => void;
  onQuickOpenStudio: () => void;
  onOpenJarvis: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Vue d’ensemble',
  'ai-studio': 'Google AI Studio',
  projects: 'Projets & Tâches',
  calendar: 'Agenda & Rendez-vous',
  prospects: 'Prospection, Gmail & Forms',
  integrations: 'Comptes & Outils intégrés',
  'team-finance': 'Équipe, Rôles & Caisse 70/20/10',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  agencyName,
  gateEmail,
  user,
  hasWorkspaceToken,
  signingIn,
  onSignIn,
  onSignOut,
  onOpenMobileMenu,
  onQuickOpenStudio,
  onOpenJarvis,
}) => {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline text-slate-400 whitespace-nowrap">{agencyName}</span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
          <h1 className="font-semibold text-slate-900 truncate">
            {SECTION_LABELS[activeSection]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <PWAInstallButton />

        <button
          type="button"
          onClick={onOpenJarvis}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Bot className="h-3.5 w-3.5 text-blue-600" />
          <span>Jarvis</span>
        </button>

        {activeSection !== 'ai-studio' && (
          <button
            type="button"
            onClick={onQuickOpenStudio}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Studio IA</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <div className="text-xs font-medium text-slate-900 truncate max-w-[160px]">
                {user.displayName || user.email}
              </div>
              <div className="text-[11px] text-slate-500">
                {hasWorkspaceToken ? 'Workspace actif' : 'Reconnecter Workspace'}
              </div>
            </div>
            {!hasWorkspaceToken && (
              <GoogleSignInButton
                onClick={onSignIn}
                loading={signingIn}
                label="Activer Drive & Agenda"
              />
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        ) : gateEmail ? (
          <div className="flex items-center gap-2.5">
            <div className="hidden md:block text-right">
              <div className="text-xs font-medium text-slate-900 truncate max-w-[160px]">
                {gateEmail}
              </div>
              <div className="text-[11px] text-slate-500">Session Omnix</div>
            </div>
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              title="Optionnel : lier Google Calendar, Drive et Gmail"
            >
              <span>{signingIn ? 'Connexion...' : 'Lier Google'}</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        ) : (
          <GoogleSignInButton onClick={onSignIn} loading={signingIn} />
        )}
      </div>
    </header>
  );
};
