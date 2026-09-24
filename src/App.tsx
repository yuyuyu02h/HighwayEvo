import { useEffect, useRef, useState } from 'react';
import { HighwayGameEngine } from './game/engine';
import { GameState, CameraViewMode } from './types';
import { Volume2, VolumeX, Compass, Gauge, Camera } from 'lucide-react';

const CAMERA_LABELS: Record<CameraViewMode, { en: string; jp: string }> = {
  chase: { en: 'CHASE CAM', jp: '三人称追従' },
  hood: { en: 'HOOD CAM', jp: '前方ノーズ' },
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bloomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<HighwayGameEngine | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [cameraMode, setCameraModeState] = useState<CameraViewMode>('chase');
  const [cameraToast, setCameraToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [hudState, setHudState] = useState<GameState>({
    speed: 32,
    playerX: 0,
    playerVX: 0,
    time: 0,
    distanceTraveled: 0,
    cameraMode: 'chase',
  });
  const [districtTitle, setDistrictTitle] = useState('湾岸新都心 Commercial District');
  const [isTouch, setIsTouch] = useState(false);

  const showCameraToastNotification = (mode: CameraViewMode) => {
    const info = CAMERA_LABELS[mode];
    setCameraToast(`${info.en} · ${info.jp}`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setCameraToast(null);
    }, 2200);
  };

  const cycleCamera = () => {
    if (engineRef.current) {
      engineRef.current.startAudio();
      const nextMode = engineRef.current.cycleCameraMode();
      setCameraModeState(nextMode);
      showCameraToastNotification(nextMode);
    }
  };

  const selectCamera = (mode: CameraViewMode) => {
    if (engineRef.current) {
      engineRef.current.startAudio();
      engineRef.current.setCameraMode(mode);
      setCameraModeState(mode);
      showCameraToastNotification(mode);
    }
  };

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (!canvasRef.current || !bloomCanvasRef.current) return;

    // Initialize 3D Engine
    const engine = new HighwayGameEngine(canvasRef.current, bloomCanvasRef.current);
    engineRef.current = engine;

    engine.onStateChange = (state, title) => {
      // Throttle HUD state updates to save React re-renders
      if (Math.floor(state.time * 10) % 2 === 0) {
        setHudState({ ...state });
        setDistrictTitle(title);
      }
    };

    engine.start();

    // 1. Keyboard event handling
    const keys: Record<string, boolean> = {};
    const updateInputFromKeys = () => {
      let steer = 0;
      if (keys['KeyA'] || keys['ArrowLeft']) steer -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) steer += 1;
      engine.input.steer = steer;

      let throttle = 0;
      if (keys['KeyW'] || keys['ArrowUp']) throttle += 1;
      if (keys['KeyS'] || keys['ArrowDown']) throttle -= 1;
      engine.input.throttle = throttle;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      engine.startAudio();

      // Camera view toggle shortcuts: C or V or numbers 1-3
      if (e.code === 'KeyC' || e.code === 'KeyV') {
        e.preventDefault();
        const nextMode = engine.cycleCameraMode();
        setCameraModeState(nextMode);
        showCameraToastNotification(nextMode);
        return;
      }
      if (e.code === 'Digit1') {
        e.preventDefault();
        engine.setCameraMode('chase');
        setCameraModeState('chase');
        showCameraToastNotification('chase');
        return;
      }
      if (e.code === 'Digit2') {
        e.preventDefault();
        engine.setCameraMode('hood');
        setCameraModeState('hood');
        showCameraToastNotification('hood');
        return;
      }

      keys[e.code] = true;
      updateInputFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      updateInputFromKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 2. Touch event handling
    const canvas = canvasRef.current;
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      engine.startAudio();
      let steer = 0;
      const w = window.innerWidth;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        steer += t.clientX < w / 2 ? -1 : 1;
      }
      engine.input.steer = e.touches.length > 0 ? Math.max(-1, Math.min(1, steer)) : 0;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      let steer = 0;
      const w = window.innerWidth;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        steer += t.clientX < w / 2 ? -1 : 1;
      }
      engine.input.steer = e.touches.length > 0 ? Math.max(-1, Math.min(1, steer)) : 0;
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Fade intro UI after 4.2 seconds
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 4200);

    return () => {
      clearTimeout(timer);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      engine.destroy();
    };
  }, []);

  const handleToggleSound = () => {
    if (engineRef.current) {
      const muted = engineRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const speedKmh = Math.round(hudState.speed * 2.2);
  const distanceKm = (hudState.distanceTraveled / 1000).toFixed(1);

  return (
    <div id="game-container" className="relative w-screen h-screen overflow-hidden bg-[#120d0c] select-none touch-none">
      {/* 3D WebGL Canvas */}
      <canvas
        id="c"
        ref={canvasRef}
        className="fixed inset-0 w-full h-full block z-0"
        style={{
          filter: 'url(#caFilter) saturate(0.96) contrast(1.08) sepia(0.04) brightness(1.02)',
        }}
      />

      {/* Screen-Blended Glow Bloom Canvas */}
      <canvas
        id="bloomCanvas"
        ref={bloomCanvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-1"
        style={{
          mixBlendMode: 'screen',
          opacity: 0.42,
          filter: 'blur(8px)',
        }}
      />

      {/* Cinematic Vignette */}
      <div
        id="vignette"
        className="fixed inset-0 pointer-events-none z-2"
        style={{
          background: 'radial-gradient(ellipse at 50% 58%, rgba(0,0,0,0) 40%, rgba(12,7,5,0.65) 100%)',
        }}
      />

      {/* Subtle Analog Film Grain */}
      <div
        id="grain"
        className="fixed inset-0 pointer-events-none z-3 opacity-[0.045] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* SVG Chromatic Aberration Filter */}
      <svg width="0" height="0" className="absolute">
        <filter id="caFilter" x="-5%" y="-5%" width="110%" height="110%">
          <feOffset in="SourceGraphic" dx="1.1" dy="0" result="rShift" />
          <feColorMatrix in="rShift" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rOnly" />
          <feOffset in="SourceGraphic" dx="-1.1" dy="0" result="bShift" />
          <feColorMatrix in="bShift" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bOnly" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gOnly" />
          <feBlend in="rOnly" in2="gOnly" mode="screen" result="rg" />
          <feBlend in="rg" in2="bOnly" mode="screen" />
        </filter>
      </svg>

      {/* Camera Mode Change Toast Notification */}
      {cameraToast && (
        <div
          id="camera-toast"
          className="fixed top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 rounded-full bg-[#18120e]/85 border border-[#ffd180]/40 backdrop-blur-md text-[#ffeedd] text-xs font-mono tracking-[0.25em] shadow-2xl transition-all duration-300 flex items-center gap-2"
        >
          <Camera className="w-3.5 h-3.5 text-[#ffd180]" />
          <span>{cameraToast}</span>
        </div>
      )}

      {/* Main Atmospheric UI Overlay */}
      <div
        id="ui"
        className="fixed inset-0 pointer-events-none z-4 flex flex-col justify-between items-center p-6 text-[#f4e6c9] font-mono"
        style={{
          textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        }}
      >
        {/* Title and Subtext */}
        <div
          id="title-container"
          className={`mt-[6vh] text-center transition-all duration-1000 ease-out ${
            showIntro ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-normal tracking-[0.38em] uppercase text-[#fdf6e6]">
            Endless Sunset Highway
          </h1>
          <p className="mt-2 text-xs tracking-[0.28em] text-[#f4e6c9]/70 lowercase">
            keep driving
          </p>
        </div>

        {/* Minimalist Japanese Expressway Telemetry HUD (Bottom Center) */}
        <div className="flex flex-col items-center gap-3">
          {/* Subtle District Banner */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#18120e]/60 border border-[#f4e6c9]/20 text-[11px] tracking-[0.18em] text-[#f4e6c9]/80 backdrop-blur-xs">
            <Compass className="w-3.5 h-3.5 text-[#f5a456]" />
            <span>{districtTitle}</span>
          </div>

          {/* Speed & Distance Telemetry */}
          <div className="flex items-center gap-6 px-4 py-1.5 rounded-lg bg-[#140e0b]/70 border border-[#f4e6c9]/15 backdrop-blur-xs text-xs tracking-wider">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-[#f5a456]" />
              <span className="text-[#f4e6c9]/60">SPD</span>
              <span className="font-semibold text-sm tabular-nums text-[#ffebc8]">{speedKmh}</span>
              <span className="text-[10px] text-[#f4e6c9]/50">KM/H</span>
            </div>
            <div className="w-[1px] h-3 bg-[#f4e6c9]/20" />
            <div className="flex items-center gap-1.5">
              <span className="text-[#f4e6c9]/60">DIST</span>
              <span className="font-semibold text-sm tabular-nums text-[#ffebc8]">{distanceKm}</span>
              <span className="text-[10px] text-[#f4e6c9]/50">KM</span>
            </div>
          </div>

          {/* Quick Camera View Selector Bar */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-[#18120e]/75 border border-[#f4e6c9]/20 backdrop-blur-sm text-[10px] tracking-wider">
            <button
              id="camBtnChase"
              onClick={() => selectCamera('chase')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                cameraMode === 'chase'
                  ? 'bg-[#f5a456]/25 border border-[#f5a456]/60 text-[#ffeacc] font-medium'
                  : 'text-[#f4e6c9]/60 hover:text-[#f4e6c9]'
              }`}
              title="Chase Camera (Press 1 or C)"
            >
              CHASE [1]
            </button>
            <button
              id="camBtnHood"
              onClick={() => selectCamera('hood')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                cameraMode === 'hood'
                  ? 'bg-[#f5a456]/25 border border-[#f5a456]/60 text-[#ffeacc] font-medium'
                  : 'text-[#f4e6c9]/60 hover:text-[#f4e6c9]'
              }`}
              title="Hood Camera (Press 2 or C)"
            >
              HOOD [2]
            </button>
          </div>

          {/* Driving Controls Hint */}
          <div
            id="hint"
            className={`text-[10px] sm:text-[11px] tracking-[0.18em] text-[#f4e6c9]/65 transition-opacity duration-1000 ${
              showIntro ? 'opacity-80' : 'opacity-0'
            }`}
          >
            {isTouch
              ? 'tap left/right to steer · tap buttons to switch view'
              : 'W/↑ speed · A D/← → steer · S/↓ brake · C switch view'}
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Buttons */}
      <div className="fixed right-5 bottom-5 z-10 flex items-center gap-3">
        {/* Cycle Camera Button */}
        <button
          id="cycleCamBtn"
          onClick={cycleCamera}
          className="flex items-center gap-2 px-3 py-2 rounded-full border border-[#f4e6c9]/35 bg-[#140e0a]/60 text-[#f4e6c9] cursor-pointer backdrop-blur-xs hover:bg-[#140e0a]/85 active:scale-95 transition-all shadow-lg font-mono text-xs"
          aria-label="Toggle Camera View"
          title="Press [C] or Click to Switch Camera View"
        >
          <Camera className="w-4 h-4 text-[#ffd180]" />
          <span className="text-[11px] tracking-widest hidden sm:inline uppercase">
            {CAMERA_LABELS[cameraMode].en}
          </span>
          <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-white/70">
            C
          </span>
        </button>

        {/* Audio Mute/Unmute Button */}
        <button
          id="muteBtn"
          onClick={handleToggleSound}
          className="w-10 h-10 rounded-full border border-[#f4e6c9]/35 bg-[#140e0a]/60 text-[#f4e6c9] flex items-center justify-center cursor-pointer backdrop-blur-xs hover:bg-[#140e0a]/85 active:scale-95 transition-all shadow-lg"
          aria-label="Toggle Sound"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-[#e57373]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#ffd180]" />
          )}
        </button>
      </div>
    </div>
  );
}
