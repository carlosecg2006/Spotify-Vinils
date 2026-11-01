// Configurações num papel, escritas a lápis.
import { el } from '../util.js';
import { settings, setSetting, state } from '../store.js';
import { logout } from '../spotify/auth.js';

export function openSettings(root) {
  const back = el('div', { class: 'modal-back', onclick: (e) => e.target === back && close() });
  const paper = el('div', { class: 'paper settings' });
  back.append(paper);
  root.append(back);

  const check = (key) => {
    const b = el('button', { class: 'check' + (settings[key] ? ' on' : ''), 'aria-pressed': String(!!settings[key]) });
    b.addEventListener('click', () => { setSetting(key, !settings[key]); b.classList.toggle('on', settings[key]); });
    return b;
  };
  const select = (key, opts) => {
    const s = el('select', {}, ...opts.map(([v, l]) => el('option', { value: v, selected: settings[key] === v }, l)));
    s.addEventListener('change', () => setSetting(key, s.value));
    return s;
  };
  const row = (label, ctl) => el('div', { class: 'row' }, el('span', {}, label), ctl);
  const bpm = el('input', { type: 'number', min: 50, max: 220, value: settings.defaultBpm });
  bpm.addEventListener('change', () => setSetting('defaultBpm', Number(bpm.value) || 112));
  const fog = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings.fogDensity });
  fog.addEventListener('input', () => setSetting('fogDensity', Number(fog.value)));

  paper.append(
    el('h3', {}, 'Configurações'),
    row('Barra de pesquisa sempre visível', check('alwaysSearch')),
    row('Estilo do vinil', select('vinylStyle', [['classic', 'preto clássico'], ['marble', 'marmorizado'], ['splatter', 'respingado'], ['clear', 'transparente'], ['color', 'colorido']])),
    row('Luzes batendo no ritmo', check('beatLights')),
    row('BPM padrão (sem marcação)', bpm),
    row('Capa no fundo da esfera', check('coverBackdrop')),
    row('Névoa no chão', fog),
    row('Menos movimento', check('reduceMotion')),
    row('Qualidade gráfica', select('quality', [['high', 'alta'], ['low', 'leve']])),
    el('div', { class: 'row' }, el('span', {}, state.mode === 'demo' ? 'Modo demo' : `Conectado: ${state.library?.user?.name || ''}`),
      el('button', { class: 'pencil-btn', onclick: () => { logout(); location.reload(); } }, state.mode === 'demo' ? 'entrar' : 'sair')),
    el('div', { class: 'foot' }, el('span', {}, 'Conteúdo e capas via Spotify · letras via LRCLIB'), el('button', { class: 'pencil-btn', onclick: () => close() }, 'fechar')),
  );
  const onKey = (e) => e.key === 'Escape' && close();
  window.addEventListener('keydown', onKey);
  function close() { window.removeEventListener('keydown', onKey); back.remove(); }
  return { close };
}
