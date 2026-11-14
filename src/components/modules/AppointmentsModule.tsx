import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  FileText,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building,
  Upload,
  Eye,
  X,
  Edit,
  Save,
  Trash2,
  CalendarPlus,
  Home,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Appointment,
  ServiceType,
  ServiceTransportMode,
  AppointmentStatus,
  AdditionalVisit,
  PropertyType,
} from '../../types';
import {
  useRealtimeAutoSave,
  loadDraftFromStorage,
  saveDraftToStorage,
  clearDraftFromStorage,
} from '../../hooks/useAutoSave';

const NEW_APT_DRAFT_KEY = 'transmove_draft_appointment_new';

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'export', label: 'Export' },
  { value: 'import', label: 'Import' },
  { value: 'transport', label: 'Transport' },
  { value: 'storage', label: 'Garde-meuble' },
];

const SERVICE_TRANSPORT_MODE_OPTIONS: { value: ServiceTransportMode; label: string }[] = [
  { value: 'aerien', label: 'Aérien' },
  { value: 'maritime', label: 'Maritime' },
  { value: 'terrestre', label: 'Terrestre' },
];

const requiresTransportMode = (serviceType?: ServiceType | '' | null): boolean =>
  serviceType === 'export' || serviceType === 'import';

const isStandardServiceType = (serviceType?: ServiceType | null): boolean =>
  SERVICE_TYPE_OPTIONS.some((opt) => opt.value === serviceType);

const getServiceTypeLabel = (serviceType?: ServiceType | null): string => {
  const matched = SERVICE_TYPE_OPTIONS.find((opt) => opt.value === serviceType);
  if (matched) return matched.label;
  if (serviceType === 'national') return 'National';
  if (serviceType === 'international') return 'International';
  return serviceType || 'Non renseigné';
};

const getServiceTransportModeLabel = (mode?: ServiceTransportMode | '' | null): string => {
  const matched = SERVICE_TRANSPORT_MODE_OPTIONS.find((opt) => opt.value === mode);
  return matched ? matched.label : '';
};

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison' },
  { value: 'immeuble', label: 'Immeuble' },
];

const FLOOR_LEVEL_OPTIONS = ['RDC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Autre'] as const;
const HOUSE_LEVELS_OPTIONS = ['R+0 (plain-pied)', 'R+1', 'R+2', 'R+3', 'R+4', 'R+5', 'Autre'] as const;

const getPropertyTypeLabel = (type?: PropertyType | null): string => {
  if (type === 'appartement') return 'Appartement';
  if (type === 'maison') return 'Maison';
  if (type === 'immeuble') return 'Immeuble';
  return 'Non renseigné';
};

const formatPropertyDetailValue = (
  apt: Pick<Appointment, 'propertyType' | 'floorLevel' | 'floorLevelOther' | 'levelsCount' | 'levelsCountOther'>
): string | null => {
  if (apt.propertyType === 'appartement' || apt.propertyType === 'immeuble') {
    if (!apt.floorLevel) return 'Non renseigné';
    if (apt.floorLevel === 'Autre') {
      return apt.floorLevelOther?.trim() ? `Autre (${apt.floorLevelOther.trim()})` : 'Autre';
    }
    return apt.floorLevel === 'RDC' ? 'RDC' : `Étage ${apt.floorLevel}`;
  }
  if (apt.propertyType === 'maison') {
    if (!apt.levelsCount) return 'Non renseigné';
    if (apt.levelsCount === 'Autre') {
      return apt.levelsCountOther?.trim() ? `Autre (${apt.levelsCountOther.trim()})` : 'Autre';
    }
    return apt.levelsCount;
  }
  return null;
};

const isPropertyConfigValid = (
  propertyType?: PropertyType | '' | null,
  floorLevel?: string | null,
  floorLevelOther?: string | null,
  levelsCount?: string | null,
  levelsCountOther?: string | null,
  requirePropertyType = true
): boolean => {
  if (!propertyType) return !requirePropertyType;
  if (propertyType === 'appartement' || propertyType === 'immeuble') {
    if (!floorLevel?.trim()) return false;
    if (floorLevel === 'Autre' && !floorLevelOther?.trim()) return false;
    return true;
  }
  if (propertyType === 'maison') {
    if (!levelsCount?.trim()) return false;
    if (levelsCount === 'Autre' && !levelsCountOther?.trim()) return false;
    return true;
  }
  return true;
};

const parseNumericFloor = (floorLevel?: string | null, fallback?: number): number | undefined => {
  if (!floorLevel) return fallback;
  if (floorLevel === 'RDC') return 0;
  const n = Number(floorLevel);
  return Number.isFinite(n) ? n : fallback;
};

interface PropertyPointFieldsValue {
  address: string;
  elevator: boolean;
  propertyType: PropertyType | '';
  floorLevel: string;
  floorLevelOther: string;
  levelsCount: string;
  levelsCountOther: string;
}

interface PropertyPointSectionProps {
  title: string;
  addressPlaceholder: string;
  accentClass: string;
  borderClass: string;
  value: PropertyPointFieldsValue;
  onChange: (next: PropertyPointFieldsValue) => void;
}

const PropertyPointSection: React.FC<PropertyPointSectionProps> = ({
  title,
  addressPlaceholder,
  accentClass,
  borderClass,
  value,
  onChange,
}) => {
  const handlePropertyTypeChange = (nextType: PropertyType | '') => {
    if (nextType === 'appartement' || nextType === 'immeuble') {
      onChange({
        ...value,
        propertyType: nextType,
        levelsCount: '',
        levelsCountOther: '',
      });
    } else if (nextType === 'maison') {
      onChange({
        ...value,
        propertyType: 'maison',
        floorLevel: '',
        floorLevelOther: '',
      });
    } else {
      onChange({
        ...value,
        propertyType: '',
        floorLevel: '',
        floorLevelOther: '',
        levelsCount: '',
        levelsCountOther: '',
      });
    }
  };

  return (
    <div className={`p-3.5 rounded-xl bg-slate-950/70 border ${borderClass} space-y-3`}>
      <label className={`block font-semibold text-xs ${accentClass}`}>{title}</label>

      <input
        type="text"
        required
        placeholder={addressPlaceholder}
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] text-slate-300 font-semibold mb-1">Type de bien *</label>
          <select
            required
            value={value.propertyType}
            onChange={(e) => handlePropertyTypeChange(e.target.value as PropertyType | '')}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="">-- Sélectionner --</option>
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {(value.propertyType === 'appartement' || value.propertyType === 'immeuble') && (
          <div>
            <label className="block text-[11px] text-slate-300 font-semibold mb-1">Niveau / étage *</label>
            <select
              required
              value={value.floorLevel}
              onChange={(e) => {
                const lvl = e.target.value;
                onChange({
                  ...value,
                  floorLevel: lvl,
                  floorLevelOther: lvl === 'Autre' ? value.floorLevelOther : '',
                });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">-- Sélectionner --</option>
              {FLOOR_LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        )}

        {value.propertyType === 'maison' && (
          <div>
            <label className="block text-[11px] text-slate-300 font-semibold mb-1">Nombre de niveaux (R+X) *</label>
            <select
              required
              value={value.levelsCount}
              onChange={(e) => {
                const lvl = e.target.value;
                onChange({
                  ...value,
                  levelsCount: lvl,
                  levelsCountOther: lvl === 'Autre' ? value.levelsCountOther : '',
                });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">-- Sélectionner --</option>
              {HOUSE_LEVELS_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {(value.propertyType === 'appartement' || value.propertyType === 'immeuble') && value.floorLevel === 'Autre' && (
        <div>
          <label className="block text-[11px] text-slate-300 font-semibold mb-1">Préciser le niveau / étage *</label>
          <input
            type="text"
            required
            placeholder="ex: 12e étage, Mezzanine, Sous-sol..."
            value={value.floorLevelOther}
            onChange={(e) => onChange({ ...value, floorLevelOther: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}

      {value.propertyType === 'maison' && value.levelsCount === 'Autre' && (
        <div>
          <label className="block text-[11px] text-slate-300 font-semibold mb-1">Préciser le nombre de niveaux *</label>
          <input
            type="text"
            required
            placeholder="ex: R+6, Duplex avec sous-sol..."
            value={value.levelsCountOther}
            onChange={(e) => onChange({ ...value, levelsCountOther: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}

      {/* Onglet / Sélecteur Ascenseur */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-300 font-semibold">Ascenseur</span>
        <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
          <button
            type="button"
            onClick={() => onChange({ ...value, elevator: false })}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
              !value.elevator ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Non
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, elevator: true })}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
              value.elevator ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Oui
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppointmentsModule: React.FC = () => {
  const { appointments, createAppointment, updateAppointment, updateAppointmentStatus, setActiveModule, notify } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editDraft, setEditDraft] = useState<Appointment | null>(null);
  const [editConstraintsText, setEditConstraintsText] = useState('');

  // Supplementary RDV state inside Detail Modal
  const [isAddingExtraRdv, setIsAddingExtraRdv] = useState(false);
  const [extraRdvTitle, setExtraRdvTitle] = useState('Visite complémentaire / Contre-visite');
  const [extraRdvDate, setExtraRdvDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [extraRdvTime, setExtraRdvTime] = useState('10:00');
  const [extraRdvNotes, setExtraRdvNotes] = useState('');

  // Form state (auto-restored from real-time local draft)
  const initialDraft = useMemo(
    () =>
      loadDraftFromStorage(NEW_APT_DRAFT_KEY, {
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        orderingCustomer: '',
        originAddress: '',
        originFloor: 0,
        originElevator: false,
        originPropertyType: '' as PropertyType | '',
        originFloorLevel: '',
        originFloorLevelOther: '',
        originLevelsCount: '',
        originLevelsCountOther: '',
        destinationAddress: '',
        destinationFloor: 0,
        destinationElevator: false,
        destinationPropertyType: '' as PropertyType | '',
        destinationFloorLevel: '',
        destinationFloorLevelOther: '',
        destinationLevelsCount: '',
        destinationLevelsCountOther: '',
        targetDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        serviceType: 'local' as ServiceType,
        serviceTransportMode: '' as ServiceTransportMode | '',
        estimatedTransitDays: '' as number | '',
        specialConstraintsText: '',
        assignedCommercial: 'Sophie Benjelloun',
        notes: '',
      }),
    []
  );
  const [clientName, setClientName] = useState(initialDraft.clientName);
  const [clientEmail, setClientEmail] = useState(initialDraft.clientEmail);
  const [clientPhone, setClientPhone] = useState(initialDraft.clientPhone);
  const [orderingCustomer, setOrderingCustomer] = useState(initialDraft.orderingCustomer);
  const [originAddress, setOriginAddress] = useState(initialDraft.originAddress);
  const [originFloor, setOriginFloor] = useState<number>(initialDraft.originFloor);
  const [originElevator, setOriginElevator] = useState(initialDraft.originElevator);
  const [originPropertyType, setOriginPropertyType] = useState<PropertyType | ''>(initialDraft.originPropertyType || '');
  const [originFloorLevel, setOriginFloorLevel] = useState<string>(initialDraft.originFloorLevel || '');
  const [originFloorLevelOther, setOriginFloorLevelOther] = useState<string>(initialDraft.originFloorLevelOther || '');
  const [originLevelsCount, setOriginLevelsCount] = useState<string>(initialDraft.originLevelsCount || '');
  const [originLevelsCountOther, setOriginLevelsCountOther] = useState<string>(initialDraft.originLevelsCountOther || '');
  const [destinationAddress, setDestinationAddress] = useState(initialDraft.destinationAddress);
  const [destinationFloor, setDestinationFloor] = useState<number>(initialDraft.destinationFloor);
  const [destinationElevator, setDestinationElevator] = useState(initialDraft.destinationElevator);
  const [destinationPropertyType, setDestinationPropertyType] = useState<PropertyType | ''>(
    initialDraft.destinationPropertyType || ''
  );
  const [destinationFloorLevel, setDestinationFloorLevel] = useState<string>(initialDraft.destinationFloorLevel || '');
  const [destinationFloorLevelOther, setDestinationFloorLevelOther] = useState<string>(
    initialDraft.destinationFloorLevelOther || ''
  );
  const [destinationLevelsCount, setDestinationLevelsCount] = useState<string>(initialDraft.destinationLevelsCount || '');
  const [destinationLevelsCountOther, setDestinationLevelsCountOther] = useState<string>(
    initialDraft.destinationLevelsCountOther || ''
  );
  const [targetDate, setTargetDate] = useState(initialDraft.targetDate);
  const [serviceType, setServiceType] = useState<ServiceType>(initialDraft.serviceType);
  const [serviceTransportMode, setServiceTransportMode] = useState<ServiceTransportMode | ''>(
    initialDraft.serviceTransportMode || ''
  );
  const [estimatedTransitDays, setEstimatedTransitDays] = useState<number | ''>(initialDraft.estimatedTransitDays);
  const [specialConstraintsText, setSpecialConstraintsText] = useState(initialDraft.specialConstraintsText);
  const [assignedCommercial, setAssignedCommercial] = useState(initialDraft.assignedCommercial);
  const [notes, setNotes] = useState(initialDraft.notes);

  useEffect(() => {
    saveDraftToStorage(NEW_APT_DRAFT_KEY, {
      clientName,
      clientEmail,
      clientPhone,
      orderingCustomer,
      originAddress,
      originFloor,
      originElevator,
      originPropertyType,
      originFloorLevel,
      originFloorLevelOther,
      originLevelsCount,
      originLevelsCountOther,
      destinationAddress,
      destinationFloor,
      destinationElevator,
      destinationPropertyType,
      destinationFloorLevel,
      destinationFloorLevelOther,
      destinationLevelsCount,
      destinationLevelsCountOther,
      targetDate,
      serviceType,
      serviceTransportMode,
      estimatedTransitDays,
      specialConstraintsText,
      assignedCommercial,
      notes,
    });
  }, [
    clientName,
    clientEmail,
    clientPhone,
    orderingCustomer,
    originAddress,
    originFloor,
    originElevator,
    originPropertyType,
    originFloorLevel,
    originFloorLevelOther,
    originLevelsCount,
    originLevelsCountOther,
    destinationAddress,
    destinationFloor,
    destinationElevator,
    destinationPropertyType,
    destinationFloorLevel,
    destinationFloorLevelOther,
    destinationLevelsCount,
    destinationLevelsCountOther,
    targetDate,
    serviceType,
    serviceTransportMode,
    estimatedTransitDays,
    specialConstraintsText,
    assignedCommercial,
    notes,
  ]);

  const editAutoSavePayload = useMemo(
    () => (editDraft ? { editDraft, editConstraintsText } : null),
    [editDraft, editConstraintsText]
  );

  const { cancelPending: cancelEditAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(isEditingDetail && editDraft),
    data: editAutoSavePayload,
    resetKey: editDraft?.id || 'none',
    delayMs: 600,
    onSave: (payload) => {
      if (!payload?.editDraft) return;
      const d = payload.editDraft;
      if (
        !d.clientName.trim() ||
        !d.clientPhone.trim() ||
        !d.originAddress.trim() ||
        !d.destinationAddress.trim() ||
        (requiresTransportMode(d.serviceType) && !d.serviceTransportMode) ||
        !isPropertyConfigValid(
          d.originPropertyType,
          d.originFloorLevel,
          d.originFloorLevelOther,
          d.originLevelsCount,
          d.originLevelsCountOther,
          false
        ) ||
        !isPropertyConfigValid(
          d.destinationPropertyType,
          d.destinationFloorLevel,
          d.destinationFloorLevelOther,
          d.destinationLevelsCount,
          d.destinationLevelsCountOther,
          false
        )
      ) {
        return;
      }
      const constraints = payload.editConstraintsText
        ? payload.editConstraintsText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const isOriginFloorType = d.originPropertyType === 'appartement' || d.originPropertyType === 'immeuble';
      const isOriginHouseType = d.originPropertyType === 'maison';
      const isDestFloorType = d.destinationPropertyType === 'appartement' || d.destinationPropertyType === 'immeuble';
      const isDestHouseType = d.destinationPropertyType === 'maison';

      const updated: Appointment = {
        ...d,
        serviceTransportMode: requiresTransportMode(d.serviceType) ? d.serviceTransportMode || null : null,
        originFloor: isOriginFloorType ? parseNumericFloor(d.originFloorLevel, d.originFloor) : 0,
        originFloorLevel: isOriginFloorType ? d.originFloorLevel || null : null,
        originFloorLevelOther:
          isOriginFloorType && d.originFloorLevel === 'Autre'
            ? (d.originFloorLevelOther || '').trim() || null
            : null,
        originLevelsCount: isOriginHouseType ? d.originLevelsCount || null : null,
        originLevelsCountOther:
          isOriginHouseType && d.originLevelsCount === 'Autre'
            ? (d.originLevelsCountOther || '').trim() || null
            : null,
        destinationFloor: isDestFloorType ? parseNumericFloor(d.destinationFloorLevel, d.destinationFloor) : 0,
        destinationFloorLevel: isDestFloorType ? d.destinationFloorLevel || null : null,
        destinationFloorLevelOther:
          isDestFloorType && d.destinationFloorLevel === 'Autre'
            ? (d.destinationFloorLevelOther || '').trim() || null
            : null,
        destinationLevelsCount: isDestHouseType ? d.destinationLevelsCount || null : null,
        destinationLevelsCountOther:
          isDestHouseType && d.destinationLevelsCount === 'Autre'
            ? (d.destinationLevelsCountOther || '').trim() || null
            : null,
        specialConstraints: constraints,
      };
      updateAppointment(updated, { silent: true });
      setSelectedAppointment(updated);
    },
  });

  const statusColors: Record<AppointmentStatus, { label: string; color: string }> = {
    nouveau: { label: 'Nouveau', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    contacte: { label: 'Contacté', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    visite_planifiee: { label: 'Visite planifiée', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    visite: { label: 'Visité', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    devis_envoye: { label: 'Devis envoyé', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    gagne: { label: 'Gagné', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    perdu: { label: 'Perdu', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.originAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const validatePointFields = (
    pointLabel: string,
    pType?: PropertyType | '' | null,
    fLevel?: string | null,
    fLevelOther?: string | null,
    lCount?: string | null,
    lCountOther?: string | null
  ): boolean => {
    if (!pType) {
      notify(
        `Type de bien requis (${pointLabel})`,
        `Veuillez sélectionner le type de bien pour le point ${pointLabel.toLowerCase()}.`,
        'warning'
      );
      return false;
    }
    if ((pType === 'appartement' || pType === 'immeuble') && !fLevel) {
      notify(
        `Champ obligatoire (${pointLabel})`,
        `Veuillez renseigner le champ « Niveau / étage » pour le point ${pointLabel.toLowerCase()}.`,
        'warning'
      );
      return false;
    }
    if ((pType === 'appartement' || pType === 'immeuble') && fLevel === 'Autre' && !fLevelOther?.trim()) {
      notify(
        `Précision requise (${pointLabel})`,
        `Veuillez préciser le niveau / étage (« Autre ») pour le point ${pointLabel.toLowerCase()}.`,
        'warning'
      );
      return false;
    }
    if (pType === 'maison' && !lCount) {
      notify(
        `Champ obligatoire (${pointLabel})`,
        `Veuillez renseigner le champ « Nombre de niveaux (R+X) » pour le point ${pointLabel.toLowerCase()}.`,
        'warning'
      );
      return false;
    }
    if (pType === 'maison' && lCount === 'Autre' && !lCountOther?.trim()) {
      notify(
        `Précision requise (${pointLabel})`,
        `Veuillez préciser le nombre de niveaux (« Autre ») pour le point ${pointLabel.toLowerCase()}.`,
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !originAddress || !destinationAddress) {
      notify('Champs requis', 'Veuillez remplir tous les champs obligatoires.', 'warning');
      return;
    }

    if (
      !validatePointFields(
        'Départ',
        originPropertyType,
        originFloorLevel,
        originFloorLevelOther,
        originLevelsCount,
        originLevelsCountOther
      ) ||
      !validatePointFields(
        'Destination',
        destinationPropertyType,
        destinationFloorLevel,
        destinationFloorLevelOther,
        destinationLevelsCount,
        destinationLevelsCountOther
      )
    ) {
      return;
    }

    if (requiresTransportMode(serviceType) && !serviceTransportMode) {
      notify(
        'Mode de transport requis',
        'Veuillez sélectionner le mode de transport (Aérien, Maritime ou Terrestre) pour une prestation Export ou Import.',
        'warning'
      );
      return;
    }

    const constraints = specialConstraintsText
      ? specialConstraintsText.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const isOriginFloorType = originPropertyType === 'appartement' || originPropertyType === 'immeuble';
    const isOriginHouseType = originPropertyType === 'maison';
    const isDestFloorType = destinationPropertyType === 'appartement' || destinationPropertyType === 'immeuble';
    const isDestHouseType = destinationPropertyType === 'maison';

    createAppointment({
      clientName,
      clientEmail: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      clientPhone,
      orderingCustomer: orderingCustomer || undefined,
      originAddress,
      originFloor: isOriginFloorType ? parseNumericFloor(originFloorLevel, originFloor) ?? 0 : 0,
      originElevator,
      originPropertyType: originPropertyType || null,
      originFloorLevel: isOriginFloorType ? originFloorLevel : null,
      originFloorLevelOther: isOriginFloorType && originFloorLevel === 'Autre' ? originFloorLevelOther.trim() : null,
      originLevelsCount: isOriginHouseType ? originLevelsCount : null,
      originLevelsCountOther: isOriginHouseType && originLevelsCount === 'Autre' ? originLevelsCountOther.trim() : null,
      destinationAddress,
      destinationFloor: isDestFloorType ? parseNumericFloor(destinationFloorLevel, destinationFloor) ?? 0 : 0,
      destinationElevator,
      destinationPropertyType: destinationPropertyType || null,
      destinationFloorLevel: isDestFloorType ? destinationFloorLevel : null,
      destinationFloorLevelOther:
        isDestFloorType && destinationFloorLevel === 'Autre' ? destinationFloorLevelOther.trim() : null,
      destinationLevelsCount: isDestHouseType ? destinationLevelsCount : null,
      destinationLevelsCountOther:
        isDestHouseType && destinationLevelsCount === 'Autre' ? destinationLevelsCountOther.trim() : null,
      targetDate,
      serviceType,
      serviceTransportMode: requiresTransportMode(serviceType) ? (serviceTransportMode as ServiceTransportMode) : null,
      estimatedTransitDays: estimatedTransitDays !== '' ? Number(estimatedTransitDays) : undefined,
      specialConstraints: constraints,
      assignedCommercialId: 'usr-com-1',
      assignedCommercialName: assignedCommercial,
      status: 'nouveau',
      notes,
      photosCount: 0,
      estimatedVolumeM3: 0,
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    clearDraftFromStorage(NEW_APT_DRAFT_KEY);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setOrderingCustomer('');
    setOriginAddress('');
    setOriginFloor(0);
    setOriginElevator(false);
    setOriginPropertyType('');
    setOriginFloorLevel('');
    setOriginFloorLevelOther('');
    setOriginLevelsCount('');
    setOriginLevelsCountOther('');
    setDestinationAddress('');
    setDestinationFloor(0);
    setDestinationElevator(false);
    setDestinationPropertyType('');
    setDestinationFloorLevel('');
    setDestinationFloorLevelOther('');
    setDestinationLevelsCount('');
    setDestinationLevelsCountOther('');
    setServiceType('local');
    setServiceTransportMode('');
    setEstimatedTransitDays('');
    setSpecialConstraintsText('');
    setNotes('');
  };

  const handleOpenDetail = (apt: Appointment) => {
    cancelEditAutoSave();
    setSelectedAppointment(apt);
    setIsEditingDetail(false);
    setEditDraft(null);
    setIsAddingExtraRdv(false);
  };

  const handleStartEditDetail = (apt: Appointment) => {
    const cloned: Appointment = JSON.parse(JSON.stringify(apt));
    // Backward compatibility: if legacy single-point propertyType exists without originPropertyType
    if (!cloned.originPropertyType && cloned.propertyType) {
      cloned.originPropertyType = cloned.propertyType;
      cloned.originFloorLevel = cloned.floorLevel || null;
      cloned.originFloorLevelOther = cloned.floorLevelOther || null;
      cloned.originLevelsCount = cloned.levelsCount || null;
      cloned.originLevelsCountOther = cloned.levelsCountOther || null;
    }
    setEditDraft(cloned);
    setEditConstraintsText((apt.specialConstraints || []).join(', '));
    setIsEditingDetail(true);
  };

  const handleSaveEditDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft) return;
    if (
      !validatePointFields(
        'Départ',
        editDraft.originPropertyType,
        editDraft.originFloorLevel,
        editDraft.originFloorLevelOther,
        editDraft.originLevelsCount,
        editDraft.originLevelsCountOther
      ) ||
      !validatePointFields(
        'Destination',
        editDraft.destinationPropertyType,
        editDraft.destinationFloorLevel,
        editDraft.destinationFloorLevelOther,
        editDraft.destinationLevelsCount,
        editDraft.destinationLevelsCountOther
      )
    ) {
      return;
    }

    if (requiresTransportMode(editDraft.serviceType) && !editDraft.serviceTransportMode) {
      notify(
        'Mode de transport requis',
        'Veuillez sélectionner le mode de transport (Aérien, Maritime ou Terrestre) pour une prestation Export ou Import.',
        'warning'
      );
      return;
    }

    cancelEditAutoSave();
    const constraints = editConstraintsText
      ? editConstraintsText.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const isOriginFloorType = editDraft.originPropertyType === 'appartement' || editDraft.originPropertyType === 'immeuble';
    const isOriginHouseType = editDraft.originPropertyType === 'maison';
    const isDestFloorType =
      editDraft.destinationPropertyType === 'appartement' || editDraft.destinationPropertyType === 'immeuble';
    const isDestHouseType = editDraft.destinationPropertyType === 'maison';

    const updated: Appointment = {
      ...editDraft,
      serviceTransportMode: requiresTransportMode(editDraft.serviceType) ? editDraft.serviceTransportMode || null : null,
      originFloor: isOriginFloorType ? parseNumericFloor(editDraft.originFloorLevel, editDraft.originFloor) : 0,
      originFloorLevel: isOriginFloorType ? editDraft.originFloorLevel || null : null,
      originFloorLevelOther:
        isOriginFloorType && editDraft.originFloorLevel === 'Autre'
          ? (editDraft.originFloorLevelOther || '').trim() || null
          : null,
      originLevelsCount: isOriginHouseType ? editDraft.originLevelsCount || null : null,
      originLevelsCountOther:
        isOriginHouseType && editDraft.originLevelsCount === 'Autre'
          ? (editDraft.originLevelsCountOther || '').trim() || null
          : null,
      destinationFloor: isDestFloorType
        ? parseNumericFloor(editDraft.destinationFloorLevel, editDraft.destinationFloor)
        : 0,
      destinationFloorLevel: isDestFloorType ? editDraft.destinationFloorLevel || null : null,
      destinationFloorLevelOther:
        isDestFloorType && editDraft.destinationFloorLevel === 'Autre'
          ? (editDraft.destinationFloorLevelOther || '').trim() || null
          : null,
      destinationLevelsCount: isDestHouseType ? editDraft.destinationLevelsCount || null : null,
      destinationLevelsCountOther:
        isDestHouseType && editDraft.destinationLevelsCount === 'Autre'
          ? (editDraft.destinationLevelsCountOther || '').trim() || null
          : null,
      specialConstraints: constraints,
    };
    updateAppointment(updated);
    setSelectedAppointment(updated);
    setIsEditingDetail(false);
    setEditDraft(null);
  };

  const handleAddSupplementaryVisit = (apt: Appointment, e: React.FormEvent) => {
    e.preventDefault();
    if (!extraRdvTitle.trim() || !extraRdvDate) return;
    const newVisit: AdditionalVisit = {
      id: 'rdv-sup-' + Date.now(),
      title: extraRdvTitle.trim(),
      date: extraRdvDate,
      time: extraRdvTime || undefined,
      notes: extraRdvNotes.trim() || undefined,
      status: 'planifie',
    };
    const updated: Appointment = {
      ...apt,
      additionalVisits: [...(apt.additionalVisits || []), newVisit],
    };
    updateAppointment(updated);
    setSelectedAppointment(updated);
    setExtraRdvTitle('Visite complémentaire / Contre-visite');
    setExtraRdvNotes('');
    setIsAddingExtraRdv(false);
    notify('RDV supplémentaire ajouté', `${newVisit.title} planifié le ${newVisit.date}.`, 'success');
  };

  const handleToggleSupplementaryVisitStatus = (apt: Appointment, visitId: string) => {
    const updatedVisits = (apt.additionalVisits || []).map((v) => {
      if (v.id !== visitId) return v;
      const nextStatus: AdditionalVisit['status'] =
        v.status === 'planifie' ? 'effectue' : v.status === 'effectue' ? 'annule' : 'planifie';
      return { ...v, status: nextStatus };
    });
    const updated = { ...apt, additionalVisits: updatedVisits };
    updateAppointment(updated);
    setSelectedAppointment(updated);
  };

  const handleDeleteSupplementaryVisit = (apt: Appointment, visitId: string) => {
    const updatedVisits = (apt.additionalVisits || []).filter((v) => v.id !== visitId);
    const updated = { ...apt, additionalVisits: updatedVisits };
    updateAppointment(updated);
    setSelectedAppointment(updated);
  };

  const handleDuplicateToNewRdv = (apt: Appointment) => {
    setClientName(apt.clientName);
    setClientEmail(apt.clientEmail);
    setClientPhone(apt.clientPhone);
    setOrderingCustomer(apt.orderingCustomer || '');
    setOriginAddress(apt.originAddress);
    setOriginFloor(apt.originFloor ?? 0);
    setOriginElevator(apt.originElevator);
    setOriginPropertyType(apt.originPropertyType || apt.propertyType || '');
    setOriginFloorLevel(apt.originFloorLevel || apt.floorLevel || '');
    setOriginFloorLevelOther(apt.originFloorLevelOther || apt.floorLevelOther || '');
    setOriginLevelsCount(apt.originLevelsCount || apt.levelsCount || '');
    setOriginLevelsCountOther(apt.originLevelsCountOther || apt.levelsCountOther || '');
    setDestinationAddress(apt.destinationAddress);
    setDestinationFloor(apt.destinationFloor ?? 0);
    setDestinationElevator(apt.destinationElevator);
    setDestinationPropertyType(apt.destinationPropertyType || '');
    setDestinationFloorLevel(apt.destinationFloorLevel || '');
    setDestinationFloorLevelOther(apt.destinationFloorLevelOther || '');
    setDestinationLevelsCount(apt.destinationLevelsCount || '');
    setDestinationLevelsCountOther(apt.destinationLevelsCountOther || '');
    setServiceType(apt.serviceType);
    setServiceTransportMode(requiresTransportMode(apt.serviceType) ? apt.serviceTransportMode || '' : '');
    setAssignedCommercial(apt.assignedCommercialName);
    setNotes(`RDV supplémentaire rattaché au dossier ${apt.code}.`);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 1
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Prise de Rendez-vous & Visites d’Estimation
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formulaire public et interne, attribution commerciale automatique et suivi du cycle de prospection
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Demande de Visite</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par client, code dossier, adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">Tous les statuts ({appointments.length})</option>
            {Object.entries(statusColors).map(([statusKey, { label }]) => (
              <option key={statusKey} value={statusKey}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Appointments - Minimal card with Détail button */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAppointments.map((apt) => {
          const statusInfo = statusColors[apt.status] || { label: apt.status, color: 'bg-slate-800 text-slate-300' };

          return (
            <div
              key={apt.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">{apt.code}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{apt.clientName}</h3>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(apt)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 font-bold text-xs border border-slate-700 hover:border-amber-400 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Détail</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal for Selected Appointment */}
      {(() => {
        const activeDetailApt = selectedAppointment
          ? appointments.find((a) => a.id === selectedAppointment.id) || selectedAppointment
          : null;
        if (!activeDetailApt) return null;
        const detailStatusInfo = statusColors[activeDetailApt.status] || {
          label: activeDetailApt.status,
          color: 'bg-slate-800 text-slate-300',
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
              <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    {activeDetailApt.code}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">{activeDetailApt.clientName}</h2>
                    <span className="text-[11px] text-slate-400">Fiche Client & Détails du Rendez-vous</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditingDetail && (
                    <button
                      type="button"
                      onClick={() => handleStartEditDetail(activeDetailApt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold border border-amber-500/40 transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Modifier la fiche</span>
                    </button>
                  )}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${detailStatusInfo.color}`}>
                    {detailStatusInfo.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAppointment(null);
                      setIsEditingDetail(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isEditingDetail && editDraft ? (
                <form onSubmit={handleSaveEditDetail} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nom et Prénom du client *</label>
                      <input
                        type="text"
                        required
                        value={editDraft.clientName}
                        onChange={(e) => setEditDraft({ ...editDraft, clientName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Donneur d’ordre</label>
                      <input
                        type="text"
                        value={editDraft.orderingCustomer || ''}
                        onChange={(e) => setEditDraft({ ...editDraft, orderingCustomer: e.target.value || undefined })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Téléphone *</label>
                      <input
                        type="text"
                        required
                        value={editDraft.clientPhone}
                        onChange={(e) => setEditDraft({ ...editDraft, clientPhone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        value={editDraft.clientEmail}
                        onChange={(e) => setEditDraft({ ...editDraft, clientEmail: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <PropertyPointSection
                      title="Point de départ *"
                      addressPlaceholder="Adresse complète de départ..."
                      accentClass="text-emerald-400"
                      borderClass="border-emerald-500/25"
                      value={{
                        address: editDraft.originAddress,
                        elevator: editDraft.originElevator,
                        propertyType: editDraft.originPropertyType || '',
                        floorLevel: editDraft.originFloorLevel || '',
                        floorLevelOther: editDraft.originFloorLevelOther || '',
                        levelsCount: editDraft.originLevelsCount || '',
                        levelsCountOther: editDraft.originLevelsCountOther || '',
                      }}
                      onChange={(next) =>
                        setEditDraft({
                          ...editDraft,
                          originAddress: next.address,
                          originElevator: next.elevator,
                          originPropertyType: next.propertyType || null,
                          originFloorLevel: next.floorLevel || null,
                          originFloorLevelOther: next.floorLevelOther || null,
                          originLevelsCount: next.levelsCount || null,
                          originLevelsCountOther: next.levelsCountOther || null,
                          originFloor:
                            next.propertyType === 'appartement' || next.propertyType === 'immeuble'
                              ? parseNumericFloor(next.floorLevel, editDraft.originFloor)
                              : 0,
                        })
                      }
                    />

                    <PropertyPointSection
                      title="Point de destination *"
                      addressPlaceholder="Adresse complète de destination..."
                      accentClass="text-rose-400"
                      borderClass="border-rose-500/25"
                      value={{
                        address: editDraft.destinationAddress,
                        elevator: editDraft.destinationElevator,
                        propertyType: editDraft.destinationPropertyType || '',
                        floorLevel: editDraft.destinationFloorLevel || '',
                        floorLevelOther: editDraft.destinationFloorLevelOther || '',
                        levelsCount: editDraft.destinationLevelsCount || '',
                        levelsCountOther: editDraft.destinationLevelsCountOther || '',
                      }}
                      onChange={(next) =>
                        setEditDraft({
                          ...editDraft,
                          destinationAddress: next.address,
                          destinationElevator: next.elevator,
                          destinationPropertyType: next.propertyType || null,
                          destinationFloorLevel: next.floorLevel || null,
                          destinationFloorLevelOther: next.floorLevelOther || null,
                          destinationLevelsCount: next.levelsCount || null,
                          destinationLevelsCountOther: next.levelsCountOther || null,
                          destinationFloor:
                            next.propertyType === 'appartement' || next.propertyType === 'immeuble'
                              ? parseNumericFloor(next.floorLevel, editDraft.destinationFloor)
                              : 0,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Type de prestation *</label>
                      <select
                        value={editDraft.serviceType}
                        onChange={(e) => {
                          const nextType = e.target.value as ServiceType;
                          setEditDraft({
                            ...editDraft,
                            serviceType: nextType,
                            serviceTransportMode: requiresTransportMode(nextType)
                              ? editDraft.serviceTransportMode || null
                              : null,
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                      >
                        {!isStandardServiceType(editDraft.serviceType) && (
                          <option value={editDraft.serviceType} disabled>
                            {getServiceTypeLabel(editDraft.serviceType)} (ancien)
                          </option>
                        )}
                        {SERVICE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {requiresTransportMode(editDraft.serviceType) && (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Mode de transport *</label>
                        <select
                          required
                          value={editDraft.serviceTransportMode || ''}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              serviceTransportMode: (e.target.value as ServiceTransportMode) || null,
                            })
                          }
                          className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-2 text-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">-- Sélectionner --</option>
                          {SERVICE_TRANSPORT_MODE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Date souhaitée</label>
                      <input
                        type="date"
                        value={editDraft.targetDate}
                        onChange={(e) => setEditDraft({ ...editDraft, targetDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Volume estimé (m³)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editDraft.estimatedVolumeM3 ?? ''}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              estimatedVolumeM3: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Transit (jours)</label>
                        <input
                          type="number"
                          min={1}
                          value={editDraft.estimatedTransitDays ?? ''}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              estimatedTransitDays: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Commercial affecté</label>
                      <input
                        type="text"
                        value={editDraft.assignedCommercialName}
                        onChange={(e) => setEditDraft({ ...editDraft, assignedCommercialName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Statut du dossier</label>
                      <select
                        value={editDraft.status}
                        onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as AppointmentStatus })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        {Object.entries(statusColors).map(([k, { label }]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Contraintes particulières (séparées par des virgules)
                    </label>
                    <input
                      type="text"
                      value={editConstraintsText}
                      onChange={(e) => setEditConstraintsText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Notes & Remarques</label>
                    <textarea
                      rows={2}
                      value={editDraft.notes}
                      onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingDetail(false);
                        setEditDraft(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer les modifications</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
                  {/* Contact & Donneur d'ordre */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Coordonnées Client
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold text-white">{activeDetailApt.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{activeDetailApt.clientPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{activeDetailApt.clientEmail}</span>
                      </div>
                      {activeDetailApt.orderingCustomer && (
                        <div className="flex items-center gap-2 text-slate-300 pt-1">
                          <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Donneur d’ordre : {activeDetailApt.orderingCustomer}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Informations Prestation
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Date souhaitée : <strong className="text-white">{activeDetailApt.targetDate}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          Type :{' '}
                          <strong className="text-white">{getServiceTypeLabel(activeDetailApt.serviceType)}</strong>
                          {requiresTransportMode(activeDetailApt.serviceType) &&
                            activeDetailApt.serviceTransportMode && (
                              <span>
                                {' '}
                                —{' '}
                                <strong className="text-amber-400">
                                  {getServiceTransportModeLabel(activeDetailApt.serviceTransportMode)}
                                </strong>
                              </span>
                            )}
                        </span>
                      </div>
                      {activeDetailApt.estimatedVolumeM3 !== undefined && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Volume estimé : <strong className="text-amber-400">{activeDetailApt.estimatedVolumeM3} m³</strong></span>
                        </div>
                      )}
                      {activeDetailApt.estimatedTransitDays !== undefined && (
                        <div className="text-slate-400">
                          Transit estimé : <strong className="text-slate-200">{activeDetailApt.estimatedTransitDays} jours</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Adresses & Caractéristiques Départ & Destination */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      const originType = activeDetailApt.originPropertyType ?? activeDetailApt.propertyType ?? null;
                      const originDetail = formatPropertyDetailValue({
                        propertyType: originType,
                        floorLevel: activeDetailApt.originFloorLevel ?? activeDetailApt.floorLevel ?? null,
                        floorLevelOther:
                          activeDetailApt.originFloorLevelOther ?? activeDetailApt.floorLevelOther ?? null,
                        levelsCount: activeDetailApt.originLevelsCount ?? activeDetailApt.levelsCount ?? null,
                        levelsCountOther:
                          activeDetailApt.originLevelsCountOther ?? activeDetailApt.levelsCountOther ?? null,
                      });

                      return (
                        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Point de Départ</span>
                          </div>
                          <div className="text-slate-200">{activeDetailApt.originAddress}</div>
                          <div className="pt-1 border-t border-emerald-500/15 space-y-0.5 text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>
                                Type de bien : <strong className="text-white">{getPropertyTypeLabel(originType)}</strong>
                              </span>
                            </div>
                            {originType ? (
                              <div>
                                {originType === 'maison' ? 'Nombre de niveaux' : 'Niveau / étage'} :{' '}
                                <strong className="text-amber-300">{originDetail}</strong>
                              </div>
                            ) : (
                              <div className="text-slate-400">Étage : {activeDetailApt.originFloor ?? 0}</div>
                            )}
                            <div>
                              Ascenseur :{' '}
                              <strong className={activeDetailApt.originElevator ? 'text-emerald-300' : 'text-slate-300'}>
                                {activeDetailApt.originElevator ? 'Oui' : 'Non'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const destType = activeDetailApt.destinationPropertyType ?? null;
                      const destDetail = formatPropertyDetailValue({
                        propertyType: destType,
                        floorLevel: activeDetailApt.destinationFloorLevel ?? null,
                        floorLevelOther: activeDetailApt.destinationFloorLevelOther ?? null,
                        levelsCount: activeDetailApt.destinationLevelsCount ?? null,
                        levelsCountOther: activeDetailApt.destinationLevelsCountOther ?? null,
                      });

                      return (
                        <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Point de Destination</span>
                          </div>
                          <div className="text-slate-200">{activeDetailApt.destinationAddress}</div>
                          <div className="pt-1 border-t border-rose-500/15 space-y-0.5 text-[11px] text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Home className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>
                                Type de bien : <strong className="text-white">{getPropertyTypeLabel(destType)}</strong>
                              </span>
                            </div>
                            {destType ? (
                              <div>
                                {destType === 'maison' ? 'Nombre de niveaux' : 'Niveau / étage'} :{' '}
                                <strong className="text-amber-300">{destDetail}</strong>
                              </div>
                            ) : (
                              <div className="text-slate-400">Étage : {activeDetailApt.destinationFloor ?? 0}</div>
                            )}
                            <div>
                              Ascenseur :{' '}
                              <strong
                                className={activeDetailApt.destinationElevator ? 'text-emerald-300' : 'text-slate-300'}
                              >
                                {activeDetailApt.destinationElevator ? 'Oui' : 'Non'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Contraintes particulières */}
                  {activeDetailApt.specialConstraints.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Contraintes Particulières
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeDetailApt.specialConstraints.map((c, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg border border-slate-700"
                          >
                            ⚠️ {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {activeDetailApt.notes && (
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Notes & Remarques
                      </div>
                      <p className="text-slate-300 leading-relaxed">{activeDetailApt.notes}</p>
                    </div>
                  )}

                  {/* Rendez-vous supplémentaires */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarPlus className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white text-xs">
                          Rendez-vous supplémentaires ({(activeDetailApt.additionalVisits || []).length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingExtraRdv((prev) => !prev)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-[11px] border border-cyan-500/30 transition"
                        >
                          {isAddingExtraRdv ? 'Fermer formulaire' : '+ Ajouter un RDV'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateToNewRdv(activeDetailApt)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 transition"
                          title="Créer une nouvelle fiche RDV distincte avec les coordonnées de ce client"
                        >
                          + Nouvelle Fiche RDV Client
                        </button>
                      </div>
                    </div>

                    {isAddingExtraRdv && (
                      <form
                        onSubmit={(e) => handleAddSupplementaryVisit(activeDetailApt, e)}
                        className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1">
                            <label className="block text-[10px] text-slate-400 mb-1">Objet du RDV *</label>
                            <input
                              type="text"
                              required
                              value={extraRdvTitle}
                              onChange={(e) => setExtraRdvTitle(e.target.value)}
                              placeholder="ex: Contre-visite technique"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Date *</label>
                            <input
                              type="date"
                              required
                              value={extraRdvDate}
                              onChange={(e) => setExtraRdvDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Heure</label>
                            <input
                              type="time"
                              value={extraRdvTime}
                              onChange={(e) => setExtraRdvTime(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={extraRdvNotes}
                            onChange={(e) => setExtraRdvNotes(e.target.value)}
                            placeholder="Précisions (ex: Vérifier accès monte-meuble cour intérieure)..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                          >
                            Enregistrer RDV
                          </button>
                        </div>
                      </form>
                    )}

                    {(activeDetailApt.additionalVisits || []).length > 0 ? (
                      <div className="space-y-2">
                        {(activeDetailApt.additionalVisits || []).map((v) => (
                          <div
                            key={v.id}
                            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white truncate">{v.title}</span>
                                <span className="font-mono text-[11px] text-amber-400">
                                  {v.date} {v.time ? `à ${v.time}` : ''}
                                </span>
                              </div>
                              {v.notes && <div className="text-[11px] text-slate-400 mt-0.5">{v.notes}</div>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleSupplementaryVisitStatus(activeDetailApt, v.id)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  v.status === 'effectue'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : v.status === 'annule'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}
                                title="Cliquer pour changer le statut"
                              >
                                {v.status === 'effectue' ? 'Effectué' : v.status === 'annule' ? 'Annulé' : 'Planifié'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSupplementaryVisit(activeDetailApt, v.id)}
                                className="p-1 text-slate-500 hover:text-rose-400"
                                title="Supprimer ce RDV"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">
                        Aucun rendez-vous supplémentaire planifié pour ce client.
                      </div>
                    )}
                  </div>

                  {/* Footer Controls inside Detail Modal */}
                  <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500">Commercial affecté</div>
                      <div className="font-semibold text-slate-200">{activeDetailApt.assignedCommercialName}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={activeDetailApt.status}
                        onChange={(e) =>
                          updateAppointmentStatus(activeDetailApt.id, e.target.value as AppointmentStatus)
                        }
                        className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {Object.entries(statusColors).map(([k, { label }]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppointment(null);
                          setActiveModule('volume');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                      >
                        <span>Estimer le Volume</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedAppointment(null)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-400" />
                Nouvelle Demande de Visite d’Estimation (Module 1)
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom et Prénom du client *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Mamadou Sylla"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Donneur d’ordre (si différent)</label>
                  <input
                    type="text"
                    placeholder="ex: Entreprise / Ambassade"
                    value={orderingCustomer}
                    onChange={(e) => setOrderingCustomer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone obligatoire *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+221 77 ... ou +33 6 ..."
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email du client</label>
                  <input
                    type="email"
                    placeholder="client@domaine.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Point de départ et Point de destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <PropertyPointSection
                  title="Point de départ (Adresse complète) *"
                  addressPlaceholder="ex: 12 Rue des Almadies, Dakar"
                  accentClass="text-emerald-400"
                  borderClass="border-emerald-500/25"
                  value={{
                    address: originAddress,
                    elevator: originElevator,
                    propertyType: originPropertyType,
                    floorLevel: originFloorLevel,
                    floorLevelOther: originFloorLevelOther,
                    levelsCount: originLevelsCount,
                    levelsCountOther: originLevelsCountOther,
                  }}
                  onChange={(next) => {
                    setOriginAddress(next.address);
                    setOriginElevator(next.elevator);
                    setOriginPropertyType(next.propertyType);
                    setOriginFloorLevel(next.floorLevel);
                    setOriginFloorLevelOther(next.floorLevelOther);
                    setOriginLevelsCount(next.levelsCount);
                    setOriginLevelsCountOther(next.levelsCountOther);
                    setOriginFloor(
                      next.propertyType === 'appartement' || next.propertyType === 'immeuble'
                        ? parseNumericFloor(next.floorLevel, 0) ?? 0
                        : 0
                    );
                  }}
                />

                <PropertyPointSection
                  title="Point de destination (Adresse complète) *"
                  addressPlaceholder="ex: 45 Avenue Montaigne, Paris"
                  accentClass="text-rose-400"
                  borderClass="border-rose-500/25"
                  value={{
                    address: destinationAddress,
                    elevator: destinationElevator,
                    propertyType: destinationPropertyType,
                    floorLevel: destinationFloorLevel,
                    floorLevelOther: destinationFloorLevelOther,
                    levelsCount: destinationLevelsCount,
                    levelsCountOther: destinationLevelsCountOther,
                  }}
                  onChange={(next) => {
                    setDestinationAddress(next.address);
                    setDestinationElevator(next.elevator);
                    setDestinationPropertyType(next.propertyType);
                    setDestinationFloorLevel(next.floorLevel);
                    setDestinationFloorLevelOther(next.floorLevelOther);
                    setDestinationLevelsCount(next.levelsCount);
                    setDestinationLevelsCountOther(next.levelsCountOther);
                    setDestinationFloor(
                      next.propertyType === 'appartement' || next.propertyType === 'immeuble'
                        ? parseNumericFloor(next.floorLevel, 0) ?? 0
                        : 0
                    );
                  }}
                />
              </div>

              {/* Service type & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type de prestation *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => {
                      const nextType = e.target.value as ServiceType;
                      setServiceType(nextType);
                      if (!requiresTransportMode(nextType)) {
                        setServiceTransportMode('');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  >
                    {!isStandardServiceType(serviceType) && (
                      <option value={serviceType} disabled>
                        {getServiceTypeLabel(serviceType)} (ancien)
                      </option>
                    )}
                    {SERVICE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {requiresTransportMode(serviceType) && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Mode de transport *</label>
                    <select
                      required
                      value={serviceTransportMode}
                      onChange={(e) => setServiceTransportMode(e.target.value as ServiceTransportMode | '')}
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Sélectionner --</option>
                      {SERVICE_TRANSPORT_MODE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date Souhaitée</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Transit Time Estimé <span className="text-[10px] text-amber-400 font-normal">(Optionnel)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Non spécifié (jours)"
                    value={estimatedTransitDays}
                    onChange={(e) => setEstimatedTransitDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Contraintes particulières (séparées par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="ex: Ruelle étroite, Monte-meuble requis, Objets précieux, Piano"
                  value={specialConstraintsText}
                  onChange={(e) => setSpecialConstraintsText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes et remarques internes</label>
                <textarea
                  rows={2}
                  placeholder="Instructions spécifiques pour la visite technique..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  Enregistrer et Créer Fiche Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
