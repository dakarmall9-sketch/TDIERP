import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, X, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Vehicle, VehicleStatus } from '../../types';
import { FleetGoogleMap } from './fleet/FleetGoogleMap';
import {
  useRealtimeAutoSave,
  loadDraftFromStorage,
  saveDraftToStorage,
  clearDraftFromStorage,
} from '../../hooks/useAutoSave';

const NEW_VEHICLE_DRAFT_KEY = 'transmove_draft_fleet_new';

export const FleetManagementModule: React.FC = () => {
  const {
    vehicles,
    employees,
    updateVehicleStatus,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleLocation,
  } = useApp();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehiclePendingDelete, setVehiclePendingDelete] = useState<Vehicle | null>(null);

  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(() =>
    loadDraftFromStorage<Omit<Vehicle, 'id'>>(NEW_VEHICLE_DRAFT_KEY, {
      plateNumber: '',
      brand: '',
      model: '',
      type: 'Fourgon Grand Volume (20m³)',
      volumeCapacityM3: 20,
      weightCapacityKg: 3500,
      usualDriverId: '',
      usualDriverName: '',
      status: 'disponible',
      currentLocation: { lat: 14.6928, lng: -17.4467, address: 'Dépôt Central Dakar' },
      mileageKm: 45000,
      fuelConsumptionAvg: 13.5,
      costPerKm: 0.45,
      insuranceExpiry: '2027-06-30',
      inspectionExpiry: '2027-03-31',
      greyCardNumber: 'CG-DKR-2026-001',
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
      nextMaintenanceKm: 60000,
    })
  );

  // Real-time localStorage draft when creating a new vehicle
  useEffect(() => {
    if (!editingVehicle && (form.plateNumber.trim() || form.brand.trim() || form.model.trim())) {
      saveDraftToStorage(NEW_VEHICLE_DRAFT_KEY, form);
    }
  }, [editingVehicle, form]);

  // Real-time Firestore auto-save when editing an existing vehicle
  const { cancelPending: cancelVehicleAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(isModalOpen && editingVehicle),
    data: form,
    resetKey: editingVehicle?.id || 'none',
    delayMs: 600,
    onSave: (draft) => {
      if (!editingVehicle || !draft.plateNumber.trim() || !draft.brand.trim()) return;
      const driver = employees.find((emp) => emp.id === draft.usualDriverId);
      updateVehicle(
        {
          ...editingVehicle,
          ...draft,
          plateNumber: draft.plateNumber.trim().toUpperCase(),
          brand: draft.brand.trim(),
          model: draft.model.trim(),
          usualDriverName: driver ? `${driver.firstName} ${driver.lastName}` : draft.usualDriverName,
        },
        { silent: true }
      );
    },
  });

  useEffect(() => {
    if (!selectedVehicleId && vehicles[0]?.id) {
      setSelectedVehicleId(vehicles[0].id);
    } else if (selectedVehicleId && vehicles.length > 0 && !vehicles.some((v) => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const handleSimulateMove = (vehicleId: string) => {
    const v = vehicles.find((veh) => veh.id === vehicleId);
    if (!v) return;
    const deltaLat = (Math.random() - 0.5) * 0.006;
    const deltaLng = (Math.random() - 0.5) * 0.006;
    const updatedLoc = {
      lat: v.currentLocation.lat + deltaLat,
      lng: v.currentLocation.lng + deltaLng,
      address: v.currentLocation.address.includes('(En circulation)')
        ? v.currentLocation.address
        : `${v.currentLocation.address} (En circulation)`,
    };
    updateVehicle({
      ...v,
      currentLocation: updatedLoc,
      mileageKm: v.mileageKm + 1,
      status: 'en_mission',
    });
    updateVehicleLocation(vehicleId, updatedLoc);
  };

  const openCreateModal = () => {
    cancelVehicleAutoSave();
    setEditingVehicle(null);
    const savedDraft = loadDraftFromStorage<Omit<Vehicle, 'id'> | null>(NEW_VEHICLE_DRAFT_KEY, null);
    const defaultDriver = employees.find((e) => e.role === 'driver') || employees[0];
    setForm(
      savedDraft || {
        plateNumber: '',
        brand: '',
        model: '',
        type: 'Fourgon Grand Volume (20m³)',
        volumeCapacityM3: 20,
        weightCapacityKg: 3500,
        usualDriverId: defaultDriver?.id || '',
        usualDriverName: defaultDriver ? `${defaultDriver.firstName} ${defaultDriver.lastName}` : 'Chauffeur Principal',
        status: 'disponible',
        currentLocation: { lat: 14.6928, lng: -17.4467, address: 'Dépôt Central' },
        mileageKm: 15000,
        fuelConsumptionAvg: 12.5,
        costPerKm: 0.45,
        insuranceExpiry: '2027-06-30',
        inspectionExpiry: '2027-03-31',
        greyCardNumber: 'CG-' + Math.floor(10000 + Math.random() * 90000),
        lastMaintenanceDate: new Date().toISOString().split('T')[0],
        nextMaintenanceKm: 30000,
      }
    );
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    cancelVehicleAutoSave();
    setEditingVehicle(v);
    setForm({
      plateNumber: v.plateNumber,
      brand: v.brand,
      model: v.model,
      type: v.type,
      volumeCapacityM3: v.volumeCapacityM3,
      weightCapacityKg: v.weightCapacityKg,
      usualDriverId: v.usualDriverId,
      usualDriverName: v.usualDriverName,
      status: v.status,
      currentLocation: v.currentLocation,
      mileageKm: v.mileageKm,
      fuelConsumptionAvg: v.fuelConsumptionAvg,
      costPerKm: v.costPerKm,
      insuranceExpiry: v.insuranceExpiry,
      inspectionExpiry: v.inspectionExpiry,
      greyCardNumber: v.greyCardNumber,
      lastMaintenanceDate: v.lastMaintenanceDate,
      nextMaintenanceKm: v.nextMaintenanceKm,
    });
    setIsModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plateNumber.trim() || !form.brand.trim()) return;
    cancelVehicleAutoSave();

    const driver = employees.find((emp) => emp.id === form.usualDriverId);
    const payload: Omit<Vehicle, 'id'> = {
      ...form,
      plateNumber: form.plateNumber.trim().toUpperCase(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      usualDriverName: driver ? `${driver.firstName} ${driver.lastName}` : form.usualDriverName,
    };

    if (editingVehicle) {
      updateVehicle({ ...editingVehicle, ...payload });
    } else {
      const created = addVehicle(payload);
      setSelectedVehicleId(created.id);
      clearDraftFromStorage(NEW_VEHICLE_DRAFT_KEY);
    }
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const statusColors: Record<VehicleStatus, { label: string; color: string; badge: string }> = {
    disponible: { label: 'Disponible Dépôt', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    en_mission: { label: 'En Mission', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    en_maintenance: { label: 'En Révision / Atelier', color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    immobilise: { label: 'Immobilisé / Panne', color: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  };

  const getExpiryWarning = (dateStr: string) => {
    const diffDays = Math.round((new Date(dateStr).getTime() - Date.now()) / (1000 * 3600 * 24));
    if (diffDays < 0) return { alert: true, text: `Expiré depuis ${Math.abs(diffDays)} jours !`, color: 'text-rose-400' };
    if (diffDays < 30) return { alert: true, text: `Expire dans ${diffDays} jours`, color: 'text-amber-400' };
    return { alert: false, text: `Valide jusqu’au ${dateStr}`, color: 'text-slate-400' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 10
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestion de Flotte, Entretien & Suivi GPS
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervision des camions, consommations de carburant, alertes d’expiration (assurance & CT) et géolocalisation
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Véhicule</span>
        </button>
      </div>

      {/* Real-time Google Maps Fleet Geolocation */}
      {selectedVehicle && (
        <FleetGoogleMap
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={(v) => setSelectedVehicleId(v.id)}
          onSimulateMove={handleSimulateMove}
        />
      )}

      {/* Fleet Vehicles Grid & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {vehicles.map((v) => {
          const isSelected = selectedVehicle?.id === v.id;
          const statusInfo = statusColors[v.status];
          const insWarning = getExpiryWarning(v.insuranceExpiry);
          const ctWarning = getExpiryWarning(v.inspectionExpiry);

          return (
            <div
              key={v.id}
              onClick={() => setSelectedVehicleId(v.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/80 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2 gap-1">
                  <span className="font-mono font-bold text-amber-400 text-xs">{v.plateNumber}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => openEditModal(v, e)}
                      title="Modifier véhicule"
                      className="p-1 text-slate-400 hover:text-amber-300 rounded"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVehiclePendingDelete(v);
                      }}
                      title="Supprimer véhicule"
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-white text-sm">{v.brand} {v.model}</h4>
                <div className="text-[11px] text-slate-400">{v.type}</div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Volume max :</span>
                    <span className="font-bold text-white">{v.volumeCapacityM3} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Charge utile :</span>
                    <span className="font-mono text-white">{v.weightCapacityKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kilométrage :</span>
                    <span className="font-mono text-slate-200">{v.mileageKm.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Consommation :</span>
                    <span className="text-cyan-400 font-bold">{v.fuelConsumptionAvg} L/100km</span>
                  </div>
                </div>

                {/* Expiry Alerts badges */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assurance :</span>
                    <span className={`font-semibold ${insWarning.color}`}>{insWarning.text}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contrôle technique :</span>
                    <span className={`font-semibold ${ctWarning.color}`}>{ctWarning.text}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">Chauffeur : {v.usualDriverName}</span>
                <select
                  value={v.status}
                  onChange={(e) => updateVehicleStatus(v.id, e.target.value as VehicleStatus)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-950 text-[10px] rounded px-2 py-1 border border-slate-700 text-white focus:outline-none"
                >
                  <option value="disponible">Disponible</option>
                  <option value="en_mission">En mission</option>
                  <option value="en_maintenance">Maintenance</option>
                  <option value="immobilise">Immobilisé</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingVehicle ? `Modifier ${editingVehicle.plateNumber}` : 'Nouveau Véhicule de Flotte'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Immatriculation *</label>
                  <input
                    type="text"
                    required
                    placeholder="DK-8492-AA"
                    value={form.plateNumber}
                    onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Marque *</label>
                  <input
                    type="text"
                    required
                    placeholder="Iveco / Renault / Mercedes"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Modèle *</label>
                  <input
                    type="text"
                    required
                    placeholder="Daily / Master / Actros"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type de véhicule</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Vehicle['type'] })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Fourgonnette (10m³)">Fourgonnette (10m³)</option>
                    <option value="Fourgon Grand Volume (20m³)">Fourgon Grand Volume (20m³)</option>
                    <option value="Camion Porteur (40m³)">Camion Porteur (40m³)</option>
                    <option value="Semi-remorque (80m³)">Semi-remorque (80m³)</option>
                    <option value="Véhicule de liaison">Véhicule de liaison</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chauffeur habituel</label>
                  <select
                    value={form.usualDriverId}
                    onChange={(e) => setForm({ ...form, usualDriverId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">-- Non affecté --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.volumeCapacityM3}
                    onChange={(e) => setForm({ ...form, volumeCapacityM3: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Charge (kg)</label>
                  <input
                    type="number"
                    min={100}
                    value={form.weightCapacityKg}
                    onChange={(e) => setForm({ ...form, weightCapacityKg: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kilométrage</label>
                  <input
                    type="number"
                    min={0}
                    value={form.mileageKm}
                    onChange={(e) => setForm({ ...form, mileageKm: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Conso (L/100)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    value={form.fuelConsumptionAvg}
                    onChange={(e) => setForm({ ...form, fuelConsumptionAvg: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Expiration Assurance</label>
                  <input
                    type="date"
                    value={form.insuranceExpiry}
                    onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Expiration Contrôle Technique</label>
                  <input
                    type="date"
                    value={form.inspectionExpiry}
                    onChange={(e) => setForm({ ...form, inspectionExpiry: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vehicle Confirmation Modal */}
      {vehiclePendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">
              Retirer le véhicule {vehiclePendingDelete.plateNumber} ?
            </h3>
            <p className="text-xs text-slate-400">
              {vehiclePendingDelete.brand} {vehiclePendingDelete.model} sera supprimé de la flotte active.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVehiclePendingDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteVehicle(vehiclePendingDelete.id);
                  setVehiclePendingDelete(null);
                }}
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
