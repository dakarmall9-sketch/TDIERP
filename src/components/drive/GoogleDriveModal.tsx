import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Download,
  RotateCcw,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  FolderOpen,
  LogOut,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  listDriveBackups,
  uploadBackupToDrive,
  downloadBackupFromDrive,
  deleteFileFromDrive,
  uploadDocumentToDrive,
  DriveFile,
} from '../../services/googleDriveService';
import confetti from 'canvas-confetti';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const {
    googleUser,
    googleToken,
    isGoogleConnected,
    connectGoogleDrive,
    disconnectGoogleDrive,
    exportStateSnapshot,
    restoreStateSnapshot,
    lastBackupDate,
    setLastBackupDate,
    notify,
    quotes,
    invoices,
    transitShipments,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'backups' | 'export_docs' | 'settings'>('backups');
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Destructive Confirmation States
  const [fileToRestore, setFileToRestore] = useState<DriveFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Document export status
  const [exportingDocId, setExportingDocId] = useState<string | null>(null);

  // Load backups when connected
  const refreshBackupsList = async () => {
    if (!googleToken) return;
    setIsLoading(true);
    try {
      const files = await listDriveBackups(googleToken);
      setBackups(files);
    } catch (err: any) {
      notify('Erreur Drive', err.message || 'Impossible de lister les sauvegardes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isGoogleConnected && googleToken) {
      refreshBackupsList();
    }
  }, [isOpen, isGoogleConnected, googleToken]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const token = await connectGoogleDrive();
      if (token) {
        setIsLoading(true);
        const files = await listDriveBackups(token);
        setBackups(files);
        setIsLoading(false);
      }
    } catch (err) {
      // Error is handled in context
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!googleToken) {
      notify('Non connecté', 'Veuillez vous connecter à Google Drive en premier', 'warning');
      return;
    }

    setIsBackingUp(true);
    try {
      const snapshot = exportStateSnapshot();
      const uploadedFile = await uploadBackupToDrive(googleToken, snapshot);
      
      const now = new Date().toISOString();
      setLastBackupDate(now);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      notify(
        'Sauvegarde réussie !',
        `Sauvegarde enregistrée dans le dossier TransMove_ERP_Backups sur Google Drive (${uploadedFile.name})`,
        'success'
      );

      // Refresh list
      await refreshBackupsList();
    } catch (err: any) {
      notify('Échec de la sauvegarde', err.message || 'Erreur inconnue', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!fileToRestore || !googleToken) return;
    setIsProcessingAction(true);
    try {
      const snapshotData = await downloadBackupFromDrive(googleToken, fileToRestore.id);
      const success = restoreStateSnapshot(snapshotData);
      if (success) {
        setFileToRestore(null);
        onClose();
      }
    } catch (err: any) {
      notify('Erreur de restauration', err.message || 'Impossible de lire le fichier', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete || !googleToken) return;
    setIsProcessingAction(true);
    try {
      await deleteFileFromDrive(googleToken, fileToDelete.id);
      notify('Fichier supprimé', `Le fichier ${fileToDelete.name} a été supprimé de Google Drive`, 'info');
      setFileToDelete(null);
      await refreshBackupsList();
    } catch (err: any) {
      notify('Erreur de suppression', err.message || 'Échec de la suppression', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDownloadLocalSnapshot = () => {
    const snapshot = exportStateSnapshot();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TransMove_ERP_Backup_Local_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notify('Téléchargement local', 'Sauvegarde JSON téléchargée sur votre poste', 'info');
  };

  const handleExportDocToDrive = async (type: 'quote' | 'invoice' | 'transit', item: any) => {
    if (!googleToken) {
      notify('Non connecté', 'Connectez Google Drive pour exporter des documents', 'warning');
      return;
    }

    const docId = item.id;
    setExportingDocId(docId);
    try {
      let fileName = '';
      let content = '';

      if (type === 'quote') {
        fileName = `Devis_${item.number}_${item.clientName.replace(/\s+/g, '_')}.json`;
        content = JSON.stringify(item, null, 2);
      } else if (type === 'invoice') {
        fileName = `Facture_${item.number}_${item.clientName.replace(/\s+/g, '_')}.json`;
        content = JSON.stringify(item, null, 2);
      } else if (type === 'transit') {
        fileName = `Transit_Expedition_${item.reference}_${item.clientName.replace(/\s+/g, '_')}.json`;
        content = JSON.stringify(item, null, 2);
      }

      const res = await uploadDocumentToDrive(googleToken, fileName, content, 'application/json');
      notify(
        'Document exporté',
        `${fileName} a été copié sur votre Google Drive`,
        'success'
      );
      await refreshBackupsList();
    } catch (err: any) {
      notify('Erreur export', err.message, 'error');
    } finally {
      setExportingDocId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Stockage & Sauvegardes Google Drive
                </h2>
                {isGoogleConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connecté
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Non connecté
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Sauvegardes cloud automatiques, exports de devis et synchronisation ERP sécurisée.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('backups')}
            className={`pb-3 font-semibold px-2 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'backups'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Sauvegardes ERP Drive
          </button>
          <button
            onClick={() => setActiveTab('export_docs')}
            className={`pb-3 font-semibold px-2 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'export_docs'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Archivage Devis & Factures
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 font-semibold px-2 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Compte & Sécurité
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Connection Banner */}
          {!googleUser ? (
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-white text-base">
                    Connectez votre compte Google Workspace ou Gmail
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  L'intégration créera un dossier dédié <strong className="text-blue-300">TransMove_ERP_Backups</strong> dans votre Google Drive personnel ou d'entreprise. Vous pourrez sauvegarder l'intégralité des dossiers, devis, clients et factures en 1 clic.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Chiffrement Google Cloud
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Droit restreint aux fichiers créés par l'applet
                  </span>
                </div>
              </div>

              {/* Official Google Sign-In Styled Button */}
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white text-slate-800 font-semibold text-xs hover:bg-slate-100 transition shadow-lg shadow-white/10 active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Se connecter avec Google</span>
              </button>
            </div>
          ) : (
            /* Connected User Card */
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-800/80 border border-slate-700 gap-4">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                    {googleUser.displayName?.[0] || googleUser.email?.[0] || 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {googleUser.displayName || 'Utilisateur Google'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Google Drive
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{googleUser.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshBackupsList}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition"
                  title="Actualiser la liste"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
                <button
                  type="button"
                  onClick={disconnectGoogleDrive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnecter</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: BACKUPS */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              {/* Backup Action Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-sm text-amber-300">Sauvegarde Cloud en 1 Clic</h4>
                    </div>
                    {lastBackupDate && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Dernière : {new Date(lastBackupDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Exporte l'état complet : {quotes.length} devis, {invoices.length} factures, {transitShipments.length} dossiers transit, stock et chantiers.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateBackup}
                    disabled={isBackingUp || !isGoogleConnected}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Téléversement sur Google Drive en cours...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 fill-current" />
                        <span>Sauvegarder maintenant sur Google Drive</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-sm text-cyan-300">Export Local JSON</h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    Téléchargez un fichier de sauvegarde physique directement sur votre ordinateur sans passer par le cloud.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadLocalSnapshot}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger la sauvegarde locale (.json)</span>
                  </button>
                </div>
              </div>

              {/* List of Drive Backups */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    Fichiers trouvés dans « TransMove_ERP_Backups » ({backups.length})
                  </h4>
                  {isGoogleConnected && (
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Ouvrir Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {isLoading ? (
                  <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Recherche des sauvegardes sur Google Drive...</p>
                  </div>
                ) : !isGoogleConnected ? (
                  <div className="p-8 text-center bg-slate-800/20 rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs">
                    Connectez votre compte Google ci-dessus pour consulter et restaurer vos sauvegardes.
                  </div>
                ) : backups.length === 0 ? (
                  <div className="p-8 text-center bg-slate-800/20 rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs">
                    Aucune sauvegarde pour l'instant. Cliquez sur le bouton "Sauvegarder maintenant" ci-dessus pour effectuer votre première sauvegarde.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-800/40 overflow-hidden">
                    {backups.map((file) => (
                      <div
                        key={file.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/70 transition"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate max-w-sm sm:max-w-md">
                                {file.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                                {file.size ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` : 'JSON'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Enregistré le {new Date(file.createdTime).toLocaleString('fr-FR')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-xs transition"
                              title="Voir sur Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setFileToRestore(file)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                            title="Supprimer définitivement du Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT SPECIFIC DOCUMENTS */}
          {activeTab === 'export_docs' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-xs text-slate-300 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  Exportez directement des devis, factures ou dossiers de transit individuels vers Google Drive pour archivage légal ou partage avec vos partenaires maritimes et douaniers.
                </p>
              </div>

              {/* Quotes Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Devis Réglos & Acceptés
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quotes.slice(0, 4).map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">
                          {q.number} - {q.clientName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {q.volumeM3} m³ • {q.total.toLocaleString()} {q.currency}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportDocToDrive('quote', q)}
                        disabled={exportingDocId === q.id || !isGoogleConnected}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        {exportingDocId === q.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Cloud className="w-3 h-3" />
                        )}
                        <span>Drive</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transit Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Dossiers de Transit Maritime & Douane
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {transitShipments.slice(0, 4).map((sh) => (
                    <div
                      key={sh.id}
                      className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">
                          {sh.reference} - {sh.clientName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Conteneur: {sh.containerNumber || 'N/A'} • {sh.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportDocToDrive('transit', sh)}
                        disabled={exportingDocId === sh.id || !isGoogleConnected}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        {exportingDocId === sh.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Cloud className="w-3 h-3" />
                        )}
                        <span>Drive</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS & ARCHITECTURE */}
          {activeTab === 'settings' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Sécurité et Accès aux Données
                </h4>
                <p>
                  TransMove OS applique le principe du <strong>moindre privilège</strong>. L'application utilise le scope OAuth officiel :
                </p>
                <code className="block bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300">
                  https://www.googleapis.com/auth/drive.file
                </code>
                <p className="text-slate-400">
                  Ce scope garantit que TransMove ne peut voir ni modifier aucun de vos documents personnels existants sur Google Drive. L'ERP a accès uniquement aux dossiers et fichiers qu'il a lui-même créés dans « TransMove_ERP_Backups ».
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <h4 className="font-bold text-white text-sm">Gestion des jetons en mémoire</h4>
                <p className="text-slate-400">
                  Aucun jeton secret d'accès Google Drive n'est stocké de façon persistante dans le navigateur (pas de stockage non chiffré dans le localStorage). À la fermeture de session, le jeton est immédiatement purgé de la mémoire vive.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-slate-500" />
            <span>TransMove OS Storage Engine</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
          >
            Fermer
          </button>
        </div>

        {/* MANDATORY CONFIRMATION MODAL: RESTORE DESTRUCTIVE ACTION */}
        {fileToRestore && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Confirmer la restauration ?
                  </h3>
                  <span className="text-xs text-amber-400 font-medium">
                    Attention : remplacement des données
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p>
                  Fichier sélectionné : <strong className="text-white">{fileToRestore.name}</strong>
                </p>
                <p className="text-slate-400">
                  Date de la sauvegarde : {new Date(fileToRestore.createdTime).toLocaleString('fr-FR')}
                </p>
                <p className="text-red-400 font-semibold pt-1">
                  Cette action remplacera toutes les données actuelles de l'ERP par les données contenues dans cette sauvegarde.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFileToRestore(null)}
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isProcessingAction}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>Confirmer la restauration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANDATORY CONFIRMATION MODAL: DELETE DESTRUCTIVE ACTION */}
        {fileToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Supprimer de Google Drive ?
                  </h3>
                  <span className="text-xs text-red-400 font-medium">
                    Action irréversible
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p>
                  Êtes-vous sûr de vouloir supprimer définitivement ce fichier de votre espace Google Drive ?
                </p>
                <p className="font-bold text-white pt-1">
                  {fileToDelete.name}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isProcessingAction}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Supprimer définitivement</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
