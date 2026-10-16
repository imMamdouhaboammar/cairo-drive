import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  MapPin,
  Sliders,
  Sun,
  Moon,
  Compass,
  X,
  ChevronRight,
  Navigation,
  AlertTriangle,
  Radio,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../state/gameStore';
import { InputManager } from '../core/InputManager';
import { CAIRO_ROAD_NETWORK, CAIRO_LANDMARKS, CAIRO_SPEED_BUMPS } from '../world/CairoWorldData';
import { LandmarkLocation } from '../types';
import './hud.css';

interface HUDProps {
  inputManager: InputManager;
  onCameraClick: () => void;
  onHornClick: () => void;
  onRecoverClick: () => void;
  onTeleportClick?: (landmark: LandmarkLocation) => void;
  onHeadlightsClick?: () => void;
  onPresetSelect?: (preset: 'drift' | 'suv' | 'microbus') => void;
  onTuningClick?: () => void;
  onMuteClick?: () => void;
  onStartAudioClick?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  inputManager,
  onCameraClick,
  onHornClick,
  onRecoverClick,
  onTeleportClick,
  onHeadlightsClick,
  onPresetSelect,
  onTuningClick,
  onMuteClick,
  onStartAudioClick,
}) => {
  const telemetry = useGameStore((s) => s.telemetry);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const trafficList = useGameStore((s) => s.trafficList);
  const isControlsHelpOpen = useGameStore((s) => s.isControlsHelpOpen);
  const toggleControlsHelp = useGameStore((s) => s.toggleControlsHelp);
  const isTeleportOpen = useGameStore((s) => s.isTeleportOpen);
  const toggleTeleport = useGameStore((s) => s.toggleTeleport);
  const isMuted = useGameStore((s) => s.isMuted);
  const isAudioStarted = useGameStore((s) => s.isAudioStarted);
  const activePreset = useGameStore((s) => s.activePreset);

  const [activeModalTab, setActiveModalTab] = useState<'controls' | 'districts' | 'presets'>('controls');
  const [minimapZoom, setMinimapZoom] = useState<'close' | 'wide'>('close');
  const [hornActiveAnimation, setHornActiveAnimation] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detect touch capability or mobile screen
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth <= 1024
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Check proximity to Cairo speed bumps
  const isNearSpeedBump = React.useMemo(() => {
    const px = telemetry.position.x;
    const pz = telemetry.position.z;
    for (const bump of CAIRO_SPEED_BUMPS) {
      const dx = bump[0] - px;
      const dz = bump[2] - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 40) return true;
    }
    return false;
  }, [telemetry.position.x, telemetry.position.z]);

  // Determine current speed limit
  const currentSpeedLimit = React.useMemo(() => {
    if (telemetry.position.y > 7.0 || (telemetry.position.x < -130 && telemetry.position.x > -220)) {
      return 80; // Flyover or Corniche
    }
    if (telemetry.position.x > 100) {
      return 30; // Alleys (Haras)
    }
    return 50; // Downtown
  }, [telemetry.position.x, telemetry.position.y]);

  // Handle horn with visual animation
  const handleHornTrigger = () => {
    setHornActiveAnimation(true);
    onHornClick();
    setTimeout(() => setHornActiveAnimation(false), 800);
  };

  // Render 2D Top-Down Cairo Radar Minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const pX = telemetry.position.x;
    const pZ = telemetry.position.z;
    const scale = minimapZoom === 'close' ? 0.65 : 0.32;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    // Rotate map with player heading so forward is always UP
    ctx.rotate(-telemetry.heading);

    // 1. Radar Grid Range Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw The Nile River
    ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.fillRect((-270 - pX) * scale, (-700 - pZ) * scale, 240 * scale, 1400 * scale);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect((-270 - pX) * scale, (-700 - pZ) * scale, 240 * scale, 1400 * scale);

    // 3. Draw Road Network
    for (const road of CAIRO_ROAD_NETWORK) {
      if (road.points.length < 2) continue;

      ctx.beginPath();
      const first = road.points[0]!;
      ctx.moveTo((first[0] - pX) * scale, (first[2] - pZ) * scale);

      for (let i = 1; i < road.points.length; i++) {
        const pt = road.points[i]!;
        ctx.lineTo((pt[0] - pX) * scale, (pt[2] - pZ) * scale);
      }

      if (road.type === 'bridge' || road.type === 'ramp') {
        ctx.strokeStyle = '#38bdf8'; // Electric blue for elevated October bridge
        ctx.lineWidth = Math.max(3.5, road.width * scale * 0.9);
      } else if (road.type === 'alley') {
        ctx.strokeStyle = '#f97316'; // Terracotta orange for narrow Haras
        ctx.lineWidth = Math.max(2.5, road.width * scale * 0.8);
      } else if (road.type === 'roundabout') {
        ctx.strokeStyle = '#fbbf24'; // Gold for Tahrir / Talaat Harb roundabouts
        ctx.lineWidth = Math.max(3, road.width * scale * 0.8);
      } else {
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)'; // Crisp white for main boulevards
        ctx.lineWidth = Math.max(3, road.width * scale * 0.7);
      }
      ctx.stroke();
    }

    // 4. Draw AI Traffic Blips with directional orientation
    for (const v of trafficList) {
      const vx = (v.x - pX) * scale;
      const vz = (v.z - pZ) * scale;

      ctx.save();
      ctx.translate(vx, vz);
      ctx.rotate(v.rotationY);

      if (v.type === 'microbus') {
        ctx.fillStyle = '#f59e0b'; // Amber Microbus
        ctx.fillRect(-3, -5, 6, 10);
      } else if (v.type === 'taxi') {
        ctx.fillStyle = '#38bdf8'; // Blue & White Cairo Taxi
        ctx.fillRect(-2.5, -4.5, 5, 9);
      } else {
        ctx.fillStyle = '#ec4899'; // Tuk-tuk
        ctx.fillRect(-2, -3, 4, 6);
      }
      ctx.restore();
    }

    ctx.restore();

    // 5. Draw Player Vehicle Indicator & Headlight Beam Cone
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Forward light cone
    const grad = ctx.createRadialGradient(0, 0, 5, 0, -35, 30);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-20, -40);
    ctx.lineTo(20, -40);
    ctx.closePath();
    ctx.fill();

    // Arrowhead pointer
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }, [telemetry.position, telemetry.heading, trafficList, minimapZoom]);

  // Tachometer geometry calculations
  const rpm = Math.min(8000, Math.max(0, telemetry.rpm));
  const rpmRatio = rpm / 8000;
  const isRedline = rpm >= 6500;
  const isDrifting = telemetry.slipRatio > 0.4;

  // Arc length for 240-degree tachometer gauge (radius = 65)
  // Arc angle from 150 deg to 390 deg
  const radius = 64;
  const totalArc = 2 * Math.PI * radius * (240 / 360); // approx 268
  const strokeDashoffset = totalArc - totalArc * rpmRatio;

  // Shift light LED segments (6 LEDs)
  const shiftLeds = [
    rpm > 2500,
    rpm > 4000,
    rpm > 5200,
    rpm > 6200,
    rpm > 6800,
    rpm >= 7400,
  ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
      {/* 1. Audio Start Notification Toast */}
      {!isAudioStarted && (
        <div
          className="cairo-audio-prompt"
          onClick={() => {
            onStartAudioClick?.();
          }}
          data-testid="audio-prompt-banner"
        >
          🔊 اضغط هنا لتفعيل أصوات شوارع القاهرة والمحرك | Click to Activate Cairo Engine Sound
        </div>
      )}

      {/* 2. Top Egyptian Street Sign (District & Location) */}
      <div className="cairo-street-sign" data-testid="cairo-street-sign">
        <div className="cairo-sign-crest">🦅</div>
        <div className="cairo-sign-content">
          <div className="cairo-arabic-name">{telemetry.currentDistrictArabic}</div>
          <div className="cairo-english-name">{telemetry.currentDistrict}</div>
        </div>
        <div className="cairo-speed-badge" title="Cairo Speed Limit (KM/H)">
          <span>{currentSpeedLimit}</span>
        </div>
      </div>

      {/* 3. Top-Right 2D Minimap Radar */}
      <div className="cairo-radar-bezel" data-testid="cairo-radar">
        <canvas ref={canvasRef} width={190} height={190} style={{ width: '100%', height: '100%' }} />

        {/* Compass markings */}
        <div className="cairo-radar-compass">
          <span className="cairo-compass-label cairo-compass-n">ش N</span>
          <span className="cairo-compass-label cairo-compass-s">ج S</span>
          <span className="cairo-compass-label cairo-compass-w">غ W</span>
          <span className="cairo-compass-label cairo-compass-e">ش E</span>
        </div>

        {/* Zoom toggle button */}
        <button
          onClick={() => setMinimapZoom((z) => (z === 'close' ? 'wide' : 'close'))}
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Toggle Radar Zoom"
          data-testid="radar-zoom-btn"
        >
          {minimapZoom === 'close' ? '+' : '-'}
        </button>

        <div className="cairo-radar-legend">CAIRO RADAR</div>
      </div>

      {/* 4. Bottom-Left Quick Action Toolbar */}
      <div className="cairo-action-bar" data-testid="cairo-action-bar">
        {/* Camera Switch */}
        <button
          className="cairo-btn"
          onClick={onCameraClick}
          title="Switch Camera View [C]"
          data-testid="camera-toggle-btn"
        >
          <Camera size={16} />
          <span>{cameraMode.toUpperCase()}</span>
          <span className="cairo-key-badge">C</span>
        </button>

        {/* Egyptian Klaxon Horn */}
        <button
          className={`cairo-btn cairo-btn-horn ${hornActiveAnimation ? 'cairo-btn-active' : ''}`}
          onClick={handleHornTrigger}
          title="Egyptian Traffic Horn [H]"
          data-testid="horn-btn"
        >
          <Radio size={16} className={hornActiveAnimation ? 'animate-spin' : ''} />
          <span>كلاكس HORN</span>
          <span className="cairo-key-badge">H</span>
        </button>

        {/* Headlights Toggle */}
        <button
          className={`cairo-btn ${telemetry.isHeadlightsOn ? 'cairo-btn-active' : ''}`}
          onClick={onHeadlightsClick}
          title="Toggle Headlights [L]"
          data-testid="headlights-btn"
        >
          {telemetry.isHeadlightsOn ? <Sun size={16} /> : <Moon size={16} />}
          <span>كشافات</span>
          <span className="cairo-key-badge">L</span>
        </button>

        {/* Flip / Recover Vehicle */}
        <button
          className="cairo-btn"
          onClick={onRecoverClick}
          title="Recover Overturned Car [R]"
          data-testid="recover-btn"
        >
          <RotateCcw size={16} />
          <span>استعدال</span>
          <span className="cairo-key-badge">R</span>
        </button>

        {/* Teleport / Landmarks Fast Travel */}
        <button
          className="cairo-btn"
          onClick={toggleTeleport}
          title="Teleport to Cairo Landmarks [M]"
          data-testid="teleport-menu-btn"
        >
          <MapPin size={16} />
          <span>معالم</span>
          <span className="cairo-key-badge">M</span>
        </button>

        {/* Tuning GUI Toggle */}
        <button
          className="cairo-btn"
          onClick={onTuningClick}
          title="Toggle Physics Tuner [T]"
          data-testid="tuner-btn"
        >
          <Sliders size={16} />
          <span>ضبط</span>
        </button>

        {/* Audio Mute */}
        <button
          className="cairo-btn"
          onClick={onMuteClick}
          title="Toggle Sound"
          data-testid="mute-btn"
        >
          {isMuted ? <VolumeX size={16} color="#ef4444" /> : <Volume2 size={16} />}
        </button>

        {/* Help / Guide */}
        <button
          className="cairo-btn"
          onClick={toggleControlsHelp}
          title="Driver's Manual & Keybindings"
          data-testid="help-btn"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {/* 5. Master Instrument Cluster (Speedometer & Tachometer) */}
      <div className="cairo-cluster-container" data-testid="cairo-cluster">
        {/* Tachometer & Digital Speed SVG Arc Gauge */}
        <div className="cairo-gauge-dial">
          <svg width="170" height="170" viewBox="0 0 170 170">
            {/* Background Gauge Track Arc (240 degrees) */}
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="9"
              strokeDasharray={`${totalArc} ${2 * Math.PI * radius}`}
              strokeDashoffset="0"
              transform="rotate(150 85 85)"
              strokeLinecap="round"
            />

            {/* Glowing Active RPM Arc */}
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke={isRedline ? '#ef4444' : rpm > 4500 ? '#f59e0b' : '#38bdf8'}
              strokeWidth="9"
              strokeDasharray={`${totalArc} ${2 * Math.PI * radius}`}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(150 85 85)"
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.06s ease-out, stroke 0.15s ease',
                filter: isRedline
                  ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                  : 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))',
              }}
            />
          </svg>

          {/* Center Digital Speedometer */}
          <div className="cairo-gauge-center">
            <div className="cairo-digital-speed" data-testid="speedometer-value">
              {Math.round(telemetry.speedKmh)}
            </div>
            <div className="cairo-speed-unit">KM/H • كم/س</div>
          </div>
        </div>

        {/* Auxiliary Cluster Indicators */}
        <div className="cairo-cluster-aux">
          {/* Shift Light Segment Row */}
          <div>
            <div className="cairo-shift-lights">
              <div className={`cairo-shift-led ${shiftLeds[0] ? 'green' : ''}`} />
              <div className={`cairo-shift-led ${shiftLeds[1] ? 'green' : ''}`} />
              <div className={`cairo-shift-led ${shiftLeds[2] ? 'amber' : ''}`} />
              <div className={`cairo-shift-led ${shiftLeds[3] ? 'amber' : ''}`} />
              <div className={`cairo-shift-led ${shiftLeds[4] ? 'red' : ''}`} />
              <div className={`cairo-shift-led ${shiftLeds[5] ? 'red animate-pulse' : ''}`} />
            </div>

            {/* RPM Readout */}
            <div className={`cairo-rpm-text ${isRedline ? 'redline' : ''}`}>
              {isRedline ? '⚠️ SHIFT!' : `${Math.round(telemetry.rpm)} RPM`}
            </div>
          </div>

          {/* Status Indicator Icons */}
          <div className="cairo-aux-icons">
            {/* Handbrake Lamp */}
            <div
              className={`cairo-icon-indicator ${telemetry.isHandbraking ? 'active-red' : ''}`}
              title="Handbrake"
              data-testid="handbrake-lamp"
            >
              ( P )
            </div>

            {/* Headlights Lamp */}
            <div
              className={`cairo-icon-indicator ${telemetry.isHeadlightsOn ? 'active-cyan' : ''}`}
              title="Headlights"
              data-testid="headlights-lamp"
            >
              💡
            </div>

            {/* Drift Lamp */}
            {isDrifting && (
              <div
                className="cairo-icon-indicator active-red"
                style={{ fontSize: 9, fontWeight: 900 }}
                title="Drift"
              >
                DRIFT
              </div>
            )}

            {/* Speed Bump Alert */}
            {isNearSpeedBump && (
              <div
                className="cairo-icon-indicator active-red"
                style={{ fontSize: 10, fontWeight: 900 }}
                title="Speed Bump Ahead"
              >
                مطب
              </div>
            )}
          </div>
        </div>

        {/* Current Gear Badge */}
        <div
          className={`cairo-gear-badge ${
            telemetry.currentGear === 'R'
              ? 'cairo-gear-reverse'
              : telemetry.currentGear === 'N'
              ? 'cairo-gear-neutral'
              : ''
          }`}
          data-testid="gear-indicator"
        >
          {telemetry.currentGear}
        </div>
      </div>

      {/* 6. Virtual Mobile Touch Controls */}
      {isTouchDevice && (
        <div className="cairo-mobile-controls" data-testid="mobile-controls-overlay">
          {/* Steering Left & Right */}
          <div className="cairo-mobile-steering">
            <button
              className="cairo-steer-btn"
              onTouchStart={() => {
                inputManager.touchSteering = -1.0;
              }}
              onTouchEnd={() => {
                inputManager.touchSteering = 0;
              }}
              onMouseDown={() => {
                inputManager.touchSteering = -1.0;
              }}
              onMouseUp={() => {
                inputManager.touchSteering = 0;
              }}
              data-testid="touch-steer-left"
            >
              ◄
            </button>

            <button
              className="cairo-steer-btn"
              onTouchStart={() => {
                inputManager.touchSteering = 1.0;
              }}
              onTouchEnd={() => {
                inputManager.touchSteering = 0;
              }}
              onMouseDown={() => {
                inputManager.touchSteering = 1.0;
              }}
              onMouseUp={() => {
                inputManager.touchSteering = 0;
              }}
              data-testid="touch-steer-right"
            >
              ►
            </button>
          </div>

          {/* Throttle, Brake & Handbrake Pedals */}
          <div className="cairo-mobile-pedals">
            {/* Handbrake Button */}
            <button
              className="cairo-btn cairo-btn-horn"
              style={{ height: 48, borderRadius: 12 }}
              onTouchStart={() => {
                inputManager.touchHandbrake = true;
              }}
              onTouchEnd={() => {
                inputManager.touchHandbrake = false;
              }}
              onMouseDown={() => {
                inputManager.touchHandbrake = true;
              }}
              onMouseUp={() => {
                inputManager.touchHandbrake = false;
              }}
              data-testid="touch-handbrake"
            >
              ( P )
            </button>

            {/* Brake Pedal */}
            <button
              className="cairo-pedal-brake"
              onTouchStart={() => {
                inputManager.touchBrake = 1.0;
              }}
              onTouchEnd={() => {
                inputManager.touchBrake = 0;
              }}
              onMouseDown={() => {
                inputManager.touchBrake = 1.0;
              }}
              onMouseUp={() => {
                inputManager.touchBrake = 0;
              }}
              data-testid="touch-brake"
            >
              فرامل BRAKE
            </button>

            {/* Gas / Accelerator Pedal */}
            <button
              className="cairo-pedal-throttle"
              onTouchStart={() => {
                inputManager.touchThrottle = 1.0;
              }}
              onTouchEnd={() => {
                inputManager.touchThrottle = 0;
              }}
              onMouseDown={() => {
                inputManager.touchThrottle = 1.0;
              }}
              onMouseUp={() => {
                inputManager.touchThrottle = 0;
              }}
              data-testid="touch-throttle"
            >
              بنزين GAS
            </button>
          </div>
        </div>
      )}

      {/* 7. Cairo Landmarks Fast Travel Modal */}
      {isTeleportOpen && (
        <div className="cairo-modal-backdrop" data-testid="teleport-modal">
          <div className="cairo-modal-window">
            <div className="cairo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin color="#f59e0b" size={24} />
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
                  معالم شوارع القاهرة | Fast Travel Landmarks
                </h3>
              </div>
              <button
                onClick={toggleTeleport}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                data-testid="close-teleport-modal"
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CAIRO_LANDMARKS.map((landmark, idx) => (
                <div
                  key={idx}
                  className="cairo-key-row"
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => {
                    onTeleportClick?.(landmark);
                    toggleTeleport();
                  }}
                  data-testid={`teleport-landmark-${idx}`}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                      {landmark.nameArabic}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                      {landmark.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {landmark.description}
                    </div>
                  </div>
                  <ChevronRight color="#38bdf8" size={20} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Cairo Driver's Manual Modal (Controls & Guide) */}
      {isControlsHelpOpen && (
        <div className="cairo-modal-backdrop" data-testid="help-modal">
          <div className="cairo-modal-window">
            <div className="cairo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HelpCircle color="#f59e0b" size={24} />
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
                  دليل قيادة القاهرة | Cairo Driver's Handbook
                </h3>
              </div>
              <button
                onClick={toggleControlsHelp}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                data-testid="close-help-modal"
              >
                <X size={22} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="cairo-tab-bar">
              <button
                className={`cairo-tab-btn ${activeModalTab === 'controls' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('controls')}
              >
                🎮 أزرار التحكم Controls
              </button>
              <button
                className={`cairo-tab-btn ${activeModalTab === 'districts' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('districts')}
              >
                📍 معالم المدينة Districts
              </button>
              <button
                className={`cairo-tab-btn ${activeModalTab === 'presets' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('presets')}
              >
                🏎️ أداء السيارة Presets
              </button>
            </div>

            {/* Tab 1: Controls */}
            {activeModalTab === 'controls' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="cairo-key-row">
                  <span>W / ↑ (بنزين)</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>Throttle & Accelerate</span>
                </div>
                <div className="cairo-key-row">
                  <span>S / ↓ (فرامل ورجوع للخلف)</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>Brake / Reverse</span>
                </div>
                <div className="cairo-key-row">
                  <span>A / D / ← / → (توجيه)</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>Steer Left & Right</span>
                </div>
                <div className="cairo-key-row">
                  <span>Spacebar (فرامل يد وتفحيط)</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>Handbrake & Drift</span>
                </div>
                <div className="cairo-key-row">
                  <span>C (زاوية الكاميرا)</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>Cycle Camera (Chase, Hood, Interior, Orbit)</span>
                </div>
                <div className="cairo-key-row">
                  <span>H (كلاكس القاهرة الشهير)</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>Egyptian Horn / Klaxon Pattern</span>
                </div>
                <div className="cairo-key-row">
                  <span>L (كشافات الإضاءة)</span>
                  <span style={{ color: '#06b6d4', fontWeight: 700 }}>Toggle Headlights</span>
                </div>
                <div className="cairo-key-row">
                  <span>R (استعدال السيارة)</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>Flip / Recover Overturned Vehicle</span>
                </div>
                <div className="cairo-key-row">
                  <span>M (قائمة الانتقال السريع)</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>Fast-Travel Teleport Menu</span>
                </div>
                <div className="cairo-key-row">
                  <span>Gamepad (ذراع التحكم)</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>Full Analog Triggers (RT/LT) & Left Stick</span>
                </div>
              </div>
            )}

            {/* Tab 2: Districts */}
            {activeModalTab === 'districts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="cairo-key-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                    ١. كوبري ٦ أكتوبر المعلق (6th of October Flyover Deck)
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    طريق سريع معلق بارتفاع ١٤ متراً فوق وسط البلد، يتميز بفواصل التمدد المعدنية التي تصدر صوت ودقة مميزة للمساعدين، ويمر بمحاذاة شرفات البنايات السكنية.
                  </div>
                </div>

                <div className="cairo-key-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#06b6d4' }}>
                    ٢. كورنيش النيل وكوبري قصر النيل (Nile Promenade)
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    شارع عريض متعدد الحارات بمحاذاة مياه نهر النيل العاكسة، مع أشجار النخيل ومراكب الفلوكة الشراعية ونسيم النيل.
                  </div>
                </div>

                <div className="cairo-key-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                    ٣. ميدان التحرير وشارع طلعت حرب (Downtown & Midans)
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    قلب القاهرة النابض بميادين دائرية ونصب المسلة المركزية، وطرق تتفرع منها نحو وسط البلد التراثي.
                  </div>
                </div>

                <div className="cairo-key-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f97316' }}>
                    ٤. حواري القاهرة القديمة وخان الخليلي (Historic Alleys)
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    شوارع ضيقة غير متماثلة بين بنايات الطوب الأحمر، مليئة بالمطبات الصناعية وتتطلب مهارة عالية في التوجيه والتفادي من التوك توك.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Presets */}
            {activeModalTab === 'presets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  className="cairo-key-row"
                  style={{
                    cursor: 'pointer',
                    borderColor: activePreset === 'drift' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                  }}
                  onClick={() => onPresetSelect?.('drift')}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                      🏎️ Tuned Cairo Drift Sedan (سيارة التفحيط الرياضية)
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      نظام تعليق مشدود (Stiffness 45)، قوة محرك ٣٤٠٠، استجابة عالية للانجراف في الميادين.
                    </div>
                  </div>
                  {activePreset === 'drift' && <Zap color="#f59e0b" size={20} />}
                </div>

                <div
                  className="cairo-key-row"
                  style={{
                    cursor: 'pointer',
                    borderColor: activePreset === 'suv' ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                  }}
                  onClick={() => onPresetSelect?.('suv')}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                      🚙 Heavy SUV for Bumps (سيارة الدفع الرباعي للمطبات)
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      مساعدين ناعمة وممتصة للصدمات للمرور بسلاسة فوق مطبات حواري القاهرة وفواصل كوبري أكتوبر.
                    </div>
                  </div>
                  {activePreset === 'suv' && <Zap color="#38bdf8" size={20} />}
                </div>

                <div
                  className="cairo-key-row"
                  style={{
                    cursor: 'pointer',
                    borderColor: activePreset === 'microbus' ? '#10b981' : 'rgba(255,255,255,0.06)',
                  }}
                  onClick={() => onPresetSelect?.('microbus')}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                      🚐 Agile Cairo Microbus Mode (وضع الميكروباص السريع)
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      تسارع خاطف وعزم قوي للمناورة بين سيارات المرور وكلاكس متكرر.
                    </div>
                  </div>
                  {activePreset === 'microbus' && <Zap color="#10b981" size={20} />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
