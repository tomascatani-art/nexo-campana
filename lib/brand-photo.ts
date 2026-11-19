'use client';
/**
 * Foto de producto "con marca", 100% en el navegador (gratis, sin servicios externos):
 *  1. Recorta el fondo con el modelo U²-Net-p (Apache 2.0, 4,5 MB) usando onnxruntime-web (MIT).
 *  2. Pone el producto sobre un fondo NEXO (negro y dorado, o claro) con el logo.
 * Los archivos se sirven desde /public (vendor/ort y models), así funciona también sin internet externo.
 */

export type BrandStyle = 'oscuro' | 'claro';
export type Brand = { name: string; tagline: string | null; logoUrl: string | null };

type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: 'float32', data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create: (url: string, o: object) => Promise<{ inputNames: string[]; run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>> }> };
};

let ortPromise: Promise<Ort> | null = null;
function loadOrt(): Promise<Ort> {
  const w = window as unknown as { ort?: Ort };
  if (w.ort) return Promise.resolve(w.ort);
  ortPromise ??= new Promise<Ort>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/ort/ort.wasm.min.js';
    s.async = true;
    s.onload = () => {
      const ort = (window as unknown as { ort: Ort }).ort;
      ort.env.wasm.wasmPaths = '/vendor/ort/';
      ort.env.wasm.numThreads = 1;
      resolve(ort);
    };
    s.onerror = () => { ortPromise = null; reject(new Error('No se pudo cargar el recortador de fondo.')); };
    document.head.appendChild(s);
  });
  return ortPromise;
}

let sessionPromise: ReturnType<Ort['InferenceSession']['create']> | null = null;
async function session() {
  const ort = await loadOrt();
  sessionPromise ??= ort.InferenceSession.create('/models/u2netp.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  try { return { ort, s: await sessionPromise }; } catch (e) { sessionPromise = null; throw e; }
}

/** Empieza a descargar el modelo antes de que el dueño elija la foto. */
export function warmUpBackgroundRemoval() { session().catch(() => {}); }

const SIZE = 320;

export async function loadBitmap(file: Blob, max = 1600): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/** Devuelve la foto recortada (fondo transparente), ajustada al contorno del producto. */
export async function cutOut(src: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const { ort, s } = await session();
  const small = document.createElement('canvas');
  small.width = SIZE; small.height = SIZE;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(src, 0, 0, SIZE, SIZE);
  const px = sctx.getImageData(0, 0, SIZE, SIZE).data;
  let max = 1;
  for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2]);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    for (let c = 0; c < 3; c++) input[c * SIZE * SIZE + p] = (px[i + c] / max - mean[c]) / std[c];
  }
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
  const pred = Object.values(out)[0].data;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < SIZE * SIZE; i++) { lo = Math.min(lo, pred[i]); hi = Math.max(hi, pred[i]); }
  const mask = sctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = (pred[i] - lo) / (hi - lo || 1);
    const a = Math.max(0, Math.min(1, (v - 0.12) / 0.66)); // bordes más definidos
    mask.data[i * 4 + 3] = Math.round(a * 255);
  }
  sctx.putImageData(mask, 0, 0);

  // Máscara al tamaño real + aplicar como transparencia
  const W = src.width, H = src.height;
  const out2 = document.createElement('canvas');
  out2.width = W; out2.height = H;
  const o = out2.getContext('2d', { willReadFrequently: true })!;
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, 0, 0, W, H);
  o.globalCompositeOperation = 'source-in';
  o.drawImage(src, 0, 0);
  o.globalCompositeOperation = 'source-over';

  // Recorte al contorno del producto (con un pequeño margen)
  const a = o.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (a[(y * W + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < W * H * 0.02) throw new Error('No encontramos el producto en la foto. Probá con más luz o más cerca.');
  const pad = Math.round(Math.max(W, H) * 0.01);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  const crop = document.createElement('canvas');
  crop.width = x1 - x0; crop.height = y1 - y0;
  crop.getContext('2d')!.drawImage(out2, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return crop;
}

const MONOGRAM = (ring: string, bg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="${bg}"/><circle cx="32" cy="32" r="28.5" fill="none" stroke="${ring}" stroke-width="2"/><path d="M19 46V18h8l11 16V18h7v28h-8L26 30v16z" fill="${ring}"/></svg>`)}`;

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function displayFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-montserrat').trim();
  return v || 'Montserrat, Arial, sans-serif';
}

/** Arma la foto final 1200×1200 con fondo de marca y logo. */
export async function compose(cut: HTMLCanvasElement, style: BrandStyle, brand: Brand): Promise<HTMLCanvasElement> {
  const S = 1200;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d')!;
  const dark = style === 'oscuro';
  const gold = '#f2c230';
  const font = displayFont();
  try { await document.fonts.load(`900 40px ${font}`); } catch { /* */ }

  // Fondo
  const lin = g.createLinearGradient(0, 0, 0, S);
  if (dark) { lin.addColorStop(0, '#141414'); lin.addColorStop(1, '#050505'); } else { lin.addColorStop(0, '#ffffff'); lin.addColorStop(1, '#efebe2'); }
  g.fillStyle = lin; g.fillRect(0, 0, S, S);
  const spot = g.createRadialGradient(S / 2, S * 0.5, 40, S / 2, S * 0.52, S * 0.62);
  if (dark) { spot.addColorStop(0, 'rgba(255,236,190,0.30)'); spot.addColorStop(0.45, 'rgba(242,194,48,0.10)'); spot.addColorStop(1, 'rgba(0,0,0,0)'); }
  else { spot.addColorStop(0, 'rgba(255,255,255,1)'); spot.addColorStop(1, 'rgba(242,194,48,0.06)'); }
  g.fillStyle = spot; g.fillRect(0, 0, S, S);
  // Arcos dorados decorativos
  g.save();
  g.strokeStyle = dark ? 'rgba(242,194,48,0.22)' : 'rgba(184,134,11,0.22)';
  g.lineWidth = 3;
  g.beginPath(); g.arc(S * 0.5, S * 0.56, S * 0.43, Math.PI * 0.85, Math.PI * 2.15); g.stroke();
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(S * 0.5, S * 0.56, S * 0.47, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
  g.restore();
  // Marco
  g.strokeStyle = dark ? 'rgba(242,194,48,0.55)' : 'rgba(184,134,11,0.45)';
  g.lineWidth = 4;
  g.strokeRect(28, 28, S - 56, S - 56);

  // Producto
  const boxW = S * 0.78, boxH = S * 0.62, cx = S / 2, baseY = S * 0.86;
  const k = Math.min(boxW / cut.width, boxH / cut.height);
  const w = cut.width * k, h = cut.height * k;
  const x = cx - w / 2, y = baseY - h;
  const sh = g.createRadialGradient(cx, baseY, 10, cx, baseY, w * 0.55);
  sh.addColorStop(0, dark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.translate(0, baseY); g.scale(1, 0.12); g.translate(0, -baseY);
  g.fillStyle = sh; g.beginPath(); g.arc(cx, baseY, w * 0.55, 0, Math.PI * 2); g.fill(); g.restore();
  g.save();
  if (dark) { g.shadowColor = 'rgba(242,194,48,0.18)'; g.shadowBlur = 50; }
  g.drawImage(cut, x, y, w, h);
  g.restore();

  // Logo + nombre
  const logo = await loadImg(brand.logoUrl ?? MONOGRAM(gold, '#0b0b0c')).catch(() => loadImg(MONOGRAM(gold, '#0b0b0c')));
  const L = 112;
  const lk = Math.min(L / logo.width, L / logo.height);
  g.drawImage(logo, 64, 64, logo.width * lk, logo.height * lk);
  if (!brand.logoUrl) {
    const [first, ...rest] = brand.name.split(' ');
    g.fillStyle = dark ? '#ffffff' : '#0b0b0c';
    g.font = `900 54px ${font}`; g.textBaseline = 'alphabetic';
    g.fillText(first.toUpperCase(), 64 + L + 22, 64 + 62);
    g.fillStyle = dark ? gold : '#9a7408';
    g.font = `800 22px ${font}`;
    spaced(g, (rest.join(' ') || '').toUpperCase(), 64 + L + 24, 64 + 98, 7);
  }
  if (brand.tagline) {
    g.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(11,11,12,0.55)';
    g.font = `700 22px ${font}`;
    const t = brand.tagline.toUpperCase();
    const tw = measureSpaced(g, t, 5);
    spaced(g, t, S / 2 - tw / 2, S - 62, 5);
  }
  return c;
}

function measureSpaced(g: CanvasRenderingContext2D, t: string, sp: number) { return [...t].reduce((a, ch) => a + g.measureText(ch).width + sp, -sp); }
function spaced(g: CanvasRenderingContext2D, t: string, x: number, y: number, sp: number) {
  for (const ch of t) { g.fillText(ch, x, y); x += g.measureText(ch).width + sp; }
}

export function toJpeg(c: HTMLCanvasElement, q = 0.9) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la imagen.'))), 'image/jpeg', q));
}
