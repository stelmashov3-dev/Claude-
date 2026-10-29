// Episode 4 cast: masons on the floor and then on the scaffold, block carriers, a rebar fixer at the chase.
import { scene, mat, lerp, clamp, rowStart } from '../world.js';
import { makeWorker, attach, pose, heldBlock } from '../workers.js';

const W = (o) => { const w = makeWorker(o); scene.add(w.g); return w; };
const masonA = W({ helmet: 'white', skin: 1 });
const masonB = W({ helmet: 'orange', vest: 'lime', skin: 2 });
const carrier = W({ helmet: 'yellow' }); attach(carrier, heldBlock(mat.block), 'spine');
const carrier2 = W({ helmet: 'orange', skin: 1 }); attach(carrier2, heldBlock(mat.block), 'spine');
const fixer = W({ helmet: 'yellow', vest: 'lime' });
const all = [masonA, masonB, carrier, carrier2, fixer];

const on = (w) => { w.g.visible = true; return true; };
const span = (T, a, b) => clamp((T - a) / (b - a));
const loop = (x, a, b) => a + (b - a) * (0.5 - 0.5 * Math.cos(x * Math.PI * 2)); // back and forth

export function update(T, tr) {
  for (const w of all) w.g.visible = false;
  const t = T - 5, rowNow = clamp(Math.floor((t - 65.3) / 0.85), 0, 11);
  const high = T > 74.2, y = high ? 1.62 : 0;
  // masons follow the course being laid along the front wall, from the floor and later from the scaffold
  on(masonA); pose(masonA, [loop(tr * 0.05, -4.0, -1.0), y, T < 71.1 ? 3.05 : 3.25], 0, T < 71.1 ? 'crouch' : 'place', tr * 0.7);
  on(masonB); pose(masonB, [loop(tr * 0.05 + 0.5, 1.0, 4.0), y, T < 71.1 ? 3.05 : 3.25], 0, T < 71.1 ? 'crouch' : 'place', tr * 0.7 + 0.4);
  if (T > 71.05 && T < 71.7) { on(fixer); pose(fixer, [-0.4, 0, 3.1], 0, 'crouch', tr * 0.8); }
  // carriers shuttle blocks from the pallets to the house
  on(carrier); { const k = (tr * 0.09) % 1, out = k < 0.5; pose(carrier, [lerp(7.0, 5.9, 0), 0, out ? lerp(-1.2, 3.4, k * 2) : lerp(3.4, -1.2, k * 2 - 1)], out ? 0 : Math.PI, out ? 'carryBlock' : 'walk', tr * 0.9); carrier.tool.visible = out; }
  if (T > 71.5) { on(carrier2); const k = (tr * 0.08 + 0.3) % 1, out = k < 0.5; pose(carrier2, [-6.1, 0, out ? lerp(1.0, 5.0, k * 2) : lerp(5.0, 1.0, k * 2 - 1)], out ? 0 : Math.PI, out ? 'carryBlock' : 'walk', tr * 0.9); carrier2.tool.visible = out; }
}
