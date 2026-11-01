// Player translúcido: faixa, letra ao vivo, duração e botões. Inclui sincronizar letra e marcar BPM.
import { el, fmtTime, escapeHtml } from '../util.js';
import { player } from '../spotify/player.js';
import { on, load, save, emit } from '../store.js';
import { getLyrics, parseLrc, toLrc, saveUserLyrics } from '../services/lyrics.js';

let current = null;

export function getBpm(track) { return track ? load('bpm', {})[track.id] : null; }

export function openNowPlaying(root) {
  if (current) { current.refresh(); return current; }
  const box = el('div', { class: 'np' });
  const img = el('img', { alt: '' });
  const title = el('div', { class: 't' });
  const sub = el('div', { class: 's' });
  const lyrics = el('div', { class: 'np-lyrics' });
  const pos = el('span', {}, '0:00');
  const dur = el('span', {}, '0:00');
  const seek = el('input', { type: 'range', min: 0, max: 1000, value: 0 });
  let seeking = false;
  seek.addEventListener('input', () => { seeking = true; pos.textContent = fmtTime((seek.value / 1000) * player.duration); });
  seek.addEventListener('change', () => { seeking = false; player.seek((seek.value / 1000) * player.duration); });
  const btn = (txt, title2, fn, cls = 'icon-btn') => el('button', { class: cls, title: title2, onclick: fn }, txt);
  const playBtn = btn('▶', 'Tocar/pausar', () => player.toggle(), 'icon-btn big');
  const shuf = btn('⤮', 'Aleatório', () => player.setShuffle(!player.shuffle));
  const rep = btn('↻', 'Repetir', () => player.setRepeat({ off: 'context', context: 'track', track: 'off' }[player.repeat]));
  const tap = el('button', { class: 'mini', title: 'Toque no ritmo da música para as luzes baterem certinho' }, 'marcar BPM');
  const syncBtn = el('button', { class: 'mini', title: 'Sincronize a letra você mesmo' }, 'sincronizar letra');
  box.append(
    el('div', { class: 'np-head' }, img, el('div', { class: 'meta' }, title, sub),
      el('button', { class: 'icon-btn', title: 'Fechar', onclick: () => close() }, '✕')),
    lyrics,
    el('div', { class: 'np-time' }, pos, seek, dur),
    el('div', { class: 'np-ctrls' }, shuf, btn('⏮', 'Anterior', () => player.prev()), playBtn, btn('⏭', 'Próxima', () => player.next()), rep),
    el('div', { class: 'np-ctrls', style: { paddingTop: 0 } }, tap, syncBtn),
  );
  root.append(box);

  let lines = null, lastOn = -1, trackId = null;
  async function loadLyrics() {
    const t = player.current;
    trackId = t?.id;
    lines = null; lastOn = -1;
    lyrics.innerHTML = '<div class="empty">procurando a letra…</div>';
    if (!t) { lyrics.innerHTML = '<div class="empty">nada tocando</div>'; return; }
    const res = await getLyrics(t);
    if (trackId !== t.id) return;
    lyrics.innerHTML = '';
    if (res?.synced?.length) {
      lines = res.synced;
      lines.forEach((l, i) => lyrics.append(el('div', { class: 'l', onclick: () => player.seek(l.time), 'data-i': i }, l.text || '♪')));
      lyrics.append(el('div', { class: 'empty' }, `letra sincronizada · ${res.source}`));
    } else if (res?.plain) {
      res.plain.split('\n').forEach((l) => lyrics.append(el('div', { class: 'l past' }, l || ' ')));
      lyrics.append(el('div', { class: 'empty' }, 'letra sem tempo (LRCLIB). Que tal sincronizar? Fica salva e vale para as próximas vezes.'));
    } else if (res?.instrumental) {
      lyrics.innerHTML = '<div class="empty">♫ instrumental ♫</div>';
    } else {
      lyrics.innerHTML = '<div class="empty">Ninguém escreveu essa letra ainda.<br>Cole a letra em “sincronizar letra” e marque o tempo de cada verso.</div>';
    }
  }

  function refresh() {
    const t = player.current;
    if (t?.id !== trackId) loadLyrics();
    img.src = t?.album?.coverSmall || t?.album?.cover || '';
    title.textContent = t?.name || '—';
    sub.textContent = t ? `${t.artists?.map((a) => a.name).join(', ')} · ${t.album?.name || ''}` : '';
    playBtn.textContent = player.playing ? '❚❚' : '▶';
    shuf.classList.toggle('on', player.shuffle);
    rep.classList.toggle('on', player.repeat !== 'off');
    rep.textContent = player.repeat === 'track' ? '↻1' : '↻';
  }

  function tick() {
    dur.textContent = fmtTime(player.duration);
    if (!seeking) { pos.textContent = fmtTime(player.position); seek.value = player.duration ? (player.position / player.duration) * 1000 : 0; }
    if (!lines) return;
    let i = -1;
    for (let k = 0; k < lines.length; k++) { if (lines[k].time <= player.position + 150) i = k; else break; }
    if (i !== lastOn) {
      lastOn = i;
      lyrics.querySelectorAll('.l').forEach((n, k) => { n.classList.toggle('on', k === i); n.classList.toggle('past', k < i); });
      const node = lyrics.querySelector(`.l[data-i="${i}"]`);
      if (node) lyrics.scrollTop = node.offsetTop - lyrics.clientHeight / 2 + node.clientHeight / 2;
    }
  }

  // marcar BPM tocando no ritmo
  let taps = [];
  tap.addEventListener('click', () => {
    const now = performance.now();
    taps = taps.filter((x) => now - x < 3000);
    taps.push(now);
    if (taps.length >= 4) {
      const gaps = taps.slice(1).map((x, i) => x - taps[i]);
      const bpm = Math.round(60000 / (gaps.reduce((s, g) => s + g, 0) / gaps.length));
      const all = load('bpm', {}); all[player.current.id] = bpm; save('bpm', all);
      tap.textContent = `${bpm} BPM ✓`;
      emit('bpm', bpm);
    } else tap.textContent = `toque mais ${4 - taps.length}…`;
  });
  syncBtn.addEventListener('click', () => player.current && openSync(root, player.current, () => { trackId = null; refresh(); }));

  refresh(); tick();
  const offs = [on('player:state', refresh), on('player:track', refresh), on('player:tick', tick)];
  function close() { offs.forEach((f) => f()); box.remove(); current = null; }
  current = { refresh, close, el: box };
  return current;
}

export function closeNowPlaying() { current?.close(); }

/** Ferramenta para sincronizar a letra: cole a letra, dê play e toque espaço a cada verso. */
function openSync(root, track, onDone) {
  const back = el('div', { class: 'sync' });
  const area = el('textarea', { class: 'input', placeholder: 'Cole a letra aqui, um verso por linha' });
  const cur = el('div', { class: 'cur' });
  const next = el('div', { class: 'next' });
  const status = el('div', { class: 'next' });
  const startBtn = el('button', { class: 'btn btn-primary' }, 'Começar: toque ESPAÇO a cada verso');
  const exportBtn = el('button', { class: 'btn btn-ghost' }, 'Baixar .lrc');
  const cancel = el('button', { class: 'btn btn-ghost', onclick: () => end() }, 'Fechar');
  back.append(el('div', { class: 'sync-card' },
    el('b', {}, `Sincronizar “${track.name}”`),
    el('div', { class: 'next', html: 'Muitas músicas antigas nunca ganharam letra ao vivo. Aqui você faz a sua: ela fica salva no navegador e você pode baixar o arquivo <b>.lrc</b> para enviar ao LRCLIB e ajudar todo mundo.' }),
    area, cur, next, status,
    el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, startBtn, exportBtn, cancel)));
  root.append(back);
  getLyrics(track).then((r) => { area.value = r?.plain || (r?.synced || []).map((l) => l.text).join('\n'); });

  let verses = [], stamps = [], k = 0, running = false;
  function show() { cur.textContent = verses[k] ?? '✓ pronto!'; next.textContent = verses[k + 1] ?? ''; status.textContent = `${k}/${verses.length}`; }
  startBtn.addEventListener('click', () => {
    verses = area.value.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!verses.length) return;
    stamps = []; k = 0; running = true;
    area.classList.add('hidden');
    player.seek(0); player.resume();
    show();
  });
  function onKey(e) {
    if (!running || e.code !== 'Space') return;
    e.preventDefault();
    stamps.push({ time: Math.max(0, player.position - 120), text: verses[k] });
    k++; show();
    if (k >= verses.length) { running = false; saveUserLyrics(track, toLrc(stamps)); status.textContent = 'Letra salva! Ela já aparece no player.'; }
  }
  window.addEventListener('keydown', onKey);
  exportBtn.addEventListener('click', () => {
    const lrc = stamps.length ? toLrc(stamps) : toLrc(parseLrc(area.value));
    const blob = new Blob([`[ti:${track.name}]\n[ar:${track.artists?.[0]?.name || ''}]\n${lrc}`], { type: 'text/plain' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `${track.name}.lrc` });
    a.click();
  });
  function end() { window.removeEventListener('keydown', onKey); back.remove(); onDone?.(); }
  void escapeHtml;
}
