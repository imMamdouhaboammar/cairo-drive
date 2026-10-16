import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator';

export class ProceduralAssets {
  /**
   * Generates batched Palm Trees using InstancedMesh
   */
  public static createPalmTrees(positions: [number, number, number][]): THREE.Group {
    const group = new THREE.Group();
    const count = positions.length;
    if (count === 0) return group;

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 9, 7);
    trunkGeo.translate(0, 4.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9,
    });
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);

    // Fronds (leaves)
    const frondGeo = new THREE.ConeGeometry(3.5, 2.2, 6);
    frondGeo.translate(0, 8.8, 0);
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x2e6930,
      roughness: 0.8,
    });
    const frondInstanced = new THREE.InstancedMesh(frondGeo, frondMat, count);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const pos = positions[i]!;
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.y = (i * 1.618) % (Math.PI * 2);
      dummy.scale.set(0.85 + (i % 3) * 0.15, 0.85 + (i % 3) * 0.15, 0.85 + (i % 3) * 0.15);
      dummy.updateMatrix();

      trunkInstanced.setMatrixAt(i, dummy.matrix);
      frondInstanced.setMatrixAt(i, dummy.matrix);
    }

    trunkInstanced.instanceMatrix.needsUpdate = true;
    frondInstanced.instanceMatrix.needsUpdate = true;
    trunkInstanced.castShadow = true;
    trunkInstanced.receiveShadow = true;
    frondInstanced.castShadow = true;

    group.add(trunkInstanced);
    group.add(frondInstanced);
    return group;
  }

  /**
   * Generates Cairo Streetlights with warm sodium-vapor glow
   */
  public static createStreetlights(positions: [number, number, number][]): { mesh: THREE.Group; lights: THREE.PointLight[] } {
    const group = new THREE.Group();
    const pointLights: THREE.PointLight[] = [];
    const count = positions.length;
    if (count === 0) return { mesh: group, lights: pointLights };

    // Metal pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.2, 7.5, 6);
    poleGeo.translate(0, 3.75, 0);
    const armGeo = new THREE.BoxGeometry(0.15, 0.15, 2.2);
    armGeo.translate(0, 7.4, 0.9);

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.4,
    });

    const lampHeadGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.35, 6);
    lampHeadGeo.translate(0, 7.2, 1.8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });

    const dummy = new THREE.Object3D();
    const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, count);
    const armInst = new THREE.InstancedMesh(armGeo, poleMat, count);
    const lampInst = new THREE.InstancedMesh(lampHeadGeo, bulbMat, count);

    for (let i = 0; i < count; i++) {
      const pos = positions[i]!;
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.y = pos[0] > 0 ? 0 : Math.PI;
      dummy.updateMatrix();

      poleInst.setMatrixAt(i, dummy.matrix);
      armInst.setMatrixAt(i, dummy.matrix);
      lampInst.setMatrixAt(i, dummy.matrix);

      // Add a real PointLight every few streetlights to illuminate the street at night
      if (i % 3 === 0) {
        const light = new THREE.PointLight(0xff9933, 40, 35, 1.6);
        light.position.set(pos[0], pos[1] + 7.2, pos[2]);
        pointLights.push(light);
        group.add(light);
      }
    }

    poleInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    lampInst.instanceMatrix.needsUpdate = true;
    poleInst.castShadow = true;

    group.add(poleInst);
    group.add(armInst);
    group.add(lampInst);

    return { mesh: group, lights: pointLights };
  }

  /**
   * Generates Nile Promenade cast-iron decorative railing
   */
  public static createNileRailing(startZ: number, endZ: number, xPos: number): THREE.Group {
    const group = new THREE.Group();
    const length = Math.abs(endZ - startZ);
    const segments = Math.floor(length / 3);

    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6);
    postGeo.translate(0, 0.6, 0);
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 4);
    railGeo.rotateX(Math.PI / 2);
    railGeo.translate(0, 1.05, 1.5);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e3a2f, // Egyptian heritage dark green iron
      metalness: 0.8,
      roughness: 0.3,
    });

    const posts = new THREE.InstancedMesh(postGeo, mat, segments + 1);
    const rails = new THREE.InstancedMesh(railGeo, mat, segments);
    const dummy = new THREE.Object3D();

    for (let i = 0; i <= segments; i++) {
      const z = startZ + i * 3;
      dummy.position.set(xPos, 0, z);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);

      if (i < segments) {
        rails.setMatrixAt(i, dummy.matrix);
      }
    }

    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    group.add(posts);
    group.add(rails);
    return group;
  }

  /**
   * Generates Egyptian street kiosks (أكشاك سجائر ومشروبات)
   */
  public static createStreetKiosk(x: number, y: number, z: number, rotationY: number): THREE.Group {
    const kiosk = new THREE.Group();
    kiosk.position.set(x, y, z);
    kiosk.rotation.y = rotationY;

    // Body
    const bodyGeo = new THREE.BoxGeometry(2.6, 2.8, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.4;
    kiosk.add(body);

    // Canopy awning (striped Egyptian awning)
    const awningGeo = new THREE.BoxGeometry(2.8, 0.15, 1.2);
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 2.8, 0.8);
    awning.rotation.x = 0.2;
    kiosk.add(awning);

    // Kiosk counter opening
    const windowGeo = new THREE.BoxGeometry(1.8, 1.1, 0.1);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(0, 1.6, 1.11);
    kiosk.add(win);

    return kiosk;
  }

  /**
   * Generates concrete jersey barrier for highway bridges
   */
  public static createJerseyBarriers(points: [number, number, number][]): THREE.Group {
    const group = new THREE.Group();
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
    });

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = new THREE.Vector3(...points[i]!);
      const p2 = new THREE.Vector3(...points[i + 1]!);
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      const barrierGeo = new THREE.BoxGeometry(0.45, 0.9, dist);
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.copy(mid);
      barrier.position.y += 0.45;
      barrier.lookAt(p2.x, mid.y + 0.45, p2.z);
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      group.add(barrier);
    }

    return group;
  }

  /**
   * Generates bridge expansion joints that trigger visual seams and physical bumps
   */
  public static createBridgeExpansionJoints(deckPoints: [number, number, number][], width: number): THREE.Group {
    const group = new THREE.Group();
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.3,
    });

    for (let i = 0; i < deckPoints.length - 1; i++) {
      const p1 = new THREE.Vector3(...deckPoints[i]!);
      const p2 = new THREE.Vector3(...deckPoints[i + 1]!);
      const dist = p1.distanceTo(p2);
      const segments = Math.floor(dist / 35); // Every 35 meters

      for (let s = 1; s <= segments; s++) {
        const t = s / (segments + 1);
        const pos = p1.clone().lerp(p2, t);
        const jointGeo = new THREE.BoxGeometry(width - 0.4, 0.08, 0.35);
        const joint = new THREE.Mesh(jointGeo, jointMat);
        joint.position.copy(pos);
        joint.position.y += 0.04;
        joint.lookAt(p2.x, pos.y + 0.04, p2.z);
        joint.rotateY(Math.PI / 2);
        group.add(joint);
      }
    }

    return group;
  }
}
