// Fonte de dados única: Spotify real ou modo demo, mesma interface.
import { api, paged, normAlbum, normTrack, normArtist, normPlaylist } from '../spotify/api.js';
import { buildDemoLibrary } from './demo.js';
import { state, load, save } from '../store.js';
import { sleep } from '../util.js';

const albumCache = new Map();

const isDemo = () => state.mode === 'demo';

/** Carrega tudo o que a sala precisa. onProgress(0..1, label, coverUrls[]). */
export async function loadLibrary(onProgress) {
  if (isDemo()) return loadDemo(onProgress);
  const steps = [];
  const lib = { user: null, recent: [], savedAlbums: [], likedTracks: [], playlists: [], followed: [], topAlbums: [], artists: [] };
  const report = (i, label, covers = []) => onProgress((i + 1) / steps.length, label, covers);

  steps.push(['Lendo seu perfil', async () => {
    const me = await api('/me');
    lib.user = { id: me.id, name: me.display_name || me.id, image: me.images?.[0]?.url };
    return [];
  }]);
  steps.push(['Pegando os discos tocados recentemente', async () => {
    const items = await paged('/me/player/recently-played', { max: 50, limit: 50 });
    const byAlbum = new Map();
    for (const it of items) {
      const t = it.track; if (!t?.album) continue;
      if (!byAlbum.has(t.album.id)) byAlbum.set(t.album.id, { album: normAlbum(t.album), played: [] });
      const entry = byAlbum.get(t.album.id);
      if (!entry.played.find((p) => p.id === t.id)) entry.played.push(normTrack(t));
    }
    lib.recent = [...byAlbum.values()].slice(0, 12);
    return lib.recent.map((r) => r.album.coverSmall || r.album.cover);
  }]);
  steps.push(['Tirando da estante os álbuns curtidos', async () => {
    const items = await paged('/me/albums', { max: 40 });
    lib.savedAlbums = items.map((i) => normAlbum(i.album)).filter(Boolean);
    lib.savedAlbums.forEach((a) => a.tracks && albumCache.set(a.id, a));
    return lib.savedAlbums.map((a) => a.coverSmall);
  }]);
  steps.push(['Separando as músicas curtidas', async () => {
    const items = await paged('/me/tracks', { max: 50 });
    lib.likedTracks = items.map((i) => ({ ...normTrack(i.track), album: normAlbum(i.track.album) }));
    return lib.likedTracks.map((t) => t.album?.coverSmall);
  }]);
  steps.push(['Organizando suas playlists', async () => {
    const items = await paged('/me/playlists', { max: 40 });
    lib.playlists = items.map(normPlaylist).filter(Boolean);
    return lib.playlists.map((p) => p.coverSmall);
  }]);
  steps.push(['Juntando ingressos dos artistas seguidos', async () => {
    const items = await paged('/me/following', { max: 30, query: { type: 'artist' } });
    lib.followed = items.map(normArtist);
    return lib.followed.map((a) => a.image);
  }]);
  steps.push(['Contando os mais tocados', async () => {
    const items = await paged('/me/top/tracks', { max: 50, query: { time_range: 'medium_term' } });
    const seen = new Map();
    items.forEach((t) => t.album && !seen.has(t.album.id) && seen.set(t.album.id, normAlbum(t.album)));
    lib.topAlbums = [...seen.values()].slice(0, 16);
    return lib.topAlbums.map((a) => a.coverSmall);
  }]);

  for (let i = 0; i < steps.length; i++) {
    const [label, fn] = steps[i];
    onProgress(i / steps.length, label, []);
    try { report(i, label, (await fn()).filter(Boolean)); }
    catch (e) {
      console.warn(label, e);
      if (e.status === 401 || e.status === 403) {
        if (i === 0) throw e;
      }
      report(i, label + ' (indisponível)', []);
    }
  }
  return lib;
}

async function loadDemo(onProgress) {
  const lib = buildDemoLibrary();
  lib.albums.forEach((a) => albumCache.set(a.id, a));
  lib.playlists.forEach((p) => albumCache.set(p.id, p));
  const labels = ['Ligando as luzes', 'Abrindo as caixas', 'Tirando a poeira dos discos', 'Afinando a vitrola', 'Pendurando as capas'];
  const chunk = Math.ceil(lib.albums.length / labels.length);
  for (let i = 0; i < labels.length; i++) {
    await sleep(380);
    onProgress((i + 1) / labels.length, labels[i], lib.albums.slice(i * chunk, (i + 1) * chunk).map((a) => a.cover));
  }
  return lib;
}

export async function getAlbum(id) {
  if (albumCache.has(id) && albumCache.get(id).tracks) return albumCache.get(id);
  if (isDemo()) return albumCache.get(id);
  const raw = await api(`/albums/${id}`);
  const album = normAlbum(raw);
  if (raw.tracks?.next) {
    const rest = await paged(raw.tracks.next, { max: 200 });
    album.tracks.push(...rest.map((t) => normTrack(t, raw)));
  }
  album.tracks.forEach((t) => { t.album = album; });
  albumCache.set(id, album);
  return album;
}

export async function getPlaylist(id) {
  if (albumCache.has(id) && albumCache.get(id).tracks) return albumCache.get(id);
  if (isDemo()) return albumCache.get(id);
  const raw = await api(`/playlists/${id}`);
  const pl = normPlaylist(raw);
  const itemsPage = raw.items || raw.tracks;
  let items = itemsPage?.items || [];
  if (itemsPage?.next) items = items.concat(await paged(itemsPage.next, { max: 300 }));
  pl.tracks = items.map((i) => i.item || i.track).filter((t) => t && t.type !== 'episode')
    .map((t) => ({ ...normTrack(t), album: normAlbum(t.album) }));
  albumCache.set(id, pl);
  return pl;
}

export async function getCollection(item) {
  return item.type === 'playlist' ? getPlaylist(item.id) : getAlbum(item.id);
}

/** Busca para a caixa: até 10 álbuns (inclui os álbuns das faixas encontradas). */
export async function searchAlbums(q) {
  if (isDemo()) {
    const lib = buildDemoLibrary();
    const s = q.toLowerCase();
    return lib.albums.filter((a) => a.name.toLowerCase().includes(s)
      || a.artists[0].name.toLowerCase().includes(s)
      || a.tracks.some((t) => t.name.toLowerCase().includes(s))).slice(0, 10);
  }
  const res = await api('/search', { query: { q, type: 'album,track', limit: 10 } });
  const out = new Map();
  (res.tracks?.items || []).slice(0, 5).forEach((t) => t.album && out.set(t.album.id, normAlbum(t.album)));
  (res.albums?.items || []).forEach((a) => !out.has(a.id) && out.set(a.id, normAlbum(a)));
  return [...out.values()].slice(0, 10);
}

/** Busca "normal" de músicas (barra sempre visível). */
export async function searchTracks(q, offset = 0) {
  if (isDemo()) {
    const lib = buildDemoLibrary();
    const s = q.toLowerCase();
    return lib.albums.flatMap((a) => a.tracks.map((t) => ({ ...t, album: a })))
      .filter((t) => t.name.toLowerCase().includes(s) || t.artists[0].name.toLowerCase().includes(s))
      .slice(offset, offset + 10);
  }
  const res = await api('/search', { query: { q, type: 'track', limit: 10, offset } });
  return (res.tracks?.items || []).map((t) => ({ ...normTrack(t), album: normAlbum(t.album) }));
}

export async function getArtist(id) {
  if (isDemo()) return buildDemoLibrary().artists.find((a) => a.id === id);
  return normArtist(await api(`/artists/${id}`));
}

export async function getArtistAlbums(id) {
  if (isDemo()) {
    return buildDemoLibrary().albums.filter((a) => a.artists[0].id === id)
      .sort((a, b) => b.release.localeCompare(a.release));
  }
  const items = await paged(`/artists/${id}/albums`, { max: 200, limit: 10, query: { include_groups: 'album,single' } });
  const seen = new Set();
  return items.map(normAlbum).filter((a) => {
    const key = a.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => b.release.localeCompare(a.release));
}

const followCache = new Map();
export async function isFollowing(artist) {
  if (isDemo()) return load('demoFollow', {})[artist.id] ?? !!state.library?.followed.find((f) => f.id === artist.id);
  if (followCache.has(artist.id)) return followCache.get(artist.id);
  try {
    const res = await api('/me/library/contains', { query: { uris: artist.uri } });
    const v = Array.isArray(res) ? !!res[0] : false;
    followCache.set(artist.id, v);
    return v;
  } catch { return false; }
}

export async function setFollowing(artist, follow) {
  if (isDemo()) {
    const m = load('demoFollow', {}); m[artist.id] = follow; save('demoFollow', m);
  } else {
    await api('/me/library', { method: follow ? 'PUT' : 'DELETE', query: { uris: artist.uri } });
    followCache.set(artist.id, follow);
  }
  const lib = state.library;
  if (follow && !lib.followed.find((a) => a.id === artist.id)) lib.followed.unshift(artist);
  if (!follow) lib.followed = lib.followed.filter((a) => a.id !== artist.id);
}

/** Cria playlist (álbum feito por você). imageB64: JPEG base64 sem prefixo. */
export async function createPlaylist({ name, description, tracks, imageDataUrl }) {
  if (isDemo()) {
    const pl = { id: 'demo-pl-' + Date.now(), uri: 'demo:playlist:new', name, description, type: 'playlist', cover: imageDataUrl, artists: [{ name: 'Você' }], tracks, totalTracks: tracks.length };
    albumCache.set(pl.id, pl);
    return pl;
  }
  const raw = await api('/me/playlists', { method: 'POST', body: { name, description, public: false } });
  const uris = tracks.map((t) => t.uri).filter(Boolean);
  for (let i = 0; i < uris.length; i += 100) {
    await api(`/playlists/${raw.id}/items`, { method: 'POST', body: { uris: uris.slice(i, i + 100) } });
  }
  if (imageDataUrl) {
    try { await api(`/playlists/${raw.id}/images`, { method: 'PUT', body: imageDataUrl.split(',')[1], raw: true }); }
    catch (e) { console.warn('Capa não enviada', e); }
  }
  const pl = { ...normPlaylist(raw), cover: imageDataUrl || null, tracks, totalTracks: tracks.length };
  albumCache.set(pl.id, pl);
  return pl;
}

/** "Excluir" = deixar de seguir. Fica guardado na gaveta para restaurar. */
export async function deletePlaylist(pl) {
  if (!isDemo()) await api('/me/library', { method: 'DELETE', query: { uris: pl.uri } });
  const trash = load('trash', []);
  trash.unshift({ ...pl, tracks: null, deletedAt: Date.now() });
  save('trash', trash.slice(0, 30));
  state.library.playlists = state.library.playlists.filter((p) => p.id !== pl.id);
}

export async function restorePlaylist(pl) {
  if (!isDemo()) await api('/me/library', { method: 'PUT', query: { uris: pl.uri } });
  save('trash', load('trash', []).filter((p) => p.id !== pl.id));
  state.library.playlists.unshift(pl);
}

export function getTrash() { return load('trash', []); }

/** Álbuns clicados recentemente (para a caixa de busca). */
export function rememberClicked(album) {
  const list = load('clicked', []).filter((a) => a.id !== album.id);
  list.unshift({ ...album, tracks: null, cover: album.cover?.startsWith('data:') ? null : album.cover });
  save('clicked', list.slice(0, 10));
}

export function getClicked() {
  const list = load('clicked', []);
  const lib = state.library;
  if (isDemo()) return list.map((a) => albumCache.get(a.id)).filter(Boolean).concat(lib.savedAlbums).slice(0, 10);
  return list.filter((a) => a.cover).concat(lib.recent.map((r) => r.album)).filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i).slice(0, 10);
}
