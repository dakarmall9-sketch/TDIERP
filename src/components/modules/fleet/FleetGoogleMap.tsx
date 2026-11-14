import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  Truck,
  RotateCcw,
  Compass,
  MapPin,
  Gauge,
  UserCheck,
  ShieldCheck,
  Zap,
  Globe2,
  Maximize2,
} from 'lucide-react';
import { Vehicle } from '../../../types';

interface FleetGoogleMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle;
  onSelectVehicle: (v: Vehicle) => void;
  onSimulateMove?: (vehicleId: string) => void;
}

// Controller component to handle programmatic camera adjustments
const MapController: React.FC<{
  selectedVehicle: Vehicle | null;
  vehicles: Vehicle[];
  fitBoundsTrigger: number;
}> = ({ selectedVehicle, vehicles, fitBoundsTrigger }) => {
  const map = useMap();

  // Fit bounds to all vehicles
  const fitAll = useCallback(() => {
    const googleMaps = (window as any).google?.maps;
    if (!map || vehicles.length === 0 || !googleMaps?.LatLngBounds) return;
    const bounds = new googleMaps.LatLngBounds();
    vehicles.forEach((v) => {
      if (v.currentLocation?.lat && v.currentLocation?.lng) {
        bounds.extend({ lat: v.currentLocation.lat, lng: v.currentLocation.lng });
      }
    });
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [map, vehicles]);

  useEffect(() => {
    if (fitBoundsTrigger > 0) {
      fitAll();
    }
  }, [fitBoundsTrigger, fitAll]);

  // Pan to selected vehicle when changed
  useEffect(() => {
    if (map && selectedVehicle?.currentLocation) {
      map.panTo({
        lat: selectedVehicle.currentLocation.lat,
        lng: selectedVehicle.currentLocation.lng,
      });
      // Set comfortable zoom if zoomed far out
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 11) {
        map.setZoom(13);
      }
    }
  }, [map, selectedVehicle]);

  return null;
};

export const FleetGoogleMap: React.FC<FleetGoogleMapProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onSimulateMove,
}) => {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [activeMarkerVehicle, setActiveMarkerVehicle] = useState<Vehicle | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(1);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  // Default initial center: Dakar depot if available, otherwise Paris/fallback
  const defaultCenter = useMemo(() => {
    if (selectedVehicle?.currentLocation) {
      return {
        lat: selectedVehicle.currentLocation.lat,
        lng: selectedVehicle.currentLocation.lng,
      };
    }
    return { lat: 14.7167, lng: -17.4677 };
  }, [selectedVehicle]);

  const getMarkerColors = (status: Vehicle['status']) => {
    switch (status) {
      case 'disponible':
        return { background: '#10b981', glyph: '#064e3b', border: '#34d399', label: 'Disponible' };
      case 'en_mission':
        return { background: '#f59e0b', glyph: '#78350f', border: '#fbbf24', label: 'En Mission' };
      case 'en_maintenance':
        return { background: '#3b82f6', glyph: '#1e3a8a', border: '#60a5fa', label: 'Révision' };
      case 'immobilise':
      default:
        return { background: '#f43f5e', glyph: '#881337', border: '#fb7185', label: 'Immobilisé' };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Map Control Bar */}
      <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">
                Géolocalisation Flotte en Temps Réel (Google Maps)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live GPS Télématique
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {vehicles.length} véhicules suivis par balises télématiques satellitaires
            </p>
          </div>
        </div>

        {/* Quick Map Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Fit Bounds */}
          <button
            type="button"
            onClick={() => setFitBoundsTrigger((prev) => prev + 1)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            title="Recadrer la carte sur tous les camions"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Vue Globale</span>
          </button>

          {/* Map Type Switcher */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
            title="Basculer vue Plan / Satellite"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{mapType === 'roadmap' ? 'Satellite' : 'Plan'}</span>
          </button>

          {/* Simulate movement */}
          {onSimulateMove && (
            <button
              type="button"
              onClick={() => onSimulateMove(selectedVehicle.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
              title="Simuler un ping GPS en direct le long du trajet"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simuler Déplacement GPS</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Google Maps Viewport */}
      <div className="relative w-full h-[400px] sm:h-[480px] bg-slate-950">
        {!apiKey ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 text-slate-300">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3">
              <Navigation className="w-8 h-8 animate-pulse" />
            </div>
            <h4 className="text-white font-bold text-sm mb-1">Module GPS Google Maps</h4>
            <p className="text-xs text-slate-400 max-w-md">
              Connexion à l'infrastructure télématique Google Maps Platform en cours...
            </p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey} solutionChannel="GMP_aistudio_build">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultCenter}
            defaultZoom={12}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: '100%', height: '100%' }}
          >
            <MapController
              selectedVehicle={selectedVehicle}
              vehicles={vehicles}
              fitBoundsTrigger={fitBoundsTrigger}
            />

            {/* Render Advanced Markers for all vehicles */}
            {vehicles.map((veh) => {
              const isSelected = selectedVehicle.id === veh.id;
              const colors = getMarkerColors(veh.status);

              return (
                <AdvancedMarker
                  key={veh.id}
                  position={{
                    lat: veh.currentLocation.lat,
                    lng: veh.currentLocation.lng,
                  }}
                  onClick={() => {
                    onSelectVehicle(veh);
                    setActiveMarkerVehicle(veh);
                  }}
                  title={`${veh.brand} ${veh.model} (${veh.plateNumber})`}
                >
                  <Pin
                    background={colors.background}
                    glyphColor={colors.glyph}
                    borderColor={isSelected ? '#ffffff' : colors.border}
                    scale={isSelected ? 1.3 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}

            {/* Interactive InfoWindow for clicked vehicle */}
            {activeMarkerVehicle && (
              <InfoWindow
                position={{
                  lat: activeMarkerVehicle.currentLocation.lat,
                  lng: activeMarkerVehicle.currentLocation.lng,
                }}
                onCloseClick={() => setActiveMarkerVehicle(null)}
              >
                <div className="p-1 min-w-[220px] max-w-[280px] text-slate-900 font-sans">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-mono font-bold text-xs bg-slate-900 text-amber-400 px-2 py-0.5 rounded">
                      {activeMarkerVehicle.plateNumber}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">
                      {activeMarkerVehicle.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="pt-2 space-y-1">
                    <h5 className="font-bold text-xs text-slate-900">
                      {activeMarkerVehicle.brand} {activeMarkerVehicle.model}
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      {activeMarkerVehicle.type} ({activeMarkerVehicle.volumeCapacityM3} m³)
                    </p>
                    <div className="text-[11px] text-slate-700 flex items-start gap-1 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{activeMarkerVehicle.currentLocation.address}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                      <span>Chauffeur : <strong>{activeMarkerVehicle.usualDriverName}</strong></span>
                      <span>{activeMarkerVehicle.fuelConsumptionAvg} L/100km</span>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>
        )}

        {/* Floating Telemetry Card on bottom-left */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/80 shadow-2xl max-w-sm text-xs text-slate-200 space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-xs">
                {selectedVehicle.brand} {selectedVehicle.model}
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {selectedVehicle.plateNumber}
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{selectedVehicle.currentLocation.address}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span>Chauffeur : <strong className="text-white">{selectedVehicle.usualDriverName}</strong></span>
              <span className="font-mono text-cyan-400">{selectedVehicle.mileageKm.toLocaleString()} km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
