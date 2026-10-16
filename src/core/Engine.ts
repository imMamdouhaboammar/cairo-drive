import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CameraMode } from '../types';

export class Engine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public composer: EffectComposer;
  public bloomPass: UnrealBloomPass;

  // Lighting & Atmosphere
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;

  // Camera Settings
  public cameraMode: CameraMode = 'chase';
  private currentCameraPos = new THREE.Vector3(0, 5, -10);
  private currentCameraLookAt = new THREE.Vector3(0, 1, 0);

  // Time of Day (0 = midnight, 0.25 = sunrise, 0.65 = golden hour, 0.8 = dusk, 1.0 = midnight)
  public timeOfDay: number = 0.68; // Golden hour default

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xdfb48c, 0.0035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 1200);
    this.camera.position.set(0, 4, -8);

    // WebGL2 Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Post-Processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45, // strength
      0.35, // radius
      0.82 // threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Sunlight
    this.sunLight = new THREE.DirectionalLight(0xffecd2, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;
    const shadowD = 65;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Ambient & Hemisphere Light
    this.ambientLight = new THREE.AmbientLight(0xd9b99b, 0.65);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffecd2, 0x47392b, 0.6);
    this.scene.add(this.hemiLight);

    this.updateAtmosphere(this.timeOfDay);
    window.addEventListener('resize', this.onResize);
  }

  public updateAtmosphere(time: number): void {
    this.timeOfDay = time;
    const angle = time * Math.PI * 2;
    const sunHeight = Math.sin(angle);
    const sunX = Math.cos(angle) * 180;
    const sunY = Math.max(10, sunHeight * 220);
    const sunZ = Math.sin(angle * 0.5) * 120;

    this.sunLight.position.set(sunX, sunY, sunZ);

    if (sunHeight > 0.1) {
      // Daytime / Golden hour
      const isGoldenHour = sunHeight < 0.45;
      const skyColor = isGoldenHour ? 0xdf8442 : 0x7dd3fc;
      const sunColor = isGoldenHour ? 0xffaa44 : 0xfffaed;
      const fogColor = isGoldenHour ? 0xd9824c : 0xbdd7e8;

      this.scene.background = new THREE.Color(skyColor);
      this.scene.fog!.color.setHex(fogColor);
      this.sunLight.color.setHex(sunColor);
      this.sunLight.intensity = isGoldenHour ? 2.8 : 2.2;
      this.ambientLight.intensity = 0.7;
    } else {
      // Cairo Night mode
      const nightSky = 0x090d16;
      const nightFog = 0x0c121e;
      this.scene.background = new THREE.Color(nightSky);
      this.scene.fog!.color.setHex(nightFog);
      this.sunLight.color.setHex(0x1e293b);
      this.sunLight.intensity = 0.35;
      this.ambientLight.intensity = 0.25;
    }
  }

  public updateCamera(
    carGroup: THREE.Group,
    speedKmh: number,
    isBraking: boolean,
    deltaTime: number
  ): void {
    // Dynamic FOV scaling based on velocity (62 deg to 84 deg)
    const targetFov = 62 + Math.min(22, (speedKmh / 200) * 22);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(deltaTime * 4.0, 1.0);
    this.camera.updateProjectionMatrix();

    // Shadow camera follows vehicle
    this.sunLight.target = carGroup;

    if (this.cameraMode === 'chase') {
      // 1. Third-Person Dynamic Spring Arm Chase Camera
      const dist = 6.8 + Math.min(2.5, (speedKmh / 180) * 2.5);
      const height = 2.4;
      const rearOffset = new THREE.Vector3(0, height, -dist).applyQuaternion(carGroup.quaternion);
      const targetPos = carGroup.position.clone().add(rearOffset);

      // Smooth camera position and look target
      this.currentCameraPos.lerp(targetPos, Math.min(deltaTime * 6.5, 1.0));
      const lookTarget = carGroup.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      this.currentCameraLookAt.lerp(lookTarget, Math.min(deltaTime * 10.0, 1.0));

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentCameraLookAt);
    } else if (this.cameraMode === 'close') {
      // 2. Close Rear Follow
      const rearOffset = new THREE.Vector3(0, 1.7, -4.5).applyQuaternion(carGroup.quaternion);
      const targetPos = carGroup.position.clone().add(rearOffset);
      this.currentCameraPos.lerp(targetPos, Math.min(deltaTime * 8.5, 1.0));
      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(carGroup.position.clone().add(new THREE.Vector3(0, 0.9, 0)));
    } else if (this.cameraMode === 'hood') {
      // 3. Bonnet / Hood Camera (Direct Sensation of Speed)
      const hoodPos = carGroup.position.clone().add(new THREE.Vector3(0, 0.95, 0.9).applyQuaternion(carGroup.quaternion));
      const lookAhead = carGroup.position.clone().add(new THREE.Vector3(0, 0.9, 20).applyQuaternion(carGroup.quaternion));
      this.camera.position.copy(hoodPos);
      this.camera.lookAt(lookAhead);
    } else if (this.cameraMode === 'interior') {
      // 4. Driver Cockpit Camera
      const dashPos = carGroup.position.clone().add(new THREE.Vector3(-0.35, 1.15, -0.1).applyQuaternion(carGroup.quaternion));
      const lookAhead = carGroup.position.clone().add(new THREE.Vector3(-0.35, 1.1, 15).applyQuaternion(carGroup.quaternion));
      this.camera.position.copy(dashPos);
      this.camera.lookAt(lookAhead);
    } else if (this.cameraMode === 'orbit') {
      // 5. Free Orbit Camera
      const time = Date.now() * 0.0005;
      const orbitX = Math.cos(time) * 10;
      const orbitZ = Math.sin(time) * 10;
      this.camera.position.set(carGroup.position.x + orbitX, carGroup.position.y + 4.0, carGroup.position.z + orbitZ);
      this.camera.lookAt(carGroup.position.x, carGroup.position.y + 0.8, carGroup.position.z);
    }
  }

  public cycleCameraMode(): CameraMode {
    const modes: CameraMode[] = ['chase', 'close', 'hood', 'interior', 'orbit'];
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length]!;
    return this.cameraMode;
  }

  public render(): void {
    this.composer.render();
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };

  public destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
