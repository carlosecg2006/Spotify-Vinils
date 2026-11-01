// Spotify Vinils: liga a sala 3D, os dados e as interfaces.
import * as THREE from 'three';
import { world } from './scene/world.js';
import { buildRoom, feedSphere, setNowPlayingAmbience, beat, room } from './scene/room.js';
import { buildDesk, fillStack, fanStack, fillTickets, fillSearchBox, setSearchBoxActive, VIEWS, desk } from './scene/desk.js';
import { buildArtistBox, setArtist, setArtistBoxActive, scrollArtist } from './scene/artistBox.js';
import { buildShelf, fillShelf, closeDrawers, shelf } from './scene/shelf.js';
import { buildSpeakers, speakerBeat } from './scene/speakers.js';
import { buildInspect, showInspect, closeInspect, toggleDisc, discOnly, flipSleeve, refreshBack } from './scene/inspect.js';
import { turntable, loadDisc } from './scene/turntable.js';
import { initTooltip, hideTip } from './ui/tooltip.js';
import { showIntro } from './ui/intro.js';
import { buildHud } from './ui/hud.js';
import { openQueuePaper } from './ui/queuePaper.js';
import { openNowPlaying, getBpm } from './ui/nowPlaying.js';
import { openAlbumPanel } from './ui/albumPanel.js';
import { openBoxSearch, openGlobalSearch } from './ui/search.js';
import { openArtistHead } from './ui/artistHead.js';
import { openDrawer } from './ui/drawer.js';
import { openSettings } from './ui/settings.js';
import { openCreator } from './ui/creator.js';
import { handleRedirect, hasSession } from './spotify/auth.js';
import { player } from './spotify/player.js';
import { loadLibrary, getCollection, getAlbum, getArtistAlbums, getArtist, rememberClicked, getClicked, deletePlaylist } from './data/library.js';
import { paletteFrom } from './services/colors.js';
import { state, settings, on, emit } from './store.js';
import { ease, sleep } from './util.js';

const ui = document.getElementById('ui');
world.init(document.getElementById('stage'));
initTooltip(ui);
buildRoom();
buildInspect();

const furniture = new THREE.Group();
world.scene.add(furniture);
buildDesk(furniture);
buildArtistBox(desk.group);
buildShelf(furniture);
buildSpeakers(furniture);
furniture.visible = false;

const hud = buildHud(ui, { onBack: () => goBack(), onSettings: () => openSettings(ui) });

// ------------------------------------------------------------------ início
let intro;
async function boot() {
  let error = null;
  try {
    if (await handleRedirect()) state.mode = 'spotify';
  } catch (e) { error = e.message; }
  if (state.mode !== 'spotify' && hasSession() && !error) state.mode = 'spotify';
  intro = showIntro(ui, { onDemo: () => { state.mode = 'demo'; start(); }, error });
  if (state.mode === 'spotify') start();
}

async function start() {
  intro.loading();
  let lib;
  try {
    lib = await loadLibrary((p, label, covers) => {
      intro.progress(p, label);
      feedSphere(covers, p);
    });
  } catch (e) {
    console.error(e);
    state.mode = 'boot';
    intro.done();
    const msg = e.status === 403
      ? 'Sua conta não está liberada neste app. No painel do Spotify, adicione seu e-mail em “User Management”.'
      : `Não consegui carregar sua biblioteca (${e.message}).`;
    intro = showIntro(ui, { onDemo: () => { state.mode = 'demo'; start(); }, error: msg });
    return;
  }
  state.library = lib;
  feedSphere([], 1);
  intro.progress(1, 'Pronto!');
  await sleep(700);
  intro.done();
  await revealRoom();
  fillStack(lib.recent);
  fillTickets(lib.followed);
  fillShelf(lib);
  fillSearchBox(getClicked());
  setSearchBoxActive(false);
  player.init();
  hud.show();
  setView('desk');
  updateGlobalSearch();
  if (state.mode === 'demo') emit('toast', 'Modo demo: tudo funciona, mas sem áudio. Entre com Spotify Premium para tocar de verdade.');
}

async function revealRoom() {
  furniture.visible = true;
  furniture.position.y = -1.2;
  const t0 = performance.now();
  world.goTo(VIEWS.overview, 2.2);
  await new Promise((res) => {
    const stop = world.onUpdate(() => {
      const k = Math.min(1, (performance.now() - t0) / 1800);
      furniture.position.y = -1.2 * (1 - ease(k));
      if (k >= 1) { stop(); res(); }
    });
  });
}

// ------------------------------------------------------------------ vistas
let viewUi = [];       // coisas a fechar ao trocar de vista
let prevView = 'desk';
let globalSearch = null;

function clearViewUi() { viewUi.forEach((c) => c.close?.()); viewUi = []; hideTip(); }

const HINTS = {
  desk: 'Clique na pilha, na vitrola, no papel da fila, na caixa “busque aqui” ou na estante · role para afastar',
  overview: 'Role para chegar perto da mesa',
  stack: 'Passe o mouse para ver as músicas tocadas · clique para ver o disco',
  search: 'Pesquise no topo · os 10 álbuns aparecem dentro da caixa',
  turntable: 'Clique na agulha para tocar do começo ou arraste até a faixa · passe o mouse nos pontos',
  artist: 'Role sobre a caixa para folhear as fitas (das mais novas às mais antigas)',
  shelf: 'Curtidos, fitas salvas, playlists, o troféu (+) para criar e as gavetas embaixo',
};

function setView(view) {
  if (view === state.view && view !== 'artist') return;
  const from = state.view;
  if (from === 'inspect') { inspectPanel?.close(); inspectPanel = null; closeInspect(); }
  else prevView = from;
  clearViewUi();
  if (from === 'stack') fanStack(false);
  if (from === 'search') setSearchBoxActive(false);
  if (from === 'artist') setArtistBoxActive(false);
  if (from === 'shelf') closeDrawers();
  state.view = view;
  hud.setView(view);
  hud.hint(HINTS[view] || '');
  if (VIEWS[view]) world.goTo(VIEWS[view], 1.1);
  if (view === 'stack') fanStack(true);
  if (view === 'search') {
    setSearchBoxActive(true);
    fillSearchBox(getClicked());
    setSearchBoxActive(true);
    viewUi.push(openBoxSearch(ui, { onResults: (albums) => {
      if (!albums.length) { emit('toast', 'Nada encontrado. Tente outro nome.'); return; }
      fillSearchBox(albums); setSearchBoxActive(true);
    } }));
  }
  if (view === 'artist') setArtistBoxActive(true);
  updateGlobalSearch();
}

function goBack() {
  if (state.view === 'inspect') { closeInspectView(); return; }
  setView('desk');
}

function updateGlobalSearch() {
  const want = settings.alwaysSearch && state.library && state.view !== 'search';
  if (want && !globalSearch) {
    globalSearch = openGlobalSearch(ui, { onPick: (tr, how) => {
      if (how === 'queue') { player.addToQueue(tr); emit('toast', `“${tr.name}” entrou na fila.`); return; }
      playTrack(tr, { quick: true });
    } });
  }
  if (!want && globalSearch) { globalSearch.close(); globalSearch = null; }
}
on('settings', ({ key }) => key === 'alwaysSearch' && updateGlobalSearch());

// ------------------------------------------------------------------ inspeção
let inspectPanel = null;
async function openInspect(item) {
  if (!item) return;
  if (item.type !== 'playlist') rememberClicked(item);
  if (state.view !== 'inspect') prevView = state.view;
  clearViewUi();
  state.view = 'inspect';
  hud.setView('inspect');
  hud.hint('Arraste para girar · frente e verso · “Abrir” tira o disco da capa');
  let collection = item;
  const isOwnPlaylist = item.type === 'playlist';
  const play = async (index = 0) => {
    collection = await getCollection(collection);
    await putOnTurntable(collection);
    player.playList(collection.tracks, index, collection);
    closeInspectView('desk');
  };
  showInspect(item, { onTrack: (i) => play(i) });
  inspectPanel = openAlbumPanel(ui, item, {
    onPlay: () => play(0),
    onTrack: (i) => play(i),
    onOpenDisc: (mode, v) => (mode === 'toggle' ? toggleDisc() : discOnly(v)),
    onFlip: () => flipSleeve(),
    onDelete: isOwnPlaylist ? async () => {
      try { await deletePlaylist(collection); fillShelf(state.library); emit('toast', `“${collection.name}” foi para a gaveta de excluídos.`); closeInspectView(); }
      catch (e) { emit('toast', 'Não deu para excluir: ' + e.message); }
    } : null,
  });
  try {
    collection = await getCollection(item);
    if (state.view === 'inspect' && inspectPanel) { inspectPanel.update(collection); refreshBack(collection); }
  } catch (e) { emit('toast', 'Não consegui abrir as faixas: ' + e.message); }
}

function closeInspectView(next) {
  inspectPanel?.close(); inspectPanel = null;
  closeInspect();
  state.view = 'inspect-closing';
  setView(next || prevView || 'desk');
}

// ------------------------------------------------------------------ tocar
async function putOnTurntable(collection, opts = {}) {
  if (turntable.collection?.id === collection.id) return;
  const palette = await paletteFrom(collection.cover);
  await loadDisc(collection, palette, opts);
}

async function playTrack(track, { quick = false } = {}) {
  try {
    const album = track.album?.id ? await getAlbum(track.album.id) : null;
    if (album?.tracks?.length) {
      const i = Math.max(0, album.tracks.findIndex((t) => t.id === track.id || t.name === track.name));
      putOnTurntable(album, { quick });
      await player.playList(album.tracks, i, album);
    } else {
      await player.playList([track], 0, track.album);
    }
  } catch (e) { emit('toast', 'Não deu para tocar: ' + e.message); }
}

on('player:track', async (t) => {
  if (!t) return;
  const album = player.context || t.album;
  const palette = await paletteFrom(t.album?.cover || album?.cover);
  setNowPlayingAmbience(t.album || album, palette);
  // troca rápida de disco se a música veio de outro lugar
  if (player.context && turntable.collection?.id !== player.context.id && player.context.tracks) putOnTurntable(player.context, { quick: true });
});
on('player:error', (msg) => emit('toast', msg));

// batida: luzes e caixas de som no BPM
let beatPhase = 0;
world.onUpdate((dt) => {
  if (!player.playing) return;
  const bpm = getBpm(player.current) || settings.defaultBpm;
  beatPhase += dt * (bpm / 60);
  if (beatPhase >= 1) {
    beatPhase -= 1;
    const strong = Math.round(player.position / (60000 / bpm)) % 4 === 0;
    beat(strong ? 1 : 0.55);
    speakerBeat(strong ? 1 : 0.6);
  }
});
world.onUpdate(() => { room.beatEnergy = player.playing ? 0.4 + player.volume * 0.6 : 0; });

// ------------------------------------------------------------------ eventos da cena
on('ui:view', (v) => setView(v));
on('ui:inspect', (album) => openInspect(album));
on('ui:queue', () => { const p = openQueuePaper(ui); viewUi.push(p); });
on('ui:nowplaying', () => { if (!player.current) { emit('toast', 'Nada tocando ainda. Clique na agulha!'); return; } openNowPlaying(ui); });
on('ui:turntable-click', async () => {
  if (!turntable.collection) {
    const first = state.library?.recent?.[0]?.album || state.library?.savedAlbums?.[0];
    if (!first) { emit('toast', 'Escolha um disco na pilha ou na caixa “busque aqui”.'); return; }
    setView('turntable');
    const full = await getCollection(first);
    await putOnTurntable(full);
    emit('toast', 'Disco na vitrola! Clique na agulha para tocar.');
  } else setView('turntable');
});
on('ui:artist', async (artist) => {
  try {
    const full = (artist.image ? artist : await getArtist(artist.id)) || artist;
    const albums = await getArtistAlbums(artist.id);
    if (!albums.length) { emit('toast', 'Não achei a discografia desse artista.'); return; }
    await setArtist(full, albums);
    setView('artist');
    viewUi.push(openArtistHead(ui, full, { onScroll: (d) => scrollArtist(d), onRefreshTickets: () => fillTickets(state.library.followed) }));
  } catch (e) { emit('toast', 'Não deu para abrir a caixa: ' + e.message); }
});
on('ui:play-track', (t) => playTrack(t));
on('ui:drawer', (key) => {
  if (state.view !== 'shelf') setView('shelf');
  viewUi.forEach((c) => c.isDrawer && c.close());
  const d = openDrawer(ui, key, { onPick: (a) => openInspect(a), onClose: () => closeDrawers() });
  d.isDrawer = true;
  viewUi.push(d);
});
on('ui:creator', () => openCreator(ui, { onCreated: (pl) => { state.library.playlists.unshift(pl); fillShelf(state.library); } }));
on('library:changed', () => fillShelf(state.library));

// clique na estante (fora dos itens) leva para a vista da estante
world.onEmptyClick = () => {};
world.onWheel = (e) => {
  if (!state.library) return;
  if (state.view === 'desk' && e.deltaY > 0) setView('overview');
  else if (state.view === 'overview' && e.deltaY < 0) setView('desk');
};

// atalhos de teclado
window.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (typing || !state.library) return;
  if (e.key === 'Escape') goBack();
  if (e.code === 'Space') { e.preventDefault(); player.toggle(); }
  if (e.key === 'ArrowRight' && e.shiftKey) player.next();
  if (e.key === 'ArrowLeft' && e.shiftKey) player.prev();
});

// estante: clique no móvel → aproxima
{
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 0.36), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.925, 0.0);
  shelf.group.add(hit);
  hit.userData.interactive = true;
  hit.userData.onClick = () => state.view !== 'shelf' && setView('shelf');
  world.onUpdate(() => { hit.userData.enabled = state.view !== 'shelf'; });
}

boot();

// depuração no console (apenas em desenvolvimento)
if (import.meta.env.DEV) window.__sv = { world, room, turntable, player, state, emit, setView, openInspect, desk, shelf };
