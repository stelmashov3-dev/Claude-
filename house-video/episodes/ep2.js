// Episode 2 cast: formwork carpenters, rebar fixers, concrete crew with a poker vibrator.
import { scene, mat, lerp, clamp } from '../world.js';
import { makeWorker, attach, pose, hammer, shoulderLoad, vibratorPoker, vibratorUnit } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const carrier = W({ helmet: 'yellow' });
const carpA = W({ helmet: 'orange', skin: 1 }); attach(carpA, hammer());
const carpB = W({ helmet: 'white', vest: 'lime', skin: 2 }); attach(carpB, hammer());
const fixA = W({ helmet: 'orange', skin: 2 });
const fixB = W({ helmet: 'white' });
const fixC = W({ helmet: 'yellow', vest: 'lime', skin: 1 });
const guide = W({ helmet: 'white', vest: 'lime' });
const vibr = W({ helmet: 'orange' }); attach(vibr, vibratorPoker());
const unit = vibratorUnit(); scene.add(unit);
const board = shoulderLoad(3.0, mat.wood), bar = shoulderLoad(3.2, mat.rebar, 0.012);
const all = [carrier, carpA, carpB, fixA, fixB, fixC, guide, vibr];

const on = (w) => { w.g.visible = true; return true; };
const span = (T, a, b) => clamp((T - a) / (b - a));

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  unit.visible = false;
  if (T < 34.2) { // formwork: one carries boards in, two nail panels
    on(carrier); attach(carrier, board, 'spine'); pose(carrier, [lerp(4.2, -2.5, span(T, 31.2, 34.2)), 0, 2.7], -Math.PI / 2, 'carry', tr * 0.9);
    on(carpA); pose(carpA, [3.4, 0, 4.85], Math.PI, 'hammer', tr * 1.3);
    on(carpB); pose(carpB, [5.85, 0, 1.6], -Math.PI / 2, 'hammer', tr * 1.3 + 0.3);
  } else if (T < 37) { // spacers on top
    on(fixA); pose(fixA, [-1.5, 0, 4.9], Math.PI, 'crouch', tr * 0.6);
    on(carpA); pose(carpA, [2.4, 0, 3.15], 0, 'hammer', tr * 1.3);
    on(carrier); attach(carrier, board, 'spine'); pose(carrier, [lerp(-3.8, -1.2, span(T, 34.2, 37)), 0, 1.0], Math.PI / 2, 'carry', tr * 0.9);
  } else if (T < 41) { // film laid inside the formwork
    on(fixA); pose(fixA, [-3.4, 0, 4.85], Math.PI, 'crouch', tr * 0.5);
    on(fixB); pose(fixB, [1.0, 0, 3.15], 0, 'crouch', tr * 0.5 + 0.5);
  } else if (T < 44.6) { // longitudinal bars brought in and laid
    on(carrier); attach(carrier, bar, 'spine'); pose(carrier, [5.95, 0, lerp(-3.2, 2.6, span(T, 41, 44.6))], 0, 'carry', tr * 0.9);
    on(fixA); pose(fixA, [5.85, 0, -1.2], -Math.PI / 2, 'crouch', tr * 0.7);
    on(fixC); pose(fixC, [4.15, 0, 1.4], Math.PI / 2, 'crouch', tr * 0.7 + 0.3);
  } else if (T < 49) { // stirrups tied by hand
    on(fixA); pose(fixA, [-1.6, 0, 4.85], Math.PI, 'crouch', tr * 0.8);
    on(fixB); pose(fixB, [0.9, 0, 4.85], Math.PI, 'crouch', tr * 0.8 + 0.4);
    on(fixC); pose(fixC, [-3.0, 0, 4.85], Math.PI, 'crouch', tr * 0.8 + 0.2);
  } else if (T < 52.2) { // pouring from the mixer chute, vibrating behind it
    on(guide); pose(guide, [6.05, 0, 2.7], -Math.PI / 2 - 0.4, 'guide', tr * 0.6);
    on(vibr); pose(vibr, [5.65, 0, -1.0], -Math.PI / 2, 'vibrate', tr * 1.5);
    unit.visible = true; unit.position.set(6.6, 0, -1.6);
  } else { // poker vibrator along the front strip
    const x = lerp(-3.0, 1.6, span(T, 52.2, 55.2));
    on(vibr); pose(vibr, [x, 0, 4.65], Math.PI, 'vibrate', tr * 1.5);
    unit.visible = true; unit.position.set(x - 1.2, 0, 5.4);
    on(fixB); pose(fixB, [x + 1.7, 0, 4.75], Math.PI, 'crouch', tr * 0.6);
    if (T > 55.2) { on(guide); pose(guide, [-4.5, 0, 5.2], Math.PI, 'stand', tr * 0.2); }
  }
}
