import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { VehicleConfig, VehicleTelemetry } from '../types';
import { CarMeshBuilder } from './CarMeshBuilder';
import { InputState } from '../core/InputManager';

export class RaycastVehicle {
  public physics: PhysicsWorld;
  public chassisBody: RAPIER.RigidBody;
  public controller: RAPIER.DynamicRayCastVehicleController;
  public visualGroup: THREE.Group;
  public wheelMeshes: THREE.Group[];
  public headlights: THREE.SpotLight[];
  public brakeLightMesh: THREE.Mesh;
  public reverseLightMesh: THREE.Mesh;

  public config: VehicleConfig = {
    mass: 1350,
    chassisWidth: 1.85,
    chassisHeight: 0.8,
    chassisLength: 4.4,
    wheelRadius: 0.34,
    wheelWidth: 0.26,
    suspensionRestLength: 0.38,
    maxSuspensionTravel: 0.22,
    suspensionStiffness: 38.0,
    suspensionCompression: 4.2,
    suspensionRelaxation: 5.8,
    maxSuspensionForce: 16000,
    engineForce: 2800,
    brakeForce: 75,
    handbrakeForce: 120,
    maxSteeringAngle: 0.58, // ~33 degrees
    steeringSpeed: 5.5,
    lateralGripFactor: 1.8,
    longitudinalGripFactor: 1.5,
  };

  // Drivetrain State
  public currentRpm = 900;
  public currentGear: number | 'R' | 'N' = 1;
  public gearRatios = [3.5, 2.2, 1.5, 1.15, 0.9, 0.72]; // 1st to 6th gear
  public reverseRatio = 3.2;
  public finalDriveRatio = 3.9;
  public isHeadlightsOn = true;
  private wheelRotations: number[] = [0, 0, 0, 0];

  constructor(physics: PhysicsWorld, startPos: [number, number, number] = [0, 1.5, 0]) {
    this.physics = physics;

    // 1. Create Dynamic RigidBody for Chassis
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(startPos[0], startPos[1], startPos[2])
      .setCanSleep(false)
      .setLinearDamping(0.04)
      .setAngularDamping(0.25);

    this.chassisBody = this.physics.world.createRigidBody(bodyDesc);

    // Chassis Box Collider
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      this.config.chassisWidth / 2,
      this.config.chassisHeight / 2,
      this.config.chassisLength / 2
    )
      .setFriction(0.6)
      .setRestitution(0.05)
      .setDensity(this.config.mass / (this.config.chassisWidth * this.config.chassisHeight * this.config.chassisLength));

    this.physics.world.createCollider(colliderDesc, this.chassisBody);

    // 2. Create DynamicRayCastVehicleController
    this.controller = this.physics.world.createVehicleController(this.chassisBody);
    (this.controller as any).indexUpAxis = 1; // Y axis is up
    (this.controller as any).setIndexForwardAxis = 2; // Z axis is forward

    // 3. Add 4 Wheels
    const halfTrack = 0.85;
    const halfWheelbase = 1.35;
    const connectionHeight = -0.15;

    const wheelPositions = [
      new RAPIER.Vector3(-halfTrack, connectionHeight, halfWheelbase), // 0: Front Left
      new RAPIER.Vector3(halfTrack, connectionHeight, halfWheelbase), // 1: Front Right
      new RAPIER.Vector3(-halfTrack, connectionHeight, -halfWheelbase), // 2: Rear Left
      new RAPIER.Vector3(halfTrack, connectionHeight, -halfWheelbase), // 3: Rear Right
    ];

    const downDir = new RAPIER.Vector3(0, -1, 0);
    const axleDir = new RAPIER.Vector3(-1, 0, 0);

    for (let i = 0; i < 4; i++) {
      this.controller.addWheel(
        wheelPositions[i]!,
        downDir,
        axleDir,
        this.config.suspensionRestLength,
        this.config.wheelRadius
      );

      this.controller.setWheelSuspensionStiffness(i, this.config.suspensionStiffness);
      this.controller.setWheelSuspensionCompression(i, this.config.suspensionCompression);
      this.controller.setWheelSuspensionRelaxation(i, this.config.suspensionRelaxation);
      this.controller.setWheelMaxSuspensionTravel(i, this.config.maxSuspensionTravel);
      this.controller.setWheelMaxSuspensionForce(i, this.config.maxSuspensionForce);
      this.controller.setWheelFrictionSlip(i, 2.0);
      this.controller.setWheelSideFrictionStiffness(i, 22.0);
    }

    // 4. Build 3D Car Meshes
    const carData = CarMeshBuilder.buildSedan();
    this.visualGroup = carData.root;
    this.wheelMeshes = carData.wheelMeshes;
    this.headlights = carData.headlights;
    this.brakeLightMesh = carData.brakeLightMesh;
    this.reverseLightMesh = carData.reverseLightMesh;
  }

  public update(inputs: InputState, deltaTime: number): VehicleTelemetry {
    // 1. Steering with speed sensitivity
    const speedMs = this.controller.currentVehicleSpeed();
    const speedKmh = Math.abs(speedMs * 3.6);

    // Reduce max steering angle at high speeds to prevent rollover
    const speedSteerFactor = Math.max(0.35, 1.0 - (speedKmh / 160) * 0.65);
    const targetSteerAngle = -inputs.steering * this.config.maxSteeringAngle * speedSteerFactor;

    this.controller.setWheelSteering(0, targetSteerAngle);
    this.controller.setWheelSteering(1, targetSteerAngle);

    // 2. Drivetrain & Gearbox
    let engineForce = 0;
    let brakeForce = 0;
    let isReversing = false;

    if (inputs.headlightsToggle) {
      this.isHeadlightsOn = !this.isHeadlightsOn;
      for (const hl of this.headlights) {
        hl.visible = this.isHeadlightsOn;
      }
    }

    if (inputs.recoverVehicle) {
      this.recover();
    }

    // Throttle & Braking logic
    if (inputs.throttle > 0) {
      if (speedMs < -1.0) {
        // Brake to stop before moving forward
        brakeForce = inputs.throttle * this.config.brakeForce;
      } else {
        // Forward drive
        const torqueMult = 1.0 - Math.pow((this.currentRpm - 4200) / 4500, 2);
        engineForce = inputs.throttle * this.config.engineForce * Math.max(0.4, torqueMult);
        isReversing = false;
      }
    } else if (inputs.brake > 0) {
      if (speedMs > 1.0) {
        // Normal braking
        brakeForce = inputs.brake * this.config.brakeForce;
      } else {
        // Reverse
        isReversing = true;
        engineForce = -inputs.brake * this.config.engineForce * 0.65;
      }
    }

    // Automatic Gear Shift Logic
    if (isReversing) {
      this.currentGear = 'R';
      this.currentRpm = Math.min(6500, 900 + speedKmh * 120);
    } else {
      if (speedKmh < 2) {
        this.currentGear = inputs.throttle > 0 ? 1 : 'N';
        this.currentRpm = 900 + inputs.throttle * 2400;
      } else {
        if (speedKmh < 30) this.currentGear = 1;
        else if (speedKmh < 55) this.currentGear = 2;
        else if (speedKmh < 85) this.currentGear = 3;
        else if (speedKmh < 120) this.currentGear = 4;
        else if (speedKmh < 165) this.currentGear = 5;
        else this.currentGear = 6;

        const gearIdx = typeof this.currentGear === 'number' ? this.currentGear - 1 : 0;
        const currentRatio = this.gearRatios[gearIdx] ?? 1.0;
        const calculatedRpm = (speedKmh * currentRatio * this.finalDriveRatio * 60) / (2 * Math.PI * this.config.wheelRadius * 0.06);
        this.currentRpm = Math.min(7200, Math.max(900, calculatedRpm));
      }
    }

    // 3. Apply Forces to Wheels (Rear-wheel / All-wheel drive)
    this.controller.setWheelEngineForce(2, engineForce * 0.5);
    this.controller.setWheelEngineForce(3, engineForce * 0.5);
    this.controller.setWheelEngineForce(0, engineForce * 0.5);
    this.controller.setWheelEngineForce(1, engineForce * 0.5);

    // Handbrake: lock rear wheels and induce drift
    if (inputs.handbrake) {
      this.controller.setWheelBrake(2, this.config.handbrakeForce);
      this.controller.setWheelBrake(3, this.config.handbrakeForce);
      // Cut rear lateral grip to initiate oversteer drift slide
      this.controller.setWheelSideFrictionStiffness(2, 4.0);
      this.controller.setWheelSideFrictionStiffness(3, 4.0);
    } else {
      this.controller.setWheelBrake(0, brakeForce * 0.6);
      this.controller.setWheelBrake(1, brakeForce * 0.6);
      this.controller.setWheelBrake(2, brakeForce * 0.4);
      this.controller.setWheelBrake(3, brakeForce * 0.4);

      // Restore full grip
      this.controller.setWheelSideFrictionStiffness(2, 22.0);
      this.controller.setWheelSideFrictionStiffness(3, 22.0);
    }

    // 4. Update Physics Simulation
    this.controller.updateVehicle(deltaTime);

    // 5. Sync Visual Meshes with Physics RigidBody
    const translation = this.chassisBody.translation();
    const rotation = this.chassisBody.rotation();

    this.visualGroup.position.set(translation.x, translation.y, translation.z);
    this.visualGroup.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    // Update Visual Wheels
    const suspCompressions: [number, number, number, number] = [0, 0, 0, 0];
    const wheelRotSpeed = (speedMs / this.config.wheelRadius) * deltaTime;

    for (let i = 0; i < 4; i++) {
      const wMesh = this.wheelMeshes[i];
      if (!wMesh) continue;

      const rawSuspLen = this.controller.wheelSuspensionLength(i);
      const suspLen = rawSuspLen !== null && rawSuspLen !== undefined ? rawSuspLen : this.config.suspensionRestLength;
      suspCompressions[i] = Math.max(0, 1.0 - suspLen / this.config.suspensionRestLength);

      // Local connection point
      const conn = this.controller.wheelChassisConnectionPointCs(i);
      if (conn) {
        wMesh.position.set(conn.x, conn.y - suspLen + this.config.wheelRadius, conn.z);
      }

      // Steering on front wheels
      if (i < 2) {
        wMesh.rotation.y = this.controller.wheelSteering(i) ?? 0;
      }

      // Wheel rotation around axle (unless handbraked)
      if (!inputs.handbrake || i < 2) {
        this.wheelRotations[i]! += wheelRotSpeed;
      }
      wMesh.rotation.x = this.wheelRotations[i]!;
    }

    // 6. Reactive Brake & Reverse Lights
    const isBrakingActive = inputs.brake > 0.05 || inputs.handbrake;
    const brakeMat = this.brakeLightMesh.material as THREE.MeshStandardMaterial;
    brakeMat.emissiveIntensity = isBrakingActive ? 2.5 : 0.4;

    const revMat = this.reverseLightMesh.material as THREE.MeshBasicMaterial;
    revMat.color.setHex(isReversing ? 0xffffff : 0x111111);

    // 7. Compute Telemetry
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.visualGroup.quaternion);
    const heading = Math.atan2(forwardVec.x, forwardVec.z);
    const { district, districtAr } = this.determineDistrict(translation.x, translation.z);

    return {
      speedKmh,
      rpm: this.currentRpm,
      currentGear: this.currentGear,
      steeringAngle: targetSteerAngle,
      engineLoad: Math.max(inputs.throttle, inputs.brake),
      isBraking: isBrakingActive,
      isHandbraking: inputs.handbrake,
      isHeadlightsOn: this.isHeadlightsOn,
      slipRatio: inputs.handbrake ? 0.8 : Math.min(1.0, speedKmh / 220),
      suspensionCompression: suspCompressions,
      position: { x: translation.x, y: translation.y, z: translation.z },
      heading,
      currentDistrict: district,
      currentDistrictArabic: districtAr,
    };
  }

  /**
   * Recovers and flips the vehicle upright if overturned
   */
  public recover(): void {
    const pos = this.chassisBody.translation();
    this.chassisBody.setTranslation({ x: pos.x, y: pos.y + 1.2, z: pos.z }, true);
    this.chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  /**
   * Teleports the vehicle to a specific coordinate
   */
  public teleport(x: number, y: number, z: number, rotationY: number = 0): void {
    this.chassisBody.setTranslation({ x, y: y + 0.8, z }, true);
    this.chassisBody.setRotation(
      {
        x: 0,
        y: Math.sin(rotationY / 2),
        z: 0,
        w: Math.cos(rotationY / 2),
      },
      true
    );
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  /**
   * Toggles vehicle headlights
   */
  public toggleHeadlights(): boolean {
    this.isHeadlightsOn = !this.isHeadlightsOn;
    return this.isHeadlightsOn;
  }

  /**
   * Applies vehicle tuning presets
   */
  public applyPreset(name: 'drift' | 'suv' | 'microbus'): void {
    if (name === 'drift') {
      this.config.suspensionStiffness = 45;
      this.config.suspensionCompression = 5.0;
      this.config.engineForce = 3400;
      for (let i = 0; i < 4; i++) {
        this.controller.setWheelSuspensionStiffness(i, 45);
        this.controller.setWheelSuspensionCompression(i, 5.0);
      }
    } else if (name === 'suv') {
      this.config.suspensionStiffness = 26;
      this.config.suspensionCompression = 3.2;
      this.config.engineForce = 2600;
      for (let i = 0; i < 4; i++) {
        this.controller.setWheelSuspensionStiffness(i, 26);
        this.controller.setWheelSuspensionCompression(i, 3.2);
      }
    } else if (name === 'microbus') {
      this.config.suspensionStiffness = 34;
      this.config.suspensionCompression = 3.8;
      this.config.engineForce = 3000;
      for (let i = 0; i < 4; i++) {
        this.controller.setWheelSuspensionStiffness(i, 34);
        this.controller.setWheelSuspensionCompression(i, 3.8);
      }
    }
  }

  private determineDistrict(x: number, z: number): { district: string; districtAr: string } {
    const y = this.chassisBody.translation().y;
    if (y > 7.0) {
      return { district: '6th of October Flyover Bridge', districtAr: 'كوبري 6 أكتوبر' };
    }
    if (x < -130 && x > -220) {
      return { district: 'Nile Corniche Avenue', districtAr: 'كورنيش النيل' };
    }
    if (x <= -220) {
      return { district: 'Qasr El Nil Bridge / Gezira', districtAr: 'كوبري قصر النيل والجزيرة' };
    }
    if (x > 120) {
      return { district: 'Old Cairo Historic Alleys', districtAr: 'حواري القاهرة القديمة' };
    }
    if (z < -80) {
      return { district: 'Talaat Harb & Downtown', districtAr: 'وسط البلد وميدان طلعت حرب' };
    }
    return { district: 'Midan Tahrir (Liberation Square)', districtAr: 'ميدان التحرير' };
  }
}
