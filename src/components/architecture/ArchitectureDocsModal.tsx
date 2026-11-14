import React, { useState } from 'react';
import {
  Server,
  Database,
  Layers,
  Cpu,
  ShieldCheck,
  Code2,
  GitBranch,
  CheckCircle2,
  FileText,
  Workflow,
  X,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'database' | 'workflows' | 'api' | 'roadmap'>('architecture');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sqlDDL = `-- ========================================================================
-- TRANSMOVE OS - MODÈLE DE BASE DE DONNÉES POSTGRESQL (MULTI-TENANT & RBAC)
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Entreprises (Tenants)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    tax_number VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Utilisateurs & Authentification
CREATE TYPE user_role AS ENUM (
    'admin', 'manager', 'commercial', 'dispatcher', 'driver',
    'accountant', 'warehouse', 'fleet_manager', 'hr', 'client'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'commercial',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Clients & Prospects
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(30),
    country VARCHAR(100) DEFAULT 'Sénégal',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Demandes de Rendez-vous & Visites
CREATE TYPE apt_status AS ENUM ('nouveau', 'contacte', 'visite_planifiee', 'visite', 'devis_envoye', 'gagne', 'perdu');
CREATE TYPE service_type AS ENUM ('local', 'national', 'international', 'import', 'export', 'transport', 'storage');

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50) NOT NULL,
    ordering_customer VARCHAR(255),
    origin_address TEXT NOT NULL,
    origin_floor INT DEFAULT 0,
    origin_elevator BOOLEAN DEFAULT FALSE,
    destination_address TEXT NOT NULL,
    destination_floor INT DEFAULT 0,
    destination_elevator BOOLEAN DEFAULT FALSE,
    target_date DATE NOT NULL,
    service_type service_type NOT NULL,
    estimated_transit_days INT DEFAULT 1,
    special_constraints TEXT[],
    assigned_commercial_id UUID REFERENCES users(id),
    status apt_status DEFAULT 'nouveau',
    notes TEXT,
    estimated_volume_m3 NUMERIC(8, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Estimations du Volume
CREATE TABLE volume_estimations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    total_surveyed_m3 NUMERIC(8, 2) NOT NULL,
    total_dismantled_m3 NUMERIC(8, 2) NOT NULL,
    total_transport_m3 NUMERIC(8, 2) NOT NULL,
    estimated_boxes INT DEFAULT 0,
    recommended_vehicles VARCHAR(150),
    recommended_movers INT DEFAULT 2,
    estimated_price NUMERIC(12, 2),
    items_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Devis
CREATE TYPE quote_status AS ENUM ('brouillon', 'envoye', 'en_attente', 'accepte', 'refuse', 'expire');

CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    number VARCHAR(50) UNIQUE NOT NULL,
    version INT DEFAULT 1,
    appointment_id UUID REFERENCES appointments(id),
    client_id UUID REFERENCES clients(id),
    volume_m3 NUMERIC(8, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 18.00,
    tax_amount NUMERIC(12, 2) NOT NULL,
    fuel_surcharge NUMERIC(12, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    status quote_status DEFAULT 'brouillon',
    validity_date DATE NOT NULL,
    special_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Chantiers / Opérations
CREATE TYPE chantier_status AS ENUM (
    'programme', 'en_attente', 'en_cours', 'en_transit',
    'arrive_depot', 'livre', 'termine', 'annule'
);

CREATE TABLE chantiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    quote_id UUID REFERENCES quotes(id),
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    estimated_end_time TIME,
    volume_m3 NUMERIC(8, 2),
    actual_volume_m3 NUMERIC(8, 2),
    status chantier_status DEFAULT 'programme',
    team_leader_id UUID REFERENCES users(id),
    vehicle_id UUID,
    client_signature TEXT,
    signer_name VARCHAR(150),
    signed_at TIMESTAMP WITH TIME ZONE,
    is_invoice_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Factures & Règlements
CREATE TYPE invoice_status AS ENUM ('brouillon', 'emise', 'payee_partielle', 'payee', 'en_retard', 'annulee');
CREATE TYPE payment_method AS ENUM ('mobile_money', 'virement', 'carte', 'especes', 'cheque');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    number VARCHAR(50) UNIQUE NOT NULL,
    chantier_id UUID REFERENCES chantiers(id),
    quote_id UUID REFERENCES quotes(id),
    client_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    status invoice_status DEFAULT 'emise',
    currency VARCHAR(10) DEFAULT 'EUR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method payment_method NOT NULL,
    reference VARCHAR(150) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES users(id)
);

-- 9. Transit International & Douane
CREATE TYPE transit_status AS ENUM (
    'en_preparation', 'documents_en_cours', 'douane_en_cours',
    'embarque', 'en_transit', 'arrive', 'dedouane', 'livre'
);

CREATE TABLE transit_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    reference VARCHAR(50) UNIQUE NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    origin_port VARCHAR(150) NOT NULL,
    destination_port VARCHAR(150) NOT NULL,
    shipping_line VARCHAR(100),
    container_number VARCHAR(100),
    booking_number VARCHAR(100),
    vessel_name VARCHAR(150),
    etd_date DATE,
    eta_date DATE,
    status transit_status DEFAULT 'en_preparation',
    freight_cost NUMERIC(12, 2) DEFAULT 0,
    customs_fee NUMERIC(12, 2) DEFAULT 0,
    total_client_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_appointments_tenant_date ON appointments(tenant_id, target_date);
CREATE INDEX idx_chantiers_tenant_scheduled ON chantiers(tenant_id, scheduled_date);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_transit_tenant_status ON transit_shipments(tenant_id, status);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                TransMove OS - Architecture & Spécifications ERP
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Production Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Spécifications techniques, modèle relationnel PostgreSQL, workflows automatisés & plan de déploiement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 bg-slate-950/50 border-b border-slate-800 flex gap-2 overflow-x-auto text-sm">
          {[
            { id: 'architecture', label: '1. Architecture Technique', icon: Layers },
            { id: 'database', label: '2. Modèle de Données (PostgreSQL)', icon: Database },
            { id: 'workflows', label: '3. Workflows & Automatisations', icon: Workflow },
            { id: 'api', label: '4. APIs & Intégrations', icon: Code2 },
            { id: 'roadmap', label: '5. Plan de Développement MVP', icon: GitBranch },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                    <Layers className="w-5 h-5" />
                    Frontend Web & PWA
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li>• React 19 + TypeScript + Tailwind CSS</li>
                    <li>• Architecture modulaire par domaine métier</li>
                    <li>• Mode Chauffeur Mobile & signature tactile HTML5</li>
                    <li>• Visualiseur PDF & bons de livraison émargés</li>
                    <li>• Cartographie interactive flotte & ports</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                    <Cpu className="w-5 h-5" />
                    Backend & Moteur d’Événements
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li>• Node.js / Express ou NestJS modulaire</li>
                    <li>• Architecture Event-Driven (Message Broker)</li>
                    <li>• Moteur d'automatisation des cascades</li>
                    <li>• Authentification JWT + RBAC 10 rôles</li>
                    <li>• Isolation stricte Multi-Tenant par TenantID</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                    <Database className="w-5 h-5" />
                    Persistance & Stockage
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li>• PostgreSQL 16 avec JSONB pour inventaires</li>
                    <li>• Row Level Security (RLS) pour isolation multi-société</li>
                    <li>• Stockage d’objets S3 pour photos chantiers & BL</li>
                    <li>• Cache Redis pour positions GPS flotte en direct</li>
                    <li>• Passerelle SMS/WhatsApp & passerelle Mobile Money</li>
                  </ul>
                </div>
              </div>

              {/* Rôles et Permissions Matrix */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Matrice des Rôles & Niveaux d'Accès (RBAC)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-semibold">
                        <th className="py-2 px-3">Rôle Métier</th>
                        <th className="py-2 px-3">RDV & Devis</th>
                        <th className="py-2 px-3">Chantiers & Dispatch</th>
                        <th className="py-2 px-3">Comptabilité & Factures</th>
                        <th className="py-2 px-3">Douane & Transit</th>
                        <th className="py-2 px-3">Stock & Flotte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Administrateur</td>
                        <td className="py-2 px-3 text-emerald-400">Total</td>
                        <td className="py-2 px-3 text-emerald-400">Total</td>
                        <td className="py-2 px-3 text-emerald-400">Total</td>
                        <td className="py-2 px-3 text-emerald-400">Total</td>
                        <td className="py-2 px-3 text-emerald-400">Total</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Direction / Manager</td>
                        <td className="py-2 px-3 text-emerald-400">Validation</td>
                        <td className="py-2 px-3 text-emerald-400">Supervision</td>
                        <td className="py-2 px-3 text-emerald-400">Lecture / Approbation</td>
                        <td className="py-2 px-3 text-emerald-400">Supervision</td>
                        <td className="py-2 px-3 text-emerald-400">Lecture</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Commercial</td>
                        <td className="py-2 px-3 text-emerald-400">Création / Envoi</td>
                        <td className="py-2 px-3 text-slate-500">Lecture seule</td>
                        <td className="py-2 px-3 text-slate-500">Consultation devis</td>
                        <td className="py-2 px-3 text-slate-500">Création dossier</td>
                        <td className="py-2 px-3 text-slate-500">Aucun</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Coordinateur / Dispatcheur</td>
                        <td className="py-2 px-3 text-slate-500">Lecture devis</td>
                        <td className="py-2 px-3 text-emerald-400">Planification & Affectation</td>
                        <td className="py-2 px-3 text-slate-500">Aucun</td>
                        <td className="py-2 px-3 text-amber-400">Coordination route</td>
                        <td className="py-2 px-3 text-emerald-400">Réservation matériel</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Chauffeur / Déménageur</td>
                        <td className="py-2 px-3 text-slate-500">Aucun</td>
                        <td className="py-2 px-3 text-amber-400">Missions, Statut & Signature</td>
                        <td className="py-2 px-3 text-slate-500">Aucun</td>
                        <td className="py-2 px-3 text-slate-500">Aucun</td>
                        <td className="py-2 px-3 text-slate-500">Matériel embarqué</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-white">Comptable</td>
                        <td className="py-2 px-3 text-slate-500">Lecture devis</td>
                        <td className="py-2 px-3 text-slate-500">Lecture chantiers</td>
                        <td className="py-2 px-3 text-emerald-400">Factures, Caisse & Règlements</td>
                        <td className="py-2 px-3 text-amber-400">Frais & Facturation fret</td>
                        <td className="py-2 px-3 text-slate-500">Valorisation stock</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Script DDL PostgreSQL & Schéma Relationnel</h3>
                  <p className="text-xs text-slate-400">Prêt à exécuter avec clés primaires UUID, contraintes de clés étrangères et index</p>
                </div>
                <button
                  onClick={() => copyToClipboard(sqlDDL)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copié dans le presse-papier !' : 'Copier le script SQL'}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto max-h-[420px] text-emerald-400/90 leading-relaxed">
                <pre>{sqlDDL}</pre>
              </div>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white mb-2">Les 6 Boucles d'Automatisation Clés de TransMove</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">1</span>
                    Du Prospect au Devis
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    Formulaire public ou interne → Création automatique de la fiche client → Attribution automatique à un commercial disponible → Calcul du volume m³ selon le mobilier → Génération du devis PDF chiffré en 1 clic.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">2</span>
                    Acceptation Devis → Chantier & Stock
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    Le client accepte le devis → Création automatique du Chantier (#CH-xxxx) au planning des opérations → Réservation automatique des cartons, rouleaux adhésifs et couvertures en stock → Notification envoyée au dispatcheur.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">3</span>
                    Livraison & Signature → Facturation Auto
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    Le chauffeur clôture la mission et fait signer le client sur tablette → Bon de livraison horodaté archivé → Génération automatique instantanée de la facture (#FAC-xxxx) → Sortie définitive des matières consommées.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold mb-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">4</span>
                    Paiements & Réconciliation Comptable
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    Paiement reçu via Mobile Money (Wave, Orange Money) ou Virement → Lettrage automatique de la facture → Ajustement de la caisse et du chiffre d'affaires → Marge réelle recalculée en déduisant péages et carburant.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs">5</span>
                    Surveillance Douane & Transit International
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    Suivi du statut conteneur (En préparation, Douane, Embarqué, Arrivé, Dédouané) → Détection automatique des pièces manquantes (B/L, Déclaration d'exportation) → Alertes automatiques avant le cutoff navire.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">6</span>
                    Conformité Flotte & Stock Faible
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    Cron quotidien vérifiant les dates d'assurance et de contrôle technique véhicule (&lt; 30 jours) → Alerte visuelle et email au responsable flotte → Alerte de réapprovisionnement dès que le stock passe sous le seuil critique.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Endpoints REST & Webhooks Recommandés</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-blue-400 font-bold">POST /api/v1/appointments</span>
                  <span className="text-slate-400 font-sans">Création demande de visite (public & interne)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">POST /api/v1/quotes/estimate-volume</span>
                  <span className="text-slate-400 font-sans">Calculateur volumétrique & grille tarifaire</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-purple-400 font-bold">POST /api/v1/quotes/{'{id}'}/accept</span>
                  <span className="text-slate-400 font-sans">Déclencheur d'automatisation (Chantier + Réservation Stock)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-amber-400 font-bold">PATCH /api/v1/chantiers/{'{id}'}/complete</span>
                  <span className="text-slate-400 font-sans">Émargement bon de livraison + Clôture + Auto-Facturation</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">POST /api/v1/webhooks/mobile-money</span>
                  <span className="text-slate-400 font-sans">Réception webhook paiements Wave / Orange Money / Carte</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Plan de Déploiement par Phases</h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="font-semibold text-emerald-400 text-sm mb-1">
                    Phase 1 : Cœur Opérationnel & Automatisation (MVP Déployé ici)
                  </div>
                  <p className="text-xs text-slate-300">
                    Formulaire RDV, calculateur de volume m³, devis PDF avec logo, dispatch chantiers, mode mobile chauffeur avec bon de livraison signé, facturation automatisée, gestion de stock et 3 tableaux de bord.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="font-semibold text-amber-300 text-sm mb-1">
                    Phase 2 : Transit Maritime & Gestion Flotte Avancée
                  </div>
                  <p className="text-xs text-slate-300">
                    Suivi conteneurs maritimes, comparateur de taux de fret compagnies maritimes, télématique GPS boîtiers OBD en direct, alertes d'entretien périodiques et gestion des absences RH.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="font-semibold text-blue-300 text-sm mb-1">
                    Phase 3 : Portail Client & Multi-Devises Internationales
                  </div>
                  <p className="text-xs text-slate-300">
                    Espace client self-service avec suivi temps réel du camion de déménagement, signature en ligne légale, paiement direct Mobile Money intégré, intégration comptable Sage / QuickBooks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-800/60 border-t border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Document d’Architecture Référence • Conforme ISO/IEC 27001 & RGPD
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
          >
            Fermer les spécifications
          </button>
        </div>
      </div>
    </div>
  );
};
