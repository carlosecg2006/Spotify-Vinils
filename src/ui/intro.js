// Tela de entrada: preencher dados do Spotify Premium + barra de progresso.
import { el } from '../util.js';
import { getClientId, setClientId, beginLogin, redirectUri } from '../spotify/auth.js';

export function showIntro(root, { onDemo, error } = {}) {
  const wrap = el('div', { class: 'intro' });
  const card = el('div', { class: 'intro-card' });
  wrap.append(card);
  root.append(wrap);

  const idInput = el('input', { id: 'cid', placeholder: 'Cole aqui o Client ID do seu app', value: getClientId(), autocomplete: 'off', spellcheck: 'false' });
  const err = el('div', { class: 'error' }, error || '');
  const form = el('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const id = idInput.value.trim();
      if (!/^[a-f0-9]{32}$/i.test(id)) { err.textContent = 'O Client ID tem 32 letras e números (painel do Spotify for Developers).'; return; }
      setClientId(id);
      beginLogin(id);
    },
  },
  el('div', { class: 'field' },
    el('label', { for: 'cid' }, 'Client ID do seu app Spotify'),
    idInput,
    el('div', { class: 'copy' }, 'Redirect URI:', el('code', {}, redirectUri()),
      el('button', { type: 'button', class: 'mini', onclick: () => navigator.clipboard?.writeText(redirectUri()) }, 'copiar'))),
  el('details', { class: 'help' },
    el('summary', {}, 'Como pegar o Client ID (1 minuto)'),
    el('ol', {},
      el('li', { html: 'Entre em <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> com sua conta <b>Premium</b>.' }),
      el('li', {}, 'Crie um app, marque “Web API” e “Web Playback SDK”.'),
      el('li', {}, 'Em Redirect URIs, cole o endereço acima.'),
      el('li', {}, 'Copie o Client ID e cole aqui. Nenhuma senha passa por este site.'))),
  err,
  el('button', { class: 'btn btn-primary', type: 'submit' }, 'Entrar com Spotify Premium'));

  card.append(
    el('div', { class: 'brand' }, el('div', { class: 'brand-disc' }), 'Spotify Vinils'),
    el('p', {}, 'Sua música num espaço físico: vitrola, pilhas de discos, caixas de fitas e uma estante só sua.'),
    form,
    el('button', { class: 'link', onclick: () => onDemo?.() }, 'Explorar a sala em modo demo →'),
  );

  return {
    loading(label = 'Preparando a sala') {
      card.classList.add('loading');
      card.innerHTML = '';
      this.fill = el('div', { class: 'progress-fill' });
      this.pct = el('span', {}, '0%');
      this.label = el('span', {}, label);
      card.append(
        el('div', { class: 'brand' }, el('div', { class: 'brand-disc' }), 'Montando sua coleção'),
        el('div', { class: 'progress' }, el('div', { class: 'progress-bar' }, this.fill), el('div', { class: 'progress-row' }, this.label, this.pct)),
      );
    },
    progress(p, label) {
      if (!this.fill) return;
      this.fill.style.width = `${Math.round(p * 100)}%`;
      this.pct.textContent = `${Math.round(p * 100)}%`;
      if (label) this.label.textContent = label;
    },
    done() { wrap.classList.add('gone'); setTimeout(() => wrap.remove(), 900); },
    error(msg) { err.textContent = msg; },
  };
}
