// Contracapa real via MusicBrainz + Cover Art Archive (pelo código de barras/UPC).
const cache = new Map();

export async function findBackCover(album) {
  if (!album || String(album.uri).startsWith('demo:')) return null;
  if (cache.has(album.id)) return cache.get(album.id);
  let url = null;
  try {
    const q = album.upc
      ? `barcode:${album.upc}`
      : `release:"${album.name.replace(/"/g, '')}" AND artist:"${(album.artists?.[0]?.name || '').replace(/"/g, '')}"`;
    const r = await fetch(`https://musicbrainz.org/ws/2/release?fmt=json&limit=5&query=${encodeURIComponent(q)}`);
    const data = r.ok ? await r.json() : null;
    for (const rel of data?.releases || []) {
      const c = await fetch(`https://coverartarchive.org/release/${rel.id}`);
      if (!c.ok) continue;
      const art = await c.json();
      const back = art.images?.find((im) => im.back || im.types?.includes('Back'));
      if (back) { url = (back.thumbnails?.large || back.image).replace(/^http:/, 'https:'); break; }
    }
  } catch (e) { console.warn('contracapa', e); }
  cache.set(album.id, url);
  return url;
}
