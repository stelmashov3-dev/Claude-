// Episode 6 cast: window fitters, facade crew on the exterior scaffold, a gardener at the end.
import { scene, lerp, clamp } from '../world.js';
import { makeWorker, pose, attach, shovel, tablet } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const fitA = W({ helmet: 'white', vest: 'lime', skin: 1 });
const fitB = W({ helmet: 'orange', skin: 2 });
const facA = W({ helmet: 'yellow' });
const facB = W({ helmet: 'white', vest: 'lime' });
const gard = W({ helmet: 'orange', skin: 1 }); attach(gard, shovel());
const foreman = W({ helmet: 'white', vest: null, jacket: 2, beard: true, build: 1.05 });
const owner = W({ helmet: 'white', vest: null, jacket: 4, pants: 1, skin: 2 }); const ownerB = W({ helmet: 'white', vest: null, jacket: 3, pants: 3, skin: 0, beard: false, height: 0.94 });
const all = [fitA, fitB, facA, facB, gard, foreman, owner, ownerB];

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
  } else { // handing the house over: the foreman shakes the owner's hand on the new path
    on(foreman); pose(foreman, [1.3, 0.05, 6.4], -Math.PI / 2, 'handshake', tr * 0.5);
    on(owner); pose(owner, [0.5, 0.05, 6.4], Math.PI / 2, 'handshake', tr * 0.5 + 0.5);
    on(ownerB); pose(ownerB, [0.15, 0.05, 6.95], 0.6, 'stand', tr * 0.3);
    on(fitA); pose(fitA, [2.4, 0.03, 6.9], -0.3, 'thumbsUp', tr);
  }
}
