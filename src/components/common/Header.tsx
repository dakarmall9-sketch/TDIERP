import React from 'react';
import {
  Building2,
  UserCheck,
  Sparkles,
  Server,
  Zap,
  Cloud,
  LogOut,
  Settings,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { GlobalSearchBar } from './GlobalSearchBar';

interface HeaderProps {
  onOpenArchitecture: () => void;
  onOpenAutomations: () => void;
  onOpenDrive: () => void;
  onOpenCompanySettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenArchitecture,
  onOpenAutomations,
  onOpenDrive,
  onOpenCompanySettings,
}) => {
  const {
    currentCompany,
    currentUserProfile,
    activeRole,
    setActiveRole,
    impersonatedRole,
    setImpersonatedRole,
    signOutFromErp,
    triggerEndToEndAutomationDemo,
    automationLogs,
    isGoogleConnected,
  } = useApp();

  const isRealAdmin = currentUserProfile?.role === 'admin';
  const isStaff = activeRole !== 'client';

  const roleLabels: Record<UserRole, { label: string; badgeColor: string }> = {
    admin: { label: 'Administrateur', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
    manager: { label: 'Direction / Manager', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    commercial: { label: 'Commercial', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    dispatcher: { label: 'Coordinateur / Dispatch', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    driver: { label: 'Chauffeur / Déménageur', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    accountant: { label: 'Comptable', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    warehouse: { label: 'Magasinier', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    fleet_manager: { label: 'Responsable Flotte', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    hr: { label: 'Ressources Humaines', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    client: { label: 'Espace Client', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between z-30 sticky top-0 gap-2">
      {/* Brand & Single-Company Display */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            TM
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5 font-bold text-white tracking-tight leading-tight">
              <span>{currentCompany.logoText || 'TRANSMOVE'}</span>
              <span className="text-amber-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                OS
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block -mt-0.5">ERP Déménagement & Transit</span>
          </div>
        </div>

        {/* Single-Company Badge + Admin Edit */}
        <div className="ml-1 pl-3 border-l border-slate-800 hidden lg:flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
            {currentCompany.name}
          </span>
          {isRealAdmin && (
            <button
              type="button"
              onClick={onOpenCompanySettings}
              title="Configurer les informations de l'entreprise"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Global Quick Search Bar (Staff only) */}
      {isStaff ? <GlobalSearchBar /> : <div className="flex-1" />}

      {/* User & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isRealAdmin && !impersonatedRole && (
          <button
            type="button"
            onClick={triggerEndToEndAutomationDemo}
            title="Exécuter un cycle complet de test en 1 clic : Demande -> Devis -> Acceptation -> Chantier"
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition transform active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Cycle 1-Clic</span>
          </button>
        )}

        {isRealAdmin && (
          <button
            type="button"
            onClick={onOpenArchitecture}
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-amber-300 text-xs font-semibold border border-slate-700 transition"
          >
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span>Architecture</span>
          </button>
        )}

        {isStaff && (
          <button
            type="button"
            onClick={onOpenAutomations}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Automatisations</span>
            {automationLogs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center">
                {automationLogs.length}
              </span>
            )}
          </button>
        )}

        {isStaff && (
          <button
            type="button"
            onClick={onOpenDrive}
            title="Stockage & Sauvegardes Google Drive"
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isGoogleConnected
                ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 border-slate-700'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${isGoogleConnected ? 'text-blue-400 fill-current' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Drive</span>
          </button>
        )}

        {/* Admin-only Role Preview Switcher */}
        {isRealAdmin && (
          <div className="hidden md:flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700">
            <Eye className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              title="Aperçu vue rôle (Admin uniquement)"
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              {Object.entries(roleLabels).map(([roleKey, roleObj]) => (
                <option key={roleKey} value={roleKey} className="bg-slate-900 text-white">
                  {roleObj.label}
                </option>
              ))}
            </select>
            {impersonatedRole && (
              <button
                type="button"
                onClick={() => setImpersonatedRole(null)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold"
              >
                Admin
              </button>
            )}
          </div>
        )}

        {/* Authenticated User Badge + Logout */}
        <div className="flex items-center gap-2 bg-slate-800/90 rounded-xl px-2.5 py-1 border border-slate-700">
          {currentUserProfile?.photoUrl ? (
            <img
              src={currentUserProfile.photoUrl}
              alt={currentUserProfile.displayName}
              className="w-6 h-6 rounded-full border border-amber-500/40"
            />
          ) : (
            <UserCheck className="w-4 h-4 text-emerald-400" />
          )}
          <div className="hidden sm:block leading-tight">
            <div className="text-[11px] font-bold text-white truncate max-w-[120px]">
              {currentUserProfile?.displayName || 'Utilisateur'}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {roleLabels[activeRole]?.label}
            </div>
          </div>
          {!isRealAdmin && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleLabels[activeRole]?.badgeColor} hidden xl:inline`}>
              {roleLabels[activeRole]?.label}
            </span>
          )}
          <button
            type="button"
            onClick={signOutFromErp}
            title="Se déconnecter"
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
