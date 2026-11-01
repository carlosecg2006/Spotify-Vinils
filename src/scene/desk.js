// Mesa e objetos sobre ela: pilha de discos, papel da fila, ingressos e a caixa "busque aqui".
import * as THREE from 'three';
import { world, interactive } from './world.js';
import { wood, toTex, cardboard, paperCanvas, coverTexture, handText, canvas } from './textures.js';
import { makeSleeve } from './sleeve.js';
import { buildTurntable } from './turntable.js';
import { player } from '../spotify/player.js';
import { emit, on, state } from '../store.js';
import { showTip, hideTip } from '../ui/tooltip.js';
import { escapeHtml, rng, ease, fmtTime } from '../util.js';

export const DESK_Y = 0.75;
export const desk = { group: null, stack: null, stackItems: [], paper: null, tickets: null, searchBox: null, boxSleeves: [] };

export const VIEWS = {
  overview: { pos: [-0.25, 1.85, 3.7], target: [-0.25, 0.7, -0.15], fov: 50 },
  desk: { pos: [0.2, 1.72, 2.3], target: [0.1, 0.55, -0.05], fov: 54 },
  stack: { pos: [-0.95, 1.25, 0.75], target: [-0.95, 0.98, -0.12], fov: 50 },
  search: { pos: [1.45, 1.3, 0.9], target: [1.45, 0.05, 0.6], fov: 48 },
  turntable: { pos: [-0.56, 1.32, 0.42], target: [-0.56, 0.76, -0.12], fov: 45 },
  artist: { pos: [0.45, 1.3, 0.42], target: [0.45, 0.8, -0.15], fov: 46 },
  shelf: { pos: [-1.15, 1.4, 1.55], target: [-1.95, 0.98, -0.42], fov: 56 },
};

export function buildDesk(parent = world.scene) {
  const g = new THREE.Group();
  parent.add(g);
  desk.group = g;
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 0.95), new THREE.MeshStandardMaterial({ map: toTex(wood('#6b4428', 3), { repeat: [2, 1] }), roughness: 0.62 }));
  top.position.set(-0.05, DESK_Y - 0.025, -0.1);
  top.castShadow = true; top.receiveShadow = true;
  g.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: '#2c1c12', roughness: 0.7 });
  [[-1.1, -0.5], [1.0, -0.5], [-1.1, 0.3], [1.0, 0.3]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, DESK_Y - 0.05, 0.06), legMat);
    leg.position.set(x, (DESK_Y - 0.05) / 2, z); leg.castShadow = true; g.add(leg);
  });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.02), legMat);
  apron.position.set(-0.05, DESK_Y - 0.09, 0.32); g.add(apron);

  buildTurntable(g, new THREE.Vector3(-0.55, DESK_Y, -0.15));
  buildStack(g);
  buildPaper(g);
  buildTickets(g);
  buildSearchBox(g);
  buildLamp(g);
}

function buildLamp(g) {
  const m = new THREE.MeshStandardMaterial({ color: '#1c1c1c', metalness: 0.6, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 24), m);
  base.position.set(0.95, DESK_Y + 0.01, -0.45);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 8), m);
  pole.position.set(0.95, DESK_Y + 0.26, -0.45);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#1db954', side: THREE.DoubleSide, roughness: 0.5 }));
  shade.position.set(0.85, DESK_Y + 0.5, -0.4); shade.rotation.z = 0.6;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3d6' }));
  bulb.position.set(0.83, DESK_Y + 0.47, -0.4);
  const light = new THREE.PointLight('#ffdcae', 1.4, 2.2, 2);
  light.position.copy(bulb.position);
  g.add(base, pole, shade, bulb, light);
}

// ------------------------------------------------------------ pilha de discos
const STACK_POS = new THREE.Vector3(-1.0, DESK_Y, -0.12);

function buildStack(g) {
  const stack = new THREE.Group();
  stack.position.copy(STACK_POS);
  g.add(stack);
  desk.stack = stack;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.36), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.1;
  stack.add(hit);
  interactive(hit, {
    onClick: () => emit('ui:view', 'stack'),
    onEnter: () => showTip('<b>Tocados recentemente</b><br><small>clique para folhear a pilha</small>'),
    onLeave: hideTip,
  });
  desk.stackHit = hit;
}

/** Cria a pilha com os álbuns tocados recentemente (um a um caindo). */
export function fillStack(recent) {
  const stack = desk.stack;
  desk.stackItems.forEach((s) => stack.remove(s.mesh));
  desk.stackItems = [];
  const r = rng(7);
  const items = recent.slice(0, 12);
  items.slice().reverse().forEach((entry, k) => {
    const mesh = makeSleeve(entry.album, 0.31);
    mesh.rotation.x = -Math.PI / 2;
    const restY = 0.004 + k * 0.0068;
    mesh.userData.rest = { y: restY, rz: (r() - 0.5) * 0.35, x: (r() - 0.5) * 0.025, z: (r() - 0.5) * 0.025 };
    mesh.position.set(mesh.userData.rest.x, restY + 0.6, mesh.userData.rest.z);
    mesh.rotation.z = mesh.userData.rest.rz;
    mesh.userData.drop = 0.2 + k * 0.18;
    mesh.userData.entry = entry;
    stack.add(mesh);
    desk.stackItems.push({ mesh, entry, index: items.length - 1 - k });
  });
  desk.stackItems.reverse(); // índice 0 = mais recente (topo)
  const stop = world.onUpdate((dt) => {
    let done = true;
    desk.stackItems.forEach(({ mesh }) => {
      const u = mesh.userData;
      if (u.fanned) return;
      if (u.drop > 0) { u.drop -= dt; done = false; return; }
      const dy = mesh.position.y - u.rest.y;
      if (Math.abs(dy) > 0.0005) { mesh.position.y -= Math.max(0.0005, dy * Math.min(1, dt * 7)); done = false; }
      else mesh.position.y = u.rest.y;
    });
    if (done) stop();
  });
}

/** Leque: as capas da pilha se levantam em arco na frente da câmera. */
export function fanStack(open) {
  const n = desk.stackItems.length;
  desk.stackItems.forEach(({ mesh, entry }, i) => {
    const u = mesh.userData;
    u.fanned = open;
    const from = { p: mesh.position.clone(), rx: mesh.rotation.x, rz: mesh.rotation.z, ry: mesh.rotation.y };
    const spread = Math.min(0.13, 1.1 / Math.max(1, n));
    const x = (i - (n - 1) / 2) * spread;
    const to = open
      ? { p: new THREE.Vector3(x, 0.2 + Math.abs(x) * 0.12, 0.08 - Math.abs(x) * 0.25), rx: -0.25, rz: 0, ry: -x * 1.2 }
      : { p: new THREE.Vector3(u.rest.x, u.rest.y, u.rest.z), rx: -Math.PI / 2, rz: u.rest.rz, ry: 0 };
    const t0 = performance.now() + (open ? i : n - i) * 35;
    const stop = world.onUpdate(() => {
      const k = Math.max(0, Math.min(1, (performance.now() - t0) / 650));
      const e = ease(k);
      mesh.position.lerpVectors(from.p, to.p, e);
      mesh.rotation.set(from.rx + (to.rx - from.rx) * e, from.ry + (to.ry - from.ry) * e, from.rz + (to.rz - from.rz) * e);
      if (k >= 1) stop();
    });
    interactive(mesh, open ? {
      enabled: true,
      onEnter: () => {
        mesh.position.y += 0.03;
        const tracks = entry.played.map((t) => `<li>${escapeHtml(t.name)}</li>`).join('');
        showTip(`<b>${escapeHtml(entry.album.name)}</b><br><small>${escapeHtml(entry.album.artists?.map((a) => a.name).join(', '))}</small><ul class="tip-list">${tracks}</ul><small>clique para ver o disco</small>`);
      },
      onLeave: () => { mesh.position.y -= 0.03; hideTip(); },
      onClick: () => emit('ui:inspect', entry.album),
    } : { enabled: false });
  });
  desk.stackHit.userData.enabled = !open;
}

// ------------------------------------------------------------ papel da fila
const PAPER_W = 0.26, PAPER_H = 0.34;
function buildPaper(g) {
  const geo = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 16, 20);
  const pos = geo.attributes.position;
  const r = rng(4);
  for (let i = 0; i < pos.count; i++) pos.setZ(i, (r() - 0.5) * 0.004);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide });
  const paper = new THREE.Mesh(geo, mat);
  paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.12;
  paper.position.set(-0.08, DESK_Y + 0.003, 0.08);
  paper.receiveShadow = true;
  g.add(paper);
  desk.paper = paper;
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 6), new THREE.MeshStandardMaterial({ color: '#e8b422', roughness: 0.6 }));
  pencil.rotation.z = Math.PI / 2; pencil.rotation.y = 0.6;
  pencil.position.set(0.04, DESK_Y + 0.006, 0.2);
  g.add(pencil);
  interactive(paper, {
    onClick: () => emit('ui:queue'),
    onEnter: () => showTip('<b>Fila</b><br><small>clique para abrir o papel</small>'),
    onLeave: hideTip,
  });
  drawPaper();
  on('player:queue', drawPaper);
  on('player:track', drawPaper);
  on('player:state', () => { clearTimeout(drawPaper._t); drawPaper._t = setTimeout(drawPaper, 120); });
}

function drawPaper() {
  const [c, g] = paperCanvas(520, 680, 4);
  g.fillStyle = '#2d2d2d'; g.font = '700 54px Caveat';
  g.fillText('Fila', 30, 64);
  g.strokeStyle = 'rgba(40,40,40,.6)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(28, 76); g.quadraticCurveTo(120, 82, 130, 74); g.stroke();
  const q = player.queue;
  const start = Math.max(0, player.index);
  g.font = '600 32px Caveat';
  q.slice(start, start + 11).forEach((t, i) => {
    const y = 125 + i * 46;
    g.fillStyle = i === 0 ? '#111' : 'rgba(40,40,40,.75)';
    const txt = `${i === 0 ? '▶ ' : ''}${t.name}`;
    g.fillText(txt.length > 30 ? txt.slice(0, 29) + '…' : txt, 30, y);
    g.globalAlpha = 0.5; g.fillText(fmtTime(t.duration), 430, y); g.globalAlpha = 1;
  });
  if (!q.length) { g.fillStyle = 'rgba(40,40,40,.6)'; g.fillText('(vazia… coloque um disco)', 30, 140); }
  g.font = '700 40px Caveat'; g.fillStyle = '#2b2b2b';
  g.fillText(`⏮   ${player.playing ? '❚❚' : '▶'}   ⏭`, 150, 640);
  const m = desk.paper.material;
  m.map?.dispose(); m.map = toTex(c); m.needsUpdate = true;
}

// ------------------------------------------------------------ ingressos
function buildTickets(g) {
  const grp = new THREE.Group();
  grp.position.set(0.86, DESK_Y + 0.002, 0.08);
  g.add(grp);
  desk.tickets = grp;
}

export function fillTickets(artists) {
  const grp = desk.tickets; grp.clear();
  const r = rng(13);
  artists.slice(0, 14).forEach((a, i) => {
    const [c, g] = canvas(512, 220);
    const hue = Math.floor(r() * 360);
    g.fillStyle = `hsl(${hue} 55% 78%)`; g.fillRect(0, 0, 512, 220);
    g.fillStyle = `hsl(${hue} 50% 30%)`; g.fillRect(0, 0, 512, 34); g.fillRect(0, 186, 512, 34);
    g.setLineDash([8, 8]); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(390, 34); g.lineTo(390, 186); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#111'; g.font = '700 22px Inter'; g.fillText('ADMIT ONE · AO VIVO', 20, 24);
    let s = 52; g.font = `400 ${s}px "Permanent Marker"`;
    while (g.measureText(a.name).width > 350 && s > 20) { s -= 2; g.font = `400 ${s}px "Permanent Marker"`; }
    g.fillText(a.name, 20, 118);
    g.font = '600 20px Inter'; g.fillText(`Nº ${String(1000 + Math.floor(r() * 9000))}`, 20, 160);
    g.save(); g.translate(450, 110); g.rotate(-Math.PI / 2); g.font = '700 26px Inter'; g.textAlign = 'center'; g.fillText('VIP', 0, 8); g.restore();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.073), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: 0.9, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = (r() - 0.5) * 2.2;
    mesh.position.set((r() - 0.5) * 0.12, i * 0.0012, (r() - 0.5) * 0.1);
    mesh.receiveShadow = true;
    interactive(mesh, {
      onEnter: () => { mesh.position.y += 0.01; showTip(`<b>${escapeHtml(a.name)}</b><br><small>ingresso · abrir a caixa do artista</small>`); },
      onLeave: () => { mesh.position.y -= 0.01; hideTip(); },
      onClick: () => emit('ui:artist', a),
    });
    grp.add(mesh);
  });
}

// ------------------------------------------------------------ caixa "busque aqui"
const BOX = { w: 0.72, h: 0.36, d: 0.52 };
function buildSearchBox(g) {
  const grp = new THREE.Group();
  grp.position.set(1.45, 0, 0.6);
  grp.rotation.y = -0.28;
  g.add(grp);
  desk.searchBox = grp;
  const tex = toTex(cardboard(5));
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide });
  const inner = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, color: '#8e6c45', side: THREE.DoubleSide });
  const t = 0.008;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, t, BOX.d), inner); bottom.position.y = t / 2;
  const front = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, t), mat); front.position.set(0, BOX.h / 2, BOX.d / 2);
  const back = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, t), mat); back.position.set(0, BOX.h / 2, -BOX.d / 2);
  const left = new THREE.Mesh(new THREE.BoxGeometry(t, BOX.h, BOX.d), mat); left.position.set(-BOX.w / 2, BOX.h / 2, 0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(t, BOX.h, BOX.d), mat); right.position.set(BOX.w / 2, BOX.h / 2, 0);
  [bottom, front, back, left, right].forEach((m) => { m.castShadow = true; m.receiveShadow = true; grp.add(m); });
  // abas abertas
  [[-1, 0], [1, 0]].forEach(([sx]) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(BOX.w * 0.32, t, BOX.d * 0.96), mat);
    flap.position.set(sx * (BOX.w / 2 + BOX.w * 0.13), BOX.h + 0.06, 0);
    flap.rotation.z = sx * 0.55;
    grp.add(flap);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshBasicMaterial({ map: toTex(handText('BUSQUE AQUI', { w: 1024, h: 280, size: 190, font: 'Permanent Marker', weight: 400, color: '#151515' })), transparent: true }));
  label.position.set(0, BOX.h * 0.55, BOX.d / 2 + 0.006);
  label.rotation.z = -0.03;
  grp.add(label);
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ map: toTex(handText('↓ ♪', { w: 256, h: 128, size: 90, font: 'Permanent Marker', weight: 400, color: '#1a1a1a' })), transparent: true }));
  arrow.position.set(0.24, BOX.h * 0.25, BOX.d / 2 + 0.006);
  grp.add(arrow);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = BOX.h / 2;
  grp.add(hit);
  interactive(hit, {
    onClick: () => emit('ui:view', 'search'),
    onEnter: () => showTip('<b>Busque aqui</b><br><small>abrir a caixa de discos</small>'),
    onLeave: hideTip,
  });
  desk.searchHit = hit;
}

/** Espalha até 10 capas dentro da caixa. */
export function fillSearchBox(albums) {
  const grp = desk.searchBox;
  desk.boxSleeves.forEach((m) => grp.remove(m));
  desk.boxSleeves = [];
  const r = rng(albums.length + 3);
  albums.slice(0, 10).forEach((album, i) => {
    const mesh = makeSleeve(album, 0.125);
    const col = i % 5, row = Math.floor(i / 5);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = (r() - 0.5) * 0.4;
    const target = new THREE.Vector3(-0.26 + col * 0.13 + (r() - 0.5) * 0.02, 0.012 + i * 0.003, -0.1 + row * 0.2 + (r() - 0.5) * 0.02);
    mesh.position.set(target.x, 0.6, target.z);
    grp.add(mesh);
    desk.boxSleeves.push(mesh);
    const t0 = performance.now() + i * 70;
    const stop = world.onUpdate(() => {
      const k = Math.max(0, Math.min(1, (performance.now() - t0) / 500));
      mesh.position.y = 0.6 + (target.y - 0.6) * ease(k);
      if (k >= 1) stop();
    });
    interactive(mesh, {
      onEnter: () => { mesh.position.y += 0.02; showTip(`<b>${escapeHtml(album.name)}</b><br><small>${escapeHtml(album.artists?.map((a) => a.name).join(', '))} · ${(album.release || '').slice(0, 4)}</small>`); },
      onLeave: () => { mesh.position.y -= 0.02; hideTip(); },
      onClick: () => emit('ui:inspect', album),
    });
  });
}

export function setSearchBoxActive(active) {
  desk.searchHit.userData.enabled = !active;
  desk.boxSleeves.forEach((m) => { m.userData.enabled = active; });
}

export function deskMode() { return state.view; }
