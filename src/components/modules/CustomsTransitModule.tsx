import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Ship,
  Plus,
  FileText,
  AlertTriangle,
  Download,
  Upload,
  Calendar,
  Anchor,
  User,
  Save,
  X,
  Truck,
  Plane,
  Lock,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadFileToFirebaseStorage } from '../../services/firebaseClient';
import {
  TransitShipment,
  TransitStatus,
  TransitTransportMode,
  TransitOptionType,
  TransitDocument,
} from '../../types';
import {
  useRealtimeAutoSave,
  loadDraftFromStorage,
  saveDraftToStorage,
  clearDraftFromStorage,
} from '../../hooks/useAutoSave';

const NEW_TRANSIT_DRAFT_KEY = 'transmove_draft_transit_new';

export const CustomsTransitModule: React.FC = () => {
  const {
    transitShipments,
    createTransitShipment,
    updateTransitShipment,
    updateTransitStatus,
    toggleTransitDocStatus,
    updateTransitDocument,
    appointments,
    shippingLines,
    customPorts,
    notify,
  } = useApp();

  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadDocRef = useRef<{ shipmentId: string; docId: string } | null>(null);

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(transitShipments[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Shipment Form State (6-A & 6-B) with real-time local draft
  const initialTransitDraft = useMemo(
    () =>
      loadDraftFromStorage(NEW_TRANSIT_DRAFT_KEY, {
        clientSearch: '',
        selectedClientName: '',
        senderName: '',
        recipientName: '',
        operationType: 'import' as 'import' | 'export',
        transportMode: 'maritime' as TransitTransportMode,
        transitOption: 'perso' as TransitOptionType,
        sealNumber: '',
        blNumber: '',
        containerNumber: '',
        bookingNumber: '',
        shippingLineName: shippingLines[0]?.name || 'CMA CGM',
        customsAgentName: 'Bolloré Africa Logistics / Transit Express',
        originPort: customPorts[0] || 'Dakar (PAD)',
        destinationPort: customPorts[1] || 'Le Havre (HAROPA)',
        vesselName: 'CMA CGM AFRICA FOUR',
        cargoDescription: 'Mobilier familial sous caisses maritimes et effets personnels',
        weightTons: 12.5,
        volumeM3: 28.0,
        etdDate: '2026-11-25',
        etaDate: '2026-12-08',
        transitDays: 13,
        freightCost: 2200,
        handlingCost: 350,
        customsFee: 500,
        portStorageCost: 150,
        inlandTransportCost: 600,
        insuranceCost: 250,
        totalClientPrice: 5200,
      }),
    []
  );

  const [clientSearch, setClientSearch] = useState(initialTransitDraft.clientSearch);
  const [selectedClientName, setSelectedClientName] = useState(initialTransitDraft.selectedClientName);
  const [senderName, setSenderName] = useState(initialTransitDraft.senderName);
  const [recipientName, setRecipientName] = useState(initialTransitDraft.recipientName);
  const [operationType, setOperationType] = useState<'import' | 'export'>(initialTransitDraft.operationType);
  const [transportMode, setTransportMode] = useState<TransitTransportMode>(initialTransitDraft.transportMode);
  const [transitOption, setTransitOption] = useState<TransitOptionType>(initialTransitDraft.transitOption);
  const [sealNumber, setSealNumber] = useState(initialTransitDraft.sealNumber);
  const [blNumber, setBlNumber] = useState(initialTransitDraft.blNumber);
  const [containerNumber, setContainerNumber] = useState(initialTransitDraft.containerNumber);
  const [bookingNumber, setBookingNumber] = useState(initialTransitDraft.bookingNumber);
  const [shippingLineName, setShippingLineName] = useState(initialTransitDraft.shippingLineName);
  const [customsAgentName, setCustomsAgentName] = useState(initialTransitDraft.customsAgentName);
  const [originPort, setOriginPort] = useState(initialTransitDraft.originPort);
  const [destinationPort, setDestinationPort] = useState(initialTransitDraft.destinationPort);
  const [vesselName, setVesselName] = useState(initialTransitDraft.vesselName);
  const [cargoDescription, setCargoDescription] = useState(initialTransitDraft.cargoDescription);
  const [weightTons, setWeightTons] = useState(initialTransitDraft.weightTons);
  const [volumeM3, setVolumeM3] = useState(initialTransitDraft.volumeM3);
  const [etdDate, setEtdDate] = useState(initialTransitDraft.etdDate);
  const [etaDate, setEtaDate] = useState(initialTransitDraft.etaDate);
  const [transitDays, setTransitDays] = useState(initialTransitDraft.transitDays);

  const handleDatesChange = (nextEtd: string, nextEta: string) => {
    setEtdDate(nextEtd);
    setEtaDate(nextEta);
    if (nextEtd && nextEta) {
      const diffMs = new Date(nextEta).getTime() - new Date(nextEtd).getTime();
      const days = Math.max(0, Math.round(diffMs / 86400000));
      if (!Number.isNaN(days)) setTransitDays(days);
    }
  };

  // Dépenses annexes à prévoir
  const [freightCost, setFreightCost] = useState(initialTransitDraft.freightCost);
  const [handlingCost, setHandlingCost] = useState(initialTransitDraft.handlingCost);
  const [customsFee, setCustomsFee] = useState(initialTransitDraft.customsFee);
  const [portStorageCost, setPortStorageCost] = useState(initialTransitDraft.portStorageCost);
  const [inlandTransportCost, setInlandTransportCost] = useState(initialTransitDraft.inlandTransportCost);
  const [insuranceCost, setInsuranceCost] = useState(initialTransitDraft.insuranceCost);
  const [totalClientPrice, setTotalClientPrice] = useState(initialTransitDraft.totalClientPrice);

  useEffect(() => {
    saveDraftToStorage(NEW_TRANSIT_DRAFT_KEY, {
      clientSearch,
      selectedClientName,
      senderName,
      recipientName,
      operationType,
      transportMode,
      transitOption,
      sealNumber,
      blNumber,
      containerNumber,
      bookingNumber,
      shippingLineName,
      customsAgentName,
      originPort,
      destinationPort,
      vesselName,
      cargoDescription,
      weightTons,
      volumeM3,
      etdDate,
      etaDate,
      transitDays,
      freightCost,
      handlingCost,
      customsFee,
      portStorageCost,
      inlandTransportCost,
      insuranceCost,
      totalClientPrice,
    });
  }, [
    clientSearch,
    selectedClientName,
    senderName,
    recipientName,
    operationType,
    transportMode,
    transitOption,
    sealNumber,
    blNumber,
    containerNumber,
    bookingNumber,
    shippingLineName,
    customsAgentName,
    originPort,
    destinationPort,
    vesselName,
    cargoDescription,
    weightTons,
    volumeM3,
    etdDate,
    etaDate,
    transitDays,
    freightCost,
    handlingCost,
    customsFee,
    portStorageCost,
    inlandTransportCost,
    insuranceCost,
    totalClientPrice,
  ]);

  const selectedShipment = transitShipments.find((t) => t.id === selectedShipmentId) || transitShipments[0];

  // Live editable fields for selected shipment (auto-saved to Firestore in real time)
  const [liveShipmentPatch, setLiveShipmentPatch] = useState<{
    containerNumber: string;
    bookingNumber: string;
    sealNumber: string;
    customsAgentName: string;
    etdDate: string;
    etaDate: string;
  }>({
    containerNumber: '',
    bookingNumber: '',
    sealNumber: '',
    customsAgentName: '',
    etdDate: '',
    etaDate: '',
  });
  const hydratedShipmentIdRef = useRef<string>('');

  useEffect(() => {
    if (!selectedShipment) return;
    if (hydratedShipmentIdRef.current !== selectedShipment.id) {
      hydratedShipmentIdRef.current = selectedShipment.id;
      setLiveShipmentPatch({
        containerNumber: selectedShipment.containerNumber || '',
        bookingNumber: selectedShipment.bookingNumber || '',
        sealNumber: selectedShipment.sealNumber || '',
        customsAgentName: selectedShipment.customsAgentName || '',
        etdDate: selectedShipment.etdDate || '',
        etaDate: selectedShipment.etaDate || '',
      });
    }
  }, [selectedShipment]);

  useRealtimeAutoSave({
    enabled: Boolean(selectedShipment && hydratedShipmentIdRef.current === selectedShipment.id),
    data: liveShipmentPatch,
    resetKey: selectedShipment?.id || 'none',
    delayMs: 650,
    onSave: (patch) => {
      if (!selectedShipment) return;
      updateTransitShipment(
        {
          ...selectedShipment,
          containerNumber: patch.containerNumber,
          bookingNumber: patch.bookingNumber,
          sealNumber: patch.sealNumber.trim() || undefined,
          customsAgentName: patch.customsAgentName,
          etdDate: patch.etdDate,
          etaDate: patch.etaDate,
        },
        { silent: true }
      );
    },
  });

  const statusLabels: Record<TransitStatus, { label: string; color: string }> = {
    en_preparation: { label: 'En préparation', color: 'bg-slate-700/60 text-slate-300 border-slate-600' },
    documents_en_cours: { label: 'Documents en cours', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    douane_en_cours: { label: 'Formalités Douane', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    embarque: { label: 'Embarqué quai', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    en_transit: { label: 'En transit maritime', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    arrive: { label: 'Navire au port', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    dedouane: { label: 'Dédouané (BAE)', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    livre: { label: 'Livré au destinataire', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  };

  const filteredShipments = transitShipments.filter((t) => {
    return filterType === 'all' || t.operationType === filterType;
  });

  // Client search list filter
  const candidateClients = appointments.map((a) => a.clientName);
  const filteredClients = candidateClients.filter((name) =>
    name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleSelectClient = (name: string) => {
    setSelectedClientName(name);
    setSenderName(name);
    setRecipientName(name);
  };

  // 6-B) Bouton Enregistrer nouveau dossier
  const handleSaveShipment = (e: React.FormEvent) => {
    e.preventDefault();
    const finalClient = selectedClientName || clientSearch || 'Client Import/Export';

    const defaultDocs: TransitDocument[] = [
      { id: 'doc-' + Date.now() + '-1', type: 'Facture Commerciale', name: `Facture_${blNumber || 'COMM'}.pdf`, isUploaded: true, status: 'valide' },
      { id: 'doc-' + Date.now() + '-2', type: 'Packing List', name: `PackingList_${containerNumber || 'CTR'}.pdf`, isUploaded: true, status: 'valide' },
      { id: 'doc-' + Date.now() + '-3', type: 'Bill of Lading (B/L)', name: blNumber ? `BL_${blNumber}.pdf` : 'Draft_BL.pdf', isUploaded: !!blNumber, status: blNumber ? 'valide' : 'manquant' },
      { id: 'doc-' + Date.now() + '-4', type: 'Certificat d\'Origine', name: 'Certificat_Origine.pdf', isUploaded: true, status: 'valide' },
      { id: 'doc-' + Date.now() + '-5', type: 'Police d\'Assurance', name: 'Certificat_Assurance.pdf', isUploaded: true, status: 'valide' },
      { id: 'doc-' + Date.now() + '-6', type: 'Déclaration Douane', name: 'Declaration_Douane_EX1.pdf', isUploaded: false, status: 'manquant' },
    ];

    const created = createTransitShipment({
      operationType,
      transportMode,
      transitOption,
      sealNumber: sealNumber.trim() || undefined,
      clientName: finalClient,
      senderName: senderName || finalClient,
      recipientName: recipientName || finalClient,
      originPort,
      destinationPort,
      shippingLineId: 'shp-' + Date.now(),
      shippingLineName,
      containerNumber: containerNumber || `CTR-${Math.floor(100000 + Math.random() * 900000)}`,
      bookingNumber: bookingNumber || `BKG-${Math.floor(10000 + Math.random() * 90000)}`,
      vesselName,
      etdDate,
      etaDate,
      transitDays,
      status: 'en_preparation',
      documents: defaultDocs,
      customsAgentName,
      additionalExpenses: [
        { description: 'Frais de magasinage portuaire', amount: portStorageCost },
        { description: 'Traction terrestre & manutention', amount: inlandTransportCost + handlingCost },
        { description: 'Droits et timbres douaniers', amount: customsFee },
      ],
      freightCost,
      handlingCost,
      customsFee,
      portStorageCost,
      inlandTransportCost,
      insuranceCost,
      totalClientPrice,
      currency: 'EUR',
      cargoDescription,
      weightTons,
      volumeM3,
      notes: `Dossier créé (${operationType.toUpperCase()} • ${transportMode.toUpperCase()} • ${transitOption.toUpperCase()}).${sealNumber ? ` N° Plomb : ${sealNumber} •` : ''} B/L : ${blNumber || 'Non renseigné'} • Transitaire : ${customsAgentName}`,
    });

    clearDraftFromStorage(NEW_TRANSIT_DRAFT_KEY);
    setSelectedShipmentId(created.id);
    setSealNumber('');
    setClientSearch('');
    setSelectedClientName('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 8
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Transit International, Douane, Import & Export
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Création de dossiers, sélection client, saisie N° B/L et Conteneur, transitaire et dépenses annexes
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Dossier Import / Export</span>
        </button>
      </div>

      {/* Grid: Dossiers list & detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of Shipments */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400">
              Expéditions en cours ({filteredShipments.length})
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Tous les types</option>
              <option value="import">IMPORT</option>
              <option value="export">EXPORT</option>
            </select>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredShipments.map((ship) => {
              const isSelected = selectedShipment?.id === ship.id;
              const badge = statusLabels[ship.status] || { label: ship.status, color: 'bg-slate-800 text-slate-300' };
              const missingDocsCount = ship.documents.filter((d) => d.status === 'manquant').length;

              return (
                <div
                  key={ship.id}
                  onClick={() => setSelectedShipmentId(ship.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-amber-400">{ship.reference}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm truncate">{ship.clientName}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                    <Anchor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{ship.originPort} → {ship.destinationPort}</span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 font-semibold">{ship.containerNumber}</span>
                    <span className="text-slate-400">{ship.shippingLineName}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold uppercase">
                      {ship.operationType}
                    </span>
                    {ship.transportMode && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                        {ship.transportMode}
                      </span>
                    )}
                    {ship.transitOption && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold uppercase">
                        {ship.transitOption}
                      </span>
                    )}
                    {ship.sealNumber && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono">
                        Plomb : {ship.sealNumber}
                      </span>
                    )}
                  </div>

                  {ship.customsAgentName && (
                    <div className="mt-1 text-[10px] text-slate-400 truncate">
                      Transitaire : <span className="text-slate-200">{ship.customsAgentName}</span>
                    </div>
                  )}

                  {missingDocsCount > 0 && (
                    <div className="mt-2 text-[10px] text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{missingDocsCount} document(s) manquant(s) pour le dédouanement</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Shipment Comprehensive Dossier */}
        <div className="lg:col-span-7">
          {selectedShipment ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-amber-400 text-lg">{selectedShipment.reference}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedShipment.operationType}
                    </span>
                    {selectedShipment.transportMode && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {selectedShipment.transportMode}
                      </span>
                    )}
                    {selectedShipment.transitOption && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Option : {selectedShipment.transitOption}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Client : <span className="font-bold text-white">{selectedShipment.clientName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedShipment.status}
                    onChange={(e) => updateTransitStatus(selectedShipment.id, e.target.value as TransitStatus)}
                    className="bg-slate-950 text-white font-bold text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none"
                  >
                    {Object.entries(statusLabels).map(([k, { label }]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Maritime Voyage Box with live-editable BL, Container, Seal, ETD/ETA & Forwarder */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Compagnie / Navire</div>
                  <div className="font-bold text-white mt-0.5">{selectedShipment.shippingLineName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{selectedShipment.vesselName}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Conteneur / B/L / Plomb</div>
                  <input
                    type="text"
                    value={liveShipmentPatch.containerNumber}
                    onChange={(e) =>
                      setLiveShipmentPatch((p) => ({ ...p, containerNumber: e.target.value }))
                    }
                    placeholder="N° Conteneur"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono font-bold text-amber-400 text-[11px] focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={liveShipmentPatch.bookingNumber}
                    onChange={(e) =>
                      setLiveShipmentPatch((p) => ({ ...p, bookingNumber: e.target.value }))
                    }
                    placeholder="N° Booking / B/L"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 font-mono text-[10px] text-slate-300 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={liveShipmentPatch.sealNumber}
                    onChange={(e) =>
                      setLiveShipmentPatch((p) => ({ ...p, sealNumber: e.target.value }))
                    }
                    placeholder="N° Plomb (scellé)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 font-mono text-[10px] text-cyan-300 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Date de Départ (ETD)</div>
                  <input
                    type="date"
                    value={liveShipmentPatch.etdDate}
                    onChange={(e) =>
                      setLiveShipmentPatch((p) => ({ ...p, etdDate: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-bold text-white text-[11px] focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-400 truncate">{selectedShipment.originPort}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Date d’Arrivée (ETA)</div>
                  <input
                    type="date"
                    value={liveShipmentPatch.etaDate}
                    onChange={(e) =>
                      setLiveShipmentPatch((p) => ({ ...p, etaDate: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-bold text-emerald-400 text-[11px] focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-400 truncate">{selectedShipment.destinationPort}</div>
                </div>
              </div>

              {/* Transitaire & Dépenses annexes prévues banner */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <span className="text-slate-400 shrink-0">Transitaire en charge :</span>
                  <input
                    type="text"
                    value={liveShipmentPatch.customsAgentName}
                    onChange={(e) =>
                      setLiveShipmentPatch((p) => ({ ...p, customsAgentName: e.target.value }))
                    }
                    placeholder="Nom du transitaire..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Formalités Sydonia en cours
                </span>
              </div>

              {/* Required Customs Checklist with 1-click validate & Firebase Storage upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Checklist des Documents Douaniers & Maritimes
                  </h4>
                  <span className="text-[10px] text-slate-400">Importez vos PDF/images ou validez la pièce</span>
                </div>

                <input
                  ref={docFileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    const target = pendingUploadDocRef.current;
                    pendingUploadDocRef.current = null;
                    if (!file || !target) return;

                    setUploadingDocId(target.docId);
                    try {
                      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                      const storagePath = `transit/${target.shipmentId}/${target.docId}_${Date.now()}_${safeName}`;
                      const fileUrl = await uploadFileToFirebaseStorage(storagePath, file, 10 * 1024 * 1024);
                      const sizeLabel =
                        file.size > 1024 * 1024
                          ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
                          : `${Math.max(1, Math.round(file.size / 1024))} Ko`;

                      updateTransitDocument(target.shipmentId, target.docId, {
                        name: file.name,
                        fileUrl,
                        fileSize: sizeLabel,
                        isUploaded: true,
                        uploadedAt: new Date().toISOString(),
                        status: 'valide',
                      });
                      notify('Document importé', `"${file.name}" stocké et validé sur le dossier.`, 'success');
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : 'Échec du téléversement Firebase Storage.';
                      notify('Erreur import document', msg, 'error');
                    } finally {
                      setUploadingDocId(null);
                    }
                  }}
                />

                <div className="space-y-2">
                  {selectedShipment.documents.map((doc) => {
                    const isValid = doc.status === 'valide';
                    const isUploading = uploadingDocId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition ${
                          isValid
                            ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                            : 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTransitDocStatus(selectedShipment.id, doc.id)}
                            title="Basculer le statut conforme / manquant"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition shrink-0 ${
                              isValid ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isValid ? '✓' : ''}
                          </button>
                          <div className="min-w-0">
                            <div className="font-semibold text-white text-xs">{doc.type}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {doc.name} {doc.fileSize ? `(${doc.fileSize})` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-semibold border border-slate-700"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ouvrir</span>
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => {
                              pendingUploadDocRef.current = { shipmentId: selectedShipment.id, docId: doc.id };
                              docFileInputRef.current?.click();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-bold border border-amber-500/30 transition disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3" />
                            )}
                            <span>{isUploading ? 'Envoi...' : doc.fileUrl ? 'Remplacer' : 'Importer'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleTransitDocStatus(selectedShipment.id, doc.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isValid
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {isValid ? 'Conforme' : 'Manquant'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Costs & Margin Breakdown with Dépenses Annexes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs">Décomposition Financière & Dépenses Annexes Prévues</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Fret Maritime</span>
                    <div className="font-bold text-white mt-0.5">{selectedShipment.freightCost} €</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Droits & Taxes Douane</span>
                    <div className="font-bold text-white mt-0.5">{selectedShipment.customsFee} €</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Traction & Manutention</span>
                    <div className="font-bold text-white mt-0.5">{selectedShipment.inlandTransportCost + selectedShipment.handlingCost} €</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Magasinage Portuaire</span>
                    <div className="font-bold text-white mt-0.5">{selectedShipment.portStorageCost} €</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Police d'Assurance</span>
                    <div className="font-bold text-white mt-0.5">{selectedShipment.insuranceCost} €</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-800">
                  <div>
                    <span className="text-slate-400">Prix Facturé au Client : </span>
                    <span className="font-bold text-white text-sm">{selectedShipment.totalClientPrice} €</span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    Marge opérationnelle nette : +
                    {selectedShipment.totalClientPrice -
                      (selectedShipment.freightCost +
                        selectedShipment.customsFee +
                        selectedShipment.inlandTransportCost +
                        selectedShipment.handlingCost +
                        selectedShipment.portStorageCost +
                        selectedShipment.insuranceCost)}{' '}
                    €
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Sélectionnez un dossier de transit
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6-A & 6-B: Modal Nouveau Dossier Import/Export avec Recherche Client & Bouton Enregistrer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Ship className="w-5 h-5 text-amber-400" />
                Nouveau Dossier de Transit & Douane (Import / Export)
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShipment} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
              {/* 6-A: Recherche ou Déroulement Nom Client */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-amber-300 font-semibold text-xs flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-400" />
                  Sélection ou Recherche du Nom de Client *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Taper pour chercher ou saisir un client..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setSelectedClientName(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <select
                      value={selectedClientName}
                      onChange={(e) => handleSelectClient(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">-- Ou choisir dans la liste clients --</option>
                      {filteredClients.map((c, i) => (
                        <option key={i} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Onglets MODE & OPTION + Type d'Opération (IMPORT / EXPORT uniquement) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Type d'Opération *</label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value as 'import' | 'export')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="import">IMPORT</option>
                    <option value="export">EXPORT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">MODE *</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                    {(
                      [
                        { id: 'aerien', label: 'AÉRIEN', icon: Plane },
                        { id: 'maritime', label: 'MARITIME', icon: Ship },
                        { id: 'terrestre', label: 'TERRESTRE', icon: Truck },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const active = transportMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTransportMode(m.id)}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[10px] font-bold transition ${
                            active
                              ? 'bg-amber-500 text-slate-950 shadow'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Option *</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                    {(
                      [
                        { id: 'perso', label: 'Perso' },
                        { id: 'groupage', label: 'Groupage' },
                      ] as const
                    ).map((opt) => {
                      const active = transitOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTransitOption(opt.id)}
                          className={`py-1.5 px-2 rounded-md text-xs font-bold transition ${
                            active
                              ? 'bg-cyan-500 text-slate-950 shadow'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* B/L, Conteneur, Plomb, Compagnie, Transitaire */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">N° Bill of Lading (B/L)</label>
                  <input
                    type="text"
                    placeholder="ex: MSCU992014"
                    value={blNumber}
                    onChange={(e) => setBlNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">N° Conteneur</label>
                  <input
                    type="text"
                    placeholder="ex: CMAU-829471-2"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Numéro de Plomb (Scellé)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: PLB-482910"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Compagnie Maritime / Transporteur</label>
                  <select
                    value={shippingLineName}
                    onChange={(e) => setShippingLineName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {shippingLines.map((line) => (
                      <option key={line.id} value={line.name}>
                        {line.name} ({line.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Nom du Transitaire (Customs Broker)</label>
                  <input
                    type="text"
                    placeholder="ex: Bolloré Africa Logistics, Maersk Customs Services..."
                    value={customsAgentName}
                    onChange={(e) => setCustomsAgentName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Ports, Navire et Dates de Départ / Arrivée */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Port / Ville de Départ</label>
                  <select
                    value={originPort}
                    onChange={(e) => setOriginPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {customPorts.map((p, idx) => (
                      <option key={idx} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Port / Ville d'Arrivée</label>
                  <select
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {customPorts.map((p, idx) => (
                      <option key={idx} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom du Navire / Vol / Camion</label>
                  <input
                    type="text"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-emerald-400 font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date de Départ (ETD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={etdDate}
                    onChange={(e) => handleDatesChange(e.target.value, etaDate)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-cyan-400 font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Date d’Arrivée (ETA) *
                  </label>
                  <input
                    type="date"
                    required
                    value={etaDate}
                    onChange={(e) => handleDatesChange(etdDate, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Durée Transit (jours)</label>
                  <input
                    type="number"
                    min={0}
                    value={transitDays}
                    onChange={(e) => setTransitDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Dépenses Annexes à Prévoir */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <span className="font-bold text-white text-xs block">
                  Dépenses Annexes & Coûts à Prévoir (€)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Fret Maritime</label>
                    <input
                      type="number"
                      value={freightCost}
                      onChange={(e) => setFreightCost(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Droits Douane</label>
                    <input
                      type="number"
                      value={customsFee}
                      onChange={(e) => setCustomsFee(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Manutention / Acconage</label>
                    <input
                      type="number"
                      value={handlingCost}
                      onChange={(e) => setHandlingCost(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Magasinage Portuaire</label>
                    <input
                      type="number"
                      value={portStorageCost}
                      onChange={(e) => setPortStorageCost(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Traction Terrestre</label>
                    <input
                      type="number"
                      value={inlandTransportCost}
                      onChange={(e) => setInlandTransportCost(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Police Assurance</label>
                    <input
                      type="number"
                      value={insuranceCost}
                      onChange={(e) => setInsuranceCost(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-emerald-400 font-bold text-[10px] mb-1">Prix Total Client TTC</label>
                    <input
                      type="number"
                      value={totalClientPrice}
                      onChange={(e) => setTotalClientPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-emerald-500 rounded px-2.5 py-1 text-emerald-300 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 6-B: Bouton Enregistrer */}
              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer le Dossier de Transit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
