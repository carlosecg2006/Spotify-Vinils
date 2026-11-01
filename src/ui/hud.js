// Barra superior (voltar, local, engrenagem), dicas e avisos.
import { el } from '../util.js';
import { on } from '../store.js';

const NAMES = { desk: 'Mesa', overview: 'Sala', stack: 'Pilha de discos', search: 'Caixa de busca', inspect: 'Disco', turntable: 'Vitrola', artist: 'Caixa do artista', shelf: 'Estante' };

export function buildHud(root, { onBack, onSettings }) {
  const back = el('button', { class: 'chip', onclick: onBack, title: 'Voltar (Esc)' }, '← ', el('span', {}, 'Voltar'));
  const where = el('div', { class: 'chip' }, el('span', {}, 'Sala'));
  const gear = el('button', { class: 'gear', title: 'Configurações', 'aria-label': 'Configurações', onclick: onSettings });
  const top = el('div', { class: 'hud-top hidden' }, back, where, el('div', { class: 'spacer' }), gear);
  const hint = el('div', { class: 'hint hidden' });
  const toast = el('div', { class: 'toast' });
  root.append(top, hint, toast);
  let tt;
  on('toast', (msg) => {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 3200);
  });
  return {
    show() { top.classList.remove('hidden'); hint.classList.remove('hidden'); },
    setView(view) {
      where.firstChild.textContent = NAMES[view] || view;
      back.classList.toggle('hidden', view === 'desk' || view === 'overview');
    },
    hint(text) { hint.textContent = text; hint.style.opacity = text ? 1 : 0; },
  };
}
