// Wrapper fino da Spotify Web API. Todo campo é tratado como opcional.
import { getAccessToken } from './auth.js';

const BASE = 'https://api.spotify.com/v1';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function api(path, { method = 'GET', body, query, raw } = {}) {
  const token = await getAccessToken();
  if (!token) throw new ApiError(401, 'Sem sessão');
  const url = new URL(path.startsWith('http') ? path : BASE + path);
  if (query) Object.entries(query).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
        ...(raw ? { 'Content-Type': 'image/jpeg' } : {}),
      },
      body: raw ? body : body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') || 1);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (res.status === 204 || res.status === 202) return null;
    const text = await res.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!res.ok) throw new ApiError(res.status, json?.error?.message || `Erro ${res.status}`);
    return json;
  }
  throw new ApiError(429, 'Limite de requisições');
}

/** Pagina um endpoint até `max` itens. */
export async function paged(path, { max = 50, limit = 50, query = {} } = {}) {
  const out = [];
  let url = path;
  let q = { limit, ...query };
  while (url && out.length < max) {
    const page = await api(url, { query: q });
    const container = page?.items ? page : page?.artists || page?.albums || page;
    out.push(...(container?.items || []));
    url = container?.next || null;
    q = undefined;
  }
  return out.slice(0, max);
}

// Normalização ----------------------------------------------------------
export function normImages(images) {
  const list = (images || []).slice().sort((a, b) => (b.width || 0) - (a.width || 0));
  return { large: list[0]?.url || null, small: list[list.length - 1]?.url || list[0]?.url || null };
}

export function normArtist(a) {
  if (!a) return null;
  return { id: a.id, name: a.name, uri: a.uri, image: normImages(a.images).large };
}

export function normTrack(t, album) {
  if (!t) return null;
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    duration: t.duration_ms || 0,
    number: t.track_number || 0,
    disc: t.disc_number || 1,
    explicit: !!t.explicit,
    artists: (t.artists || []).map(normArtist),
    albumId: album?.id || t.album?.id,
    isrc: t.external_ids?.isrc,
  };
}

export function normAlbum(a) {
  if (!a) return null;
  const imgs = normImages(a.images);
  return {
    id: a.id,
    uri: a.uri,
    name: a.name,
    type: a.album_type || 'album',
    cover: imgs.large,
    coverSmall: imgs.small,
    release: a.release_date || '',
    artists: (a.artists || []).map(normArtist),
    totalTracks: a.total_tracks || a.tracks?.total || 0,
    upc: a.external_ids?.upc,
    tracks: a.tracks?.items ? a.tracks.items.map((t) => normTrack(t, a)) : null,
  };
}

export function normPlaylist(p) {
  if (!p) return null;
  const imgs = normImages(p.images);
  return {
    id: p.id,
    uri: p.uri,
    name: p.name,
    type: 'playlist',
    cover: imgs.large,
    coverSmall: imgs.small,
    description: p.description || '',
    owner: p.owner?.display_name,
    artists: [{ name: p.owner?.display_name || 'Você' }],
    totalTracks: p.items?.total ?? p.tracks?.total ?? 0,
    tracks: null,
  };
}
