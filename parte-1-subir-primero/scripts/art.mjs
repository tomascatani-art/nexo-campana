// Genera imágenes de ejemplo (WebP) con la estética de la marca.
// Solo son contenido inicial: el propietario las reemplaza con fotos reales desde el panel.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const iconsDir = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');
const iconInner = (name) => readFileSync(path.join(iconsDir, `${name}.svg`), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const TINTS = ['#f4efe4', '#eceff3', '#f3ece6', '#e9efe9', '#efe9f1', '#f2f0e8'];

/** Foto "de estudio" de producto: fondo claro, objeto centrado, sombra. */
export async function makeProductArt({ size = 1000, icon, seed = 0 }) {
  const bg = TINTS[seed % TINTS.length];
  const s = size * 0.5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${bg}"/></radialGradient>
    <radialGradient id="sh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="ic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3a3a"/><stop offset="0.55" stop-color="#111"/><stop offset="1" stop-color="#c99a06"/></linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <ellipse cx="${size / 2}" cy="${size * 0.8}" rx="${size * 0.3}" ry="${size * 0.045}" fill="url(#sh)"/>
  <g transform="translate(${size / 2 - s / 2} ${size * 0.47 - s / 2}) scale(${s / 24})" fill="none" stroke="url(#ic)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${iconInner(icon)}</g>
</svg>`;
  const out = await sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}

/** Fondo oscuro con brillo dorado (portada / nosotros). */
export async function makeBrandArt({ w, h, icons = [] }) {
  const items = icons.map((ic, i) => {
    const s = Math.min(w, h) * (0.16 + (i % 3) * 0.05);
    const x = w * (0.52 + (i % 4) * 0.12) - s / 2;
    const y = h * (0.18 + Math.floor(i / 4) * 0.34 + (i % 2) * 0.12);
    return `<g transform="translate(${x} ${y}) scale(${s / 24})" fill="none" stroke="#f5c400" stroke-opacity="${0.18 + (i % 3) * 0.1}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${iconInner(ic)}</g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="g" cx="0.75" cy="0.35" r="0.7"><stop offset="0" stop-color="#f5c400" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#fff" stroke-opacity="0.035"/></pattern>
  </defs>
  <rect width="100%" height="100%" fill="#0b0b0c"/><rect width="100%" height="100%" fill="url(#grid)"/><rect width="100%" height="100%" fill="url(#g)"/>
  ${items}
</svg>`;
  const out = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}
