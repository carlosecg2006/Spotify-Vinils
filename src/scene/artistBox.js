// Caixa do artista: nome à caneta, polaroid com fita, cassetes do mais novo (frente) ao mais antigo (fundo).
import * as THREE from 'three';
import { world, interactive } from './world.js';
import { cardboard, toTex, canvas, handText } from './textures.js';
import { makeCassette } from './sleeve.js';
import { DESK_Y } from './desk.js';
import { emit } from '../store.js';
import { showTip, hideTip } from '../ui/tooltip.js';
import { escapeHtml, clamp, releaseYear } from '../util.js';
import { loadImage, paletteFrom } from '../services/colors.js';

const BOX = { w: 0.34, h: 0.17, d: 0.3 };
const SLOTS = 8;            // a caixa sempre parece cheia
const GAP = 0.034;

export const artistBox = { group: null, front: null, slots: [], albums: [], scroll: 0, scrollTarget: 0, artist: null, active: false, colors: new Map() };

export function buildArtistBox(parent) {
  const g = new THREE.Group();
  g.position.set(0.45, DESK_Y, -0.16);
  parent.add(g);
  artistBox.group = g;
  const tex = toTex(cardboard(17, 512, 512, '#a77e4f'));
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide });
  const innerMat = new THREE.MeshStandardMaterial({ map: tex, color: '#5b4128', roughness: 1, side: THREE.DoubleSide });
  const t = 0.006;
  const parts = [
    [[BOX.w, t, BOX.d], [0, t / 2, 0], innerMat],
    [[BOX.w, BOX.h, t], [0, BOX.h / 2, -BOX.d / 2], innerMat],
    [[t, BOX.h, BOX.d], [-BOX.w / 2, BOX.h / 2, 0], mat],
    [[t, BOX.h, BOX.d], [BOX.w / 2, BOX.h / 2, 0], mat],
  ];
  parts.forEach(([s, p, m]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...s), m); b.position.set(...p); b.castShadow = b.receiveShadow = true; g.add(b); });
  // frente com nome e polaroid (textura própria)
  const frontMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h * 0.72, t), [mat, mat, mat, mat, frontMat, mat]);
  front.position.set(0, BOX.h * 0.36, BOX.d / 2);
  front.castShadow = true;
  g.add(front);
  artistBox.frontMat = frontMat;
  // sombra interna: escurece o fundo da caixa
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(BOX.w - 0.01, BOX.d - 0.01), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float a = smoothstep(.0,1.,vUv.y)*.85; gl_FragColor=vec4(0.,0.,0.,a); }',
  }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = BOX.h + 0.001;
  shadow.renderOrder = 5;
  shadow.visible = false;
  g.add(shadow);
  artistBox.shadowLid = shadow;

  const slotsGrp = new THREE.Group();
  g.add(slotsGrp);
  artistBox.slotsGrp = slotsGrp;

  const hit = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = BOX.h / 2;
  g.add(hit);
  interactive(hit, {
    onClick: () => artistBox.artist && emit('ui:artist', artistBox.artist),
    onEnter: () => showTip(artistBox.artist ? `<b>Caixa: ${escapeHtml(artistBox.artist.name)}</b><br><small>clique para abrir</small>` : 'Caixa do artista · clique no nome do artista na vitrola'),
    onLeave: hideTip,
    onWheel: (dy) => artistBox.active && scrollBy(dy),
  });
  artistBox.hit = hit;
  drawFront(null);

  world.onUpdate((dt) => {
    artistBox.scroll += (artistBox.scrollTarget - artistBox.scroll) * Math.min(1, dt * 8);
    layoutSlots();
  });
}

async function drawFront(artist, photoUrl) {
  const [c, g] = canvas(1024, 512);
  const card = cardboard(23, 1024, 512, '#a77e4f');
  g.drawImage(card, 0, 0);
  g.fillStyle = '#111'; g.textBaseline = 'middle';
  let s = 120; g.font = `400 ${s}px "Permanent Marker"`;
  const name = artist?.name || 'artista';
  while (g.measureText(name).width > 560 && s > 30) { s -= 4; g.font = `400 ${s}px "Permanent Marker"`; }
  g.save(); g.translate(60, 270); g.rotate(-0.04); g.fillText(name, 0, 0); g.restore();
  // polaroid
  g.save(); g.translate(800, 250); g.rotate(0.07);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.fillStyle = '#f7f5ef'; g.fillRect(-150, -190, 300, 360);
  g.shadowColor = 'transparent';
  g.fillStyle = '#222'; g.fillRect(-130, -170, 260, 260);
  if (photoUrl) { try { const img = await loadImage(photoUrl); g.drawImage(img, -130, -170, 260, 260); } catch { /* sem foto */ } }
  g.fillStyle = '#333'; g.font = '700 40px Caveat'; g.textAlign = 'center';
  g.fillText(name.length > 16 ? name.slice(0, 15) + '…' : name, 0, 130);
  // fita adesiva
  g.fillStyle = 'rgba(240,232,190,.8)';
  g.save(); g.translate(0, -195); g.rotate(-0.12); g.fillRect(-80, -22, 160, 44); g.restore();
  g.restore();
  artistBox.frontMat.map?.dispose();
  artistBox.frontMat.map = toTex(c);
  artistBox.frontMat.needsUpdate = true;
}

/** Carrega um artista na caixa. */
export async function setArtist(artist, albums) {
  artistBox.artist = artist;
  artistBox.albums = albums;
  artistBox.scroll = artistBox.scrollTarget = 0;
  drawFront(artist, artist.image);
  artistBox.slotsGrp.clear();
  artistBox.slots = [];
  for (let k = 0; k < Math.min(SLOTS + 1, albums.length); k++) {
    const holder = new THREE.Group();
    artistBox.slotsGrp.add(holder);
    artistBox.slots.push({ holder, index: -1, cassette: null });
  }
  layoutSlots(true);
  // cores das cassetes a partir das capas (assíncrono)
  albums.slice(0, 40).forEach(async (a) => {
    if (artistBox.colors.has(a.id)) return;
    const p = await paletteFrom(a.coverSmall || a.cover);
    artistBox.colors.set(a.id, p[0]);
    artistBox.slots.forEach((s) => { if (s.index >= 0 && artistBox.albums[s.index]?.id === a.id && s.cassette) s.cassette.userData.base.set(p[0]); });
  });
}

function scrollBy(dy) {
  const max = Math.max(0, artistBox.albums.length - 1);
  artistBox.scrollTarget = clamp(artistBox.scrollTarget + Math.sign(dy) * 1, 0, max);
}

export function scrollArtist(step) { scrollBy(step); }

function layoutSlots() {
  const n = artistBox.slots.length;
  if (!n) return;
  const base = Math.floor(artistBox.scroll);
  const frac = artistBox.scroll - base;
  artistBox.slots.forEach((slot, k) => {
    const idx = base + k;
    const album = artistBox.albums[idx];
    if (slot.index !== idx) {
      slot.holder.clear();
      slot.index = idx;
      slot.cassette = null;
      if (album) {
        const cas = makeCassette(album, artistBox.colors.get(album.id) || '#3a3a3a');
        cas.rotation.x = 0.85; // em pé, inclinada para mostrar a fita de cima
        cas.scale.setScalar(2.3);
        cas.userData.base = cas.userData.shell.color.clone();
        slot.holder.add(cas);
        slot.cassette = cas;
        interactive(cas, {
          onEnter: () => { cas.position.y = 0.012; showTip(`<b>${escapeHtml(album.name)}</b><br><small>${releaseYear(album.release)} · ${album.type === 'single' ? 'single' : 'álbum'} · clique para ver</small>`); },
          onLeave: () => { cas.position.y = 0; hideTip(); },
          onClick: () => emit('ui:inspect', album),
          onWheel: (dy) => scrollBy(dy),
        });
      }
    }
    const pos = k - frac; // 0 = frente
    const z = BOX.d / 2 - 0.035 - pos * GAP;
    const out = pos < 0; // a da frente saindo ao folhear
    slot.holder.position.set(0, 0.075 + (out ? -pos * 0.1 : 0), z - 0.02 + (out ? -pos * 0.03 : 0));
    slot.holder.rotation.x = out ? pos * 0.6 : 0;
    const depth = clamp(pos / SLOTS, 0, 1);
    const shade = 1 - depth * 0.85;
    if (slot.cassette) {
      slot.cassette.visible = pos > -1 && pos < SLOTS;
      slot.cassette.userData.label.color.setScalar(shade);
      slot.cassette.userData.shell.color.copy(slot.cassette.userData.base).multiplyScalar(shade);
      slot.cassette.userData.enabled = artistBox.active && pos >= -0.2;
    }
  });
}

export function setArtistBoxActive(active) {
  artistBox.active = active;
  artistBox.hit.userData.enabled = !active;
}
