// Zoom no álbum: gira frente/verso, abre e tira o disco, títulos clicáveis na contracapa gerada.
import * as THREE from 'three';
import { world, interactive } from './world.js';
import { makeSleeve } from './sleeve.js';
import { generatedBack, realBack, toTex, vinylTexture } from './textures.js';
import { findBackCover } from '../services/backcover.js';
import { centerColor } from '../services/colors.js';
import { settings } from '../store.js';
import { ease, clamp } from '../util.js';

export const inspect = { root: null, sleeve: null, disc: null, album: null, hit: [], rotY: 0, rotX: 0, velY: 0, opened: false, discOnly: false, onTrack: null };

export function buildInspect() {
  const { scene } = world.overlay;
  scene.add(new THREE.AmbientLight('#ffffff', 0.7));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(1.5, 2, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#1db954', 0.8);
  rim.position.set(-2, -1, -2);
  scene.add(rim);
  const dim = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0, depthWrite: false }));
  dim.position.z = -3;
  dim.userData.blocker = true;
  scene.add(dim);
  inspect.dim = dim;
  const root = new THREE.Group();
  scene.add(root);
  inspect.root = root;

  let last = null;
  const dragHandlers = {
    cursor: 'grab',
    onDragStart: (h, e) => { last = { x: e.clientX, y: e.clientY }; inspect.velY = 0; },
    onDrag: (ray, e) => {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      inspect.rotY += dx * 0.01; inspect.rotX = clamp(inspect.rotX + dy * 0.006, -0.7, 0.7);
      inspect.velY = dx * 0.01;
    },
    onDragEnd: () => {
      // encaixa na frente ou no verso
      const snap = Math.round(inspect.rotY / Math.PI) * Math.PI;
      inspect.snapTo = snap + (Math.abs(inspect.velY) > 0.08 ? Math.sign(inspect.velY) * Math.PI : 0);
    },
  };
  inspect.dragHandlers = dragHandlers;

  world.onUpdate((dt) => {
    const o = world.overlay;
    o.fade += ((o.active ? 1 : 0) - o.fade) * Math.min(1, dt * 6);
    dim.material.opacity = o.fade * 0.72;
    root.visible = o.fade > 0.01;
    if (inspect.snapTo != null && !world.dragging) {
      inspect.rotY += (inspect.snapTo - inspect.rotY) * Math.min(1, dt * 7);
      inspect.rotX += (0 - inspect.rotX) * Math.min(1, dt * 5);
      if (Math.abs(inspect.snapTo - inspect.rotY) < 0.001) inspect.snapTo = null;
    }
    const target = inspect.discOnly ? inspect.disc : inspect.sleeve;
    if (inspect.sleeve) {
      inspect.sleeve.rotation.y = inspect.discOnly ? inspect.sleeve.rotation.y : inspect.rotY;
      inspect.sleeve.rotation.x = inspect.discOnly ? 0 : inspect.rotX;
    }
    if (inspect.disc && inspect.discOnly) {
      inspect.disc.rotation.y = inspect.rotY + Math.PI / 2;
      inspect.disc.rotation.z = inspect.rotX;
      inspect.disc.children[0].rotation.y += dt * 0.6;
    }
    root.position.y = Math.sin(world.time * 0.8) * 0.01;
    root.scale.setScalar(0.85 + o.fade * 0.15);
    void target;
  });
}

/** Mostra um álbum/playlist em destaque. Retorna quando estiver pronto. */
export async function showInspect(album, { onTrack } = {}) {
  closeInspect(true);
  inspect.album = album;
  inspect.onTrack = onTrack;
  inspect.rotY = 0; inspect.rotX = 0; inspect.snapTo = null;
  inspect.opened = false; inspect.discOnly = false;
  const sleeve = makeSleeve(album, 1);
  sleeve.position.x = -0.18;
  inspect.root.add(sleeve);
  inspect.sleeve = sleeve;
  interactive(sleeve, { ...inspect.dragHandlers, onClick: (h) => backClick(h) });
  world.overlay.active = true;

  // disco escondido dentro da capa
  const discGrp = new THREE.Group();
  const discMat = new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0.3, clearcoat: 0.8, transparent: true });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.008, 96), [new THREE.MeshStandardMaterial({ color: '#0a0a0a' }), discMat, discMat]);
  discGrp.add(disc);
  discGrp.rotation.z = Math.PI / 2; discGrp.rotation.y = Math.PI / 2;
  discGrp.position.set(-0.18, 0, -0.004);
  discGrp.visible = false;
  inspect.root.add(discGrp);
  inspect.disc = discGrp;
  inspect.discMat = discMat;
  interactive(discGrp, { ...inspect.dragHandlers });
  vinylTexture(album, settings.vinylStyle, '#1db954').then((t) => { discMat.map = t; discMat.needsUpdate = true; });

  await applyBack(album);
}

async function applyBack(album) {
  const mats = inspect.sleeve.userData.mats;
  inspect.hit = [];
  let url = null;
  if (album.type !== 'playlist') url = await findBackCover(album);
  if (inspect.album !== album) return;
  if (url) {
    try { mats.back.map = toTex(await realBack(url)); mats.back.color.set('#fff'); mats.back.needsUpdate = true; inspect.hasRealBack = true; return; }
    catch { /* cai na contracapa gerada */ }
  }
  inspect.hasRealBack = false;
  const base = album.cover ? await centerColor(album.cover) : '#333';
  if (inspect.album !== album) return;
  const { canvas, hit } = generatedBack(album, base);
  mats.back.map = toTex(canvas); mats.back.color.set('#fff'); mats.back.needsUpdate = true;
  inspect.hit = hit;
}

/** Recarrega a contracapa quando as faixas chegam. */
export function refreshBack(album) { if (inspect.album?.id === album.id) { inspect.album = album; applyBack(album); } }

function backClick(h) {
  if (!h?.uv || inspect.hasRealBack || !inspect.hit.length) return;
  // face -z é o verso (índice 5 do material)
  if (h.face?.materialIndex !== 5) return;
  // no verso a textura é espelhada no eixo x
  const u = h.uv.x, v = h.uv.y;
  const line = inspect.hit.find((l) => u >= l.x0 && u <= l.x1 && v >= l.y0 && v <= l.y1);
  if (line) inspect.onTrack?.(line.index);
}

/** Tira o disco da capa (ou guarda de volta). */
export function toggleDisc() {
  if (!inspect.disc) return;
  inspect.opened = !inspect.opened;
  const disc = inspect.disc, sleeve = inspect.sleeve;
  disc.visible = true;
  const from = disc.position.x, to = inspect.opened ? 0.42 : -0.18;
  const sFrom = sleeve.position.x, sTo = inspect.opened ? -0.42 : -0.18;
  const t0 = performance.now();
  inspect.snapTo = 0;
  const stop = world.onUpdate(() => {
    const k = Math.min(1, (performance.now() - t0) / 900);
    const e = ease(k);
    disc.position.x = from + (to - from) * e;
    sleeve.position.x = sFrom + (sTo - sFrom) * e;
    if (k >= 1) {
      stop();
      if (!inspect.opened) disc.visible = false;
    }
  });
  return inspect.opened;
}

/** Só o disco na tela, para girar à vontade. */
export function discOnly(v) {
  inspect.discOnly = v;
  inspect.rotY = 0; inspect.rotX = 0;
  const t0 = performance.now();
  const sFrom = inspect.sleeve.scale.x, sTo = v ? 0.001 : 1;
  const dFrom = inspect.disc.position.x, dTo = v ? 0 : 0.42;
  const stop = world.onUpdate(() => {
    const k = Math.min(1, (performance.now() - t0) / 600), e = ease(k);
    inspect.sleeve.scale.setScalar(sFrom + (sTo - sFrom) * e);
    inspect.disc.position.x = dFrom + (dTo - dFrom) * e;
    if (k >= 1) { stop(); inspect.sleeve.visible = !v; }
  });
  inspect.sleeve.visible = true;
}

export function flipSleeve() { inspect.snapTo = Math.round(inspect.rotY / Math.PI) * Math.PI + Math.PI; }

export function closeInspect(immediate = false) {
  world.overlay.active = false;
  if (immediate) world.overlay.fade = 0;
  inspect.root.clear();
  inspect.sleeve = null; inspect.disc = null; inspect.album = null;
}
