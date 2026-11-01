// Biblioteca fictícia para o modo demo (sem conta). Capas geradas em canvas.
import { rng, hashStr } from '../util.js';

const ARTISTS = [
  { name: 'Lua Marinho', palette: ['#f4a259', '#5b8e7d', '#f4e285'] },
  { name: 'Os Satélites', palette: ['#1d3557', '#e63946', '#f1faee'] },
  { name: 'Nina Quasar', palette: ['#7b2cbf', '#ff9e00', '#240046'] },
  { name: 'Velho Farol', palette: ['#283618', '#dda15e', '#fefae0'] },
  { name: 'Clara Neon', palette: ['#ff006e', '#3a86ff', '#ffbe0b'] },
  { name: 'Tarde Azul', palette: ['#0077b6', '#90e0ef', '#03045e'] },
  { name: 'Rádio Cometa', palette: ['#2b2d42', '#ef233c', '#edf2f4'] },
  { name: 'Mel & Asfalto', palette: ['#bc6c25', '#606c38', '#fefae0'] },
];

const W1 = ['Noite', 'Céu', 'Mar', 'Cidade', 'Vento', 'Fogo', 'Sonho', 'Janela', 'Estrada', 'Neon', 'Lua', 'Verão', 'Chuva', 'Rádio', 'Ouro', 'Vidro', 'Eco', 'Sal', 'Areia', 'Prisma'];
const W2 = ['Partida', 'Elétrica', 'de Papel', 'Sem Fim', 'Distante', 'Lenta', 'Dourada', 'Quebrada', 'Selvagem', 'Secreta', 'em Chamas', 'de Vidro', 'Azul', 'Infinita', 'Perdida', 'Vermelha'];
const T1 = ['Me Leva', 'Volta Pra Mim', 'Nada Igual', 'Tudo Bem', 'Fica', 'Corre', 'Respira', 'Dança', 'Sem Você', 'Outra Vez', 'Hoje Não', 'Carta', 'Ponte', 'Miragem', 'Abraço', 'Reflexo', 'Telefone', 'Domingo', 'Satélite', 'Pulso', 'Maré', 'Faísca'];

function drawCover(seed, palette, title, artist) {
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const [a, b, d] = palette;
  const grad = g.createLinearGradient(0, 0, 512 * r(), 512);
  grad.addColorStop(0, a); grad.addColorStop(1, b);
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  const style = Math.floor(r() * 4);
  g.globalAlpha = 0.9;
  if (style === 0) {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = [a, b, d][i % 3];
      g.beginPath(); g.arc(r() * 512, r() * 512, 40 + r() * 160, 0, Math.PI * 2); g.fill();
    }
  } else if (style === 1) {
    for (let i = 0; i < 14; i++) {
      g.fillStyle = i % 2 ? d : b; g.fillRect(0, i * 38 + r() * 10, 512, 14 + r() * 10);
    }
  } else if (style === 2) {
    g.fillStyle = d; g.beginPath(); g.arc(256, 280, 150, 0, Math.PI * 2); g.fill();
    g.fillStyle = a; g.fillRect(0, 300, 512, 212);
  } else {
    g.strokeStyle = d; g.lineWidth = 6;
    for (let i = 0; i < 20; i++) { g.beginPath(); g.arc(256, 256, 20 + i * 18, r() * 6, r() * 6 + 4); g.stroke(); }
  }
  g.globalAlpha = 1;
  // ruído de papel
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 410, 512, 102);
  g.fillStyle = '#fff';
  g.font = 'bold 40px Inter, sans-serif'; g.fillText(title.toUpperCase().slice(0, 20), 26, 460);
  g.font = '26px Inter, sans-serif'; g.fillText(artist, 26, 494);
  return c.toDataURL('image/jpeg', 0.85);
}

function makeArtistPhoto(seed, palette, name) {
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = palette[2]; g.fillRect(0, 0, 256, 256);
  g.fillStyle = palette[0]; g.beginPath(); g.arc(128, 100, 52, 0, Math.PI * 2); g.fill();
  g.fillStyle = palette[1]; g.beginPath(); g.ellipse(128, 250, 100, 90, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.15)';
  for (let i = 0; i < 30; i++) g.fillRect(r() * 256, r() * 256, 2, 2);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.font = 'bold 18px Inter'; g.fillText(name.split(' ')[0], 12, 26);
  return c.toDataURL('image/jpeg', 0.85);
}

let cache = null;

export function buildDemoLibrary() {
  if (cache) return cache;
  const artists = [];
  const albums = [];
  ARTISTS.forEach((def, ai) => {
    const seed = hashStr(def.name);
    const r = rng(seed);
    const artist = { id: 'demo-ar-' + ai, uri: 'demo:artist:' + ai, name: def.name, image: makeArtistPhoto(seed, def.palette, def.name) };
    artists.push(artist);
    const count = 3 + Math.floor(r() * 4);
    for (let k = 0; k < count; k++) {
      const title = `${W1[Math.floor(r() * W1.length)]} ${W2[Math.floor(r() * W2.length)]}`;
      const year = 2026 - k * (1 + Math.floor(r() * 3)) - Math.floor(r() * 2);
      const isSingle = r() < 0.25;
      const pal = [...def.palette].sort(() => r() - 0.5);
      const id = `demo-al-${ai}-${k}`;
      const n = isSingle ? 1 + Math.floor(r() * 2) : 8 + Math.floor(r() * 6);
      const tracks = Array.from({ length: n }, (_, i) => ({
        id: `${id}-t${i}`,
        uri: `demo:track:${id}:${i}`,
        name: isSingle && i === 0 ? title : T1[Math.floor(r() * T1.length)] + (r() < 0.2 ? ' (ao vivo)' : ''),
        duration: Math.round((150 + r() * 140) * 1000),
        number: i + 1,
        disc: 1,
        explicit: r() < 0.1,
        artists: [artist],
        albumId: id,
      }));
      albums.push({
        id, uri: 'demo:album:' + id, name: title,
        type: isSingle ? 'single' : 'album',
        cover: drawCover(seed + k * 97, pal, title, def.name),
        release: `${year}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
        artists: [artist], totalTracks: n, tracks,
        hasBack: r() < 0.4,
      });
    }
  });
  const r = rng(42);
  const pick = (arr, n) => [...arr].sort(() => r() - 0.5).slice(0, n);
  const recent = pick(albums.filter((a) => a.type === 'album'), 7).map((album) => ({
    album, played: pick(album.tracks, 1 + Math.floor(r() * 4)),
  }));
  const likedTracks = pick(albums.flatMap((a) => a.tracks), 40);
  const playlists = ['Estrada à noite', 'Domingo lento', 'Treino', 'Pra chorar no banho'].map((name, i) => ({
    id: 'demo-pl-' + i, uri: 'demo:playlist:' + i, name, type: 'playlist',
    cover: drawCover(900 + i, ARTISTS[i * 2].palette, name, 'Playlist'),
    artists: [{ name: 'Você' }], description: '', tracks: pick(likedTracks, 8 + i * 2), totalTracks: 8 + i * 2,
  }));
  cache = {
    user: { id: 'demo', name: 'Visitante', image: null },
    artists, albums, recent,
    savedAlbums: pick(albums, 12),
    likedTracks,
    playlists,
    followed: pick(artists, 5),
    topAlbums: pick(albums, 8),
  };
  return cache;
}
