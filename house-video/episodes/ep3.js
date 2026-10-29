// Episode 3 cast: stripping crew, waterproofers working from the dug-out berm, backfill and a torch-on roofer.
import { scene, mat, lerp, clamp } from '../world.js';
import { makeWorker, attach, pose, shovel, shoulderLoad, gasTorch, gasBottle } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const carA = W({ helmet: 'yellow' }); attach(carA, shoulderLoad(2.6, mat.wood), 'spine');
const carB = W({ helmet: 'orange', skin: 1 }); attach(carB, shoulderLoad(2.6, mat.wood), 'spine');
const coatA = W({ helmet: 'white', skin: 2 });
const coatB = W({ helmet: 'orange', vest: 'lime' });
const digA = W({ helmet: 'yellow', vest: 'lime' }); attach(digA, shovel());
const digB = W({ helmet: 'white', skin: 1 }); attach(digB, shovel());
const roofer = W({ helmet: 'orange', skin: 2 }); const torch = gasTorch(); attach(roofer, torch);
const helper = W({ helmet: 'white' });
const bottle = gasBottle(); scene.add(bottle);
const all = [carA, carB, coatA, coatB, digA, digB, roofer, helper];

const on = (w) => { w.g.visible = true; return true; };
const span = (T, a, b) => clamp((T - a) / (b - a));

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  bottle.visible = false;
  if (T < 58.4) { // boards carried off the site
    on(carA); pose(carA, [lerp(6.6, 10, span(T, 56.2, 58.4)), 0, 2.5], Math.PI / 2, 'carry', tr * 0.9);
    on(carB); pose(carB, [lerp(-2.5, -7.5, span(T, 56.2, 58.4)), 0, 5.6], -Math.PI / 2, 'carry', tr * 0.9 + 0.5);
  } else if (T < 60.4) { // mastic rolled on from inside the berm
    on(coatA); pose(coatA, [lerp(-3.2, 1.0, span(T, 58.4, 60.4)), -1.0, 4.62], Math.PI, 'guide', tr * 1.2);
    on(coatB); pose(coatB, [5.62, -1.0, lerp(-2, 2, span(T, 58.4, 60.4))], -Math.PI / 2, 'guide', tr * 1.2 + 0.5);
  } else if (T < 63.2) { // XPS boards pressed onto the wall
    on(coatA); pose(coatA, [lerp(5.6, 5.62, 0), -1.0, lerp(2.6, -1.2, span(T, 60.4, 63.2))], -Math.PI / 2, 'guide', tr * 0.5);
    on(coatB); pose(coatB, [lerp(4.6, 1.5, span(T, 60.4, 63.2)), -1.0, 4.66], Math.PI, 'guide', tr * 0.5 + 0.3);
  } else if (T < 66.0) { // sand shovelled back into the berms
    on(digA); pose(digA, [-2.5, 0, 5.6], Math.PI, 'shovel', tr * 0.55);
    on(digB); pose(digB, [6.4, 0, -1.5], -Math.PI / 2, 'shovel', tr * 0.55 + 0.4);
  } else { // torch-on membrane along the front strip
    const x = lerp(-3.2, 1.4, span(T, 66.0, 70.2));
    on(roofer); pose(roofer, [x, 0, 4.72], Math.PI, 'vibrate', tr * 1.2);
    torch.userData.flame.scale.setScalar(0.85 + 0.25 * Math.sin(tr * 37) * Math.sin(tr * 13));
    bottle.visible = true; bottle.position.set(x - 1.3, 0, 5.5);
    on(helper); pose(helper, [x + 1.4, 0, 4.75], Math.PI, 'crouch', tr * 0.7);
  }
}
