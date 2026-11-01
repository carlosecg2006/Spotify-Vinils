// Estado global simples + eventos + persistência local.
const listeners = new Map();

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}

export function emit(evt, payload) {
  (listeners.get(evt) || []).forEach((fn) => {
    try { fn(payload); } catch (e) { console.error(`[${evt}]`, e); }
  });
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem('sv:' + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function save(key, value) {
  try { localStorage.setItem('sv:' + key, JSON.stringify(value)); } catch { /* sem storage */ }
}

const DEFAULT_SETTINGS = {
  alwaysSearch: false,      // barra de pesquisa sempre visível
  vinylStyle: 'classic',    // classic | marble | splatter | clear | color
  defaultBpm: 112,          // pulso usado quando a faixa não tem BPM marcado
  beatLights: true,         // luzes e caixas de som batendo
  coverBackdrop: true,      // fundo sutil com a capa
  fogDensity: 0.5,
  lyricsSource: 'lrclib',
  reduceMotion: false,
  quality: 'high',          // high | low
};

export const settings = { ...DEFAULT_SETTINGS, ...load('settings', {}) };

export function setSetting(key, value) {
  settings[key] = value;
  save('settings', settings);
  emit('settings', { key, value });
}

// Estado compartilhado do app
export const state = {
  mode: 'boot',          // boot | demo | spotify
  view: 'intro',         // intro | desk | stack | search | inspect | turntable | artist | shelf
  library: null,
  user: null,
};
