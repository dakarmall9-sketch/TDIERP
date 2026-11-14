import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  Camera,
  PenTool,
  AlertTriangle,
  MapPin,
  Package,
  Smartphone,
  Upload,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChantierIncident, ChantierStatus } from '../../types';
import { uploadFileToFirebaseStorage } from '../../services/firebaseClient';
import { useRealtimeAutoSave, useLocalDraft } from '../../hooks/useAutoSave';

export const OperationalTrackingModule: React.FC = () => {
  const {
    chantiers,
    focusedChantierId,
    setFocusedChantierId,
    updateChantier,
    updateChantierStatus,
    addChantierIncident,
    resolveChantierIncident,
    notify,
  } = useApp();

  const [selectedChantierId, setSelectedChantierId] = useState<string>(
    focusedChantierId || chantiers[0]?.id || ''
  );
  const [nameSearch, setNameSearch] = useState('');
  const [isDriverMobileMode, setIsDriverMobileMode] = useState(false);

  // Real incident state (draft persisted)
  const [incidentType, setIncidentType] = useLocalDraft<ChantierIncident['type']>(
    'transmove_draft_ops_incident_type',
    'retard'
  );
  const [incidentText, setIncidentText, clearIncidentText] = useLocalDraft(
    'transmove_draft_ops_incident_text',
    ''
  );

  // Photo upload state
  const [photoStage, setPhotoStage] = useState<'avant' | 'pendant' | 'apres'>('pendant');
  const [photoCaption, setPhotoCaption, clearPhotoCaption] = useLocalDraft(
    'transmove_draft_ops_photo_caption',
    ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Signature state
  const [signerName, setSignerName, clearSignerName] = useLocalDraft(
    'transmove_draft_ops_signer_name',
    ''
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (focusedChantierId && chantiers.some((c) => c.id === focusedChantierId)) {
      setSelectedChantierId(focusedChantierId);
      setFocusedChantierId(null);
    } else if (!selectedChantierId && chantiers[0]?.id) {
      setSelectedChantierId(chantiers[0].id);
    }
  }, [focusedChantierId, chantiers, selectedChantierId, setFocusedChantierId]);

  const filteredChantiers = chantiers.filter(
    (c) =>
      c.clientName.toLowerCase().includes(nameSearch.toLowerCase()) ||
      c.teamLeaderName.toLowerCase().includes(nameSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(nameSearch.toLowerCase())
  );

  const selectedChantier =
    chantiers.find((c) => c.id === selectedChantierId) || filteredChantiers[0] || chantiers[0];

  const [internalNotesDraft, setInternalNotesDraft] = useState(selectedChantier?.internalNotes || '');
  const hydratedChantierNotesIdRef = useRef<string>('');

  useEffect(() => {
    if (!selectedChantier) return;
    if (hydratedChantierNotesIdRef.current !== selectedChantier.id) {
      setInternalNotesDraft(selectedChantier.internalNotes || '');
      hydratedChantierNotesIdRef.current = selectedChantier.id;
    }
  }, [selectedChantier]);

  useRealtimeAutoSave({
    enabled: Boolean(selectedChantier && hydratedChantierNotesIdRef.current === selectedChantier.id),
    data: internalNotesDraft,
    resetKey: selectedChantier?.id || 'none',
    delayMs: 600,
    onSave: (notesValue) => {
      if (!selectedChantier) return;
      updateChantier({ ...selectedChantier, internalNotes: notesValue }, { silent: true });
    },
  });

  const steps: { key: ChantierStatus; label: string; desc: string }[] = [
    { key: 'programme', label: 'Départ', desc: 'Départ vers le site client' },
    { key: 'en_attente', label: 'Arrivé chez le client', desc: 'Équipe arrivée sur place' },
    { key: 'en_cours', label: 'Chantier débuté', desc: 'Démarrage de l’intervention' },
    { key: 'en_transit', label: 'Colisage', desc: 'Emballage et mise en cartons' },
    { key: 'arrive_depot', label: 'Chargement', desc: 'Chargement / déchargement camion' },
    { key: 'livre', label: 'Chantier terminé', desc: 'Prestation achevée sur site' },
    { key: 'termine', label: 'Signature des documents', desc: 'Émargement client & clôture' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === selectedChantier?.status);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSignAndComplete = () => {
    if (!selectedChantier) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL() : 'data:image/svg+xml;utf8,<svg/>';

    updateChantierStatus(selectedChantier.id, 'termine', undefined, {
      dataUrl,
      signerName: signerName.trim() || selectedChantier.clientName,
    });
    clearSignerName();
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedChantier) return;

    setIsUploadingPhoto(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `chantiers/${selectedChantier.id}/${Date.now()}_${safeName}`;
      const downloadUrl = await uploadFileToFirebaseStorage(path, file, 8 * 1024 * 1024);

      updateChantierStatus(selectedChantier.id, selectedChantier.status, [
        {
          url: downloadUrl,
          caption: photoCaption.trim() || `Photo terrain (${photoStage})`,
          stage: photoStage,
        },
      ]);
      clearPhotoCaption();
      notify('Photo enregistrée', `La photo "${file.name}" a été ajoutée au dossier ${selectedChantier.code}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Échec du téléversement Firebase Storage.';
      notify('Erreur upload photo', msg, 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddIncident = () => {
    if (!incidentText.trim() || !selectedChantier) return;
    addChantierIncident(selectedChantier.id, {
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: incidentType,
      description: incidentText.trim(),
      resolved: false,
    });
    clearIncidentText();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 5
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Suivi Opérationnel & Team Leader
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Checklist de mission en temps réel, preuves photos Firebase Storage, incidents terrain et signature électronique du bon de livraison
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsDriverMobileMode(!isDriverMobileMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              isDriverMobileMode
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isDriverMobileMode ? 'Quitter Vue Mobile' : 'Simuler Vue Team Leader (Mobile)'}</span>
          </button>
        </div>
      </div>

      {/* Search & Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            placeholder="Rechercher par nom de client ou team leader..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Chantier :</span>
          <select
            value={selectedChantier?.id || ''}
            onChange={(e) => setSelectedChantierId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:border-amber-500 font-semibold cursor-pointer w-full"
          >
            {filteredChantiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.clientName} (Leader : {c.teamLeaderName.split(' ')[0]}) • {c.status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedChantier && (
        <div className={isDriverMobileMode ? 'max-w-md mx-auto ring-8 ring-slate-800 rounded-3xl p-4 bg-slate-950 shadow-2xl space-y-4' : 'space-y-6'}>
          {isDriverMobileMode && (
            <div className="text-center pb-2 border-b border-slate-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Mode Embarqué Chauffeur / Tablette
              </span>
              <div className="text-xs font-bold text-white mt-0.5">{selectedChantier.code}</div>
            </div>
          )}

          {/* Stepper Status Progression */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">
              Progression en Temps Réel du Chantier
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {steps.map((st, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = selectedChantier.status === st.key;

                return (
                  <button
                    key={st.key}
                    onClick={() => updateChantierStatus(selectedChantier.id, st.key)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold font-mono">0{idx + 1}</span>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className={`text-xs font-bold ${isCurrent ? 'text-amber-400' : ''}`}>
                      {st.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mission Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Itinéraire & Contact Client
              </h4>
              <div className="text-xs space-y-2">
                <div>
                  <div className="text-slate-400 text-[10px]">Client :</div>
                  <div className="font-bold text-white">{selectedChantier.clientName}</div>
                  <div className="text-slate-300">{selectedChantier.clientPhone}</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-emerald-400 text-[10px] font-bold">DÉPART (Chargement) :</div>
                  <div className="text-slate-200">{selectedChantier.originAddress}</div>
                </div>
                <div className="pt-1">
                  <div className="text-rose-400 text-[10px] font-bold">ARRIVÉE (Livraison) :</div>
                  <div className="text-slate-200">{selectedChantier.destinationAddress}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                Moyens Affectés & Volume
              </h4>
              <div className="text-xs space-y-2">
                <div>
                  <div className="text-slate-400 text-[10px]">Véhicule :</div>
                  <div className="font-bold text-white">{selectedChantier.vehiclePlate}</div>
                  <div className="text-slate-400 text-[11px]">{selectedChantier.vehicleName}</div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-slate-400 text-[10px]">Chef d'équipe :</div>
                  <div className="font-bold text-slate-200">{selectedChantier.teamLeaderName}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Équipiers : {selectedChantier.moverNames.join(', ') || 'Non assignés'}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 font-bold text-amber-400">
                  Volume : {selectedChantier.actualVolumeM3 || selectedChantier.volumeM3} m³
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Consommables & Matériel Utilisé
              </h4>
              <div className="space-y-1.5 text-xs">
                {selectedChantier.usedMaterials.map((mat, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-300">{mat.materialName}</span>
                    <span className="font-bold text-amber-400">{mat.quantity}</span>
                  </div>
                ))}
                {selectedChantier.usedMaterials.length === 0 && (
                  <div className="text-slate-500 text-[11px]">Aucun consommable enregistré</div>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                  Notes & Consignes Terrain
                </label>
                <textarea
                  rows={2}
                  placeholder="Saisir des consignes ou remarques d'équipe..."
                  value={internalNotesDraft}
                  onChange={(e) => setInternalNotesDraft(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Photos Proofs & Incidents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photos Galerie */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  Preuves Photos (Avant / Pendant / Après)
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <select
                  value={photoStage}
                  onChange={(e) => setPhotoStage(e.target.value as 'avant' | 'pendant' | 'apres')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                >
                  <option value="avant">Avant</option>
                  <option value="pendant">Pendant</option>
                  <option value="apres">Après</option>
                </select>
                <input
                  type="text"
                  placeholder="Légende photo (optionnel)..."
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="flex-1 min-w-[140px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploadingPhoto ? 'Envoi...' : 'Importer Photo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selectedChantier.photos.map((p, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-800 group">
                    <img src={p.url} alt={p.caption} className="w-full h-28 object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-1.5 text-[10px] text-slate-300 truncate">
                      <span className="uppercase font-bold text-amber-400 mr-1">[{p.stage}]</span>
                      {p.caption}
                    </div>
                  </div>
                ))}
                {selectedChantier.photos.length === 0 && (
                  <div className="col-span-2 h-28 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-500">
                    Aucune photo importée pour l’instant
                  </div>
                )}
              </div>
            </div>

            {/* Incidents & Notes */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Incidents & Remarques Terrain
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {selectedChantier.incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      inc.resolved
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-rose-500/10 border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold ${inc.resolved ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Incident ({inc.type.toUpperCase()}) • {inc.time}
                      </span>
                      <button
                        type="button"
                        onClick={() => resolveChantierIncident(selectedChantier.id, inc.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-500"
                      >
                        {inc.resolved ? 'Résolu ✓' : 'Marquer résolu'}
                      </button>
                    </div>
                    <p className="text-slate-300 mt-1">{inc.description}</p>
                  </div>
                ))}

                {selectedChantier.incidents.length === 0 && (
                  <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                    Aucun incident signalé sur ce chantier.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as ChantierIncident['type'])}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  <option value="retard">Retard</option>
                  <option value="acces">Accès</option>
                  <option value="casse">Casse</option>
                  <option value="intemperie">Intempérie</option>
                  <option value="client">Client</option>
                  <option value="autre">Autre</option>
                </select>
                <input
                  type="text"
                  placeholder="Décrire l'incident terrain..."
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                  className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddIncident}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs"
                >
                  Consigner
                </button>
              </div>
            </div>
          </div>

          {/* Electronic Signature Canvas & Bon de Livraison Closure */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-400" />
                  Bon de Livraison & Signature Électronique du Client
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  La signature tactile clôture le chantier et déclenche la génération automatique de la facture
                </p>
              </div>

              {selectedChantier.signedAt && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Émargé le {new Date(selectedChantier.signedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {selectedChantier.clientSignature ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Signataire :</div>
                  <div className="font-bold text-white text-sm">{selectedChantier.signerName}</div>
                  <div className="text-[10px] text-slate-500">
                    Horodatage certifié : {selectedChantier.signedAt}
                  </div>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-700">
                  <img src={selectedChantier.clientSignature} alt="Signature" className="h-14 object-contain" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom du réceptionnaire / signataire
                  </label>
                  <input
                    type="text"
                    placeholder="Nom du signataire"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="relative border-2 border-dashed border-amber-500/40 rounded-xl bg-slate-950 overflow-hidden">
                  <div className="absolute top-2 left-3 text-[10px] text-slate-500 pointer-events-none select-none">
                    Signez ici au doigt ou avec la souris
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair touch-none"
                  />
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="absolute top-2 right-2 text-slate-500 hover:text-white p-1"
                    title="Effacer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSignAndComplete}
                    disabled={!hasSignature && !signerName}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider Bon de Livraison & Générer Facture</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
