import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Truck,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  main_d_oeuvre: 'Salaires & Main-d’œuvre déménageurs',
  transit: 'Fret Maritime & Traction Portuaire',
  douane: 'Droits & Frais de Douane',
  carburant: 'Carburant Flotte de Camions',
  emballage: 'Achat Cartons, Adhésifs & Protections',
  reparation_vehicule: 'Entretien & Réparations Véhicules',
  peage: 'Péages & Frais de Route',
  stockage: 'Garde-meuble & Entrepôt',
  annexe: 'Dépenses Annexes',
};

export const DashboardsModule: React.FC = () => {
  const {
    invoices,
    expenses,
    chantiers,
    quotes,
    appointments,
    vehicles,
    employees,
    transitShipments,
    currentCompany,
  } = useApp();

  const [currentDashboard, setCurrentDashboard] = useState<'financier' | 'operationnel' | 'flotte'>('financier');

  // Financial calculations
  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalUnpaid = Math.max(0, totalInvoiced - totalPaid);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const grossMargin = totalPaid - totalExpenses;
  const marginPct = totalPaid > 0 ? Math.round((grossMargin / totalPaid) * 100) : 0;
  const collectionPct = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  // Dynamic Revenue & Profitability by Activity Pole
  const activityBreakdown = useMemo(() => {
    const poles = [
      {
        name: 'Déménagement Résidentiel (Local & National)',
        ca: quotes
          .filter((q) => (q.serviceType === 'local' || q.serviceType === 'national') && q.status !== 'refuse')
          .reduce((s, q) => s + q.total, 0),
        color: 'bg-amber-500',
      },
      {
        name: 'Transport & Transfert Entreprises / International',
        ca: quotes
          .filter((q) => (q.serviceType === 'transport' || q.serviceType === 'international') && q.status !== 'refuse')
          .reduce((s, q) => s + q.total, 0),
        color: 'bg-emerald-500',
      },
      {
        name: 'Transit Maritime & Douane (Import / Export)',
        ca:
          transitShipments.reduce((s, t) => s + (t.totalClientPrice || 0), 0) +
          quotes
            .filter((q) => (q.serviceType === 'import' || q.serviceType === 'export') && q.status !== 'refuse')
            .reduce((s, q) => s + q.total, 0),
        color: 'bg-cyan-500',
      },
      {
        name: 'Garde-meuble & Stockage Sécurisé',
        ca: quotes
          .filter((q) => q.serviceType === 'storage' && q.status !== 'refuse')
          .reduce((s, q) => s + q.total, 0),
        color: 'bg-purple-500',
      },
    ];

    const totalPoleCa = poles.reduce((s, p) => s + p.ca, 0);
    return poles.map((p) => {
      const share = totalPoleCa > 0 ? Math.round((p.ca / totalPoleCa) * 100) : 0;
      return { ...p, share };
    });
  }, [quotes, transitShipments]);

  // Dynamic Expenses Grouping
  const expenseBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach((e) => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });
    const entries = Object.entries(grouped)
      .map(([cat, amount]) => ({
        category: cat,
        label: EXPENSE_CATEGORY_LABELS[cat] || cat,
        amount,
        pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    return entries;
  }, [expenses, totalExpenses]);

  const monthlyPayrollEstimate = employees
    .filter((e) => e.status !== 'arret')
    .reduce((sum, e) => sum + (e.monthlySalary || 0), 0);

  // Operational metrics
  const acceptedQuotes = quotes.filter((q) => q.status === 'accepte').length;
  const conversionRate = quotes.length > 0 ? Math.round((acceptedQuotes / quotes.length) * 100) : 0;
  const inProgressCount = chantiers.filter((c) => c.status === 'en_cours' || c.status === 'en_transit' || c.status === 'arrive_depot').length;
  const completedCount = chantiers.filter((c) => c.status === 'termine' || c.status === 'livre').length;

  // Fleet metrics
  const availableVehicles = vehicles.filter((v) => v.status === 'disponible').length;
  const onMissionVehicles = vehicles.filter((v) => v.status === 'en_mission').length;
  const inMaintenanceVehicles = vehicles.filter((v) => v.status === 'en_maintenance' || v.status === 'immobilise').length;
  const totalFleetVolumeM3 = vehicles.reduce((sum, v) => sum + (v.volumeCapacityM3 || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 13
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Tableaux de Bord Stratégiques (3 Vues Exécutives)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervision 360° en temps réel : Pilotage Financier, Direction des Opérations et Gestionnaire de Flotte
          </p>
        </div>

        {/* Dashboard View Switcher */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: 'financier', label: '1. Financier & Rentabilité', icon: TrendingUp },
            { id: 'operationnel', label: '2. Opérations & Chantiers', icon: Activity },
            { id: 'flotte', label: '3. Flotte & Véhicules', icon: Truck },
          ].map((dash) => {
            const Icon = dash.icon;
            const isActive = currentDashboard === dash.id;

            return (
              <button
                key={dash.id}
                onClick={() => setCurrentDashboard(dash.id as 'financier' | 'operationnel' | 'flotte')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{dash.label}</span>
                <span className="sm:hidden">{dash.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DASHBOARD 1: FINANCIER */}
      {currentDashboard === 'financier' && (
        <div className="space-y-6">
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Chiffre d’Affaires Facturé</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {totalInvoiced.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <span>{collectionPct}% encaissé ({invoices.length} facture(s))</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Encaissements Réalisés</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {totalPaid.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Caisse & banques réconciliées</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Créances / Impayés</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2">
                {totalUnpaid.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
              </div>
              <div className="text-[10px] text-rose-400/80 mt-1">
                {invoices.filter((i) => i.totalAmount > i.paidAmount).length} facture(s) en attente
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Marge Nette Globale</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2">
                {grossMargin.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
              </div>
              <div className="text-[10px] text-amber-500 mt-1 font-bold">Taux de marge nette : {marginPct}%</div>
            </div>
          </div>

          {/* Breakdown by Service Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-sm">Activité Commerciale par Pôle Métier (Devis & Transit)</h3>
              <div className="space-y-3 text-xs">
                {activityBreakdown.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-semibold">{s.name}</span>
                      <span className="font-mono font-bold text-white">
                        {s.ca.toLocaleString()} {currentCompany.currency} ({s.share}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Répartition Réelle des Dépenses</h3>
                <span className="text-[11px] font-mono text-rose-300 font-bold">
                  Total : {totalExpenses.toLocaleString()} {currentCompany.currency}
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                {expenseBreakdown.map((e) => (
                  <div
                    key={e.category}
                    className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80"
                  >
                    <span className="text-slate-300">{e.label}</span>
                    <span className="font-mono font-bold text-rose-300">
                      {e.amount.toLocaleString()} {currentCompany.currency} ({e.pct}%)
                    </span>
                  </div>
                ))}
                {expenseBreakdown.length === 0 && (
                  <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Aucune dépense enregistrée pour le moment.
                  </div>
                )}
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px]">
                  <span className="text-slate-400">Masse salariale mensuelle indicative ({employees.filter((e) => e.status !== 'arret').length} actifs)</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {monthlyPayrollEstimate.toLocaleString()} {currentCompany.currency} / mois
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD 2: OPÉRATIONNEL */}
      {currentDashboard === 'operationnel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Demandes Visites / RDV</div>
              <div className="text-2xl font-black text-white mt-2">{appointments.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Dossiers enregistrés</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Taux Conversion Devis</div>
              <div className="text-2xl font-black text-amber-400 mt-2">{conversionRate}%</div>
              <div className="text-[10px] text-amber-500 mt-1">{acceptedQuotes} devis gagnés / {quotes.length}</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Chantiers Actifs</div>
              <div className="text-2xl font-black text-emerald-400 mt-2">{inProgressCount}</div>
              <div className="text-[10px] text-emerald-500 mt-1">En cours ou en transit</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Missions Clôturées</div>
              <div className="text-2xl font-black text-cyan-400 mt-2">{completedCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Livrées / Émargées</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-sm">Charge de Travail et Disponibilité des Équipes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {employees.slice(0, 6).map((emp) => {
                const assignedCount = chantiers.filter(
                  (c) => c.teamLeaderId === emp.id || c.moverIds.includes(emp.id)
                ).length;

                return (
                  <div key={emp.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[11px] text-slate-400">{emp.teamName} • {emp.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">
                        {emp.completedMissionsCount} clôturées • {assignedCount} affectées
                      </div>
                      <div className="text-[10px] text-slate-500">Note satisfaction : {emp.performanceRating}/5</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD 3: FLOTTE ET VÉHICULES */}
      {currentDashboard === 'flotte' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Véhicules Disponibles</div>
              <div className="text-2xl font-black text-emerald-400 mt-2">{availableVehicles}</div>
              <div className="text-[10px] text-slate-500 mt-1">Prêts pour affectation</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Véhicules en Mission</div>
              <div className="text-2xl font-black text-amber-400 mt-2">{onMissionVehicles}</div>
              <div className="text-[10px] text-slate-500 mt-1">Sur la route / chantiers</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Maintenance / Immobilisés</div>
              <div className="text-2xl font-black text-blue-400 mt-2">{inMaintenanceVehicles}</div>
              <div className="text-[10px] text-slate-500 mt-1">Atelier mécanique</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-xs">Total Parc Roulant</div>
              <div className="text-2xl font-black text-white mt-2">{vehicles.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                Capacité cumulée : {totalFleetVolumeM3} m³
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-white text-sm">Alertes de Conformité & Visites Techniques Roulantes</h3>
            <div className="space-y-2 text-xs">
              {vehicles.map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-mono font-bold text-white">{v.plateNumber}</span>
                      <span className="text-slate-400 ml-2">({v.brand} {v.model})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] text-slate-500">Assurance</div>
                      <div className="text-slate-300 font-semibold">{v.insuranceExpiry}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Contrôle technique</div>
                      <div className="text-slate-300 font-semibold">{v.inspectionExpiry}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
