// Capa de disco 3D (frente = capa, verso = contracapa) e fita cassete.
import * as THREE from 'three';
import { coverTexture, canvas, toTex, handText, drawSpotifyMark } from './textures.js';
import { releaseYear } from '../util.js';

const SLEEVE = 0.31;
let spineTex;
function spine() {
  if (spineTex) return spineTex;
  const [c, g] = canvas(64, 512);
  g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, 64, 512);
  drawSpotifyMark(g, 32, 470, 34);
  return (spineTex = toTex(c));
}

/** Capa quadrada com espessura. size em metros. */
export function makeSleeve(album, size = SLEEVE) {
  const front = new THREE.MeshStandardMaterial({ map: coverTexture(album.cover), roughness: 0.6 });
  const back = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 });
  const edge = new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.8 });
  const edgeLogo = new THREE.MeshStandardMaterial({ map: spine(), roughness: 0.8 });
  // ordem BoxGeometry: +x, -x, +y, -y, +z(frente), -z(verso)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size * 0.02), [edgeLogo, edge, edge, edge, front, back]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.album = album;
  mesh.userData.mats = { front, back };
  return mesh;
}

/** Fita cassete vista de cima, com fita adesiva escrita à caneta. */
export function makeCassette(album, accent = '#333') {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.016, 0.064), shellMat);
  body.castShadow = true;
  g.add(body);
  const [c, ctx] = canvas(512, 330);
  ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, 512, 330);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  for (let y = 0; y < 330; y += 6) ctx.fillRect(0, y, 512, 1);
  // janelinha dos carretéis
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(110, 170, 292, 90);
  ctx.fillStyle = '#7a5b3a';
  [180, 332].forEach((x) => { ctx.beginPath(); ctx.arc(x, 215, 34, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#ddd';
  [180, 332].forEach((x) => { ctx.beginPath(); ctx.arc(x, 215, 12, 0, Math.PI * 2); ctx.fill(); });
  // fita adesiva
  ctx.save(); ctx.translate(256, 80); ctx.rotate(-0.025);
  ctx.fillStyle = 'rgba(245,238,200,.95)'; ctx.fillRect(-235, -50, 470, 100);
  ctx.fillStyle = '#152a6b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let s = 50; ctx.font = `700 ${s}px Caveat`;
  const title = album.name;
  while (ctx.measureText(title).width > 330 && s > 20) { s -= 2; ctx.font = `700 ${s}px Caveat`; }
  ctx.fillText(title, -40, -4);
  ctx.font = '700 44px Caveat'; ctx.fillText(releaseYear(album.release), 185, -4);
  ctx.restore();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.094, 0.06), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: 0.8 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.0082;
  g.add(top);
  g.userData.album = album;
  g.userData.shell = shellMat;
  g.userData.label = top.material;
  return g;
}

/** Plaquinha (fita) com texto à mão. */
export function tapeLabel(text, w = 0.2, h = 0.05, opts = {}) {
  const tex = toTex(handText(text, { w: 1024, h: 256, size: 150, color: opts.color || '#151515', bg: opts.bg || 'rgba(245,238,205,.95)', font: opts.font || 'Caveat' }));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 }));
}
