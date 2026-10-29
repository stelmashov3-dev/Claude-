// Episode 1 cast: who stands where, doing what, as a function of master time T and real time tr.
import { scene, padG, ease, lerp, clamp } from '../world.js';
import { makeWorker, attach, pose, shovel, sledge, staff, tripodLevel, plateCompactor } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const signal = W({ helmet: 'orange', vest: 'lime' });
const spreader = W({ helmet: 'white', skin: 1 }); attach(spreader, shovel());
const surveyor = W({ helmet: 'white', vest: 'lime', skin: 2 });
const tripod = tripodLevel(); scene.add(tripod);
const staffman = W({ helmet: 'yellow' }); attach(staffman, staff());
const hammerer = W({ helmet: 'orange', skin: 1 }); attach(hammerer, sledge());
const foreman = W({ helmet: 'white', vest: 'lime' });
const digA = W({ helmet: 'yellow', skin: 2 }); attach(digA, shovel());
const digB = W({ helmet: 'orange' }); attach(digB, shovel());
const checker = W({ helmet: 'white', skin: 1 });
const plateMan = W({ helmet: 'yellow', vest: 'lime' });
const plate = plateCompactor(); scene.add(plate);
const all = [signal, spreader, surveyor, staffman, hammerer, foreman, digA, digB, checker, plateMan];

const cushionTop = (T, i) => -1.2 + 0.2 * ease(27.4 + i * 0.4, 29.4 + i * 0.4, T);
const show = (o, on) => { (o.g || o).visible = on; return on; };

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  tripod.visible = false; plate.visible = false;
  const padY = padG.position.y;
  // fill: signalman guides the reversing truck, a worker trims a sand pile
  if (show(signal, T > 4.6 && T < 13.6)) pose(signal, [9.6, -0.5, 8.2], Math.PI * 0.85, T < 9.2 ? 'wave' : 'stand', tr * 0.8);
  if (show(spreader, T > 9.2 && T < 13.6)) pose(spreader, [-1.4, padY, -5.0], -Math.PI / 2, 'shovel', tr * 0.55);
  // setting out: surveyor with level, staff on the corner, stakes driven in
  if (T > 12.8 && T < 18.2) {
    show(tripod, true); tripod.position.set(-7.2, 0, 6.6); tripod.rotation.y = 2.36;
    show(surveyor, true); pose(surveyor, [-7.55, 0, 6.95], 2.36, 'look', tr * 0.3);
    show(staffman, true); pose(staffman, [5.3, 0, 4.3], -2.3, 'holdStaff', tr * 0.2);
    show(hammerer, true); const sx = lerp(-3.3, 3.3, ease(13.2, 17.5, T));
    pose(hammerer, [sx, 0, 6.15], Math.PI, (tr * 0.9) % 1 < 0.85 ? 'hammer' : 'stand', tr * 0.9);
  }
  // excavation: foreman watches, then two diggers clean the front trench, a third checks levels
  if (show(foreman, T > 17.6 && T < 27.2)) pose(foreman, [-7.2, 0, 7.6], 2.5, 'stand', tr * 0.2);
  if (T > 20.6 && T < 31.2) {
    const inCush = T > 27.2, y = (i) => cushionTop(T, i);
    if (!inCush) {
      show(digA, true); pose(digA, [-2.7, -1.2, 4], Math.PI / 2, 'shovel', tr * 0.5);
      show(digB, true); pose(digB, [1.0, -1.2, 4], -Math.PI / 2, 'shovel', tr * 0.5 + 0.4);
      show(checker, true); pose(checker, [3.2, 0, 5.0], Math.PI, 'crouch', tr * 0.4);
    } else {
      // cushion: plate compactor along the front trench, a digger spreads sand in the side trench
      const x = lerp(-4.6, 3.6, clamp((T - 27.6) / 3.3)), yy = y(0);
      show(plateMan, true); pose(plateMan, [x, yy, 4], Math.PI / 2, 'push', tr * 0.9);
      show(plate, true); plate.position.set(x + 0.95, yy + Math.sin(tr * 90) * 0.006, 4); plate.rotation.y = -Math.PI / 2;
      show(digB, true); pose(digB, [5, y(1), 1.6], Math.PI, 'shovel', tr * 0.5);
    }
  }
}
