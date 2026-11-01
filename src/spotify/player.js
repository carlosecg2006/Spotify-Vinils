// Motor de reprodução: fila própria + backend (Web Playback SDK ou simulado).
import { api } from './api.js';
import { getAccessToken } from './auth.js';
import { emit, state, load, save } from '../store.js';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

export const player = {
  queue: [],          // faixas (com .album)
  index: -1,
  playing: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',      // off | track | context
  volume: load('volume', 0.7),
  context: null,      // álbum/playlist atual
  deviceId: null,
  ready: false,
  error: null,
  _order: [],         // ordem de reprodução quando shuffle
  _tick: 0,
  _lastUpdate: performance.now(),
  _sdk: null,

  get current() { return this.queue[this.index] || null; },

  async init() {
    if (state.mode === 'demo') { this.ready = true; this._startClock(); return; }
    this._startClock();
    try { await this._initSdk(); }
    catch (e) {
      this._pollRemote();
      console.warn('SDK indisponível, usando controle remoto (Connect)', e);
      this.error = 'Não deu para tocar aqui no navegador. Vou controlar outro aparelho seu pelo Spotify Connect.';
      emit('player:error', this.error);
    }
  },

  _initSdk() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout SDK')), 15000);
      window.onSpotifyWebPlaybackSDKReady = () => {
        const sdk = new window.Spotify.Player({
          name: 'Spotify Vinils',
          getOAuthToken: async (cb) => cb(await getAccessToken()),
          volume: this.volume,
        });
        sdk.addListener('ready', ({ device_id }) => {
          clearTimeout(timeout);
          this.deviceId = device_id; this.ready = true; this._sdk = sdk;
          emit('player:ready', device_id); resolve();
        });
        sdk.addListener('not_ready', () => { this.ready = false; });
        sdk.addListener('initialization_error', ({ message }) => reject(new Error(message)));
        sdk.addListener('authentication_error', ({ message }) => reject(new Error(message)));
        sdk.addListener('account_error', () => reject(new Error('É preciso Spotify Premium para tocar no navegador.')));
        sdk.addListener('player_state_changed', (s) => this._onSdkState(s));
        sdk.connect();
      };
      if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
        const s = document.createElement('script'); s.src = SDK_URL; s.async = true; document.head.append(s);
      }
    });
  },

  _onSdkState(s) {
    if (!s) return;
    const uri = s.track_window?.current_track?.uri;
    const linked = s.track_window?.current_track?.linked_from?.uri;
    const i = this.queue.findIndex((t) => t.uri === uri || t.uri === linked);
    if (i >= 0 && i !== this.index) { this.index = i; emit('player:track', this.current); }
    this.playing = !s.paused;
    this.position = s.position;
    this.duration = s.duration;
    this._lastUpdate = performance.now();
    emit('player:state', this);
  },

  /** Sem SDK: lê o estado do aparelho ativo de tempos em tempos. */
  _pollRemote() {
    if (this._polling) return;
    this._polling = setInterval(async () => {
      if (this._sdk || document.hidden) return;
      try {
        const s = await api('/me/player');
        if (!s?.item) return;
        const i = this.queue.findIndex((t) => t.uri === s.item.uri);
        if (i >= 0 && i !== this.index) { this.index = i; emit('player:track', this.current); }
        this.playing = !!s.is_playing;
        this.position = s.progress_ms || 0;
        this.duration = s.item.duration_ms || this.duration;
        this._lastUpdate = performance.now();
        emit('player:state', this);
      } catch { /* sem aparelho */ }
    }, 4000);
  },

  _startClock() {
    const loop = () => {
      const now = performance.now();
      const dt = now - this._lastUpdate;
      this._lastUpdate = now;
      if (this.playing && this.current) {
        this.position += dt;
        if (state.mode === 'demo' && this.position >= this.duration) this._onEnded();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    setInterval(() => emit('player:tick', this), 250);
  },

  _onEnded() {
    if (this.repeat === 'track') { this.position = 0; return; }
    const n = this._nextIndex(1);
    if (n == null) { this.playing = false; this.position = this.duration; emit('player:state', this); return; }
    this._go(n, 0, true);
  },

  _rebuildOrder() {
    const idx = this.queue.map((_, i) => i);
    if (this.shuffle) {
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      const at = idx.indexOf(this.index);
      if (at > 0) { idx.splice(at, 1); idx.unshift(this.index); }
    }
    this._order = idx;
  },

  _nextIndex(dir) {
    if (!this.queue.length) return null;
    const pos = this._order.indexOf(this.index);
    let p = pos + dir;
    if (p >= this._order.length) { if (this.repeat === 'context') p = 0; else return null; }
    if (p < 0) p = this.repeat === 'context' ? this._order.length - 1 : 0;
    return this._order[p];
  },

  async _go(i, positionMs = 0, autoplay = true) {
    this.index = i;
    this.position = positionMs;
    this.duration = this.current?.duration || 0;
    this.playing = autoplay;
    emit('player:track', this.current);
    emit('player:state', this);
    if (state.mode !== 'demo') await this._remotePlay(positionMs, autoplay);
  },

  async _remotePlay(positionMs, autoplay = true) {
    const uris = this.queue.map((t) => t.uri).filter((u) => u && u.startsWith('spotify:'));
    const cur = this.current;
    if (!cur) return;
    try {
      const query = this.deviceId ? { device_id: this.deviceId } : undefined;
      // Ordem própria (shuffle local): mandamos a fila na ordem tocável.
      const ordered = this.shuffle ? this._order.map((k) => this.queue[k].uri) : uris;
      await api('/me/player/play', { method: 'PUT', query, body: { uris: ordered.slice(0, 700), offset: { uri: cur.uri }, position_ms: Math.round(positionMs) } });
      await api('/me/player/repeat', { method: 'PUT', query: { ...query, state: this.repeat } }).catch(() => {});
      if (!autoplay) await this.pause();
    } catch (e) {
      this.error = e.status === 404 ? 'Nenhum aparelho ativo. Abra o Spotify em algum aparelho ou use o navegador com Premium.' : e.message;
      emit('player:error', this.error);
    }
  },

  /** Toca uma lista a partir de um índice. */
  async playList(tracks, startIndex = 0, context = null, positionMs = 0) {
    this.queue = tracks.map((t) => ({ ...t, album: t.album || context, qid: Math.random().toString(36).slice(2) }));
    this.context = context;
    this.index = startIndex;
    this._rebuildOrder();
    emit('player:queue', this.queue);
    await this._go(startIndex, positionMs, true);
  },

  async addToQueue(track) {
    this.queue.push({ ...track, qid: Math.random().toString(36).slice(2) });
    this._order.push(this.queue.length - 1);
    emit('player:queue', this.queue);
    if (state.mode !== 'demo' && track.uri?.startsWith('spotify:')) {
      api('/me/player/queue', { method: 'POST', query: { uri: track.uri, device_id: this.deviceId } }).catch(() => {});
    }
  },

  async toggle() { return this.playing ? this.pause() : this.resume(); },

  async pause() {
    this.playing = false; emit('player:state', this);
    if (state.mode === 'demo') return;
    if (this._sdk) return this._sdk.pause();
    return api('/me/player/pause', { method: 'PUT' }).catch(() => {});
  },

  async resume() {
    if (!this.current) return;
    if (this.position >= this.duration - 50) this.position = 0;
    this.playing = true; emit('player:state', this);
    if (state.mode === 'demo') return;
    if (this._sdk) return this._sdk.resume();
    return api('/me/player/play', { method: 'PUT' }).catch(() => {});
  },

  async next() { const n = this._nextIndex(1); if (n != null) return this._go(n, 0, true); },

  async prev() {
    if (this.position > 3000) return this.seek(0);
    const n = this._nextIndex(-1); if (n != null) return this._go(n, 0, true);
  },

  async seek(ms) {
    this.position = Math.max(0, Math.min(ms, this.duration));
    emit('player:state', this);
    if (state.mode === 'demo') return;
    if (this._sdk) return this._sdk.seek(Math.round(this.position));
    return api('/me/player/seek', { method: 'PUT', query: { position_ms: Math.round(this.position) } }).catch(() => {});
  },

  async jumpTo(i, positionMs = 0) { if (this.queue[i]) return this._go(i, positionMs, true); },

  setShuffle(v) {
    this.shuffle = v; this._rebuildOrder(); emit('player:state', this);
    if (state.mode !== 'demo' && this.current) this._resync();
  },

  setRepeat(mode) {
    this.repeat = mode; emit('player:state', this);
    if (state.mode !== 'demo') api('/me/player/repeat', { method: 'PUT', query: { state: mode } }).catch(() => {});
  },

  async setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v)); save('volume', this.volume);
    emit('player:volume', this.volume);
    if (state.mode === 'demo') return;
    if (this._sdk) return this._sdk.setVolume(this.volume);
    clearTimeout(this._volT);
    this._volT = setTimeout(() => api('/me/player/volume', { method: 'PUT', query: { volume_percent: Math.round(this.volume * 100) } }).catch(() => {}), 200);
  },

  /** Reordena a fila (from → to), mantendo a faixa atual. */
  move(from, to) {
    const cur = this.current;
    const [t] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, t);
    this.index = this.queue.indexOf(cur);
    this._rebuildOrder();
    emit('player:queue', this.queue);
    if (state.mode !== 'demo') this._resync();
  },

  remove(i) {
    const cur = this.current;
    const removingCurrent = i === this.index;
    this.queue.splice(i, 1);
    if (removingCurrent) {
      if (!this.queue.length) { this.index = -1; this.playing = false; this.pause(); }
      else this.index = Math.min(i, this.queue.length - 1);
    } else this.index = this.queue.indexOf(cur);
    this._rebuildOrder();
    emit('player:queue', this.queue);
    if (removingCurrent && this.current) this._go(this.index, 0, this.playing);
    else if (state.mode !== 'demo') this._resync();
  },

  _resync() {
    clearTimeout(this._syncT);
    this._syncT = setTimeout(() => this._remotePlay(this.position, this.playing), 600);
  },
};
