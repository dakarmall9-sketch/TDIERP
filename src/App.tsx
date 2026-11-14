import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { NotificationContainer } from './components/common/NotificationContainer';
import { ArchitectureDocsModal } from './components/architecture/ArchitectureDocsModal';
import { AutomationEngineModal } from './components/modules/AutomationEngineModal';
import { GoogleDriveModal } from './components/drive/GoogleDriveModal';
import { CompanySettingsModal } from './components/common/CompanySettingsModal';
import { LoginScreen } from './components/auth/LoginScreen';

// Module Components
import { DashboardsModule } from './components/modules/DashboardsModule';
import { AppointmentsModule } from './components/modules/AppointmentsModule';
import { VolumeEstimatorModule } from './components/modules/VolumeEstimatorModule';
import { QuotesModule } from './components/modules/QuotesModule';
import { DispatchScheduleModule } from './components/modules/DispatchScheduleModule';
import { OperationalTrackingModule } from './components/modules/OperationalTrackingModule';
import { AccountingModule } from './components/modules/AccountingModule';
import { CustomsTransitModule } from './components/modules/CustomsTransitModule';
import { ShippingLinesModule } from './components/modules/ShippingLinesModule';
import { StockInventoryModule } from './components/modules/StockInventoryModule';
import { FleetManagementModule } from './components/modules/FleetManagementModule';
import { HumanResourcesModule } from './components/modules/HumanResourcesModule';
import { EmailClientModule } from './components/modules/EmailClientModule';
import { ClientPortalView } from './components/modules/ClientPortalView';
import { AutomationsModuleView } from './components/modules/AutomationsModuleView';

const MainLayout: React.FC = () => {
  const { authStatus, activeModule, setActiveModule, hasPermission, effectivePermissions } = useApp();
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  if (authStatus !== 'authenticated') {
    return <LoginScreen />;
  }

  const renderActiveModule = () => {
    if (!hasPermission(activeModule)) {
      const firstPermitted = effectivePermissions[0];
      return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Accès non autorisé à ce module</h2>
          <p className="text-xs text-slate-400">
            Votre rôle ou vos permissions actuelles ne permettent pas d’ouvrir ce module. Contactez votre administrateur si vous devez y accéder.
          </p>
          {firstPermitted && (
            <button
              type="button"
              onClick={() => setActiveModule(firstPermitted)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              Retourner à mon espace autorisé
            </button>
          )}
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardsModule />;
      case 'appointments':
        return <AppointmentsModule />;
      case 'volume':
        return <VolumeEstimatorModule />;
      case 'quotes':
        return <QuotesModule />;
      case 'dispatch':
        return <DispatchScheduleModule />;
      case 'operations':
        return <OperationalTrackingModule />;
      case 'accounting':
        return <AccountingModule />;
      case 'customs':
        return <CustomsTransitModule />;
      case 'shipping':
        return <ShippingLinesModule />;
      case 'stock':
        return <StockInventoryModule />;
      case 'fleet':
        return <FleetManagementModule />;
      case 'hr':
        return <HumanResourcesModule />;
      case 'emails':
        return <EmailClientModule />;
      case 'client-portal':
        return <ClientPortalView />;
      case 'automations':
        return <AutomationsModuleView />;
      default:
        return <DashboardsModule />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        onOpenArchitecture={() => setIsArchitectureModalOpen(true)}
        onOpenAutomations={() => setIsAutomationModalOpen(true)}
        onOpenDrive={() => setIsDriveModalOpen(true)}
        onOpenCompanySettings={() => setIsCompanySettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenDrive={() => setIsDriveModalOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#090e1a]">
          <div className="max-w-7xl mx-auto pb-12">{renderActiveModule()}</div>
        </main>
      </div>

      <NotificationContainer />

      <ArchitectureDocsModal
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
      />

      <AutomationEngineModal
        isOpen={isAutomationModalOpen}
        onClose={() => setIsAutomationModalOpen(false)}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />

      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
