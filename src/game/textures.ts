import * as THREE from 'three';

// Cache generated textures to avoid redundant work and memory leaks
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * 4x4 Bayer Dither Matrix for retro 90s pixel-art ordered dithering
 */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Creates procedural textures with NearestFilter to preserve crisp, charming retro-arcade pixel-art dots
 */
function createProceduralTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  useNearest = true
): THREE.CanvasTexture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Disable browser smoothing for crisp pixel aesthetics
  ctx.imageSmoothingEnabled = false;

  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;

  if (useNearest) {
    texture.minFilter = THREE.NearestMipmapLinearFilter;
    texture.magFilter = THREE.NearestFilter;
  } else {
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }

  textureCache.set(key, texture);
  return texture;
}

/**
 * Retro-arcade pixelated asphalt road surface texture.
 * Features:
 * - 90s arcade styled 2x2/3x3 pixel aggregate grain
 * - Dithered tire path ruts with warm sunset sheen
 * - Pixelated center lane oil drips & engine soot
 * - Stepped pixel tar crack repair seams
 */
export function getRoadAsphaltTexture(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const map = createProceduralTexture('road_asphalt_diffuse_pixel', 512, 512, (ctx, w, h) => {
    // Base dark weathered charcoal asphalt
    ctx.fillStyle = '#22201d';
    ctx.fillRect(0, 0, w, h);

    // Multi-layered pixel aggregate grain (ordered Bayer dithering + pixel noise)
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const pxSize = 2;

    for (let y = 0; y < h; y += pxSize) {
      for (let x = 0; x < w; x += pxSize) {
        const bayerVal = (BAYER_4X4[(y / pxSize) % 4][(x / pxSize) % 4] / 16.0 - 0.5) * 28;
        const noise = (Math.random() - 0.5) * 22;
        const total = bayerVal + noise;

        for (let dy = 0; dy < pxSize; dy++) {
          for (let dx = 0; dx < pxSize; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            data[idx] = Math.min(255, Math.max(0, data[idx] + total + 3));       // R warm
            data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + total));   // G
            data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + total - 3)); // B
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Dithered Tire tracks (two worn, smoother, slightly darker ruts per lane side)
    const ruts = [w * 0.22, w * 0.38, w * 0.62, w * 0.78];
    ruts.forEach((rx) => {
      for (let x = rx - 48; x <= rx + 48; x += 2) {
        const dist = Math.abs(x - rx) / 48;
        const alpha = Math.max(0, 1 - dist) * 0.45;
        ctx.fillStyle = `rgba(14, 12, 11, ${alpha})`;
        for (let y = 0; y < h; y += 4) {
          if ((x / 2 + y / 4) % 2 === 0) {
            ctx.fillRect(x, y, 2, 4);
          }
        }
      }
    });

    // Center lane oil stains with pixel dot clusters
    [w * 0.3, w * 0.7].forEach((cx) => {
      for (let y = 0; y < h; y += 48 + Math.random() * 64) {
        const spotR = 10 + Math.random() * 16;
        const sx = cx + (Math.random() - 0.5) * 24;
        ctx.fillStyle = 'rgba(10, 9, 8, 0.4)';
        for (let ox = -spotR; ox <= spotR; ox += 2) {
          for (let oy = -spotR * 1.5; oy <= spotR * 1.5; oy += 2) {
            if ((ox * ox) / (spotR * spotR) + (oy * oy) / (spotR * spotR * 2.25) <= 1) {
              if (Math.random() < 0.75) {
                ctx.fillRect(sx + ox, y + oy, 2, 2);
              }
            }
          }
        }
      }
    });

    // Stepped pixel tar crack repair seams (black pixel snake lines)
    ctx.fillStyle = 'rgba(12, 10, 9, 0.9)';
    for (let c = 0; c < 3; c++) {
      let curX = Math.random() * w;
      let curY = Math.random() * h;
      for (let step = 0; step < 60; step++) {
        curX += (Math.random() - 0.48) * 4;
        curY += (Math.random() - 0.35) * 4;
        ctx.fillRect(Math.floor(curX / 2) * 2, Math.floor(curY / 2) * 2, 2, 2);
      }
    }
  });

  const roughnessMap = createProceduralTexture('road_asphalt_roughness_pixel', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b0a89e';
    ctx.fillRect(0, 0, w, h);

    const ruts = [w * 0.22, w * 0.38, w * 0.62, w * 0.78];
    ruts.forEach((rx) => {
      for (let x = rx - 32; x <= rx + 32; x += 2) {
        const dist = Math.abs(x - rx) / 32;
        const alpha = Math.max(0, 1 - dist) * 0.35;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(x, 0, 2, h);
      }
    });
  });

  return { map, roughnessMap };
}

/**
 * Concrete texture with retro pixel formwork seams and pixel tie holes.
 */
export function getConcreteTexture(): THREE.CanvasTexture {
  return createProceduralTexture('concrete_weathered_pixel', 256, 256, (ctx, w, h) => {
    // Warm retro concrete grey
    ctx.fillStyle = '#7a746c';
    ctx.fillRect(0, 0, w, h);

    // Pixel dithering speckles
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const b = (BAYER_4X4[(y / 2) % 4][(x / 2) % 4] / 16.0 - 0.5) * 24;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            data[idx] = Math.min(255, Math.max(0, data[idx] + b + 2));
            data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + b));
            data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + b - 2));
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Pixel formwork panel seams
    ctx.fillStyle = '#423d37';
    ctx.fillRect(0, Math.floor(h / 2), w, 2);
    ctx.fillRect(Math.floor(w / 2), 0, 2, h);

    // Pixel tie holes
    const holes = [
      [w * 0.25, h * 0.25],
      [w * 0.75, h * 0.25],
      [w * 0.25, h * 0.75],
      [w * 0.75, h * 0.75],
    ];
    holes.forEach(([hx, hy]) => {
      ctx.fillStyle = '#221f1b';
      ctx.fillRect(hx - 2, hy - 2, 4, 4);

      // Rain runoff streak
      ctx.fillStyle = 'rgba(40, 36, 32, 0.45)';
      ctx.fillRect(hx - 1, hy + 2, 2, 16);
    });
  });
}

/**
 * Modern High-Rise Glass Curtain Wall Facade - 16-Bit Retro Dot Pixel Style.
 * Features:
 * - Glowing pixel window grids (warm late-worker amber, cool CRT blue, sunset reflections)
 * - Dithered window shades / blinds
 * - Crisp dark pixel mullions
 */
export function getModernOfficeFacadeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('facade_modern_office_pixel', 256, 512, (ctx, w, h) => {
    // Base dark reflective spandrel glass
    ctx.fillStyle = '#1e1c1b';
    ctx.fillRect(0, 0, w, h);

    const cols = 8;
    const rows = 24;
    const colW = w / cols;
    const rowH = h / rows;
    const mullion = 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * colW + mullion;
        const y = r * rowH + mullion;
        const pw = colW - mullion * 2;
        const ph = rowH - mullion * 2;

        const rand = Math.random();

        if (rand < 0.32) {
          // Warm glowing office window (8-bit amber/gold dither)
          const isHot = Math.random() < 0.65;
          ctx.fillStyle = isHot ? '#ffc87a' : '#ffa044';
          ctx.fillRect(x, y, pw, ph);

          // Pixel horizontal blinds
          if (Math.random() < 0.55) {
            const blindH = Math.floor((ph * (0.3 + Math.random() * 0.4)) / 2) * 2;
            ctx.fillStyle = '#4a321d';
            for (let by = 0; by < blindH; by += 2) {
              ctx.fillRect(x, y + by, pw, 1);
            }
          }

          // Desk silhouette or worker silhouette in pixel
          if (Math.random() < 0.4) {
            ctx.fillStyle = '#261b11';
            ctx.fillRect(x + pw * 0.3, y + ph * 0.55, pw * 0.4, ph * 0.45);
          }
        } else if (rand < 0.46) {
          // Cool monitor / fluorescent glow (cyberpunk cyan/blue CRT)
          ctx.fillStyle = '#7ac0e6';
          ctx.fillRect(x, y, pw, ph);

          // Partial screen dither
          ctx.fillStyle = '#2b4d66';
          for (let py = 0; py < ph; py += 2) {
            ctx.fillRect(x, y + py, pw, 1);
          }
        } else if (rand < 0.68) {
          // Sunset reflection pane (dithered warm copper / sunset rose)
          ctx.fillStyle = '#c76e3c';
          ctx.fillRect(x, y, pw, ph);
          ctx.fillStyle = '#e89458';
          for (let py = 0; py < ph / 2; py += 2) {
            ctx.fillRect(x, y + py, pw, 1);
          }
        } else {
          // Dark unlit office pane with subtle night sky reflection
          ctx.fillStyle = '#161517';
          ctx.fillRect(x, y, pw, ph);
        }
      }
    }

    // Grid mullions (crisp dark pixel framework)
    ctx.fillStyle = '#36302c';
    for (let c = 0; c <= cols; c++) {
      ctx.fillRect(c * colW - 1, 0, 2, h);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.fillRect(0, r * rowH - 1, w, 2);
    }
  });
}

/**
 * Residential Apartment Complex Facade - Retro Pixel Art Style.
 * Features:
 * - Balcony indentations with pixel railings
 * - Warm dithered interior room lights and pixel sliding door screens
 * - Tiny pixel laundry / AC units on balconies
 */
export function getApartmentFacadeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('facade_apartment_pixel', 256, 512, (ctx, w, h) => {
    // Warm retro concrete beige
    ctx.fillStyle = '#524b43';
    ctx.fillRect(0, 0, w, h);

    const cols = 6;
    const rows = 16;
    const colW = w / cols;
    const rowH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * colW + 4;
        const y = r * rowH + 4;
        const bw = colW - 8;
        const bh = rowH - 8;

        // Balcony recess shadow (dark pixel box)
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(x, y, bw, bh);

        // Living room sliding glass door
        const doorW = bw - 4;
        const doorH = bh * 0.7;
        const doorX = x + 2;
        const doorY = y + 1;

        const isLit = Math.random() < 0.48;
        if (isLit) {
          const isWarm = Math.random() < 0.8;
          ctx.fillStyle = isWarm ? '#ffc875' : '#8ac8e6';
          ctx.fillRect(doorX, doorY, doorW, doorH);

          // Pixel curtain shade
          ctx.fillStyle = '#422f1d';
          ctx.fillRect(doorX, doorY, Math.floor(doorW * 0.35), doorH);
        } else {
          ctx.fillStyle = '#121110';
          ctx.fillRect(doorX, doorY, doorW, doorH);
        }

        // Balcony safety railing (horizontal + vertical pixel slats)
        ctx.fillStyle = '#2f2b27';
        ctx.fillRect(x, y + bh * 0.6, bw, bh * 0.4);

        // Railing highlight line
        ctx.fillStyle = '#6e6359';
        ctx.fillRect(x, y + bh * 0.6, bw, 2);

        // Occasional pixel laundry or balcony plant
        if (Math.random() < 0.35) {
          ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#3388ff';
          ctx.fillRect(x + 4, y + bh * 0.45, 6, 4);
        }
      }
    }
  });
}

/**
 * Industrial Warehouse / Factory Facade - Retro Pixel Art Style.
 * Features:
 * - Corrugated sheet metal with vertical 2-pixel stripe banding
 * - Pixel roll-up shutter bay doors
 * - Yellow / black diagonal hazard warning stripe band
 */
export function getIndustrialFacadeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('facade_industrial_pixel', 256, 512, (ctx, w, h) => {
    // Base oxidized weathered industrial slate
    ctx.fillStyle = '#47423c';
    ctx.fillRect(0, 0, w, h);

    // Corrugated vertical pixel stripes
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = '#38332e';
      ctx.fillRect(x, 0, 2, h);
      ctx.fillStyle = '#59534c';
      ctx.fillRect(x + 2, 0, 2, h);
    }

    // Roll-up overhead warehouse door bays
    const bays = 3;
    const bayW = w / bays;
    for (let b = 0; b < bays; b++) {
      const bx = b * bayW + 8;
      const bw = bayW - 16;
      const by = h - 140;
      const bh = 130;

      // Dark frame
      ctx.fillStyle = '#1c1b1a';
      ctx.fillRect(bx, by, bw, bh);

      // Slat stripes
      for (let sy = by + 2; sy < by + bh; sy += 6) {
        ctx.fillStyle = '#5e5852';
        ctx.fillRect(bx + 2, sy, bw - 4, 3);
        ctx.fillStyle = '#2b2825';
        ctx.fillRect(bx + 2, sy + 3, bw - 4, 3);
      }

      // Yellow/Black diagonal pixel caution hazard band above door
      for (let hx = bx; hx < bx + bw; hx += 8) {
        ctx.fillStyle = (hx / 8) % 2 === 0 ? '#ffb300' : '#1a1917';
        ctx.fillRect(hx, by - 12, 8, 10);
      }
    }
  });
}

/**
 * Authentic Japanese Expressway Overhead Directional Sign - 16-Bit Pixel Art Style.
 * Green signboard with pixel Kanji, Romanized text, and route shield.
 */
export function getHighwayOverheadSignTexture(
  kanjiDest: string,
  englishDest: string,
  routeNumber = '14'
): THREE.CanvasTexture {
  const key = `sign_overhead_pixel_${kanjiDest}_${englishDest}_${routeNumber}`;
  return createProceduralTexture(key, 512, 256, (ctx, w, h) => {
    // Iconic Japanese Expressway Green (#006837)
    ctx.fillStyle = '#005f33';
    ctx.fillRect(0, 0, w, h);

    // Crisp white double border with corner radius
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(8, 8, w - 16, 6);
    ctx.fillRect(8, h - 14, w - 16, 6);
    ctx.fillRect(8, 8, 6, h - 16);
    ctx.fillRect(w - 14, 8, 6, h - 16);

    // Route shield (Blue rounded shield with white border)
    const sx = 65;
    const sy = 85;
    ctx.fillStyle = '#0066cc';
    ctx.fillRect(sx - 36, sy - 40, 72, 80);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(sx - 36, sy - 40, 72, 80);

    // Route Number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(routeNumber, sx, sy - 2);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ROUTE', sx, sy + 25);

    // Destination Kanji (bold, crisp pixel rendering)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(kanjiDest, 125, 75);

    // English Destination Subtext
    ctx.fillStyle = '#f0ede6';
    ctx.font = 'bold 26px "JetBrains Mono", sans-serif';
    ctx.fillText(englishDest, 128, 140);

    // Bottom lane guidance arrows (white pixel arrows pointing down)
    const arrowY = 195;
    [w * 0.38, w * 0.72].forEach((ax) => {
      ctx.fillStyle = '#ffffff';
      // Arrow stem
      ctx.fillRect(ax - 6, arrowY - 25, 12, 22);
      // Arrow point
      ctx.beginPath();
      ctx.moveTo(ax - 20, arrowY - 5);
      ctx.lineTo(ax + 20, arrowY - 5);
      ctx.lineTo(ax, arrowY + 18);
      ctx.closePath();
      ctx.fill();
    });
  });
}

/**
 * Authentic Japanese Expressway LED Dot-Matrix Variable Message Sign (VMS).
 * Displays amber glowing LED pixels in dot-matrix grid format.
 */
export function getHighwayLedMatrixTexture(): THREE.CanvasTexture {
  return createProceduralTexture('sign_led_matrix_dots', 512, 128, (ctx, w, h) => {
    // Dark honeycomb LED enclosure
    ctx.fillStyle = '#0d0d0e';
    ctx.fillRect(0, 0, w, h);

    // Draw background unlit LED dot grid
    const dotStep = 6;
    const dotR = 2.0;
    ctx.fillStyle = '#1e1c18';
    for (let y = 10; y < h - 10; y += dotStep) {
      for (let x = 12; x < w - 12; x += dotStep) {
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glowing Amber LED Messages: "速度注意  DRIVE SAFELY"
    ctx.shadowColor = '#ff9800';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffaa00';

    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('速度注意 · DRIVE SAFELY', w / 2, 45);

    // Subtext: "夕暮れ時 追突注意 / SUNSET SPEED CHECK"
    ctx.font = 'bold 22px "JetBrains Mono", sans-serif';
    ctx.fillStyle = '#ffcc33';
    ctx.fillText('WANGAN LINE · SPEED CHECK', w / 2, 92);
  });
}

/**
 * Japanese Vending Machine (自動販売機) - Pixel Art Style.
 * Features:
 * - Illuminated brand header (Boss / Pocari vibe)
 * - Display shelves of pixel drink cans and bottles
 * - Red / blue illuminated hot/cold coin return buttons
 */
export function getVendingMachineTexture(): THREE.CanvasTexture {
  return createProceduralTexture('vending_machine_pixel', 256, 512, (ctx, w, h) => {
    // Vivid Japanese vending machine red/blue casing
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(0, 0, w, h);

    // Top illuminated marquee banner
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 16, w - 32, 60);
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(20, 20, w - 40, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BEVERAGE 24h', w / 2, 46);

    // Big glass display window
    ctx.fillStyle = '#121214';
    ctx.fillRect(16, 92, w - 32, 280);

    // 3 shelves of drink cans
    const shelves = [100, 190, 280];
    const canColors = ['#1565c0', '#2e7d32', '#c62828', '#f57f17', '#ffffff', '#424242', '#ad1457'];

    shelves.forEach((sy) => {
      // White shelf rack
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(20, sy + 64, w - 40, 4);

      // Row of cans
      const numCans = 8;
      const canW = 18;
      const canH = 38;
      const spacing = (w - 40 - numCans * canW) / (numCans - 1);

      for (let i = 0; i < numCans; i++) {
        const cx = 22 + i * (canW + spacing);
        const col = canColors[(i * 3 + Math.floor(sy / 50)) % canColors.length];

        // Drink can body
        ctx.fillStyle = col;
        ctx.fillRect(cx, sy + 18, canW, canH);

        // Can top rim
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(cx + 2, sy + 14, canW - 4, 4);

        // Hot (Red) or Cold (Blue) button underneath
        const isHot = i % 3 === 0;
        ctx.fillStyle = isHot ? '#ff1744' : '#00b0ff';
        ctx.fillRect(cx + 2, sy + 60, canW - 4, 6);
      }
    });

    // Lower payment & coin return panel
    ctx.fillStyle = '#212121';
    ctx.fillRect(16, 388, w - 32, 108);

    // Coin slot (illuminated green)
    ctx.fillStyle = '#00e676';
    ctx.fillRect(w - 60, 400, 24, 6);

    // Dispenser flap
    ctx.fillStyle = '#111112';
    ctx.fillRect(28, 420, w - 56, 64);
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 420, w - 56, 64);
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
  }, false);
}

/**
 * Cat's eye / retro-reflective pavement marker texture (Bott's dots)
 */
export function getPavementMarkerTexture(): THREE.CanvasTexture {
  return createProceduralTexture('pavement_marker_pixel', 32, 32, (ctx, w, h) => {
    ctx.fillStyle = '#e6cf93';
    ctx.fillRect(4, 4, 24, 24);

    // Center amber retroreflector lens
    ctx.fillStyle = '#ffaa11';
    ctx.fillRect(10, 10, 12, 12);
  });
}

/**
 * 2x2 Twill-Weave Carbon Fiber Texture for aerodynamic components (splitter, spoiler, diffuser, mirrors).
 */
export function getCarbonFiberTexture(): THREE.CanvasTexture {
  return createProceduralTexture('carbon_fiber_twill_pixel', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, w, h);

    const step = 8;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const isOffset = ((x / step + y / step) % 2) === 0;
        ctx.fillStyle = isOffset ? '#2b2c30' : '#111214';
        ctx.fillRect(x, y, step, step);
        ctx.fillStyle = isOffset ? '#1e1f23' : '#222328';
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      }
    }
  });
}

/**
 * Authentic Japanese Number Plate Texture (e.g. 品川 330 た 86-92) - Crisp Pixel Art Style.
 */
export function getJapaneseLicensePlateTexture(
  region = '品川',
  classNo = '330',
  kana = 'た',
  digits = '86-92'
): THREE.CanvasTexture {
  return createProceduralTexture(`license_plate_pixel_${region}_${digits}`, 256, 128, (ctx, w, h) => {
    // White background plate with stamped border
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, w, h);

    // Green embossed edge rim
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Left screw seal & right screw
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(36, 22, 10, 10);
    ctx.fillRect(w - 46, 22, 10, 10);

    // Top text: Region + Class number
    ctx.fillStyle = '#1b5e20';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${region} ${classNo}`, w / 2, 28);

    // Hiragana classification character
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(kana, 24, 82);

    // Main 4 digits with hyphen
    ctx.font = 'bold 48px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(digits, w / 2 + 18, 82);
  });
}

/**
 * Drilled brake rotor with friction track texture - Pixel Style
 */
export function getCarWheelRotorTexture(): THREE.CanvasTexture {
  return createProceduralTexture('wheel_brake_rotor_pixel', 256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, w, h);

    const outerR = w * 0.46;
    const innerR = w * 0.22;

    // Disc body
    ctx.fillStyle = '#8a8e96';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Inner hat
    ctx.fillStyle = '#222326';
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Spindle hole
    ctx.fillStyle = '#0e0e10';
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Rotor ventilation holes (pixel dots)
    ctx.fillStyle = '#101114';
    for (let s = 0; s < 12; s++) {
      const baseAngle = (s * Math.PI * 2) / 12;
      for (let step = 0; step < 3; step++) {
        const rad = innerR + 18 + step * 20;
        const curAngle = baseAngle + step * 0.15;
        const hx = Math.floor(cx + Math.cos(curAngle) * rad);
        const hy = Math.floor(cy + Math.sin(curAngle) * rad);
        ctx.fillRect(hx - 2, hy - 2, 4, 4);
      }
    }
  });
}

/**
 * Cockpit Gauge Cluster Texture
 */
export function getCarCockpitGaugeTexture(): THREE.CanvasTexture {
  return createProceduralTexture('cockpit_gauge_cluster_pixel', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, w, h);

    const leftCX = w * 0.3;
    const rightCX = w * 0.7;
    const cy = h * 0.52;
    const radius = h * 0.42;

    [leftCX, rightCX].forEach((centerCX) => {
      ctx.strokeStyle = '#4e545e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(centerCX, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#181a20';
      ctx.beginPath();
      ctx.arc(centerCX, cy, radius - 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Speedo marks
    ctx.fillStyle = '#ffaa33';
    ctx.font = 'bold 16px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('km/h', leftCX, cy + 30);
    ctx.fillText('RPM x1000', rightCX, cy + 30);
  });
}

/**
 * Center console display texture with Tokyo Bay Wangan map line
 */
export function getCarCenterConsoleTexture(): THREE.CanvasTexture {
  return createProceduralTexture('cockpit_center_console_pixel', 256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#141418';
    ctx.fillRect(0, 0, w, h);

    // Screen border
    ctx.strokeStyle = '#282b33';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, 240);

    // Map screen background
    ctx.fillStyle = '#0a1017';
    ctx.fillRect(14, 14, w - 28, 232);

    // Glowing Map Route Line (Tokyo Bay route)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(35, 210);
    ctx.quadraticCurveTo(80, 150, 120, 120);
    ctx.quadraticCurveTo(180, 80, 220, 40);
    ctx.stroke();

    // Digital Speed & Mode Readout
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 22px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BAY ROUTE B1', w / 2, 45);
  });
}

/**
 * Headlight internal projector lens & LED ribbon texture
 */
export function getHeadlightInternalTexture(): THREE.CanvasTexture {
  return createProceduralTexture('headlight_lens_pixel', 128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#111215';
    ctx.fillRect(0, 0, w, h);

    // Projector lens dots
    [35, 93].forEach((lx) => {
      ctx.fillStyle = '#fff4d6';
      ctx.fillRect(lx - 12, h / 2 - 12, 24, 24);
      ctx.fillStyle = '#ffaa33';
      ctx.fillRect(lx - 6, h / 2 - 6, 12, 12);
    });
  });
}

/**
 * Japanese Skyline Corporate Neon Signs on Steel Scaffolding - Retro Pixel Art Style
 */
export function getRooftopNeonSignTexture(
  kanji: string,
  english: string,
  neonColor = '#ff9800',
  subColor = '#00e5ff'
): THREE.CanvasTexture {
  return createProceduralTexture(`neon_sign_pixel_${kanji}_${english}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#161413';
    ctx.fillRect(0, 0, w, h);

    // Frame border
    ctx.strokeStyle = '#3a3430';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Neon glow effect (pixel shadow)
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kanji, w / 2, 48);

    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 2;
    ctx.strokeText(kanji, w / 2, 48);

    // English sub-branding
    ctx.shadowColor = subColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = subColor;
    ctx.font = 'bold 16px "JetBrains Mono", sans-serif';
    ctx.fillText(english, w / 2, 95);
  });
}

/**
 * Shuto Expressway Transparent Acrylic Acoustic Noise Barrier Panels - Retro Pixel Style
 */
export function getNoiseBarrierPanelTexture(): THREE.CanvasTexture {
  return createProceduralTexture('acoustic_noise_barrier_pixel', 256, 256, (ctx, w, h) => {
    // Tinted green-teal translucent acoustic acrylic panel
    ctx.fillStyle = '#1c3832';
    ctx.fillRect(0, 0, w, h);

    // Perimeter frame
    ctx.strokeStyle = '#475350';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Horizontal pixel grid lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    for (let y = 16; y < h - 10; y += 20) {
      ctx.fillRect(8, y, w - 16, 2);
    }
  });
}
