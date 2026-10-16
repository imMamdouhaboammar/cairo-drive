import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  public world!: RAPIER.World;
  private isInitialized = false;
  private readonly fixedTimeStep = 1 / 60;
  private accumulator = 0;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await RAPIER.init();
    const gravity = new RAPIER.Vector3(0, -9.81, 0);
    this.world = new RAPIER.World(gravity);
    this.isInitialized = true;
  }

  public step(deltaTime: number): void {
    if (!this.isInitialized) return;

    // Sub-stepping to ensure robust raycast vehicle stability and prevent tunneling
    this.accumulator += Math.min(deltaTime, 0.1);
    while (this.accumulator >= this.fixedTimeStep) {
      this.world.step();
      this.accumulator -= this.fixedTimeStep;
    }
  }

  public createStaticBox(
    x: number,
    y: number,
    z: number,
    halfWidth: number,
    halfHeight: number,
    halfDepth: number,
    rotationY: number = 0
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z)
      .setRotation({
        x: 0,
        y: Math.sin(rotationY / 2),
        z: 0,
        w: Math.cos(rotationY / 2),
      });

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth)
      .setFriction(0.9)
      .setRestitution(0.1);

    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public createTrimesh(
    vertices: Float32Array,
    indices: Uint32Array,
    x: number = 0,
    y: number = 0,
    z: number = 0
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(0.95)
      .setRestitution(0.05);

    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  public castRay(
    origin: RAPIER.Vector3,
    direction: RAPIER.Vector3,
    maxToi: number = 10,
    solid: boolean = true
  ): RAPIER.RayColliderHit | null {
    if (!this.isInitialized) return null;
    const ray = new RAPIER.Ray(origin, direction);
    return this.world.castRay(ray, maxToi, solid);
  }

  public destroy(): void {
    if (this.isInitialized && this.world) {
      this.world.free();
      this.isInitialized = false;
    }
  }
}
