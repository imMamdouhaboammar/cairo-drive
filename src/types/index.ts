export interface VehicleConfig {
  mass: number;
  chassisWidth: number;
  chassisHeight: number;
  chassisLength: number;
  wheelRadius: number;
  wheelWidth: number;
  suspensionRestLength: number;
  maxSuspensionTravel: number;
  suspensionStiffness: number;
  suspensionCompression: number;
  suspensionRelaxation: number;
  maxSuspensionForce: number;
  engineForce: number;
  brakeForce: number;
  handbrakeForce: number;
  maxSteeringAngle: number;
  steeringSpeed: number;
  lateralGripFactor: number;
  longitudinalGripFactor: number;
}

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  currentGear: number | 'R' | 'N';
  steeringAngle: number;
  engineLoad: number;
  isBraking: boolean;
  isHandbraking: boolean;
  isHeadlightsOn: boolean;
  slipRatio: number;
  suspensionCompression: [number, number, number, number];
  position: { x: number; y: number; z: number };
  heading: number; // in radians
  currentDistrict: string;
  currentDistrictArabic: string;
}

export type CameraMode = 'chase' | 'close' | 'hood' | 'interior' | 'orbit';

export interface TrafficVehicleData {
  id: number;
  type: 'microbus' | 'taxi' | 'tuktuk';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  color: string;
}

export interface RoadSegmentData {
  id: string;
  name: string;
  nameArabic: string;
  type: 'arterial' | 'bridge' | 'ramp' | 'alley' | 'roundabout';
  points: [number, number, number][]; // X, Y, Z
  width: number;
  lanes: number;
  elevation: number;
  speedLimit: number;
  hasBumps?: boolean;
}

export interface LandmarkLocation {
  name: string;
  nameArabic: string;
  position: [number, number, number];
  rotationY: number;
  description: string;
}
