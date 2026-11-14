import React, { useState, useEffect, useRef } from 'react';
import { Building2, Save, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CompanySettings } from '../../types';
import { useRealtimeAutoSave } from '../../hooks/useAutoSave';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanySettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentCompany, updateCompanySettings, currentUserProfile, notify } = useApp();
  const isAdmin = currentUserProfile?.role === 'admin';

  const [form, setForm] = useState<CompanySettings>(currentCompany);
  const [isSaving, setIsSaving] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && (!wasOpenRef.current || !isAdmin)) {
      setForm(currentCompany);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, isAdmin, currentCompany]);

  const { cancelPending } = useRealtimeAutoSave({
    enabled: Boolean(isOpen && isAdmin),
    data: form,
    resetKey: isOpen ? 'company-settings-open' : 'company-settings-closed',
    delayMs: 600,
    onSave: (draft) => {
      if (
        !isAdmin ||
        draft.name.trim().length < 2 ||
        draft.email.trim().length < 3 ||
        draft.currency.trim().length < 3
      ) {
        return;
      }
      void updateCompanySettings(draft, { silent: true });
    },
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      notify('Accès restreint', 'Seul un administrateur peut modifier les paramètres entreprise.', 'warning');
      return;
    }
    cancelPending();
    setIsSaving(true);
    try {
      await updateCompanySettings(form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            Paramètres de l’Entreprise
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Raison Sociale *</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Sigle / Logo Texte</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.logoText}
                onChange={(e) => setForm({ ...form, logoText: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Pays / Zone</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Devise principale *</label>
              <select
                disabled={!isAdmin}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="EUR">EUR (€)</option>
                <option value="XOF">XOF (FCFA)</option>
                <option value="USD">USD ($)</option>
                <option value="MAD">MAD (DH)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">TVA par défaut (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                step="0.5"
                disabled={!isAdmin}
                value={form.defaultTaxRate ?? 18}
                onChange={(e) => setForm({ ...form, defaultTaxRate: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email officiel *</label>
              <input
                type="email"
                required
                disabled={!isAdmin}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Adresse complète (Devis & Factures)</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">NINEA / SIRET / TVA Intracommunautaire</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.taxNumber}
                onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
            >
              Fermer
            </button>
            {isAdmin && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
