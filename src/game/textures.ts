import * as THREE from 'three';

// Cache generated textures to avoid redundant work and memory leaks
const textureCache = new Map<string, THREE.CanvasTexture>();

function createProceduralTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
): THREE.CanvasTexture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  textureCache.set(key, texture);
  return texture;
}

/**
 * High-definition asphalt road surface texture.
 * Features:
 * - Fine aggregate pebble speckles
 * - Two polished tire path ruts with subtle asphalt sheen
 * - Center lane oil drips & engine soot
 * - Tar crack repair seams
 * - Weathered asphalt edge runoff
 */
export function getRoadAsphaltTexture(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const map = createProceduralTexture('road_asphalt_diffuse', 1024, 1024, (ctx, w, h) => {
    // Base dark weathered charcoal asphalt
    ctx.fillStyle = '#22201d';
    ctx.fillRect(0, 0, w, h);

    // Multi-layered aggregate grain
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n1 = (Math.random() - 0.5) * 36;
      const n2 = ((i % 17 === 0) ? (Math.random() - 0.5) * 45 : 0);
      const val = n1 + n2;
      data[i] = Math.min(255, Math.max(0, data[i] + val + 2));       // R (warm undertone)
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + val));   // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + val - 2)); // B
    }
    ctx.putImageData(imgData, 0, 0);

    // Tire tracks (two worn, smoother, slightly darker ruts per lane side)
    // Left lane ruts: ~20% and ~40% width. Right lane ruts: ~60% and ~80% width.
    const ruts = [w * 0.22, w * 0.38, w * 0.62, w * 0.78];
    ruts.forEach(rx => {
      const grad = ctx.createLinearGradient(rx - 70, 0, rx + 70, 0);
      grad.addColorStop(0, 'rgba(25, 23, 20, 0)');
      grad.addColorStop(0.3, 'rgba(18, 16, 14, 0.45)');
      grad.addColorStop(0.5, 'rgba(14, 13, 11, 0.55)');
      grad.addColorStop(0.7, 'rgba(18, 16, 14, 0.45)');
      grad.addColorStop(1, 'rgba(25, 23, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(rx - 70, 0, 140, h);
    });

    // Center lane oil stains and slight weathering
    [w * 0.3, w * 0.7].forEach(cx => {
      for (let y = 0; y < h; y += 40 + Math.random() * 80) {
        ctx.fillStyle = 'rgba(12, 11, 10, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx + (Math.random() - 0.5) * 20, y, 16 + Math.random() * 24, 30 + Math.random() * 60, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Tar seam repair lines (glossy black tar snake lines on old asphalt)
    ctx.strokeStyle = 'rgba(15, 13, 12, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (let c = 0; c < 4; c++) {
      ctx.beginPath();
      let startX = Math.random() * w;
      let startY = Math.random() * h;
      ctx.moveTo(startX, startY);
      for (let p = 0; p < 5; p++) {
        startX += (Math.random() - 0.5) * 120;
        startY += (Math.random() - 0.5) * 160;
        ctx.lineTo(startX, startY);
      }
      ctx.stroke();
    }
  });

  const roughnessMap = createProceduralTexture('road_asphalt_roughness', 512, 512, (ctx, w, h) => {
    // Base roughness
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(0, 0, w, h);

    // Tire tracks are smoother (darker on roughness map = more specular sheen from sunset!)
    const ruts = [w * 0.22, w * 0.38, w * 0.62, w * 0.78];
    ruts.forEach(rx => {
      const grad = ctx.createLinearGradient(rx - 45, 0, rx + 45, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(rx - 45, 0, 90, h);
    });

    // Noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = data[i];
      data[i + 2] = data[i];
    }
    ctx.putImageData(imgData, 0, 0);
  });

  return { map, roughnessMap };
}

/**
 * Concrete texture with formwork seams, water staining and aggregate scuffs
 * for Jersey barriers, bridge piers, curbs, and highway overpasses.
 */
export function getConcreteTexture(): THREE.CanvasTexture {
  return createProceduralTexture('concrete_weathered', 512, 512, (ctx, w, h) => {
    // Base concrete grey with slight warm sunset bounce undertone
    ctx.fillStyle = '#7a746c';
    ctx.fillRect(0, 0, w, h);

    // Speckle noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, data[i] + val + 2));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + val));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + val - 2));
    }
    ctx.putImageData(imgData, 0, 0);

    // Formwork horizontal & vertical panel seams
    ctx.strokeStyle = 'rgba(50, 46, 42, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();

    // Form tie holes
    const holes = [
      [w * 0.25, h * 0.25],
      [w * 0.75, h * 0.25],
      [w * 0.25, h * 0.75],
      [w * 0.75, h * 0.75],
    ];
    holes.forEach(([hx, hy]) => {
      ctx.fillStyle = 'rgba(38, 34, 30, 0.6)';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Rain water runoff streak under tie holes
      const streakGrad = ctx.createLinearGradient(hx, hy, hx, hy + 45);
      streakGrad.addColorStop(0, 'rgba(40, 36, 32, 0.4)');
      streakGrad.addColorStop(1, 'rgba(40, 36, 32, 0)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(hx - 3, hy, 6, 45);
    });
  });
}

/**
 * Modern High-Rise Glass Curtain Wall Facade.
 * Features:
 * - Structural aluminum mullions and transoms
 * - Office window panes with realistic warm sunset lighting, interior office lights, and drawn blinds
 */
export function getModernOfficeFacadeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('facade_modern_office', 512, 1024, (ctx, w, h) => {
    // Base dark reflective spandrel glass
    ctx.fillStyle = '#2d2928';
    ctx.fillRect(0, 0, w, h);

    const cols = 8;
    const rows = 24;
    const colW = w / cols;
    const rowH = h / rows;
    const mullion = 3;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * colW + mullion;
        const y = r * rowH + mullion;
        const pw = colW - mullion * 2;
        const ph = rowH - mullion * 2;

        const rand = Math.random();

        if (rand < 0.28) {
          // Warm glowing office (late workers during sunset)
          const grad = ctx.createLinearGradient(x, y, x, y + ph);
          grad.addColorStop(0, '#ffd899');
          grad.addColorStop(1, '#ffaa4d');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, pw, ph);

          // Partial horizontal blinds
          if (Math.random() < 0.6) {
            ctx.fillStyle = 'rgba(70, 50, 30, 0.75)';
            const blindH = ph * (0.2 + Math.random() * 0.5);
            ctx.fillRect(x, y, pw, blindH);
          }
        } else if (rand < 0.42) {
          // Cool monitor / fluorescent glow
          ctx.fillStyle = '#85b8d6';
          ctx.fillRect(x, y, pw, ph);
          if (Math.random() < 0.5) {
            ctx.fillStyle = 'rgba(30, 45, 60, 0.8)';
            ctx.fillRect(x, y, pw, ph * 0.4);
          }
        } else if (rand < 0.65) {
          // Sunset reflection pane (amber tinted reflection)
          const grad = ctx.createLinearGradient(x, y, x, y + ph);
          grad.addColorStop(0, '#e58c54');
          grad.addColorStop(1, '#663b27');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, pw, ph);
        } else {
          // Dark unlit office pane with faint depth
          ctx.fillStyle = '#1c1a19';
          ctx.fillRect(x, y, pw, ph);
        }
      }
    }

    // Grid mullions / metal spandrel bands
    ctx.strokeStyle = '#473f3b';
    ctx.lineWidth = mullion;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * colW, 0);
      ctx.lineTo(c * colW, h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * rowH);
      ctx.lineTo(w, r * rowH);
      ctx.stroke();
    }
  });
}

/**
 * Residential Apartment Complex Facade.
 * Features:
 * - Balcony indentations, sliding doors, warm living room lamps, balcony railings
 */
export function getApartmentFacadeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('facade_apartment', 512, 1024, (ctx, w, h) => {
    // Base stucco / beige-gray concrete
    ctx.fillStyle = '#5c544d';
    ctx.fillRect(0, 0, w, h);

    const cols = 6;
    const rows = 18;
    const colW = w / cols;
    const rowH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * colW + 6;
        const y = r * rowH + 6;
        const bw = colW - 12;
        const bh = rowH - 12;

        // Balcony recess shadow
        ctx.fillStyle = '#272320';
        ctx.fillRect(x, y, bw, bh);

        // Living room sliding glass door
        const doorW = bw * 0.75;
        const doorH = bh * 0.75;
        const doorX = x + (bw - doorW) / 2;
        const doorY = y + 2;

        const isLit = Math.random() < 0.45;
        if (isLit) {
          const warm = Math.random() < 0.8;
          ctx.fillStyle = warm ? '#ffca85' : '#8ab9d9';
          ctx.fillRect(doorX, doorY, doorW, doorH);

          // Curtain shadows
          ctx.fillStyle = 'rgba(60, 45, 35, 0.65)';
          ctx.fillRect(doorX, doorY, doorW * 0.35, doorH);
        } else {
          ctx.fillStyle = '#181615';
          ctx.fillRect(doorX, doorY, doorW, doorH);
        }

        // Balcony safety railing (lower portion of balcony)
        ctx.fillStyle = '#3a3430';
        ctx.fillRect(x, y + bh * 0.58, bw, bh * 0.42);

        // Railing vertical slats
        ctx.strokeStyle = '#4e4742';
        ctx.lineWidth = 2;
        for (let sl = x + 4; sl < x + bw - 4; sl += 8) {
          ctx.beginPath();
          ctx.moveTo(sl, y + bh * 0.58);
          ctx.lineTo(sl, y + bh);
          ctx.stroke();
        }
      }
    }
  });
}

/**
 * Industrial Corrugated Metal & Brickwork Facade.
 */
export function getIndustrialFacadeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('facade_industrial', 512, 512, (ctx, w, h) => {
    // Weathered steel / rust base
    ctx.fillStyle = '#47413a';
    ctx.fillRect(0, 0, w, h);

    // Corrugated horizontal sheeting grooves
    for (let y = 0; y < h; y += 8) {
      const grad = ctx.createLinearGradient(0, y, 0, y + 8);
      grad.addColorStop(0, '#595147');
      grad.addColorStop(0.5, '#3b362f');
      grad.addColorStop(1, '#2b2723');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, w, 8);
    }

    // Rust runoff streaks
    for (let s = 0; s < 12; s++) {
      const sx = Math.random() * w;
      const sy = Math.random() * (h * 0.5);
      const slen = 40 + Math.random() * 120;
      const rGrad = ctx.createLinearGradient(sx, sy, sx, sy + slen);
      rGrad.addColorStop(0, 'rgba(120, 55, 30, 0.7)');
      rGrad.addColorStop(1, 'rgba(90, 45, 25, 0)');
      ctx.fillStyle = rGrad;
      ctx.fillRect(sx - 4, sy, 8, slen);
    }
  });
}

/**
 * Authentic Highway Overhead Directional Signboard (Wangan / Shuto Expressway style).
 * Features crisp green/blue backdrop, Japanese Kanji + English lettering, highway route shield.
 */
export function getHighwayOverheadSignTexture(destination: string, subText: string, exitNo: string): THREE.CanvasTexture {
  const key = `highway_sign_${destination}_${exitNo}`;
  return createProceduralTexture(key, 512, 256, (ctx, w, h) => {
    // Japanese Expressway Green
    ctx.fillStyle = '#0b5b3a';
    ctx.fillRect(0, 0, w, h);

    // White outer border with rounded corners
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Route shield / exit box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(28, 28, 100, 48);
    ctx.fillStyle = '#0b5b3a';
    ctx.font = 'bold 26px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(exitNo, 78, 52);

    // Main Kanji destination
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(destination, 150, 68);

    // English subtext
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e8f5e9';
    ctx.fillText(subText, 152, 110);

    // Directional Arrow & Distance
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(78, 200);
    ctx.lineTo(78, 140);
    ctx.lineTo(60, 158);
    ctx.moveTo(78, 140);
    ctx.lineTo(96, 158);
    ctx.stroke();

    ctx.font = 'bold 32px "JetBrains Mono", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('1.5 km', 152, 175);
    ctx.font = '400 18px sans-serif';
    ctx.fillStyle = '#c8e6c9';
    ctx.fillText('夕凪出口 Sunset Coast Exit', 152, 208);
  });
}

/**
 * Electronic Highway LED Message Matrix Sign
 * e.g. "速度注意 DRIVE SAFELY" in glowing amber dots
 */
export function getHighwayLedMatrixTexture(): THREE.CanvasTexture {
  return createProceduralTexture('highway_led_matrix', 512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, w, h);

    // Outer metal border
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Amber LED Dot text
    ctx.fillStyle = '#ff9900';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('夕暮れ時 速度注意  /  REDUCE SPEED', w / 2, h / 2);
  });
}

/**
 * Japanese Vending Machine Graphic Texture with realistic illuminated drink cans.
 */
export function getVendingMachineTexture(): THREE.CanvasTexture {
  return createProceduralTexture('vending_machine_tex', 256, 512, (ctx, w, h) => {
    // Red/Blue branded beverage machine body
    ctx.fillStyle = '#b72828';
    ctx.fillRect(0, 0, w, h);

    // Top illuminated brand panel
    const topGrad = ctx.createLinearGradient(0, 16, 0, 70);
    topGrad.addColorStop(0, '#ffffff');
    topGrad.addColorStop(1, '#ffe0e0');
    ctx.fillStyle = topGrad;
    ctx.fillRect(16, 16, w - 32, 54);
    ctx.fillStyle = '#c41d1d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DRINKS 冷~い', w / 2, 50);

    // Illuminated display window with rows of drink cans
    ctx.fillStyle = '#1a2228';
    ctx.fillRect(16, 84, w - 32, 230);

    const rows = 3;
    const cols = 5;
    const canW = 32;
    const canH = 52;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = 26 + c * 42;
        const cy = 94 + r * 72;

        // Little colorful can
        const colors = ['#2065b5', '#24a04d', '#e09822', '#d92c2c', '#542878'];
        ctx.fillStyle = colors[(r * cols + c) % colors.length];
        ctx.fillRect(cx, cy, canW, canH);

        // Price button with blue/red cold/hot indicator
        const isCold = Math.random() < 0.7;
        ctx.fillStyle = isCold ? '#2979ff' : '#ff3d00';
        ctx.fillRect(cx + 2, cy + canH + 3, canW - 4, 10);
      }
    }

    // Coin slot & return flap
    ctx.fillStyle = '#262626';
    ctx.fillRect(w - 60, 340, 36, 18);
    ctx.fillStyle = '#05be50'; // green insert coin LED
    ctx.fillRect(w - 44, 345, 6, 6);

    // Large dispense tray flap
    ctx.fillStyle = '#1f1f1f';
    ctx.fillRect(28, 410, w - 56, 68);
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 410, w - 56, 68);
  });
}

/**
 * Sun flare & soft atmospheric radial textures
 */
export function getRadialGlowTexture(innerColor: string, outerColor: string, size = 256): THREE.CanvasTexture {
  const key = `glow_${innerColor}_${outerColor}_${size}`;
  return createProceduralTexture(key, size, size, (ctx, w, h) => {
    const half = w / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.35, innerColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Cat's eye / retro-reflective pavement marker texture (Bott's dots)
 */
export function getPavementMarkerTexture(): THREE.CanvasTexture {
  return createProceduralTexture('pavement_marker', 64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e6cf93';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 24, 0, Math.PI * 2);
    ctx.fill();

    // Center amber retroreflector lens
    ctx.fillStyle = '#ffaa11';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * 2x2 Twill-Weave Carbon Fiber Texture for aerodynamic components (splitter, spoiler, diffuser, mirrors).
 */
export function getCarbonFiberTexture(): THREE.CanvasTexture {
  return createProceduralTexture('carbon_fiber_twill', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, w, h);

    const step = 8;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const isOffset = ((x / step + y / step) % 2) === 0;
        const grad = ctx.createLinearGradient(x, y, x + step, y + step);
        if (isOffset) {
          grad.addColorStop(0, '#2b2c30');
          grad.addColorStop(0.5, '#1e1f23');
          grad.addColorStop(1, '#111214');
        } else {
          grad.addColorStop(0, '#101113');
          grad.addColorStop(0.5, '#222328');
          grad.addColorStop(1, '#2f3036');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, step, step);
      }
    }
  });
}

/**
 * Authentic Japanese Number Plate Texture (e.g. 品川 330 た 86-92)
 */
export function getJapaneseLicensePlateTexture(
  region = '品川',
  classNo = '330',
  kana = 'た',
  digits = '86-92'
): THREE.CanvasTexture {
  return createProceduralTexture(`license_plate_${region}_${digits}`, 512, 256, (ctx, w, h) => {
    // White background plate with stamped border
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, w, h);

    // Green embossed edge rim
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Left screw / official prefecture seal
    ctx.fillStyle = '#c5ccd0';
    ctx.beginPath();
    ctx.arc(80, 52, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#838e96';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Right mounting screw
    ctx.beginPath();
    ctx.arc(w - 80, 52, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Top text: Region + Class number
    ctx.fillStyle = '#1b5e20';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${region} ${classNo}`, w / 2, 60);

    // Hiragana classification character
    ctx.font = 'bold 74px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(kana, 50, 168);

    // Main 4 digits with hyphen
    ctx.font = 'bold 96px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(digits, w / 2 + 35, 168);
  });
}

/**
 * High-performance drilled brake rotor with friction track texture
 */
export function getCarWheelRotorTexture(): THREE.CanvasTexture {
  return createProceduralTexture('wheel_brake_rotor', 512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Dark background
    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, w, h);

    // Metallic brake rotor disc
    const outerR = w * 0.46;
    const innerR = w * 0.22;

    const discGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    discGrad.addColorStop(0, '#5a5d64');
    discGrad.addColorStop(0.2, '#9ea2ab');
    discGrad.addColorStop(0.5, '#787b82');
    discGrad.addColorStop(0.8, '#b4b8c2');
    discGrad.addColorStop(1, '#505359');

    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Inner hat (black anodized aluminum hub)
    ctx.fillStyle = '#222326';
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Center spindle hole
    ctx.fillStyle = '#0e0e10';
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // 5 Wheel Lug Nuts
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const lx = cx + Math.cos(angle) * (innerR * 0.65);
      const ly = cy + Math.sin(angle) * (innerR * 0.65);

      ctx.fillStyle = '#c5ccd0';
      ctx.beginPath();
      ctx.arc(lx, ly, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#18191c';
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concentric machining grooved friction rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    for (let r = innerR + 10; r < outerR - 6; r += 7) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Drilled ventilation holes (spiral curves)
    ctx.fillStyle = '#0f1012';
    for (let s = 0; s < 12; s++) {
      const baseAngle = (s * Math.PI * 2) / 12;
      for (let step = 0; step < 4; step++) {
        const rad = innerR + 24 + step * 28;
        const curAngle = baseAngle + step * 0.12;
        const hx = cx + Math.cos(curAngle) * rad;
        const hy = cy + Math.sin(curAngle) * rad;
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/**
 * High-definition Cockpit Gauge Cluster Texture
 * Backlit Japanese sports car meters (320 km/h speedo, 9k RPM tachometer, fuel/temp)
 */
export function getCarCockpitGaugeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('cockpit_gauge_cluster_hd', 1024, 512, (ctx, w, h) => {
    // Dark carbon-texture dashboard bezel
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, w, h);

    // Outer metallic gauge rings
    const leftCX = w * 0.3;
    const rightCX = w * 0.7;
    const cy = h * 0.52;
    const radius = h * 0.42;

    [leftCX, rightCX].forEach((centerCX) => {
      // Chrome bezel ring
      ctx.strokeStyle = '#4e545e';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(centerCX, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dial matte face
      const dialGrad = ctx.createRadialGradient(centerCX, cy, 0, centerCX, cy, radius - 8);
      dialGrad.addColorStop(0, '#1c1e24');
      dialGrad.addColorStop(1, '#0e0f12');
      ctx.fillStyle = dialGrad;
      ctx.beginPath();
      ctx.arc(centerCX, cy, radius - 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 1. LEFT GAUGE: SPEEDOMETER (0 - 320 km/h)
    ctx.save();
    ctx.translate(leftCX, cy);
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const totalTicks = 32;

    for (let i = 0; i <= totalTicks; i++) {
      const t = i / totalTicks;
      const angle = startAngle + t * (endAngle - startAngle);
      const isMajor = i % 4 === 0;
      const tickLen = isMajor ? 24 : 14;

      const x1 = Math.cos(angle) * (radius - 16);
      const y1 = Math.sin(angle) * (radius - 16);
      const x2 = Math.cos(angle) * (radius - 16 - tickLen);
      const y2 = Math.sin(angle) * (radius - 16 - tickLen);

      ctx.strokeStyle = isMajor ? '#ffa726' : 'rgba(255, 183, 77, 0.6)';
      ctx.lineWidth = isMajor ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isMajor) {
        const textR = radius - 54;
        const tx = Math.cos(angle) * textR;
        const ty = Math.sin(angle) * textR;
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 22px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i * 10}`, tx, ty);
      }
    }

    ctx.fillStyle = '#ffb74d';
    ctx.font = 'bold 20px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('km/h', 0, 50);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 238, 221, 0.6)';
    ctx.fillText('SPEED', 0, 75);
    ctx.restore();

    // 2. RIGHT GAUGE: TACHOMETER (0 - 9000 RPM, 7500+ Redline)
    ctx.save();
    ctx.translate(rightCX, cy);

    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      const angle = startAngle + t * (endAngle - startAngle);
      const isRedline = i >= 7;

      const x1 = Math.cos(angle) * (radius - 16);
      const y1 = Math.sin(angle) * (radius - 16);
      const x2 = Math.cos(angle) * (radius - 38);
      const y2 = Math.sin(angle) * (radius - 38);

      ctx.strokeStyle = isRedline ? '#ff3d00' : '#ffa726';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const textR = radius - 56;
      const tx = Math.cos(angle) * textR;
      const ty = Math.sin(angle) * textR;
      ctx.fillStyle = isRedline ? '#ff5252' : '#ffeedd';
      ctx.font = 'bold 26px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i}`, tx, ty);
    }

    // Redline arc stripe
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 20, startAngle + (7 / 9) * (endAngle - startAngle), endAngle);
    ctx.stroke();

    ctx.fillStyle = '#ffb74d';
    ctx.font = 'bold 20px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x1000 r/min', 0, 50);
    ctx.restore();

    // Center Digital Info Screen (Odometer & Turbo Boost)
    const midX = w / 2;
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(midX - 70, cy - 45, 140, 90);
    ctx.strokeStyle = '#323742';
    ctx.lineWidth = 3;
    ctx.strokeRect(midX - 70, cy - 45, 140, 90);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TURBO BOOST', midX, cy - 22);

    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText('+1.15 bar', midX, cy + 5);

    ctx.fillStyle = '#a0afc0';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('TRIP 142.8 km', midX, cy + 28);
  });
}

/**
 * Center console texture with 3 Defi auxiliary gauges, climate vents & audio head unit
 */
export function getCarCenterConsoleTexture(): THREE.CanvasTexture {
  return createProceduralTexture('car_center_console', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#17181c';
    ctx.fillRect(0, 0, w, h);

    // 1. Triple Auxiliary Gauges (Top Row)
    const gaugeY = 80;
    const gR = 52;
    const gXs = [w * 0.2, w * 0.5, w * 0.8];
    const gLabels = ['BOOST', 'OIL TEMP', 'WATER'];

    gXs.forEach((gx, idx) => {
      ctx.strokeStyle = '#4e545e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(gx, gaugeY, gR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0e1014';
      ctx.beginPath();
      ctx.arc(gx, gaugeY, gR - 4, 0, Math.PI * 2);
      ctx.fill();

      // Amber markings
      ctx.strokeStyle = '#ffa726';
      ctx.lineWidth = 2.5;
      for (let a = Math.PI * 0.75; a <= Math.PI * 2.25; a += 0.45) {
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(a) * (gR - 10), gaugeY + Math.sin(a) * (gR - 10));
        ctx.lineTo(gx + Math.cos(a) * (gR - 20), gaugeY + Math.sin(a) * (gR - 20));
        ctx.stroke();
      }

      ctx.fillStyle = '#ffb74d';
      ctx.font = 'bold 12px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gLabels[idx], gx, gaugeY + 28);
    });

    // 2. Air Conditioning Louvers
    ctx.fillStyle = '#0d0e10';
    ctx.fillRect(w * 0.15, 160, w * 0.7, 44);
    ctx.strokeStyle = '#3d4048';
    ctx.lineWidth = 2;
    for (let lx = w * 0.18; lx < w * 0.82; lx += 14) {
      ctx.beginPath();
      ctx.moveTo(lx, 164);
      ctx.lineTo(lx, 200);
      ctx.stroke();
    }

    // 3. 2-DIN GPS Navigation / Highway Route Map Display
    const screenX = w * 0.12;
    const screenY = 224;
    const screenW = w * 0.76;
    const screenH = 150;

    ctx.fillStyle = '#0c1218';
    ctx.fillRect(screenX, screenY, screenW, screenH);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 4;
    ctx.strokeRect(screenX, screenY, screenW, screenH);

    // Glowing Map Route Line (Tokyo Bay route)
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(screenX + 20, screenY + 120);
    ctx.bezierCurveTo(screenX + 80, screenY + 100, screenX + 160, screenY + 50, screenX + screenW - 30, screenY + 40);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('首都高 湾岸線', screenX + 24, screenY + 32);
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('WANGAN EXP 80km/h', screenX + 24, screenY + 54);

    // 4. Climate Control Knobs
    const knobY = 430;
    [w * 0.28, w * 0.5, w * 0.72].forEach((kx) => {
      ctx.fillStyle = '#2c2e35';
      ctx.beginPath();
      ctx.arc(kx, knobY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#606674';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ff7043';
      ctx.beginPath();
      ctx.arc(kx, knobY - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

/**
 * Headlight internal projector lens & LED ribbon texture
 */
export function getHeadlightInternalTexture(): THREE.CanvasTexture {
  return createProceduralTexture('headlight_internal_led', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#101114';
    ctx.fillRect(0, 0, w, h);

    // Dual Bi-LED Projector lenses
    [w * 0.3, w * 0.7].forEach((px) => {
      const pGrad = ctx.createRadialGradient(px, h * 0.5, 0, px, h * 0.5, 65);
      pGrad.addColorStop(0, '#ffffff');
      pGrad.addColorStop(0.3, '#fff4cc');
      pGrad.addColorStop(0.7, '#ffb74d');
      pGrad.addColorStop(1, '#2c2214');

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, h * 0.5, 65, 0, Math.PI * 2);
      ctx.fill();

      // Chrome projector shroud
      ctx.strokeStyle = '#8a929d';
      ctx.lineWidth = 6;
      ctx.stroke();
    });

    // U-shaped LED Daytime Running Light (DRL) light ribbon
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffe082';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(30, 40);
    ctx.lineTo(w - 30, 40);
    ctx.lineTo(w - 20, h - 35);
    ctx.stroke();
  });
}

/**
 * Realistic Japanese Skyline Corporate Neon Signs on Steel Scaffolding
 */
export function getRooftopNeonSignTexture(
  kanji: string,
  english: string,
  neonColor = '#ff9800',
  subColor = '#00e5ff'
): THREE.CanvasTexture {
  return createProceduralTexture(`neon_sign_${kanji}_${english}`, 512, 256, (ctx, w, h) => {
    // Semi-dark metallic industrial backdrop
    ctx.fillStyle = '#181615';
    ctx.fillRect(0, 0, w, h);

    // Steel truss frame border
    ctx.strokeStyle = '#3a3430';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // Neon glow effect
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 76px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kanji, w / 2, 95);

    // Second glow pass in vivid neon color
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 4;
    ctx.strokeText(kanji, w / 2, 95);

    // English sub-branding
    ctx.shadowColor = subColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = subColor;
    ctx.font = 'bold 30px "JetBrains Mono", sans-serif';
    ctx.fillText(english, w / 2, 185);
  });
}

/**
 * Shuto Expressway Transparent Acrylic Acoustic Noise Barrier Panels
 */
export function getNoiseBarrierPanelTexture(): THREE.CanvasTexture {
  return createProceduralTexture('acoustic_noise_barrier', 512, 512, (ctx, w, h) => {
    // Tinted green-teal translucent acoustic acrylic panel
    ctx.fillStyle = '#1c3832';
    ctx.fillRect(0, 0, w, h);

    // Structural steel perimeter frame
    ctx.strokeStyle = '#475350';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);

    // Anti-reflection horizontal grid lines (bird-strike prevention lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 3;
    for (let y = 32; y < h - 20; y += 36) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    // Sunset glass sheen highlight diagonal
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255, 210, 160, 0.25)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    sheen.addColorStop(1, 'rgba(255, 180, 110, 0.2)');
    ctx.fillStyle = sheen;
    ctx.fillRect(14, 14, w - 28, h - 28);
  });
}
