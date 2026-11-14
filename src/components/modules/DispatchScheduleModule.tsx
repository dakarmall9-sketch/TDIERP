import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Layers,
  X,
  Save,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Chantier, ChantierStatus } from '../../types';
import { useRealtimeAutoSave, useLocalDraft } from '../../hooks/useAutoSave';

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const WEEKDAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const DispatchScheduleModule: React.FC = () => {
  const {
    chantiers,
    vehicles,
    employees,
    updateChantierStatus,
    createChantier,
    updateChantier,
    setActiveModule,
    setFocusedChantierId,
  } = useApp();

  const todayIso = toIsoDate(new Date());
  const defaultAnchorDate = chantiers[0]?.scheduledDate || todayIso;

  const [viewMode, setViewMode] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('mois');
  const [selectedDate, setSelectedDate] = useState(defaultAnchorDate);
  const [selectedMonth, setSelectedMonth] = useState(defaultAnchorDate.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(Number(defaultAnchorDate.slice(0, 4)) || new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Chantier Modal (persisted in real-time local draft)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newForm, setNewForm, clearNewFormDraft] = useLocalDraft('transmove_draft_dispatch_new', {
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    originAddress: '',
    destinationAddress: '',
    scheduledDate: defaultAnchorDate,
    startTime: '08:00',
    estimatedEndTime: '16:00',
    volumeM3: 20,
    vehicleId: vehicles[0]?.id || '',
    teamLeaderId: employees.find((e) => e.role === 'driver')?.id || employees[0]?.id || '',
    internalNotes: '',
  });

  // Reassign Modal (real-time Firestore auto-save)
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [reassignForm, setReassignForm] = useState({
    scheduledDate: '',
    startTime: '08:00',
    estimatedEndTime: '16:00',
    vehicleId: '',
    teamLeaderId: '',
    moverIds: [] as string[],
  });

  const { cancelPending: cancelReassignAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(editingChantier),
    data: reassignForm,
    resetKey: editingChantier?.id || 'none',
    delayMs: 550,
    onSave: (form) => {
      if (!editingChantier || !form.scheduledDate) return;
      const chosenVehicle = vehicles.find((v) => v.id === form.vehicleId);
      const chosenLeader = employees.find((emp) => emp.id === form.teamLeaderId);
      const chosenMovers = employees.filter((emp) => form.moverIds.includes(emp.id));

      updateChantier(
        {
          ...editingChantier,
          scheduledDate: form.scheduledDate,
          startTime: form.startTime,
          estimatedEndTime: form.estimatedEndTime,
          vehicleId: chosenVehicle?.id || editingChantier.vehicleId,
          vehiclePlate: chosenVehicle?.plateNumber || editingChantier.vehiclePlate,
          vehicleName: chosenVehicle ? `${chosenVehicle.brand} ${chosenVehicle.model}` : editingChantier.vehicleName,
          teamLeaderId: chosenLeader?.id || editingChantier.teamLeaderId,
          teamLeaderName: chosenLeader
            ? `${chosenLeader.firstName} ${chosenLeader.lastName}`
            : editingChantier.teamLeaderName,
          moverIds: chosenMovers.map((m) => m.id),
          moverNames: chosenMovers.map((m) => `${m.firstName} ${m.lastName}`),
        },
        { silent: true }
      );
    },
  });

  const statusMap: Record<ChantierStatus, { label: string; color: string }> = {
    programme: { label: 'Programmé', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    en_attente: { label: 'En attente', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    en_cours: { label: 'En cours', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    en_transit: { label: 'En transit routier', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    arrive_depot: { label: 'Arrivé au dépôt', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    livre: { label: 'Livré (En attente signature)', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    termine: { label: 'Terminé & Facturé', color: 'bg-emerald-500/30 text-emerald-200 border-emerald-400' },
    annule: { label: 'Annulé', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  };

  // Conflict Detection
  const conflictAlerts: { message: string; date: string; vehiclePlate?: string }[] = [];
  const vehicleBookingMap: Record<string, string[]> = {};

  chantiers.forEach((c) => {
    if (c.status !== 'termine' && c.status !== 'annule' && c.vehiclePlate) {
      const key = `${c.scheduledDate}_${c.vehiclePlate}`;
      if (!vehicleBookingMap[key]) vehicleBookingMap[key] = [];
      vehicleBookingMap[key].push(c.code);
      if (vehicleBookingMap[key].length > 1) {
        conflictAlerts.push({
          message: `Double réservation détectée sur le véhicule ${c.vehiclePlate} pour les chantiers [${vehicleBookingMap[key].join(', ')}]`,
          date: c.scheduledDate,
          vehiclePlate: c.vehiclePlate,
        });
      }
    }
  });

  const filteredChantiers = chantiers.filter((c) => filterStatus === 'all' || c.status === filterStatus);

  // Dynamic Week computation from selectedDate
  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    const jsDay = base.getDay(); // 0=Sun..6=Sat
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayOffset);
    return WEEKDAYS_FR.map((name, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return { name, date: toIsoDate(d) };
    });
  }, [selectedDate]);

  const shiftWeek = (deltaWeeks: number) => {
    const base = new Date(`${selectedDate}T12:00:00`);
    base.setDate(base.getDate() + deltaWeeks * 7);
    const next = toIsoDate(base);
    setSelectedDate(next);
    setSelectedMonth(next.slice(0, 7));
    setSelectedYear(base.getFullYear());
  };

  // Dynamic Month days computation
  const daysInMonth = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const year = Number(yStr) || new Date().getFullYear();
    const month = Number(mStr) || 1;
    const totalDays = new Date(year, month, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      const formattedDay = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${formattedDay}`;
      const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short' });
      const missions = chantiers.filter((c) => c.scheduledDate === dateStr);
      return { dayNum, dateStr, dayOfWeek, missions };
    });
  }, [selectedMonth, chantiers]);

  const shiftMonth = (deltaMonths: number) => {
    const [yStr, mStr] = selectedMonth.split('-');
    const d = new Date(Number(yStr), Number(mStr) - 1 + deltaMonths, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextMonth);
    setSelectedYear(d.getFullYear());
  };

  const chantiersForSelectedDate = chantiers.filter((c) => c.scheduledDate === selectedDate);

  const openOperationsFor = (chantier: Chantier) => {
    setFocusedChantierId(chantier.id);
    setActiveModule('operations');
  };

  const handleOpenNewModal = () => {
    setNewForm((prev) => ({
      ...prev,
      scheduledDate: prev.scheduledDate || selectedDate || todayIso,
      vehicleId: prev.vehicleId || vehicles[0]?.id || '',
      teamLeaderId:
        prev.teamLeaderId || employees.find((e) => e.role === 'driver')?.id || employees[0]?.id || '',
    }));
    setIsNewModalOpen(true);
  };

  const handleCreateChantierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.clientName.trim()) return;

    const chosenVehicle = vehicles.find((v) => v.id === newForm.vehicleId) || vehicles[0];
    const chosenLeader = employees.find((emp) => emp.id === newForm.teamLeaderId) || employees[0];

    const created = createChantier({
      clientName: newForm.clientName.trim(),
      clientEmail: newForm.clientEmail.trim().toLowerCase(),
      clientPhone: newForm.clientPhone.trim(),
      originAddress: newForm.originAddress.trim(),
      destinationAddress: newForm.destinationAddress.trim(),
      scheduledDate: newForm.scheduledDate,
      startTime: newForm.startTime,
      estimatedEndTime: newForm.estimatedEndTime,
      volumeM3: Number(newForm.volumeM3) || 15,
      actualVolumeM3: Number(newForm.volumeM3) || 15,
      status: 'programme',
      teamLeaderId: chosenLeader?.id || '',
      teamLeaderName: chosenLeader ? `${chosenLeader.firstName} ${chosenLeader.lastName}` : 'Chef d’équipe',
      moverIds: chosenLeader ? [chosenLeader.id] : [],
      moverNames: chosenLeader ? [`${chosenLeader.firstName} ${chosenLeader.lastName}`] : [],
      vehicleId: chosenVehicle?.id || '',
      vehiclePlate: chosenVehicle?.plateNumber || 'À affecter',
      vehicleName: chosenVehicle ? `${chosenVehicle.brand} ${chosenVehicle.model}` : 'Véhicule standard',
      usedMaterials: [],
      photos: [],
      incidents: [],
      internalNotes: newForm.internalNotes.trim(),
      isInvoiceGenerated: false,
    });

    clearNewFormDraft();
    setSelectedDate(created.scheduledDate);
    setSelectedMonth(created.scheduledDate.slice(0, 7));
    setIsNewModalOpen(false);
  };

  const handleOpenReassign = (c: Chantier) => {
    cancelReassignAutoSave();
    setEditingChantier(c);
    setReassignForm({
      scheduledDate: c.scheduledDate,
      startTime: c.startTime,
      estimatedEndTime: c.estimatedEndTime,
      vehicleId: c.vehicleId,
      teamLeaderId: c.teamLeaderId,
      moverIds: c.moverIds || [],
    });
  };

  const toggleMoverInReassign = (empId: string) => {
    setReassignForm((prev) => ({
      ...prev,
      moverIds: prev.moverIds.includes(empId)
        ? prev.moverIds.filter((id) => id !== empId)
        : [...prev.moverIds, empId],
    }));
  };

  const handleSaveReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChantier) return;
    cancelReassignAutoSave();

    const chosenVehicle = vehicles.find((v) => v.id === reassignForm.vehicleId);
    const chosenLeader = employees.find((emp) => emp.id === reassignForm.teamLeaderId);
    const chosenMovers = employees.filter((emp) => reassignForm.moverIds.includes(emp.id));

    updateChantier({
      ...editingChantier,
      scheduledDate: reassignForm.scheduledDate,
      startTime: reassignForm.startTime,
      estimatedEndTime: reassignForm.estimatedEndTime,
      vehicleId: chosenVehicle?.id || editingChantier.vehicleId,
      vehiclePlate: chosenVehicle?.plateNumber || editingChantier.vehiclePlate,
      vehicleName: chosenVehicle ? `${chosenVehicle.brand} ${chosenVehicle.model}` : editingChantier.vehicleName,
      teamLeaderId: chosenLeader?.id || editingChantier.teamLeaderId,
      teamLeaderName: chosenLeader
        ? `${chosenLeader.firstName} ${chosenLeader.lastName}`
        : editingChantier.teamLeaderName,
      moverIds: chosenMovers.map((m) => m.id),
      moverNames: chosenMovers.map((m) => `${m.firstName} ${m.lastName}`),
    });

    setEditingChantier(null);
  };

  const selectedMonthLabel = (() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const idx = (Number(mStr) || 1) - 1;
    return `${MONTHS_FR[idx] || mStr} ${yStr}`;
  })();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 4
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Planning Opérationnel Centralisé (Jour • Mois • Année)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Programmation quotidienne, mensuelle et annuelle des chantiers avec contrôle des disponibilités et conflits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Planifier un Chantier</span>
          </button>

          {/* View mode toggle (JOUR, SEMAINE, MOIS, ANNÉE) */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            {(['jour', 'semaine', 'mois', 'annee'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  viewMode === mode
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Warnings Bar if any */}
      {conflictAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-rose-300">
              Conflit de planning détecté ({conflictAlerts.length})
            </div>
            {conflictAlerts.map((ca, idx) => (
              <p key={idx} className="text-rose-200 mt-0.5">
                • {ca.message} (Date : {ca.date})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* VUE JOUR */}
      {viewMode === 'jour' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedMonth(e.target.value.slice(0, 7));
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
              />
              <span className="text-xs text-slate-300 font-semibold">
                Missions programmées : <span className="text-amber-400 font-bold">{chantiersForSelectedDate.length}</span>
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedDate(todayIso);
                setSelectedMonth(todayIso.slice(0, 7));
              }}
              className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
            >
              Aujourd’hui ({todayIso})
            </button>
          </div>

          <div className="space-y-3">
            {chantiersForSelectedDate.length > 0 ? (
              chantiersForSelectedDate.map((c) => {
                const badge = statusMap[c.status];
                return (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-sm">{c.code}</span>
                        <span className="text-xs text-white font-bold">{c.clientName}</span>
                        <span className="text-slate-400 text-xs">({c.clientPhone})</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Horaires</span>
                        <div className="font-bold text-white mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{c.startTime} - {c.estimatedEndTime}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Équipe & Camion</span>
                        <div className="font-semibold text-slate-200 mt-0.5">{c.teamLeaderName}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">{c.vehiclePlate} ({c.vehicleName})</div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Itinéraire</span>
                        <div className="text-[11px] text-slate-300 truncate"><span className="text-emerald-400">Dép :</span> {c.originAddress}</div>
                        <div className="text-[11px] text-slate-300 truncate"><span className="text-rose-400">Arr :</span> {c.destinationAddress}</div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenReassign(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
                        >
                          Affecter
                        </button>
                        <button
                          onClick={() => openOperationsFor(c)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                        >
                          Ouvrir Suivi
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                Aucun chantier planifié à la date du {selectedDate}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE SEMAINE */}
      {viewMode === 'semaine' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Semaine du {weekDays[0]?.date} au {weekDays[6]?.date}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftWeek(-1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Semaine précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedDate(todayIso);
                  setSelectedMonth(todayIso.slice(0, 7));
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700"
              >
                Cette semaine
              </button>
              <button
                onClick={() => shiftWeek(1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Semaine suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
            {weekDays.map((day) => {
              const dayChantiers = chantiers.filter((c) => c.scheduledDate === day.date);
              const isToday = day.date === todayIso;
              const isSelected = day.date === selectedDate;

              return (
                <div
                  key={day.date}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setViewMode('jour');
                  }}
                  className={`p-3 rounded-xl border flex flex-col min-h-[220px] transition cursor-pointer hover:border-amber-400/60 ${
                    isToday
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : isSelected
                      ? 'bg-slate-900 border-amber-400/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-300">{day.name}</span>
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${isToday ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      {day.date.slice(8)}/{day.date.slice(5, 7)}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayChantiers.map((c) => (
                      <div key={c.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <div className="font-mono font-bold text-amber-400 text-[10px]">{c.code}</div>
                        <div className="font-semibold text-white truncate text-[11px]">{c.clientName}</div>
                        <div className="text-[10px] text-slate-400">{c.startTime} - {c.vehiclePlate}</div>
                      </div>
                    ))}
                    {dayChantiers.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic">
                        Vide
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VUE MOIS */}
      {viewMode === 'mois' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Planning Mensuel :</h3>
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none"
              />
              <button
                onClick={() => shiftMonth(1)}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-amber-300 font-semibold hidden sm:inline">
                ({selectedMonthLabel})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Chantiers ce mois :</span>
              <span className="text-xs font-bold text-amber-400 font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {chantiers.filter((c) => c.scheduledDate.startsWith(selectedMonth)).length} missions
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {daysInMonth.map((d) => {
              const hasMissions = d.missions.length > 0;
              const isSelected = selectedDate === d.dateStr;

              return (
                <div
                  key={d.dateStr}
                  onClick={() => {
                    setSelectedDate(d.dateStr);
                    setViewMode('jour');
                  }}
                  className={`p-2.5 rounded-xl border transition cursor-pointer min-h-[90px] flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500'
                      : hasMissions
                      ? 'bg-slate-950 border-slate-700 hover:border-amber-400'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500">{d.dayOfWeek}</span>
                    <span className="font-mono font-bold text-slate-200">{d.dayNum}</span>
                  </div>

                  {hasMissions ? (
                    <div className="space-y-1">
                      {d.missions.map((m) => (
                        <div key={m.id} className="p-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-amber-300 font-medium truncate">
                          {m.code} - {m.clientName.split(' ')[0]}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-700 text-center">-</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VUE ANNÉE */}
      {viewMode === 'annee' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">
                Planning et Charge Opérationnelle Année {selectedYear}
              </h3>
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-xs text-slate-400">Cliquez sur un mois pour ouvrir son planning détaillé</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MONTHS_FR.map((monthName, idx) => {
              const num = String(idx + 1).padStart(2, '0');
              const monthKey = `${selectedYear}-${num}`;
              const countInMonth = chantiers.filter((c) => c.scheduledDate.startsWith(monthKey)).length;
              const isCurrent = monthKey === todayIso.slice(0, 7);
              const capacityPct = Math.min(100, countInMonth * 12);

              return (
                <div
                  key={monthKey}
                  onClick={() => {
                    setSelectedMonth(monthKey);
                    setViewMode('mois');
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer hover:border-amber-400 ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white text-sm">{monthName}</span>
                    <span className="font-mono text-xs text-slate-400">{selectedYear}</span>
                  </div>

                  <div className="text-xl font-black text-amber-400 font-mono">
                    {countInMonth} <span className="text-xs text-slate-400 font-normal">chantiers</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between text-[10px] text-slate-400">
                    <span>Taux de charge estimé :</span>
                    <span className="font-semibold text-emerald-400">{capacityPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tableau Récapitulatif Opérationnel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-sm">
            Tableau Central des Missions d’Exploitation ({filteredChantiers.length})
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Tous les états</option>
              {Object.entries(statusMap).map(([k, { label }]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Code / Date</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Itinéraire</th>
                <th className="py-2.5 px-3">Véhicule Affecté</th>
                <th className="py-2.5 px-3">Chef d'Équipe</th>
                <th className="py-2.5 px-3">Statut Opérationnel</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredChantiers.map((c) => {
                const badge = statusMap[c.status] || { label: c.status, color: 'bg-slate-800 text-slate-300' };

                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-amber-400">{c.code}</div>
                      <div className="text-[10px] text-slate-400">{c.scheduledDate} ({c.startTime})</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{c.clientName}</div>
                      <div className="text-[10px] text-slate-400">{c.clientPhone}</div>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-[11px] text-slate-300 truncate">
                        <span className="text-emerald-400 font-bold">Dép :</span> {c.originAddress}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">
                        <span className="text-rose-400 font-bold">Arr :</span> {c.destinationAddress}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{c.vehiclePlate}</div>
                      <div className="text-[10px] text-slate-400 truncate">{c.vehicleName}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-200 font-medium">{c.teamLeaderName}</div>
                      <div className="text-[10px] text-slate-400">
                        +{c.moverNames.length} déménageurs
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={c.status}
                        onChange={(e) => updateChantierStatus(c.id, e.target.value as ChantierStatus)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-950 focus:outline-none cursor-pointer ${badge.color}`}
                      >
                        {Object.entries(statusMap).map(([k, { label }]) => (
                          <option key={k} value={k} className="bg-slate-900 text-white">
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenReassign(c)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                        >
                          Affecter
                        </button>
                        <button
                          onClick={() => openOperationsFor(c)}
                          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-semibold transition"
                        >
                          Ouvrir Suivi
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Planifier un Chantier */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Planifier un Nouveau Chantier
              </h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChantierSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Client *</label>
                  <input
                    type="text"
                    required
                    value={newForm.clientName}
                    onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={newForm.clientPhone}
                    onChange={(e) => setNewForm({ ...newForm, clientPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email client (Portail)</label>
                  <input
                    type="email"
                    value={newForm.clientEmail}
                    onChange={(e) => setNewForm({ ...newForm, clientEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-400 font-semibold mb-1">Adresse de départ *</label>
                  <input
                    type="text"
                    required
                    value={newForm.originAddress}
                    onChange={(e) => setNewForm({ ...newForm, originAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-rose-400 font-semibold mb-1">Adresse d'arrivée *</label>
                  <input
                    type="text"
                    required
                    value={newForm.destinationAddress}
                    onChange={(e) => setNewForm({ ...newForm, destinationAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newForm.scheduledDate}
                    onChange={(e) => setNewForm({ ...newForm, scheduledDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Début</label>
                  <input
                    type="time"
                    value={newForm.startTime}
                    onChange={(e) => setNewForm({ ...newForm, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fin estimée</label>
                  <input
                    type="time"
                    value={newForm.estimatedEndTime}
                    onChange={(e) => setNewForm({ ...newForm, estimatedEndTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    min={1}
                    value={newForm.volumeM3}
                    onChange={(e) => setNewForm({ ...newForm, volumeM3: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Véhicule affecté</label>
                  <select
                    value={newForm.vehicleId}
                    onChange={(e) => setNewForm({ ...newForm, vehicleId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} — {v.brand} {v.model} ({v.volumeCapacityM3}m³)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Chef d'équipe</label>
                  <select
                    value={newForm.teamLeaderId}
                    onChange={(e) => setNewForm({ ...newForm, teamLeaderId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.teamName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Consignes internes</label>
                <textarea
                  rows={2}
                  value={newForm.internalNotes}
                  onChange={(e) => setNewForm({ ...newForm, internalNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer au Planning</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Réaffecter Équipe / Véhicule */}
      {editingChantier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Réaffectation — {editingChantier.code} ({editingChantier.clientName})
              </h3>
              <button onClick={() => setEditingChantier(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReassign} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={reassignForm.scheduledDate}
                    onChange={(e) => setReassignForm({ ...reassignForm, scheduledDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Début</label>
                  <input
                    type="time"
                    value={reassignForm.startTime}
                    onChange={(e) => setReassignForm({ ...reassignForm, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fin</label>
                  <input
                    type="time"
                    value={reassignForm.estimatedEndTime}
                    onChange={(e) => setReassignForm({ ...reassignForm, estimatedEndTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Véhicule</label>
                <select
                  value={reassignForm.vehicleId}
                  onChange={(e) => setReassignForm({ ...reassignForm, vehicleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.brand} {v.model} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chef d'équipe</label>
                <select
                  value={reassignForm.teamLeaderId}
                  onChange={(e) => setReassignForm({ ...reassignForm, teamLeaderId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.teamName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Équipiers affectés</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-950 border border-slate-800">
                  {employees.map((emp) => {
                    const checked = reassignForm.moverIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMoverInReassign(emp.id)}
                          className="accent-amber-500"
                        />
                        <span className="truncate">{emp.firstName} {emp.lastName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingChantier(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Enregistrer l'affectation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
