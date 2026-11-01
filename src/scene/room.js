// Espaço escuro: chão com aura (3 cores do álbum), névoa, luzes e a esfera de capas.
import * as THREE from 'three';
import { world } from './world.js';
import { coverTexture, canvas, toTex } from './textures.js';
import { settings, on } from '../store.js';
import { rng } from '../util.js';

export const room = {
  floor: null, mist: [], sphere: null, backdrop: null, lights: {},
  colors: [new THREE.Color('#1db954'), new THREE.Color('#0f6b34'), new THREE.Color('#0a2a17')],
  targetColors: null,
  pulse: 0,
  beatEnergy: 0,
};

const SPHERE_R = 13;
const SPHERE_C = new THREE.Vector3(0, 1.4, 0);
const SLOTS = 280;

export function buildRoom() {
  const { scene } = world;

  // Luzes
  scene.add(new THREE.AmbientLight('#9fb7a8', 0.18));
  const hemi = new THREE.HemisphereLight('#b9d6c4', '#0b1a10', 0.35);
  scene.add(hemi);
  const lamp = new THREE.SpotLight('#ffe2b8', 28, 9, Math.PI / 5, 0.6, 1.6);
  lamp.position.set(0.4, 3.4, 1.4);
  lamp.target.position.set(0, 0.75, -0.1);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0004;
  scene.add(lamp, lamp.target);
  const fill = new THREE.DirectionalLight('#cfe8ff', 0.35);
  fill.position.set(-3, 3, 4);
  scene.add(fill);
  const aura = new THREE.PointLight('#1db954', 4, 7, 2);
  aura.position.set(0, 0.15, 0.4);
  scene.add(aura);
  room.lights = { lamp, aura, hemi, beat: [] };
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight('#1db954', 0, 6, 2);
    const a = (i / 3) * Math.PI * 2 + 0.5;
    l.position.set(Math.cos(a) * 3.5, 0.1, Math.sin(a) * 3.5);
    scene.add(l); room.lights.beat.push(l);
  }

  // Chão com aura
  const floorMat = new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uC1: { value: room.colors[0] }, uC2: { value: room.colors[1] }, uC3: { value: room.colors[2] },
      uTime: { value: 0 }, uPulse: { value: 0 }, uIntensity: { value: 0.32 },
      fogColor: { value: new THREE.Color('#050806') },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uTime; uniform float uPulse; uniform float uIntensity; uniform vec3 fogColor;
      varying vec2 vUv; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vW.xz;
        float d = length(p - vec2(0., .3));
        float ang = atan(p.y, p.x) / 6.2831 + .5 + uTime*.01;
        vec3 c = mix(uC1, uC2, smoothstep(0., .5, fract(ang)));
        c = mix(c, uC3, smoothstep(.5, 1., fract(ang)));
        float n = noise(p*1.3 + uTime*.05)*.5 + noise(p*3.1 - uTime*.03)*.25;
        float glow = exp(-d*d*.16) * (.55 + n*.6) * uIntensity;
        float ring = exp(-pow(d - (1.5 + uPulse*1.2), 2.) * 3.) * uPulse * .5;
        vec3 base = vec3(.012,.018,.014) + vec3(n*.012);
        vec3 col = base + c * (glow + ring);
        float fogF = 1. - exp(-pow(d*.09, 2.));
        gl_FragColor = vec4(mix(col, fogColor, clamp(fogF,0.,1.)), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 96), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  scene.add(floor);
  // sombra separada (o shader não recebe sombras)
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.002; shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);
  room.floor = floor;

  // Névoa no chão: vários "bancos" de névoa suaves (sprites) bem baixos
  const mistTex = makeMistTexture();
  const r = rng(21);
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.08, depthWrite: false, color: '#d6efe0', fog: false }));
    const a = r() * Math.PI * 2, d = 0.6 + r() * 6;
    const size = 1.6 + r() * 2.6;
    m.scale.set(size * 1.6, size * 0.45, 1);
    m.position.set(Math.cos(a) * d, 0.08 + r() * 0.22, Math.sin(a) * d * 0.8);
    m.userData = { a, d, speed: (r() - 0.5) * 0.04, phase: r() * 6, base: 0.03 + r() * 0.05 };
    scene.add(m); room.mist.push(m);
  }

  buildSphere();

  world.onUpdate((dt, t) => {
    floorMat.uniforms.uTime.value = t;
    room.mist.forEach((m) => {
      const u = m.userData;
      u.a += u.speed * dt;
      m.position.x = Math.cos(u.a) * u.d;
      m.position.z = Math.sin(u.a) * u.d * 0.8;
      m.material.opacity = u.base * (0.75 + 0.25 * Math.sin(t * 0.3 + u.phase)) * (0.3 + settings.fogDensity * 1.4);
    });
    if (room.targetColors) room.colors.forEach((c, i) => c.lerp(room.targetColors[i], 0.02));
    room.pulse *= Math.pow(0.04, dt);
    floorMat.uniforms.uPulse.value = room.pulse;
    room.lights.aura.color.copy(room.colors[0]);
    room.lights.aura.intensity = 3 + room.pulse * 6;
    room.lights.beat.forEach((l, i) => { l.color.copy(room.colors[i]); l.intensity = room.pulse * 5 * room.beatEnergy; });
    world.scene.fog.density = 0.02 + settings.fogDensity * 0.03;
    updateSphere(dt, t);
  });
  on('settings', () => {});
}

function makeMistTexture() {
  const [c, g] = canvas(256);
  const r = rng(99);
  for (let i = 0; i < 14; i++) {
    const x = 128 + (r() - 0.5) * 90, y = 128 + (r() - 0.5) * 50, rad = 40 + r() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(255,255,255,.22)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  }
  return toTex(c, { srgb: false });
}

// ---------------------------------------------------------------- esfera
const slots = [];
let sphereGroup, coverPool = [], sphereFade = 1, sphereFadeTarget = 1;

function buildSphere() {
  sphereGroup = new THREE.Group();
  sphereGroup.position.copy(SPHERE_C);
  world.scene.add(sphereGroup);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const geo = new THREE.PlaneGeometry(1.55, 1.55);
  for (let i = 0; i < SLOTS; i++) {
    const y = 1 - (i / (SLOTS - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const dir = new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
    if (dir.y < -0.32) continue; // não atravessa o chão
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, fog: true, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    const target = dir.clone().multiplyScalar(SPHERE_R);
    const start = new THREE.Vector3((Math.random() - 0.5) * 8, -2 - Math.random() * 3, (Math.random() - 0.5) * 8 + 2);
    sphereGroup.add(mesh);
    slots.push({ mesh, target, start, t: 0, active: false, delay: 0, spin: Math.random() * 6 });
  }
  // fundo com a capa do álbum tocando
  room.backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R + 1, 48, 32),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false }),
  );
  room.backdrop.position.copy(SPHERE_C);
  world.scene.add(room.backdrop);
}

/** Adiciona capas à esfera conforme a barra avança. progress 0..1 */
export function feedSphere(urls, progress) {
  coverPool.push(...urls.filter(Boolean));
  if (!coverPool.length) return;
  const want = Math.floor(slots.length * progress);
  let active = slots.filter((s) => s.active).length;
  let k = 0;
  while (active < want) {
    const s = slots[active];
    const url = coverPool[(active + k) % coverPool.length];
    s.mesh.material.map = coverTexture(url);
    s.mesh.material.needsUpdate = true;
    s.mesh.visible = true;
    s.active = true;
    s.delay = Math.random() * 0.6;
    active++;
  }
}

function updateSphere(dt, t) {
  sphereFade += (sphereFadeTarget - sphereFade) * Math.min(1, dt * 1.5);
  sphereGroup.rotation.y = t * 0.006;
  for (const s of slots) {
    if (!s.active) continue;
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.t = Math.min(1, s.t + dt * 0.45);
    const k = 1 - Math.pow(1 - s.t, 3);
    s.mesh.position.lerpVectors(s.start, s.target, k);
    // flutua girando até assentar, depois encara o centro
    if (k < 0.999) {
      s.mesh.lookAt(world.camera.position);
      s.mesh.rotateZ((1 - k) * s.spin);
    } else s.mesh.lookAt(SPHERE_C);
    s.mesh.position.y += Math.sin(t * 0.6 + s.spin) * 0.04;
    s.mesh.material.opacity = Math.min(1, s.t * 2) * 0.9 * sphereFade;
  }
  const bd = room.backdrop.material;
  const goal = bd.map && settings.coverBackdrop ? (1 - sphereFade) * 0.22 : 0;
  bd.opacity += (goal - bd.opacity) * Math.min(1, dt * 1.2);
}

/** Quando um disco toca: some com as capas e mostra a capa ao fundo. */
export function setNowPlayingAmbience(album, palette) {
  if (palette) room.targetColors = palette.map((c) => new THREE.Color(c));
  if (album?.cover && settings.coverBackdrop) {
    const tex = coverTexture(album.cover).clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(3, 1);
    room.backdrop.material.map = tex; room.backdrop.material.needsUpdate = true;
    sphereFadeTarget = 0;
  } else sphereFadeTarget = 1;
}

export function showSphere(v) { sphereFadeTarget = v ? 1 : 0; }

export function beat(strength = 1) {
  if (!settings.beatLights) return;
  room.pulse = Math.max(room.pulse, strength);
}
