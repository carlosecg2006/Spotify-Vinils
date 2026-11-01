// Topo central no modo Caixa do Artista: foto, nome e seguir.
import { el } from '../util.js';
import { isFollowing, setFollowing } from '../data/library.js';
import { emit } from '../store.js';

export function openArtistHead(root, artist, { onScroll, onRefreshTickets }) {
  const follow = el('button', { class: 'follow' }, '…');
  const head = el('div', { class: 'artist-head' }, el('img', { src: artist.image || '', alt: '' }), el('span', { class: 'name' }, artist.name), follow);
  const nav = el('div', { class: 'artist-nav' },
    el('button', { class: 'icon-btn', title: 'Mais novos', onclick: () => onScroll(-1) }, '▲'),
    el('button', { class: 'icon-btn', title: 'Mais antigos', onclick: () => onScroll(1) }, '▼'));
  root.append(head, nav);
  let state = false;
  const draw = () => { follow.textContent = state ? 'Seguindo' : 'Seguir'; follow.classList.toggle('on', state); };
  isFollowing(artist).then((v) => { state = v; draw(); });
  follow.addEventListener('click', async () => {
    try { state = !state; draw(); await setFollowing(artist, state); onRefreshTickets?.(); emit('toast', state ? `Seguindo ${artist.name}: ingresso na mesa!` : `Você deixou de seguir ${artist.name}.`); }
    catch (e) { state = !state; draw(); emit('toast', 'Não deu para atualizar: ' + e.message); }
  });
  return { close() { head.remove(); nav.remove(); } };
}
