import React, { useState, useEffect, useMemo } from 'react';
import {
  Users2,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Shield,
  Edit,
  Trash2,
  X,
  Save,
  KeyRound,
  Check,
  Lock,
  MapPin,
  UserPlus,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Employee, UserRole } from '../../types';
import {
  useRealtimeAutoSave,
  loadDraftFromStorage,
  saveDraftToStorage,
  clearDraftFromStorage,
} from '../../hooks/useAutoSave';

const NEW_EMP_DRAFT_KEY = 'transmove_draft_hr_new_emp';
const NEW_INVITE_DRAFT_KEY = 'transmove_draft_hr_invite';

const ROLE_OPTIONS: { value: UserRole; label: string; color: string; defaultPermissions: string[] }[] = [
  {
    value: 'admin',
    label: 'Administrateur',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    defaultPermissions: [
      'dashboard',
      'appointments',
      'volume',
      'quotes',
      'dispatch',
      'operations',
      'accounting',
      'shipping',
      'customs',
      'stock',
      'fleet',
      'hr',
      'emails',
      'automations',
    ],
  },
  {
    value: 'manager',
    label: 'Direction / Manager',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    defaultPermissions: [
      'dashboard',
      'appointments',
      'volume',
      'quotes',
      'dispatch',
      'operations',
      'accounting',
      'shipping',
      'customs',
      'stock',
      'fleet',
      'hr',
      'emails',
      'automations',
    ],
  },
  {
    value: 'commercial',
    label: 'Commercial',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    defaultPermissions: ['appointments', 'volume', 'quotes', 'shipping', 'customs', 'emails'],
  },
  {
    value: 'dispatcher',
    label: 'Coordinateur / Dispatch',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    defaultPermissions: [
      'dashboard',
      'appointments',
      'dispatch',
      'operations',
      'shipping',
      'customs',
      'stock',
      'fleet',
      'emails',
    ],
  },
  {
    value: 'driver',
    label: 'Chauffeur / Team Leader',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    defaultPermissions: ['volume', 'dispatch', 'operations'],
  },
  {
    value: 'accountant',
    label: 'Comptable',
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    defaultPermissions: ['dashboard', 'quotes', 'accounting', 'emails'],
  },
  {
    value: 'warehouse',
    label: 'Magasinier / Stock',
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    defaultPermissions: ['stock', 'dispatch'],
  },
  {
    value: 'fleet_manager',
    label: 'Responsable Flotte',
    color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    defaultPermissions: ['dashboard', 'fleet', 'dispatch'],
  },
  {
    value: 'hr',
    label: 'Ressources Humaines',
    color: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    defaultPermissions: ['hr', 'emails'],
  },
  {
    value: 'client',
    label: 'Espace Client',
    color: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    defaultPermissions: ['client-portal'],
  },
];

const MODULE_PERMISSIONS: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'Tableaux de Bord' },
  { id: 'appointments', label: '1. Demandes & RDV' },
  { id: 'volume', label: '2. Estimation Volume' },
  { id: 'quotes', label: '3. Devis & Contrats' },
  { id: 'dispatch', label: '4. Planning Opérations' },
  { id: 'operations', label: '5. Suivi & Team Leader' },
  { id: 'accounting', label: '6. Comptabilité & Factures' },
  { id: 'shipping', label: '7. Compagnies Maritimes' },
  { id: 'customs', label: '8. Transit & Douane' },
  { id: 'stock', label: '9. Stock & Matériel' },
  { id: 'fleet', label: '10. Gestion Flotte & GPS' },
  { id: 'hr', label: '11. Ressources Humaines' },
  { id: 'emails', label: '12. Messagerie Intégrée' },
  { id: 'automations', label: 'Moteur Automatisations' },
];

const STATUS_BADGES: Record<Employee['status'], { label: string; color: string; dot: string }> = {
  actif: { label: 'Actif & Disponible', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  en_mission: { label: 'En mission', color: 'text-amber-400', dot: 'bg-amber-400' },
  en_conge: { label: 'En congé', color: 'text-blue-400', dot: 'bg-blue-400' },
  arret: { label: 'Arrêt', color: 'text-rose-400', dot: 'bg-rose-400' },
};

export const HumanResourcesModule: React.FC = () => {
  const {
    employees,
    activeRole,
    currentCompany,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    invitations,
    userAccounts,
    upsertInvitation,
    toggleInvitationStatus,
    deleteInvitation,
    notify,
  } = useApp();

  const isAdmin = activeRole === 'admin';
  const [hrTab, setHrTab] = useState<'staff' | 'invitations'>('staff');
  const initialInviteDraft = useMemo(
    () =>
      loadDraftFromStorage(NEW_INVITE_DRAFT_KEY, {
        inviteEmail: '',
        inviteName: '',
        inviteRole: 'client' as UserRole,
      }),
    []
  );
  const [inviteEmail, setInviteEmail] = useState(initialInviteDraft.inviteEmail);
  const [inviteName, setInviteName] = useState(initialInviteDraft.inviteName);
  const [inviteRole, setInviteRole] = useState<UserRole>(initialInviteDraft.inviteRole);
  const [isSavingInvite, setIsSavingInvite] = useState(false);

  useEffect(() => {
    saveDraftToStorage(NEW_INVITE_DRAFT_KEY, { inviteEmail, inviteName, inviteRole });
  }, [inviteEmail, inviteName, inviteRole]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('driver');
  const [teamName, setTeamName] = useState('Équipe Alpha Déménagement');
  const [contractType, setContractType] = useState<Employee['contractType']>('CDI');
  const [status, setStatus] = useState<Employee['status']>('actif');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlySalary, setMonthlySalary] = useState(1800);
  const [hourlyRate, setHourlyRate] = useState(15);
  const [completedMissionsCount, setCompletedMissionsCount] = useState(0);
  const [performanceRating, setPerformanceRating] = useState(4.8);
  const [formPermissions, setFormPermissions] = useState<string[]>(['volume', 'dispatch', 'operations']);

  // Dedicated Access Rights Modal State
  const [accessModalEmployee, setAccessModalEmployee] = useState<Employee | null>(null);
  const [accessRole, setAccessRole] = useState<UserRole>('driver');
  const [accessPermissions, setAccessPermissions] = useState<string[]>([]);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const editEmpAutoSaveData = useMemo(
    () => ({
      firstName,
      lastName,
      role,
      formPermissions,
      teamName,
      contractType,
      status,
      phone,
      email,
      address,
      hireDate,
      monthlySalary,
      hourlyRate,
      completedMissionsCount,
      performanceRating,
    }),
    [
      firstName,
      lastName,
      role,
      formPermissions,
      teamName,
      contractType,
      status,
      phone,
      email,
      address,
      hireDate,
      monthlySalary,
      hourlyRate,
      completedMissionsCount,
      performanceRating,
    ]
  );

  // Real-time localStorage draft for new employee creation
  useEffect(() => {
    if (isFormModalOpen && !editingEmployeeId && (firstName || lastName || email)) {
      saveDraftToStorage(NEW_EMP_DRAFT_KEY, editEmpAutoSaveData);
    }
  }, [isFormModalOpen, editingEmployeeId, firstName, lastName, email, editEmpAutoSaveData]);

  // Real-time Firestore auto-save when editing an existing employee
  const { cancelPending: cancelEmployeeAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(isAdmin && isFormModalOpen && editingEmployeeId),
    data: editEmpAutoSaveData,
    resetKey: editingEmployeeId || 'none',
    delayMs: 650,
    onSave: (d) => {
      if (!editingEmployeeId || !d.firstName.trim() || !d.lastName.trim() || !d.email.trim()) return;
      const existing = employees.find((emp) => emp.id === editingEmployeeId);
      if (!existing) return;
      updateEmployee(
        {
          ...existing,
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
          role: d.role,
          permissions: d.formPermissions,
          teamName: d.teamName.trim(),
          contractType: d.contractType,
          status: d.status,
          phone: d.phone.trim(),
          email: d.email.trim(),
          address: d.address.trim(),
          hireDate: d.hireDate,
          monthlySalary: Number(d.monthlySalary),
          hourlyRate: Number(d.hourlyRate),
          completedMissionsCount: Number(d.completedMissionsCount),
          performanceRating: Number(d.performanceRating),
        },
        { silent: true }
      );
    },
  });

  // Real-time Firestore auto-save when modifying access permissions
  const accessAutoSaveData = useMemo(
    () => ({ accessRole, accessPermissions }),
    [accessRole, accessPermissions]
  );
  const { cancelPending: cancelAccessAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(isAdmin && accessModalEmployee),
    data: accessAutoSaveData,
    resetKey: accessModalEmployee?.id || 'none',
    delayMs: 450,
    onSave: (d) => {
      if (!accessModalEmployee) return;
      updateEmployee(
        {
          ...accessModalEmployee,
          role: d.accessRole,
          permissions: d.accessPermissions,
        },
        { silent: true }
      );
    },
  });

  const filteredStaff = employees.filter((e) => {
    const matchesSearch =
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmployeeId) || filteredStaff[0] || employees[0] || null;

  const getRoleMeta = (r: UserRole) =>
    ROLE_OPTIONS.find((opt) => opt.value === r) || {
      value: r,
      label: r,
      color: 'bg-slate-800 text-slate-300 border-slate-700',
      defaultPermissions: [],
    };

  const openCreateModal = () => {
    if (!isAdmin) {
      notify('Accès restreint', 'Seul un administrateur peut ajouter un employé.', 'warning');
      return;
    }
    cancelEmployeeAutoSave();
    setEditingEmployeeId(null);
    const saved = loadDraftFromStorage<typeof editEmpAutoSaveData | null>(NEW_EMP_DRAFT_KEY, null);
    if (saved) {
      setFirstName(saved.firstName || '');
      setLastName(saved.lastName || '');
      setRole(saved.role || 'driver');
      setTeamName(saved.teamName || 'Équipe Alpha Déménagement');
      setContractType(saved.contractType || 'CDI');
      setStatus(saved.status || 'actif');
      setPhone(saved.phone || '');
      setEmail(saved.email || '');
      setAddress(saved.address || '');
      setHireDate(saved.hireDate || new Date().toISOString().split('T')[0]);
      setMonthlySalary(saved.monthlySalary ?? 1800);
      setHourlyRate(saved.hourlyRate ?? 15);
      setCompletedMissionsCount(saved.completedMissionsCount ?? 0);
      setPerformanceRating(saved.performanceRating ?? 4.8);
      setFormPermissions(saved.formPermissions || getRoleMeta('driver').defaultPermissions);
    } else {
      setFirstName('');
      setLastName('');
      setRole('driver');
      setTeamName('Équipe Alpha Déménagement');
      setContractType('CDI');
      setStatus('actif');
      setPhone('');
      setEmail('');
      setAddress('');
      setHireDate(new Date().toISOString().split('T')[0]);
      setMonthlySalary(1800);
      setHourlyRate(15);
      setCompletedMissionsCount(0);
      setPerformanceRating(4.8);
      setFormPermissions(getRoleMeta('driver').defaultPermissions);
    }
    setIsFormModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    if (!isAdmin) {
      notify('Accès restreint', 'Seul un administrateur peut modifier une fiche employé.', 'warning');
      return;
    }
    cancelEmployeeAutoSave();
    setEditingEmployeeId(emp.id);
    setFirstName(emp.firstName);
    setLastName(emp.lastName);
    setRole(emp.role);
    setTeamName(emp.teamName);
    setContractType(emp.contractType);
    setStatus(emp.status);
    setPhone(emp.phone);
    setEmail(emp.email);
    setAddress(emp.address);
    setHireDate(emp.hireDate);
    setMonthlySalary(emp.monthlySalary);
    setHourlyRate(emp.hourlyRate);
    setCompletedMissionsCount(emp.completedMissionsCount);
    setPerformanceRating(emp.performanceRating);
    setFormPermissions(emp.permissions || getRoleMeta(emp.role).defaultPermissions);
    setIsFormModalOpen(true);
  };

  const handleRoleChangeInForm = (nextRole: UserRole) => {
    setRole(nextRole);
    setFormPermissions(getRoleMeta(nextRole).defaultPermissions);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      notify('Champs obligatoires', 'Veuillez renseigner prénom, nom et email.', 'warning');
      return;
    }
    cancelEmployeeAutoSave();

    if (editingEmployeeId) {
      const existing = employees.find((emp) => emp.id === editingEmployeeId);
      if (existing) {
        updateEmployee({
          ...existing,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          permissions: formPermissions,
          teamName: teamName.trim(),
          contractType,
          status,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          hireDate,
          monthlySalary: Number(monthlySalary),
          hourlyRate: Number(hourlyRate),
          completedMissionsCount: Number(completedMissionsCount),
          performanceRating: Number(performanceRating),
        });
        setSelectedEmployeeId(existing.id);
      }
    } else {
      const created = addEmployee({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        permissions: formPermissions,
        teamName: teamName.trim(),
        contractType,
        status,
        phone: phone.trim() || '+221 77 000 00 00',
        email: email.trim(),
        address: address.trim() || 'Dakar',
        hireDate,
        monthlySalary: Number(monthlySalary),
        hourlyRate: Number(hourlyRate),
        completedMissionsCount: Number(completedMissionsCount),
        performanceRating: Number(performanceRating),
      });
      clearDraftFromStorage(NEW_EMP_DRAFT_KEY);
      setSelectedEmployeeId(created.id);
    }

    setIsFormModalOpen(false);
  };

  const openAccessModal = (emp: Employee) => {
    if (!isAdmin) {
      notify('Accès restreint', 'Seul un administrateur peut attribuer les droits d’accès.', 'warning');
      return;
    }
    cancelAccessAutoSave();
    setAccessModalEmployee(emp);
    setAccessRole(emp.role);
    setAccessPermissions(emp.permissions || getRoleMeta(emp.role).defaultPermissions);
  };

  const toggleAccessPermission = (permId: string) => {
    setAccessPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveAccessRights = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessModalEmployee || !isAdmin) return;
    cancelAccessAutoSave();
    updateEmployee({
      ...accessModalEmployee,
      role: accessRole,
      permissions: accessPermissions,
    });
    setSelectedEmployeeId(accessModalEmployee.id);
    setAccessModalEmployee(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || !isAdmin) return;
    deleteEmployee(deleteTarget.id);
    if (selectedEmployeeId === deleteTarget.id) {
      const next = employees.find((e) => e.id !== deleteTarget.id);
      setSelectedEmployeeId(next?.id || '');
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 11
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Ressources Humaines, Équipes & Droits d’Accès
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestion du personnel, administration des fiches employés et attribution des droits d’accès aux modules
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isAdmin && (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Actions Admin uniquement</span>
            </span>
          )}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setHrTab('staff')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    hrTab === 'staff' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Employés ({employees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHrTab('invitations')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    hrTab === 'invitations' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Invitations & Accès ({invitations.length})
                </button>
              </div>
              {hrTab === 'staff' && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvel Employé</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {hrTab === 'invitations' && isAdmin ? (
        <div className="space-y-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!inviteEmail.trim() || !inviteName.trim()) return;
              setIsSavingInvite(true);
              try {
                await upsertInvitation({
                  email: inviteEmail.trim().toLowerCase(),
                  displayName: inviteName.trim(),
                  role: inviteRole,
                  permissions: getRoleMeta(inviteRole).defaultPermissions,
                  isActive: true,
                });
                clearDraftFromStorage(NEW_INVITE_DRAFT_KEY);
                setInviteEmail('');
                setInviteName('');
                setInviteRole('client');
              } finally {
                setIsSavingInvite(false);
              }
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>Inviter un Client ou un Collaborateur (Connexion Google)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Email Google *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="client@exemple.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Nom affiché *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nom Client ou Collaborateur"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Rôle attribué</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSavingInvite}
                  className="w-full py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {isSavingInvite ? 'Enregistrement...' : 'Autoriser l’accès'}
                </button>
              </div>
            </div>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-white mb-3">
              Comptes & Invitations Actives ({invitations.length})
            </h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Nom</th>
                  <th className="py-2 px-3">Rôle</th>
                  <th className="py-2 px-3">Statut Compte</th>
                  <th className="py-2 px-3">Dernière connexion</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invitations.map((inv) => {
                  const linkedUser = userAccounts.find((u) => u.email.toLowerCase() === inv.email.toLowerCase());
                  const meta = getRoleMeta(inv.role);
                  return (
                    <tr key={inv.email} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-white">{inv.email}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-semibold">{inv.displayName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {inv.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                            <Ban className="w-3.5 h-3.5" /> Suspendu
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {linkedUser?.lastLoginAt
                          ? new Date(linkedUser.lastLoginAt).toLocaleString('fr-FR')
                          : 'Jamais connecté'}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => toggleInvitationStatus(inv.email, !inv.isActive)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
                        >
                          {inv.isActive ? 'Suspendre' : 'Réactiver'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteInvitation(inv.email)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                          title="Supprimer invitation"
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
        </div>
      ) : (
        <>

      {/* Search & Role Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un employé par nom, équipe, email ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="all">Tous les rôles ({employees.length})</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStaff.map((emp) => {
          const isSelected = selectedEmployee?.id === emp.id;
          const roleMeta = getRoleMeta(emp.role);
          const statusMeta = STATUS_BADGES[emp.status] || STATUS_BADGES.actif;
          const permsCount = (emp.permissions || roleMeta.defaultPermissions).length;

          return (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployeeId(emp.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/80 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {emp.contractType}
                  </span>
                  <div className="flex items-center text-amber-400 text-xs font-bold gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{emp.performanceRating}</span>
                  </div>
                </div>

                <h4 className="font-bold text-white text-base">
                  {emp.firstName} {emp.lastName}
                </h4>
                <div className="text-xs text-amber-400 font-semibold">{emp.teamName}</div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.color}`}>
                    {roleMeta.label}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                    {permsCount} module(s)
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">Missions réalisées :</span>
                    <span className="font-bold text-white">{emp.completedMissionsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Salaire mensuel :</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {emp.monthlySalary.toLocaleString()} {currentCompany.currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`${statusMeta.color} flex items-center gap-1 font-semibold`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                    {statusMeta.label}
                  </span>
                  <span className="text-slate-500">{emp.hireDate}</span>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAccessModal(emp);
                      }}
                      title="Attribuer les droits d'accès"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[10px] font-bold border border-cyan-500/30 transition"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Droits</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(emp);
                      }}
                      title="Modifier l'employé"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-bold border border-amber-500/30 transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(emp);
                      }}
                      title="Supprimer l'employé"
                      className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-slate-950 border border-rose-500/30 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Employee Access & Profile Summary Panel */}
      {selectedEmployee && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                {selectedEmployee.firstName[0]}
                {selectedEmployee.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      getRoleMeta(selectedEmployee.role).color
                    }`}
                  >
                    {getRoleMeta(selectedEmployee.role).label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 mt-0.5">
                  <span>{selectedEmployee.teamName}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" /> {selectedEmployee.address}
                  </span>
                  <span>Taux horaire : {selectedEmployee.hourlyRate} {currentCompany.currency}/h</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAccessModal(selectedEmployee)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs border border-cyan-500/40 transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Gérer les Droits d’Accès</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedEmployee)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs border border-amber-500/40 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Modifier Fiche</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(selectedEmployee)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 font-bold text-xs border border-rose-500/40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modules autorisés pour cet employé :</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODULE_PERMISSIONS.map((mod) => {
                const activePerms =
                  selectedEmployee.permissions || getRoleMeta(selectedEmployee.role).defaultPermissions;
                const hasAccess = activePerms.includes(mod.id);
                return (
                  <span
                    key={mod.id}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 ${
                      hasAccess
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
                    }`}
                  >
                    {hasAccess && <Check className="w-3 h-3 text-emerald-400" />}
                    <span>{mod.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Employee */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-amber-400" />
                {editingEmployeeId ? 'Modifier la Fiche Employé' : 'Ajouter un Nouvel Employé'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ex: Ibrahima"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ex: Diop"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email professionnel *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@transmove-erp.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Équipe / Service</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="ex: Équipe Alpha Déménagement"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Adresse</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ex: Plateau, Dakar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-amber-300 font-semibold mb-1">Rôle / Profil d’accès</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChangeInForm(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-2 text-white font-semibold"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type de contrat</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as Employee['contractType'])}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Intérim">Intérim</option>
                    <option value="Prestataire">Prestataire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Employee['status'])}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="actif">Actif & Disponible</option>
                    <option value="en_mission">En mission</option>
                    <option value="en_conge">En congé</option>
                    <option value="arret">Arrêt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date d’embauche</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Salaire mensuel ({currentCompany.currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Taux horaire</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Missions réalisées</label>
                  <input
                    type="number"
                    min={0}
                    value={completedMissionsCount}
                    onChange={(e) => setCompletedMissionsCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Note (1 à 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    value={performanceRating}
                    onChange={(e) => setPerformanceRating(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Quick Permissions Checkboxes inside Add/Edit Modal */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Droits d’accès modules attribués ({formPermissions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormPermissions(getRoleMeta(role).defaultPermissions)}
                    className="text-[11px] text-amber-400 hover:underline font-semibold"
                  >
                    Réinitialiser selon rôle
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {MODULE_PERMISSIONS.map((mod) => {
                    const checked = formPermissions.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-[11px] transition ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setFormPermissions((prev) =>
                              prev.includes(mod.id)
                                ? prev.filter((p) => p !== mod.id)
                                : [...prev, mod.id]
                            )
                          }
                          className="rounded border-slate-700 text-amber-500"
                        />
                        <span className="truncate">{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingEmployeeId ? 'Enregistrer les modifications' : 'Créer l’employé'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Attribution des Droits d'Accès */}
      {accessModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Droits d’Accès — {accessModalEmployee.firstName} {accessModalEmployee.lastName}
              </h2>
              <button
                type="button"
                onClick={() => setAccessModalEmployee(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccessRights} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Rôle ERP attribué</label>
                <div className="flex gap-2">
                  <select
                    value={accessRole}
                    onChange={(e) => setAccessRole(e.target.value as UserRole)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAccessPermissions(getRoleMeta(accessRole).defaultPermissions)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-700"
                  >
                    Droits par défaut
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Autorisations par module</span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAccessPermissions(MODULE_PERMISSIONS.map((m) => m.id))}
                      className="text-cyan-400 hover:underline font-semibold"
                    >
                      Tout cocher
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setAccessPermissions([])}
                      className="text-rose-400 hover:underline font-semibold"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                  {MODULE_PERMISSIONS.map((mod) => {
                    const checked = accessPermissions.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition ${
                          checked
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-white font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAccessPermission(mod.id)}
                            className="rounded border-slate-700 text-amber-500"
                          />
                          <span>{mod.label}</span>
                        </div>
                        {checked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAccessModalEmployee(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Shield className="w-4 h-4" />
                  <span>Enregistrer les droits d’accès</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirmer la suppression</h3>
                <p className="text-slate-400 mt-0.5">
                  Voulez-vous vraiment supprimer la fiche de{' '}
                  <strong className="text-white">
                    {deleteTarget.firstName} {deleteTarget.lastName}
                  </strong>{' '}
                  ?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
