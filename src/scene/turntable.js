// Vitrola: prato, disco, braço com agulha, marcadores precisos por duração e plaqueta do artista.
import * as THREE from 'three';
import { world, interactive } from './world.js';
import { wood, toTex, vinylTexture, handText } from './textures.js';
import { player } from '../spotify/player.js';
import { settings, emit, on } from '../store.js';
import { showTip, hideTip } from '../ui/tooltip.js';
import { fmtTime, escapeHtml, clamp, ease, sleep } from '../util.js';

const R_OUT = 0.142, R_IN = 0.062, MAX_SIDE = 24 * 60 * 1000;
const PLINTH = { w: 0.48, h: 0.075, d: 0.37 };
const CENTER = new THREE.Vector3(-0.055, 0, 0.005);   // centro do prato (local)
const PIVOT = new THREE.Vector3(0.165, 0, -0.115);    // pivô do braço (local)
const ARM_L = 0.236;
const REST_A = -1.52;

export const turntable = {
  group: null, vinyl: null, vinylMat: null, arm: null, markers: null, label: null,
  collection: null, sides: [[], []], side: 0, palette: null,
  spin: 0, armAngle: REST_A, armTarget: REST_A, dragging: false, lifting: false,
  hasDisc: false,
};

function vAngle() { const v = CENTER.clone().sub(PIVOT); return Math.atan2(-v.z, v.x); }
const D = CENTER.distanceTo(PIVOT);

/** Ângulo do braço para a agulha cair no raio r. */
export function angleForRadius(r) {
  const c = clamp((D * D + ARM_L * ARM_L - r * r) / (2 * D * ARM_L), -1, 1);
  return vAngle() + Math.acos(c);
}
function needleAt(a) { return PIVOT.clone().add(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(ARM_L)); }
function radiusForAngle(a) { return needleAt(a).sub(CENTER).setY(0).length(); }

function sideSpan(tracks) { return Math.max(MAX_SIDE, tracks.reduce((s, t) => s + t.duration, 0)); }
function radiusForTime(tracks, ms) { return R_OUT - (ms / sideSpan(tracks)) * (R_OUT - R_IN); }
function timeForRadius(tracks, r) { return ((R_OUT - r) / (R_OUT - R_IN)) * sideSpan(tracks); }

/** Divide as faixas em lado A e B (por duração, como num LP). */
export function splitSides(tracks) {
  if (tracks.length <= 3) return [tracks, []];
  const total = tracks.reduce((s, t) => s + t.duration, 0);
  let acc = 0, cut = tracks.length;
  for (let i = 0; i < tracks.length; i++) { acc += tracks[i].duration; if (acc >= total / 2) { cut = i + 1; break; } }
  if (cut >= tracks.length) cut = Math.ceil(tracks.length / 2);
  return [tracks.slice(0, cut), tracks.slice(cut)];
}

export function buildTurntable(parent, position) {
  const g = new THREE.Group();
  g.position.copy(position);
  parent.add(g);
  turntable.group = g;
  const woodTex = toTex(wood('#3b2416', 21));
  const plinthMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55, metalness: 0.05 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PLINTH.w, PLINTH.h, PLINTH.d), plinthMat);
  plinth.position.y = PLINTH.h / 2; plinth.castShadow = true; plinth.receiveShadow = true;
  g.add(plinth);
  const topY = PLINTH.h;
  const metal = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.9, roughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 });

  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.014, 64), metal);
  platter.position.set(CENTER.x, topY + 0.007, CENTER.z); platter.castShadow = true;
  g.add(platter);
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.002, 64), dark);
  mat.position.set(CENTER.x, topY + 0.015, CENTER.z);
  g.add(mat);

  // disco
  turntable.vinylMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.32, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.25, transparent: true });
  const vinylGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.0025, 96);
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.4 });
  const vinyl = new THREE.Mesh(vinylGeo, [edgeMat, turntable.vinylMat, turntable.vinylMat]);
  vinyl.castShadow = true;
  const vinylHolder = new THREE.Group();
  vinylHolder.position.set(CENTER.x, topY + 0.018, CENTER.z);
  vinylHolder.add(vinyl);
  vinyl.visible = false;
  g.add(vinylHolder);
  turntable.vinyl = vinyl; turntable.vinylHolder = vinylHolder;
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.03, 12), metal);
  spindle.position.set(CENTER.x, topY + 0.03, CENTER.z);
  g.add(spindle);

  interactive(vinyl, {
    onClick: () => {
      if (!turntable.collection) return;
      emit('ui:nowplaying', { track: player.current });
    },
    onEnter: () => turntable.collection && showTip(`<b>${escapeHtml(turntable.collection.name)}</b><br><small>Lado ${turntable.side ? 'B' : 'A'} · clique para abrir o player</small>`),
    onLeave: hideTip,
  });
  // clique na vitrola vazia ou na base
  interactive(plinth, {
    onClick: () => emit('ui:turntable-click'),
    onEnter: () => showTip(turntable.collection ? 'Vitrola' : 'Vitrola vazia · escolha um disco na pilha ou na caixa'),
    onLeave: hideTip,
  });

  // marcadores (pontos de cada faixa ao longo do arco da agulha)
  turntable.markers = new THREE.Group();
  turntable.markers.position.y = topY + 0.021;
  g.add(turntable.markers);

  // braço
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.03, 32), metal);
  armBase.position.set(PIVOT.x, topY + 0.015, PIVOT.z);
  g.add(armBase);
  const arm = new THREE.Group();
  arm.position.set(PIVOT.x, topY + 0.036, PIVOT.z);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, ARM_L - 0.02, 12), metal);
  tube.rotation.z = Math.PI / 2; tube.position.x = (ARM_L - 0.02) / 2;
  const counter = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 20), dark);
  counter.rotation.z = Math.PI / 2; counter.position.x = -0.035;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.018), new THREE.MeshStandardMaterial({ color: '#1f1f1f', metalness: 0.4, roughness: 0.35 }));
  head.position.set(ARM_L - 0.01, -0.006, 0);
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.012, 8), metal);
  needle.rotation.x = Math.PI; needle.position.set(ARM_L, -0.014, 0);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.006), metal);
  lift.position.set(ARM_L - 0.005, -0.003, 0.012);
  [tube, counter, head, needle, lift].forEach((m) => { m.castShadow = true; arm.add(m); });
  // área de pegar maior
  const grab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
  grab.position.set(ARM_L - 0.01, -0.005, 0);
  arm.add(grab);
  g.add(arm);
  turntable.arm = arm;
  setupArmDrag(grab, head);

  const rest = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8), metal);
  const restPos = needleAt(REST_A);
  rest.position.set(restPos.x - 0.012, topY + 0.015, restPos.z - 0.03);
  g.add(rest);

  // plaqueta do artista (frente) e botão A/B
  const labelMat = new THREE.MeshBasicMaterial({ transparent: true });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.04), labelMat);
  label.position.set(-0.05, PLINTH.h * 0.5, PLINTH.d / 2 + 0.001);
  g.add(label);
  turntable.label = label;
  interactive(label, {
    onClick: () => turntable.collection?.artists?.[0]?.id && emit('ui:artist', turntable.collection.artists[0]),
    onEnter: () => turntable.collection?.artists?.[0]?.id && showTip('Abrir a caixa do artista'),
    onLeave: hideTip,
  });
  setLabel('— sem disco —');

  const sideBtnMat = new THREE.MeshBasicMaterial({ map: toTex(handText('A | B', { w: 128, h: 64, size: 40, color: '#e9e2d0', font: 'Permanent Marker', weight: 400 })), transparent: true });
  const sideBtn = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), sideBtnMat);
  sideBtn.rotation.x = -Math.PI / 2;
  sideBtn.position.set(0.17, topY + 0.001, 0.14);
  g.add(sideBtn);
  interactive(sideBtn, { onClick: () => flipSide(), onEnter: () => showTip('Virar o disco (lado A / lado B)'), onLeave: hideTip });

  const led = new THREE.Mesh(new THREE.SphereGeometry(0.004, 12, 8), new THREE.MeshBasicMaterial({ color: '#1db954' }));
  led.position.set(0.2, PLINTH.h * 0.5, PLINTH.d / 2 + 0.002);
  g.add(led);
  turntable.led = led;

  world.onUpdate((dt) => {
    const speed = player.playing && turntable.hasDisc && !turntable.lifting ? 3.49 : 0;
    turntable.spin += (speed - turntable.spin) * Math.min(1, dt * 2.5);
    vinylHolder.rotation.y -= turntable.spin * dt;
    platter.rotation.y = vinylHolder.rotation.y;
    if (!turntable.dragging) {
      turntable.armTarget = computeArmTarget();
      turntable.armAngle += (turntable.armTarget - turntable.armAngle) * Math.min(1, dt * 3);
    }
    arm.rotation.y = turntable.armAngle;
    // agulha desce quando está sobre o disco tocando
    const onRecord = player.playing && turntable.hasDisc && !turntable.dragging && !turntable.lifting;
    arm.rotation.z += ((onRecord ? -0.03 : 0.02) - arm.rotation.z) * Math.min(1, dt * 4);
    led.material.color.set(player.playing ? '#1db954' : '#5a1c1c');
  });

  on('player:track', (t) => {
    if (!t || !turntable.collection) return;
    const s = turntable.sides[1].some((x) => x.id === t.id) ? 1 : 0;
    if (s !== turntable.side) flipSide(s);
  });
  on('settings', ({ key }) => { if (key === 'vinylStyle' && turntable.collection) applyVinylTexture(); });
  return turntable;
}

function setLabel(text) {
  const c = handText(text, { w: 1024, h: 160, size: 84, color: '#e9e2d0', font: 'Permanent Marker', weight: 400, bg: '#1a120c' });
  turntable.label.material.map?.dispose();
  turntable.label.material.map = toTex(c);
  turntable.label.material.needsUpdate = true;
}

function computeArmTarget() {
  const cur = player.current;
  if (!turntable.hasDisc || !cur || turntable.lifting) return REST_A;
  const tracks = turntable.sides[turntable.side];
  const i = tracks.findIndex((t) => t.id === cur.id);
  if (i < 0) return REST_A;
  const before = tracks.slice(0, i).reduce((s, t) => s + t.duration, 0);
  if (!player.playing && player.position === 0) return REST_A;
  return angleForRadius(radiusForTime(tracks, before + player.position));
}

function setupArmDrag(grab, head) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const p = new THREE.Vector3();
  let preview = null;
  const outerA = () => angleForRadius(R_OUT + 0.003);
  const innerA = () => angleForRadius(R_IN);
  interactive(grab, {
    cursor: 'grab',
    onEnter: () => showTip(turntable.collection ? '<b>Agulha</b><br><small>Clique para tocar do começo · arraste para escolher a faixa</small>' : 'Agulha'),
    onLeave: hideTip,
    onDragStart: () => {
      if (!turntable.collection) return;
      turntable.dragging = true;
      plane.constant = -turntable.group.localToWorld(new THREE.Vector3(0, PLINTH.h + 0.036, 0)).y;
    },
    onDrag: (ray) => {
      if (!turntable.dragging) return;
      if (!ray.intersectPlane(plane, p)) return;
      const local = turntable.group.worldToLocal(p.clone());
      const v = local.sub(PIVOT);
      let a = Math.atan2(-v.z, v.x);
      a = clamp(a, innerA(), REST_A);
      turntable.armAngle = a;
      preview = null;
      if (a < outerA()) {
        const tracks = turntable.sides[turntable.side];
        const ms = timeForRadius(tracks, radiusForAngle(a));
        let acc = 0;
        for (let i = 0; i < tracks.length; i++) {
          if (ms < acc + tracks[i].duration) { preview = { track: tracks[i], offset: ms - acc }; break; }
          acc += tracks[i].duration;
        }
        if (preview) showTip(`<b>${escapeHtml(preview.track.name)}</b><br><small>${fmtTime(preview.offset)} / ${fmtTime(preview.track.duration)}</small>`);
        else showTip('<small>fim do lado</small>');
      } else showTip('<small>solte aqui para parar</small>');
    },
    onDragEnd: (d) => {
      if (!turntable.dragging) return;
      turntable.dragging = false;
      hideTip();
      if (!d.moved) return;
      if (preview) playFrom(preview.track, preview.offset);
      else player.pause();
    },
    onClick: () => {
      if (!turntable.collection) { emit('toast', 'Coloque um disco primeiro: clique na pilha de álbuns.'); return; }
      const first = turntable.sides[turntable.side][0];
      if (player.playing && player.context?.id === turntable.collection.id) player.pause();
      else if (player.context?.id === turntable.collection.id && player.current) player.resume();
      else playFrom(first, 0);
    },
  });
}

function playFrom(track, offset) {
  const all = turntable.collection.tracks;
  const i = all.findIndex((t) => t.id === track.id);
  if (player.context?.id === turntable.collection.id && player.queue.length) {
    const qi = player.queue.findIndex((t) => t.id === track.id);
    if (qi >= 0) return player.jumpTo(qi, offset);
  }
  player.playList(all, Math.max(0, i), turntable.collection, offset);
}

function buildMarkers() {
  const grp = turntable.markers;
  grp.clear();
  const tracks = turntable.sides[turntable.side];
  let acc = 0;
  const geo = new THREE.SphereGeometry(0.0042, 16, 10);
  tracks.forEach((t, i) => {
    const r = radiusForTime(tracks, acc);
    const pos = needleAt(angleForRadius(r));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#c8ffd9', transparent: true, opacity: 0.9 }));
    m.position.set(pos.x, 0, pos.z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.0075, 24), new THREE.MeshBasicMaterial({ color: '#1db954', transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; m.add(ring);
    const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    m.add(hitArea);
    m.userData.track = t;
    interactive(m, {
      onEnter: () => { m.scale.setScalar(1.6); showTip(`<b>${i + 1}. ${escapeHtml(t.name)}</b><br><small>${fmtTime(t.duration)} · começa em ${fmtTime(acc0)}</small>`); },
      onLeave: () => { m.scale.setScalar(1); hideTip(); },
      onClick: () => { playFrom(t, 0); emit('ui:nowplaying', { track: t }); },
    });
    const acc0 = acc;
    acc += t.duration;
    m.scale.setScalar(0.001);
    m.userData.appear = 0.15 + i * 0.06;
    grp.add(m);
  });
  // animação de surgimento
  const stop = world.onUpdate((dt) => {
    let done = true;
    grp.children.forEach((m) => {
      if (m.userData.appear > 0) { m.userData.appear -= dt; done = false; return; }
      if (m.scale.x < 1 && world.hovered !== m) { m.scale.setScalar(Math.min(1, m.scale.x + dt * 4)); done = false; }
    });
    if (done) stop();
  });
}

async function applyVinylTexture() {
  const c = turntable.collection;
  const tex = await vinylTexture(c, settings.vinylStyle, turntable.palette?.[0] || '#1db954');
  turntable.vinylMat.map?.dispose();
  turntable.vinylMat.map = tex;
  turntable.vinylMat.opacity = settings.vinylStyle === 'clear' ? 0.85 : 1;
  turntable.vinylMat.needsUpdate = true;
}

async function flipSide(force) {
  if (!turntable.collection) return;
  const next = force ?? (turntable.side ? 0 : 1);
  if (!turntable.sides[next].length) { emit('toast', 'Esse disco só tem lado A.'); return; }
  turntable.side = next;
  const h = turntable.vinylHolder;
  turntable.lifting = true;
  const t0 = performance.now();
  const from = turntable.vinyl.rotation.x, to = next ? Math.PI : 0;
  await new Promise((res) => {
    const stop = world.onUpdate(() => {
      const k = Math.min(1, (performance.now() - t0) / 700);
      h.position.y = PLINTH.h + 0.018 + Math.sin(k * Math.PI) * 0.08;
      turntable.vinyl.rotation.x = from + (to - from) * ease(k);
      if (k >= 1) { stop(); res(); }
    });
  });
  turntable.vinyl.rotation.x = next ? Math.PI : 0;
  turntable.lifting = false;
  buildMarkers();
}

/** Coloca um disco na vitrola com animação. quick = troca rápida. */
export async function loadDisc(collection, palette, { quick = false } = {}) {
  const h = turntable.vinylHolder;
  const baseY = PLINTH.h + 0.018;
  const dur = quick ? 350 : 900;
  const anim = (from, to, ms, extra) => new Promise((res) => {
    const t0 = performance.now();
    const stop = world.onUpdate(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      const e = ease(k);
      h.position.y = from.y + (to.y - from.y) * e;
      h.position.z = from.z + (to.z - from.z) * e;
      extra?.(e);
      if (k >= 1) { stop(); res(); }
    });
  });
  turntable.lifting = true;
  if (turntable.hasDisc) {
    await anim({ y: baseY, z: CENTER.z }, { y: baseY + 0.25, z: CENTER.z - 0.25 }, dur * 0.6, (e) => { turntable.vinylMat.opacity = 1 - e; });
  }
  turntable.collection = collection;
  turntable.palette = palette;
  turntable.sides = splitSides(collection.tracks || []);
  turntable.side = 0;
  turntable.vinyl.rotation.x = 0;
  turntable.markers.clear();
  setLabel(collection.artists?.[0]?.name || collection.name);
  await applyVinylTexture();
  turntable.vinyl.visible = true;
  turntable.hasDisc = true;
  h.position.set(CENTER.x, baseY + 0.35, CENTER.z + 0.1);
  await anim({ y: baseY + 0.35, z: CENTER.z + 0.1 }, { y: baseY, z: CENTER.z }, dur, (e) => { turntable.vinylMat.opacity = Math.min(1, e * 2) * (settings.vinylStyle === 'clear' ? 0.85 : 1); });
  turntable.lifting = false;
  if (!quick) await sleep(100);
  buildMarkers();
}
