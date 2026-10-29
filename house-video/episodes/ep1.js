// Episode 1 cast: who stands where, doing what, as a function of master time T and real time tr.
import { scene, padG, ease, lerp, clamp } from '../world.js';
import { makeWorker, attach, pose, shovel, sledge, staff, tripodLevel, plateCompactor, tablet } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const signal = W({ helmet: 'orange', vest: 'lime', beard: true, build: 1.08, jacket: 1, hair: 1 });
const spreader = W({ helmet: 'white', skin: 1, jacket: 2, pants: 1, height: 0.97 }); attach(spreader, shovel());
const surveyor = W({ helmet: 'white', vest: 'lime', skin: 2, jacket: 3, hair: 3, height: 1.03 });
const tripod = tripodLevel(); scene.add(tripod);
const staffman = W({ helmet: 'yellow', jacket: 4, pants: 2, build: 0.95 }); attach(staffman, staff());
const hammerer = W({ helmet: 'orange', skin: 1, beard: true, build: 1.12, hair: 2 }); const sl = sledge(); attach(hammerer, sl);
const foreman = W({ helmet: 'white', vest: null, jacket: 2, pants: 1, beard: true, hair: 3, build: 1.05 }); attach(foreman, tablet(), 'lHand');
const digA = W({ helmet: 'yellow', skin: 2, jacket: 1, pants: 2, height: 0.96 }); attach(digA, shovel());
const digB = W({ helmet: 'orange', beard: true, build: 1.1, hair: 1, jacket: 3 }); attach(digB, shovel());
const checker = W({ helmet: 'white', skin: 1, jacket: 4 });
const plateMan = W({ helmet: 'yellow', vest: 'lime', jacket: 0, pants: 3, hair: 2 });
const plate = plateCompactor(); scene.add(plate);
const client = W({ helmet: 'white', vest: null, jacket: 4, pants: 1, skin: 2, hair: 0, height: 1.02 });
const all = [signal, spreader, surveyor, staffman, hammerer, foreman, digA, digB, checker, plateMan, client];

const cushionTop = (T, i) => -1.2 + 0.2 * ease(27.4 + i * 0.4, 29.4 + i * 0.4, T);
const show = (o, on) => { (o.g || o).visible = on; return on; };

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  tripod.visible = false; plate.visible = false;
  const padY = padG.position.y;
  // fill: signalman guides the reversing truck, a worker trims a sand pile
  if (show(signal, T > 4.6 && T < 13.6)) pose(signal, [9.6, -0.5, 8.2], Math.PI * 0.85, T < 9.2 ? 'wave' : 'stand', tr * 0.8);
  if (show(spreader, T > 9.2 && T < 13.6)) pose(spreader, [-1.4, padY, -5.0], -Math.PI / 2, 'shovel', tr * 0.55);
  if (T > 4.6 && T < 13.6) { show(foreman, true); pose(foreman, [7.6, padY < -0.4 ? -0.5 : padY, 7.4], Math.PI * 0.9, T < 9.4 ? 'tablet' : 'point', tr * 0.3); }
  // setting out: surveyor with level, staff on the corner, stakes driven in
  if (T > 12.8 && T < 18.2) {
    show(tripod, true); tripod.position.set(-7.2, 0, 6.6); tripod.rotation.y = 2.36;
    show(surveyor, true); pose(surveyor, [-7.55, 0, 6.95], 2.36, 'look', tr * 0.3);
    show(staffman, true); pose(staffman, [5.3, 0, 4.3], -2.3, 'holdStaff', tr * 0.2);
    show(hammerer, true); const sx = lerp(-3.3, 3.3, ease(13.2, 17.5, T));
    pose(hammerer, [sx, 0, 6.15], Math.PI, Math.floor(tr * 0.9) % 5 === 4 ? 'wipeBrow' : 'hammer', tr * 0.9); sl.visible = true;
  }
  // excavation: foreman watches, then two diggers clean the front trench, a third checks levels
  if (T > 17.6 && T < 27.2) { show(foreman, true); pose(foreman, [-7.2, 0, 7.6], 2.5, T < 21.4 ? 'talk' : 'tablet', tr * 0.35); show(checker, T < 21.4) && pose(checker, [-6.5, 0, 8.4], 2.9 + Math.PI, 'listen', tr * 0.3); }
  if (T > 20.6 && T < 31.2) {
    const inCush = T > 27.2, y = (i) => cushionTop(T, i);
    if (!inCush) {
      show(digA, true); pose(digA, [-2.7, -1.2, 4], Math.PI / 2, 'shovel', tr * 0.5);
      // near the end of the shot the closer digger straightens up and gives the camera a thumbs-up
      show(digB, true); const thumbs = T > 25.6; pose(digB, [1.0, -1.2, 4], thumbs ? -Math.PI * 0.62 : -Math.PI / 2, thumbs ? 'thumbsUp' : 'shovel', tr * 0.5 + 0.4); digB.tool.visible = !thumbs;
      show(checker, true); pose(checker, [3.2, 0, 5.0], Math.PI, 'crouch', tr * 0.4);
    } else {
      // cushion: plate compactor along the front trench, a digger spreads sand in the side trench
      const x = lerp(-4.6, 3.6, clamp((T - 27.6) / 3.3)), yy = y(0);
      show(plateMan, true); pose(plateMan, [x, yy, 4], Math.PI / 2, 'push', tr * 0.9);
      show(plate, true); plate.position.set(x + 0.95, yy + Math.sin(tr * 90) * 0.006, 4); plate.rotation.y = -Math.PI / 2;
      show(digB, true); pose(digB, [5, y(1), 1.6], Math.PI, 'shovel', tr * 0.5); digB.tool.visible = true;
    }
  }
  if (T >= 31.0) {
    for (const w of all) w.g.visible = false; plate.visible = false;
    show(foreman, true); pose(foreman, [1.55, 0, 6.2], -Math.PI / 2, 'handshake', tr * 0.5); foreman.tool.visible = false;
    show(client, true); pose(client, [0.75, 0, 6.2], Math.PI / 2, 'handshake', tr * 0.5 + 0.5);
    show(digB, true); pose(digB, [2.35, 0, 7.1], -0.2, 'thumbsUp', tr); digB.tool.visible = false;
    show(plateMan, true); pose(plateMan, [-0.5, 0, 6.5], 0.4, 'talk', tr * 0.3);
  } else if (foreman.tool) foreman.tool.visible = true;
}
