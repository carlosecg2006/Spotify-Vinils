// Duas caixas de som nas pontas + display de volume.
import * as THREE from 'three';
import { world, interactive } from './world.js';
import { wood, toTex, canvas } from './textures.js';
import { player } from '../spotify/player.js';
import { on } from '../store.js';
import { showTip, hideTip } from '../ui/tooltip.js';
import { clamp } from '../util.js';

export const speakers = { cones: [], display: null, pulse: 0 };

function coneTexture() {
  const [c, g] = canvas(256);
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, '#2a2a2a'); grad.addColorStop(0.25, '#0d0d0d'); grad.addColorStop(0.8, '#1c1c1c'); grad.addColorStop(0.92, '#3a3a3a'); grad.addColorStop(1, '#111');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.05)';
  for (let r = 30; r < 120; r += 8) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
  return toTex(c);
}

function speaker(parent, x, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, -0.25);
  g.rotation.y = rotY;
  parent.add(g);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.05, 0.36), new THREE.MeshStandardMaterial({ map: toTex(wood('#2b1a10', 61)), roughness: 0.55 }));
  cab.position.y = 0.525; cab.castShadow = cab.receiveShadow = true;
  g.add(cab);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 1.0), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 }));
  face.position.set(0, 0.525, 0.181);
  g.add(face);
  const tex = coneTexture();
  const ringMat = new THREE.MeshStandardMaterial({ color: '#8a8f94', metalness: 0.8, roughness: 0.35 });
  [[0.33, 0.15], [0.68, 0.09], [0.9, 0.04]].forEach(([y, r]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 10, 48), ringMat);
    ring.position.set(0, y, 0.185);
    const cone = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
    cone.position.set(0, y, 0.183);
    const dust = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4 }));
    dust.rotation.x = Math.PI / 2; dust.position.set(0, y, 0.183);
    g.add(ring, cone, dust);
    speakers.cones.push({ cone, dust, base: 0.183, r });
  });
  const glow = new THREE.PointLight('#1db954', 0, 1.2, 2);
  glow.position.set(0, 0.4, 0.4);
  g.add(glow);
  speakers.glows = [...(speakers.glows || []), glow];
  return g;
}

export function buildSpeakers(parent = world.scene) {
  speaker(parent, -2.75, 0.45);
  const right = speaker(parent, 2.35, -0.45);
  // display de volume em cima da caixa da direita
  const [c] = canvas(512, 160);
  const tex = toTex(c);
  const disp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.04), [null, null, null, null, new THREE.MeshBasicMaterial({ map: tex }), null].map((m) => m || new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 })));
  disp.position.set(0, 1.1, 0.12);
  disp.rotation.x = -0.35;
  right.add(disp);
  speakers.display = { mesh: disp, canvas: c, tex };
  drawVolume();
  const plane = new THREE.Plane();
  let startX = 0, startVol = 0;
  interactive(disp, {
    cursor: 'ew-resize',
    onEnter: () => showTip(`<b>Volume ${Math.round(player.volume * 100)}%</b><br><small>arraste para os lados, role ou clique</small>`),
    onLeave: hideTip,
    onWheel: (dy) => { player.setVolume(player.volume - Math.sign(dy) * 0.05); showTip(`<b>Volume ${Math.round(player.volume * 100)}%</b>`); },
    onDragStart: (hit, e) => { startX = e.clientX; startVol = player.volume; },
    onDrag: (ray, e) => { player.setVolume(clamp(startVol + (e.clientX - startX) / 300, 0, 1)); showTip(`<b>Volume ${Math.round(player.volume * 100)}%</b>`); },
    onClick: (hit) => {
      const u = hit.uv?.x;
      if (u != null) player.setVolume(clamp((u - 0.1) / 0.8, 0, 1));
    },
  });
  void plane;
  on('player:volume', drawVolume);
  world.onUpdate((dt) => {
    speakers.pulse *= Math.pow(0.02, dt);
    speakers.cones.forEach((c, i) => {
      const k = speakers.pulse * (i % 3 === 0 ? 1 : 0.5) * (0.4 + player.volume);
      c.cone.position.z = c.base + k * 0.012;
      c.dust.position.z = c.base + k * 0.016;
      c.dust.scale.setScalar(1 + k * 0.08);
    });
    (speakers.glows || []).forEach((gl) => { gl.intensity = speakers.pulse * 1.2; });
  });
}

function drawVolume() {
  const { canvas: c, tex } = speakers.display;
  const g = c.getContext('2d');
  g.fillStyle = '#050a07'; g.fillRect(0, 0, 512, 160);
  const n = 20, v = Math.round(player.volume * n);
  for (let i = 0; i < n; i++) {
    const h = 30 + i * 4.5;
    g.fillStyle = i < v ? (i > 16 ? '#ff5a4f' : '#1db954') : '#13261a';
    g.fillRect(52 + i * 21, 130 - h, 14, h);
  }
  g.fillStyle = '#9dffbe'; g.font = '700 26px monospace'; g.fillText(`VOL ${String(Math.round(player.volume * 100)).padStart(3, '0')}`, 52, 30);
  tex.needsUpdate = true;
}

export function speakerBeat(strength = 1) { speakers.pulse = Math.max(speakers.pulse, strength); }
