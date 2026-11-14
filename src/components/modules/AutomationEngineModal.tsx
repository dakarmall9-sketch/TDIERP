import React from 'react';
import {
  Workflow,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Zap,
  X,
  History,
  FileCheck2,
  Truck,
  Receipt,
  Boxes,
  Ship,
  Mail,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationEngineModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { automationLogs, triggerEndToEndAutomationDemo } = useApp();

  if (!isOpen) return null;

  const automationRules = [
    {
      id: 'aut-1',
      title: 'Création Client Automatique',
      trigger: 'Demande de RDV soumise via formulaire web ou interne',
      action: 'Fiche client créée & attribution immédiate à un commercial disponible',
      icon: CheckCircle2,
      color: 'text-blue-400',
    },
    {
      id: 'aut-2',
      title: 'Conversion Devis → Chantier Opérationnel',
      trigger: 'Client clique sur "Accepter le Devis" ou signature reçue',
      action: 'Création automatique du Chantier #CH-xxxx au planning + affectation équipe',
      icon: Truck,
      color: 'text-amber-400',
    },
    {
      id: 'aut-3',
      title: 'Réservation Automatique de Stock',
      trigger: 'Acceptation du devis avec cubage calculé',
      action: 'Réservation instantanée des cartons, rubans PVC et housses au magasin',
      icon: Boxes,
      color: 'text-cyan-400',
    },
    {
      id: 'aut-4',
      title: 'Auto-Facturation Fin de Prestation',
      trigger: 'Chantier marqué comme "Livré" avec signature électronique du client',
      action: 'Génération instantanée de la facture (#FAC-xxxx) + envoi email au client',
      icon: Receipt,
      color: 'text-emerald-400',
    },
    {
      id: 'aut-5',
      title: 'Sortie Définitive du Stock',
      trigger: 'Clôture de mission & validation du bon de livraison émargé',
      action: 'Décrémentation définitive des matières consommées et calcul du coût réel',
      icon: Boxes,
      color: 'text-purple-400',
    },
    {
      id: 'aut-6',
      title: 'Surveillance Conformité Flotte (< 30 jours)',
      trigger: 'Cron quotidien de vérification des dates de validité',
      action: 'Alerte immédiate si assurance ou contrôle technique expire sous 30 jours',
      icon: Truck,
      color: 'text-rose-400',
    },
    {
      id: 'aut-7',
      title: 'Alerte Documents Douane Manquants',
      trigger: 'Contrôle automatique du cutoff navire avant départ conteneur',
      action: 'Notification d’alerte si B/L, certificat d’origine ou déclaration manque',
      icon: Ship,
      color: 'text-blue-400',
    },
    {
      id: 'aut-8',
      title: 'Relance Factures Impayées',
      trigger: 'Date d’échéance dépassée avec solde restant dû > 0',
      action: 'Envoi automatique d’un email de relance avec lien de paiement sécurisé',
      icon: Mail,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Moteur d'Automatisations TransMove OS
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Actif en Continu
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Cascades événementielles : chaque action déclenche automatiquement les modules rattachés
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Callout Bar */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tester immédiatement le moteur en déclenchant un scénario de bout en bout</span>
          </div>

          <button
            onClick={() => {
              triggerEndToEndAutomationDemo();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Lancer la Démo Automatique (1-Clic)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Active Rules List */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm">Règles Métier d'Automatisation Configurées</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {automationRules.map((rule) => {
                const Icon = rule.icon;
                return (
                  <div key={rule.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Icon className={`w-4 h-4 ${rule.color}`} />
                      <span>{rule.title}</span>
                    </div>
                    <div className="text-slate-400">
                      <span className="text-amber-400 font-semibold">Déclencheur :</span> {rule.trigger}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-emerald-400 font-semibold">Action :</span> {rule.action}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Activity Logs */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Journal d’Audit des Exécutions Automatiques ({automationLogs.length})
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {automationLogs.map((log) => {
                const isAlert = log.status === 'alerte';
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border flex items-start justify-between text-xs ${
                      isAlert ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{log.triggerEvent}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-mono font-bold ${
                            isAlert ? 'bg-rose-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div className="text-amber-300 font-medium">{log.actionTaken}</div>
                      <div className="text-[10px] text-slate-400">{log.details}</div>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 shrink-0 ml-4 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/60 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
