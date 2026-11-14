/**
 * TransMove OS - Core Domain Types and Interfaces
 */

export type UserRole =
  | 'admin'
  | 'manager'
  | 'commercial'
  | 'dispatcher'
  | 'driver'
  | 'accountant'
  | 'warehouse'
  | 'fleet_manager'
  | 'hr'
  | 'client';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  tenantId: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  country: string;
  currency: string;
  logoText: string;
  address: string;
  phone: string;
  email: string;
  taxNumber: string;
  defaultTaxRate?: number;
  updatedAt?: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: string[];
  employeeId?: string;
  isActive: boolean;
  invitedBy?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Invitation {
  email: string;
  displayName: string;
  role: UserRole;
  permissions: string[];
  employeeId?: string;
  isActive: boolean;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingEquipment {
  id: string;
  category: 'maritime' | 'terrestre' | 'aerien';
  type: string;
  dimensions: string;
  capacityM3: string;
  payloadKg: string;
}

export type ServiceType =
  | 'local'
  | 'national'
  | 'international'
  | 'import'
  | 'export'
  | 'transport'
  | 'storage';

export type ServiceTransportMode = 'aerien' | 'maritime' | 'terrestre';

export type AppointmentStatus =
  | 'nouveau'
  | 'contacte'
  | 'visite_planifiee'
  | 'visite'
  | 'devis_envoye'
  | 'gagne'
  | 'perdu';

export interface AdditionalVisit {
  id: string;
  title: string;
  date: string;
  time?: string;
  notes?: string;
  status: 'planifie' | 'effectue' | 'annule';
}

export type PropertyType = 'appartement' | 'maison' | 'immeuble';

export interface Appointment {
  id: string;
  code: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  orderingCustomer?: string;
  originAddress: string;
  originFloor?: number;
  originElevator: boolean;
  originPropertyType?: PropertyType | null;
  originFloorLevel?: string | null;
  originFloorLevelOther?: string | null;
  originLevelsCount?: string | null;
  originLevelsCountOther?: string | null;
  destinationAddress: string;
  destinationFloor?: number;
  destinationElevator: boolean;
  destinationPropertyType?: PropertyType | null;
  destinationFloorLevel?: string | null;
  destinationFloorLevelOther?: string | null;
  destinationLevelsCount?: string | null;
  destinationLevelsCountOther?: string | null;
  propertyType?: PropertyType | null;
  floorLevel?: string | null;
  floorLevelOther?: string | null;
  levelsCount?: string | null;
  levelsCountOther?: string | null;
  targetDate: string;
  serviceType: ServiceType;
  serviceTransportMode?: ServiceTransportMode | null;
  estimatedTransitDays?: number; // Optionnel
  specialConstraints: string[];
  assignedCommercialId: string;
  assignedCommercialName: string;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
  photosCount: number;
  estimatedVolumeM3?: number;
  additionalVisits?: AdditionalVisit[];
}

export interface FurnitureItem {
  id: string;
  room: string; // Dynamic room name (Salon, Chambre, Cuisine, Bureau, Terrasse, etc.)
  name: string;
  defaultM3: number;
  quantity: number;
  surveyedM3: number;
  dismantledM3: number;
  weightKg: number;
  isFragile: boolean;
  isBulky: boolean;
  isValuable: boolean;
  requiresDisassembly: boolean;
  requiresPackaging: boolean;
  requiresStorage: boolean;
  photoUrl?: string;
}

export interface VolumeEstimation {
  id: string;
  appointmentId?: string;
  clientName: string;
  clientEmail?: string;
  originAddress: string;
  destinationAddress: string;
  targetDate: string;
  items: FurnitureItem[];
  totalSurveyedM3: number;
  totalDismantledM3: number;
  totalTransportM3: number;
  estimatedStandardBoxes: number;
  estimatedBookBoxes: number;
  estimatedWardrobeBoxes: number;
  recommendedVehicles: string;
  recommendedVehicleVolumeM3?: number;
  recommendedMovers: number;
  recommendedWorkDays?: number;
  estimatedPrice: number;
  notes: string;
  createdAt: string;
}

export type QuoteStatus =
  | 'brouillon'
  | 'envoye'
  | 'en_attente'
  | 'accepte'
  | 'refuse'
  | 'expire';

export interface QuoteItem {
  id: string;
  description: string;
  category: 'emballage' | 'demontage' | 'transport' | 'manutention' | 'stockage' | 'douane' | 'assurance' | 'annexe';
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  number: string;
  version: number;
  appointmentId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  originAddress: string;
  destinationAddress: string;
  serviceType: ServiceType;
  volumeM3: number;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number; // e.g. 18% or 20%
  taxAmount: number;
  fuelSurcharge: number;
  discount: number;
  total: number;
  currency: string;
  status: QuoteStatus;
  validityDate: string;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  linkedChantierId?: string;
  linkedInvoiceId?: string;
  specialTerms: string;
}

export type ChantierStatus =
  | 'programme'
  | 'en_attente'
  | 'en_cours'
  | 'en_transit'
  | 'arrive_depot'
  | 'livre'
  | 'termine'
  | 'annule';

export interface ChantierIncident {
  id: string;
  time: string;
  type: 'retard' | 'casse' | 'acces' | 'intemperie' | 'client' | 'autre';
  description: string;
  resolved: boolean;
}

export interface Chantier {
  id: string;
  code: string;
  quoteId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  originAddress: string;
  destinationAddress: string;
  scheduledDate: string;
  startTime: string;
  estimatedEndTime: string;
  volumeM3: number;
  actualVolumeM3?: number;
  status: ChantierStatus;
  teamLeaderId: string;
  teamLeaderName: string;
  moverIds: string[];
  moverNames: string[];
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  usedMaterials: { materialName: string; quantity: number }[];
  clientSignature?: string;
  signedAt?: string;
  signerName?: string;
  photos: { url: string; caption: string; stage: 'avant' | 'pendant' | 'apres' }[];
  incidents: ChantierIncident[];
  internalNotes: string;
  isInvoiceGenerated: boolean;
  invoiceId?: string;
}

export type InvoiceStatus = 'brouillon' | 'emise' | 'payee_partielle' | 'payee' | 'en_retard' | 'annulee';
export type PaymentMethod = 'mobile_money' | 'virement' | 'carte' | 'especes' | 'cheque';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  recordedBy: string;
}

export interface Invoice {
  id: string;
  number: string;
  type: 'facture' | 'avoir' | 'acompte' | 'recu';
  chantierId?: string;
  quoteId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  currency: string;
  payments: PaymentRecord[];
  lastReminderSent?: string;
}

export type ExpenseCategory =
  | 'carburant'
  | 'peage'
  | 'emballage'
  | 'main_d_oeuvre'
  | 'reparation_vehicule'
  | 'douane'
  | 'transit'
  | 'stockage'
  | 'annexe';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  chantierId?: string;
  chantierCode?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  employeeId?: string;
  employeeName?: string;
  receiptUrl?: string;
  paidMethod: PaymentMethod;
}

export type TransitOperationType = 'import' | 'export' | 'transit' | 'groupage' | 'conteneur' | 'vrac';
export type TransitTransportMode = 'aerien' | 'maritime' | 'terrestre';
export type TransitOptionType = 'perso' | 'groupage';
export type TransitStatus =
  | 'en_preparation'
  | 'documents_en_cours'
  | 'douane_en_cours'
  | 'embarque'
  | 'en_transit'
  | 'arrive'
  | 'dedouane'
  | 'livre';

export interface TransitDocument {
  id: string;
  type: 'Facture Commerciale' | 'Packing List' | 'Bill of Lading (B/L)' | 'Certificat d\'Origine' | 'Police d\'Assurance' | 'Déclaration Douane' | 'Certificat Phytosanitaire';
  name: string;
  isUploaded: boolean;
  uploadedAt?: string;
  expiryDate?: string;
  fileSize?: string;
  fileUrl?: string;
  status: 'valide' | 'manquant' | 'en_revue' | 'rejete';
}

export interface TransitShipment {
  id: string;
  reference: string;
  operationType: TransitOperationType;
  transportMode?: TransitTransportMode;
  transitOption?: TransitOptionType;
  sealNumber?: string;
  clientName: string;
  senderName: string;
  recipientName: string;
  originPort: string;
  destinationPort: string;
  shippingLineId: string;
  shippingLineName: string;
  containerNumber: string;
  bookingNumber: string;
  vesselName: string;
  etdDate: string; // Estimated departure
  etaDate: string; // Estimated arrival
  actualArrivalDate?: string;
  transitDays: number;
  status: TransitStatus;
  documents: TransitDocument[];
  customsAgentName?: string; // Nom du transitaire
  additionalExpenses?: { description: string; amount: number }[]; // Dépenses annexes à prévoir
  freightCost: number;
  handlingCost: number;
  customsFee: number;
  portStorageCost: number;
  inlandTransportCost: number;
  insuranceCost: number;
  totalClientPrice: number;
  currency: string;
  cargoDescription: string;
  weightTons: number;
  volumeM3: number;
  notes: string;
}

export type ShippingTransportMode = 'maritime' | 'terrestre' | 'aerien';

export interface ShippingRoute {
  id?: string;
  origin: string;
  destination: string;
  avgTransitDays: number;
  rate20ft: number;
  rate40ft: number;
  rateTruck?: number;
  transportMode?: ShippingTransportMode;
}

export interface ShippingLine {
  id: string;
  name: string;
  code: string;
  commercialContact: string;
  email: string;
  phone: string;
  transportType?: ShippingTransportMode;
  servedPorts: string[];
  routes: ShippingRoute[];
  freeTimeDays: number; // Franchises surestaries
  paymentTerms: string;
  performanceScore: number; // 0 - 100
  notes: string;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: 'cartons' | 'adhesifs' | 'protections' | 'manutention' | 'consommables';
  quantityInStock: number;
  quantityReserved: number;
  quantityUsedTotal: number;
  minThreshold: number;
  unitCost: number;
  unitPrice: number;
  location: string;
  unit: string;
}

export interface StockMovement {
  id: string;
  date: string;
  stockItemId: string;
  stockItemName: string;
  type: 'entree' | 'sortie' | 'reservation' | 'annulation_reservation';
  quantity: number;
  chantierId?: string;
  chantierCode?: string;
  performedBy: string;
  reason: string;
}

export type VehicleStatus = 'disponible' | 'en_mission' | 'en_maintenance' | 'immobilise';

export interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  type: 'Fourgonnette (10m³)' | 'Fourgon Grand Volume (20m³)' | 'Camion Porteur (40m³)' | 'Semi-remorque (80m³)' | 'Véhicule de liaison';
  volumeCapacityM3: number;
  weightCapacityKg: number;
  usualDriverId: string;
  usualDriverName: string;
  status: VehicleStatus;
  currentLocation: { lat: number; lng: number; address: string };
  mileageKm: number;
  fuelConsumptionAvg: number; // L / 100km
  costPerKm: number;
  insuranceExpiry: string;
  inspectionExpiry: string; // Visite technique
  greyCardNumber: string;
  lastMaintenanceDate: string;
  nextMaintenanceKm: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  phone: string;
  email: string;
  address: string;
  hireDate: string;
  contractType: 'CDI' | 'CDD' | 'Intérim' | 'Prestataire';
  teamName: string;
  status: 'actif' | 'en_conge' | 'en_mission' | 'arret';
  monthlySalary: number;
  hourlyRate: number;
  completedMissionsCount: number;
  performanceRating: number; // 1 to 5
}

export interface EmailMessage {
  id: string;
  folder: 'inbox' | 'sent' | 'drafts';
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  linkedEntityType?: 'client' | 'devis' | 'chantier' | 'facture' | 'transit';
  linkedEntityId?: string;
  attachments?: { name: string; size: string }[];
}

export interface AutomationLog {
  id: string;
  timestamp: string;
  triggerEvent: string;
  actionTaken: string;
  entityType: string;
  entityId: string;
  status: 'succes' | 'alerte' | 'erreur';
  details: string;
}
