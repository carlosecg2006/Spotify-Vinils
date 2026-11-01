// Criar álbum: editor de capa livre (texto, formas, imagens, degradê) + escolha de faixas.
import { el, fmtTime } from '../util.js';
import { searchTracks, createPlaylist } from '../data/library.js';
import { emit } from '../store.js';

const SW = ['#111111', '#f5f5f0', '#1db954', '#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#fb5607', '#06d6a0', '#ef476f', '#2b2d42', '#f4a259'];
const FONTS = ['Inter', 'Caveat', 'Permanent Marker', 'Georgia', 'Courier New', 'Impact'];

export function openCreator(root, { onCreated }) {
  const S = 1000;
  const cv = el('canvas', { width: S, height: S });
  const g = cv.getContext('2d');
  const doc = { bg: ['#1db954', '#0b3d22'], angle: 135, items: [] };
  let sel = null;
  const tracks = [];

  const props = el('div', { class: 'props' });
  const picked = el('div', { class: 'picked' });
  const name = el('input', { class: 'input', placeholder: 'Nome do álbum', value: 'Meu álbum' });
  const desc = el('input', { class: 'input', placeholder: 'Descrição (opcional)' });
  const q = el('input', { class: 'input', placeholder: 'Buscar músicas para adicionar' });
  const res = el('div', { class: 'picked', style: { maxHeight: '26vh', flex: 'none' } });

  const swatches = (fn) => el('div', { class: 'swatches' }, ...SW.map((c) => el('button', { style: { background: c }, title: c, onclick: () => fn(c) })));
  const fileInput = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => { add({ type: 'image', img, x: S / 2, y: S / 2, w: 500, h: 500 * (img.height / img.width), rot: 0 }); };
    img.src = URL.createObjectURL(f);
  });

  const left = el('aside', {},
    el('h4', {}, 'Adicionar'),
    el('div', { class: 'tools' },
      el('button', { onclick: () => add({ type: 'text', text: 'Título', x: S / 2, y: S / 2, size: 110, font: 'Permanent Marker', color: '#ffffff', rot: 0 }) }, 'Texto'),
      el('button', { onclick: () => add({ type: 'rect', x: S / 2, y: S / 2, w: 380, h: 240, color: '#ffbe0b', rot: 0 }) }, 'Retângulo'),
      el('button', { onclick: () => add({ type: 'circle', x: S / 2, y: S / 2, w: 320, h: 320, color: '#ff006e', rot: 0 }) }, 'Círculo'),
      el('button', { onclick: () => add({ type: 'star', x: S / 2, y: S / 2, w: 300, h: 300, color: '#f5f5f0', rot: 0 }) }, 'Estrela'),
      el('button', { onclick: () => fileInput.click() }, 'Imagem'),
      el('button', { onclick: () => add({ type: 'vinyl', x: S / 2, y: S / 2, w: 520, h: 520, color: '#111', rot: 0 }) }, 'Vinil')),
    fileInput,
    el('h4', {}, 'Fundo (degradê)'),
    swatches((c) => { doc.bg = [c, doc.bg[0]]; draw(); }),
    el('h4', {}, 'Elemento selecionado'),
    props,
    el('h4', {}, 'Dicas'),
    el('div', { style: { fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 } }, 'Arraste para mover · roda do mouse para tamanho · Shift + roda para girar · Delete apaga.'),
  );
  const right = el('aside', { class: 'right' },
    el('h4', {}, 'Informações'), name, desc,
    el('h4', {}, 'Faixas'), q, res, picked,
    el('button', { class: 'btn btn-primary', onclick: () => save() }, 'Criar álbum'),
    el('button', { class: 'btn btn-ghost', onclick: () => close() }, 'Cancelar'));
  const wrap = el('div', { class: 'creator' }, left, el('div', { class: 'stage' }, cv), right);
  root.append(wrap);

  function add(item) { doc.items.push(item); sel = item; draw(); drawProps(); }

  function drawProps() {
    props.innerHTML = '';
    if (!sel) { props.append(el('div', { style: { color: 'var(--muted)' } }, 'Clique num elemento da capa.')); return; }
    if (sel.type === 'text') {
      const t = el('input', { class: 'input', type: 'text', value: sel.text });
      t.addEventListener('input', () => { sel.text = t.value; draw(); });
      const f = el('select', { class: 'input' }, ...FONTS.map((x) => el('option', { selected: x === sel.font }, x)));
      f.addEventListener('change', () => { sel.font = f.value; draw(); });
      props.append(t, f);
    }
    props.append(swatches((c) => { sel.color = c; draw(); }));
    props.append(el('div', { style: { display: 'flex', gap: '6px' } },
      el('button', { class: 'mini', onclick: () => { const i = doc.items.indexOf(sel); doc.items.splice(i, 1); doc.items.push(sel); draw(); } }, 'trazer p/ frente'),
      el('button', { class: 'mini', onclick: () => { doc.items = doc.items.filter((x) => x !== sel); sel = null; draw(); drawProps(); } }, 'apagar')));
  }

  function shape(it) {
    g.save(); g.translate(it.x, it.y); g.rotate(it.rot);
    g.fillStyle = it.color;
    if (it.type === 'rect') g.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
    if (it.type === 'circle') { g.beginPath(); g.ellipse(0, 0, it.w / 2, it.h / 2, 0, 0, Math.PI * 2); g.fill(); }
    if (it.type === 'star') {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? it.w * 0.2 : it.w / 2; const a = (i / 10) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fill();
    }
    if (it.type === 'vinyl') {
      g.beginPath(); g.arc(0, 0, it.w / 2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.08)';
      for (let r = it.w * 0.18; r < it.w / 2; r += 6) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#1db954'; g.beginPath(); g.arc(0, 0, it.w * 0.15, 0, Math.PI * 2); g.fill();
    }
    if (it.type === 'image') g.drawImage(it.img, -it.w / 2, -it.h / 2, it.w, it.h);
    if (it.type === 'text') {
      g.font = `700 ${it.size}px "${it.font}"`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(it.text, 0, 0);
      const m = g.measureText(it.text); it.w = m.width; it.h = it.size;
    }
    g.restore();
  }

  function draw() {
    const a = (doc.angle * Math.PI) / 180;
    const grad = g.createLinearGradient(S / 2 - Math.cos(a) * S / 2, S / 2 - Math.sin(a) * S / 2, S / 2 + Math.cos(a) * S / 2, S / 2 + Math.sin(a) * S / 2);
    grad.addColorStop(0, doc.bg[0]); grad.addColorStop(1, doc.bg[1]);
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    doc.items.forEach(shape);
    if (sel) {
      g.save(); g.translate(sel.x, sel.y); g.rotate(sel.rot);
      g.setLineDash([12, 8]); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3;
      g.strokeRect(-sel.w / 2 - 10, -sel.h / 2 - 10, sel.w + 20, sel.h + 20); g.restore();
    }
  }

  const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * S, y: ((e.clientY - r.top) / r.height) * S }; };
  const hitTest = (p) => [...doc.items].reverse().find((it) => {
    const dx = p.x - it.x, dy = p.y - it.y;
    const c = Math.cos(-it.rot), s = Math.sin(-it.rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) <= it.w / 2 + 10 && Math.abs(ly) <= it.h / 2 + 10;
  });
  let drag = null;
  cv.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    sel = hitTest(p) || null; drawProps(); draw();
    if (sel) { drag = { dx: p.x - sel.x, dy: p.y - sel.y }; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', (e) => { if (!drag || !sel) return; const p = toCanvas(e); sel.x = p.x - drag.dx; sel.y = p.y - drag.dy; draw(); });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('wheel', (e) => {
    if (!sel) return; e.preventDefault();
    if (e.shiftKey) sel.rot += Math.sign(e.deltaY) * 0.05;
    else { const k = e.deltaY < 0 ? 1.06 : 0.94; if (sel.type === 'text') sel.size *= k; else { sel.w *= k; sel.h *= k; } }
    draw();
  }, { passive: false });
  const onKey = (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel && document.activeElement === document.body) { doc.items = doc.items.filter((x) => x !== sel); sel = null; draw(); drawProps(); }
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => {
    res.innerHTML = '';
    if (q.value.trim().length < 2) return;
    (await searchTracks(q.value.trim())).forEach((tr) => res.append(el('div', {},
      el('span', {}, `${tr.name} · ${tr.artists?.[0]?.name || ''}`),
      el('button', { onclick: () => { tracks.push(tr); drawPicked(); } }, '+'))));
  }, 350); });
  function drawPicked() {
    picked.innerHTML = '';
    tracks.forEach((tr, i) => picked.append(el('div', {}, el('span', {}, `${i + 1}. ${tr.name} (${fmtTime(tr.duration)})`),
      el('button', { onclick: () => { tracks.splice(i, 1); drawPicked(); } }, '✕'))));
  }

  async function save() {
    if (!tracks.length) { emit('toast', 'Adicione pelo menos uma faixa.'); return; }
    sel = null; draw();
    // JPEG até 256 KB para o Spotify
    const small = document.createElement('canvas'); small.width = small.height = 640;
    small.getContext('2d').drawImage(cv, 0, 0, 640, 640);
    let qy = 0.9, data = small.toDataURL('image/jpeg', qy);
    while (data.length * 0.75 > 250000 && qy > 0.3) { qy -= 0.1; data = small.toDataURL('image/jpeg', qy); }
    try {
      const pl = await createPlaylist({ name: name.value.trim() || 'Meu álbum', description: desc.value.trim(), tracks, imageDataUrl: data });
      emit('toast', `“${pl.name}” foi para a estante!`);
      onCreated?.(pl);
      close();
    } catch (e) { emit('toast', 'Não deu para criar: ' + e.message); }
  }

  function close() { window.removeEventListener('keydown', onKey); wrap.remove(); }
  draw(); drawProps();
  return { close };
}
