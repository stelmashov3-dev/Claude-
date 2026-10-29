// Episode 6 cast: window fitters, facade crew on the exterior scaffold, a gardener at the end.
import { scene, lerp, clamp } from '../world.js';
import { makeWorker, pose, attach, shovel } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const fitA = W({ helmet: 'white', vest: 'lime', skin: 1 });
const fitB = W({ helmet: 'orange', skin: 2 });
const facA = W({ helmet: 'yellow' });
const facB = W({ helmet: 'white', vest: 'lime' });
const gard = W({ helmet: 'orange', skin: 1 }); attach(gard, shovel());
const all = [fitA, fitB, facA, facB, gard];

const on = (w) => { w.g.visible = true; return true; };
const span = (T, a, b) => clamp((T - a) / (b - a));

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  if (T < 96.4) { // fitting the front windows and the door
    on(fitA); pose(fitA, [lerp(-3.4, 0.4, span(T, 93.3, 96.4)), 0, 4.75], Math.PI, 'place', tr * 0.8);
    on(fitB); pose(fitB, [lerp(-1.6, 2.6, span(T, 93.3, 96.4)), 0, 4.8], Math.PI, 'place', tr * 0.8 + 0.5);
  } else if (T < 102.2) { // boards and render from the scaffold, one crew member per deck
    const k = span(T, 96.4, 102.2);
    on(facA); pose(facA, [lerp(-4.2, 4.2, (k * 2) % 1), 1.58, 5.0], Math.PI, 'place', tr * 0.9);
    on(facB); pose(facB, [lerp(4.2, -4.2, (k * 2 + 0.3) % 1), 2.98, 5.0], Math.PI, 'place', tr * 0.9 + 0.4);
  } else if (T < 104) {
    on(gard); pose(gard, [-5.5, 0.03, 6.0], Math.PI * 0.8, 'shovel', tr * 0.5);
  }
}
