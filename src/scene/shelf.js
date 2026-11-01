// Estante: curtidos (coração talhado), fitas salvas, playlists + troféu (+) e três gavetas.
import * as THREE from 'three';
import { world, interactive } from './world.js';
import { wood, toTex, canvas, handText } from './textures.js';
import { makeSleeve } from './sleeve.js';
import { emit } from '../store.js';
import { showTip, hideTip } from '../ui/tooltip.js';
import { escapeHtml, rng, ease, fmtTime } from '../util.js';
import { paletteFrom } from '../services/colors.js';

const W = 0.95, H = 1.85, D = 0.36, T = 0.025;
const ROWS = [
  { key: 'drawers', y0: T, y1: 0.42 },
  { key: 'liked', y0: 0.445, y1: 0.9 },
  { key: 'saved', y0: 0.925, y1: 1.38 },
  { key: 'playlists', y0: 1.405, y1: H - T },
];

export const shelf = { group: null, rows: {}, drawers: [] };

function carvedSide(icon) {
  const c = wood('#5d3b22', 31, 512, 1024);
  const g = c.getContext('2d');
  const draw = (y, kind) => {
    g.save(); g.translate(256, y);
    g.lineWidth = 16; g.lineJoin = 'round';
    for (const [col, off] of [['rgba(255,225,190,.25)', 3], ['rgba(25,12,4,.75)', 0]]) {
      g.strokeStyle = col; g.save(); g.translate(off, off);
      g.beginPath();
      if (kind === 'heart') {
        g.moveTo(0, 60); g.bezierCurveTo(-120, -20, -70, -110, 0, -50); g.bezierCurveTo(70, -110, 120, -20, 0, 60);
      } else if (kind === 'tape') {
        g.rect(-110, -65, 220, 130); g.moveTo(-50, 0); g.arc(-50, 0, 24, 0, Math.PI * 2); g.moveTo(74, 0); g.arc(50, 0, 24, 0, Math.PI * 2);
      } else if (kind === 'note') {
        g.moveTo(-40, 50); g.arc(-60, 50, 20, 0, Math.PI * 2); g.moveTo(-40, 50); g.lineTo(-40, -60); g.lineTo(60, -80); g.lineTo(60, 30); g.moveTo(80, 30); g.arc(40, 30, 20, 0, Math.PI * 2);
      }
      g.stroke(); g.restore();
    }
    g.restore();
  };
  const toY = (y) => 1024 - (y / H) * 1024;
  draw(toY((ROWS[1].y0 + ROWS[1].y1) / 2), 'heart');
  draw(toY((ROWS[2].y0 + ROWS[2].y1) / 2), 'tape');
  draw(toY((ROWS[3].y0 + ROWS[3].y1) / 2), 'note');
  return toTex(c);
}

export function buildShelf(parent = world.scene) {
  const g = new THREE.Group();
  g.position.set(-1.95, 0, -0.42);
  g.rotation.y = 0.38;
  parent.add(g);
  shelf.group = g;
  const woodMat = new THREE.MeshStandardMaterial({ map: toTex(wood('#5d3b22', 31)), roughness: 0.65 });
  const sideMat = new THREE.MeshStandardMaterial({ map: carvedSide(), roughness: 0.65 });
  const backMat = new THREE.MeshStandardMaterial({ color: '#24160d', roughness: 0.9 });
  const box = (s, p, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...s), m); b.position.set(...p); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  // laterais: a da direita (que a câmera vê) tem os entalhes
  box([T, H, D], [-W / 2, H / 2, 0], woodMat);
  box([T, H, D], [W / 2, H / 2, 0], [sideMat, woodMat, woodMat, woodMat, woodMat, woodMat]);
  box([W, H, 0.01], [0, H / 2, -D / 2], backMat);
  [0, ...ROWS.map((r) => r.y1)].forEach((y) => box([W, T, D], [0, y + T / 2 - (y ? 0 : 0), 0], woodMat));

  ROWS.forEach((row) => {
    const grp = new THREE.Group();
    grp.position.set(0, row.y0 + 0.002, 0);
    g.add(grp);
    shelf.rows[row.key] = { group: grp, row, items: [], offset: 0 };
  });
  buildDrawers();
  // luz quente iluminando as prateleiras
  const lamp = new THREE.PointLight('#ffd9a8', 2.2, 2.6, 1.6);
  lamp.position.set(0.1, 1.5, 0.9);
  g.add(lamp);
  // troféu (+)
  const trophy = makeTrophy();
  trophy.position.set(W / 2 - 0.12, 0, 0.03);
  shelf.rows.playlists.group.add(trophy);
}

function makeTrophy() {
  const grp = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#d4a537', metalness: 0.9, roughness: 0.25, emissive: '#3a2a05' });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.08), new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.4 }));
  base.position.y = 0.018;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.06, 12), gold);
  stem.position.y = 0.065;
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.03), gold);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.03), gold);
  bar1.position.y = bar2.position.y = 0.17;
  [base, stem, bar1, bar2].forEach((m) => { m.castShadow = true; grp.add(m); });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.12; grp.add(hit);
  interactive(grp, {
    onEnter: () => { grp.rotation.y = 0.3; showTip('<b>Criar álbum</b><br><small>monte sua capa e suas faixas</small>'); },
    onLeave: () => { grp.rotation.y = 0; hideTip(); },
    onClick: () => emit('ui:creator'),
  });
  world.onUpdate((dt, t) => { bar1.position.y = bar2.position.y = 0.17 + Math.sin(t * 2) * 0.004; });
  return grp;
}

function buildDrawers() {
  const labels = [['trash', 'Excluídos'], ['top', 'Mais tocados'], ['recent', 'Recentes']];
  const row = ROWS[0];
  const h = row.y1 - row.y0 - 0.02;
  const w = (W - T * 2) / 3 - 0.01;
  const mat = new THREE.MeshStandardMaterial({ map: toTex(wood('#6a4529', 44)), roughness: 0.6 });
  labels.forEach(([key, text], i) => {
    const grp = new THREE.Group();
    grp.position.set(-W / 2 + T + w / 2 + 0.005 + i * (w + 0.01), row.y0 + h / 2 + 0.01, 0);
    shelf.group.add(grp);
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mat);
    front.position.z = D / 2 - 0.01; front.castShadow = true;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.04, D - 0.04), new THREE.MeshStandardMaterial({ color: '#3a2615', roughness: 0.8 }));
    body.position.z = 0;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 10), new THREE.MeshStandardMaterial({ color: '#c9a35b', metalness: 0.85, roughness: 0.3 }));
    knob.position.set(0, -0.04, D / 2 + 0.008);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.06), new THREE.MeshStandardMaterial({ map: toTex(handText(text, { w: 512, h: 128, size: 70, bg: '#f1e8cf' })), roughness: 0.9 }));
    label.position.set(0, 0.06, D / 2 + 0.001);
    label.rotation.z = (i - 1) * 0.03;
    [front, body, knob, label].forEach((m) => grp.add(m));
    const drawer = { key, grp, open: 0, target: 0 };
    shelf.drawers.push(drawer);
    interactive(grp, {
      onEnter: () => { drawer.target = Math.max(drawer.target, 0.03); showTip(`<b>Gaveta: ${text}</b>`); },
      onLeave: () => { if (drawer.target < 0.1) drawer.target = 0; hideTip(); },
      onClick: () => {
        shelf.drawers.forEach((d) => { if (d !== drawer) d.target = 0; });
        drawer.target = 0.22;
        emit('ui:drawer', key);
      },
    });
  });
  world.onUpdate((dt) => shelf.drawers.forEach((d) => {
    d.open += (d.target - d.open) * Math.min(1, dt * 6);
    d.grp.position.z = d.open;
  }));
}

export function closeDrawers() { shelf.drawers.forEach((d) => { d.target = 0; }); }

/** Fileira de capas de frente, encostadas umas atrás das outras. */
function faceOutRow(rowKey, albums, { width = 0.62, size = 0.3, onClick, tip }) {
  const row = shelf.rows[rowKey];
  row.items.forEach((m) => row.group.remove(m));
  row.items = [];
  const show = albums.slice(0, 7);
  show.forEach((album, i) => {
    const m = makeSleeve(album, size);
    const k = show.length - 1 - i;
    m.position.set(-W / 2 + 0.05 + size / 2 + i * ((width - size) / Math.max(1, show.length - 1)), size / 2, -D / 2 + 0.05 + k * 0.012);
    m.rotation.x = -0.1;
    m.rotation.y = 0;
    row.group.add(m);
    row.items.push(m);
    interactive(m, {
      onEnter: () => { m.position.y = size / 2 + 0.02; showTip(tip(album)); },
      onLeave: () => { m.position.y = size / 2; hideTip(); },
      onClick: () => onClick(album),
    });
  });
}

export function fillShelf(lib) {
  faceOutRow('liked', lib.savedAlbums, {
    tip: (a) => `<b>${escapeHtml(a.name)}</b><br><small>álbum curtido · ${escapeHtml(a.artists?.[0]?.name || '')}</small>`,
    onClick: (a) => emit('ui:inspect', a),
  });
  // três suportes com singles/músicas curtidas
  const row = shelf.rows.liked;
  const singles = [];
  const seen = new Set();
  for (const t of lib.likedTracks) {
    const al = t.album; if (!al || seen.has(al.id)) continue;
    seen.add(al.id);
    if (al.type === 'single' || singles.length < 3) singles.push({ track: t, album: al });
    if (singles.length >= 3) break;
  }
  const standMat = new THREE.MeshStandardMaterial({ color: '#202020', metalness: 0.6, roughness: 0.4 });
  singles.forEach(({ track, album }, i) => {
    const grp = new THREE.Group();
    grp.position.set(W / 2 - 0.27 + i * 0.105, 0, 0.04);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.05), standMat); foot.position.y = 0.003;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.09, 0.006), standMat); back.position.set(0, 0.045, -0.02); back.rotation.x = -0.25;
    const sl = makeSleeve(album, 0.095); sl.position.set(0, 0.055, -0.005); sl.rotation.x = -0.25;
    [foot, back, sl].forEach((m) => grp.add(m));
    row.group.add(grp);
    row.items.push(grp);
    interactive(grp, {
      onEnter: () => { grp.position.y = 0.01; showTip(`<b>${escapeHtml(track.name)}</b><br><small>música curtida · ${fmtTime(track.duration)}</small>`); },
      onLeave: () => { grp.position.y = 0; hideTip(); },
      onClick: () => emit('ui:play-track', track),
    });
  });

  fillCassetteRack(lib.likedTracks);

  faceOutRow('playlists', lib.playlists, {
    width: 0.66,
    tip: (p) => `<b>${escapeHtml(p.name)}</b><br><small>playlist · ${p.totalTracks || '?'} faixas</small>`,
    onClick: (p) => emit('ui:inspect', p),
  });
}

function fillCassetteRack(tracks) {
  const row = shelf.rows.saved;
  row.items.forEach((m) => row.group.remove(m));
  row.items = [];
  const rackMat = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.5, metalness: 0.3 });
  const rack = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.012, 0.13), rackMat);
  rack.position.set(0, 0.006, 0.02);
  row.group.add(rack); row.items.push(rack);
  const r = rng(12);
  const list = tracks.slice(0, 2 * 22);
  list.forEach((t, i) => {
    const level = Math.floor(i / 22), k = i % 22;
    const [c, g] = canvas(64, 512);
    const hue = Math.floor(r() * 360);
    g.fillStyle = `hsl(${hue} 40% 22%)`; g.fillRect(0, 0, 64, 512);
    g.fillStyle = '#efe6cf'; g.fillRect(6, 20, 52, 472);
    g.save(); g.translate(40, 256); g.rotate(-Math.PI / 2); g.fillStyle = '#1a2a6b'; g.textAlign = 'center';
    let s = 36; g.font = `700 ${s}px Caveat`;
    while (g.measureText(t.name).width > 440 && s > 16) { s -= 2; g.font = `700 ${s}px Caveat`; }
    g.fillText(t.name, 0, 0); g.restore();
    const spine = new THREE.MeshStandardMaterial({ map: toTex(c), roughness: 0.6 });
    const shell = new THREE.MeshStandardMaterial({ color: `hsl(${hue}, 40%, 22%)`, roughness: 0.5 });
    const cas = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.11, 0.07), [shell, shell, shell, shell, spine, shell]);
    cas.position.set(-W / 2 + 0.07 + k * 0.038, 0.067 + level * 0.2, 0.03 - level * 0.07);
    cas.castShadow = true;
    if (level) { const shelfLip = rack.clone(); shelfLip.position.set(0, 0.2, -0.05); if (k === 0) { row.group.add(shelfLip); row.items.push(shelfLip); } }
    row.group.add(cas); row.items.push(cas);
    interactive(cas, {
      onEnter: () => { cas.position.z += 0.025; showTip(`<b>${escapeHtml(t.name)}</b><br><small>${escapeHtml(t.artists?.[0]?.name || '')} · ${fmtTime(t.duration)} · clique para tocar</small>`); },
      onLeave: () => { cas.position.z -= 0.025; hideTip(); },
      onClick: () => emit('ui:play-track', t),
    });
  });
}
