import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Truck,
  Receipt,
  CheckCircle2,
  XCircle,
  Download,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateQuotePdfBlob, generateInvoicePdfBlob } from '../../utils/pdfGenerator';
import { Invoice, Quote } from '../../types';

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ClientPortalView: React.FC = () => {
  const {
    quotes,
    chantiers,
    invoices,
    appointments,
    currentCompany,
    activeRole,
    currentUserProfile,
    acceptQuote,
    refuseQuote,
    notify,
  } = useApp();

  const isStaffPreview = activeRole !== 'client';

  // For staff previewing the client portal, let them pick a client email to inspect
  const knownClientEmails = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q) => q.clientEmail && set.add(q.clientEmail.toLowerCase()));
    chantiers.forEach((c) => c.clientEmail && set.add(c.clientEmail.toLowerCase()));
    invoices.forEach((i) => i.clientEmail && set.add(i.clientEmail.toLowerCase()));
    appointments.forEach((a) => a.clientEmail && set.add(a.clientEmail.toLowerCase()));
    return Array.from(set);
  }, [quotes, chantiers, invoices, appointments]);

  const [previewEmail, setPreviewEmail] = useState<string>(knownClientEmails[0] || '');

  const targetEmail = isStaffPreview
    ? previewEmail || knownClientEmails[0] || ''
    : (currentUserProfile?.email || '').toLowerCase();

  const clientQuotes = useMemo(() => {
    if (!isStaffPreview) return quotes;
    return targetEmail ? quotes.filter((q) => q.clientEmail?.toLowerCase() === targetEmail) : quotes;
  }, [isStaffPreview, quotes, targetEmail]);

  const clientChantiers = useMemo(() => {
    if (!isStaffPreview) return chantiers;
    return targetEmail ? chantiers.filter((c) => c.clientEmail?.toLowerCase() === targetEmail) : chantiers;
  }, [isStaffPreview, chantiers, targetEmail]);

  const clientInvoices = useMemo(() => {
    if (!isStaffPreview) return invoices;
    return targetEmail ? invoices.filter((i) => i.clientEmail?.toLowerCase() === targetEmail) : invoices;
  }, [isStaffPreview, invoices, targetEmail]);

  const activeChantier = clientChantiers[0];
  const displayName =
    (!isStaffPreview && currentUserProfile?.displayName) ||
    clientQuotes[0]?.clientName ||
    activeChantier?.clientName ||
    clientInvoices[0]?.clientName ||
    'Client';

  const handleDownloadQuotePdf = (q: Quote) => {
    try {
      const blob = generateQuotePdfBlob(q, currentCompany);
      triggerBrowserDownload(blob, `Devis_${q.number}.pdf`);
      notify('Devis téléchargé', `Le devis ${q.number} a été généré en PDF.`, 'success');
    } catch {
      notify('Erreur PDF', 'Impossible de générer le PDF du devis.', 'error');
    }
  };

  const handleDownloadInvoicePdf = (inv: Invoice) => {
    try {
      const matchingQuote = clientQuotes.find((q) => q.id === inv.quoteId) || {
        id: inv.id,
        number: inv.number,
        version: 1,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        clientPhone: inv.clientPhone,
        clientAddress: inv.clientAddress,
        originAddress: inv.clientAddress,
        destinationAddress: inv.clientAddress,
        serviceType: 'local',
        volumeM3: 0,
        items: inv.items.map((it, idx) => ({
          id: `item-${idx}`,
          description: it.description,
          category: 'transport',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
        subtotal: inv.subtotal,
        taxRate: currentCompany.defaultTaxRate ?? 18,
        taxAmount: inv.taxAmount,
        fuelSurcharge: 0,
        discount: 0,
        total: inv.totalAmount,
        currency: inv.currency,
        status: 'accepte',
        validityDate: inv.dueDate,
        createdAt: inv.issueDate,
        specialTerms: '',
      };

      const blob = generateInvoicePdfBlob(matchingQuote as Quote, inv, currentCompany);
      triggerBrowserDownload(blob, `Facture_${inv.number}.pdf`);
      notify('Facture téléchargée', `La facture ${inv.number} a été générée en PDF.`, 'success');
    } catch {
      notify('Erreur PDF', 'Impossible de générer le PDF de la facture.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900/60 to-slate-900 border border-teal-500/30 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              ESPACE CLIENT PRIVÉ SÉCURISÉ
            </span>
            <h1 className="text-xl font-bold text-white mt-1">
              Bienvenue dans votre Espace de Suivi — {displayName}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Suivez l'avancement de votre déménagement en direct, consultez ou validez vos devis et téléchargez vos factures
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs text-right">
              <div className="text-slate-400 text-[10px]">Assistance Clientèle {currentCompany.name} :</div>
              <div className="font-bold text-amber-400">{currentCompany.phone}</div>
            </div>
          </div>
        </div>

        {isStaffPreview && knownClientEmails.length > 0 && (
          <div className="pt-3 border-t border-teal-500/20 flex flex-wrap items-center gap-2 text-xs">
            <User className="w-4 h-4 text-teal-300" />
            <span className="text-teal-200 font-semibold">Prévisualisation dossier client :</span>
            <select
              value={targetEmail}
              onChange={(e) => setPreviewEmail(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {knownClientEmails.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Live Project Tracker */}
      {clientChantiers.length > 0 ? (
        <div className="space-y-4">
          {clientChantiers.map((ch) => (
            <div key={ch.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">
                    Statut en Direct de votre Prestation (#{ch.code})
                  </h3>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  {ch.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">Départ prévu :</div>
                  <div className="font-bold text-white">{ch.scheduledDate} à {ch.startTime}</div>
                  <div className="text-slate-400 text-[11px] truncate">{ch.originAddress}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">Destination de livraison :</div>
                  <div className="font-bold text-white">{ch.destinationAddress}</div>
                  <div className="text-slate-400 text-[11px]">Volume : {ch.volumeM3} m³</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px]">Chef d'équipe assigné :</div>
                  <div className="font-bold text-emerald-400">{ch.teamLeaderName}</div>
                  <div className="text-slate-400 text-[11px]">Véhicule : {ch.vehiclePlate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
          Aucun chantier actif programmé pour ce compte client pour le moment.
        </div>
      )}

      {/* Quotes & Invoices Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Devis client */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              Vos Devis & Propositions
            </h3>
            <span className="text-xs text-slate-400">{clientQuotes.length} document(s)</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {clientQuotes.map((q) => {
              const canRespond = q.status === 'envoye' || q.status === 'en_attente' || q.status === 'brouillon';

              return (
                <div key={q.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-amber-400">{q.number}</div>
                      <div className="text-slate-300 font-semibold">{q.volumeM3} m³ • {q.serviceType}</div>
                      <div className="text-[10px] text-slate-500">Valide jusqu'au {q.validityDate}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-white text-sm font-mono">
                        {q.total.toLocaleString()} {q.currency}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          q.status === 'accepte'
                            ? 'text-emerald-400'
                            : q.status === 'refuse'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleDownloadQuotePdf(q)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>PDF Devis</span>
                    </button>

                    {canRespond && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => refuseQuote(q.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => acceptQuote(q.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accepter le Devis</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {clientQuotes.length === 0 && (
              <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Aucun devis associé pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Factures client */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-cyan-400" />
              Vos Factures & Règlements
            </h3>
            <span className="text-xs text-slate-400">{clientInvoices.length} facture(s)</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {clientInvoices.map((inv) => {
              const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
              return (
                <div key={inv.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-cyan-400">{inv.number}</div>
                      <div className="text-slate-300 font-semibold">Émise le {inv.issueDate}</div>
                      <div className="text-[10px] text-slate-500">Échéance : {inv.dueDate}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-white text-sm font-mono">
                        {inv.totalAmount.toLocaleString()} {inv.currency}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          inv.status === 'payee' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400">
                      Reste à payer :{' '}
                      <strong className={remaining > 0 ? 'text-rose-300' : 'text-emerald-400'}>
                        {remaining.toLocaleString()} {inv.currency}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoicePdf(inv)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PDF Facture</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {clientInvoices.length === 0 && (
              <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Aucune facture émise pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
