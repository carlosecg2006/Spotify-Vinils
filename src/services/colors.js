// Extrai 3 cores centrais de uma capa (k-means simples no navegador).
import { rgbToHex } from '../util.js';

const cache = new Map();

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function paletteFrom(src) {
  if (!src) return ['#1db954', '#0b3d22', '#121212'];
  if (cache.has(src)) return cache.get(src);
  try {
    const img = await loadImage(src);
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
    let centers = [px[0], px[Math.floor(px.length / 2)], px[px.length - 1], px[300], px[1500]];
    let groups;
    for (let it = 0; it < 8; it++) {
      groups = centers.map(() => []);
      for (const p of px) {
        let best = 0, bd = Infinity;
        centers.forEach((c2, k) => { const dd = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2; if (dd < bd) { bd = dd; best = k; } });
        groups[best].push(p);
      }
      centers = groups.map((gr, k) => gr.length ? [0, 1, 2].map((ch) => gr.reduce((s, p) => s + p[ch], 0) / gr.length) : centers[k]);
    }
    // ordena por "presença × saturação" para pegar cores vivas e centrais
    const sat = ([r, g2, b]) => (Math.max(r, g2, b) - Math.min(r, g2, b)) / 255;
    const ranked = centers.map((c2, k) => ({ c: c2, w: groups[k].length * (0.35 + sat(c2)) }))
      .sort((a, b) => b.w - a.w).slice(0, 3).map((x) => rgbToHex(x.c));
    cache.set(src, ranked);
    return ranked;
  } catch {
    return ['#1db954', '#0b3d22', '#121212'];
  }
}

/** Cor média do centro da capa (para contracapas geradas). */
export async function centerColor(src) {
  try {
    const img = await loadImage(src);
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, img.width * 0.3, img.height * 0.3, img.width * 0.4, img.height * 0.4, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return rgbToHex([r / n, gg / n, b / n]);
  } catch { return '#2a2a2a'; }
}
