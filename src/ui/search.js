// Barras de pesquisa: a da caixa (10 álbuns físicos) e a global (5 resultados por vez, rolagem).
import { el, fmtTime } from '../util.js';
import { searchAlbums, searchTracks } from '../data/library.js';

export function openBoxSearch(root, { onResults }) {
  const input = el('input', { class: 'input', placeholder: 'Busque um álbum, artista ou música…', autocomplete: 'off' });
  const bar = el('form', { class: 'searchbar', onsubmit: (e) => { e.preventDefault(); run(); } }, input);
  root.append(bar);
  setTimeout(() => input.focus(), 300);
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 500); });
  async function run() {
    const q = input.value.trim();
    if (q.length < 2) return;
    try { onResults(await searchAlbums(q)); } catch (e) { console.warn(e); }
  }
  return { close() { bar.remove(); } };
}

export function openGlobalSearch(root, { onPick }) {
  const input = el('input', { class: 'input', placeholder: 'O que você quer ouvir?', autocomplete: 'off' });
  const results = el('div', { class: 'results hidden' });
  const bar = el('form', { class: 'searchbar', onsubmit: (e) => e.preventDefault() }, input, results);
  root.append(bar);
  let t, q = '', offset = 0, loading = false, done = false;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => run(true), 350); });
  input.addEventListener('focus', () => results.children.length && results.classList.remove('hidden'));
  document.addEventListener('pointerdown', (e) => { if (!bar.contains(e.target)) results.classList.add('hidden'); });
  results.addEventListener('scroll', () => {
    if (results.scrollTop + results.clientHeight > results.scrollHeight - 40) run(false);
  });
  async function run(reset) {
    if (reset) { q = input.value.trim(); offset = 0; done = false; results.innerHTML = ''; }
    if (!q || loading || done) { if (!q) results.classList.add('hidden'); return; }
    loading = true;
    try {
      const list = await searchTracks(q, offset);
      if (q !== input.value.trim()) return;
      offset += list.length;
      if (list.length < 10) done = true;
      list.forEach((tr) => results.append(el('div', { class: 'result', onclick: () => { results.classList.add('hidden'); onPick(tr, 'play'); } },
        el('img', { src: tr.album?.coverSmall || tr.album?.cover || '', alt: '' }),
        el('div', { class: 'meta' }, el('div', { class: 't' }, tr.name), el('div', { class: 's' }, `${tr.artists?.map((a) => a.name).join(', ')} · ${tr.album?.name || ''}`)),
        el('div', { class: 'd' }, fmtTime(tr.duration)),
        el('button', { class: 'mini', type: 'button', title: 'Adicionar à fila', onclick: (e) => { e.stopPropagation(); onPick(tr, 'queue'); } }, '+ fila'))));
      results.classList.toggle('hidden', !results.children.length);
    } catch (e) { console.warn(e); } finally { loading = false; }
  }
  return { el: bar, close() { bar.remove(); }, show(v) { bar.classList.toggle('hidden', !v); } };
}
