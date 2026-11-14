import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Package,
  Truck,
  Users,
  DollarSign,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Layers,
  Check,
  User,
  Save,
  MapPin,
  Calendar,
  X,
  Phone,
  Mail,
  Home,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { INITIAL_FURNITURE_CATALOG } from '../../data/initialData';
import { FurnitureItem } from '../../types';
import {
  useRealtimeAutoSave,
  loadDraftFromStorage,
  saveDraftToStorage,
  clearDraftFromStorage,
} from '../../hooks/useAutoSave';

const DIRECT_VOLUME_DRAFT_KEY = 'transmove_draft_volume_direct';

const EXTRA_FURNITURE_SUGGESTIONS: {
  name: string;
  room: string;
  defaultM3: number;
  requiresDisassembly: boolean;
  isFragile: boolean;
}[] = [
  { name: 'Bahut 4 portes', room: 'Salle à manger', defaultM3: 1.8, requiresDisassembly: false, isFragile: false },
  { name: 'Table à manger 6 personnes', room: 'Salle à manger', defaultM3: 1.4, requiresDisassembly: true, isFragile: false },
  { name: 'Chaise de salle à manger', room: 'Salle à manger', defaultM3: 0.2, requiresDisassembly: false, isFragile: false },
  { name: 'Canapé d’angle 5 places', room: 'Salon', defaultM3: 3.0, requiresDisassembly: true, isFragile: false },
  { name: 'Vaisselier vitré', room: 'Salle à manger', defaultM3: 1.6, requiresDisassembly: false, isFragile: true },
  { name: 'Lit simple 90x190 + Sommier', room: 'Chambre', defaultM3: 1.3, requiresDisassembly: true, isFragile: false },
  { name: 'Dressing modulable 2m', room: 'Chambre', defaultM3: 2.8, requiresDisassembly: true, isFragile: false },
  { name: 'Congélateur coffre', room: 'Cuisine', defaultM3: 0.9, requiresDisassembly: false, isFragile: false },
  { name: 'Four / Cuisinière piano', room: 'Cuisine', defaultM3: 0.7, requiresDisassembly: false, isFragile: true },
  { name: 'Téléviseur grand écran (sous caisse)', room: 'Salon', defaultM3: 0.3, requiresDisassembly: false, isFragile: true },
  { name: 'Meuble à chaussures', room: 'Divers', defaultM3: 0.4, requiresDisassembly: false, isFragile: false },
  { name: 'Vélo / Trottinette électrique', room: 'Divers', defaultM3: 0.4, requiresDisassembly: false, isFragile: false },
];

const createZeroedCatalog = (): FurnitureItem[] =>
  INITIAL_FURNITURE_CATALOG.map((it) => ({ ...it, quantity: 0 }));

interface VehicleRecommendationResult {
  recommendedVehicle: string;
  recommendedVehicleVolumeM3: number;
  recommendedMovers: number;
  recommendedWorkDays: number;
}

const computeVehicleRecommendation = (totalRawM3: number): VehicleRecommendationResult => {
  if (totalRawM3 <= 0) {
    return {
      recommendedVehicle: 'À déterminer (0 m³)',
      recommendedVehicleVolumeM3: 0,
      recommendedMovers: 0,
      recommendedWorkDays: 0,
    };
  }

  const recommendedWorkDays = Math.max(1, Math.ceil(totalRawM3 / 30));

  if (totalRawM3 < 10) {
    return {
      recommendedVehicle: 'Fourgonnette 10m³',
      recommendedVehicleVolumeM3: 10,
      recommendedMovers: 2,
      recommendedWorkDays,
    };
  }
  if (totalRawM3 < 20) {
    return {
      recommendedVehicle: 'Fourgon Grand Volume 20m³',
      recommendedVehicleVolumeM3: 20,
      recommendedMovers: 3,
      recommendedWorkDays,
    };
  }
  if (totalRawM3 < 40) {
    return {
      recommendedVehicle: 'Camion Porteur 40m³',
      recommendedVehicleVolumeM3: 40,
      recommendedMovers: 4,
      recommendedWorkDays,
    };
  }
  if (totalRawM3 < 80) {
    return {
      recommendedVehicle: 'Semi-remorque 80m³',
      recommendedVehicleVolumeM3: 80,
      recommendedMovers: 5,
      recommendedWorkDays,
    };
  }

  // Pour les volumes bruts >= 80 m³, combinaison de camions garantissant toujours un volume total > volume brut
  const semiCount = Math.floor(totalRawM3 / 80);
  const remainder = Math.round((totalRawM3 - semiCount * 80) * 10) / 10;
  let extraLabel = 'Fourgonnette 10m³';
  let extraVolume = 10;

  if (remainder >= 40) {
    return {
      recommendedVehicle: `${semiCount + 1}x Semi-remorque 80m³`,
      recommendedVehicleVolumeM3: (semiCount + 1) * 80,
      recommendedMovers: Math.min(12, 5 + semiCount + 1),
      recommendedWorkDays,
    };
  }
  if (remainder >= 20) {
    extraLabel = 'Camion Porteur 40m³';
    extraVolume = 40;
  } else if (remainder >= 10) {
    extraLabel = 'Fourgon Grand Volume 20m³';
    extraVolume = 20;
  }

  return {
    recommendedVehicle: `${semiCount}x Semi-remorque 80m³ + 1x ${extraLabel}`,
    recommendedVehicleVolumeM3: semiCount * 80 + extraVolume,
    recommendedMovers: Math.min(12, 5 + semiCount),
    recommendedWorkDays,
  };
};

export const VolumeEstimatorModule: React.FC = () => {
  const {
    currentCompany,
    createQuote,
    setActiveModule,
    appointments,
    volumeEstimations,
    saveVolumeEstimation,
    updateAppointmentVolume,
    updateAppointmentStatus,
    notify,
  } = useApp();

  const initialDirectDraft = useMemo(
    () =>
      loadDraftFromStorage<{
        directEstimationId: string;
        items: FurnitureItem[];
        clientName: string;
        clientPhone: string;
        clientEmail: string;
        originAddress: string;
        destinationAddress: string;
        targetDate: string;
        visitNotes: string;
        ratePerM3: number;
      } | null>(DIRECT_VOLUME_DRAFT_KEY, null),
    []
  );

  const [directEstimationId, setDirectEstimationId] = useState<string>(
    () => initialDirectDraft?.directEstimationId || `est-direct-${Date.now()}`
  );
  const [items, setItems] = useState<FurnitureItem[]>(() =>
    initialDirectDraft?.items?.length ? initialDirectDraft.items : createZeroedCatalog()
  );
  const [rooms, setRooms] = useState<string[]>(['Tous', 'Salon', 'Chambre', 'Cuisine', 'Bureau', 'Salle à manger', 'Divers']);
  const [selectedRoom, setSelectedRoom] = useState<string>('Tous');
  const [roomPendingDelete, setRoomPendingDelete] = useState<string | null>(null);

  // Client and Appointment Selection State (starts blank at 0 m³ for a new client unless draft exists)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [clientName, setClientName] = useState(initialDirectDraft?.clientName || '');
  const [clientPhone, setClientPhone] = useState(initialDirectDraft?.clientPhone || '');
  const [clientEmail, setClientEmail] = useState(initialDirectDraft?.clientEmail || '');
  const [originAddress, setOriginAddress] = useState(initialDirectDraft?.originAddress || '');
  const [destinationAddress, setDestinationAddress] = useState(initialDirectDraft?.destinationAddress || '');
  const [targetDate, setTargetDate] = useState(
    initialDirectDraft?.targetDate || new Date().toISOString().split('T')[0]
  );
  const [visitNotes, setVisitNotes] = useState(initialDirectDraft?.visitNotes || '');

  // Room creation state
  const [newRoomName, setNewRoomName] = useState('');
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  // Furniture item creation state
  const [customItemName, setCustomItemName] = useState('');
  const [customItemRoom, setCustomItemRoom] = useState('Salon');
  const [customItemM3, setCustomItemM3] = useState<number>(1.0);
  const [customItemDisassembly, setCustomItemDisassembly] = useState(false);
  const [customItemFragile, setCustomItemFragile] = useState(false);
  const [isFurnitureDropdownOpen, setIsFurnitureDropdownOpen] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const [summaryFilter, setSummaryFilter] = useState<'all_active' | 'custom_only'>('all_active');
  const furnitureDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (furnitureDropdownRef.current && !furnitureDropdownRef.current.contains(event.target as Node)) {
        setIsFurnitureDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableFurnitureOptions = useMemo(() => {
    const map = new Map<
      string,
      { name: string; room: string; defaultM3: number; requiresDisassembly: boolean; isFragile: boolean }
    >();

    [...INITIAL_FURNITURE_CATALOG, ...items].forEach((it) => {
      const key = it.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: it.name,
          room: it.room,
          defaultM3: it.defaultM3,
          requiresDisassembly: it.requiresDisassembly,
          isFragile: it.isFragile,
        });
      }
    });

    EXTRA_FURNITURE_SUGGESTIONS.forEach((s) => {
      const key = s.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, s);
      }
    });

    return Array.from(map.values());
  }, [items]);

  const filteredFurnitureOptions = useMemo(() => {
    const q = customItemName.trim().toLowerCase();
    if (!q) return availableFurnitureOptions;
    return availableFurnitureOptions.filter(
      (opt) => opt.name.toLowerCase().includes(q) || opt.room.toLowerCase().includes(q)
    );
  }, [availableFurnitureOptions, customItemName]);

  const hasExactFurnitureMatch = availableFurnitureOptions.some(
    (opt) => opt.name.trim().toLowerCase() === customItemName.trim().toLowerCase()
  );

  const handleSelectFurnitureOption = (opt: {
    name: string;
    room: string;
    defaultM3: number;
    requiresDisassembly: boolean;
    isFragile: boolean;
  }) => {
    setCustomItemName(opt.name);
    setCustomItemM3(opt.defaultM3);
    setCustomItemDisassembly(opt.requiresDisassembly);
    setCustomItemFragile(opt.isFragile);
    if (rooms.includes(opt.room)) {
      setCustomItemRoom(opt.room);
    }
    setIsFurnitureDropdownOpen(false);
  };

  const [ratePerM3, setRatePerM3] = useState<number>(initialDirectDraft?.ratePerM3 || 85); // EUR or CFA per m3 base
  const hydratedAppointmentRef = useRef<string>('');

  // Load persisted estimation ONLY when switching to an appointment (prevents onSnapshot from overwriting active typing)
  useEffect(() => {
    if (!selectedAppointmentId) {
      hydratedAppointmentRef.current = '';
      return;
    }
    if (hydratedAppointmentRef.current === selectedAppointmentId) return;
    const savedEst = volumeEstimations.find((v) => v.appointmentId === selectedAppointmentId);
    if (savedEst && savedEst.items.length > 0) {
      setItems(savedEst.items);
      const customRooms = Array.from(new Set(savedEst.items.map((it) => it.room)));
      setRooms((prev) => Array.from(new Set([...prev, ...customRooms])));
      hydratedAppointmentRef.current = selectedAppointmentId;
    }
  }, [selectedAppointmentId, volumeEstimations]);

  const handleResetToNewClient = () => {
    clearDraftFromStorage(DIRECT_VOLUME_DRAFT_KEY);
    hydratedAppointmentRef.current = '';
    setDirectEstimationId(`est-direct-${Date.now()}`);
    setSelectedAppointmentId('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setOriginAddress('');
    setDestinationAddress('');
    setTargetDate(new Date().toISOString().split('T')[0]);
    setVisitNotes('');
    setAddedItemIds([]);
    setItems(createZeroedCatalog());
  };

  // When an appointment is selected from dropdown
  const handleSelectAppointment = (aptId: string) => {
    setAddedItemIds([]);
    if (!aptId) {
      handleResetToNewClient();
      return;
    }

    hydratedAppointmentRef.current = aptId;
    setSelectedAppointmentId(aptId);

    const apt = appointments.find((a) => a.id === aptId);
    if (apt) {
      setClientName(apt.clientName);
      setClientPhone(apt.clientPhone);
      setClientEmail(apt.clientEmail);
      setOriginAddress(apt.originAddress);
      setDestinationAddress(apt.destinationAddress);
      setTargetDate(apt.targetDate);
      setVisitNotes(apt.notes || '');
    }

    const savedEst = volumeEstimations.find((v) => v.appointmentId === aptId);
    if (savedEst && savedEst.items.length > 0) {
      setItems(savedEst.items);
      const customRooms = Array.from(new Set(savedEst.items.map((it) => it.room)));
      setRooms((prev) => Array.from(new Set([...prev, ...customRooms])));
    } else {
      setItems(createZeroedCatalog());
    }
  };

  // Calculations
  const totalSurveyedM3 = items.reduce((acc, it) => acc + (it.surveyedM3 || it.defaultM3) * it.quantity, 0);
  const totalRawM3 = Math.round(totalSurveyedM3 * 10) / 10;
  const totalDismantledM3 = items.reduce(
    (acc, it) => acc + (it.requiresDisassembly ? it.dismantledM3 : it.surveyedM3 || it.defaultM3) * it.quantity,
    0
  );
  const totalWeightKg = items.reduce((acc, it) => acc + (it.weightKg || 30) * it.quantity, 0);
  const totalTransportM3 = Math.round((totalDismantledM3 * 1.15) * 10) / 10; // +15% void factor in truck

  // Material & resources recommendations
  const estimatedStandardBoxes = Math.round(totalTransportM3 * 2.5);
  const estimatedBookBoxes = Math.round(totalTransportM3 * 1.2);
  const estimatedWardrobeBoxes = totalTransportM3 > 0 ? Math.max(2, Math.round(totalTransportM3 * 0.25)) : 0;

  // Vehicle recommendation (strictly greater than Volume Total Brut)
  const {
    recommendedVehicle,
    recommendedVehicleVolumeM3,
    recommendedMovers,
    recommendedWorkDays,
  } = computeVehicleRecommendation(totalRawM3);

  // Tariff calculation
  const baseCost = Math.round(totalTransportM3 * ratePerM3);
  const packagingCost = items.reduce((acc, it) => acc + (it.requiresPackaging ? it.quantity * 12 : 0), 0);
  const disassemblyCost = items.reduce((acc, it) => acc + (it.requiresDisassembly ? it.quantity * 25 : 0), 0);
  const estimatedTotalPrice = baseCost + packagingCost + disassemblyCost;

  const handleQuantityChange = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const newQty = Math.max(0, it.quantity + delta);
          return { ...it, quantity: newQty };
        }
        return it;
      })
    );
  };

  const handleToggleOption = (id: string, key: 'requiresDisassembly' | 'requiresPackaging' | 'isFragile' | 'isBulky') => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, [key]: !it[key] };
        }
        return it;
      })
    );
  };

  // Add Room
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed) return;
    if (!rooms.includes(trimmed)) {
      setRooms((prev) => [...prev, trimmed]);
      setSelectedRoom(trimmed);
      setCustomItemRoom(trimmed);
    }
    setNewRoomName('');
    setIsAddingRoom(false);
  };

  // Delete Room (in-app confirmation modal)
  const handleDeleteRoom = (roomToDelete: string) => {
    if (roomToDelete === 'Tous') return;
    setRoomPendingDelete(roomToDelete);
  };

  const confirmDeleteRoom = () => {
    if (!roomPendingDelete) return;
    setRooms((prev) => prev.filter((r) => r !== roomPendingDelete));
    setItems((prev) => prev.filter((it) => it.room !== roomPendingDelete));
    if (selectedRoom === roomPendingDelete) {
      setSelectedRoom('Tous');
    }
    setRoomPendingDelete(null);
  };

  // Delete Item completely
  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Add Item
  const addCustomItem = () => {
    if (!customItemName.trim()) return;
    const newItem: FurnitureItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      room: customItemRoom || 'Divers',
      name: customItemName.trim(),
      defaultM3: customItemM3,
      quantity: 1,
      surveyedM3: customItemM3,
      dismantledM3: customItemDisassembly ? Math.round(customItemM3 * 0.6 * 10) / 10 : customItemM3,
      weightKg: Math.round(customItemM3 * 35),
      isFragile: customItemFragile,
      isBulky: customItemM3 > 1.5,
      isValuable: false,
      requiresDisassembly: customItemDisassembly,
      requiresPackaging: true,
      requiresStorage: false,
    };
    setItems((prev) => [newItem, ...prev]);
    setAddedItemIds((prev) => [newItem.id, ...prev]);
    setCustomItemName('');
    setCustomItemM3(1.0);
    setIsFurnitureDropdownOpen(false);
    notify('Meuble ajouté', `"${newItem.name}" (${newItem.defaultM3} m³) ajouté au récapitulatif.`, 'success');
  };

  // Real-time localStorage draft for direct client entry
  useEffect(() => {
    if (selectedAppointmentId) return;
    const hasActiveContent =
      Boolean(clientName.trim()) ||
      Boolean(clientPhone.trim()) ||
      Boolean(clientEmail.trim()) ||
      Boolean(originAddress.trim()) ||
      Boolean(destinationAddress.trim()) ||
      Boolean(visitNotes.trim()) ||
      totalTransportM3 > 0;
    if (!hasActiveContent) return;

    saveDraftToStorage(DIRECT_VOLUME_DRAFT_KEY, {
      directEstimationId,
      items,
      clientName,
      clientPhone,
      clientEmail,
      originAddress,
      destinationAddress,
      targetDate,
      visitNotes,
      ratePerM3,
    });
  }, [
    selectedAppointmentId,
    directEstimationId,
    items,
    clientName,
    clientPhone,
    clientEmail,
    originAddress,
    destinationAddress,
    targetDate,
    visitNotes,
    ratePerM3,
    totalTransportM3,
  ]);

  const autoSavePayload = useMemo(
    () => ({
      appointmentId: selectedAppointmentId || undefined,
      directEstimationId,
      clientName,
      clientPhone,
      clientEmail,
      originAddress,
      destinationAddress,
      targetDate,
      items,
      totalSurveyedM3: Math.round(totalSurveyedM3 * 10) / 10,
      totalDismantledM3: Math.round(totalDismantledM3 * 10) / 10,
      totalTransportM3,
      estimatedStandardBoxes,
      estimatedBookBoxes,
      estimatedWardrobeBoxes,
      recommendedVehicles: recommendedVehicle,
      recommendedVehicleVolumeM3,
      recommendedMovers,
      recommendedWorkDays,
      estimatedPrice: estimatedTotalPrice,
      notes: visitNotes,
      ratePerM3,
    }),
    [
      selectedAppointmentId,
      directEstimationId,
      clientName,
      clientPhone,
      clientEmail,
      originAddress,
      destinationAddress,
      targetDate,
      items,
      totalSurveyedM3,
      totalDismantledM3,
      totalTransportM3,
      estimatedStandardBoxes,
      estimatedBookBoxes,
      estimatedWardrobeBoxes,
      recommendedVehicle,
      recommendedVehicleVolumeM3,
      recommendedMovers,
      recommendedWorkDays,
      estimatedTotalPrice,
      visitNotes,
      ratePerM3,
    ]
  );

  const canAutoSaveFirestore =
    Boolean(selectedAppointmentId) ||
    clientName.trim().length > 0 ||
    totalTransportM3 > 0;

  const { cancelPending: cancelVolumeAutoSave } = useRealtimeAutoSave({
    enabled: canAutoSaveFirestore,
    data: autoSavePayload,
    resetKey: selectedAppointmentId || directEstimationId,
    delayMs: 600,
    onSave: async (p) => {
      await saveVolumeEstimation({
        id: p.appointmentId ? `est-${p.appointmentId}` : p.directEstimationId,
        appointmentId: p.appointmentId,
        clientName: p.clientName.trim() || 'Client Direct',
        clientEmail: p.clientEmail.trim().toLowerCase(),
        originAddress: p.originAddress,
        destinationAddress: p.destinationAddress,
        targetDate: p.targetDate,
        items: p.items,
        totalSurveyedM3: p.totalSurveyedM3,
        totalDismantledM3: p.totalDismantledM3,
        totalTransportM3: p.totalTransportM3,
        estimatedStandardBoxes: p.estimatedStandardBoxes,
        estimatedBookBoxes: p.estimatedBookBoxes,
        estimatedWardrobeBoxes: p.estimatedWardrobeBoxes,
        recommendedVehicles: p.recommendedVehicles,
        recommendedVehicleVolumeM3: p.recommendedVehicleVolumeM3,
        recommendedMovers: p.recommendedMovers,
        recommendedWorkDays: p.recommendedWorkDays,
        estimatedPrice: p.estimatedPrice,
        notes: p.notes,
      });

      if (p.appointmentId) {
        updateAppointmentVolume(p.appointmentId, p.totalTransportM3, undefined, { silent: true });
      }
    },
  });

  // Save Estimation for Client (manual confirmation button still available)
  const handleSaveEstimation = async () => {
    cancelVolumeAutoSave();
    await saveVolumeEstimation({
      id: selectedAppointmentId ? `est-${selectedAppointmentId}` : directEstimationId,
      appointmentId: selectedAppointmentId || undefined,
      clientName: clientName.trim() || 'Client Direct',
      clientEmail: clientEmail.trim().toLowerCase(),
      originAddress,
      destinationAddress,
      targetDate,
      items,
      totalSurveyedM3: Math.round(totalSurveyedM3 * 10) / 10,
      totalDismantledM3: Math.round(totalDismantledM3 * 10) / 10,
      totalTransportM3,
      estimatedStandardBoxes,
      estimatedBookBoxes,
      estimatedWardrobeBoxes,
      recommendedVehicles: recommendedVehicle,
      recommendedVehicleVolumeM3,
      recommendedMovers,
      recommendedWorkDays,
      estimatedPrice: estimatedTotalPrice,
      notes: visitNotes,
    });

    if (selectedAppointmentId) {
      updateAppointmentVolume(
        selectedAppointmentId,
        totalTransportM3,
        `Visite effectuée. Cubage total retenu : ${totalTransportM3} m³. Notes : ${visitNotes}`
      );
      updateAppointmentStatus(selectedAppointmentId, 'visite');
    } else {
      notify(
        'Estimation enregistrée',
        `Estimation de ${totalTransportM3} m³ sauvegardée dans Firestore pour ${clientName || 'Client Direct'}.`,
        'success'
      );
    }
  };

  // Generate Quote
  const handleGenerateQuote = () => {
    const quoteItems: import('../../types').QuoteItem[] = [
      {
        id: 'qi-' + Date.now() + '-1',
        description: `Prestation transport & manutention volumétrique (${totalTransportM3} m³)`,
        category: 'transport',
        quantity: 1,
        unitPrice: baseCost,
        total: baseCost,
      },
    ];

    if (disassemblyCost > 0) {
      quoteItems.push({
        id: 'qi-' + Date.now() + '-2',
        description: `Démontage et remontage soigné des mobiliers complexes`,
        category: 'demontage',
        quantity: 1,
        unitPrice: disassemblyCost,
        total: disassemblyCost,
      });
    }

    if (packagingCost > 0) {
      quoteItems.push({
        id: 'qi-' + Date.now() + '-3',
        description: `Fourniture emballage pro (${estimatedStandardBoxes} cartons, bulles et adhésifs)`,
        category: 'emballage',
        quantity: 1,
        unitPrice: packagingCost,
        total: packagingCost,
      });
    }

    const subtotal = quoteItems.reduce((acc, q) => acc + q.total, 0);
    const taxRate = 18;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const fuelSurcharge = Math.round(subtotal * 0.05);
    const total = subtotal + taxAmount + fuelSurcharge;

    createQuote({
      appointmentId: selectedAppointmentId || undefined,
      clientName,
      clientEmail: clientEmail || `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@email.com`,
      clientPhone,
      clientAddress: originAddress,
      originAddress,
      destinationAddress,
      serviceType: 'local',
      volumeM3: totalTransportM3,
      items: quoteItems,
      subtotal,
      taxRate,
      taxAmount,
      fuelSurcharge,
      discount: 0,
      total,
      currency: currentCompany.currency,
      status: 'brouillon',
      validityDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      specialTerms: `Calculé automatiquement depuis le tableau volumétrique pour ${clientName}.`,
    });

    setActiveModule('quotes');
  };

  const filteredItems = selectedRoom === 'Tous' ? items : items.filter((it) => it.room === selectedRoom);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 2
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Tableau d’Estimation Volumétrique & Matériel
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculateur instantané m³, gestion personnalisée des pièces et meubles, et sauvegarde par client
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSaveEstimation}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 shadow-md transition"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Enregistrer l’Estimation</span>
          </button>

          <button
            onClick={handleGenerateQuote}
            disabled={totalTransportM3 === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Convertir en Devis Instantané</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION 2-A: Onglet Client & Demande de visite (Liste Déroulante) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <User className="w-4 h-4 text-amber-400" />
            <span>Dossier Client & Demande de Visite Rattachée</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              Sélectionnez une demande de visite pour synchroniser automatiquement les adresses et informations
            </span>
            <button
              type="button"
              onClick={handleResetToNewClient}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0"
              title="Réinitialiser la fiche et remettre le compteur de volume à 0 m³"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Nouveau client (0 m³)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Dropdown for appointments */}
          <div className="md:col-span-1 space-y-1">
            <label className="block text-amber-300 font-semibold text-[11px]">
              Demande de Visite en Cours (Liste Déroulante) :
            </label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => handleSelectAppointment(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">-- Client Direct / Saisie Manuelle --</option>
              {appointments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {apt.code} - {apt.clientName} ({apt.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Client Details Editable Fields */}
          <div className="space-y-1">
            <label className="block text-slate-400 text-[11px]">Nom du Client</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom et prénom..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 text-[11px]">Téléphone & Email</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Téléphone..."
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Email..."
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Addresses & Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800/80">
          <div className="space-y-1">
            <label className="block text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Adresse de Départ (Chargement)
            </label>
            <input
              type="text"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-rose-400 font-semibold text-[11px] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Adresse d’Arrivée (Livraison)
            </label>
            <input
              type="text"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Date Souhaitée de Prestation
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Volume Total Brut</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {totalRawM3.toFixed(1)} <span className="text-xs text-slate-400">m³</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Constaté non démonté</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Volume à Transporter</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {totalTransportM3.toFixed(1)} <span className="text-xs text-slate-400">m³</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Après démontage + foisonnement</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Véhicule Recommandé</div>
          <div className="text-xs font-bold text-white mt-2 flex items-center gap-1.5" title={recommendedVehicle}>
            <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{recommendedVehicle}</span>
          </div>
          <div className="text-[10px] text-cyan-300 font-semibold mt-1">
            {recommendedVehicleVolumeM3 > 0
              ? `Capacité : ${recommendedVehicleVolumeM3} m³ (> ${totalRawM3.toFixed(1)} m³)`
              : 'Aucun volume saisi'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Cartons Estimés</div>
          <div className="text-lg font-bold text-white mt-1">
            {estimatedStandardBoxes + estimatedBookBoxes} <span className="text-xs text-slate-400">unités</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {estimatedStandardBoxes} std + {estimatedBookBoxes} livres + {estimatedWardrobeBoxes} pend.
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 md:col-span-1">
          <div className="text-[11px] text-slate-400 font-medium">Estimation Chiffrée</div>
          <div className="text-xl font-black text-amber-300 mt-1">
            {estimatedTotalPrice.toLocaleString()} <span className="text-xs">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Grille {ratePerM3} {currentCompany.currency}/m³ + options</div>
        </div>
      </div>

      {/* Recommandation Logistique Détaillée (Volume camion, Déménageurs, Jours de travail) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/25 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-cyan-300 font-semibold">Volume du camion recommandé</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {recommendedVehicleVolumeM3} <span className="text-xs text-slate-400 font-semibold">m³</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{recommendedVehicle}</div>
          </div>
          <Truck className="w-7 h-7 text-cyan-400 shrink-0" />
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-amber-300 font-semibold">Nombre de déménageurs nécessaires</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {recommendedMovers}{' '}
              <span className="text-xs text-slate-400 font-semibold">
                {recommendedMovers > 1 ? 'déménageurs' : 'déménageur'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Équipe adaptée au cubage brut</div>
          </div>
          <Users className="w-7 h-7 text-amber-400 shrink-0" />
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-emerald-300 font-semibold">Nombre de jours de travail prévus</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {recommendedWorkDays}{' '}
              <span className="text-xs text-slate-400 font-semibold">
                {recommendedWorkDays > 1 ? 'jours' : 'jour'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Estimation chargement & livraison</div>
          </div>
          <Calendar className="w-7 h-7 text-emerald-400 shrink-0" />
        </div>
      </div>

      {/* Main Furniture Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        {/* Controls Bar & Room Management (SECTION 2-B: Ajouter ou Supprimer une pièce) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          {/* Room filter tabs with delete buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {rooms.map((room) => {
              const isActive = selectedRoom === room;
              const countInRoom = room === 'Tous' ? items.length : items.filter((it) => it.room === room).length;

              return (
                <div key={room} className="flex items-center">
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      if (room !== 'Tous') setCustomItemRoom(room);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{room}</span>
                    <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                      {countInRoom}
                    </span>
                  </button>

                  {/* Allow deleting custom rooms (except Tous and Salon) */}
                  {room !== 'Tous' && room !== 'Salon' && room !== 'Divers' && (
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      title={`Supprimer la pièce "${room}"`}
                      className="ml-0.5 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Button to add a new room */}
            {!isAddingRoom ? (
              <button
                onClick={() => setIsAddingRoom(true)}
                className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-400 text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter une pièce</span>
              </button>
            ) : (
              <form onSubmit={handleAddRoom} className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nom de la pièce (ex: Terrasse)..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Quick tariff slider */}
          <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
            <span className="text-slate-400">Tarif base/m³ :</span>
            <input
              type="number"
              min={30}
              max={300}
              value={ratePerM3}
              onChange={(e) => setRatePerM3(Number(e.target.value))}
              className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-amber-400"
            />
            <span>{currentCompany.currency}</span>
          </div>
        </div>

        {/* SECTION 2-B: Add custom Furniture Item Form */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-2 text-xs">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Ajouter Meuble :
            </span>
            <select
              value={customItemRoom}
              onChange={(e) => setCustomItemRoom(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-medium focus:outline-none"
            >
              {rooms.filter((r) => r !== 'Tous').map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div ref={furnitureDropdownRef} className="relative flex-1 w-full">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Nom du meuble ou objet (choisir dans la liste ou saisir)..."
                value={customItemName}
                onFocus={() => setIsFurnitureDropdownOpen(true)}
                onChange={(e) => {
                  setCustomItemName(e.target.value);
                  setIsFurnitureDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsFurnitureDropdownOpen(false);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-14 py-1.5 text-white focus:outline-none focus:border-amber-500"
              />
              <div className="absolute right-1.5 flex items-center gap-0.5">
                {customItemName && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomItemName('');
                      setIsFurnitureDropdownOpen(true);
                    }}
                    title="Effacer"
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFurnitureDropdownOpen((prev) => !prev)}
                  title="Afficher la liste des meubles disponibles"
                  className="p-1 text-amber-400 hover:text-amber-300 rounded"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isFurnitureDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {isFurnitureDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Meubles & objets disponibles ({filteredFurnitureOptions.length})</span>
                  <span>Saisie libre autorisée</span>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                  {customItemName.trim() && !hasExactFurnitureMatch && (
                    <button
                      type="button"
                      onClick={() => setIsFurnitureDropdownOpen(false)}
                      className="w-full px-3 py-2 text-left bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-between transition"
                    >
                      <span className="font-semibold">
                        + Utiliser nom personnalisé : « {customItemName.trim()} »
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                        Personnalisé
                      </span>
                    </button>
                  )}

                  {filteredFurnitureOptions.map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => handleSelectFurnitureOption(opt)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between gap-2 transition"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{opt.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{opt.room}</span>
                          {opt.requiresDisassembly && <span className="text-amber-400">• Démontable</span>}
                          {opt.isFragile && <span className="text-rose-400">• Fragile</span>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-amber-400 shrink-0 text-[11px]">
                        {opt.defaultM3.toFixed(1)} m³
                      </span>
                    </button>
                  ))}

                  {filteredFurnitureOptions.length === 0 && !customItemName.trim() && (
                    <div className="px-3 py-3 text-center text-slate-500 text-xs">
                      Aucun meuble trouvé. Saisissez un nom personnalisé ci-dessus.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={customItemM3}
                onChange={(e) => setCustomItemM3(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-center font-bold"
              />
              <span className="text-slate-400 text-[11px]">m³</span>
            </div>

            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={customItemDisassembly}
                onChange={(e) => setCustomItemDisassembly(e.target.checked)}
                className="rounded border-slate-700 text-amber-500"
              />
              Démontable ?
            </label>

            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={customItemFragile}
                onChange={(e) => setCustomItemFragile(e.target.checked)}
                className="rounded border-slate-700 text-amber-500"
              />
              Fragile ?
            </label>

            <button
              onClick={addCustomItem}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Items Table with Quantity and Deletion (SECTION 2-B) */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Pièce / Meuble</th>
                <th className="py-2.5 px-2 text-center">Quantité</th>
                <th className="py-2.5 px-2 text-center">m³ Unitaire</th>
                <th className="py-2.5 px-2 text-center">m³ Total Brut</th>
                <th className="py-2.5 px-2 text-center">Démontage ?</th>
                <th className="py-2.5 px-2 text-center">Emballage Pro ?</th>
                <th className="py-2.5 px-2 text-center">Fragile / Lourd</th>
                <th className="py-2.5 px-2 text-right">Supprimer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const totalItemM3 = (item.surveyedM3 || item.defaultM3) * item.quantity;
                const isSelected = item.quantity > 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-800/40 transition ${isSelected ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Home className="w-3 h-3 text-slate-500" />
                        <span>{item.room}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 rounded-lg p-0.5">
                        <button
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                      {item.defaultM3.toFixed(2)} m³
                    </td>

                    <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-400">
                      {totalItemM3.toFixed(2)} m³
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleToggleOption(item.id, 'requiresDisassembly')}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                          item.requiresDisassembly
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}
                      >
                        {item.requiresDisassembly ? 'Oui (-35% vol.)' : 'Non'}
                      </button>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleToggleOption(item.id, 'requiresPackaging')}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                          item.requiresPackaging
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}
                      >
                        {item.requiresPackaging ? 'Sous bulles' : 'Standard'}
                      </button>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.isFragile && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Fragile
                          </span>
                        )}
                        {item.isBulky && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Lourd
                          </span>
                        )}
                        {!item.isFragile && !item.isBulky && <span className="text-slate-600">-</span>}
                      </div>
                    </td>

                    {/* Delete Item (SECTION 2-B) */}
                    <td className="py-2.5 px-2 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        title={`Supprimer définitivement ${item.name}`}
                        className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tableau Récapitulatif — Liste des Meubles Ajoutés */}
        {(() => {
          const activeSummaryItems = items.filter((it) => it.quantity > 0);
          const customSummaryItems = items.filter((it) => addedItemIds.includes(it.id) && it.quantity > 0);
          const displayedSummaryItems =
            summaryFilter === 'custom_only' ? customSummaryItems : activeSummaryItems;
          const totalUnits = displayedSummaryItems.reduce((acc, it) => acc + it.quantity, 0);
          const totalSummaryM3 = displayedSummaryItems.reduce(
            (acc, it) => acc + (it.surveyedM3 || it.defaultM3) * it.quantity,
            0
          );
          const totalSummaryWeight = displayedSummaryItems.reduce(
            (acc, it) => acc + (it.weightKg || 30) * it.quantity,
            0
          );

          return (
            <div className="pt-5 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Tableau Récapitulatif — Liste des Meubles Ajoutés
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeSummaryItems.length} ligne(s) • {totalUnits} unité(s)
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSummaryFilter('all_active')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      summaryFilter === 'all_active'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Inventaire retenu ({activeSummaryItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryFilter('custom_only')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      summaryFilter === 'custom_only'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ajoutés manuellement ({customSummaryItems.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Meuble / Objet</th>
                      <th className="py-2 px-3">Pièce</th>
                      <th className="py-2 px-2 text-center">Qté</th>
                      <th className="py-2 px-2 text-center">m³ Unit.</th>
                      <th className="py-2 px-2 text-center">m³ Total</th>
                      <th className="py-2 px-2 text-center">Poids est.</th>
                      <th className="py-2 px-3">Spécificités</th>
                      <th className="py-2 px-3 text-right">Retirer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedSummaryItems.map((it, idx) => {
                      const isNewlyAdded = addedItemIds.includes(it.id);
                      const lineM3 = (it.surveyedM3 || it.defaultM3) * it.quantity;
                      const lineKg = (it.weightKg || 30) * it.quantity;

                      return (
                        <tr key={it.id} className="hover:bg-slate-900/60 transition">
                          <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{it.name}</span>
                              {isNewlyAdded && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  Ajouté
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-300">{it.room}</td>
                          <td className="py-2 px-2 text-center font-bold text-white">{it.quantity}</td>
                          <td className="py-2 px-2 text-center font-mono text-slate-400">
                            {it.defaultM3.toFixed(2)} m³
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-amber-400">
                            {lineM3.toFixed(2)} m³
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-300">{lineKg} kg</td>
                          <td className="py-2 px-3 text-[10px] text-slate-300">
                            {[
                              it.requiresDisassembly ? 'Démontable' : null,
                              it.requiresPackaging ? 'Emballage pro' : null,
                              it.isFragile ? 'Fragile' : null,
                            ]
                              .filter(Boolean)
                              .join(' • ') || 'Standard'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(it.id)}
                              title={`Retirer ${it.name}`}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {displayedSummaryItems.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-4 text-center text-slate-500 text-xs">
                          {summaryFilter === 'custom_only'
                            ? 'Aucun meuble personnalisé ajouté pour le moment. Utilisez la barre « Ajouter Meuble » ci-dessus.'
                            : 'Aucun meuble sélectionné (quantité > 0).'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {displayedSummaryItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-900 border-t border-slate-700 font-bold text-xs">
                        <td colSpan={3} className="py-2.5 px-3 text-slate-300">
                          TOTAL RÉCAPITULATIF
                        </td>
                        <td className="py-2.5 px-2 text-center text-white">{totalUnits}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">—</td>
                        <td className="py-2.5 px-2 text-center font-mono text-amber-400">
                          {totalSummaryM3.toFixed(2)} m³
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-emerald-400">
                          {totalSummaryWeight} kg
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-right text-[11px] text-emerald-400">
                          Transport (+foisonnement) : {totalTransportM3.toFixed(1)} m³
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })()}

        {/* SECTION 2-C: Bouton Enregistrer en fin de page pour sauvegarder la visite pour le client */}
        <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Client actuel :</span> {clientName || 'Client Direct'} •{' '}
            <span className="text-amber-400 font-bold font-mono">{totalRawM3.toFixed(1)} m³</span> brut •{' '}
            <span className="text-cyan-400 font-bold font-mono">{recommendedVehicleVolumeM3} m³</span> camion •{' '}
            <span className="text-white font-bold">{recommendedMovers}</span> déménageur(s) •{' '}
            <span className="text-emerald-400 font-bold">{recommendedWorkDays}</span> jour(s)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveEstimation}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les infos de la visite d’estimation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Room Deletion */}
      {roomPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Supprimer la pièce « {roomPendingDelete} » ?</h3>
            <p className="text-xs text-slate-400">
              Tous les meubles rattachés à cette pièce seront retirés de l’inventaire courant.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoomPendingDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteRoom}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
