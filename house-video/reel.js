// Reel look: the same build as a clay-style isometric miniature on a plain backdrop, no people, bold type on top.
// reel.html?t=40  (renderAt(T) takes master construction time directly for stills)
import { THREE, scene, renderer, update, W, H, mat } from './world.js';

// ---- clay restyle: no scenery, flat pastel materials, soft light ----
const HIDE = new Set([mat.grass, mat.trunk, mat.leaf, mat.leaf2, mat.fence, mat.gravel]);
const avg = new Map();
function texColor(t) { // average colour of a canvas texture, brightened toward pastel
  if (avg.has(t)) return avg.get(t);
  const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d');
  x.drawImage(t.image, 0, 0, 1, 1); const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
  const col = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace).lerp(new THREE.Color(0xffffff), 0.18);
  avg.set(t, col); return col;
}
// hand-picked palette for the materials that carry the story; anything else falls back to its texture's average
const PALETTE = new Map([
  [mat.sand, 0xf2cf8f], [mat.soil, 0xb5774a], [mat.concrete, 0xc8ced6], [mat.wetConcrete, 0xaeb6c0], [mat.wood, 0xe7a35a],
  [mat.block, 0xfbf8f3], [mat.film, 0x3d4757], [mat.membrane, 0x2c323d], [mat.rebar, 0xd8573a], [mat.roof, 0xc4553b],
  [mat.glass, 0x8cc3e6], [mat.frame, 0x2f3640], [mat.door, 0x7a4a2e], [mat.yellow, 0xf6b334], [mat.dark, 0x2f3640],
  [mat.white, 0xf4f4f1], [mat.steel, 0xaab3bd], [mat.red, 0xd8452b], [mat.string, 0xff6a2a],
].map(([m, c]) => [m, new THREE.Color(c)]));
const clay = new Map();
function toClay(m) {
  if (!m || !m.isMeshStandardMaterial) return m;
  if (clay.has(m)) return clay.get(m);
  const n = m.clone(); if (m.map) { n.color = texColor(m.map); n.map = null; }
  // per-object clones of a palette material (roof sheets) share its texture image: give them the palette colour too
  const twin = PALETTE.has(m) ? m : [...PALETTE.keys()].find((p) => p.map && m.map && p.map.image === m.map.image);
  if (twin) n.color = PALETTE.get(twin).clone(); else n.color.offsetHSL(0, 0.12, 0); n.roughness = Math.max(0.7, m.roughness); n.metalness = Math.min(0.15, m.metalness);
  clay.set(m, n); return n;
}
scene.traverse((o) => {
  if (!o.isMesh) return;
  const ms = Array.isArray(o.material) ? o.material : [o.material];
  if (ms.some((m) => HIDE.has(m))) { o.visible = false; o.userData.hidden = true; return; }
  o.material = Array.isArray(o.material) ? o.material.map(toClay) : toClay(o.material);
});
scene.fog = null;
renderer.toneMappingExposure = 1.15;
scene.traverse((o) => { if (o.isHemisphereLight) { o.intensity = 1.6; o.color.set(0xfff4e6); o.groundColor.set(0x6f8f95); } if (o.isDirectionalLight) { o.intensity = 2.8; o.position.set(16, 28, 10); o.shadow.radius = 6; o.shadow.camera.left = o.shadow.camera.bottom = -14; o.shadow.camera.right = o.shadow.camera.top = 14; } });
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// soft shadow on the backdrop, under the floating build pad
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.32, color: 0x0b1e24 }));
catcher.rotation.x = -Math.PI / 2; catcher.position.y = -3.05; catcher.receiveShadow = true; scene.add(catcher);

// ---- isometric orthographic camera, slowly turning ----
const VIEW = H > W ? 16.5 : 11.5; // half-height of the view in metres
// the build sits in the lower part of a vertical frame, leaving the top for type
const cam = H > W ? new THREE.OrthographicCamera(-VIEW * W / H, VIEW * W / H, VIEW * 1.25, -VIEW * 0.75, 0.1, 400) : new THREE.OrthographicCamera(-VIEW * W / H, VIEW * W / H, VIEW, -VIEW, 0.1, 400);
function cameraAt(T, spin = 0) {
  const a = Math.PI / 4 + spin, r = 60;
  cam.position.set(Math.sin(a) * r, r * 0.82, Math.cos(a) * r); cam.lookAt(0, T > 70 ? 1.6 : 0, 0); cam.updateProjectionMatrix();
}

// ---- the reel: one beat per stage, construction time T runs through each beat, bold type pops in on the cut ----
export const BEATS = [
  { d: 2.6, T: [0, 5], k: 'ЗА 30 СЕКУНД', b: 'Как строится<br>каменный дом', n: '' },
  { d: 2.4, T: [5, 13], k: 'ШАГ 1', b: 'Подсыпка', n: '+50 см к уровню участка' },
  { d: 2.4, T: [18, 27], k: 'ШАГ 2', b: 'Траншеи', n: '1,2 м — ниже промерзания' },
  { d: 2.4, T: [31, 41], k: 'ШАГ 3', b: 'Опалубка', n: 'и плёнка внутри' },
  { d: 2.4, T: [41, 49], k: 'ШАГ 4', b: 'Арматура', n: 'Ø12 — вяжем, а не варим' },
  { d: 2.4, T: [49, 56], k: 'ШАГ 5', b: 'Бетон М300', n: 'за один раз' },
  { d: 2.4, T: [58.2, 66], k: 'ШАГ 6', b: 'Утепление', n: 'мастика и ЭППС 100 мм' },
  { d: 3.0, T: [70, 83.3], k: 'ШАГ 7', b: 'Стены', n: 'газобетон 300 мм' },
  { d: 2.8, T: [84, 92.9], k: 'ШАГ 8', b: 'Кровля', n: 'металлочерепица' },
  { d: 2.8, T: [93.3, 103.6], k: 'ШАГ 9', b: 'Фасад', n: 'окна, утепление, штукатурка' },
  { d: 4.4, T: [104, 104], k: 'СТРОИМ ПОД КЛЮЧ', b: 'Ваш дом<br>готов', n: 'Напишите нам' },
];
let acc = 0; for (const b of BEATS) { b.start = acc; acc += b.d; }
export const REEL_DURATION = acc;
const $ = (id) => document.getElementById(id);
const sm = (x) => x * x * (3 - 2 * x), cl = (x) => Math.min(1, Math.max(0, x));
window.DURATION = REEL_DURATION;
window.renderReel = (t) => {
  let i = BEATS.length - 1; while (i > 0 && t < BEATS[i].start) i--;
  const b = BEATS[i], k = cl((t - b.start) / b.d), T = b.T[0] + (b.T[1] - b.T[0]) * sm(k);
  const pop = cl((t - b.start) / 0.35), out = i < BEATS.length - 1 ? cl((b.start + b.d - t) / 0.2) : 1, a = Math.min(sm(pop), out);
  $('kicker').textContent = b.k; $('big').innerHTML = b.b; $('note').textContent = b.n;
  $('big').style.transform = `translateY(${(1 - sm(pop)) * 40}px) scale(${0.9 + 0.1 * sm(pop)})`; $('big').style.opacity = a;
  $('kicker').style.opacity = a; $('note').style.opacity = Math.min(cl((t - b.start - 0.25) / 0.35), out);
  window.renderAt(T, t * 0.055);
};
window.renderAt = (T, spin = 0) => {
  update(T);
  scene.traverse((o) => { if (o.userData.hidden) o.visible = false; });
  cameraAt(T, spin); renderer.render(scene, cam);
};
window.ready = document.fonts.ready.then(() => { window.renderAt(0); return true; });
const qs = new URLSearchParams(location.search);
if (qs.has('t')) window.ready.then(() => window.renderAt(parseFloat(qs.get('t')), parseFloat(qs.get('spin') || 0)));
