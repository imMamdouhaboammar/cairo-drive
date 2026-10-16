import * as THREE from 'three';
import { TextureGenerator } from '../world/TextureGenerator';

export class CarMeshBuilder {
  public static buildSedan(): {
    root: THREE.Group;
    wheelMeshes: THREE.Group[];
    headlights: THREE.SpotLight[];
    brakeLightMesh: THREE.Mesh;
    reverseLightMesh: THREE.Mesh;
  } {
    const root = new THREE.Group();
    const wheelMeshes: THREE.Group[] = [];
    const headlights: THREE.SpotLight[] = [];

    // 1. Car Body Paint Material (Metallic Midnight Blue / Cairo Taxi Theme)
    const paintMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Deep metallic slate blue
      metalness: 0.85,
      roughness: 0.25,
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.7,
      thickness: 0.5,
      transparent: true,
      opacity: 0.85,
    });

    // 2. Chassis Lower Body
    const lowerBodyGeo = new THREE.BoxGeometry(1.85, 0.45, 4.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMat);
    lowerBody.position.y = 0.45;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    root.add(lowerBody);

    // Front Bumper & Grille
    const frontBumperGeo = new THREE.BoxGeometry(1.82, 0.35, 0.5);
    const frontBumper = new THREE.Mesh(frontBumperGeo, blackTrimMat);
    frontBumper.position.set(0, 0.35, 2.2);
    root.add(frontBumper);

    const grilleGeo = new THREE.BoxGeometry(1.1, 0.22, 0.05);
    const grille = new THREE.Mesh(grilleGeo, chromeMat);
    grille.position.set(0, 0.42, 2.45);
    root.add(grille);

    // Engine Hood (slanted aerodynamic front)
    const hoodGeo = new THREE.BoxGeometry(1.75, 0.18, 1.4);
    const hood = new THREE.Mesh(hoodGeo, paintMat);
    hood.position.set(0, 0.72, 1.3);
    hood.rotation.x = -0.06;
    hood.castShadow = true;
    root.add(hood);

    // Cabin Greenhouse & Roof
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.1);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.05, -0.2);
    cabin.castShadow = true;
    root.add(cabin);

    const roofGeo = new THREE.BoxGeometry(1.55, 0.08, 1.7);
    const roof = new THREE.Mesh(roofGeo, paintMat);
    roof.position.set(0, 1.38, -0.25);
    roof.castShadow = true;
    root.add(roof);

    // Rear Trunk
    const trunkGeo = new THREE.BoxGeometry(1.75, 0.22, 0.95);
    const trunk = new THREE.Mesh(trunkGeo, paintMat);
    trunk.position.set(0, 0.7, -1.75);
    trunk.castShadow = true;
    root.add(trunk);

    // 3. Headlights (LED Projectors + SpotLights)
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlLeftGeo = new THREE.BoxGeometry(0.32, 0.16, 0.1);
    const hlLeft = new THREE.Mesh(hlLeftGeo, headlightMat);
    hlLeft.position.set(-0.65, 0.55, 2.22);
    root.add(hlLeft);

    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.65;
    root.add(hlRight);

    // Real Three.js Spotlights for night driving
    const spotL = new THREE.SpotLight(0xfff8ee, 35, 70, Math.PI / 7, 0.35, 1.2);
    spotL.position.set(-0.65, 0.6, 2.3);
    const targetL = new THREE.Object3D();
    targetL.position.set(-0.65, 0.2, 45);
    root.add(targetL);
    spotL.target = targetL;
    root.add(spotL);
    headlights.push(spotL);

    const spotR = new THREE.SpotLight(0xfff8ee, 35, 70, Math.PI / 7, 0.35, 1.2);
    spotR.position.set(0.65, 0.6, 2.3);
    const targetR = new THREE.Object3D();
    targetR.position.set(0.65, 0.2, 45);
    root.add(targetR);
    spotR.target = targetR;
    root.add(spotR);
    headlights.push(spotR);

    // 4. Rear Tail/Brake Light Bar
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const brakeGeo = new THREE.BoxGeometry(1.68, 0.12, 0.08);
    const brakeLightMesh = new THREE.Mesh(brakeGeo, brakeMat);
    brakeLightMesh.position.set(0, 0.65, -2.22);
    root.add(brakeLightMesh);

    // Reverse light
    const revMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const revGeo = new THREE.BoxGeometry(0.4, 0.08, 0.08);
    const reverseLightMesh = new THREE.Mesh(revGeo, revMat);
    reverseLightMesh.position.set(0, 0.52, -2.22);
    root.add(reverseLightMesh);

    // 5. Authentic Egyptian License Plates
    const plateTex = TextureGenerator.createLicensePlateTexture('ق هـ ر', '٧ ٤ ١');
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });

    const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.24), plateMat);
    frontPlate.position.set(0, 0.25, 2.46);
    root.add(frontPlate);

    const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.24), plateMat);
    rearPlate.position.set(0, 0.42, -2.24);
    rearPlate.rotation.y = Math.PI;
    root.add(rearPlate);

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.24, 0.14, 0.12);
    const mirrorL = new THREE.Mesh(mirrorGeo, blackTrimMat);
    mirrorL.position.set(-0.95, 0.85, 0.7);
    root.add(mirrorL);
    const mirrorR = mirrorL.clone();
    mirrorR.position.x = 0.95;
    root.add(mirrorR);

    // 6. Detailed 3D Wheel Meshes (Tire, Rim, Brake Caliper)
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.95 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.2 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });

    const createWheelGroup = (): THREE.Group => {
      const wGroup = new THREE.Group();

      // Rubber Tire
      const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wGroup.add(tire);

      // Alloy Rim
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wGroup.add(rim);

      // Red Brake Caliper
      const caliperGeo = new THREE.BoxGeometry(0.12, 0.14, 0.1);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(0, 0.14, 0.1);
      wGroup.add(caliper);

      return wGroup;
    };

    // 4 Wheels: FL, FR, RL, RR
    for (let i = 0; i < 4; i++) {
      const w = createWheelGroup();
      wheelMeshes.push(w);
      root.add(w);
    }

    return { root, wheelMeshes, headlights, brakeLightMesh, reverseLightMesh };
  }
}
