// Dica flutuante que segue o mouse.
import { world } from '../scene/world.js';

let tip;
export function initTooltip(root) {
  tip = document.createElement('div');
  tip.className = 'tooltip';
  root.append(tip);
  window.addEventListener('pointermove', (e) => {
    if (!tip.classList.contains('show')) return;
    position(e.clientX, e.clientY);
  });
}

function position(x, y) {
  const r = tip.getBoundingClientRect();
  let left = x + 16, top = y + 16;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 16;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - 16;
  tip.style.transform = `translate(${left}px, ${top}px)`;
}

export function showTip(html) {
  tip.innerHTML = html;
  tip.classList.add('show');
  position(world.pointerPx.x, world.pointerPx.y);
}

export function hideTip() { tip?.classList.remove('show'); }
