// Lista de faixas flutuando ao lado do disco em destaque.
import { el, fmtTime, releaseYear } from '../util.js';
import { player } from '../spotify/player.js';
import { on } from '../store.js';
import { splitSides } from '../scene/turntable.js';

export function openAlbumPanel(root, album, { onPlay, onTrack, onOpenDisc, onFlip, onDelete, onClose }) {
  const panel = el('div', { class: 'album-panel' });
  const list = el('div', { class: 'tracks' });
  const openBtn = el('button', { class: 'btn btn-ghost' }, 'Abrir');
  const discBtn = el('button', { class: 'btn btn-ghost hidden' }, 'Só o disco');
  let opened = false, discOnly = false;
  openBtn.addEventListener('click', () => {
    opened = onOpenDisc('toggle');
    openBtn.textContent = opened ? 'Guardar disco' : 'Abrir';
    discBtn.classList.toggle('hidden', !opened);
    if (!opened && discOnly) { discOnly = false; onOpenDisc('only', false); discBtn.textContent = 'Só o disco'; }
  });
  discBtn.addEventListener('click', () => { discOnly = !discOnly; onOpenDisc('only', discOnly); discBtn.textContent = discOnly ? 'Mostrar capa' : 'Só o disco'; });
  const sub = album.type === 'playlist'
    ? `Playlist${album.owner ? ' · ' + album.owner : ''}`
    : `${album.artists?.map((a) => a.name).join(', ')} · ${releaseYear(album.release)}`;
  panel.append(
    el('header', {}, el('h2', {}, album.name), el('div', { class: 'sub' }, sub)),
    el('div', { class: 'album-actions' },
      el('button', { class: 'btn btn-play', onclick: () => onPlay() }, '▶ Tocar'),
      openBtn, discBtn,
      el('button', { class: 'btn btn-ghost', onclick: () => onFlip() }, 'Virar'),
      onDelete ? el('button', { class: 'btn btn-ghost', onclick: () => onDelete() }, 'Excluir') : null),
    list,
  );
  root.append(panel);

  function draw() {
    list.innerHTML = '';
    const tracks = album.tracks;
    if (!tracks) { list.append(el('div', { class: 'track side' }, 'carregando faixas…')); return; }
    const [a, b] = splitSides(tracks);
    const sides = b.length ? [['LADO A', a], ['LADO B', b]] : [['', a]];
    let i = 0;
    for (const [label, ts] of sides) {
      if (label) list.append(el('div', { class: 'track side' }, el('span'), el('span', {}, label)));
      for (const t of ts) {
        const idx = i++;
        list.append(el('div', {
          class: 'track' + (player.current?.id === t.id ? ' playing' : ''),
          onclick: () => onTrack(idx),
        }, el('span', { class: 'n' }, String(idx + 1)), el('span', { class: 'name' }, t.name), el('span', { class: 'd' }, fmtTime(t.duration))));
      }
    }
  }
  draw();
  const off = on('player:track', draw);
  return {
    update(a) { album = a; draw(); },
    close() { off(); panel.remove(); onClose?.(); },
  };
}
