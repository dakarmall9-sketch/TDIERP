import React, { useState } from 'react';
import {
  Anchor,
  Truck,
  Plus,
  Edit3,
  Save,
  Search,
  ArrowRight,
  Clock,
  Star,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Check,
  X,
  Ship,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ShippingLine, ShippingRoute, ShippingTransportMode } from '../../types';
import { useRealtimeAutoSave, useLocalDraft } from '../../hooks/useAutoSave';

export const ShippingLinesModule: React.FC = () => {
  const {
    shippingLines,
    customPorts,
    shippingEquipment,
    setShippingEquipmentList,
    addShippingPort,
    addShippingLine,
    updateShippingRoute,
  } = useApp();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'maritime' | 'terrestre'>('all');

  // Comparator state
  const [originFilter, setOriginFilter] = useState('Dakar');
  const [destFilter, setDestFilter] = useState('Le Havre');
  const [selectedEquipment, setSelectedEquipment] = useState<string>(shippingEquipment[0]?.id || 'eq-1');

  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [newEquipName, setNewEquipName, clearNewEquipName] = useLocalDraft(
    'transmove_draft_ship_equip_name',
    ''
  );
  const [newEquipCategory, setNewEquipCategory] = useLocalDraft<'maritime' | 'terrestre' | 'aerien'>(
    'transmove_draft_ship_equip_cat',
    'maritime'
  );
  const [newEquipCapacity, setNewEquipCapacity, clearNewEquipCapacity] = useLocalDraft(
    'transmove_draft_ship_equip_cap',
    ''
  );

  // Port Addition State (Item 7-a)
  const [showAddPortModal, setShowAddPortModal] = useState(false);
  const [newPortInput, setNewPortInput, clearNewPortInput] = useLocalDraft(
    'transmove_draft_ship_port',
    ''
  );

  // Company Addition State (Item 7-c)
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyData, setNewCompanyData, clearNewCompanyDraft] = useLocalDraft(
    'transmove_draft_ship_company',
    {
      name: '',
      code: '',
      transportType: 'maritime' as ShippingTransportMode,
      commercialContact: '',
      phone: '',
      email: '',
      servedPorts: '',
      freeTimeDays: 14,
      paymentTerms: '30 jours fin de mois',
      performanceScore: 90,
      notes: '',
      // Initial route
      initOrigin: 'Dakar',
      initDestination: 'Le Havre',
      initTransitDays: 14,
      initRate20: 2100,
      initRate40: 3600,
      initRateTruck: 1800,
    }
  );

  // Table Editing State (Item 7-d & 7-e)
  // Store inline draft edits per "lineId-routeIdx"
  const [editingRoutes, setEditingRoutes] = useState<
    Record<string, { transitDays: number; rate20: number; rate40: number; rateTruck: number }>
  >({});
  const [savedRouteKeys, setSavedRouteKeys] = useState<Record<string, boolean>>({});

  const { cancelPending: cancelRouteAutoSave } = useRealtimeAutoSave({
    enabled: Object.keys(editingRoutes).length > 0,
    data: editingRoutes,
    resetKey: 'shipping-routes-editor',
    delayMs: 650,
    onSave: (draftMap) => {
      Object.entries(draftMap).forEach(([key, draft]) => {
        const splitIdx = key.lastIndexOf('-');
        if (splitIdx <= 0) return;
        const lineId = key.slice(0, splitIdx);
        const routeIdx = Number(key.slice(splitIdx + 1));
        if (Number.isNaN(routeIdx)) return;
        updateShippingRoute(
          lineId,
          routeIdx,
          draft.rate20,
          draft.rate40,
          draft.transitDays,
          draft.rateTruck,
          { silent: true }
        );
      });
    },
  });

  // Helper all ports list
  const allPortsList = Array.from(
    new Set([
      'Dakar',
      'Le Havre',
      'Marseille',
      'Anvers',
      'Shenzhen',
      'Abidjan',
      'Lomé',
      'Casablanca',
      'Douala',
      'Bamako',
      'Ouagadougou',
      'Niamey',
      ...customPorts,
    ])
  );

  // Comparator calculation
  const comparisonResults = shippingLines
    .filter((line) => {
      if (filterMode === 'all') return true;
      return (line.transportType || 'maritime') === filterMode;
    })
    .map((line) => {
      const matchRoute = line.routes.find(
        (r) =>
          r.origin.toLowerCase().includes(originFilter.toLowerCase()) &&
          r.destination.toLowerCase().includes(destFilter.toLowerCase())
      );
      if (!matchRoute) return null;

      // Rate based on selected equipment
      const activeEquip = shippingEquipment.find((eq) => eq.id === selectedEquipment);
      let rate = matchRoute.rate20ft;
      if (activeEquip?.category === 'terrestre') {
        rate = matchRoute.rateTruck || Math.round(matchRoute.rate20ft * 0.95);
      } else if (activeEquip?.type.includes('40')) {
        rate = matchRoute.rate40ft;
      }

      return {
        line,
        route: matchRoute,
        rate,
        transitDays: matchRoute.avgTransitDays,
        freeTimeDays: line.freeTimeDays,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.rate - b!.rate);

  // Filtered lines for directory
  const filteredLines = shippingLines.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.servedPorts.some((p) => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMode =
      filterMode === 'all' || (l.transportType || 'maritime') === filterMode;
    return matchesSearch && matchesMode;
  });

  // Handle Add Port (7-a)
  const handleCreatePort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortInput.trim()) return;
    addShippingPort(newPortInput.trim());
    clearNewPortInput();
    setShowAddPortModal(false);
  };

  // Handle Add Equipment Type (7-b)
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipName.trim()) return;
    const newId = 'eq-' + Date.now();
    await setShippingEquipmentList([
      ...shippingEquipment,
      {
        id: newId,
        type: newEquipName.trim(),
        category: newEquipCategory,
        dimensions: 'Standard',
        capacityM3: newEquipCapacity.trim() || 'Sur mesure',
        payloadKg: 'Selon norme',
      },
    ]);
    setSelectedEquipment(newId);
    clearNewEquipName();
    clearNewEquipCapacity();
    setShowAddEquipmentModal(false);
  };

  // Handle Add Shipping / Transport Company (7-c)
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyData.name.trim() || !newCompanyData.code.trim()) return;

    const servedPortsArray = newCompanyData.servedPorts
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const initialRoute: ShippingRoute = {
      origin: newCompanyData.initOrigin,
      destination: newCompanyData.initDestination,
      avgTransitDays: Number(newCompanyData.initTransitDays) || 12,
      rate20ft: Number(newCompanyData.initRate20) || 1500,
      rate40ft: Number(newCompanyData.initRate40) || 2800,
      rateTruck: Number(newCompanyData.initRateTruck) || 1400,
      transportMode: newCompanyData.transportType,
    };

    addShippingLine({
      name: newCompanyData.name.trim(),
      code: newCompanyData.code.trim().toUpperCase(),
      transportType: newCompanyData.transportType,
      commercialContact: newCompanyData.commercialContact.trim() || 'Service Commercial',
      phone: newCompanyData.phone.trim() || '+221 33 800 00 00',
      email: newCompanyData.email.trim() || 'contact@armateur.com',
      servedPorts: servedPortsArray.length > 0 ? servedPortsArray : [newCompanyData.initOrigin, newCompanyData.initDestination],
      routes: [initialRoute],
      freeTimeDays: Number(newCompanyData.freeTimeDays) || 14,
      paymentTerms: newCompanyData.paymentTerms,
      performanceScore: Number(newCompanyData.performanceScore) || 90,
      notes: newCompanyData.notes.trim() || 'Compagnie partenaire enregistrée.',
    });

    setShowAddCompanyModal(false);
    clearNewCompanyDraft();
  };

  // Handle Editing Route Row (7-d & 7-e)
  const getDraftRouteValue = (lineId: string, routeIdx: number, route: ShippingRoute) => {
    const key = `${lineId}-${routeIdx}`;
    return editingRoutes[key] || {
      transitDays: route.avgTransitDays,
      rate20: route.rate20ft,
      rate40: route.rate40ft,
      rateTruck: route.rateTruck || Math.round(route.rate20ft * 0.9),
    };
  };

  const updateDraftRoute = (lineId: string, routeIdx: number, field: 'transitDays' | 'rate20' | 'rate40' | 'rateTruck', val: number) => {
    const key = `${lineId}-${routeIdx}`;
    setEditingRoutes((prev) => {
      const line = shippingLines.find((l) => l.id === lineId);
      const originalRoute = line?.routes[routeIdx];
      const current = prev[key] || {
        transitDays: originalRoute?.avgTransitDays || 10,
        rate20: originalRoute?.rate20ft || 1500,
        rate40: originalRoute?.rate40ft || 2800,
        rateTruck: originalRoute?.rateTruck || 1400,
      };
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: val,
        },
      };
    });
  };

  const saveRouteDraft = (lineId: string, routeIdx: number) => {
    const key = `${lineId}-${routeIdx}`;
    const draft = editingRoutes[key];
    if (draft) {
      cancelRouteAutoSave();
      updateShippingRoute(lineId, routeIdx, draft.rate20, draft.rate40, draft.transitDays, draft.rateTruck);
      setSavedRouteKeys((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSavedRouteKeys((prev) => ({ ...prev, [key]: false }));
      }, 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 7
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Ship className="w-5 h-5 text-amber-400" />
              Compagnies Maritimes, Transport Routier & Gestion des Taux de Fret
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestion multi-transporteurs (maritime FCL/LCL & terrestre routier), comparateur de fret dynamique et mise à jour directe des grilles tarifaires.
          </p>
        </div>

        {/* Quick Action Buttons (Item 7-a, 7-b, 7-c) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddPortModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Ajouter un Port / Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddEquipmentModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Type Conteneur / Camion</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCompanyModal(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouvelle Compagnie</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Mode de transport :</span>
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              filterMode === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous les modes
          </button>
          <button
            onClick={() => setFilterMode('maritime')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              filterMode === 'maritime' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ship className="w-3 h-3" />
            Maritime (FCL/LCL)
          </button>
          <button
            onClick={() => setFilterMode('terrestre')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              filterMode === 'terrestre' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3 h-3" />
            Terrestre (Camions)
          </button>
        </div>
      </div>

      {/* Interactive Rate & Transit Time Comparator */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-400 font-bold text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Comparateur Intelligent de Taux de Fret & Transit Time</span>
          </div>
          <div className="text-[11px] font-normal text-slate-400">
            {customPorts.length > 0 && (
              <span className="text-sky-400 font-semibold">{customPorts.length} port(s) personnalisé(s) actif(s)</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Port / Hub d'origine (Départ)
            </label>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
            >
              {allPortsList.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Port / Hub de destination (Arrivée)
            </label>
            <select
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
            >
              {allPortsList.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Équipement / Conteneur / Camion
            </label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
            >
              {shippingEquipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.category.toUpperCase()}] {eq.type} ({eq.capacityM3})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-[11px] text-slate-300 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 w-full flex items-center justify-between">
              <span className="text-slate-400">Offres disponibles :</span>
              <span className="font-bold text-amber-400 text-xs">{comparisonResults.length} trouvée(s)</span>
            </div>
          </div>
        </div>

        {/* Results of Comparison */}
        {comparisonResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {comparisonResults.map((res, idx) => {
              const isBestPrice = idx === 0;
              const isTruck = res!.line.transportType === 'terrestre';

              return (
                <div
                  key={res!.line.id}
                  className={`p-5 rounded-xl border relative transition ${
                    isBestPrice
                      ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  {isBestPrice && (
                    <span className="absolute -top-2.5 right-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      Meilleure Offre
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    {isTruck ? (
                      <Truck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Ship className="w-4 h-4 text-sky-400" />
                    )}
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {isTruck ? 'Transport Routier' : 'Armateur Maritime'}
                    </span>
                  </div>

                  <div className="font-bold text-white text-base mt-0.5">{res!.line.name}</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-2">
                    {res!.rate.toLocaleString()} €
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Fret proposé sur liaison {res!.route.origin} → {res!.route.destination}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transit Time :</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {res!.transitDays} jours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Franchise Surestaries :</span>
                      <span className="text-emerald-400 font-semibold">{res!.freeTimeDays} jours offerts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Score Fiabilité :</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {res!.line.performanceScore}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <p>Aucun tarif direct enregistré sur la liaison {originFilter} → {destFilter}.</p>
            <p className="text-[11px] text-slate-500">
              Vous pouvez ajouter cette liaison ou mettre à jour les tarifs dans le tableau de gestion ci-dessous.
            </p>
          </div>
        )}
      </div>

      {/* TABLEAU EDITABLE DES TARIFS DE FRET & TRANSIT TIME (Items 7-d & 7-e) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              Tableau Éditrice des Tarifs de Fret & Transit Time (Mise à jour directe)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Remplissez et modifiez librement les tarifs de fret (20ft, 40ft, camion) et les transit times pour chaque liaison.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Sauvegarde instantanée en mémoire SaaS</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-3">Compagnie / Transporteur</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Liaison (Départ → Arrivée)</th>
                <th className="py-3 px-3 text-center">Transit Time (Jours)</th>
                <th className="py-3 px-3 text-right">Fret 20' Standard (€)</th>
                <th className="py-3 px-3 text-right">Fret 40' HC (€)</th>
                <th className="py-3 px-3 text-right">Fret Camion Terrestre (€)</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {shippingLines.flatMap((line) =>
                line.routes.map((route, routeIdx) => {
                  const key = `${line.id}-${routeIdx}`;
                  const draft = getDraftRouteValue(line.id, routeIdx, route);
                  const isSaved = savedRouteKeys[key];
                  const isTruck = line.transportType === 'terrestre';

                  return (
                    <tr key={key} className="hover:bg-slate-800/30 transition">
                      {/* Company Name */}
                      <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 rounded border border-slate-700 text-slate-300">
                            {line.code}
                          </span>
                          <span>{line.name}</span>
                        </div>
                      </td>

                      {/* Transport Mode */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isTruck ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max">
                            <Truck className="w-2.5 h-2.5" /> Terrestre
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1 w-max">
                            <Ship className="w-2.5 h-2.5" /> Maritime
                          </span>
                        )}
                      </td>

                      {/* Route */}
                      <td className="py-3 px-3 font-medium text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{route.origin}</span>
                          <ArrowRight className="w-3 h-3 text-amber-400" />
                          <span>{route.destination}</span>
                        </div>
                      </td>

                      {/* Transit Time Input */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={draft.transitDays}
                          onChange={(e) =>
                            updateDraftRoute(line.id, routeIdx, 'transitDays', Number(e.target.value) || 1)
                          }
                          className="w-16 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-center font-bold text-white text-xs focus:outline-none"
                        />
                      </td>

                      {/* Rate 20ft Input */}
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={draft.rate20}
                            onChange={(e) =>
                              updateDraftRoute(line.id, routeIdx, 'rate20', Number(e.target.value) || 0)
                            }
                            className="w-24 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-right font-mono font-bold text-amber-400 text-xs focus:outline-none"
                          />
                          <span className="text-slate-500 text-[11px]">€</span>
                        </div>
                      </td>

                      {/* Rate 40ft Input */}
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={draft.rate40}
                            onChange={(e) =>
                              updateDraftRoute(line.id, routeIdx, 'rate40', Number(e.target.value) || 0)
                            }
                            className="w-24 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-right font-mono font-bold text-amber-400 text-xs focus:outline-none"
                          />
                          <span className="text-slate-500 text-[11px]">€</span>
                        </div>
                      </td>

                      {/* Rate Truck Input */}
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={draft.rateTruck}
                            onChange={(e) =>
                              updateDraftRoute(line.id, routeIdx, 'rateTruck', Number(e.target.value) || 0)
                            }
                            className="w-24 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none"
                          />
                          <span className="text-slate-500 text-[11px]">€</span>
                        </div>
                      </td>

                      {/* Save Action */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => saveRouteDraft(line.id, routeIdx)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto ${
                            isSaved
                              ? 'bg-emerald-500 text-slate-950 shadow-md'
                              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Enregistré</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Enregistrer</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Directory of Shipping Lines & Road Carriers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm">
              Répertoire des Armateurs & Transporteurs Partenaires ({filteredLines.length})
            </h3>
            <p className="text-xs text-slate-400">
              Coordonnées, franchises de surestaries et scores de ponctualité.
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer armateurs, ports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLines.map((line) => {
            const isTruck = line.transportType === 'terrestre';

            return (
              <div key={line.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{line.name}</h4>
                      {isTruck ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Routier
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          Armateur
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">Code Partenaire : {line.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{line.performanceScore}/100</span>
                    </div>
                    <div className="text-[10px] text-emerald-400">Franchise {line.freeTimeDays} jours offerts</div>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{line.commercialContact} ({line.phone})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span>{line.email}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ports & Hubs Desservis</div>
                  <div className="flex flex-wrap gap-1">
                    {line.servedPorts.map((p, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: AJOUTER UN PORT (Item 7-a) */}
      {showAddPortModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Ajouter un Port ou Hub de Transit</h3>
              </div>
              <button
                onClick={() => setShowAddPortModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePort} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom du Port ou Hub (ex: Port de Lomé, Terminal Bamako, Port de Conakry...)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Port de Pointe-Noire (Congo)"
                  value={newPortInput}
                  onChange={(e) => setNewPortInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Ce port sera immédiatement disponible dans le comparateur de fret, les dossiers de douane/transit, et les grilles de tarification.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPortModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer le Port</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AJOUTER TYPE DE CONTENEUR OU CAMION (Item 7-b) */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Ajouter Type d'Équipement (Conteneur / Camion)</h3>
              </div>
              <button
                onClick={() => setShowAddEquipmentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catégorie de Transport
                </label>
                <select
                  value={newEquipCategory}
                  onChange={(e) => setNewEquipCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="maritime">Maritime (Conteneur FCL / Open Top / Flat Rack)</option>
                  <option value="terrestre">Terrestre (Camion Plateau, Fourgon, Semi-remorque)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Désignation de l'équipement
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conteneur 20ft Open Top ou Camion Frigo 25T"
                  value={newEquipName}
                  onChange={(e) => setNewEquipName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capacité / Dimensions (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 32 m³ - 25 Tonnes utiles"
                  value={newEquipCapacity}
                  onChange={(e) => setNewEquipCapacity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter l'Équipement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AJOUTER COMPAGNIE MARITIME OU ROUTIÈRE (Item 7-c) */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Ajouter une Compagnie Maritime ou Transporteur Routier
                </h3>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom de la Compagnie / Transporteur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hapag-Lloyd ou Sahel Express Routier"
                    value={newCompanyData.name}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Code Identifiant Armateur / Transporteur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: HAPAG ou STR"
                    value={newCompanyData.code}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mode d'Opération Principal
                  </label>
                  <select
                    value={newCompanyData.transportType}
                    onChange={(e) =>
                      setNewCompanyData({ ...newCompanyData, transportType: e.target.value as ShippingTransportMode })
                    }
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="maritime">Armateur Maritime (Navires porte-conteneurs)</option>
                    <option value="terrestre">Transporteur Routier / Terrestre (Flotte de camions)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Franchise Surestaries (Jours offerts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCompanyData.freeTimeDays}
                    onChange={(e) =>
                      setNewCompanyData({ ...newCompanyData, freeTimeDays: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Commercial & Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: M. Diarra (+221 33 821 00 11)"
                    value={newCompanyData.commercialContact}
                    onChange={(e) =>
                      setNewCompanyData({ ...newCompanyData, commercialContact: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Réservation / Booking
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: booking@hapag-lloyd.com"
                    value={newCompanyData.email}
                    onChange={(e) => setNewCompanyData({ ...newCompanyData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ports & Hubs desservis (séparés par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dakar, Abidjan, Bamako, Le Havre, Anvers"
                  value={newCompanyData.servedPorts}
                  onChange={(e) => setNewCompanyData({ ...newCompanyData, servedPorts: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Initial Route Configuration */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4" />
                  <span>Liaison Tarifaire Initiale (Première Route)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Origine</label>
                    <select
                      value={newCompanyData.initOrigin}
                      onChange={(e) => setNewCompanyData({ ...newCompanyData, initOrigin: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      {allPortsList.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Destination</label>
                    <select
                      value={newCompanyData.initDestination}
                      onChange={(e) => setNewCompanyData({ ...newCompanyData, initDestination: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      {allPortsList.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Transit Time (J)</label>
                    <input
                      type="number"
                      min="1"
                      value={newCompanyData.initTransitDays}
                      onChange={(e) =>
                        setNewCompanyData({ ...newCompanyData, initTransitDays: Number(e.target.value) || 1 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Taux 20ft (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={newCompanyData.initRate20}
                      onChange={(e) =>
                        setNewCompanyData({ ...newCompanyData, initRate20: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer la Compagnie</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
