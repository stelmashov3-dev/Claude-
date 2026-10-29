// Episode 5 cast: carpenters on the wall plate, then roofers kneeling on the slope.
import { scene, lerp, clamp, yb, ANG, ROOF_Y } from '../world.js';
import { makeWorker, attach, pose, hammer } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const carpA = W({ helmet: 'white', skin: 1 }); attach(carpA, hammer());
const carpB = W({ helmet: 'orange', vest: 'lime' }); attach(carpB, hammer());
const rooferA = W({ helmet: 'yellow', vest: 'lime', skin: 2 });
const rooferB = W({ helmet: 'orange' });
const all = [carpA, carpB, rooferA, rooferB];

const on = (w) => { w.g.visible = true; return true; };
const span = (T, a, b) => clamp((T - a) / (b - a));
const slopeY = (z, lift) => yb(z) + 0.18 / Math.cos(ANG) + lift; // standing height on the slope at z

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  if (T < 88.72) { // on the wall plate: mauerlat, then rafters
    const k = span(T, 84.3, 88.72);
    on(carpA); pose(carpA, [lerp(-4.2, 1.0, k), ROOF_Y + 0.15, 4.0], Math.PI, T < 86.4 ? 'place' : 'hammer', tr * 1.1);
    on(carpB); pose(carpB, [lerp(4.2, -1.0, k), ROOF_Y + 0.15, -4.0], 0, T < 86.4 ? 'place' : 'hammer', tr * 1.1 + 0.4);
  } else if (T < 92.3) { // kneeling on the slope, working up and along it
    const k = span(T, 88.72, 92.3), za = lerp(3.6, 2.2, k), zb = lerp(-3.6, -2.4, k);
    on(rooferA); pose(rooferA, [lerp(-4.5, 3.5, k), slopeY(za, 0.06) - 0.32, za], Math.PI, 'crouch', tr * 0.9);
    on(rooferB); pose(rooferB, [lerp(4.5, -3.5, k), slopeY(zb, 0.06) - 0.32, zb], 0, 'crouch', tr * 0.9 + 0.5);
  } else { // ridge
    on(rooferA); pose(rooferA, [lerp(-2.5, 2.5, span(T, 92.3, 92.9)), slopeY(0.9, 0.06) - 0.32, 0.9], Math.PI, 'crouch', tr);
  }
}
