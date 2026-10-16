import { create } from 'zustand';
import { CameraMode, VehicleTelemetry, TrafficVehicleData } from '../types';

interface GameState {
  telemetry: VehicleTelemetry;
  cameraMode: CameraMode;
  isMuted: boolean;
  isMinimapExpanded: boolean;
  isControlsHelpOpen: boolean;
  isTeleportOpen: boolean;
  isAudioStarted: boolean;
  activePreset: 'drift' | 'suv' | 'microbus' | 'custom';
  trafficList: TrafficVehicleData[];
  setTelemetry: (t: VehicleTelemetry) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleMute: () => void;
  toggleMinimap: () => void;
  toggleControlsHelp: () => void;
  toggleTeleport: () => void;
  setAudioStarted: (started: boolean) => void;
  setActivePreset: (preset: 'drift' | 'suv' | 'microbus' | 'custom') => void;
  setTrafficList: (traffic: TrafficVehicleData[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  telemetry: {
    speedKmh: 0,
    rpm: 900,
    currentGear: 'N',
    steeringAngle: 0,
    engineLoad: 0,
    isBraking: false,
    isHandbraking: false,
    isHeadlightsOn: true,
    slipRatio: 0,
    suspensionCompression: [0, 0, 0, 0],
    position: { x: 0, y: 1.5, z: 0 },
    heading: 0,
    currentDistrict: 'Tahrir Square (Downtown)',
    currentDistrictArabic: 'ميدان التحرير - وسط البلد',
  },
  cameraMode: 'chase',
  isMuted: false,
  isMinimapExpanded: false,
  isControlsHelpOpen: false,
  isTeleportOpen: false,
  isAudioStarted: false,
  activePreset: 'drift',
  trafficList: [],

  setTelemetry: (telemetry) => set({ telemetry }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleMinimap: () => set((s) => ({ isMinimapExpanded: !s.isMinimapExpanded })),
  toggleControlsHelp: () => set((s) => ({ isControlsHelpOpen: !s.isControlsHelpOpen })),
  toggleTeleport: () => set((s) => ({ isTeleportOpen: !s.isTeleportOpen })),
  setAudioStarted: (isAudioStarted) => set({ isAudioStarted }),
  setActivePreset: (activePreset) => set({ activePreset }),
  setTrafficList: (trafficList) => set({ trafficList }),
}));
