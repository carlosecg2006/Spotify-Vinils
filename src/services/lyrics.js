// Letras: LRCLIB (aberto) + letras sincronizadas por você, salvas localmente.
import { load, save } from '../store.js';

const cache = new Map();

export function parseLrc(lrc) {
  const lines = [];
  for (const raw of String(lrc || '').split(/\r?\n/)) {
    const tags = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of tags) lines.push({ time: (Number(m[1]) * 60 + Number(m[2])) * 1000, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function toLrc(lines) {
  return lines.map(({ time, text }) => {
    const s = time / 1000;
    return `[${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}]${text}`;
  }).join('\n');
}

export function getUserLyrics(track) {
  return load('lyrics', {})[track.id] || null;
}

export function saveUserLyrics(track, lrc) {
  const all = load('lyrics', {});
  all[track.id] = lrc;
  save('lyrics', all);
  cache.delete(track.id);
}

/** Retorna { synced: [{time,text}] | null, plain: string | null, source } */
export async function getLyrics(track) {
  if (!track) return null;
  if (cache.has(track.id)) return cache.get(track.id);
  const mine = getUserLyrics(track);
  if (mine) {
    const res = { synced: parseLrc(mine), plain: null, source: 'você' };
    cache.set(track.id, res);
    return res;
  }
  if (String(track.uri).startsWith('demo:')) {
    const res = { synced: null, plain: null, source: null };
    cache.set(track.id, res);
    return res;
  }
  const params = new URLSearchParams({
    track_name: track.name,
    artist_name: track.artists?.[0]?.name || '',
    album_name: track.album?.name || '',
    duration: Math.round(track.duration / 1000),
  });
  let data = null;
  try {
    const r = await fetch(`https://lrclib.net/api/get?${params}`);
    if (r.ok) data = await r.json();
    if (!data) {
      const s = await fetch(`https://lrclib.net/api/search?${new URLSearchParams({ track_name: track.name, artist_name: track.artists?.[0]?.name || '' })}`);
      if (s.ok) {
        const list = await s.json();
        data = list.find((x) => x.syncedLyrics && Math.abs(x.duration - track.duration / 1000) < 4) || list.find((x) => x.syncedLyrics) || list[0] || null;
      }
    }
  } catch (e) { console.warn('LRCLIB', e); }
  const res = {
    synced: data?.syncedLyrics ? parseLrc(data.syncedLyrics) : null,
    plain: data?.plainLyrics || null,
    instrumental: !!data?.instrumental,
    source: data ? 'LRCLIB' : null,
  };
  cache.set(track.id, res);
  return res;
}
