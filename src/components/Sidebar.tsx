import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  CalendarDays,
  MailCheck,
  PlugZap,
  Users,
  X,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'ai-studio'
  | 'projects'
  | 'calendar'
  | 'prospects'
  | 'integrations'
  | 'team-finance';

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  agencyName: string;
  currentMonthLabel: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  connectedGoogle: boolean;
  connectedThirdPartyCount: number;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'ai-studio', label: 'Google AI Studio', icon: Sparkles },
  { id: 'projects', label: 'Projets & Tâches', icon: FolderKanban },
  { id: 'calendar', label: 'Agenda & RDV', icon: CalendarDays },
  { id: 'prospects', label: 'Prospection & Gmail', icon: MailCheck },
  { id: 'integrations', label: 'Comptes & Outils', icon: PlugZap },
  { id: 'team-finance', label: 'Équipe & Caisse 70/20/10', icon: Users },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelect,
  agencyName,
  currentMonthLabel,
  mobileOpen,
  onCloseMobile,
  connectedGoogle,
  connectedThirdPartyCount,
}) => {
  const initials = (agencyName || 'AW')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-slate-950 text-slate-300 border-r border-slate-800/80 px-4 py-5">
      <div>
        <div className="flex items-center justify-between px-2 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white tracking-wide">
              {initials || 'AW'}
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-white truncate">
                {agencyName}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-400 capitalize truncate">
                {currentMonthLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 space-y-1" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800/80 pt-4 px-2 space-y-2.5 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Google Workspace</span>
          <span className={`font-medium ${connectedGoogle ? 'text-emerald-400' : 'text-amber-400'}`}>
            {connectedGoogle ? 'Connecté' : 'À connecter'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Outils web</span>
          <span className="font-medium text-slate-200">
            4 accès directs
          </span>
        </div>
        <div className="pt-1 text-[11px] text-slate-500">
          Rythme d’équipe · 5h/sem max
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-full">{navContent}</div>
        </div>
      )}
    </>
  );
};
