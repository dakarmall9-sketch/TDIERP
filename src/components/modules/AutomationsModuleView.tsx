import React from 'react';
import {
  Workflow,
  CheckCircle2,
  Play,
  Zap,
  History,
  Truck,
  Receipt,
  Boxes,
  Ship,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AutomationsModuleView: React.FC = () => {
  const { automationLogs, triggerEndToEndAutomationDemo } = useApp();

  const automationRules = [
    {
      id: 'aut-1',
      title: 'Création Client & Attribution Commerciale',
      trigger: 'Nouvelle demande de RDV enregistrée',
      action: 'Création fiche dossier & affectation commerciale automatique',
      icon: CheckCircle2,
      color: 'text-blue-400',
    },
    {
      id: 'aut-2',
      title: 'Conversion Devis → Chantier Opérationnel',
      trigger: 'Devis accepté (par le client en ligne ou par le commercial)',
      action: 'Création automatique du Chantier au planning + affectation équipe/véhicule',
      icon: Truck,
      color: 'text-amber-400',
    },
    {
      id: 'aut-3',
      title: 'Réservation Automatique de Stock',
      trigger: 'Acceptation du devis avec cubage m³',
      action: 'Réservation immédiate des cartons, rubans PVC et housses au magasin',
      icon: Boxes,
      color: 'text-cyan-400',
    },
    {
      id: 'aut-4',
      title: 'Auto-Facturation Fin de Prestation',
      trigger: 'Chantier marqué "Livré" ou "Terminé" avec signature client',
      action: 'Génération automatique de la Facture + sortie définitive du stock + email client',
      icon: Receipt,
      color: 'text-emerald-400',
    },
    {
      id: 'aut-5',
      title: 'Conformité Flotte & Contrôles (< 30 jours)',
      trigger: 'Vérification des échéances Assurance & Visite Technique',
      action: 'Alerte préventive sur les tableaux de bord flotte et log d’audit',
      icon: AlertTriangle,
      color: 'text-rose-400',
    },
    {
      id: 'aut-6',
      title: 'Suivi Documents Douane & Relances',
      trigger: 'Dossier transit avec document manquant ou facture échue',
      action: 'Indicateurs temps réel + envoi de relance email via serveur SMTP',
      icon: Ship,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              WORKFLOWS MÉTIER
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Workflow className="w-5 h-5 text-purple-400" />
              Moteur d’Automatisations & Journal d’Audit
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cascades temps réel persistées dans Firestore entre Demandes, Devis, Chantiers, Stock, Facturation et Messagerie
          </p>
        </div>

        <button
          type="button"
          onClick={triggerEndToEndAutomationDemo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Exécuter Cycle Complet (RDV → Chantier)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {automationRules.map((rule) => {
          const Icon = rule.icon;
          return (
            <div
              key={rule.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Icon className={`w-4 h-4 ${rule.color}`} />
                  <span>{rule.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Actif
                </span>
              </div>
              <p className="text-slate-400">
                <strong className="text-amber-400">Déclencheur :</strong> {rule.trigger}
              </p>
              <p className="text-slate-300">
                <strong className="text-emerald-400">Action :</strong> {rule.action}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Journal d’Audit Temps Réel ({automationLogs.length} événements)
          </h2>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Synchronisé Firestore
          </span>
        </div>

        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {automationLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              Aucun événement enregistré pour le moment.
            </div>
          ) : (
            automationLogs.map((log) => {
              const isAlert = log.status === 'alerte';
              const isError = log.status === 'erreur';
              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                    isError
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : isAlert
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
                      <span>{log.triggerEvent}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono font-bold ${
                          isError
                            ? 'bg-rose-500 text-slate-950'
                            : isAlert
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="text-amber-300 font-medium">{log.actionTaken}</div>
                    <div className="text-[11px] text-slate-400">{log.details}</div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
