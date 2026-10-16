import { describe, it, expect, beforeAll } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../src/core/PhysicsWorld';
import { RaycastVehicle } from '../src/vehicle/RaycastVehicle';

describe('PhysicsWorld and RaycastVehicle Unit Tests', () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = new PhysicsWorld();
    await physics.init();
  });

  it('initializes Rapier 3D world with realistic gravity', () => {
    expect(physics.world).toBeDefined();
    const g = physics.world.gravity;
    expect(g.y).toBeCloseTo(-9.81, 2);
  });

  it('creates static box colliders for roads and buildings', () => {
    const { body, collider } = physics.createStaticBox(10, 0, 20, 5, 0.5, 10);
    expect(body).toBeDefined();
    expect(collider).toBeDefined();
    expect(body.translation().x).toBe(10);
    expect(body.translation().z).toBe(20);
  });

  it('initializes RaycastVehicle with 4 wheels and correct configuration', () => {
    const vehicle = new RaycastVehicle(physics, [0, 2, 0]);
    expect(vehicle.chassisBody).toBeDefined();
    expect(vehicle.controller).toBeDefined();
    expect(vehicle.controller.numWheels()).toBe(4);
    expect(vehicle.wheelMeshes.length).toBe(4);
  });

  it('computes correct gear and speed transitions under input', () => {
    const vehicle = new RaycastVehicle(physics, [0, 2, 0]);
    const mockInput = {
      throttle: 1.0,
      brake: 0,
      steering: 0,
      handbrake: false,
      horn: false,
      headlightsToggle: false,
      cameraToggle: false,
      recoverVehicle: false,
      mapToggle: false,
    };

    const telemetry = vehicle.update(mockInput, 1 / 60);
    expect(telemetry.rpm).toBeGreaterThanOrEqual(900);
    expect(telemetry.currentGear).toBe(1);
    expect(telemetry.isHandbraking).toBe(false);
  });

  it('activates handbrake and cuts rear grip during drift', () => {
    const vehicle = new RaycastVehicle(physics, [0, 2, 0]);
    const mockInput = {
      throttle: 0.5,
      brake: 0,
      steering: 0.8,
      handbrake: true,
      horn: false,
      headlightsToggle: false,
      cameraToggle: false,
      recoverVehicle: false,
      mapToggle: false,
    };

    const telemetry = vehicle.update(mockInput, 1 / 60);
    expect(telemetry.isHandbraking).toBe(true);
    expect(telemetry.slipRatio).toBeGreaterThan(0.5);
  });
});
