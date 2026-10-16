import GUI from 'lil-gui';
import { RaycastVehicle } from '../vehicle/RaycastVehicle';
import { Engine } from '../core/Engine';
import { CAIRO_LANDMARKS } from '../world/CairoWorldData';

export class TuningGUI {
  public gui: GUI;
  private vehicle: RaycastVehicle;
  private engine: Engine;

  constructor(vehicle: RaycastVehicle, engine: Engine) {
    this.vehicle = vehicle;
    this.engine = engine;

    this.gui = new GUI({ title: '🏎️ Cairo Drive Tuner | تحكم المحاكاة' });
    this.gui.close(); // Closed by default so player has a clean view

    this.setupVehicleTuning();
    this.setupAtmosphereTuning();
    this.setupVehiclePresets();
    this.setupTeleportMenu();
  }

  private setupVehicleTuning(): void {
    const fVehicle = this.gui.addFolder('Vehicle Physics');

    fVehicle
      .add(this.vehicle.config, 'suspensionStiffness', 15, 65, 1)
      .name('Stiffness (صلابة المساعدين)')
      .onChange((v: number) => {
        for (let i = 0; i < 4; i++) this.vehicle.controller.setWheelSuspensionStiffness(i, v);
      });

    fVehicle
      .add(this.vehicle.config, 'suspensionCompression', 1.0, 10.0, 0.2)
      .name('Compression (انضغاط)')
      .onChange((v: number) => {
        for (let i = 0; i < 4; i++) this.vehicle.controller.setWheelSuspensionCompression(i, v);
      });

    fVehicle
      .add(this.vehicle.config, 'suspensionRelaxation', 2.0, 15.0, 0.5)
      .name('Damping (ارتداد)')
      .onChange((v: number) => {
        for (let i = 0; i < 4; i++) this.vehicle.controller.setWheelSuspensionRelaxation(i, v);
      });

    fVehicle
      .add(this.vehicle.config, 'engineForce', 1200, 5000, 100)
      .name('Engine Power (قوة الموتور)');

    fVehicle
      .add(this.vehicle.config, 'brakeForce', 30, 150, 5)
      .name('Brake Force (قوة الفرامل)');
  }

  private setupAtmosphereTuning(): void {
    const fAtmo = this.gui.addFolder('Cairo Atmosphere');

    const params = {
      timeOfDay: this.engine.timeOfDay,
      bloomStrength: this.engine.bloomPass.strength,
    };

    fAtmo
      .add(params, 'timeOfDay', 0.0, 1.0, 0.01)
      .name('Time of Day (الوقت)')
      .onChange((v: number) => {
        this.engine.updateAtmosphere(v);
      });

    fAtmo
      .add(params, 'bloomStrength', 0.0, 1.5, 0.05)
      .name('Bloom Glow (توهج)')
      .onChange((v: number) => {
        this.engine.bloomPass.strength = v;
      });
  }

  private setupVehiclePresets(): void {
    const fPresets = this.gui.addFolder('Vehicle Presets');

    const presets = {
      driftSedan: () => {
        this.vehicle.config.suspensionStiffness = 45;
        this.vehicle.config.suspensionCompression = 5.0;
        this.vehicle.config.engineForce = 3400;
        for (let i = 0; i < 4; i++) {
          this.vehicle.controller.setWheelSuspensionStiffness(i, 45);
          this.vehicle.controller.setWheelSuspensionCompression(i, 5.0);
        }
      },
      heavySUV: () => {
        this.vehicle.config.suspensionStiffness = 26;
        this.vehicle.config.suspensionCompression = 3.2;
        this.vehicle.config.engineForce = 2600;
        for (let i = 0; i < 4; i++) {
          this.vehicle.controller.setWheelSuspensionStiffness(i, 26);
          this.vehicle.controller.setWheelSuspensionCompression(i, 3.2);
        }
      },
      agileMicrobus: () => {
        this.vehicle.config.suspensionStiffness = 34;
        this.vehicle.config.suspensionCompression = 3.8;
        this.vehicle.config.engineForce = 3000;
        for (let i = 0; i < 4; i++) {
          this.vehicle.controller.setWheelSuspensionStiffness(i, 34);
          this.vehicle.controller.setWheelSuspensionCompression(i, 3.8);
        }
      },
    };

    fPresets.add(presets, 'driftSedan').name('🏎️ Tuned Drift Sedan');
    fPresets.add(presets, 'heavySUV').name('🚙 Heavy SUV for Bumps');
    fPresets.add(presets, 'agileMicrobus').name('🚐 Agile Microbus Mode');
  }

  private setupTeleportMenu(): void {
    const fTeleport = this.gui.addFolder('📍 Teleport to Cairo Landmarks');

    for (const landmark of CAIRO_LANDMARKS) {
      const action = {
        tp: () => {
          this.vehicle.teleport(
            landmark.position[0],
            landmark.position[1],
            landmark.position[2],
            landmark.rotationY
          );
        },
      };
      fTeleport.add(action, 'tp').name(`${landmark.nameArabic}`);
    }
  }

  public toggleOpen(): void {
    if ((this.gui as any)._closed) {
      this.gui.open();
    } else {
      this.gui.close();
    }
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
