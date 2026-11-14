import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Calculator,
  FileCheck2,
  CalendarClock,
  Truck,
  Ship,
  Anchor,
  Boxes,
  Car,
  Receipt,
  Users2,
  Mail,
  UserSquare2,
  Workflow,
  Cloud,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  onOpenDrive?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDrive }) => {
  const {
    activeModule,
    setActiveModule,
    activeRole,
    currentCompany,
    hasPermission,
    chantiers,
    transitShipments,
    stockItems,
    quotes,
    invoices,
    isGoogleConnected,
  } = useApp();

  const pendingQuotesCount = quotes.filter((q) => q.status === 'envoye' || q.status === 'en_attente').length;
  const runningChantiersCount = chantiers.filter((c) => c.status === 'en_cours' || c.status === 'en_transit').length;
  const missingDocsTransitCount = transitShipments.reduce((acc, t) => {
    return acc + t.documents.filter((d) => d.status === 'manquant').length;
  }, 0);
  const lowStockCount = stockItems.filter((i) => i.quantityInStock <= i.minThreshold).length;
  const unpaidInvoicesCount = invoices.filter((i) => i.status === 'emise' || i.status === 'en_retard').length;

  const menuSections = [
    {
      title: 'VUE GLOBALE',
      items: [
        { id: 'dashboard', label: 'Tableaux de Bord (3)', icon: LayoutDashboard, badge: null },
      ],
    },
    {
      title: 'COMMERCIAL & RELATION',
      items: [
        { id: 'appointments', label: '1. Demandes & RDV', icon: CalendarDays, badge: null },
        { id: 'volume', label: '2. Estimation Volume m³', icon: Calculator, badge: null },
        {
          id: 'quotes',
          label: '3. Devis & Contrats',
          icon: FileCheck2,
          badge: pendingQuotesCount > 0 ? pendingQuotesCount : null,
          badgeColor: 'bg-amber-500/20 text-amber-300',
        },
      ],
    },
    {
      title: 'EXÉCUTION & CHANTIERS',
      items: [
        { id: 'dispatch', label: '4. Planning Opérations', icon: CalendarClock, badge: null },
        {
          id: 'operations',
          label: '5. Suivi & Team Leader',
          icon: Truck,
          badge: runningChantiersCount > 0 ? runningChantiersCount : null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
      ],
    },
    {
      title: 'TRANSIT INTERNATIONAL',
      items: [
        { id: 'shipping', label: '7. Compagnies Maritimes', icon: Anchor, badge: null },
        {
          id: 'customs',
          label: '8. Transit & Douane',
          icon: Ship,
          badge: missingDocsTransitCount > 0 ? `${missingDocsTransitCount} docs` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300',
        },
      ],
    },
    {
      title: 'LOGISTIQUE & RESSOURCES',
      items: [
        {
          id: 'stock',
          label: '9. Stock & Matériel',
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} alerte` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300',
        },
        { id: 'fleet', label: '10. Gestion Flotte & GPS', icon: Car, badge: null },
        {
          id: 'accounting',
          label: '6. Comptabilité & Factures',
          icon: Receipt,
          badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : null,
          badgeColor: 'bg-cyan-500/20 text-cyan-300',
        },
        { id: 'hr', label: '11. Ressources Humaines', icon: Users2, badge: null },
      ],
    },
    {
      title: 'COMMUNICATION & ESPACE',
      items: [
        { id: 'emails', label: '12. Messagerie Intégrée', icon: Mail, badge: null },
        {
          id: 'client-portal',
          label: 'Espace Client Dédié',
          icon: UserSquare2,
          badge: 'Client',
          badgeColor: 'bg-teal-500/20 text-teal-300',
        },
        {
          id: 'automations',
          label: 'Moteur d’Automatisations',
          icon: Workflow,
          badge: 'Flux',
          badgeColor: 'bg-purple-500/20 text-purple-300',
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 select-none overflow-y-auto">
      <div className="p-4 space-y-6">
        {menuSections.map((sec, secIdx) => {
          const visibleItems = sec.items.filter((item) => hasPermission(item.id));
          if (visibleItems.length === 0) return null;

          return (
            <div key={secIdx}>
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider px-3 mb-1.5">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                            isActive ? 'bg-slate-950/20 text-slate-950' : item.badgeColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Status */}
      <div className="mt-auto p-4 border-t border-slate-800/80 bg-slate-900/40">
        {onOpenDrive && activeRole !== 'client' && (
          <button
            type="button"
            onClick={onOpenDrive}
            className="w-full mb-3 flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-semibold text-blue-300 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
              <span>Google Drive & Backups</span>
            </div>
            {isGoogleConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                Cloud
              </span>
            )}
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate">{currentCompany.name}</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 truncate">
          Rôle actif : <span className="text-amber-400 font-semibold">{activeRole}</span>
        </div>
      </div>
    </aside>
  );
};
