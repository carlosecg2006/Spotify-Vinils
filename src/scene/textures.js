// Texturas procedurais (canvas): madeira, papelão, papel, vinil, contracapa…
import * as THREE from 'three';
import { rng, shade, luminance } from '../util.js';
import { loadImage } from '../services/colors.js';

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');
const texCache = new Map();

export function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function toTex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Textura de uma capa (URL ou dataURL), com cache. */
export function coverTexture(url) {
  if (!url) return fallbackCover();
  if (texCache.has(url)) return texCache.get(url);
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(url, t);
  return t;
}

let _fallback;
function fallbackCover() {
  if (_fallback) return _fallback;
  const [c, g] = canvas(256);
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#1db954'); grad.addColorStop(1, '#0a2a17');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  drawVinylIcon(g, 128, 128, 70);
  return (_fallback = toTex(c));
}

function drawVinylIcon(g, x, y, r) {
  g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)';
  for (let i = r * 0.4; i < r; i += 5) { g.beginPath(); g.arc(x, y, i, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = '#1db954'; g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill();
}

export function wood(base = '#5a3a22', seed = 7, w = 512, h = 512) {
  const r = rng(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    const y = r() * h;
    g.strokeStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,220,180'},${0.03 + r() * 0.08})`;
    g.lineWidth = 1 + r() * 3;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6 + (r() - 0.5) * 3);
    g.stroke();
  }
  for (let k = 0; k < 3; k++) {
    const x = r() * w, y = r() * h;
    for (let i = 1; i < 10; i++) {
      g.strokeStyle = `rgba(30,15,5,${0.12 - i * 0.01})`;
      g.beginPath(); g.ellipse(x, y, i * 8, i * 3, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  return c;
}

export function cardboard(seed = 3, w = 512, h = 512, base = '#b48a5a') {
  const r = rng(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '60,40,20' : '230,200,160'},${r() * 0.08})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
  }
  g.strokeStyle = 'rgba(80,55,30,.15)';
  for (let x = 0; x < w; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  return c;
}

export function paperCanvas(w, h, seed = 11, crumple = true) {
  const r = rng(seed);
  const [c, g] = canvas(w, h);
  g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, w, h);
  if (crumple) {
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI;
      const grad = g.createLinearGradient(x, y, x + Math.cos(a) * 120, y + Math.sin(a) * 120);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.5, 'rgba(90,70,40,.10)'); grad.addColorStop(0.52, 'rgba(255,255,255,.25)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(x - 120, y - 120, 240, 240);
    }
  }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 1, 1); }
  return [c, g];
}

/** Rótulo + sulcos do vinil. style: classic | marble | splatter | clear | color */
export function vinylCanvas(labelImg, style = 'classic', tint = '#1db954', seed = 5) {
  const S = 1024, C = S / 2;
  const r = rng(seed);
  const [c, g] = canvas(S);
  const base = { classic: '#0c0c0c', marble: tint, splatter: '#f2efe8', clear: 'rgba(30,30,30,.55)', color: tint }[style] || '#0c0c0c';
  g.fillStyle = base; g.beginPath(); g.arc(C, C, C, 0, Math.PI * 2); g.fill();
  if (style === 'marble') {
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.08 + r() * 0.12})`;
      g.lineWidth = 6 + r() * 30;
      g.beginPath(); g.arc(C + (r() - 0.5) * 300, C + (r() - 0.5) * 300, 100 + r() * 400, r() * 6, r() * 6 + 2); g.stroke();
    }
  }
  if (style === 'splatter') {
    for (let i = 0; i < 160; i++) {
      g.fillStyle = r() < 0.7 ? '#111' : tint;
      g.beginPath(); g.arc(r() * S, r() * S, 2 + r() * 14, 0, Math.PI * 2); g.fill();
    }
  }
  // sulcos
  for (let rad = C * 0.36; rad < C * 0.98; rad += 2.2) {
    g.strokeStyle = `rgba(255,255,255,${0.025 + r() * 0.03})`; g.lineWidth = 1;
    g.beginPath(); g.arc(C, C, rad, 0, Math.PI * 2); g.stroke();
  }
  // brilho anisotrópico
  const sheen = g.createConicGradient(0, C, C);
  sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.12, 'rgba(255,255,255,.10)');
  sheen.addColorStop(0.25, 'rgba(255,255,255,0)'); sheen.addColorStop(0.62, 'rgba(255,255,255,.08)');
  sheen.addColorStop(0.75, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sheen; g.beginPath(); g.arc(C, C, C, 0, Math.PI * 2); g.fill();
  // rótulo
  g.save(); g.beginPath(); g.arc(C, C, C * 0.33, 0, Math.PI * 2); g.clip();
  if (labelImg) g.drawImage(labelImg, C - C * 0.33, C - C * 0.33, C * 0.66, C * 0.66);
  else { g.fillStyle = tint; g.fillRect(0, 0, S, S); }
  g.restore();
  g.fillStyle = '#222'; g.beginPath(); g.arc(C, C, 10, 0, Math.PI * 2); g.fill();
  return c;
}

export async function vinylTexture(album, style, tint) {
  let img = null;
  if (album?.cover) { try { img = await loadImage(album.cover); } catch { /* sem capa */ } }
  return toTex(vinylCanvas(img, style, tint, album ? album.name.length : 5));
}

/** Logo de atribuição (círculo com três ondas). */
export function drawSpotifyMark(g, x, y, size, color = '#1db954') {
  g.save();
  g.fillStyle = color; g.beginPath(); g.arc(x, y, size / 2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#000'; g.lineCap = 'round';
  [[0.32, 0.11, -0.2], [0.25, 0.085, 0.02], [0.18, 0.065, 0.22]].forEach(([w, lw, dy]) => {
    g.lineWidth = size * lw;
    g.beginPath();
    g.ellipse(x, y + size * dy + size * 0.18, size * w, size * 0.18, 0, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  });
  g.restore();
}

/**
 * Contracapa gerada: cor central da capa com degradê sutil + títulos.
 * Retorna { canvas, hit: [{y0,y1,index}] } (coordenadas normalizadas 0..1, origem embaixo).
 */
export function generatedBack(album, base = '#333') {
  const S = 1024;
  const [c, g] = canvas(S);
  const grad = g.createRadialGradient(S * 0.35, S * 0.3, S * 0.1, S / 2, S / 2, S * 0.8);
  grad.addColorStop(0, shade(base, 28)); grad.addColorStop(0.6, base); grad.addColorStop(1, shade(base, -38));
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  const light = luminance(base) > 0.6;
  const ink = light ? '#151515' : '#f5f5f5';
  g.fillStyle = ink;
  g.font = '700 46px Inter, sans-serif'; g.fillText(album.name.slice(0, 34), 70, 120);
  g.globalAlpha = 0.7; g.font = '500 30px Inter, sans-serif';
  g.fillText(album.artists?.map((a) => a.name).join(', ') || '', 70, 165);
  g.globalAlpha = 1;
  const tracks = album.tracks || [];
  const hit = [];
  const half = Math.ceil(tracks.length / 2);
  const twoSides = tracks.length > 6;
  const lineH = Math.min(52, 640 / Math.max(1, twoSides ? half : tracks.length));
  g.font = `500 ${Math.round(lineH * 0.55)}px Inter, sans-serif`;
  tracks.forEach((t, i) => {
    const side = twoSides && i >= half ? 1 : 0;
    const row = side ? i - half : i;
    const x = 70 + side * 470;
    const y = 250 + row * lineH;
    if (twoSides && row === 0) {
      g.globalAlpha = 0.55; g.font = '700 24px Inter'; g.fillText(side ? 'LADO B' : 'LADO A', x, y - 30); g.globalAlpha = 1;
      g.font = `500 ${Math.round(lineH * 0.55)}px Inter, sans-serif`;
    }
    g.fillText(`${t.number || i + 1}. ${t.name}`.slice(0, 30), x, y + lineH * 0.5);
    hit.push({ x0: x / S, x1: (x + 440) / S, y0: 1 - (y + lineH * 0.7) / S, y1: 1 - (y - lineH * 0.15) / S, index: i });
  });
  g.globalAlpha = 0.6; g.font = '500 22px Inter'; g.fillText((album.release || '').slice(0, 4), 70, S - 60); g.globalAlpha = 1;
  drawSpotifyMark(g, S - 90, S - 80, 56);
  return { canvas: c, hit };
}

/** Contracapa real (imagem) com a marquinha de atribuição no canto. */
export async function realBack(url) {
  const img = await loadImage(url);
  const [c, g] = canvas(1024);
  g.drawImage(img, 0, 0, 1024, 1024);
  drawSpotifyMark(g, 1024 - 70, 1024 - 70, 48);
  return c;
}

/** Texto “à mão”: caneta, lápis ou marcador. */
export function handText(text, { w = 512, h = 128, font = 'Caveat', size = 64, color = '#1b1b1b', bg = null, align = 'center', weight = 700 } = {}) {
  const [c, g] = canvas(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  let s = size;
  g.font = `${weight} ${s}px "${font}", cursive`;
  while (g.measureText(text).width > w * 0.92 && s > 12) { s -= 2; g.font = `${weight} ${s}px "${font}", cursive`; }
  g.fillText(text, align === 'center' ? w / 2 : 12, h / 2);
  return c;
}
