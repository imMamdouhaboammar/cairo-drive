import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { TextureGenerator } from './TextureGenerator';
import { ProceduralAssets } from './ProceduralAssets';
import { CAIRO_ROAD_NETWORK, CAIRO_SPEED_BUMPS } from './CairoWorldData';

export class CairoWorldBuilder {
  public scene: THREE.Scene;
  public physics: PhysicsWorld;
  public worldGroup: THREE.Group = new THREE.Group();
  public streetlightList: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene;
    this.physics = physics;
    this.scene.add(this.worldGroup);
  }

  public async build(): Promise<void> {
    this.buildTerrainAndNile();
    this.buildRoadNetwork();
    this.buildElevatedOctoberBridge();
    this.buildBuildingsAndAlleys();
    this.buildSpeedBumps();
    this.buildEnvironmentProps();
  }

  /**
   * 1. Ground Plane and the Nile River
   */
  private buildTerrainAndNile(): void {
    // Base city terrain (dusty asphalt / paved soil)
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d3935, // Cairo desert dust tone
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.y = -0.05;
    this.worldGroup.add(ground);

    // Ground collider
    this.physics.createStaticBox(0, -0.5, 0, 800, 0.5, 800);

    // The Nile River (Water surface at Y: -2.2)
    const nileGeo = new THREE.PlaneGeometry(240, 1400, 64, 64);
    nileGeo.rotateX(-Math.PI / 2);
    const nileMat = new THREE.MeshStandardMaterial({
      color: 0x0f3b4c, // Deep Nile blue-green
      roughness: 0.15,
      metalness: 0.85,
    });
    const nile = new THREE.Mesh(nileGeo, nileMat);
    nile.position.set(-270, -2.2, 0);
    this.worldGroup.add(nile);

    // Nile Corniche retaining seawall
    const seawallGeo = new THREE.BoxGeometry(4, 3.2, 1400);
    const seawallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const seawall = new THREE.Mesh(seawallGeo, seawallMat);
    seawall.position.set(-192, -0.6, 0);
    this.worldGroup.add(seawall);
    this.physics.createStaticBox(-192, -0.6, 0, 2, 1.6, 700);

    // Add traditional Nile Feluccas (sailing boats) moored along the river
    this.buildNileFeluccas();
  }

  /**
   * Traditional Egyptian Feluccas with white lateen sails
   */
  private buildNileFeluccas(): void {
    const feluccaZPositions = [-450, -280, -120, 50, 240, 420];
    const boatWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, side: THREE.DoubleSide });

    for (const z of feluccaZPositions) {
      const boat = new THREE.Group();
      boat.position.set(-230 - Math.random() * 20, -2.1, z);
      boat.rotation.y = 0.2 + (Math.random() - 0.5) * 0.4;

      // Wooden hull
      const hullGeo = new THREE.BoxGeometry(3.5, 1.2, 12);
      const hull = new THREE.Mesh(hullGeo, boatWoodMat);
      hull.position.y = 0.4;
      boat.add(hull);

      // Wooden mast
      const mastGeo = new THREE.CylinderGeometry(0.12, 0.16, 14, 6);
      const mast = new THREE.Mesh(mastGeo, boatWoodMat);
      mast.position.set(0, 7, -1);
      mast.rotation.z = -0.1;
      boat.add(mast);

      // White lateen triangular sail
      const sailGeo = new THREE.BufferGeometry();
      const sailVertices = new Float32Array([
        0, 13, -1,
        0, 3, -1,
        0, 2, 8,
      ]);
      sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVertices, 3));
      sailGeo.computeVertexNormals();
      const sail = new THREE.Mesh(sailGeo, sailMat);
      boat.add(sail);

      this.worldGroup.add(boat);
    }
  }

  /**
   * 2. Surface Roads, Avenues, Roundabouts, and Alleys
   */
  private buildRoadNetwork(): void {
    const asphaltTex = TextureGenerator.createAsphaltTexture();
    const curbTex = TextureGenerator.createCurbTexture();

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.88,
      metalness: 0.12,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.9,
    });

    for (const road of CAIRO_ROAD_NETWORK) {
      // Elevated bridge decks are handled in buildElevatedOctoberBridge()
      if (road.type === 'bridge' && road.elevation > 5) continue;
      if (road.type === 'ramp') continue;

      const pts = road.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = new THREE.Vector3(...pts[i]!);
        const p2 = new THREE.Vector3(...pts[i + 1]!);
        const dist = p1.distanceTo(p2);
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

        // Road Surface Mesh
        const roadGeo = new THREE.BoxGeometry(road.width, 0.15, dist);
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.position.set(mid.x, mid.y + 0.075, mid.z);
        roadMesh.rotation.y = angle;
        roadMesh.receiveShadow = true;
        this.worldGroup.add(roadMesh);

        // Physics Collider for Road
        this.physics.createStaticBox(
          mid.x,
          mid.y + 0.075,
          mid.z,
          road.width / 2,
          0.08,
          dist / 2,
          angle
        );

        // Black & White Curbstones on sides
        const halfW = road.width / 2 + 0.3;
        const leftCurbPos = mid.clone().add(new THREE.Vector3(Math.cos(angle) * -halfW, 0.15, -Math.sin(angle) * -halfW));
        const rightCurbPos = mid.clone().add(new THREE.Vector3(Math.cos(angle) * halfW, 0.15, -Math.sin(angle) * halfW));

        const curbGeo = new THREE.BoxGeometry(0.6, 0.28, dist);
        const leftCurb = new THREE.Mesh(curbGeo, curbMat);
        leftCurb.position.copy(leftCurbPos);
        leftCurb.rotation.y = angle;
        this.worldGroup.add(leftCurb);

        const rightCurb = new THREE.Mesh(curbGeo, curbMat);
        rightCurb.position.copy(rightCurbPos);
        rightCurb.rotation.y = angle;
        this.worldGroup.add(rightCurb);

        // Sidewalk Colliders
        this.physics.createStaticBox(leftCurbPos.x, leftCurbPos.y, leftCurbPos.z, 0.3, 0.15, dist / 2, angle);
        this.physics.createStaticBox(rightCurbPos.x, rightCurbPos.y, rightCurbPos.z, 0.3, 0.15, dist / 2, angle);
      }
    }

    // Tahrir Square Monument Centerpiece
    this.buildTahrirSquareMonument();
  }

  /**
   * Monument centerpiece for Midan Tahrir
   */
  private buildTahrirSquareMonument(): void {
    const monumentGroup = new THREE.Group();
    monumentGroup.position.set(0, 0, 0);

    // Stone base
    const baseGeo = new THREE.CylinderGeometry(14, 16, 1.2, 24);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.6;
    monumentGroup.add(base);

    // Central ancient Egyptian Obelisk
    const obeliskGeo = new THREE.CylinderGeometry(0.8, 1.6, 22, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0xc2a649, // Golden sandstone
      roughness: 0.7,
    });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.y = 12;
    obelisk.castShadow = true;
    monumentGroup.add(obelisk);

    // Monument physical collider
    this.physics.createStaticBox(0, 1.5, 0, 14, 1.5, 14);

    this.worldGroup.add(monumentGroup);
  }

  /**
   * 3. 6th of October Flyover Bridge & Elevated Highway Ramps
   */
  private buildElevatedOctoberBridge(): void {
    const deckMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createAsphaltTexture(),
      roughness: 0.85,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Weathered highway concrete
      roughness: 0.9,
    });

    // 1. On-Ramp (rising from Y: 0 to Y: 14)
    const rampPts: [number, number, number][] = [
      [-175, 0.1, -380],
      [-140, 4.2, -340],
      [-105, 8.8, -300],
      [-70, 14.0, -260],
    ];

    for (let i = 0; i < rampPts.length - 1; i++) {
      const p1 = new THREE.Vector3(...rampPts[i]!);
      const p2 = new THREE.Vector3(...rampPts[i + 1]!);
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      const rampGeo = new THREE.BoxGeometry(12, 0.8, dist);
      const rampMesh = new THREE.Mesh(rampGeo, deckMat);
      rampMesh.position.copy(mid);
      rampMesh.lookAt(p2);
      this.worldGroup.add(rampMesh);

      // Pitch angle and yaw
      const yaw = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      this.physics.createStaticBox(mid.x, mid.y, mid.z, 6, 0.4, dist / 2, yaw);
    }

    // 2. Main Elevated Bridge Deck (Y: 14m)
    const deckPts: [number, number, number][] = [
      [-70, 14, -260],
      [-20, 14, -220],
      [40, 14, -180],
      [90, 14, -100],
      [110, 14, 0],
      [100, 14, 120],
      [70, 14, 240],
    ];

    for (let i = 0; i < deckPts.length - 1; i++) {
      const p1 = new THREE.Vector3(...deckPts[i]!);
      const p2 = new THREE.Vector3(...deckPts[i + 1]!);
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

      // Elevated Deck Slab
      const slabGeo = new THREE.BoxGeometry(16, 1.2, dist);
      const slab = new THREE.Mesh(slabGeo, deckMat);
      slab.position.copy(mid);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;
      this.worldGroup.add(slab);

      // Bridge Physics Deck Collider
      this.physics.createStaticBox(mid.x, mid.y, mid.z, 8, 0.6, dist / 2, angle);

      // Heavy Concrete Support Pillars underneath to ground
      const pillarGeo = new THREE.CylinderGeometry(1.6, 2.0, mid.y, 8);
      const pillar = new THREE.Mesh(pillarGeo, concreteMat);
      pillar.position.set(mid.x, mid.y / 2, mid.z);
      pillar.castShadow = true;
      this.worldGroup.add(pillar);
      this.physics.createStaticBox(mid.x, mid.y / 2, mid.z, 1.6, mid.y / 2, 1.6);
    }

    // Concrete Jersey Safety Barriers along the elevated deck
    const leftBarrierPts = deckPts.map((p) => [p[0] - 7.6, p[1], p[2]] as [number, number, number]);
    const rightBarrierPts = deckPts.map((p) => [p[0] + 7.6, p[1], p[2]] as [number, number, number]);
    this.worldGroup.add(ProceduralAssets.createJerseyBarriers(leftBarrierPts));
    this.worldGroup.add(ProceduralAssets.createJerseyBarriers(rightBarrierPts));

    // Barrier Colliders
    for (let i = 0; i < deckPts.length - 1; i++) {
      const p1 = deckPts[i]!;
      const p2 = deckPts[i + 1]!;
      const midX = (p1[0] + p2[0]) / 2;
      const midZ = (p1[2] + p2[2]) / 2;
      const angle = Math.atan2(p2[0] - p1[0], p2[2] - p1[2]);
      const dist = Math.hypot(p2[0] - p1[0], p2[2] - p1[2]);

      // Left Barrier Collider
      this.physics.createStaticBox(midX - 7.6, 14.8, midZ, 0.3, 0.8, dist / 2, angle);
      // Right Barrier Collider
      this.physics.createStaticBox(midX + 7.6, 14.8, midZ, 0.3, 0.8, dist / 2, angle);
    }

    // Metal expansion joints across the deck
    this.worldGroup.add(ProceduralAssets.createBridgeExpansionJoints(deckPts, 16));
  }

  /**
   * 4. Buildings, Shopfronts, and Narrow Historic Cairo Haras
   */
  private buildBuildingsAndAlleys(): void {
    const redBrickTex = TextureGenerator.createRedBrickTexture();
    const plasterTex = TextureGenerator.createPlasterTexture();
    const mashrabiyaTex = TextureGenerator.createMashrabiyaTexture();

    const redBrickMat = new THREE.MeshStandardMaterial({ map: redBrickTex, roughness: 0.9 });
    const plasterMat = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.85 });
    const woodMat = new THREE.MeshStandardMaterial({ map: mashrabiyaTex, roughness: 0.7 });

    // Procedural building generator helper
    const spawnBuilding = (
      x: number,
      z: number,
      w: number,
      d: number,
      floors: number,
      isAlley: boolean,
      signIndex: number = -1
    ) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0, z);
      const floorH = 3.6;
      const totalH = floors * floorH;

      // Lower floors: Plaster / Shop
      const lowerGeo = new THREE.BoxGeometry(w, floorH * 2, d);
      const lower = new THREE.Mesh(lowerGeo, plasterMat);
      lower.position.y = floorH;
      lower.castShadow = true;
      lower.receiveShadow = true;
      bGroup.add(lower);

      // Upper floors: Raw Egyptian Red Brick (طوب أحمر)
      if (floors > 2) {
        const upperH = (floors - 2) * floorH;
        const upperGeo = new THREE.BoxGeometry(w, upperH, d);
        const upper = new THREE.Mesh(upperGeo, isAlley ? redBrickMat : plasterMat);
        upper.position.y = floorH * 2 + upperH / 2;
        upper.castShadow = true;
        bGroup.add(upper);
      }

      // Protruding wooden Mashrabiya balconies
      if (isAlley) {
        for (let f = 1; f < floors; f++) {
          const balconyGeo = new THREE.BoxGeometry(2.4, 1.8, 1.2);
          const balcony = new THREE.Mesh(balconyGeo, woodMat);
          balcony.position.set(0, f * floorH + 1.2, d / 2 + 0.6);
          bGroup.add(balcony);
        }
      }

      // Shopfront Arabic Sign on ground floor
      if (signIndex >= 0) {
        const signTex = TextureGenerator.createShopSignTexture(signIndex);
        const signMat = new THREE.MeshBasicMaterial({ map: signTex });
        const signGeo = new THREE.PlaneGeometry(Math.min(w * 0.7, 7.5), 1.8);
        const signMesh = new THREE.Mesh(signGeo, signMat);
        signMesh.position.set(0, 3.2, d / 2 + 0.05);
        bGroup.add(signMesh);
      }

      // Rooftop satellite dishes
      const dishGeo = new THREE.CylinderGeometry(0.8, 0.2, 0.4, 12);
      const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.position.set(w * 0.25, totalH + 0.5, d * 0.25);
      dish.rotation.x = 0.4;
      bGroup.add(dish);

      this.worldGroup.add(bGroup);

      // Physical building box collider
      this.physics.createStaticBox(x, totalH / 2, z, w / 2, totalH / 2, d / 2);
    };

    // A. Downtown Haussmannian Buildings along Talaat Harb & Tahrir
    const downtownBuildings = [
      { x: -50, z: -80, w: 26, d: 24, floors: 6, sign: 0 },
      { x: 50, z: -80, w: 24, d: 24, floors: 5, sign: 1 },
      { x: -60, z: 80, w: 28, d: 26, floors: 6, sign: 2 },
      { x: 60, z: 80, w: 28, d: 26, floors: 5, sign: 3 },
      { x: 100, z: -140, w: 30, d: 26, floors: 7, sign: 4 },
      { x: 10, z: -180, w: 26, d: 24, floors: 6, sign: 0 },
    ];

    for (const b of downtownBuildings) {
      spawnBuilding(b.x, b.z, b.w, b.d, b.floors, false, b.sign);
    }

    // B. Narrow Red-Brick Buildings in Historic Alleys (Khan El-Khalili / Darb El-Ahmar)
    // Closely flanking the 6m - 8m alleys!
    const alleyBuildings = [
      { x: 130, z: -35, w: 18, d: 16, floors: 5, sign: 1 },
      { x: 170, z: -70, w: 20, d: 18, floors: 6, sign: 2 },
      { x: 210, z: -20, w: 16, d: 14, floors: 5, sign: 3 },
      { x: 260, z: -75, w: 20, d: 18, floors: 6, sign: 4 },
      { x: 150, z: 30, w: 18, d: 16, floors: 5, sign: 0 },
      { x: 200, z: 50, w: 18, d: 16, floors: 6, sign: 1 },
      { x: 240, z: 20, w: 22, d: 18, floors: 7, sign: 2 },
      { x: 180, z: -110, w: 16, d: 16, floors: 5, sign: 3 },
      { x: 195, z: 120, w: 18, d: 16, floors: 6, sign: 4 },
    ];

    for (const b of alleyBuildings) {
      spawnBuilding(b.x, b.z, b.w, b.d, b.floors, true, b.sign);
    }
  }

  /**
   * 5. Egyptian Speed Bumps (مطبات صناعية وعشوائية)
   */
  private buildSpeedBumps(): void {
    const asphaltTex = TextureGenerator.createAsphaltTexture();
    const bumpMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      color: 0xf59e0b, // Yellow hazard stripes
      roughness: 0.9,
    });

    for (const bump of CAIRO_SPEED_BUMPS) {
      const [x, y, z, width, rotationY, isAggressive] = bump;
      const height = isAggressive ? 0.35 : 0.18; // Heavy bump launch height
      const length = isAggressive ? 0.9 : 1.6;

      const bumpGeo = new THREE.CylinderGeometry(length / 2, length / 2, width, 8);
      bumpGeo.rotateZ(Math.PI / 2);
      bumpGeo.scale(1, height / (length / 2), 1);

      const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
      bumpMesh.position.set(x, y + height * 0.4, z);
      bumpMesh.rotation.y = rotationY;
      bumpMesh.castShadow = true;
      bumpMesh.receiveShadow = true;
      this.worldGroup.add(bumpMesh);

      // Rapier physical collider for the bump
      this.physics.createStaticBox(x, y + height / 2, z, width / 2, height / 2, length / 2, rotationY);
    }
  }

  /**
   * 6. Environment Props: Palm Trees, Nile Railings, Streetlights, Kiosks
   */
  private buildEnvironmentProps(): void {
    // Nile Promenade Palm Trees
    const palmPositions: [number, number, number][] = [];
    for (let z = -550; z <= 550; z += 35) {
      palmPositions.push([-196, 0, z]);
      palmPositions.push([-165, 0, z]);
    }
    // Midan Tahrir perimeter palms
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      palmPositions.push([Math.cos(angle) * 28, 0, Math.sin(angle) * 28]);
    }
    this.worldGroup.add(ProceduralAssets.createPalmTrees(palmPositions));

    // Corniche Wrought-Iron Railing along the river
    this.worldGroup.add(ProceduralAssets.createNileRailing(-600, 600, -192));

    // Sodium-Vapor Streetlights along Corniche & Downtown
    const lightPositions: [number, number, number][] = [];
    for (let z = -500; z <= 500; z += 50) {
      lightPositions.push([-172, 0, z]);
    }
    lightPositions.push([20, 0, -45], [40, 0, -110], [15, 0, 70], [140, 0, -20]);

    const { mesh: streetlightsMesh, lights } = ProceduralAssets.createStreetlights(lightPositions);
    this.worldGroup.add(streetlightsMesh);
    this.streetlightList = lights;

    // Cairo Kiosks at street corners
    this.worldGroup.add(ProceduralAssets.createStreetKiosk(-166, 0, -80, -Math.PI / 2));
    this.worldGroup.add(ProceduralAssets.createStreetKiosk(48, 0, -38, 0.4));
    this.worldGroup.add(ProceduralAssets.createStreetKiosk(125, 0, -5, -Math.PI / 4));
  }
}
