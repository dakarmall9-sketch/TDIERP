import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginScreen: React.FC = () => {
  const {
    authStatus,
    authError,
    firebaseUser,
    signInToErp,
    signOutFromErp,
    retryAuthBootstrap,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInToErp();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Échec de connexion Google.';
      if (msg.includes('popup-closed-by-user')) {
        setLocalError('La fenêtre de connexion Google a été fermée avant la validation.');
      } else if (msg.includes('popup-blocked')) {
        setLocalError('Votre navigateur a bloqué la fenêtre popup. Autorisez les popups pour continuer.');
      } else {
        setLocalError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle architectural background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Brand Header */}
        <div className="px-7 pt-8 pb-6 bg-gradient-to-b from-slate-800/70 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
              TM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">TRANSMOVE</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  OS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ERP Déménagement, Transport & Transit International
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Accès sécurisé sur invitation administrateur uniquement</span>
          </div>
        </div>

        {/* Body by Auth State */}
        <div className="p-7 space-y-5">
          {authStatus === 'loading' && (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <div className="text-sm font-bold text-white">
                Vérification de votre session...
              </div>
              <p className="text-xs text-slate-400">
                Synchronisation de vos autorisations et de votre espace entreprise.
              </p>
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <>
              <div className="space-y-1.5">
                <h1 className="text-lg font-bold text-white">Connexion à l’espace de travail</h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connectez-vous avec votre compte Google professionnel ou client autorisé par l’administrateur de l’entreprise.
                </p>
              </div>

              {(localError || authError) && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{localError || authError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Se connecter avec Google</span>
              </button>

              <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Collaborateurs : vos droits d’accès sont gérés dans le module RH</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Clients : accédez à vos devis, factures et suivi de chantier</span>
                </div>
              </div>
            </>
          )}

          {authStatus === 'unauthorized' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Accès non activé pour ce compte</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Vous êtes connecté en tant que{' '}
                  <strong className="text-white">{firebaseUser?.email}</strong>, mais aucune invitation active n’a été trouvée pour cette adresse email (ou votre accès a été suspendu).
                </p>
                <p className="text-[11px] text-slate-400">
                  Demandez à votre administrateur TransMove de vous ajouter dans le module Ressources Humaines ou Invitations Clients avec cette adresse exacte.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retryAuthBootstrap}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Revérifier</span>
                </button>
                <button
                  type="button"
                  onClick={signOutFromErp}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-semibold text-xs border border-rose-500/30 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Changer de compte</span>
                </button>
              </div>
            </div>
          )}

          {authStatus === 'error' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Erreur d’initialisation</span>
                </div>
                <p className="text-xs text-slate-300 break-words">
                  {authError || 'Impossible de contacter la base de données.'}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retryAuthBootstrap}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Réessayer</span>
                </button>
                {firebaseUser && (
                  <button
                    type="button"
                    onClick={signOutFromErp}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
                  >
                    Déconnexion
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
