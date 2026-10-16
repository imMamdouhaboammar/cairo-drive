import * as THREE from 'three';
import { TrafficVehicleData } from '../types';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { CAIRO_ROAD_NETWORK } from './CairoWorldData';

interface AIVehicle {
  id: number;
  type: 'microbus' | 'taxi' | 'tuktuk';
  group: THREE.Group;
  currentRoadIndex: number;
  currentWaypointIndex: number;
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  isStopped: boolean;
  stopTimer: number;
  color: string;
}

export class CairoTraffic {
  public scene: THREE.Scene;
  public trafficGroup: THREE.Group = new THREE.Group();
  public audioSynth: SoundSynthesizer;
  private vehicles: AIVehicle[] = [];
  private lastHornTime = 0;

  constructor(scene: THREE.Scene, audioSynth: SoundSynthesizer) {
    this.scene = scene;
    this.audioSynth = audioSynth;
    this.scene.add(this.trafficGroup);
  }

  public init(trafficCount: number = 22): void {
    const types: ('microbus' | 'taxi' | 'tuktuk')[] = [
      'microbus',
      'microbus',
      'taxi',
      'taxi',
      'taxi',
      'tuktuk',
    ];

    for (let i = 0; i < trafficCount; i++) {
      const type = types[i % types.length]!;
      this.spawnVehicle(i, type);
    }
  }

  private spawnVehicle(id: number, type: 'microbus' | 'taxi' | 'tuktuk'): void {
    // Select a valid road based on type
    const validRoads = CAIRO_ROAD_NETWORK.filter((r) => {
      if (type === 'tuktuk') return r.type === 'alley' || r.type === 'roundabout';
      return r.type === 'arterial' || r.type === 'bridge' || r.type === 'roundabout';
    });

    const roadIndex = (id * 3) % validRoads.length;
    const road = validRoads[roadIndex]!;
    const wpIndex = Math.floor(Math.random() * (road.points.length - 1));
    const p1 = road.points[wpIndex]!;
    const p2 = road.points[wpIndex + 1]!;

    const t = Math.random();
    const startX = p1[0] + (p2[0] - p1[0]) * t;
    const startY = p1[1] + (p2[1] - p1[1]) * t + 0.35;
    const startZ = p1[2] + (p2[2] - p1[2]) * t;

    const angle = Math.atan2(p2[0] - p1[0], p2[2] - p1[2]);

    const group = new THREE.Group();
    group.position.set(startX, startY, startZ);
    group.rotation.y = angle;

    let color = '#ffffff';
    if (type === 'microbus') {
      this.buildMicrobusMesh(group);
      color = '#f8fafc';
    } else if (type === 'taxi') {
      this.buildTaxiMesh(group);
      color = '#1e293b';
    } else {
      this.buildTukTukMesh(group);
      color = '#e11d48';
    }

    this.trafficGroup.add(group);

    const maxSpeed = type === 'tuktuk' ? 8.5 : type === 'microbus' ? 14.0 : 16.5;

    this.vehicles.push({
      id,
      type,
      group,
      currentRoadIndex: CAIRO_ROAD_NETWORK.indexOf(road),
      currentWaypointIndex: wpIndex + 1,
      speed: maxSpeed * 0.7,
      targetSpeed: maxSpeed,
      maxSpeed,
      isStopped: false,
      stopTimer: 0,
      color,
    });
  }

  /**
   * Procedural Egyptian White Microbus (ميكروباص)
   */
  private buildMicrobusMesh(parent: THREE.Group): void {
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 }); // Red side stripe
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.9 });

    // Main boxy body (Toyota HiAce style)
    const bodyGeo = new THREE.BoxGeometry(2.0, 1.4, 4.8);
    const body = new THREE.Mesh(bodyGeo, whiteMat);
    body.position.y = 0.95;
    body.castShadow = true;
    parent.add(body);

    // Decorative side racing stripe
    const stripeGeo = new THREE.BoxGeometry(2.02, 0.18, 4.2);
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0.82;
    parent.add(stripe);

    // Windows band
    const winGeo = new THREE.BoxGeometry(2.02, 0.55, 3.8);
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(0, 1.25, -0.1);
    parent.add(win);

    // Roof Luggage Rack with suitcases
    const rackGeo = new THREE.BoxGeometry(1.6, 0.2, 3.2);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(0, 1.75, -0.2);
    parent.add(rack);

    // 4 Wheels
    const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
    wGeo.rotateZ(Math.PI / 2);
    const wheelPositions = [
      [-1.0, 0.35, 1.5],
      [1.0, 0.35, 1.5],
      [-1.0, 0.35, -1.5],
      [1.0, 0.35, -1.5],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const w = new THREE.Mesh(wGeo, wheelMat);
      w.position.set(wx, wy, wz);
      parent.add(w);
    }
  }

  /**
   * Procedural Cairo Black-and-White Taxi (تاكسي العاصمة)
   */
  private buildTaxiMesh(parent: THREE.Group): void {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.9 });

    // Lower body (Black)
    const lowerGeo = new THREE.BoxGeometry(1.8, 0.45, 4.2);
    const lower = new THREE.Mesh(lowerGeo, blackMat);
    lower.position.y = 0.45;
    lower.castShadow = true;
    parent.add(lower);

    // White door panel stripes (Cairo classic taxi livery)
    const doorGeo = new THREE.BoxGeometry(1.82, 0.35, 2.0);
    const door = new THREE.Mesh(doorGeo, whiteMat);
    door.position.set(0, 0.5, 0);
    parent.add(door);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.55, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, blackMat);
    cabin.position.set(0, 0.95, -0.2);
    parent.add(cabin);

    // Yellow Roof Taxi Sign (TAXI / تاكسي)
    const signGeo = new THREE.BoxGeometry(0.65, 0.2, 0.3);
    const sign = new THREE.Mesh(signGeo, taxiSignMat);
    sign.position.set(0, 1.35, -0.2);
    parent.add(sign);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    wGeo.rotateZ(Math.PI / 2);
    const wheelPositions = [
      [-0.9, 0.32, 1.3],
      [0.9, 0.32, 1.3],
      [-0.9, 0.32, -1.3],
      [0.9, 0.32, -1.3],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const w = new THREE.Mesh(wGeo, wheelMat);
      w.position.set(wx, wy, wz);
      parent.add(w);
    }
  }

  /**
   * Procedural Egyptian Tuk-Tuk (توكتوك)
   */
  private buildTukTukMesh(parent: THREE.Group): void {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.9 });

    // Chassis body
    const bodyGeo = new THREE.BoxGeometry(1.3, 0.7, 2.2);
    const body = new THREE.Mesh(bodyGeo, redMat);
    body.position.y = 0.5;
    body.castShadow = true;
    parent.add(body);

    // Black canvas canopy roof
    const canopyGeo = new THREE.BoxGeometry(1.25, 0.8, 1.6);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 1.15, -0.25);
    parent.add(canopy);

    // Single front wheel
    const frontWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10);
    frontWheelGeo.rotateZ(Math.PI / 2);
    const frontWheel = new THREE.Mesh(frontWheelGeo, wheelMat);
    frontWheel.position.set(0, 0.24, 1.0);
    parent.add(frontWheel);

    // Two rear wheels
    const rearWheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.18, 10);
    rearWheelGeo.rotateZ(Math.PI / 2);
    const rL = new THREE.Mesh(rearWheelGeo, wheelMat);
    rL.position.set(-0.65, 0.25, -0.7);
    parent.add(rL);

    const rR = new THREE.Mesh(rearWheelGeo, wheelMat);
    rR.position.set(0.65, 0.25, -0.7);
    parent.add(rR);
  }

  /**
   * Updates all traffic vehicle paths and checks proximity against player
   */
  public update(deltaTime: number, playerPos: THREE.Vector3, playerSpeed: number): void {
    for (const v of this.vehicles) {
      const road = CAIRO_ROAD_NETWORK[v.currentRoadIndex];
      if (!road) continue;

      // Handle Egyptian microbus passenger pickup stops
      if (v.type === 'microbus') {
        if (!v.isStopped && Math.random() < 0.0008) {
          v.isStopped = true;
          v.stopTimer = 3.5; // Stop for 3.5 seconds
        }
        if (v.isStopped) {
          v.stopTimer -= deltaTime;
          if (v.stopTimer <= 0) v.isStopped = false;
          v.speed = Math.max(0, v.speed - deltaTime * 12);
        }
      }

      // Waypoint following
      const targetPoint = road.points[v.currentWaypointIndex];
      if (!targetPoint) {
        // Next road or loop around
        v.currentRoadIndex = (v.currentRoadIndex + 1) % CAIRO_ROAD_NETWORK.length;
        v.currentWaypointIndex = 0;
        continue;
      }

      const tx = targetPoint[0];
      const ty = targetPoint[1] + 0.35;
      const tz = targetPoint[2];

      const dx = tx - v.group.position.x;
      const dz = tz - v.group.position.z;
      const distToWaypoint = Math.hypot(dx, dz);

      if (distToWaypoint < 4.0) {
        v.currentWaypointIndex++;
        if (v.currentWaypointIndex >= road.points.length) {
          v.currentRoadIndex = (v.currentRoadIndex + 1) % CAIRO_ROAD_NETWORK.length;
          v.currentWaypointIndex = 0;
        }
      }

      // Steer smoothly towards waypoint
      const targetAngle = Math.atan2(dx, dz);
      let angleDiff = targetAngle - v.group.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      v.group.rotation.y += angleDiff * Math.min(deltaTime * 4.0, 1.0);

      // Collision avoidance with Player
      const distToPlayer = v.group.position.distanceTo(playerPos);
      if (distToPlayer < 9.5) {
        // Slow down to prevent crashing into player
        v.targetSpeed = 0;
        // If player cuts off or blocks the vehicle, sound authentic Egyptian horn!
        if (distToPlayer < 7.0 && Date.now() - this.lastHornTime > 4000) {
          this.audioSynth.playCairoHornPattern();
          this.lastHornTime = Date.now();
        }
      } else {
        v.targetSpeed = v.isStopped ? 0 : v.maxSpeed;
      }

      // Accelerate / decelerate
      if (v.speed < v.targetSpeed) {
        v.speed = Math.min(v.targetSpeed, v.speed + deltaTime * 6.5);
      } else {
        v.speed = Math.max(v.targetSpeed, v.speed - deltaTime * 14.0);
      }

      // Move forward
      const moveDist = v.speed * deltaTime;
      v.group.translateZ(moveDist);
      v.group.position.y = THREE.MathUtils.lerp(v.group.position.y, ty, 0.1);
    }
  }

  public getTrafficData(): TrafficVehicleData[] {
    return this.vehicles.map((v) => ({
      id: v.id,
      type: v.type,
      x: v.group.position.x,
      y: v.group.position.y,
      z: v.group.position.z,
      rotationY: v.group.rotation.y,
      speed: v.speed,
      color: v.color,
    }));
  }
}
