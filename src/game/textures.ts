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
