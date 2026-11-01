// Conteúdo das gavetas: excluídos, mais tocados e tocados recentemente.
import { el } from '../util.js';
import { state, emit } from '../store.js';
import { getTrash, restorePlaylist } from '../data/library.js';

const TITLES = { trash: 'Excluídos', top: 'Mais tocados', recent: 'Tocados recentemente' };

export function openDrawer(root, key, { onPick, onClose }) {
  const lib = state.library;
  const items = key === 'trash' ? getTrash() : key === 'top' ? lib.topAlbums : lib.recent.map((r) => r.album);
  const grid = el('div', { class: 'drawer-grid' });
  const panel = el('div', { class: 'drawer-panel' },
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      el('h3', {}, TITLES[key]), el('button', { class: 'icon-btn', onclick: () => close() }, '✕')),
    grid);
  root.append(panel);
  if (!items.length) grid.append(el('div', { class: 'drawer-item' }, key === 'trash' ? 'Gaveta vazia. Playlists que você excluir aparecem aqui para restaurar.' : 'Nada por aqui ainda.'));
  items.forEach((a) => {
    const item = el('div', { class: 'drawer-item', onclick: () => key !== 'trash' && onPick(a) },
      a.cover ? el('img', { src: a.cover, alt: '' }) : el('div', { class: 'ph' }),
      el('div', { class: 'nm' }, a.name));
    if (key === 'trash') {
      item.append(el('button', { class: 'mini restore', onclick: async (e) => {
        e.stopPropagation();
        try { await restorePlaylist(a); item.remove(); emit('toast', `“${a.name}” voltou para a estante.`); emit('library:changed'); }
        catch (err) { emit('toast', 'Não deu para restaurar: ' + err.message); }
      } }, 'restaurar'));
    }
    grid.append(item);
  });
  function close() { panel.remove(); onClose?.(); }
  return { close };
}
