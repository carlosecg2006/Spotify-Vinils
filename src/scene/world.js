// Renderizador, câmera, interação (hover/clique/arrasto) e loop.
import * as THREE from 'three';
import { ease, clamp } from '../util.js';
import { settings } from '../store.js';

export const world = {
  renderer: null, scene: null, camera: null,
  overlay: null,          // { scene, camera, active } – camada de inspeção
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(-9, -9),
  pointerPx: { x: 0, y: 0 },
  hovered: null,
  dragging: null,
  updaters: new Set(),
  camTarget: new THREE.Vector3(0, 0.8, 0),
  _tween: null,
  parallax: true,
  clock: new THREE.Clock(),
  time: 0,

  init(canvasEl) {
    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.quality === 'low' ? 1 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = settings.quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050806');
    this.scene.fog = new THREE.FogExp2('#050806', 0.035);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 200);
    this.camera.position.set(0, 1.4, 6);
    this.camera.lookAt(this.camTarget);

    const oc = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 50);
    oc.position.set(0, 0, 2.2);
    this.overlay = { scene: new THREE.Scene(), camera: oc, active: false, fade: 0 };

    window.addEventListener('resize', () => this.resize());
    canvasEl.addEventListener('pointermove', (e) => this._onMove(e));
    canvasEl.addEventListener('pointerdown', (e) => this._onDown(e));
    window.addEventListener('pointerup', (e) => this._onUp(e));
    canvasEl.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    canvasEl.addEventListener('pointerleave', () => { this.pointer.set(-9, -9); });

    const loop = () => {
      const raw = this.clock.getDelta();
      const dt = Math.min(raw, 0.05);
      this.time += dt;
      this._updateCamera(Math.min(raw, 0.5));
      this.updaters.forEach((fn) => fn(dt, this.time));
      this._pick();
      renderer.clear();
      renderer.render(this.scene, this.camera);
      if (this.overlay.active || this.overlay.fade > 0.001) {
        renderer.clearDepth();
        renderer.render(this.overlay.scene, this.overlay.camera);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    for (const cam of [this.camera, this.overlay.camera]) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
  },

  onUpdate(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); },

  /** Move a câmera suavemente para {pos, target, fov}. */
  goTo({ pos, target, fov }, duration = 1.2) {
    return new Promise((resolve) => {
      this._tween = {
        fromPos: this.camera.position.clone(), toPos: new THREE.Vector3(...pos),
        fromT: this.camTarget.clone(), toT: new THREE.Vector3(...target),
        fromFov: this.camera.fov, toFov: fov ?? this.camera.fov,
        t: 0, duration: settings.reduceMotion ? 0.01 : duration, resolve,
      };
    });
  },

  _base: null,
  _updateCamera(dt) {
    const tw = this._tween;
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const k = ease(tw.t);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      this.camTarget.lerpVectors(tw.fromT, tw.toT, k);
      this.camera.fov = tw.fromFov + (tw.toFov - tw.fromFov) * k;
      this.camera.updateProjectionMatrix();
      this._base = this.camera.position.clone();
      if (tw.t >= 1) { this._tween = null; tw.resolve(); }
    }
    if (!this._base) this._base = this.camera.position.clone();
    // leve paralaxe com o mouse
    if (this.parallax && !tw && !this.dragging && !settings.reduceMotion) {
      const px = clamp(this.pointer.x, -1, 1), py = clamp(this.pointer.y, -1, 1);
      const goal = this._base.clone().add(new THREE.Vector3(px * 0.06, py * 0.03, 0));
      this.camera.position.lerp(goal, 0.04);
    }
    this.camera.lookAt(this.camTarget);
  },

  _ndc(e) {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.pointerPx = { x: e.clientX, y: e.clientY };
  },

  /** Interseção com objetos interativos (overlay primeiro). */
  hit() {
    const layers = this.overlay.active ? [[this.overlay.scene, this.overlay.camera]] : [[this.scene, this.camera]];
    for (const [scene, cam] of layers) {
      this.raycaster.setFromCamera(this.pointer, cam);
      const hits = this.raycaster.intersectObjects(scene.children, true);
      for (const h of hits) {
        let o = h.object;
        if (!o.visible) continue;
        while (o && !o.userData.interactive) o = o.parent;
        if (o && o.userData.enabled !== false && isVisibleChain(o)) return { obj: o, hit: h };
        if (h.object.userData.blocker) return null;
      }
    }
    return null;
  },

  _pick() {
    if (this.dragging) return;
    const res = this.hit();
    const obj = res?.obj || null;
    if (obj !== this.hovered) {
      this.hovered?.userData.onLeave?.();
      this.hovered = obj;
      obj?.userData.onEnter?.(res.hit);
      this.renderer.domElement.style.cursor = obj ? (obj.userData.cursor || 'pointer') : 'default';
    }
    if (obj) obj.userData.onHover?.(res.hit);
  },

  _onMove(e) {
    this._ndc(e);
    if (this.dragging) {
      const d = this.dragging;
      const cam = d.overlay ? this.overlay.camera : this.camera;
      this.raycaster.setFromCamera(this.pointer, cam);
      d.obj.userData.onDrag?.(this.raycaster.ray, e, d);
      d.moved = true;
    }
  },

  _onDown(e) {
    this._ndc(e);
    const res = this.hit();
    if (!res) { this.onEmptyClick?.(e); return; }
    const { obj, hit } = res;
    if (obj.userData.onDrag) {
      this.dragging = { obj, startX: e.clientX, startY: e.clientY, hit, moved: false, overlay: this.overlay.active };
      obj.userData.onDragStart?.(hit, e);
      this.renderer.domElement.style.cursor = 'grabbing';
    } else {
      this._downOn = obj;
      this._downHit = hit;
    }
  },

  _onUp(e) {
    if (this.dragging) {
      const d = this.dragging;
      this.dragging = null;
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      d.obj.userData.onDragEnd?.(d, e);
      if (dist < 5) d.obj.userData.onClick?.(d.hit, e);
      return;
    }
    if (this._downOn) {
      const res = this.hit();
      if (res?.obj === this._downOn) this._downOn.userData.onClick?.(res.hit, e);
      this._downOn = null;
    }
  },

  _onWheel(e) {
    const res = this.hit();
    let o = res?.obj;
    while (o && !o.userData.onWheel) o = o.parent;
    if (o) { e.preventDefault(); o.userData.onWheel(e.deltaY, e); return; }
    this.onWheel?.(e);
  },

  /** Projeta um ponto 3D para pixels de tela. */
  toScreen(v3, overlay = false) {
    const p = v3.clone().project(overlay ? this.overlay.camera : this.camera);
    return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight, behind: p.z > 1 };
  },
};

function isVisibleChain(o) {
  while (o) { if (!o.visible) return false; o = o.parent; }
  return true;
}

/** Marca um objeto como interativo. */
export function interactive(obj, handlers) {
  obj.userData.interactive = true;
  Object.assign(obj.userData, handlers);
  return obj;
}
