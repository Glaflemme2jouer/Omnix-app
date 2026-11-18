import React, { useState } from 'react';
import { Download, Monitor, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        title="Installer Omnix sur ce PC ou téléphone"
      >
        <Download className="h-3.5 w-3.5 text-slate-600" />
        <span>Installer sur PC</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="pwa-install-title" className="text-sm font-semibold text-slate-900">
                  Installer Omnix comme logiciel
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ajoute une icône Omnix sur le bureau (Windows, Mac ou téléphone).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <span>Sur iPhone / iPad (Safari)</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Touchez le bouton <strong>Partager</strong> en bas ou en haut de Safari.</li>
                  <li>Faites défiler et touchez <strong>Sur l’écran d’accueil</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <span>Sur PC Windows ou Mac (Chrome / Edge)</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>
                    Ouvrez l’adresse de l’app directement dans un onglet normal de <strong>Chrome</strong> ou <strong>Edge</strong> (pas dans l’aperçu intégré).
                  </li>
                  <li>
                    Cliquez sur l’icône <strong>Installer Omnix</strong> à droite de la barre d’adresse, ou ouvrez le menu <code className="font-mono">⋮</code> → <strong>Caster, enregistrer et partager</strong> → <strong>Installer la page en tant qu’application</strong>.
                  </li>
                  <li>
                    Omnix s’ouvrira alors comme un vrai logiciel indépendant sur le bureau.
                  </li>
                </ol>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
