import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  Send,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, PaymentMethod, ExpenseCategory, Quote } from '../../types';
import { generateInvoicePdfBlob } from '../../utils/pdfGenerator';
import { useLocalDraft } from '../../hooks/useAutoSave';

const NEW_INVOICE_DRAFT_KEY = 'transmove_draft_acc_invoice';
const NEW_EXPENSE_DRAFT_KEY = 'transmove_draft_acc_expense';

export const AccountingModule: React.FC = () => {
  const {
    invoices,
    expenses,
    chantiers,
    quotes,
    createInvoice,
    recordInvoicePayment,
    sendInvoiceReminder,
    addExpense,
    currentCompany,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'factures' | 'depenses' | 'caisse' | 'marges'>('factures');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>('all');

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [paymentRef, setPaymentRef] = useState('');

  // New Expense Modal (persisted in real time)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDraft, setExpenseDraft, clearExpenseDraft] = useLocalDraft<{
    category: ExpenseCategory;
    description: string;
    amount: number;
    chantierCode: string;
    paidMethod: PaymentMethod;
  }>(NEW_EXPENSE_DRAFT_KEY, {
    category: 'carburant',
    description: '',
    amount: 100,
    chantierCode: chantiers[0]?.code || '',
    paidMethod: 'especes',
  });
  const expCategory = expenseDraft.category;
  const expDescription = expenseDraft.description;
  const expAmount = expenseDraft.amount;
  const expChantierCode = expenseDraft.chantierCode;
  const expPaidMethod = expenseDraft.paidMethod;
  const setExpCategory = (category: ExpenseCategory) => setExpenseDraft((p) => ({ ...p, category }));
  const setExpDescription = (description: string) => setExpenseDraft((p) => ({ ...p, description }));
  const setExpAmount = (amount: number) => setExpenseDraft((p) => ({ ...p, amount }));
  const setExpChantierCode = (chantierCode: string) => setExpenseDraft((p) => ({ ...p, chantierCode }));
  const setExpPaidMethod = (paidMethod: PaymentMethod) => setExpenseDraft((p) => ({ ...p, paidMethod }));

  // New Manual Invoice Modal (persisted in real time)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft, clearInvoiceDraft] = useLocalDraft<{
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientAddress: string;
    description: string;
    subtotal: number;
    taxRate: number;
    chantierId: string;
  }>(NEW_INVOICE_DRAFT_KEY, {
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    description: 'Prestation de déménagement / transport',
    subtotal: 1000,
    taxRate: currentCompany.defaultTaxRate ?? 18,
    chantierId: '',
  });
  const invClientName = invoiceDraft.clientName;
  const invClientEmail = invoiceDraft.clientEmail;
  const invClientPhone = invoiceDraft.clientPhone;
  const invClientAddress = invoiceDraft.clientAddress;
  const invDescription = invoiceDraft.description;
  const invSubtotal = invoiceDraft.subtotal;
  const invTaxRate = invoiceDraft.taxRate;
  const invChantierId = invoiceDraft.chantierId;
  const setInvClientName = (clientName: string) => setInvoiceDraft((p) => ({ ...p, clientName }));
  const setInvClientEmail = (clientEmail: string) => setInvoiceDraft((p) => ({ ...p, clientEmail }));
  const setInvClientPhone = (clientPhone: string) => setInvoiceDraft((p) => ({ ...p, clientPhone }));
  const setInvClientAddress = (clientAddress: string) => setInvoiceDraft((p) => ({ ...p, clientAddress }));
  const setInvDescription = (description: string) => setInvoiceDraft((p) => ({ ...p, description }));
  const setInvSubtotal = (subtotal: number) => setInvoiceDraft((p) => ({ ...p, subtotal }));
  const setInvTaxRate = (taxRate: number) => setInvoiceDraft((p) => ({ ...p, taxRate }));
  const setInvChantierId = (chantierId: string) => setInvoiceDraft((p) => ({ ...p, chantierId }));

  // Calculations
  const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalUnpaid = totalBilled - totalCollected;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netMargin = totalCollected - totalExpenses;
  const marginPercent = totalCollected > 0 ? Math.round((netMargin / totalCollected) * 100) : 0;

  // Journal de Caisse entries (Payments IN + Expenses OUT)
  const cashEntries = useMemo(() => {
    const inflows = invoices.flatMap((inv) =>
      (inv.payments || []).map((p) => ({
        id: p.id,
        date: p.date,
        direction: 'entree' as const,
        label: `Encaissement ${inv.number} — ${inv.clientName}`,
        reference: p.reference,
        method: p.method,
        amount: p.amount,
        currency: inv.currency,
        by: p.recordedBy,
      }))
    );

    const outflows = expenses.map((e) => ({
      id: e.id,
      date: e.date,
      direction: 'sortie' as const,
      label: `Dépense ${e.category.replace(/_/g, ' ')} — ${e.description}`,
      reference: e.chantierCode || e.vehiclePlate || 'Frais général',
      method: e.paidMethod,
      amount: e.amount,
      currency: e.currency,
      by: e.employeeName || 'Exploitation',
    }));

    return [...inflows, ...outflows].sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, expenses]);

  // Dynamic Margins by Chantier
  const chantierMargins = useMemo(() => {
    return chantiers.map((ch) => {
      const chInvoices = invoices.filter(
        (inv) => inv.chantierId === ch.id || (ch.quoteId && inv.quoteId === ch.quoteId)
      );
      const linkedQuote = quotes.find((q) => q.id === ch.quoteId);
      const revenue =
        chInvoices.length > 0
          ? chInvoices.reduce((acc, i) => acc + i.totalAmount, 0)
          : linkedQuote?.total || Math.round(ch.volumeM3 * 135);

      const chExpenses = expenses
        .filter((e) => e.chantierId === ch.id || e.chantierCode === ch.code)
        .reduce((acc, e) => acc + e.amount, 0);

      const margin = revenue - chExpenses;
      const pct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;

      return {
        id: ch.id,
        code: ch.code,
        client: ch.clientName,
        status: ch.status,
        revenue,
        expenses: chExpenses,
        margin,
        pct,
        isBilled: chInvoices.length > 0,
      };
    });
  }, [chantiers, invoices, expenses, quotes]);

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(Math.max(0, Math.round((inv.totalAmount - inv.paidAmount) * 100) / 100));
    setPaymentRef(`REG-${Date.now().toString().slice(-6)}`);
    setIsPaymentModalOpen(true);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentAmount <= 0) return;
    recordInvoicePayment(selectedInvoice.id, paymentAmount, paymentMethod, paymentRef);
    setIsPaymentModalOpen(false);
  };

  const submitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedChantier = chantiers.find((c) => c.code === expChantierCode);
    addExpense({
      date: new Date().toISOString().split('T')[0],
      category: expCategory,
      description: expDescription,
      amount: expAmount,
      currency: currentCompany.currency,
      chantierId: matchedChantier?.id,
      chantierCode: expChantierCode || undefined,
      paidMethod: expPaidMethod,
    });
    setIsExpenseModalOpen(false);
    clearExpenseDraft();
  };

  const submitNewInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const taxAmount = Math.round(invSubtotal * (invTaxRate / 100) * 100) / 100;
    const totalAmount = Math.round((invSubtotal + taxAmount) * 100) / 100;
    createInvoice({
      type: 'facture',
      chantierId: invChantierId || undefined,
      clientName: invClientName.trim(),
      clientEmail: invClientEmail.trim().toLowerCase(),
      clientPhone: invClientPhone.trim(),
      clientAddress: invClientAddress.trim(),
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
      items: [
        {
          description: invDescription,
          quantity: 1,
          unitPrice: invSubtotal,
          total: invSubtotal,
        },
      ],
      subtotal: invSubtotal,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      status: 'emise',
      currency: currentCompany.currency,
      payments: [],
    });
    setIsInvoiceModalOpen(false);
    clearInvoiceDraft();
  };

  const handleDownloadInvoicePdf = (inv: Invoice) => {
    const linkedQuote: Quote = quotes.find((q) => q.id === inv.quoteId) || {
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
        id: `it-${idx}`,
        description: it.description,
        category: 'transport',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
      subtotal: inv.subtotal,
      taxRate: inv.subtotal > 0 ? Math.round((inv.taxAmount / inv.subtotal) * 100) : 18,
      taxAmount: inv.taxAmount,
      fuelSurcharge: 0,
      discount: 0,
      total: inv.totalAmount,
      currency: inv.currency,
      status: 'accepte',
      validityDate: inv.dueDate,
      createdAt: inv.issueDate,
      specialTerms: 'Paiement à réception par virement bancaire, chèque ou Mobile Money.',
    };

    const blob = generateInvoicePdfBlob(linkedQuote, inv, currentCompany);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facture_${inv.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('PDF généré', `Facture ${inv.number}.pdf téléchargée.`, 'success');
  };

  const exportCSV = () => {
    const headers = 'Numero,Client,Date,Total,Paye,Statut\n';
    const rows = invoices
      .map((i) => `"${i.number}","${i.clientName}","${i.issueDate}",${i.totalAmount},${i.paidAmount},"${i.status}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factures_${currentCompany.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices.filter((i) => {
    return filterInvoiceStatus === 'all' || i.status === filterInvoiceStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 6
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Comptabilité, Facturation & Gestion de Caisse
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Factures clients, encaissements déclaratifs (Wave / Orange Money / Virement / Espèces), journal de caisse et marges chantiers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Facture</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 text-xs font-bold border border-rose-500/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Dépense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Facturé Total</div>
          <div className="text-xl font-black text-white mt-1">
            {totalBilled.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{invoices.length} factures émises</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Encaissé Réel</div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {totalCollected.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Entrées effectives</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Créances Impayées</div>
          <div className="text-xl font-black text-rose-400 mt-1">
            {totalUnpaid.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">En attente ou en retard</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Total Dépenses</div>
          <div className="text-xl font-black text-slate-300 mt-1">
            {totalExpenses.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{expenses.length} écritures</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 md:col-span-1">
          <div className="text-[11px] text-slate-400 font-medium">Marge Nette Réelle</div>
          <div className="text-xl font-black text-amber-400 mt-1">
            {netMargin.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Taux moyen : {marginPercent}%</div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'factures', label: 'Factures & Règlements', icon: Receipt },
          { id: 'depenses', label: 'Dépenses Opérationnelles', icon: ArrowDownRight },
          { id: 'caisse', label: 'Journal de Caisse', icon: Coins },
          { id: 'marges', label: 'Marge par Chantier', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Factures */}
      {activeTab === 'factures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">Factures Émises & Suivi des Encaissements</h3>
            <select
              value={filterInvoiceStatus}
              onChange={(e) => setFilterInvoiceStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="payee">Payée</option>
              <option value="payee_partielle">Payée partiellement</option>
              <option value="emise">Émise (En attente)</option>
              <option value="en_retard">En retard</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Numéro / Date</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Échéance</th>
                  <th className="py-2.5 px-3 text-right">Montant Total</th>
                  <th className="py-2.5 px-3 text-right">Montant Encaissé</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'payee';
                  const isLate = inv.status === 'en_retard';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-amber-400">{inv.number}</div>
                        <div className="text-[10px] text-slate-400">{inv.issueDate}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{inv.clientName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{inv.clientEmail}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[11px] ${isLate ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                          {inv.dueDate}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {inv.totalAmount.toLocaleString()} {inv.currency}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {inv.paidAmount.toLocaleString()} {inv.currency}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isLate
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {isPaid ? 'Payée' : isLate ? 'En retard' : inv.status === 'payee_partielle' ? 'Partielle' : 'En attente'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadInvoicePdf(inv)}
                            title="Télécharger la facture en PDF"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {!isPaid && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(inv)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[11px] font-bold border border-emerald-500/30 transition"
                              >
                                Encaisser
                              </button>

                              <button
                                type="button"
                                onClick={() => sendInvoiceReminder(inv.id)}
                                title="Envoyer une relance par email"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Dépenses */}
      {activeTab === 'depenses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">Dépenses Imputées aux Chantiers & Flotte</h3>
            <span className="text-xs text-slate-400">
              Total : {totalExpenses.toLocaleString()} {currentCompany.currency}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Chantier / Véhicule</th>
                  <th className="py-2.5 px-3">Moyen Paiement</th>
                  <th className="py-2.5 px-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400">{exp.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400 uppercase text-[10px]">
                      {exp.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-white">{exp.description}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {exp.chantierCode || exp.vehiclePlate || 'Frais général'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">
                      {exp.paidMethod}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-300">
                      -{exp.amount.toLocaleString()} {exp.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Journal de Caisse */}
      {activeTab === 'caisse' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">Journal de Caisse & Trésorerie</h3>
              <p className="text-[11px] text-slate-400">
                Consolidation chronologique de tous les encaissements clients et décaissements opérationnels
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                Entrées : +{totalCollected.toLocaleString()} {currentCompany.currency}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono font-bold">
                Sorties : -{totalExpenses.toLocaleString()} {currentCompany.currency}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                Solde Net : {netMargin.toLocaleString()} {currentCompany.currency}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Sens</th>
                  <th className="py-2.5 px-3">Libellé de l’écriture</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Référence</th>
                  <th className="py-2.5 px-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cashEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{entry.date}</td>
                    <td className="py-2.5 px-3">
                      {entry.direction === 'entree' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          <ArrowUpRight className="w-3 h-3" /> Entrée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                          <ArrowDownRight className="w-3 h-3" /> Sortie
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-white font-medium">{entry.label}</td>
                    <td className="py-2.5 px-3 text-slate-300 uppercase text-[10px]">
                      {entry.method.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{entry.reference}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        entry.direction === 'entree' ? 'text-emerald-400' : 'text-rose-300'
                      }`}
                    >
                      {entry.direction === 'entree' ? '+' : '-'}
                      {entry.amount.toLocaleString()} {entry.currency}
                    </td>
                  </tr>
                ))}
                {cashEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Aucun mouvement de caisse enregistré pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Marge par Chantier (Dynamic) */}
      {activeTab === 'marges' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-sm">
            Rentabilité et Marge Réelle Calculée par Chantier ({chantierMargins.length})
          </h3>
          <div className="space-y-3">
            {chantierMargins.map((row) => (
              <div
                key={row.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">{row.code}</span>
                    <span className="font-bold text-white text-xs">{row.client}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {row.isBilled ? 'Facturé' : 'Estimé devis'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Chiffre d’affaires : {row.revenue.toLocaleString()} {currentCompany.currency} • Dépenses imputées :{' '}
                    {row.expenses.toLocaleString()} {currentCompany.currency}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-base font-black font-mono ${
                      row.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.margin >= 0 ? '+' : ''}
                    {row.margin.toLocaleString()} {currentCompany.currency}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500">Marge brute : {row.pct}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Enregistrer un Encaissement ({selectedInvoice.number})
            </h3>

            <form onSubmit={submitPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Montant à encaisser ({selectedInvoice.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-base font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mode de Paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="mobile_money">Mobile Money (Wave / Orange Money / MTN)</option>
                  <option value="virement">Virement Bancaire</option>
                  <option value="especes">Espèces (Versement Caisse)</option>
                  <option value="cheque">Chèque</option>
                  <option value="carte">Terminal Carte Bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Référence de Transaction</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Valider l’Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Manual Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                Créer une Facture Client
              </h3>
              <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitNewInvoice} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom Client *</label>
                  <input
                    type="text"
                    required
                    value={invClientName}
                    onChange={(e) => setInvClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Client *</label>
                  <input
                    type="email"
                    required
                    value={invClientEmail}
                    onChange={(e) => setInvClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={invClientPhone}
                    onChange={(e) => setInvClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chantier lié (optionnel)</label>
                  <select
                    value={invChantierId}
                    onChange={(e) => setInvChantierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">-- Aucun --</option>
                    {chantiers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.clientName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adresse client</label>
                <input
                  type="text"
                  value={invClientAddress}
                  onChange={(e) => setInvClientAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Désignation prestation *</label>
                <input
                  type="text"
                  required
                  value={invDescription}
                  onChange={(e) => setInvDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Montant HT ({currentCompany.currency})</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={invSubtotal}
                    onChange={(e) => setInvSubtotal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">TVA (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={invTaxRate}
                    onChange={(e) => setInvTaxRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Émettre Facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-rose-400" />
              Consigner une Dépense Opérationnelle
            </h3>

            <form onSubmit={submitExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catégorie</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="carburant">Carburant</option>
                  <option value="peage">Péage</option>
                  <option value="emballage">Achat Emballage</option>
                  <option value="main_d_oeuvre">Main-d’œuvre supplémentaire</option>
                  <option value="reparation_vehicule">Réparation véhicule</option>
                  <option value="douane">Douane & Timbres</option>
                  <option value="transit">Frais de transit</option>
                  <option value="stockage">Stockage portuaire</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Plein gasoil Total Almadies"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Montant ({currentCompany.currency})</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mode</label>
                  <select
                    value={expPaidMethod}
                    onChange={(e) => setExpPaidMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="especes">Espèces</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="virement">Virement</option>
                    <option value="carte">Carte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chantier</label>
                  <input
                    type="text"
                    value={expChantierCode}
                    onChange={(e) => setExpChantierCode(e.target.value)}
                    placeholder="CH-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold"
                >
                  Enregistrer Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
