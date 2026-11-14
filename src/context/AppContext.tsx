import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  BOOTSTRAP_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
  sanitizeForFirestore,
  erpGoogleSignIn,
  erpGoogleSignOut,
  getFirebaseIdToken,
} from '../services/firebaseClient';
import {
  googleSignIn as driveGoogleSignIn,
  googleSignOut as driveGoogleSignOut,
  initAuth as initDriveAuth,
} from '../services/firebaseAuth';
import {
  UserRole,
  CompanySettings,
  UserAccount,
  Invitation,
  ShippingEquipment,
  Appointment,
  VolumeEstimation,
  Quote,
  Chantier,
  ChantierIncident,
  Invoice,
  Expense,
  TransitShipment,
  TransitDocument,
  ShippingLine,
  StockItem,
  StockMovement,
  Vehicle,
  Employee,
  EmailMessage,
  AutomationLog,
  PaymentMethod,
  TransitStatus,
  ChantierStatus,
} from '../types';
import {
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_PERMISSIONS_BY_ROLE,
  INITIAL_SHIPPING_EQUIPMENT,
  INITIAL_APPOINTMENTS,
  INITIAL_QUOTES,
  INITIAL_CHANTIERS,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  INITIAL_TRANSIT_SHIPMENTS,
  INITIAL_SHIPPING_LINES,
  INITIAL_STOCK,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_VEHICLES,
  INITIAL_EMPLOYEES,
  INITIAL_EMAILS,
  INITIAL_AUTOMATION_LOGS,
} from '../data/initialData';

export type CompanyTenant = CompanySettings;

export interface NotificationToast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
}

export type AuthStatus = 'loading' | 'unauthenticated' | 'unauthorized' | 'authenticated' | 'error';

const DEFAULT_CUSTOM_PORTS = [
  'Dakar (PAD)',
  'Le Havre (HAROPA)',
  'Marseille-Fos',
  'Anvers',
  'Abidjan',
  'Lomé',
  'Casablanca',
  'Shenzhen',
  'Rotterdam',
  'Valence',
  'Gênes',
  'Douala',
  'Cotonou',
  'Tema',
  'Pointe-Noire',
  'Bamako (Voie Terrestre)',
  'Ouagadougou (Voie Terrestre)',
  'Conakry',
  'Nouakchott',
];

interface AppContextType {
  // Auth & RBAC
  firebaseUser: FirebaseUser | null;
  authStatus: AuthStatus;
  authError: string | null;
  currentUserProfile: UserAccount | null;
  impersonatedRole: UserRole | null;
  setImpersonatedRole: (role: UserRole | null) => void;
  effectivePermissions: string[];
  hasPermission: (moduleId: string) => boolean;
  signInToErp: () => Promise<void>;
  signOutFromErp: () => Promise<void>;
  retryAuthBootstrap: () => void;

  // Single-Company Settings & Navigation
  currentCompany: CompanySettings;
  companySettings: CompanySettings;
  updateCompanySettings: (next: CompanySettings, opts?: { silent?: boolean }) => Promise<void>;
  activeRole: UserRole;
  setActiveRole: (r: UserRole) => void;
  activeModule: string;
  setActiveModule: (m: string) => void;
  focusedChantierId: string | null;
  setFocusedChantierId: (id: string | null) => void;

  // Invitations & User Accounts (Admin)
  invitations: Invitation[];
  userAccounts: UserAccount[];
  upsertInvitation: (inv: Omit<Invitation, 'createdAt' | 'updatedAt'>, opts?: { silent?: boolean }) => Promise<void>;
  toggleInvitationStatus: (email: string, isActive: boolean) => Promise<void>;
  deleteInvitation: (email: string) => Promise<void>;

  // Data Collections
  appointments: Appointment[];
  volumeEstimations: VolumeEstimation[];
  quotes: Quote[];
  chantiers: Chantier[];
  invoices: Invoice[];
  expenses: Expense[];
  transitShipments: TransitShipment[];
  shippingLines: ShippingLine[];
  shippingEquipment: ShippingEquipment[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  vehicles: Vehicle[];
  employees: Employee[];
  emails: EmailMessage[];
  automationLogs: AutomationLog[];
  notifications: NotificationToast[];
  smtpConfigured: boolean;

  // Action methods with Firestore Persistence & Automations
  createAppointment: (apt: Omit<Appointment, 'id' | 'code' | 'createdAt'>) => Appointment;
  updateAppointment: (updated: Appointment, opts?: { silent?: boolean }) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  updateAppointmentVolume: (id: string, volumeM3: number, notes?: string, opts?: { silent?: boolean }) => void;
  saveVolumeEstimation: (est: Omit<VolumeEstimation, 'id' | 'createdAt'> & { id?: string }) => Promise<VolumeEstimation>;
  createQuote: (quoteData: Omit<Quote, 'id' | 'number' | 'version' | 'createdAt'>) => Quote;
  updateQuote: (updatedQuote: Quote, opts?: { silent?: boolean }) => void;
  acceptQuote: (quoteId: string) => void;
  refuseQuote: (quoteId: string) => void;
  createChantier: (data: Omit<Chantier, 'id' | 'code'>) => Chantier;
  updateChantier: (updated: Chantier, opts?: { silent?: boolean }) => void;
  updateChantierStatus: (
    id: string,
    status: ChantierStatus,
    photos?: { url: string; caption: string; stage: 'avant' | 'pendant' | 'apres' }[],
    signature?: { dataUrl: string; signerName: string }
  ) => void;
  addChantierIncident: (chantierId: string, incident: Omit<ChantierIncident, 'id'>) => void;
  resolveChantierIncident: (chantierId: string, incidentId: string) => void;
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'number'>) => Invoice;
  recordInvoicePayment: (invoiceId: string, amount: number, method: PaymentMethod, reference: string) => void;
  sendInvoiceReminder: (invoiceId: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  createTransitShipment: (shipmentData: Omit<TransitShipment, 'id' | 'reference'>) => TransitShipment;
  updateTransitShipment: (updated: TransitShipment, opts?: { silent?: boolean }) => void;
  updateTransitStatus: (shipmentId: string, status: TransitStatus) => void;
  toggleTransitDocStatus: (shipmentId: string, docId: string) => void;
  updateTransitDocument: (shipmentId: string, docId: string, patch: Partial<TransitDocument>) => void;
  adjustStock: (itemId: string, qtyDelta: number, reason: string, type: 'entree' | 'sortie') => void;
  addStockItem: (item: Omit<StockItem, 'id'>) => StockItem;
  updateStockItem: (item: StockItem, opts?: { silent?: boolean }) => void;
  updateVehicleStatus: (vehicleId: string, status: Vehicle['status']) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Vehicle;
  updateVehicle: (vehicle: Vehicle, opts?: { silent?: boolean }) => void;
  deleteVehicle: (vehicleId: string) => void;
  updateVehicleLocation: (vehicleId: string, location: Vehicle['currentLocation']) => void;
  addEmployee: (emp: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (updated: Employee, opts?: { silent?: boolean }) => void;
  deleteEmployee: (id: string) => void;
  sendEmailMessage: (msg: Omit<EmailMessage, 'id' | 'date'>) => Promise<{ delivered: boolean; error?: string }>;
  deleteEmailMessage: (id: string) => void;
  addShippingLine: (line: Omit<ShippingLine, 'id'>) => void;
  updateShippingRoute: (lineId: string, routeIndex: number, newRate20: number, newRate40: number, newDays: number, rateTruck?: number, opts?: { silent?: boolean }) => void;
  customPorts: string[];
  addShippingPort: (port: string) => void;
  setShippingEquipmentList: (list: ShippingEquipment[]) => Promise<void>;
  removeNotification: (id: string) => void;
  notify: (title: string, message: string, type?: NotificationToast['type']) => void;
  triggerEndToEndAutomationDemo: () => void;

  // Google Drive & Backup
  googleUser: FirebaseUser | null;
  googleToken: string | null;
  isGoogleConnected: boolean;
  connectGoogleDrive: () => Promise<string | null>;
  disconnectGoogleDrive: () => Promise<void>;
  lastBackupDate: string | null;
  setLastBackupDate: (date: string | null) => void;
  exportStateSnapshot: () => Record<string, unknown>;
  restoreStateSnapshot: (snapshot: Record<string, unknown>) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth & RBAC state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserAccount | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);
  const [authCheckNonce, setAuthCheckNonce] = useState(0);

  // Navigation & UI focus
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [focusedChantierId, setFocusedChantierId] = useState<string | null>(null);

  // Single-company settings & shipping config
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [customPorts, setCustomPorts] = useState<string[]>(DEFAULT_CUSTOM_PORTS);
  const [shippingEquipment, setShippingEquipment] = useState<ShippingEquipment[]>(INITIAL_SHIPPING_EQUIPMENT);

  // Access management (admin)
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

  // ERP Collections (empty until authorized & synced from Firestore)
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [volumeEstimations, setVolumeEstimations] = useState<VolumeEstimation[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transitShipments, setTransitShipments] = useState<TransitShipment[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);

  const notify = useCallback((title: string, message: string, type: NotificationToast['type'] = 'info') => {
    const newNotif: NotificationToast = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 7)]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Safe Firestore write helper
  const persistDoc = useCallback(
    async (colPath: string, docId: string, data: unknown, op: OperationType = OperationType.WRITE) => {
      try {
        const sanitized = sanitizeForFirestore(data) as Record<string, unknown>;
        await setDoc(doc(db, colPath, docId), sanitized, { merge: true });
      } catch (error) {
        notify('Erreur synchronisation', `Échec d'enregistrement sur ${colPath}/${docId}`, 'error');
        handleFirestoreError(error, op, `${colPath}/${docId}`);
      }
    },
    [notify]
  );

  // Seed initial ERP data once when database is brand new (called only by admin)
  const seedInitialDatabaseIfEmpty = useCallback(async (adminEmail: string) => {
    const settingsRef = doc(db, 'settings', 'company');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) return;

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    batch.set(settingsRef, sanitizeForFirestore({ ...DEFAULT_COMPANY_SETTINGS, updatedAt: now }));
    batch.set(
      doc(db, 'settings', 'shipping_config'),
      sanitizeForFirestore({
        customPorts: DEFAULT_CUSTOM_PORTS,
        equipmentList: INITIAL_SHIPPING_EQUIPMENT,
        updatedAt: now,
      })
    );

    const seedList = <T extends { id: string }>(col: string, items: T[]) => {
      items.forEach((item) => {
        batch.set(doc(db, col, item.id), sanitizeForFirestore(item));
      });
    };

    seedList('appointments', INITIAL_APPOINTMENTS);
    seedList('quotes', INITIAL_QUOTES);
    seedList('chantiers', INITIAL_CHANTIERS);
    seedList('invoices', INITIAL_INVOICES);
    seedList('expenses', INITIAL_EXPENSES);
    seedList('transitShipments', INITIAL_TRANSIT_SHIPMENTS);
    seedList('shippingLines', INITIAL_SHIPPING_LINES);
    seedList('stockItems', INITIAL_STOCK);
    seedList('stockMovements', INITIAL_STOCK_MOVEMENTS);
    seedList('vehicles', INITIAL_VEHICLES);
    seedList('employees', INITIAL_EMPLOYEES);
    seedList('emails', INITIAL_EMAILS);
    seedList('automationLogs', INITIAL_AUTOMATION_LOGS);

    // Seed invitations for initial employees & demo clients so invited users can sign in
    INITIAL_EMPLOYEES.forEach((emp) => {
      const emailKey = emp.email.trim().toLowerCase();
      batch.set(
        doc(db, 'invitations', emailKey),
        sanitizeForFirestore({
          email: emailKey,
          displayName: `${emp.firstName} ${emp.lastName}`,
          role: emp.role,
          permissions: emp.permissions || DEFAULT_PERMISSIONS_BY_ROLE[emp.role] || [],
          employeeId: emp.id,
          isActive: emp.status !== 'arret',
          invitedBy: adminEmail,
          createdAt: now,
          updatedAt: now,
        })
      );
    });

    await batch.commit();
  }, []);

  // Check SMTP status once authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    fetch('/api/emails/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.configured === 'boolean') {
          setSmtpConfigured(data.configured);
        }
      })
      .catch(() => {
        setSmtpConfigured(false);
      });
  }, [authStatus]);

  // Auth state listener & user/invitation resolution
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setImpersonatedRole(null);

      if (!user) {
        setCurrentUserProfile(null);
        setAuthStatus('unauthenticated');
        setAuthError(null);
        return;
      }

      if (!user.email || !user.emailVerified) {
        setCurrentUserProfile(null);
        setAuthStatus('unauthorized');
        setAuthError("Votre adresse email Google n'est pas vérifiée.");
        return;
      }

      setAuthStatus('loading');
      setAuthError(null);

      try {
        const emailLower = user.email.trim().toLowerCase();
        const isBootstrap = emailLower === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
        const now = new Date().toISOString();

        const userRef = doc(db, 'users', user.uid);
        const invRef = doc(db, 'invitations', emailLower);

        const [userSnap, invSnap] = await Promise.all([getDoc(userRef), getDoc(invRef)]);

        const existingUser = userSnap.exists() ? (userSnap.data() as UserAccount) : null;
        const invitation = invSnap.exists() ? (invSnap.data() as Invitation) : null;

        // Authorization gate
        if (!isBootstrap) {
          if (existingUser && !existingUser.isActive) {
            setCurrentUserProfile(null);
            setAuthStatus('unauthorized');
            return;
          }
          if (!existingUser && (!invitation || !invitation.isActive)) {
            setCurrentUserProfile(null);
            setAuthStatus('unauthorized');
            return;
          }
          if (invitation && !invitation.isActive) {
            setCurrentUserProfile(null);
            setAuthStatus('unauthorized');
            return;
          }
        }

        const resolvedRole: UserRole = isBootstrap
          ? 'admin'
          : invitation?.role || existingUser?.role || 'client';

        const resolvedPermissions: string[] = isBootstrap
          ? DEFAULT_PERMISSIONS_BY_ROLE.admin
          : invitation?.permissions?.length
          ? invitation.permissions
          : existingUser?.permissions?.length
          ? existingUser.permissions
          : DEFAULT_PERMISSIONS_BY_ROLE[resolvedRole] || ['client-portal'];

        // Ensure role marker documents exist for O(1) Firestore rule verification
        if (resolvedRole === 'admin') {
          const adminMarkerRef = doc(db, 'admins', user.uid);
          const adminMarkerSnap = await getDoc(adminMarkerRef);
          if (!adminMarkerSnap.exists()) {
            await setDoc(adminMarkerRef, { email: emailLower, role: 'admin', createdAt: now });
          }
        }
        if (resolvedRole !== 'client') {
          const staffMarkerRef = doc(db, 'staff', user.uid);
          const staffMarkerSnap = await getDoc(staffMarkerRef);
          if (!staffMarkerSnap.exists()) {
            await setDoc(staffMarkerRef, { email: emailLower, role: resolvedRole, createdAt: now });
          }
        }

        const profilePayload: UserAccount = sanitizeForFirestore({
          uid: user.uid,
          email: emailLower,
          displayName:
            invitation?.displayName ||
            existingUser?.displayName ||
            user.displayName ||
            emailLower.split('@')[0],
          role: resolvedRole,
          permissions: resolvedPermissions,
          employeeId: invitation?.employeeId || existingUser?.employeeId,
          isActive: true,
          invitedBy: invitation?.invitedBy || existingUser?.invitedBy || (isBootstrap ? 'system' : undefined),
          photoUrl: user.photoURL || existingUser?.photoUrl,
          createdAt: existingUser?.createdAt || now,
          updatedAt: now,
          lastLoginAt: now,
        });

        await setDoc(userRef, profilePayload, { merge: true });

        if (resolvedRole === 'admin') {
          await seedInitialDatabaseIfEmpty(emailLower);
        }

        setCurrentUserProfile(profilePayload);
        setActiveModule(resolvedRole === 'client' ? 'client-portal' : resolvedPermissions[0] || 'dashboard');
        setAuthStatus('authenticated');
      } catch (err: unknown) {
        console.error('Auth bootstrap error:', err);
        setAuthError(err instanceof Error ? err.message : 'Erreur de vérification du profil utilisateur.');
        setAuthStatus('error');
      }
    });

    return () => unsubscribe();
  }, [authCheckNonce, seedInitialDatabaseIfEmpty]);

  // Real-time Firestore listeners (attached ONLY when authenticated & active)
  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUserProfile || !currentUserProfile.isActive) {
      return;
    }

    const unsubs: Unsubscribe[] = [];
    const userEmail = currentUserProfile.email;
    const isClient = currentUserProfile.role === 'client';
    const isAdmin = currentUserProfile.role === 'admin';

    // 1. Company settings (readable by all verified users)
    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'company'),
        (snap) => {
          if (snap.exists()) {
            setCompanySettings(snap.data() as CompanySettings);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'settings/company')
      )
    );

    if (isClient) {
      // Client-scoped real-time queries ONLY (strictly matches firestore.rules)
      const clientCollections: Array<{
        path: string;
        setter: React.Dispatch<React.SetStateAction<any[]>>;
      }> = [
        { path: 'appointments', setter: setAppointments },
        { path: 'quotes', setter: setQuotes },
        { path: 'chantiers', setter: setChantiers },
        { path: 'invoices', setter: setInvoices },
      ];

      clientCollections.forEach(({ path, setter }) => {
        const q = query(collection(db, path), where('clientEmail', '==', userEmail));
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              setter(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
            (error) => handleFirestoreError(error, OperationType.LIST, path)
          )
        );
      });

      return () => {
        unsubs.forEach((u) => u());
      };
    }

    // Staff / Admin listeners
    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'shipping_config'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as {
              customPorts?: string[];
              equipmentList?: ShippingEquipment[];
            };
            if (Array.isArray(data.customPorts)) setCustomPorts(data.customPorts);
            if (Array.isArray(data.equipmentList)) setShippingEquipment(data.equipmentList);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'settings/shipping_config')
      )
    );

    const subscribeCol = <T,>(
      path: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      sortFn?: (a: T, b: T) => number
    ) => {
      unsubs.push(
        onSnapshot(
          collection(db, path),
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
            if (sortFn) list.sort(sortFn);
            setter(list);
          },
          (error) => handleFirestoreError(error, OperationType.LIST, path)
        )
      );
    };

    subscribeCol<Appointment>('appointments', setAppointments, (a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    subscribeCol<VolumeEstimation>('volumeEstimations', setVolumeEstimations, (a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    subscribeCol<Quote>('quotes', setQuotes, (a, b) => b.createdAt.localeCompare(a.createdAt));
    subscribeCol<Chantier>('chantiers', setChantiers, (a, b) =>
      b.scheduledDate.localeCompare(a.scheduledDate)
    );
    subscribeCol<Invoice>('invoices', setInvoices, (a, b) => b.issueDate.localeCompare(a.issueDate));
    subscribeCol<Expense>('expenses', setExpenses, (a, b) => b.date.localeCompare(a.date));
    subscribeCol<TransitShipment>('transitShipments', setTransitShipments, (a, b) =>
      b.etdDate.localeCompare(a.etdDate)
    );
    subscribeCol<ShippingLine>('shippingLines', setShippingLines);
    subscribeCol<StockItem>('stockItems', setStockItems);
    subscribeCol<StockMovement>('stockMovements', setStockMovements, (a, b) =>
      b.date.localeCompare(a.date)
    );
    subscribeCol<Vehicle>('vehicles', setVehicles);
    subscribeCol<Employee>('employees', setEmployees);
    subscribeCol<EmailMessage>('emails', setEmails, (a, b) => b.date.localeCompare(a.date));
    subscribeCol<AutomationLog>('automationLogs', setAutomationLogs, (a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'invitations'),
          (snap) => {
            setInvitations(snap.docs.map((d) => d.data() as Invitation));
          },
          (error) => handleFirestoreError(error, OperationType.LIST, 'invitations')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            setUserAccounts(snap.docs.map((d) => d.data() as UserAccount));
          },
          (error) => handleFirestoreError(error, OperationType.LIST, 'users')
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authStatus, currentUserProfile]);

  const activeRole: UserRole = useMemo(() => {
    if (currentUserProfile?.role === 'admin' && impersonatedRole) {
      return impersonatedRole;
    }
    return currentUserProfile?.role || 'client';
  }, [currentUserProfile, impersonatedRole]);

  const effectivePermissions: string[] = useMemo(() => {
    if (currentUserProfile?.role === 'admin' && impersonatedRole) {
      return DEFAULT_PERMISSIONS_BY_ROLE[impersonatedRole] || [];
    }
    if (currentUserProfile?.role === 'admin') {
      return DEFAULT_PERMISSIONS_BY_ROLE.admin;
    }
    if (currentUserProfile?.permissions?.length) {
      return currentUserProfile.permissions;
    }
    return DEFAULT_PERMISSIONS_BY_ROLE[activeRole] || ['client-portal'];
  }, [currentUserProfile, impersonatedRole, activeRole]);

  const hasPermission = useCallback(
    (moduleId: string) => {
      if (currentUserProfile?.role === 'admin' && !impersonatedRole) return true;
      return effectivePermissions.includes(moduleId);
    },
    [currentUserProfile, impersonatedRole, effectivePermissions]
  );

  const setActiveRole = useCallback(
    (nextRole: UserRole) => {
      if (currentUserProfile?.role === 'admin') {
        setImpersonatedRole(nextRole === 'admin' ? null : nextRole);
        const firstAllowed = DEFAULT_PERMISSIONS_BY_ROLE[nextRole]?.[0] || 'dashboard';
        setActiveModule(firstAllowed);
      }
    },
    [currentUserProfile]
  );

  const signInToErp = async () => {
    await erpGoogleSignIn();
  };

  const signOutFromErp = async () => {
    await erpGoogleSignOut();
    setCurrentUserProfile(null);
    setImpersonatedRole(null);
    setAuthStatus('unauthenticated');
  };

  const retryAuthBootstrap = () => {
    setAuthCheckNonce((n) => n + 1);
  };

  // Update Company Settings (Admin)
  const updateCompanySettings = async (next: CompanySettings, opts?: { silent?: boolean }) => {
    const payload: CompanySettings = {
      ...next,
      id: 'company-main',
      updatedAt: new Date().toISOString(),
    };
    setCompanySettings(payload);
    await persistDoc('settings', 'company', payload);
    if (!opts?.silent) {
      notify('Paramètres enregistrés', `Informations de ${payload.name} mises à jour.`, 'success');
    }
  };

  // Admin Invitation & Access Management
  const upsertInvitation = async (
    inv: Omit<Invitation, 'createdAt' | 'updatedAt'>,
    opts?: { silent?: boolean }
  ) => {
    const emailKey = inv.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = invitations.find((i) => i.email.toLowerCase() === emailKey);
    const payload: Invitation = {
      ...inv,
      email: emailKey,
      permissions: inv.permissions.length ? inv.permissions : DEFAULT_PERMISSIONS_BY_ROLE[inv.role] || [],
      invitedBy: currentUserProfile?.email || BOOTSTRAP_ADMIN_EMAIL,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await persistDoc('invitations', emailKey, payload);

    // Sync any already-logged-in user account with the same email
    const matchingUsers = userAccounts.filter((u) => u.email.toLowerCase() === emailKey);
    for (const u of matchingUsers) {
      await persistDoc('users', u.uid, {
        ...u,
        role: payload.role,
        permissions: payload.permissions,
        isActive: payload.isActive,
        displayName: payload.displayName,
        employeeId: payload.employeeId,
        updatedAt: now,
      });

      if (payload.isActive && payload.role === 'admin') {
        await setDoc(doc(db, 'admins', u.uid), { email: emailKey, role: 'admin', updatedAt: now });
      } else {
        await deleteDoc(doc(db, 'admins', u.uid)).catch(() => {});
      }

      if (payload.isActive && payload.role !== 'client') {
        await setDoc(doc(db, 'staff', u.uid), { email: emailKey, role: payload.role, updatedAt: now });
      } else {
        await deleteDoc(doc(db, 'staff', u.uid)).catch(() => {});
      }
    }

    if (!opts?.silent) {
      notify('Invitation enregistrée', `Accès configuré pour ${emailKey} (${payload.role}).`, 'success');
    }
  };

  const toggleInvitationStatus = async (email: string, isActive: boolean) => {
    const emailKey = email.trim().toLowerCase();
    const existing = invitations.find((i) => i.email.toLowerCase() === emailKey);
    if (!existing) return;
    await upsertInvitation({ ...existing, isActive });
  };

  const deleteInvitation = async (email: string) => {
    const emailKey = email.trim().toLowerCase();
    try {
      await deleteDoc(doc(db, 'invitations', emailKey));
      notify('Invitation supprimée', `L'accès pour ${emailKey} a été retiré.`, 'warning');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invitations/${emailKey}`);
    }
  };

  const logAutomation = useCallback(
    (
      triggerEvent: string,
      actionTaken: string,
      entityType: string,
      entityId: string,
      status: 'succes' | 'alerte' | 'erreur',
      details: string
    ) => {
      const newLog: AutomationLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        timestamp: new Date().toISOString(),
        triggerEvent,
        actionTaken,
        entityType,
        entityId,
        status,
        details,
      };
      setAutomationLogs((prev) => [newLog, ...prev]);
      void persistDoc('automationLogs', newLog.id, newLog, OperationType.CREATE);
    },
    [persistDoc]
  );

  // Real API email dispatcher helper
  const transmitEmailServerSide = useCallback(
    async (msg: EmailMessage): Promise<{ delivered: boolean; error?: string }> => {
      try {
        const token = await getFirebaseIdToken();
        const res = await fetch('/api/emails/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            to: msg.recipientEmail,
            subject: msg.subject,
            text: msg.body,
            senderName: msg.senderName || companySettings.name,
            replyTo: companySettings.email,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            delivered: false,
            error: data.error || `Erreur serveur email (${res.status})`,
          };
        }
        return { delivered: true };
      } catch (err: unknown) {
        return {
          delivered: false,
          error: err instanceof Error ? err.message : 'Serveur SMTP inaccessible',
        };
      }
    },
    [companySettings.email, companySettings.name]
  );

  // MODULE 1: Appointments
  const createAppointment = (aptData: Omit<Appointment, 'id' | 'code' | 'createdAt'>): Appointment => {
    const code = `RDV-2026-${String(appointments.length + 84).padStart(3, '0')}`;
    const newApt: Appointment = {
      ...aptData,
      clientEmail: aptData.clientEmail.trim().toLowerCase(),
      id: 'apt-' + Date.now(),
      code,
      createdAt: new Date().toISOString(),
    };
    setAppointments((prev) => [newApt, ...prev]);
    void persistDoc('appointments', newApt.id, newApt, OperationType.CREATE);

    notify(
      'Nouvelle demande enregistrée',
      `Dossier ${code} créé pour ${newApt.clientName}. Commercial affecté : ${newApt.assignedCommercialName}`,
      'success'
    );
    logAutomation(
      `Nouvelle demande de visite reçue (${code})`,
      `Création automatique de la fiche client & attribution commerciale à ${newApt.assignedCommercialName}`,
      'appointment',
      newApt.id,
      'succes',
      `Type: ${newApt.serviceType.toUpperCase()} | Trajet: ${newApt.originAddress} -> ${newApt.destinationAddress}`
    );

    return newApt;
  };

  const updateAppointment = (updated: Appointment, opts?: { silent?: boolean }) => {
    const normalized = { ...updated, clientEmail: updated.clientEmail.trim().toLowerCase() };
    setAppointments((prev) => prev.map((a) => (a.id === normalized.id ? normalized : a)));
    void persistDoc('appointments', normalized.id, normalized, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Fiche client mise à jour', `La fiche ${normalized.code} (${normalized.clientName}) a été enregistrée.`, 'success');
    }
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;
    const updated = { ...target, status };
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    void persistDoc('appointments', id, updated, OperationType.UPDATE);
    notify('Statut mis à jour', `La demande est désormais : ${status.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const updateAppointmentVolume = (
    id: string,
    volumeM3: number,
    notes?: string,
    opts?: { silent?: boolean }
  ) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;
    const updated: Appointment = {
      ...target,
      estimatedVolumeM3: volumeM3,
      notes: notes ? `${target.notes ? target.notes + ' | ' : ''}${notes}` : target.notes,
    };
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    void persistDoc('appointments', id, updated, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Volume d’estimation enregistré', `Volume de ${volumeM3} m³ enregistré pour la demande de visite.`, 'success');
    }
  };

  // MODULE 2: Volume Estimations persistence
  const saveVolumeEstimation = async (
    est: Omit<VolumeEstimation, 'id' | 'createdAt'> & { id?: string }
  ): Promise<VolumeEstimation> => {
    const estId = est.id || (est.appointmentId ? `est-${est.appointmentId}` : 'est-' + Date.now());
    const existing = volumeEstimations.find((v) => v.id === estId);
    const saved: VolumeEstimation = {
      ...est,
      id: estId,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    setVolumeEstimations((prev) => {
      const idx = prev.findIndex((v) => v.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    await persistDoc('volumeEstimations', saved.id, saved, OperationType.WRITE);
    return saved;
  };

  // MODULE 3: Quotes
  const updateQuote = (updatedQuote: Quote, opts?: { silent?: boolean }) => {
    const normalized = { ...updatedQuote, clientEmail: updatedQuote.clientEmail.trim().toLowerCase() };
    setQuotes((prev) => prev.map((q) => (q.id === normalized.id ? normalized : q)));
    void persistDoc('quotes', normalized.id, normalized, OperationType.UPDATE);
    if (!opts?.silent) {
      notify(
        'Devis mis à jour',
        `Le devis ${normalized.number} a été modifié avec succès. Total : ${normalized.total.toLocaleString()} ${normalized.currency}`,
        'success'
      );
    }
  };

  const createQuote = (quoteData: Omit<Quote, 'id' | 'number' | 'version' | 'createdAt'>): Quote => {
    const num = `DEV-2026-${String(quotes.length + 45).padStart(4, '0')}`;
    const newQuote: Quote = {
      ...quoteData,
      clientEmail: quoteData.clientEmail.trim().toLowerCase(),
      id: 'quo-' + Date.now(),
      number: num,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    setQuotes((prev) => [newQuote, ...prev]);
    void persistDoc('quotes', newQuote.id, newQuote, OperationType.CREATE);

    const newEmail: EmailMessage = {
      id: 'em-' + Date.now(),
      folder: 'sent',
      senderName: companySettings.name,
      senderEmail: companySettings.email,
      recipientEmail: newQuote.clientEmail,
      subject: `Proposition commerciale de déménagement #${newQuote.number}`,
      body: `Bonjour ${newQuote.clientName},\n\nVeuillez trouver ci-joint votre devis pour la prestation ${newQuote.serviceType}.\nMontant total : ${newQuote.total.toLocaleString()} ${newQuote.currency}.\n\nVous pouvez valider ce devis en ligne depuis votre Espace Client.\n\nCordialement,\n${companySettings.name}`,
      date: new Date().toISOString(),
      isRead: true,
      linkedEntityType: 'devis',
      linkedEntityId: newQuote.id,
      attachments: [{ name: `Devis_${newQuote.number}.pdf`, size: '1.1 MB' }],
    };
    setEmails((prev) => [newEmail, ...prev]);
    void persistDoc('emails', newEmail.id, newEmail, OperationType.CREATE);

    notify('Devis généré avec succès', `Devis ${num} enregistré (${newQuote.total} ${newQuote.currency}).`, 'success');
    logAutomation(
      `Devis ${num} créé`,
      `Enregistrement devis et notification préparée pour ${newQuote.clientEmail}`,
      'quote',
      newQuote.id,
      'succes',
      `Volume: ${newQuote.volumeM3}m³ | Total TTC: ${newQuote.total} ${newQuote.currency}`
    );

    return newQuote;
  };

  const refuseQuote = (quoteId: string) => {
    const targetQuote = quotes.find((q) => q.id === quoteId);
    if (!targetQuote) return;

    const updatedQuote: Quote = {
      ...targetQuote,
      status: 'refuse',
      acceptedAt: new Date().toISOString(),
    };
    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? updatedQuote : q)));

    if (currentUserProfile?.role === 'client') {
      void updateDoc(doc(db, 'quotes', quoteId), {
        status: 'refuse',
        acceptedAt: updatedQuote.acceptedAt,
      }).catch((error) => handleFirestoreError(error, OperationType.UPDATE, `quotes/${quoteId}`));
    } else {
      void persistDoc('quotes', quoteId, updatedQuote, OperationType.UPDATE);
    }
    notify('Devis refusé', `Le devis ${targetQuote.number} a été marqué comme refusé.`, 'warning');
  };

  // AUTOMATION: ACCEPT QUOTE -> CREATE CHANTIER & RESERVE STOCK (or client online acceptance)
  const acceptQuote = (quoteId: string) => {
    const targetQuote = quotes.find((q) => q.id === quoteId);
    if (!targetQuote) return;

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch {
      // safe fallback
    }

    const acceptedAt = new Date().toISOString();

    // If executed by a Client user in the Client Portal, Firestore rules allow updating status + acceptedAt only
    if (currentUserProfile?.role === 'client') {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'accepte', acceptedAt } : q))
      );
      void updateDoc(doc(db, 'quotes', quoteId), { status: 'accepte', acceptedAt }).catch((error) =>
        handleFirestoreError(error, OperationType.UPDATE, `quotes/${quoteId}`)
      );
      notify(
        'Devis accepté !',
        `Votre accord sur le devis ${targetQuote.number} a été transmis à notre équipe Opérations.`,
        'success'
      );
      return;
    }

    const chantierCode = `CH-2026-${String(chantiers.length + 90).padStart(4, '0')}`;
    const targetDate = targetQuote.validityDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

    const freeVehicle = vehicles.find((v) => v.status === 'disponible') || vehicles[0];
    const freeMovers = employees.filter((e) => e.role === 'driver').slice(0, 3);
    const leader = freeMovers[0] || employees[0];

    const boxesNeeded = Math.round(targetQuote.volumeM3 * 2.5);
    const rollsNeeded = Math.max(3, Math.round(targetQuote.volumeM3 * 0.3));

    const newChantier: Chantier = {
      id: 'cha-' + Date.now(),
      code: chantierCode,
      quoteId: targetQuote.id,
      clientName: targetQuote.clientName,
      clientEmail: targetQuote.clientEmail.trim().toLowerCase(),
      clientPhone: targetQuote.clientPhone,
      originAddress: targetQuote.originAddress,
      destinationAddress: targetQuote.destinationAddress,
      scheduledDate: targetDate,
      startTime: '08:00',
      estimatedEndTime: '15:30',
      volumeM3: targetQuote.volumeM3,
      actualVolumeM3: targetQuote.volumeM3,
      status: 'programme',
      teamLeaderId: leader?.id || 'emp-02',
      teamLeaderName: leader ? `${leader.firstName} ${leader.lastName} (Chef d’équipe)` : 'Chef d’équipe',
      moverIds: freeMovers.map((m) => m.id),
      moverNames: freeMovers.map((m) => `${m.firstName} ${m.lastName}`),
      vehicleId: freeVehicle?.id || 'veh-01',
      vehiclePlate: freeVehicle?.plateNumber || 'À affecter',
      vehicleName: freeVehicle ? `${freeVehicle.brand} ${freeVehicle.model}` : 'Véhicule standard',
      usedMaterials: [
        { materialName: 'Cartons standards renforcés', quantity: boxesNeeded },
        { materialName: 'Ruban adhésif pro', quantity: rollsNeeded },
        { materialName: 'Couvertures déménagement', quantity: 15 },
      ],
      photos: [],
      incidents: [],
      internalNotes: `Chantier programmé automatiquement suite à l'acceptation du devis ${targetQuote.number}.`,
      isInvoiceGenerated: false,
    };

    const updatedQuote: Quote = {
      ...targetQuote,
      status: 'accepte',
      acceptedAt,
      linkedChantierId: newChantier.id,
    };

    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? updatedQuote : q)));
    setChantiers((prev) => [newChantier, ...prev]);

    void persistDoc('quotes', updatedQuote.id, updatedQuote, OperationType.UPDATE);
    void persistDoc('chantiers', newChantier.id, newChantier, OperationType.CREATE);

    setStockItems((prev) =>
      prev.map((item) => {
        if (item.code === 'CART-STD') {
          const next = { ...item, quantityReserved: item.quantityReserved + boxesNeeded };
          void persistDoc('stockItems', next.id, next, OperationType.UPDATE);
          return next;
        }
        if (item.code === 'ADH-PVC') {
          const next = { ...item, quantityReserved: item.quantityReserved + rollsNeeded };
          void persistDoc('stockItems', next.id, next, OperationType.UPDATE);
          return next;
        }
        return item;
      })
    );

    const newStockMvt: StockMovement = {
      id: 'sm-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      stockItemId: 'stk-01',
      stockItemName: 'Carton Standard Renforcé',
      type: 'reservation',
      quantity: boxesNeeded,
      chantierId: newChantier.id,
      chantierCode: newChantier.code,
      performedBy: 'Moteur d’Automatisation TransMove',
      reason: `Réservation automatique suite accord devis ${targetQuote.number}`,
    };
    setStockMovements((prev) => [newStockMvt, ...prev]);
    void persistDoc('stockMovements', newStockMvt.id, newStockMvt, OperationType.CREATE);

    const autoConfirmEmail: EmailMessage = {
      id: 'em-auto-' + Date.now(),
      folder: 'sent',
      senderName: companySettings.name,
      senderEmail: companySettings.email,
      recipientEmail: targetQuote.clientEmail,
      subject: `Confirmation de réservation de votre déménagement - Chantier #${newChantier.code}`,
      body: `Bonjour ${targetQuote.clientName},\n\nNous avons bien reçu votre accord formel sur le devis ${targetQuote.number}.\nVotre chantier #${newChantier.code} est désormais programmé au planning pour le ${targetDate} à 08h00.\n\nVéhicule affecté : ${newChantier.vehicleName} (${newChantier.vehiclePlate})\nChef d’équipe : ${newChantier.teamLeaderName}\n\nMerci de votre confiance,\nL’équipe Opérations ${companySettings.name}`,
      date: new Date().toISOString(),
      isRead: true,
      linkedEntityType: 'chantier',
      linkedEntityId: newChantier.id,
    };
    setEmails((prev) => [autoConfirmEmail, ...prev]);
    void persistDoc('emails', autoConfirmEmail.id, autoConfirmEmail, OperationType.CREATE);

    notify(
      'Devis Accepté & Chantier Programmé !',
      `Chantier ${newChantier.code} créé, véhicule ${newChantier.vehiclePlate} affecté, et ${boxesNeeded} cartons réservés.`,
      'success'
    );

    logAutomation(
      `Acceptation devis ${targetQuote.number}`,
      `Création automatique Chantier ${newChantier.code} + Réservation ${boxesNeeded} cartons + Notification client`,
      'quote',
      targetQuote.id,
      'succes',
      `Chantier programmé le ${targetDate} avec véhicule ${newChantier.vehiclePlate}`
    );
  };

  // MODULE 4 & 5: Chantiers
  const createChantier = (data: Omit<Chantier, 'id' | 'code'>): Chantier => {
    const code = `CH-2026-${String(chantiers.length + 90).padStart(4, '0')}`;
    const newChantier: Chantier = {
      ...data,
      clientEmail: data.clientEmail?.trim().toLowerCase() || '',
      id: 'cha-' + Date.now(),
      code,
    };
    setChantiers((prev) => [newChantier, ...prev]);
    void persistDoc('chantiers', newChantier.id, newChantier, OperationType.CREATE);
    notify('Chantier planifié', `Chantier ${code} ajouté pour ${newChantier.clientName}.`, 'success');
    return newChantier;
  };

  const updateChantier = (updated: Chantier, opts?: { silent?: boolean }) => {
    const normalized: Chantier = {
      ...updated,
      clientEmail: updated.clientEmail?.trim().toLowerCase() || '',
    };
    setChantiers((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
    void persistDoc('chantiers', normalized.id, normalized, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Chantier mis à jour', `Affectation de ${normalized.code} enregistrée.`, 'success');
    }
  };

  const addChantierIncident = (chantierId: string, incident: Omit<ChantierIncident, 'id'>) => {
    const target = chantiers.find((c) => c.id === chantierId);
    if (!target) return;
    const newInc: ChantierIncident = {
      ...incident,
      id: 'inc-' + Date.now(),
    };
    const updated: Chantier = {
      ...target,
      incidents: [newInc, ...target.incidents],
    };
    setChantiers((prev) => prev.map((c) => (c.id === chantierId ? updated : c)));
    void persistDoc('chantiers', chantierId, updated, OperationType.UPDATE);
    notify('Aléa enregistré', `Incident "${incident.type}" consigné sur le chantier ${target.code}.`, 'warning');
  };

  const resolveChantierIncident = (chantierId: string, incidentId: string) => {
    const target = chantiers.find((c) => c.id === chantierId);
    if (!target) return;
    const updated: Chantier = {
      ...target,
      incidents: target.incidents.map((inc) =>
        inc.id === incidentId ? { ...inc, resolved: !inc.resolved } : inc
      ),
    };
    setChantiers((prev) => prev.map((c) => (c.id === chantierId ? updated : c)));
    void persistDoc('chantiers', chantierId, updated, OperationType.UPDATE);
  };

  const updateChantierStatus = (
    id: string,
    newStatus: ChantierStatus,
    newPhotos?: { url: string; caption: string; stage: 'avant' | 'pendant' | 'apres' }[],
    signature?: { dataUrl: string; signerName: string }
  ) => {
    const existingChantier = chantiers.find((c) => c.id === id);
    if (!existingChantier) return;

    let updatedChantier: Chantier = {
      ...existingChantier,
      status: newStatus,
      photos: newPhotos ? [...existingChantier.photos, ...newPhotos] : existingChantier.photos,
      clientSignature: signature?.dataUrl || existingChantier.clientSignature,
      signerName: signature?.signerName || existingChantier.signerName,
      signedAt: signature ? new Date().toISOString() : existingChantier.signedAt,
    };

    notify('Mise à jour statut chantier', `Le chantier est désormais : ${newStatus.toUpperCase()}`, 'info');

    // AUTOMATION: When project is TERMINÉ or LIVRÉ -> AUTO INVOICE GENERATION
    if ((newStatus === 'termine' || newStatus === 'livre') && !updatedChantier.isInvoiceGenerated) {
      const matchingQuote = quotes.find((q) => q.id === updatedChantier.quoteId);
      const invTotal = matchingQuote ? matchingQuote.total : Math.round(updatedChantier.volumeM3 * 135);
      const taxRate = matchingQuote?.taxRate ?? companySettings.defaultTaxRate ?? 18;
      const invSubtotal = Math.round((invTotal / (1 + taxRate / 100)) * 100) / 100;
      const invTax = Math.round((invTotal - invSubtotal) * 100) / 100;
      const invNum = `FAC-2026-${String(invoices.length + 115).padStart(4, '0')}`;

      const newInvoice: Invoice = {
        id: 'inv-' + Date.now(),
        number: invNum,
        type: 'facture',
        chantierId: updatedChantier.id,
        quoteId: matchingQuote?.id,
        clientName: updatedChantier.clientName,
        clientEmail: (matchingQuote?.clientEmail || updatedChantier.clientEmail || 'client@email.com').toLowerCase(),
        clientPhone: updatedChantier.clientPhone,
        clientAddress: updatedChantier.destinationAddress,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
        items: [
          {
            description: `Prestation de déménagement exécutée selon bon de livraison signé (#${updatedChantier.code})`,
            quantity: 1,
            unitPrice: invSubtotal,
            total: invSubtotal,
          },
        ],
        subtotal: invSubtotal,
        taxAmount: invTax,
        totalAmount: invTotal,
        paidAmount: 0,
        status: 'emise',
        currency: matchingQuote?.currency || companySettings.currency,
        payments: [],
      };

      setInvoices((prev) => [newInvoice, ...prev]);
      void persistDoc('invoices', newInvoice.id, newInvoice, OperationType.CREATE);

      updatedChantier = {
        ...updatedChantier,
        isInvoiceGenerated: true,
        invoiceId: newInvoice.id,
      };

      // Deduct materials from stock definitely
      updatedChantier.usedMaterials.forEach((mat) => {
        setStockItems((prev) =>
          prev.map((item) => {
            if (item.name.toLowerCase().includes(mat.materialName.toLowerCase().slice(0, 7))) {
              const next = {
                ...item,
                quantityInStock: Math.max(0, item.quantityInStock - mat.quantity),
                quantityReserved: Math.max(0, item.quantityReserved - mat.quantity),
                quantityUsedTotal: item.quantityUsedTotal + mat.quantity,
              };
              void persistDoc('stockItems', next.id, next, OperationType.UPDATE);
              return next;
            }
            return item;
          })
        );
      });

      const invoiceEmail: EmailMessage = {
        id: 'em-inv-' + Date.now(),
        folder: 'sent',
        senderName: companySettings.name,
        senderEmail: companySettings.email,
        recipientEmail: newInvoice.clientEmail,
        subject: `Facture de votre prestation de déménagement #${newInvoice.number}`,
        body: `Bonjour ${newInvoice.clientName},\n\nVotre déménagement #${updatedChantier.code} s'est achevé avec succès et le bon de livraison a été émargé.\nVeuillez trouver votre facture ${newInvoice.number} pour un montant de ${newInvoice.totalAmount} ${newInvoice.currency}.\n\nVous pouvez régler par Virement, Wave/Orange Money, Espèces ou Chèque.\n\nBien cordialement,\nLe service Comptabilité ${companySettings.name}`,
        date: new Date().toISOString(),
        isRead: true,
        linkedEntityType: 'facture',
        linkedEntityId: newInvoice.id,
        attachments: [{ name: `Facture_${newInvoice.number}.pdf`, size: '890 KB' }],
      };
      setEmails((prev) => [invoiceEmail, ...prev]);
      void persistDoc('emails', invoiceEmail.id, invoiceEmail, OperationType.CREATE);

      notify(
        'Facture générée automatiquement !',
        `Fin de chantier constatée -> Facture ${newInvoice.number} créée (${newInvoice.totalAmount} ${newInvoice.currency}).`,
        'success'
      );

      logAutomation(
        `Fin de chantier #${updatedChantier.code} & Bon de livraison signé`,
        `Génération automatique de la Facture ${newInvoice.number} + Sortie définitive de stock`,
        'chantier',
        updatedChantier.id,
        'succes',
        `Montant facturé : ${newInvoice.totalAmount} ${newInvoice.currency} | Consommables décomptés du stock.`
      );
    }

    setChantiers((prev) => prev.map((c) => (c.id === id ? updatedChantier : c)));
    void persistDoc('chantiers', id, updatedChantier, OperationType.UPDATE);
  };

  // MODULE 6: Invoices & Expenses
  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'number'>): Invoice => {
    const num = `FAC-2026-${String(invoices.length + 115).padStart(4, '0')}`;
    const newInv: Invoice = {
      ...invoiceData,
      clientEmail: invoiceData.clientEmail.trim().toLowerCase(),
      id: 'inv-' + Date.now(),
      number: num,
    };
    setInvoices((prev) => [newInv, ...prev]);
    void persistDoc('invoices', newInv.id, newInv, OperationType.CREATE);
    notify('Facture créée', `Facture ${num} enregistrée pour ${newInv.clientName}.`, 'success');
    return newInv;
  };

  const recordInvoicePayment = (invoiceId: string, amount: number, method: PaymentMethod, reference: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;
    const newPaid = target.paidAmount + amount;
    const newStatus: Invoice['status'] = newPaid >= target.totalAmount ? 'payee' : 'payee_partielle';
    const newPayment: Invoice['payments'][0] = {
      id: 'pay-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      amount,
      method,
      reference,
      recordedBy: currentUserProfile?.displayName || 'Comptabilité TransMove',
    };
    const updated: Invoice = {
      ...target,
      paidAmount: newPaid,
      status: newStatus,
      payments: [...target.payments, newPayment],
    };

    setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updated : inv)));
    void persistDoc('invoices', invoiceId, updated, OperationType.UPDATE);

    notify(
      'Paiement enregistré',
      `Encaissement de ${amount.toLocaleString()} ${target.currency} via ${method.toUpperCase()} (${reference}).`,
      'success'
    );
    logAutomation(
      `Encaissement reçu sur facture ${target.number} (${reference})`,
      `Mise à jour du solde facture & journal de caisse`,
      'invoice',
      invoiceId,
      'succes',
      `Mode : ${method} | Montant : ${amount} ${target.currency}`
    );
  };

  const sendInvoiceReminder = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const today = new Date().toISOString().split('T')[0];
    const updatedInv = { ...inv, lastReminderSent: today };
    setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? updatedInv : i)));
    void persistDoc('invoices', invoiceId, updatedInv, OperationType.UPDATE);

    const reminderEmail: EmailMessage = {
      id: 'em-rem-' + Date.now(),
      folder: 'sent',
      senderName: companySettings.name,
      senderEmail: companySettings.email,
      recipientEmail: inv.clientEmail,
      subject: `Rappel d'échéance : Facture #${inv.number} en attente de règlement`,
      body: `Bonjour ${inv.clientName},\n\nSauf erreur de notre part, votre facture #${inv.number} d’un montant de ${(inv.totalAmount - inv.paidAmount).toLocaleString()} ${inv.currency} arrivée à échéance le ${inv.dueDate} est toujours impayée.\n\nMerci de bien vouloir régulariser par virement, Mobile Money (Wave/Orange Money), espèces ou chèque.\n\nBien cordialement,\nService Recouvrement ${companySettings.name}`,
      date: new Date().toISOString(),
      isRead: true,
      linkedEntityType: 'facture',
      linkedEntityId: inv.id,
    };

    setEmails((prev) => [reminderEmail, ...prev]);
    void persistDoc('emails', reminderEmail.id, reminderEmail, OperationType.CREATE);

    void transmitEmailServerSide(reminderEmail).then((res) => {
      if (res.delivered) {
        notify('Relance SMTP envoyée', `Email transmis à ${inv.clientEmail} pour la facture ${inv.number}.`, 'success');
      } else {
        notify(
          'Relance enregistrée (SMTP non actif)',
          `Relance journalisée pour ${inv.clientEmail}. Envoi SMTP réel : ${res.error}`,
          'warning'
        );
      }
    });

    logAutomation(
      `Relance automatique facture ${inv.number}`,
      `Envoi de la notification de relance d’impayé au client`,
      'invoice',
      inv.id,
      'succes',
      `Reste dû : ${inv.totalAmount - inv.paidAmount} ${inv.currency}`
    );
  };

  const addExpense = (expData: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...expData,
      id: 'exp-' + Date.now(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    void persistDoc('expenses', newExp.id, newExp, OperationType.CREATE);
    notify('Dépense enregistrée', `Dépense de ${newExp.amount} ${newExp.currency} imputée à : ${newExp.category}`, 'info');
  };

  // MODULE 7: Transit & Customs
  const createTransitShipment = (shipmentData: Omit<TransitShipment, 'id' | 'reference'>): TransitShipment => {
    const ref = `TR-2026-${shipmentData.operationType.toUpperCase().slice(0, 3)}-${String(transitShipments.length + 20).padStart(3, '0')}`;
    const newShipment: TransitShipment = {
      ...shipmentData,
      id: 'tra-' + Date.now(),
      reference: ref,
    };
    setTransitShipments((prev) => [newShipment, ...prev]);
    void persistDoc('transitShipments', newShipment.id, newShipment, OperationType.CREATE);
    notify('Dossier de transit créé', `Dossier ${ref} enregistré pour ${newShipment.clientName}.`, 'success');
    logAutomation(
      `Nouveau dossier transit créé (${ref})`,
      `Enregistrement conteneur ${newShipment.containerNumber || 'N/A'} et affectation douane`,
      'transit',
      newShipment.id,
      'succes',
      `Type : ${newShipment.operationType} | Compagnie : ${newShipment.shippingLineName} | Transitaire : ${newShipment.customsAgentName || 'Interne'}`
    );
    return newShipment;
  };

  const updateTransitShipment = (updated: TransitShipment, opts?: { silent?: boolean }) => {
    setTransitShipments((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    void persistDoc('transitShipments', updated.id, updated, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Dossier transit mis à jour', `Dossier ${updated.reference} enregistré.`, 'success');
    }
  };

  const updateTransitStatus = (shipmentId: string, status: TransitStatus) => {
    const target = transitShipments.find((t) => t.id === shipmentId);
    if (!target) return;
    const updated = { ...target, status };
    setTransitShipments((prev) => prev.map((t) => (t.id === shipmentId ? updated : t)));
    void persistDoc('transitShipments', shipmentId, updated, OperationType.UPDATE);
    notify('Statut Transit actualisé', `Le dossier maritime/aérien est : ${status.replace('_', ' ').toUpperCase()}`, 'info');
    logAutomation(
      `Mise à jour transit #${target.reference}`,
      `Étape franchie : ${status.replace('_', ' ').toUpperCase()}`,
      'transit',
      shipmentId,
      'succes',
      `Notification automatique du destinataire et du transitaire`
    );
  };

  const toggleTransitDocStatus = (shipmentId: string, docId: string) => {
    const target = transitShipments.find((t) => t.id === shipmentId);
    if (!target) return;
    const updated: TransitShipment = {
      ...target,
      documents: target.documents.map((d) => {
        if (d.id === docId) {
          const nextStatus = d.status === 'valide' ? 'manquant' : 'valide';
          return { ...d, status: nextStatus, isUploaded: nextStatus === 'valide' };
        }
        return d;
      }),
    };
    setTransitShipments((prev) => prev.map((t) => (t.id === shipmentId ? updated : t)));
    void persistDoc('transitShipments', shipmentId, updated, OperationType.UPDATE);
  };

  const updateTransitDocument = (shipmentId: string, docId: string, patch: Partial<TransitDocument>) => {
    const target = transitShipments.find((t) => t.id === shipmentId);
    if (!target) return;
    const updated: TransitShipment = {
      ...target,
      documents: target.documents.map((d) => (d.id === docId ? { ...d, ...patch } : d)),
    };
    setTransitShipments((prev) => prev.map((t) => (t.id === shipmentId ? updated : t)));
    void persistDoc('transitShipments', shipmentId, updated, OperationType.UPDATE);
  };

  // MODULE 8: Shipping lines, ports & equipment
  const persistShippingConfig = async (nextPorts: string[], nextEquipment: ShippingEquipment[]) => {
    await persistDoc('settings', 'shipping_config', {
      customPorts: nextPorts,
      equipmentList: nextEquipment,
      updatedAt: new Date().toISOString(),
    });
  };

  const addShippingPort = (newPort: string) => {
    const trimmed = newPort.trim();
    if (!trimmed) return;
    if (!customPorts.includes(trimmed)) {
      const next = [...customPorts, trimmed];
      setCustomPorts(next);
      void persistShippingConfig(next, shippingEquipment);
      notify('Port / Destination ajouté', `Le port "${trimmed}" est désormais disponible dans les comparateurs.`, 'success');
    }
  };

  const setShippingEquipmentList = async (list: ShippingEquipment[]) => {
    setShippingEquipment(list);
    await persistShippingConfig(customPorts, list);
  };

  const addShippingLine = (lineData: Omit<ShippingLine, 'id'>) => {
    const newLine: ShippingLine = {
      ...lineData,
      id: 'shp-' + Date.now(),
    };
    setShippingLines((prev) => [newLine, ...prev]);
    void persistDoc('shippingLines', newLine.id, newLine, OperationType.CREATE);
    notify('Transporteur / Armateur ajouté', `"${newLine.name}" a été ajouté avec succès au répertoire.`, 'success');
  };

  const updateShippingRoute = (
    lineId: string,
    routeIndex: number,
    newRate20: number,
    newRate40: number,
    newDays: number,
    rateTruck?: number,
    opts?: { silent?: boolean }
  ) => {
    const target = shippingLines.find((l) => l.id === lineId);
    if (!target) return;
    const updatedRoutes = [...target.routes];
    if (updatedRoutes[routeIndex]) {
      updatedRoutes[routeIndex] = {
        ...updatedRoutes[routeIndex],
        rate20ft: newRate20,
        rate40ft: newRate40,
        avgTransitDays: newDays,
        rateTruck: rateTruck ?? updatedRoutes[routeIndex].rateTruck,
      };
    }
    const updated = { ...target, routes: updatedRoutes };
    setShippingLines((prev) => prev.map((l) => (l.id === lineId ? updated : l)));
    void persistDoc('shippingLines', lineId, updated, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Tarifs de fret actualisés', 'Les tarifs et transit times de la ligne ont été mis à jour.', 'success');
    }
  };

  // MODULE 9: Stock
  const adjustStock = (itemId: string, qtyDelta: number, reason: string, type: 'entree' | 'sortie') => {
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return;

    const newQty = type === 'entree' ? item.quantityInStock + qtyDelta : Math.max(0, item.quantityInStock - qtyDelta);
    const updatedItem = { ...item, quantityInStock: newQty };
    setStockItems((prev) => prev.map((i) => (i.id === itemId ? updatedItem : i)));
    void persistDoc('stockItems', itemId, updatedItem, OperationType.UPDATE);

    const mvt: StockMovement = {
      id: 'sm-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      stockItemId: item.id,
      stockItemName: item.name,
      type,
      quantity: qtyDelta,
      performedBy: currentUserProfile?.displayName || 'Responsable Stock',
      reason,
    };
    setStockMovements((prev) => [mvt, ...prev]);
    void persistDoc('stockMovements', mvt.id, mvt, OperationType.CREATE);
    notify('Mouvement de stock enregistré', `${type === 'entree' ? '+' : '-'}${qtyDelta} sur le stock`, 'info');
  };

  const addStockItem = (itemData: Omit<StockItem, 'id'>): StockItem => {
    const newItem: StockItem = {
      ...itemData,
      id: 'stk-' + Date.now(),
    };
    setStockItems((prev) => [newItem, ...prev]);
    void persistDoc('stockItems', newItem.id, newItem, OperationType.CREATE);
    notify('Article ajouté au stock', `${newItem.name} (${newItem.code}) créé.`, 'success');
    return newItem;
  };

  const updateStockItem = (item: StockItem, opts?: { silent?: boolean }) => {
    setStockItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    void persistDoc('stockItems', item.id, item, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Article mis à jour', `${item.name} enregistré.`, 'success');
    }
  };

  // MODULE 10: Fleet
  const updateVehicleStatus = (vehicleId: string, status: Vehicle['status']) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const updated = { ...target, status };
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
    void persistDoc('vehicles', vehicleId, updated, OperationType.UPDATE);
    notify('Statut véhicule mis à jour', `Véhicule désormais : ${status.toUpperCase()}`, 'info');
  };

  const addVehicle = (vehicleData: Omit<Vehicle, 'id'>): Vehicle => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: 'veh-' + Date.now(),
    };
    setVehicles((prev) => [newVehicle, ...prev]);
    void persistDoc('vehicles', newVehicle.id, newVehicle, OperationType.CREATE);
    notify('Véhicule ajouté', `${newVehicle.brand} ${newVehicle.model} (${newVehicle.plateNumber}) ajouté à la flotte.`, 'success');
    return newVehicle;
  };

  const updateVehicle = (vehicle: Vehicle, opts?: { silent?: boolean }) => {
    setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? vehicle : v)));
    void persistDoc('vehicles', vehicle.id, vehicle, OperationType.UPDATE);
    if (!opts?.silent) {
      notify('Véhicule mis à jour', `Fiche de ${vehicle.plateNumber} enregistrée.`, 'success');
    }
  };

  const deleteVehicle = (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    void deleteDoc(doc(db, 'vehicles', vehicleId)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${vehicleId}`)
    );
    if (target) {
      notify('Véhicule supprimé', `${target.plateNumber} retiré de la flotte.`, 'warning');
    }
  };

  const updateVehicleLocation = (vehicleId: string, location: Vehicle['currentLocation']) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const updated = { ...target, currentLocation: location };
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? updated : v)));
    void persistDoc('vehicles', vehicleId, updated, OperationType.UPDATE);
  };

  // MODULE 11: Human Resources & Invite Sync
  const addEmployee = (empData: Omit<Employee, 'id'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      email: empData.email.trim().toLowerCase(),
      id: 'emp-' + Date.now(),
    };
    setEmployees((prev) => [newEmp, ...prev]);
    void persistDoc('employees', newEmp.id, newEmp, OperationType.CREATE);

    void upsertInvitation({
      email: newEmp.email,
      displayName: `${newEmp.firstName} ${newEmp.lastName}`,
      role: newEmp.role,
      permissions: newEmp.permissions || DEFAULT_PERMISSIONS_BY_ROLE[newEmp.role] || [],
      employeeId: newEmp.id,
      isActive: newEmp.status !== 'arret',
    });

    notify('Employé & Invitation créés', `${newEmp.firstName} ${newEmp.lastName} a été ajouté avec le rôle ${newEmp.role}.`, 'success');
    logAutomation(
      `Nouvel employé créé (${newEmp.firstName} ${newEmp.lastName})`,
      `Attribution du rôle ${newEmp.role} et invitation Google activée pour ${newEmp.email}`,
      'employee',
      newEmp.id,
      'succes',
      `Équipe : ${newEmp.teamName} | Contrat : ${newEmp.contractType}`
    );
    return newEmp;
  };

  const updateEmployee = (updated: Employee, opts?: { silent?: boolean }) => {
    const normalized = { ...updated, email: updated.email.trim().toLowerCase() };
    setEmployees((prev) => prev.map((e) => (e.id === normalized.id ? normalized : e)));
    void persistDoc('employees', normalized.id, normalized, OperationType.UPDATE);

    void upsertInvitation(
      {
        email: normalized.email,
        displayName: `${normalized.firstName} ${normalized.lastName}`,
        role: normalized.role,
        permissions: normalized.permissions || DEFAULT_PERMISSIONS_BY_ROLE[normalized.role] || [],
        employeeId: normalized.id,
        isActive: normalized.status !== 'arret',
      },
      opts
    );

    if (!opts?.silent) {
      notify(
        'Fiche employé mise à jour',
        `Les informations et droits d'accès de ${normalized.firstName} ${normalized.lastName} ont été enregistrés.`,
        'success'
      );
    }
  };

  const deleteEmployee = (id: string) => {
    const target = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    void deleteDoc(doc(db, 'employees', id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `employees/${id}`)
    );
    if (target) {
      void toggleInvitationStatus(target.email, false);
      notify('Employé supprimé', `${target.firstName} ${target.lastName} a été retiré des effectifs et son accès désactivé.`, 'warning');
    }
  };

  // MODULE 12: Integrated Email (Real SMTP backend + Firestore)
  const sendEmailMessage = async (
    msg: Omit<EmailMessage, 'id' | 'date'>
  ): Promise<{ delivered: boolean; error?: string }> => {
    const newMsg: EmailMessage = {
      ...msg,
      id: 'em-' + Date.now(),
      date: new Date().toISOString(),
    };
    setEmails((prev) => [newMsg, ...prev]);
    await persistDoc('emails', newMsg.id, newMsg, OperationType.CREATE);

    if (newMsg.folder === 'drafts') {
      notify('Brouillon enregistré', `Brouillon sauvegardé pour ${newMsg.recipientEmail || 'destinataire'}.`, 'info');
      return { delivered: false };
    }

    const res = await transmitEmailServerSide(newMsg);
    if (res.delivered) {
      notify('Email envoyé (SMTP)', `Message transmis réellement à ${newMsg.recipientEmail}.`, 'success');
    } else {
      notify(
        'Email enregistré (SMTP requis)',
        `Message archivé dans Envoyés. Pour l'envoi réel : ${res.error}`,
        'warning'
      );
    }
    return res;
  };

  const deleteEmailMessage = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    void deleteDoc(doc(db, 'emails', id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `emails/${id}`)
    );
    notify('Message supprimé', 'Le message a été supprimé.', 'info');
  };

  // FULL AUTOMATION SIMULATOR
  const triggerEndToEndAutomationDemo = () => {
    const clientName = 'Cabinet Notarial Maître Diop';
    const clientEmail = 'notaire.diop@dakar-justice.sn';
    const clientPhone = '+221 77 999 11 22';

    notify('Scénario automatique lancé', 'Exécution du cycle complet : RDV -> Devis -> Chantier -> Stock', 'info');

    const newApt = createAppointment({
      clientName,
      clientEmail,
      clientPhone,
      originAddress: 'Immeuble SDI, Avenue Peytavin, Dakar',
      originFloor: 3,
      originElevator: true,
      destinationAddress: 'Nouvelle Tour Fann Résidence, Dakar',
      destinationFloor: 5,
      destinationElevator: true,
      targetDate: '2026-11-25',
      serviceType: 'local',
      estimatedTransitDays: 1,
      specialConstraints: ['Archives confidentielles notariées', 'Armoires fortes ignifugées'],
      assignedCommercialId: 'usr-com-1',
      assignedCommercialName: 'Sophie Benjelloun',
      status: 'visite',
      notes: 'Transfert d’études notariales avec 35m³ de dossiers et mobilier de prestige.',
      photosCount: 5,
      estimatedVolumeM3: 35,
    });

    const newQuote = createQuote({
      appointmentId: newApt.id,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress: newApt.originAddress,
      originAddress: newApt.originAddress,
      destinationAddress: newApt.destinationAddress,
      serviceType: 'local',
      volumeM3: 35,
      items: [
        { id: 'q-d1', description: 'Transfert bureaux notariaux et archives confidentielles 35m³', category: 'transport', quantity: 1, unitPrice: 1950, total: 1950 },
        { id: 'q-d2', description: 'Fourniture 70 cartons archives renforcés avec scellés sécurisés', category: 'emballage', quantity: 70, unitPrice: 3.5, total: 245 },
        { id: 'q-d3', description: 'Mise à disposition monte-meuble et équipe de 4 déménageurs', category: 'manutention', quantity: 1, unitPrice: 650, total: 650 },
      ],
      subtotal: 2845,
      taxRate: 18,
      taxAmount: 512.1,
      fuelSurcharge: 80,
      discount: 0,
      total: 3437.1,
      currency: companySettings.currency,
      status: 'envoye',
      validityDate: '2026-12-15',
      specialTerms: 'Scellés inviolables pour les registres d’actes notariés.',
    });

    setTimeout(() => {
      acceptQuote(newQuote.id);
    }, 900);
  };

  // Google Drive Backup integration (optional incremental OAuth)
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [lastBackupDate, setLastBackupDateState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('transmove_last_backup_date');
    } catch {
      return null;
    }
  });

  const setLastBackupDate = (date: string | null) => {
    setLastBackupDateState(date);
    if (date) {
      try {
        localStorage.setItem('transmove_last_backup_date', date);
      } catch {
        // ignore storage restrictions
      }
    } else {
      try {
        localStorage.removeItem('transmove_last_backup_date');
      } catch {
        // ignore storage restrictions
      }
    }
  };

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const connectGoogleDrive = async (): Promise<string | null> => {
    try {
      const res = await driveGoogleSignIn();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      notify(
        'Google Drive Connecté',
        `Compte Google authentifié : ${res.user.displayName || res.user.email}`,
        'success'
      );
      return res.accessToken;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connexion annulée';
      notify('Erreur Google Drive', msg, 'error');
      throw err;
    }
  };

  const disconnectGoogleDrive = async (): Promise<void> => {
    await driveGoogleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
    notify('Déconnexion', 'Votre session a été fermée', 'info');
  };

  const exportStateSnapshot = (): Record<string, unknown> => {
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      company: companySettings,
      data: {
        appointments,
        volumeEstimations,
        quotes,
        chantiers,
        invoices,
        expenses,
        transitShipments,
        shippingLines,
        stockItems,
        stockMovements,
        vehicles,
        employees,
        emails,
        automationLogs,
        customPorts,
        shippingEquipment,
      },
    };
  };

  const restoreStateSnapshot = (snapshot: Record<string, unknown>): boolean => {
    try {
      const dataObj = snapshot?.data as Record<string, unknown> | undefined;
      if (!snapshot || !dataObj) {
        throw new Error('Format de sauvegarde invalide (clé "data" manquante)');
      }
      if (Array.isArray(dataObj.appointments)) {
        const list = dataObj.appointments as Appointment[];
        setAppointments(list);
        list.forEach((a) => void persistDoc('appointments', a.id, a));
      }
      if (Array.isArray(dataObj.quotes)) {
        const list = dataObj.quotes as Quote[];
        setQuotes(list);
        list.forEach((q) => void persistDoc('quotes', q.id, q));
      }
      if (Array.isArray(dataObj.chantiers)) {
        const list = dataObj.chantiers as Chantier[];
        setChantiers(list);
        list.forEach((c) => void persistDoc('chantiers', c.id, c));
      }
      if (Array.isArray(dataObj.invoices)) {
        const list = dataObj.invoices as Invoice[];
        setInvoices(list);
        list.forEach((i) => void persistDoc('invoices', i.id, i));
      }
      if (Array.isArray(dataObj.expenses)) {
        const list = dataObj.expenses as Expense[];
        setExpenses(list);
        list.forEach((e) => void persistDoc('expenses', e.id, e));
      }
      if (Array.isArray(dataObj.transitShipments)) {
        const list = dataObj.transitShipments as TransitShipment[];
        setTransitShipments(list);
        list.forEach((t) => void persistDoc('transitShipments', t.id, t));
      }
      if (Array.isArray(dataObj.shippingLines)) {
        const list = dataObj.shippingLines as ShippingLine[];
        setShippingLines(list);
        list.forEach((s) => void persistDoc('shippingLines', s.id, s));
      }
      if (Array.isArray(dataObj.stockItems)) {
        const list = dataObj.stockItems as StockItem[];
        setStockItems(list);
        list.forEach((s) => void persistDoc('stockItems', s.id, s));
      }
      if (Array.isArray(dataObj.stockMovements)) {
        const list = dataObj.stockMovements as StockMovement[];
        setStockMovements(list);
        list.forEach((m) => void persistDoc('stockMovements', m.id, m));
      }
      if (Array.isArray(dataObj.vehicles)) {
        const list = dataObj.vehicles as Vehicle[];
        setVehicles(list);
        list.forEach((v) => void persistDoc('vehicles', v.id, v));
      }
      if (Array.isArray(dataObj.employees)) {
        const list = dataObj.employees as Employee[];
        setEmployees(list);
        list.forEach((emp) => void persistDoc('employees', emp.id, emp));
      }
      if (Array.isArray(dataObj.emails)) {
        const list = dataObj.emails as EmailMessage[];
        setEmails(list);
        list.forEach((em) => void persistDoc('emails', em.id, em));
      }
      if (Array.isArray(dataObj.customPorts)) {
        const ports = dataObj.customPorts as string[];
        setCustomPorts(ports);
        void persistShippingConfig(ports, shippingEquipment);
      }
      if (snapshot.company) {
        const comp = snapshot.company as CompanySettings;
        setCompanySettings(comp);
        void persistDoc('settings', 'company', { ...comp, id: 'company-main' });
      }

      notify(
        'Restauration terminée',
        `Données restaurées et synchronisées dans Firestore (${new Date(
          String(snapshot.exportedAt || Date.now())
        ).toLocaleString('fr-FR')}).`,
        'success'
      );
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de restaurer les données';
      notify('Échec de la restauration', msg, 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        authStatus,
        authError,
        currentUserProfile,
        impersonatedRole,
        setImpersonatedRole,
        effectivePermissions,
        hasPermission,
        signInToErp,
        signOutFromErp,
        retryAuthBootstrap,
        currentCompany: companySettings,
        companySettings,
        updateCompanySettings,
        activeRole,
        setActiveRole,
        activeModule,
        setActiveModule,
        focusedChantierId,
        setFocusedChantierId,
        invitations,
        userAccounts,
        upsertInvitation,
        toggleInvitationStatus,
        deleteInvitation,
        appointments,
        volumeEstimations,
        quotes,
        chantiers,
        invoices,
        expenses,
        transitShipments,
        shippingLines,
        shippingEquipment,
        stockItems,
        stockMovements,
        vehicles,
        employees,
        emails,
        automationLogs,
        notifications,
        smtpConfigured,
        createAppointment,
        updateAppointment,
        updateAppointmentStatus,
        updateAppointmentVolume,
        saveVolumeEstimation,
        createQuote,
        updateQuote,
        acceptQuote,
        refuseQuote,
        createChantier,
        updateChantier,
        updateChantierStatus,
        addChantierIncident,
        resolveChantierIncident,
        createInvoice,
        recordInvoicePayment,
        sendInvoiceReminder,
        addExpense,
        createTransitShipment,
        updateTransitShipment,
        updateTransitStatus,
        toggleTransitDocStatus,
        updateTransitDocument,
        adjustStock,
        addStockItem,
        updateStockItem,
        updateVehicleStatus,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        updateVehicleLocation,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        sendEmailMessage,
        deleteEmailMessage,
        addShippingLine,
        updateShippingRoute,
        customPorts,
        addShippingPort,
        setShippingEquipmentList,
        removeNotification,
        notify,
        triggerEndToEndAutomationDemo,
        googleUser,
        googleToken,
        isGoogleConnected: !!googleUser,
        connectGoogleDrive,
        disconnectGoogleDrive,
        lastBackupDate,
        setLastBackupDate,
        exportStateSnapshot,
        restoreStateSnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
