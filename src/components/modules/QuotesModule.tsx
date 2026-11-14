import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Eye,
  FileText,
  Mail,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  RotateCcw,
  Search,
  Edit,
  Download,
  Trash2,
  Save,
  X,
  FolderOpen,
  FileDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Quote, QuoteStatus, QuoteItem } from '../../types';
import { generateQuotePdfBlob, generateInvoicePdfBlob } from '../../utils/pdfGenerator';
import { useRealtimeAutoSave } from '../../hooks/useAutoSave';

export const QuotesModule: React.FC = () => {
  const { quotes, invoices, acceptQuote, updateQuote, currentCompany, setActiveModule, notify } = useApp();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(quotes[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDirectoryHandle, setSelectedDirectoryHandle] = useState<any | null>(null);
  const [selectedDirectoryName, setSelectedDirectoryName] = useState<string | null>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  // Edit Quote Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!selectedQuote && quotes[0]) {
      setSelectedQuote(quotes[0]);
      return;
    }
    if (selectedQuote) {
      const latest = quotes.find((q) => q.id === selectedQuote.id);
      if (latest && !isEditModalOpen) {
        setSelectedQuote(latest);
      }
    }
  }, [quotes, selectedQuote, isEditModalOpen]);

  const { cancelPending: cancelQuoteAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(isEditModalOpen && editingQuote),
    data: editingQuote,
    resetKey: editingQuote?.id || 'none',
    delayMs: 600,
    onSave: (draft) => {
      if (!draft || !draft.clientName.trim()) return;
      const subtotal = draft.items.reduce((acc, it) => acc + it.total, 0);
      const taxAmount = Math.round(subtotal * (draft.taxRate / 100));
      const total = subtotal + taxAmount + (draft.fuelSurcharge || 0) - (draft.discount || 0);
      const updated: Quote = {
        ...draft,
        subtotal,
        taxAmount,
        total,
      };
      updateQuote(updated, { silent: true });
      setSelectedQuote(updated);
    },
  });

  const statusBadges: Record<QuoteStatus, { label: string; color: string }> = {
    brouillon: { label: 'Brouillon', color: 'bg-slate-700/60 text-slate-300 border-slate-600' },
    envoye: { label: 'Envoyé au client', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    en_attente: { label: 'En attente signature', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    accepte: { label: 'Accepté & Validé', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    refuse: { label: 'Refusé', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    expire: { label: 'Expiré', color: 'bg-slate-800 text-slate-400 border-slate-700' },
  };

  // 3-a) Recherche de devis par nom de client
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.originAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 3-c) Imprimer en PDF ou vers l'imprimante
  const handlePrint = () => {
    window.print();
  };

  const downloadBlobDirectly = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Téléchargement direct d'un PDF professionnel pour le devis courant
  const handleDownloadQuotePdf = () => {
    if (!selectedQuote) return;
    const blob = generateQuotePdfBlob(selectedQuote, currentCompany);
    const safeClient = selectedQuote.clientName.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const filename = `Devis_${selectedQuote.number}_${safeClient}.pdf`;
    downloadBlobDirectly(blob, filename);
    notify('PDF généré', `Le devis ${selectedQuote.number} a été téléchargé au format PDF (${filename}).`, 'success');
  };

  // Sélectionner un dossier de destination sur l'ordinateur local
  const handleChooseDestinationFolder = async (): Promise<any | null> => {
    const picker = (window as unknown as { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<any> })
      .showDirectoryPicker;
    if (!picker) {
      notify(
        'Sélecteur de dossier indisponible',
        'Votre navigateur ne prend pas en charge la sélection directe de dossier ; le téléchargement standard sera utilisé.',
        'warning'
      );
      return null;
    }

    try {
      const dirHandle = await picker({ mode: 'readwrite' });
      setSelectedDirectoryHandle(dirHandle);
      setSelectedDirectoryName(dirHandle.name || 'Dossier sélectionné');
      notify(
        'Dossier sélectionné',
        `Destination locale définie sur : "${dirHandle.name}".`,
        'success'
      );
      return dirHandle;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        notify('Sélection annulée', 'Aucun dossier n’a été modifié.', 'info');
        return null;
      }
      notify(
        'Accès dossier restreint',
        'La sécurité du navigateur ou de la fenêtre intégrée bloque la sélection directe de dossier. Le fichier PDF sera enregistré via le téléchargement standard (Téléchargements).',
        'warning'
      );
      return null;
    }
  };

  // Enregistrer la facture (ou facture proforma liée au devis) au format PDF dans le dossier local choisi
  const handleSaveInvoicePdfToFolder = async (forcePickFolder = false) => {
    if (!selectedQuote) return;
    setIsSavingPdf(true);
    try {
      const linkedInvoice = invoices.find(
        (inv) => inv.quoteId === selectedQuote.id || inv.id === selectedQuote.linkedInvoiceId
      );
      const blob = generateInvoicePdfBlob(selectedQuote, linkedInvoice, currentCompany);
      const docNumber = linkedInvoice?.number || selectedQuote.number.replace(/^DEV-/i, 'FAC-');
      const safeClient = selectedQuote.clientName.replace(/[^a-zA-Z0-9_-]+/g, '_');
      const filename = `Facture_${docNumber}_${safeClient}.pdf`;

      let dirHandle = forcePickFolder ? null : selectedDirectoryHandle;
      const picker = (window as unknown as { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<any> })
        .showDirectoryPicker;

      if (!dirHandle && picker) {
        try {
          dirHandle = await picker({ mode: 'readwrite' });
          setSelectedDirectoryHandle(dirHandle);
          setSelectedDirectoryName(dirHandle.name || 'Dossier sélectionné');
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            notify('Enregistrement annulé', 'L’export PDF de la facture a été annulé.', 'info');
            return;
          }
          // Fallback to direct PDF download when iframe/browser restricts showDirectoryPicker
          downloadBlobDirectly(blob, filename);
          notify(
            'Facture PDF téléchargée',
            `Le sélecteur de dossier est restreint dans cet environnement intégré ; "${filename}" a été téléchargé dans votre dossier Téléchargements.`,
            'info'
          );
          return;
        }
      }

      if (dirHandle) {
        try {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          notify(
            'Facture PDF enregistrée',
            `"${filename}" a été enregistré dans le dossier local "${dirHandle.name}".`,
            'success'
          );
          return;
        } catch (writeErr: any) {
          // Permission expired or write failed -> fallback to browser download
          downloadBlobDirectly(blob, filename);
          notify(
            'Facture PDF téléchargée',
            `Impossible d'écrire directement dans le dossier (${writeErr?.message || 'accès restreint'}). "${filename}" a été téléchargé dans Téléchargements.`,
            'warning'
          );
          return;
        }
      }

      // Browser without showDirectoryPicker support -> standard download
      downloadBlobDirectly(blob, filename);
      notify(
        'Facture PDF téléchargée',
        `"${filename}" a été téléchargé au format PDF (sélection de dossier non supportée par ce navigateur).`,
        'info'
      );
    } finally {
      setIsSavingPdf(false);
    }
  };

  // 3-b) Modifier le devis manuellement
  const handleOpenEdit = () => {
    if (!selectedQuote) return;
    // Deep clone to allow safe editing
    setEditingQuote(JSON.parse(JSON.stringify(selectedQuote)));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;
    cancelQuoteAutoSave();

    // Recalculate totals
    const subtotal = editingQuote.items.reduce((acc, it) => acc + it.total, 0);
    const taxAmount = Math.round(subtotal * (editingQuote.taxRate / 100));
    const total = subtotal + taxAmount + (editingQuote.fuelSurcharge || 0) - (editingQuote.discount || 0);

    const updated: Quote = {
      ...editingQuote,
      subtotal,
      taxAmount,
      total,
      version: editingQuote.version + 1,
    };

    updateQuote(updated);
    setSelectedQuote(updated);
    setIsEditModalOpen(false);
  };

  const handleEditItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    if (!editingQuote) return;
    const updatedItems = [...editingQuote.items];
    const item = { ...updatedItems[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      item.total = Number(item.quantity) * Number(item.unitPrice);
    }
    updatedItems[index] = item;
    setEditingQuote({ ...editingQuote, items: updatedItems });
  };

  const handleAddEditItem = () => {
    if (!editingQuote) return;
    const newItem: QuoteItem = {
      id: 'qi-' + Date.now(),
      description: 'Prestation personnalisée ajoutée',
      category: 'manutention',
      quantity: 1,
      unitPrice: 150,
      total: 150,
    };
    setEditingQuote({ ...editingQuote, items: [...editingQuote.items, newItem] });
  };

  const handleDeleteEditItem = (index: number) => {
    if (!editingQuote) return;
    const updatedItems = editingQuote.items.filter((_, i) => i !== index);
    setEditingQuote({ ...editingQuote, items: updatedItems });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 3
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Devis Professionnels, Modification & Enregistrement
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recherche par client, modification manuelle, impression PDF et enregistrement en local
          </p>
        </div>

        <button
          onClick={() => setActiveModule('volume')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Devis (via Calculateur)</span>
        </button>
      </div>

      {/* Grid of quotes + detail/preview split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Quotes List with Search */}
        <div className="lg:col-span-5 space-y-3">
          {/* SECTION 3-A: Recherche de devis par nom de client */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
              <input
                type="text"
                placeholder="Rechercher par nom de client, n° devis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-400">
                Résultats trouvés ({filteredQuotes.length})
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusBadges).map(([k, { label }]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[720px] pr-1">
            {filteredQuotes.map((q) => {
              const isSelected = selectedQuote?.id === q.id;
              const badge = statusBadges[q.status] || { label: q.status, color: 'bg-slate-800 text-slate-300' };

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuote(q)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-amber-400">{q.number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm truncate">{q.clientName}</h3>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {q.originAddress} → {q.destinationAddress}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">{q.volumeM3} m³</span>
                    <div className="font-bold text-white text-sm">
                      {q.total.toLocaleString()} {q.currency}
                    </div>
                  </div>

                  {q.status !== 'accepte' && (
                    <div className="mt-2.5 pt-2 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptQuote(q.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs border border-emerald-500/30 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Accepter (Créer Chantier)</span>
                      </button>
                    </div>
                  )}

                  {q.linkedChantierId && (
                    <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      <Sparkles className="w-3 h-3" />
                      <span>Chantier d'exploitation créé au planning</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Quote Interactive Document Preview */}
        <div className="lg:col-span-7">
          {selectedQuote ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* Document Action Bar */}
              <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-white">Visualisation Devis Officiel</span>
                  <span className="text-[10px] text-slate-400 font-mono">v{selectedQuote.version}.0</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* SECTION 3-B: Bouton Modifier Manuellement */}
                  <button
                    onClick={handleOpenEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold border border-amber-500/40 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Modifier Devis</span>
                  </button>

                  {/* SECTION 3-C: Télécharger Devis PDF professionnel */}
                  <button
                    onClick={handleDownloadQuotePdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-xs font-bold border border-cyan-500/40 transition"
                    title="Générer et télécharger le devis professionnel au format PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Télécharger Devis PDF</span>
                  </button>

                  {/* SECTION 3-C: Choisir dossier local + Enregistrer Facture PDF */}
                  <div className="flex items-center rounded-lg overflow-hidden border border-indigo-500/40 bg-indigo-500/15">
                    <button
                      onClick={() => handleSaveInvoicePdfToFolder(false)}
                      disabled={isSavingPdf}
                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-indigo-500 text-indigo-200 hover:text-slate-950 text-xs font-bold transition disabled:opacity-50"
                      title={
                        selectedDirectoryName
                          ? `Enregistrer la facture PDF dans le dossier "${selectedDirectoryName}"`
                          : 'Sélectionner un dossier local et enregistrer la facture au format PDF'
                      }
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {selectedDirectoryName
                          ? `Enregistrer Facture PDF (${selectedDirectoryName})`
                          : 'Enregistrer Facture PDF'}
                      </span>
                    </button>
                    <button
                      onClick={handleChooseDestinationFolder}
                      className="px-2 py-1.5 border-l border-indigo-500/30 hover:bg-indigo-500 text-indigo-300 hover:text-slate-950 text-xs transition"
                      title="Choisir ou changer le dossier de destination sur l'ordinateur local"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* SECTION 3-C: Imprimer en PDF ou vers imprimante */}
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition"
                    title="Imprimer ou enregistrer en PDF via le navigateur"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Imprimer</span>
                  </button>

                  {selectedQuote.status !== 'accepte' && (
                    <button
                      onClick={() => acceptQuote(selectedQuote.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Valider & Convertir</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Printable Quote Sheet */}
              <div className="p-6 sm:p-8 bg-slate-950 printable-document text-slate-200 space-y-6">
                {/* Header Sheet */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-6">
                  <div>
                    <div className="text-xl font-black text-amber-400 tracking-tight">
                      {currentCompany.name.toUpperCase()}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{currentCompany.address}</p>
                    <p className="text-[11px] text-slate-400">Tél : {currentCompany.phone}</p>
                    <p className="text-[11px] text-slate-400">N° TVA / Registre : {currentCompany.taxNumber}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">DEVIS DE PRESTATION</div>
                    <div className="text-lg font-mono font-black text-white">{selectedQuote.number}</div>
                    <div className="text-xs text-slate-400 mt-1">Date d’émission : {selectedQuote.createdAt.split('T')[0]}</div>
                    <div className="text-xs text-slate-400">Validité jusqu’au : {selectedQuote.validityDate}</div>
                  </div>
                </div>

                {/* Client & Itinerary Box */}
                <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Destinataire / Client</div>
                    <div className="font-bold text-white text-sm">{selectedQuote.clientName}</div>
                    <div className="text-slate-300 mt-0.5">{selectedQuote.clientAddress}</div>
                    <div className="text-slate-400 mt-0.5">{selectedQuote.clientPhone}</div>
                    <div className="text-slate-400">{selectedQuote.clientEmail}</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Détails de la Mission</div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Départ :</span> {selectedQuote.originAddress}
                    </div>
                    <div className="text-slate-300 mt-0.5">
                      <span className="text-slate-400">Arrivée :</span> {selectedQuote.destinationAddress}
                    </div>
                    <div className="text-slate-300 mt-0.5">
                      <span className="text-slate-400">Type :</span> {selectedQuote.serviceType.toUpperCase()}
                    </div>
                    <div className="text-amber-400 font-bold mt-0.5">
                      Volume pris en charge : {selectedQuote.volumeM3} m³
                    </div>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2 text-left">Désignation de la prestation</th>
                        <th className="py-2 text-center">Qté</th>
                        <th className="py-2 text-right">P.U. HT</th>
                        <th className="py-2 text-right">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedQuote.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30">
                          <td className="py-2.5 text-left font-medium text-slate-200">
                            {item.description}
                          </td>
                          <td className="py-2.5 text-center text-slate-400">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-slate-300">
                            {item.unitPrice.toLocaleString()} {selectedQuote.currency}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-white">
                            {item.total.toLocaleString()} {selectedQuote.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Totals */}
                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Sous-total HT :</span>
                      <span className="font-mono text-slate-200">
                        {selectedQuote.subtotal.toLocaleString()} {selectedQuote.currency}
                      </span>
                    </div>

                    {selectedQuote.fuelSurcharge > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Frais carburant :</span>
                        <span className="font-mono text-slate-200">
                          {selectedQuote.fuelSurcharge.toLocaleString()} {selectedQuote.currency}
                        </span>
                      </div>
                    )}

                    {selectedQuote.discount > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span>Remise accordée :</span>
                        <span className="font-mono">
                          -{selectedQuote.discount.toLocaleString()} {selectedQuote.currency}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-400">
                      <span>TVA ({selectedQuote.taxRate}%) :</span>
                      <span className="font-mono text-slate-200">
                        {selectedQuote.taxAmount.toLocaleString()} {selectedQuote.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                      <span>TOTAL TTC :</span>
                      <span className="font-mono text-amber-400 text-base">
                        {selectedQuote.total.toLocaleString()} {selectedQuote.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Special terms and signatures block */}
                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-6 text-[10px] text-slate-400">
                  <div>
                    <div className="font-bold text-slate-300 mb-1">Conditions de règlement :</div>
                    <p>{selectedQuote.specialTerms}</p>
                    <p className="mt-1">Assurance contractuelle incluse selon déclaration de valeur.</p>
                  </div>

                  <div className="border border-slate-800 rounded-lg p-3 text-center">
                    <div className="font-bold text-slate-300">Bon pour accord et commande</div>
                    <div className="text-[10px] text-slate-500 mt-1">Signature du client précédée de la mention "Lu et approuvé"</div>
                    <div className="h-12 border-b border-dashed border-slate-800 mt-2 flex items-center justify-center">
                      {selectedQuote.status === 'accepte' && (
                        <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                          ✓ Signé électroniquement
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Sélectionnez un devis pour afficher le document complet
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3-B: Modal de Modification Manuelle du Devis */}
      {isEditModalOpen && editingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                Modification Manuelle du Devis {editingQuote.number}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom du Client</label>
                  <input
                    type="text"
                    required
                    value={editingQuote.clientName}
                    onChange={(e) => setEditingQuote({ ...editingQuote, clientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editingQuote.clientPhone}
                    onChange={(e) => setEditingQuote({ ...editingQuote, clientPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Adresse Départ</label>
                  <input
                    type="text"
                    value={editingQuote.originAddress}
                    onChange={(e) => setEditingQuote({ ...editingQuote, originAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Adresse Arrivée</label>
                  <input
                    type="text"
                    value={editingQuote.destinationAddress}
                    onChange={(e) => setEditingQuote({ ...editingQuote, destinationAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Items Table in Editor */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Lignes et Prestations Chiffrées</span>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] flex items-center gap-1 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {editingQuote.items.map((it, idx) => (
                    <div key={it.id || idx} className="grid grid-cols-12 gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleEditItemChange(idx, 'description', e.target.value)}
                          placeholder="Description de la prestation..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => handleEditItemChange(idx, 'quantity', Number(e.target.value))}
                          placeholder="Qté"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.1"
                          value={it.unitPrice}
                          onChange={(e) => handleEditItemChange(idx, 'unitPrice', Number(e.target.value))}
                          placeholder="Prix unitaire"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs text-right font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteEditItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments: Discount, Fuel, Tax, Validity */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Taux TVA (%)</label>
                  <input
                    type="number"
                    value={editingQuote.taxRate}
                    onChange={(e) => setEditingQuote({ ...editingQuote, taxRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Frais Carburant ({editingQuote.currency})</label>
                  <input
                    type="number"
                    value={editingQuote.fuelSurcharge}
                    onChange={(e) => setEditingQuote({ ...editingQuote, fuelSurcharge: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Remise ({editingQuote.currency})</label>
                  <input
                    type="number"
                    value={editingQuote.discount}
                    onChange={(e) => setEditingQuote({ ...editingQuote, discount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Date de Validité</label>
                  <input
                    type="date"
                    value={editingQuote.validityDate}
                    onChange={(e) => setEditingQuote({ ...editingQuote, validityDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Conditions Particulières</label>
                <textarea
                  rows={2}
                  value={editingQuote.specialTerms}
                  onChange={(e) => setEditingQuote({ ...editingQuote, specialTerms: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
