// Episode runner: maps episode time t to master construction time T shot by shot, drives camera, cast and overlay.
// episode.html?ep=1&fmt=h|v   (window.renderAt(t) renders one frame; ?t= previews, ?play plays in real time)
import { THREE, VERT, camera, renderer, scene, update, smooth, clamp, lerp, ease } from './world.js';

const qs = new URLSearchParams(location.search), epn = qs.get('ep') || '1';
const [ep, tm, cast] = await Promise.all([
  fetch(`episodes/ep${epn}.json`).then((r) => r.json()),
  fetch(`episodes/ep${epn}.timing.json`).then((r) => r.json()),
  import(`./episodes/ep${epn}.js`),
]);
const shots = ep.shots.map((s, i) => ({ ...s, ...tm.shots[i] }));
const $ = (id) => document.getElementById(id);
$('brand').innerHTML = `Серия ${ep.num} <b>·</b> ${ep.title}`;

function shotAt(t) { let i = shots.length - 1; while (i > 0 && t < shots[i].start) i--; return i; }
const v3 = (a) => new THREE.Vector3(...a);

function cameraAt(s, k) {
  const keys = s.cam, kk = k * 0.7 + smooth(k) * 0.3, x = kk * (keys.length - 1), i = Math.min(Math.floor(x), keys.length - 2), f = x - i;
  const p = v3(keys[i][0]).lerp(v3(keys[i + 1][0]), f), g = v3(keys[i][1]).lerp(v3(keys[i + 1][1]), f);
  if (VERT) p.sub(g).multiplyScalar(1.3).add(g);
  camera.position.copy(p); camera.lookAt(g);
}

function overlay(t, si, k) {
  const s = shots[si], prev = shots[si - 1], next = shots[si + 1], st = s.stage;
  // stage card: fades in when the stage number changes, the subline refreshes per shot
  const card = $('card');
  if (st) {
    const first = !prev?.stage || prev.stage.n !== st.n, last = !next?.stage || next.stage.n !== st.n;
    const a = (first ? ease(s.start + 0.1, s.start + 0.6, t) : 1) * (last ? 1 - ease(s.start + s.dur - 0.4, s.start + s.dur - 0.05, t) : 1);
    $('num').textContent = `ЭТАП ${String(st.n).padStart(2, '0')}`; $('title').textContent = st.title; $('sub').textContent = st.sub;
    $('sub').style.opacity = first ? 1 : ease(s.start, s.start + 0.4, t);
    card.style.opacity = a; card.style.transform = `translateY(${(1 - a) * -16}px)`;
  } else card.style.opacity = 0;
  const hero = $('hero');
  if (s.hero) {
    $('hk').textContent = s.hero.k; $('hh').innerHTML = s.hero.h; $('hs').textContent = s.hero.s;
    const a = ease(s.start + 0.3, s.start + 1.1, t) * (si === shots.length - 1 ? 1 : 1 - ease(s.start + s.dur - 0.7, s.start + s.dur - 0.1, t));
    hero.style.opacity = a; hero.style.transform = `translateX(${(1 - a) * -30}px)`;
  } else hero.style.opacity = 0;
  const cue = tm.cues.find((c) => t >= c.t0 - 0.05 && t < c.t1 + 0.15), sub = $('subs').firstChild;
  sub.textContent = cue ? cue.text : ''; sub.style.visibility = cue ? 'visible' : 'hidden';
  $('bar').firstChild.style.transform = `scaleX(${clamp(t / tm.total)})`;
  $('brand').style.opacity = s.hero ? 0 : 0.9;
}

window.DURATION = tm.total;
window.renderAt = (t) => {
  const si = shotAt(t), s = shots[si], k = clamp((t - s.start) / s.dur);
  const T = lerp(s.T[0], s.T[1], k);
  update(T); cast.update(T, t); cameraAt(s, k); overlay(t, si, k);
  renderer.render(scene, camera);
};
window.ready = document.fonts.ready.then(() => { window.renderAt(0); return true; });
if (qs.has('t')) window.ready.then(() => window.renderAt(parseFloat(qs.get('t'))));
if (qs.has('play')) { const t0 = performance.now(); const loop = () => { window.renderAt(((performance.now() - t0) / 1000) % tm.total); requestAnimationFrame(loop); }; window.ready.then(loop); }
