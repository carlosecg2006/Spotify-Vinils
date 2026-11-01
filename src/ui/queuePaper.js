// Papel amassado da fila: controles a lápis, círculo desenhado quando ativo, arrastar e borracha.
import { el, fmtTime, escapeHtml } from '../util.js';
import { player } from '../spotify/player.js';
import { on } from '../store.js';

const CIRCLE = '<svg class="circle" viewBox="0 0 100 50" preserveAspectRatio="none"><path d="M12,28 C10,10 40,4 62,6 C88,8 98,20 92,34 C86,46 50,48 28,44 C10,40 4,30 14,18"/></svg>';
const STRIKE = '<svg class="strike" viewBox="0 0 300 6" preserveAspectRatio="none"><path d="M0,3 C40,1 80,5 120,3 C160,1 200,5 240,2 C260,3 280,4 300,3"/></svg>';
const ERASER = '<svg viewBox="0 0 32 32"><g transform="rotate(-30 16 16)"><rect x="5" y="10" width="22" height="12" rx="2" fill="#f19aa4" stroke="#333" stroke-width="1.4"/><rect x="5" y="10" width="8" height="12" rx="2" fill="#3b6fd1" stroke="#333" stroke-width="1.4"/></g></svg>';

export function openQueuePaper(root, onClose) {
  const back = el('div', { class: 'modal-back', onclick: (e) => e.target === back && close() });
  const paper = el('div', { class: 'paper' });
  back.append(paper);
  root.append(back);

  const ctrl = (label, title, fn, isOn) => {
    const b = el('button', { class: 'pencil-btn', title, onclick: fn });
    b.innerHTML = escapeHtml(label) + (isOn ? CIRCLE : '');
    return b;
  };

  const controls = el('div', { class: 'controls' });
  const list = el('ul', { class: 'qlist' });
  const foot = el('div', { class: 'foot' });
  paper.append(el('h3', {}, 'Fila'), controls, list, foot);

  function drawControls() {
    controls.innerHTML = '';
    controls.append(
      ctrl('⏮ volta', 'Retroceder', () => player.prev()),
      ctrl(player.playing ? '❚❚ pausa' : '▶ toca', player.playing ? 'Pausar' : 'Iniciar', () => player.toggle(), player.playing),
      ctrl('avança ⏭', 'Avançar', () => player.next()),
      ctrl('⤮ aleatório', 'Ordem aleatória', () => player.setShuffle(!player.shuffle), player.shuffle),
      ctrl('↻ repete 1', 'Repetir a mesma música', () => player.setRepeat(player.repeat === 'track' ? 'off' : 'track'), player.repeat === 'track'),
      ctrl('↻ repete álbum', 'Repetir a ordem do álbum', () => player.setRepeat(player.repeat === 'context' ? 'off' : 'context'), player.repeat === 'context'),
    );
  }

  let dragFrom = null;
  function drawList() {
    list.innerHTML = '';
    if (!player.queue.length) list.append(el('li', { class: 'qitem' }, el('span'), el('span', { class: 'title' }, 'nada por aqui… escolha um disco')));
    player.queue.forEach((t, i) => {
      const li = el('li', { class: 'qitem' + (i === player.index ? ' current' : ''), draggable: 'false' });
      const handle = el('span', { class: 'handle', title: 'Segure e arraste para reordenar' }, '≡');
      const title = el('span', { class: 'title', title: t.name, onclick: () => player.jumpTo(i) }, (i === player.index ? '▶ ' : '') + t.name);
      const eraser = el('button', { class: 'eraser', title: 'Apagar da fila', html: ERASER });
      li.append(handle, title, el('span', { class: 'dur' }, fmtTime(t.duration)), eraser);
      li.insertAdjacentHTML('beforeend', STRIKE + '<span class="rubber"></span>');
      // arrastar só pelo puxador
      handle.addEventListener('pointerdown', () => { li.draggable = true; });
      li.addEventListener('dragstart', (e) => { dragFrom = i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      li.addEventListener('dragend', () => { li.draggable = false; li.classList.remove('dragging'); list.querySelectorAll('.drop-above').forEach((x) => x.classList.remove('drop-above')); });
      li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drop-above'); });
      li.addEventListener('dragleave', () => li.classList.remove('drop-above'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragFrom == null || dragFrom === i) return;
        player.move(dragFrom, dragFrom < i ? i - 1 : i);
        dragFrom = null;
      });
      eraser.addEventListener('click', () => {
        li.classList.add('erasing', 'erased');
        setTimeout(() => player.remove(player.queue.indexOf(t)), 1500);
      });
      list.append(li);
    });
    const total = player.queue.reduce((s, t) => s + t.duration, 0);
    foot.innerHTML = `<span>${player.queue.length} músicas</span><span>${fmtTime(total)}</span>`;
    list.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
  }

  drawControls(); drawList();
  const offs = [on('player:state', drawControls), on('player:queue', drawList), on('player:track', drawList)];
  const onKey = (e) => e.key === 'Escape' && close();
  window.addEventListener('keydown', onKey);
  function close() { offs.forEach((f) => f()); window.removeEventListener('keydown', onKey); back.remove(); onClose?.(); }
  return { close };
}
