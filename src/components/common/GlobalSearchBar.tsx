import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Receipt,
  Ship,
  Truck,
  Calendar,
  X,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface SearchResultItem {
  id: string;
  category: 'quote' | 'invoice' | 'transit' | 'chantier' | 'client';
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  targetModule: string;
  metadata?: string;
}

export const GlobalSearchBar: React.FC = () => {
  const {
    quotes,
    invoices,
    transitShipments,
    chantiers,
    appointments,
    setActiveModule,
    setFocusedChantierId,
    notify,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Aggregate searchable items
  const allResults: SearchResultItem[] = [];

  const q = searchTerm.trim().toLowerCase();

  // 1. Devis (Quotes)
  quotes.forEach((quote) => {
    const match =
      !q ||
      quote.number.toLowerCase().includes(q) ||
      quote.clientName.toLowerCase().includes(q) ||
      quote.originAddress?.toLowerCase().includes(q) ||
      quote.destinationAddress?.toLowerCase().includes(q) ||
      quote.status.toLowerCase().includes(q);

    if (match) {
      allResults.push({
        id: `quote-${quote.id}`,
        category: 'quote',
        categoryLabel: 'Devis',
        title: `${quote.number} - ${quote.clientName}`,
        subtitle: `${quote.originAddress || 'Origine'} ➔ ${quote.destinationAddress || 'Destination'} (${quote.volumeM3} m³)`,
        badge: `${quote.total.toLocaleString()} ${quote.currency || '€'} • ${quote.status}`,
        badgeColor:
          quote.status === 'accepte'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : quote.status === 'envoye'
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        targetModule: 'quotes',
        metadata: quote.clientPhone,
      });
    }
  });

  // 2. Factures (Invoices)
  invoices.forEach((inv) => {
    const match =
      !q ||
      inv.number.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q);

    if (match) {
      allResults.push({
        id: `invoice-${inv.id}`,
        category: 'invoice',
        categoryLabel: 'Facture',
        title: `${inv.number} - ${inv.clientName}`,
        subtitle: `Émise le ${inv.issueDate} • Échéance : ${inv.dueDate}`,
        badge: `${inv.totalAmount.toLocaleString()} ${inv.currency || '€'} • ${inv.status.replace('_', ' ')}`,
        badgeColor:
          inv.status === 'payee'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : inv.status === 'en_retard'
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        targetModule: 'accounting',
        metadata: inv.type,
      });
    }
  });

  // 3. Transit & Douane (Shipments)
  transitShipments.forEach((shipment) => {
    const match =
      !q ||
      shipment.reference.toLowerCase().includes(q) ||
      shipment.clientName.toLowerCase().includes(q) ||
      (shipment.containerNumber && shipment.containerNumber.toLowerCase().includes(q)) ||
      (shipment.bookingNumber && shipment.bookingNumber.toLowerCase().includes(q)) ||
      (shipment.originPort && shipment.originPort.toLowerCase().includes(q)) ||
      (shipment.destinationPort && shipment.destinationPort.toLowerCase().includes(q));

    if (match) {
      allResults.push({
        id: `transit-${shipment.id}`,
        category: 'transit',
        categoryLabel: 'Transit / Fret',
        title: `${shipment.reference} - ${shipment.clientName}`,
        subtitle: `${shipment.originPort || 'Port Départ'} ➔ ${shipment.destinationPort || 'Port Arrivée'} | Conteneur: ${shipment.containerNumber || 'N/A'}`,
        badge: `Booking: ${shipment.bookingNumber || 'En cours'} • ${shipment.status.replace('_', ' ')}`,
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        targetModule: 'customs',
        metadata: shipment.operationType,
      });
    }
  });

  // 4. Chantiers / Opérations (Shipments / Dispatches)
  chantiers.forEach((ch) => {
    const match =
      !q ||
      ch.code.toLowerCase().includes(q) ||
      ch.clientName.toLowerCase().includes(q) ||
      ch.originAddress.toLowerCase().includes(q) ||
      ch.destinationAddress.toLowerCase().includes(q) ||
      ch.teamLeaderName?.toLowerCase().includes(q) ||
      ch.vehiclePlate?.toLowerCase().includes(q);

    if (match) {
      allResults.push({
        id: `chantier-${ch.id}`,
        category: 'chantier',
        categoryLabel: 'Chantier',
        title: `${ch.code} - ${ch.clientName}`,
        subtitle: `Date: ${ch.scheduledDate} • Chef d'équipe: ${ch.teamLeaderName} • ${ch.vehicleName || ch.vehiclePlate}`,
        badge: ch.status.replace('_', ' '),
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        targetModule: 'operations',
        metadata: ch.originAddress,
      });
    }
  });

  // 5. Clients / Rendez-vous (Appointments)
  appointments.forEach((apt) => {
    const match =
      !q ||
      apt.code.toLowerCase().includes(q) ||
      apt.clientName.toLowerCase().includes(q) ||
      apt.clientEmail.toLowerCase().includes(q) ||
      apt.clientPhone.toLowerCase().includes(q);

    if (match) {
      allResults.push({
        id: `client-${apt.id}`,
        category: 'client',
        categoryLabel: 'Client & Visite',
        title: `${apt.clientName} (${apt.code})`,
        subtitle: `Tél: ${apt.clientPhone} • Email: ${apt.clientEmail} • Date: ${apt.targetDate}`,
        badge: `${apt.serviceType} • ${apt.status.replace('_', ' ')}`,
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        targetModule: 'appointments',
        metadata: apt.originAddress,
      });
    }
  });

  // Filter by category if selected
  const filteredResults =
    selectedCategory === 'all'
      ? allResults
      : allResults.filter((r) => r.category === selectedCategory);

  const displayedResults = filteredResults.slice(0, 15);

  const handleSelectResult = (item: SearchResultItem) => {
    if (item.category === 'chantier') {
      setFocusedChantierId(item.id.replace('chantier-', ''));
    }
    setActiveModule(item.targetModule);
    setIsOpen(false);
    setSearchTerm('');
    notify(
      'Accès rapide',
      `Ouverture de : ${item.title} (${item.categoryLabel})`,
      'info'
    );
  };

  const getCategoryIcon = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'quote':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'invoice':
        return <Receipt className="w-4 h-4 text-purple-400" />;
      case 'transit':
        return <Ship className="w-4 h-4 text-cyan-400" />;
      case 'chantier':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'client':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 lg:mx-6">
      {/* Search Bar Input */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border ${
          isOpen ? 'border-amber-500/80 ring-2 ring-amber-500/20' : 'border-slate-700/80'
        } rounded-xl px-3 py-1.5 transition cursor-text group`}
      >
        <Search className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Recherche globale : devis, facture, B/L, client..."
          className="bg-transparent text-xs text-slate-200 placeholder-slate-400 focus:outline-none w-full"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            className="text-slate-400 hover:text-white p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded border border-slate-600/50">
            <kbd className="font-sans">⌘</kbd>
            <kbd className="font-sans">K</kbd>
          </div>
        )}
      </div>

      {/* Dropdown Overlay Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 overflow-x-auto text-[11px] bg-slate-950/60">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'quote', label: 'Devis' },
              { id: 'invoice', label: 'Factures' },
              { id: 'transit', label: 'Transit / Fret' },
              { id: 'chantier', label: 'Chantiers' },
              { id: 'client', label: 'Clients' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {displayedResults.length > 0 ? (
              displayedResults.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className={`flex items-start justify-between p-3 cursor-pointer transition ${
                    idx === selectedIndex
                      ? 'bg-amber-500/10 border-l-2 border-amber-500'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/80 mt-0.5 shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                          {item.categoryLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-medium text-slate-300">Aucun résultat trouvé</p>
                <p className="text-xs text-slate-500 mt-1">
                  Essayez un numéro de devis (ex: DEV-), une référence B/L, ou un nom client.
                </p>
              </div>
            )}
          </div>

          {/* Quick Footer hint */}
          <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{displayedResults.length} résultat(s) disponible(s)</span>
            </span>
            <span className="text-slate-500">Cliquez pour ouvrir le dossier instantanément</span>
          </div>
        </div>
      )}
    </div>
  );
};
