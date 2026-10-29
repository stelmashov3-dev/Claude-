// Construction workers: jointed figures with poses (walk, hammer, shovel, push, crouch, wave) and hand tools.
import { THREE, M, clamp, lerp, smooth } from './world.js';

const capsule = (r, len, m) => { const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), m); o.castShadow = o.receiveShadow = true; return o; };
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; };

function vestTex(color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 64, 128);
  x.fillStyle = '#d9dcdf'; x.fillRect(0, 70, 64, 9); x.fillRect(0, 92, 64, 9);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const mats = {
  pants: M({ color: 0x3d4a5e, roughness: 0.9 }), jacket: M({ color: 0x4d5868, roughness: 0.85 }),
  boot: M({ color: 0x1d1a17, roughness: 0.8 }), glove: M({ color: 0x5b5f55, roughness: 0.9 }),
  skin: [M({ color: 0xc89f86, roughness: 0.7 }), M({ color: 0xb98a6c, roughness: 0.7 }), M({ color: 0xd8b39a, roughness: 0.7 })],
  helmet: { white: M({ color: 0xf2f2ee, roughness: 0.35 }), orange: M({ color: 0xf07a1a, roughness: 0.35 }), yellow: M({ color: 0xf2c21b, roughness: 0.35 }) },
  vest: { orange: M({ map: vestTex('#f2711c'), roughness: 0.7 }), lime: M({ map: vestTex('#c8e021'), roughness: 0.7 }) },
  steel: M({ color: 0x8b9096, roughness: 0.35, metalness: 0.8 }), wood: M({ color: 0xb08856, roughness: 0.8 }),
  dark: M({ color: 0x24272b, roughness: 0.6, metalness: 0.3 }), yellow: M({ color: 0xe1a412, roughness: 0.5, metalness: 0.2 }),
};

export function makeWorker({ helmet = 'white', vest = 'orange', skin = 0 } = {}) {
  const g = new THREE.Group(), j = {};
  const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips); j.hips = hips;
  const pelvis = mesh(new THREE.BoxGeometry(0.32, 0.18, 0.2), mats.pants); hips.add(pelvis);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.1, -0.06, 0); hips.add(hip);
    const th = capsule(0.075, 0.3, mats.pants); th.position.y = -0.22; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    const sh = capsule(0.062, 0.3, mats.pants); sh.position.y = -0.2; knee.add(sh);
    const boot = mesh(new THREE.BoxGeometry(0.12, 0.1, 0.27), mats.boot); boot.position.set(0, -0.41, 0.04); knee.add(boot);
    j[s < 0 ? 'lHip' : 'rHip'] = hip; j[s < 0 ? 'lKnee' : 'rKnee'] = knee;
  }
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine); j.spine = spine;
  const torso = capsule(0.16, 0.3, mats.vest[vest]); torso.scale.set(1.18, 1, 0.72); torso.position.y = 0.3; spine.add(torso);
  const neck = new THREE.Group(); neck.position.y = 0.58; spine.add(neck); j.neck = neck;
  const head = mesh(new THREE.SphereGeometry(0.105, 20, 16), mats.skin[skin]); head.scale.set(0.92, 1.08, 1); head.position.y = 0.13; neck.add(head);
  const hel = mesh(new THREE.SphereGeometry(0.122, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.helmet[helmet]); hel.position.y = 0.17; neck.add(hel);
  const brim = mesh(new THREE.CylinderGeometry(0.135, 0.14, 0.015, 24), mats.helmet[helmet]); brim.position.set(0, 0.17, 0.02); brim.scale.z = 1.12; neck.add(brim);
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.23, 0.5, 0); spine.add(sh);
    const ua = capsule(0.055, 0.2, mats.jacket); ua.position.y = -0.15; sh.add(ua);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    const fa = capsule(0.048, 0.18, mats.jacket); fa.position.y = -0.13; el.add(fa);
    const hand = new THREE.Group(); hand.position.y = -0.29; el.add(hand);
    const gl = mesh(new THREE.SphereGeometry(0.05, 12, 10), mats.glove); gl.scale.set(0.8, 1.1, 1); hand.add(gl);
    j[s < 0 ? 'lSh' : 'rSh'] = sh; j[s < 0 ? 'lEl' : 'rEl'] = el; j[s < 0 ? 'lHand' : 'rHand'] = hand;
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, j, tool: null };
}

// ---- tools (held in right hand unless noted) ----
export function shovel() {
  const g = new THREE.Group();
  const h = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 8), mats.wood); h.position.y = -0.35; g.add(h);
  const b = mesh(new THREE.BoxGeometry(0.22, 0.28, 0.02), mats.steel); b.position.set(0, -1.05, 0.03); b.rotation.x = 0.2; g.add(b);
  return g;
}
export function sledge() {
  const g = new THREE.Group();
  const h = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), mats.wood); h.position.y = -0.3; g.add(h);
  const hd = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), mats.dark); hd.position.set(0, -0.7, 0); g.add(hd);
  return g;
}
export function staff() { // levelling staff, striped
  const c = document.createElement('canvas'); c.width = 8; c.height = 64; const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#d23a1d'; x.fillRect(0, i * 4, 8, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const o = mesh(new THREE.BoxGeometry(0.05, 2.4, 0.03), M({ map: t, roughness: 0.6 })); o.position.y = 0.4; return o;
}
export function tripodLevel() { // free-standing instrument
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, leg = mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.45, 6), mats.yellow);
    leg.position.set(Math.cos(a) * 0.25, 0.7, Math.sin(a) * 0.25); leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(leg);
  }
  const head = mesh(new THREE.BoxGeometry(0.16, 0.14, 0.24), mats.dark); head.position.y = 1.47; g.add(head);
  const lens = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 12), mats.dark); lens.rotation.x = Math.PI / 2; lens.position.y = 1.5; g.add(lens);
  return g;
}
export function plateCompactor() { // free-standing machine, pushed by a worker
  const g = new THREE.Group();
  const plate = mesh(new THREE.BoxGeometry(0.45, 0.06, 0.55), mats.dark); plate.position.y = 0.03; g.add(plate);
  const eng = mesh(new THREE.BoxGeometry(0.34, 0.3, 0.32), mats.yellow); eng.position.set(0, 0.24, -0.04); g.add(eng);
  for (const s of [-1, 1]) { const h = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), mats.steel); h.position.set(s * 0.15, 0.55, 0.42); h.rotation.x = -0.75; g.add(h); }
  const bar = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.34, 6), mats.steel); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.88, 0.75); g.add(bar);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function hammer() {
  const g = new THREE.Group();
  const h = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8), mats.wood); h.position.y = -0.12; g.add(h);
  const hd = mesh(new THREE.BoxGeometry(0.04, 0.04, 0.13), mats.steel); hd.position.set(0, -0.28, 0); g.add(hd);
  return g;
}
export function shoulderLoad(len, m, r = 0.05) { // a board or a bar carried on the right shoulder, along the walking direction
  const o = len > 0 && r < 0.03 ? mesh(new THREE.CylinderGeometry(r, r, len, 8), m) : mesh(new THREE.BoxGeometry(0.15, 0.025, len), m);
  if (r < 0.03) o.rotation.x = Math.PI / 2; o.position.set(0.18, 0.58, 0.2); return o;
}
export function vibratorPoker() { // held in both hands, poker hangs down into the concrete
  const g = new THREE.Group();
  const hose = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), mats.dark); hose.position.y = -0.4; g.add(hose);
  const pk = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), mats.steel); pk.position.y = -1.05; g.add(pk);
  return g;
}
export function vibratorUnit() { // engine on the ground
  const g = new THREE.Group(), b = mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), mats.yellow); b.position.y = 0.15; g.add(b);
  const f = mesh(new THREE.BoxGeometry(0.46, 0.04, 0.36), mats.dark); f.position.y = 0.02; g.add(f); return g;
}

export function gasTorch() { // roofing torch with a live flame at the nozzle
  const g = new THREE.Group();
  const rod = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 8), mats.steel); rod.position.y = -0.42; g.add(rod);
  const cup = mesh(new THREE.CylinderGeometry(0.045, 0.025, 0.12, 12), mats.steel); cup.position.y = -0.88; g.add(cup);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85 }));
  flame.position.y = -1.04; flame.rotation.x = Math.PI; g.add(flame); g.userData.flame = flame;
  return g;
}
export function gasBottle() { const o = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 16), M({ color: 0xc8361d, roughness: 0.5 })); o.position.y = 0.3; const g = new THREE.Group(); g.add(o); return g; }

export function heldBlock(m) { const o = mesh(new THREE.BoxGeometry(0.6, 0.25, 0.3), m); o.rotation.y = Math.PI / 2; o.position.set(0, 0.22, 0.42); return o; }
export function attach(w, tool, hand = 'rHand') { if (w.tool) w.tool.parent?.remove(w.tool); w.tool = tool; if (tool) w.j[hand].add(tool); }

// ---- poses: every pose writes all joints, so switching is stateless ----
const R = (o, x = 0, y = 0, z = 0) => o.rotation.set(x, y, z);
function base(w) { const j = w.j; j.hips.position.y = 0.95; for (const k of ['hips', 'spine', 'neck', 'lSh', 'rSh', 'lEl', 'rEl', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lHand', 'rHand']) R(j[k]); R(j.lSh, 0, 0, -0.08); R(j.rSh, 0, 0, 0.08); }
export const poses = {
  stand(w, ph) { base(w); const b = Math.sin(ph * Math.PI * 2) * 0.02; R(w.j.spine, b); R(w.j.lEl, -0.15); R(w.j.rEl, -0.15); },
  walk(w, ph) {
    base(w); const s = Math.sin(ph * Math.PI * 2), c = Math.cos(ph * Math.PI * 2), j = w.j;
    R(j.lHip, -s * 0.45); R(j.rHip, s * 0.45); R(j.lKnee, Math.max(0, c) * 0.7); R(j.rKnee, Math.max(0, -c) * 0.7);
    R(j.lSh, s * 0.4, 0, -0.08); R(j.rSh, -s * 0.4, 0, 0.08); R(j.lEl, -0.3); R(j.rEl, -0.3);
    j.hips.position.y = 0.95 + Math.abs(c) * 0.025; R(j.spine, 0.05);
  },
  hammer(w, ph) { // overhead swing, strike at ph≈0.55
    base(w); const j = w.j, up = smooth(clamp(ph / 0.45)) - smooth(clamp((ph - 0.45) / 0.12));
    R(j.spine, lerp(0.55, 0.05, up)); R(j.lHip, -0.35); R(j.rHip, 0.15); R(j.lKnee, 0.35); R(j.rKnee, 0.15);
    const sh = lerp(-0.7, -2.7, up); R(j.lSh, sh, 0, 0.25); R(j.rSh, sh, 0, -0.25); R(j.lEl, lerp(-0.2, -0.6, up)); R(j.rEl, lerp(-0.2, -0.6, up));
    R(j.rHand, 0.2 + up * 0.4);
  },
  shovel(w, ph) { // push into ground, lift, toss
    base(w); const j = w.j, dig = smooth(clamp(ph / 0.35)) - smooth(clamp((ph - 0.55) / 0.25)), toss = smooth(clamp((ph - 0.45) / 0.15)) - smooth(clamp((ph - 0.7) / 0.2));
    R(j.spine, lerp(0.25, 0.75, dig) - toss * 0.3, toss * 0.5); R(j.lHip, -0.6 * dig - 0.1); R(j.lKnee, 0.7 * dig + 0.1); R(j.rHip, 0.2); R(j.rKnee, 0.3 * dig);
    j.hips.position.y = 0.95 - dig * 0.12;
    R(j.rSh, lerp(-0.6, -0.95, dig) - toss * 0.5, 0, 0.1); R(j.rEl, -0.4); R(j.lSh, lerp(-1.0, -1.2, dig), 0, -0.25); R(j.lEl, -0.3);
    R(j.rHand, 1.05);
  },
  push(w, ph) { // walking slowly behind a machine, arms forward
    poses.walk(w, ph); const j = w.j; R(j.spine, 0.25); R(j.lSh, -1.05, 0, -0.12); R(j.rSh, -1.05, 0, 0.12); R(j.lEl, -0.35); R(j.rEl, -0.35);
  },
  crouch(w, ph) { // bending over work at ground level (tying, checking)
    base(w); const j = w.j, m = Math.sin(ph * Math.PI * 2);
    j.hips.position.y = 0.62; R(j.lHip, -1.25); R(j.rHip, -0.9); R(j.lKnee, 2.0); R(j.rKnee, 1.6); R(j.spine, 0.75);
    R(j.lSh, -1.0 + m * 0.12, 0, -0.1); R(j.rSh, -1.1 - m * 0.12, 0, 0.1); R(j.lEl, -0.5); R(j.rEl, -0.5 + m * 0.2); R(j.neck, -0.3);
  },
  wave(w, ph) { // signalling to a driver
    base(w); const j = w.j, s = Math.sin(ph * Math.PI * 2);
    R(j.rSh, -2.6, 0, 0.35 + s * 0.35); R(j.rEl, -0.4); R(j.lSh, -0.2, 0, -0.1); R(j.lEl, -0.4);
  },
  look(w, ph) { // eye to an instrument
    base(w); const j = w.j; R(j.spine, 0.35); R(j.neck, 0.1); R(j.lSh, -1.2, 0, -0.2); R(j.rSh, -1.2, 0, 0.2); R(j.lEl, -1.2); R(j.rEl, -1.2 + Math.sin(ph * 6) * 0.05);
  },
  carry(w, ph) { // walking with a load on the right shoulder, right hand steadying it
    poses.walk(w, ph); const j = w.j; R(j.rSh, -0.2, 0, 2.6); R(j.rEl, -1.9);
  },
  vibrate(w, ph) { // bent over the formwork, both hands lowering the poker; small up-down strokes
    base(w); const j = w.j, m = Math.sin(ph * Math.PI * 2) * 0.08;
    R(j.spine, 0.65 + m * 0.5); R(j.lHip, -0.5); R(j.rHip, -0.2); R(j.lKnee, 0.5); R(j.rKnee, 0.3); j.hips.position.y = 0.9;
    R(j.lSh, -1.15 + m, 0, 0.35); R(j.rSh, -1.15 + m, 0, -0.35); R(j.lEl, -0.25); R(j.rEl, -0.25); R(j.rHand, 1.0 - m);
  },
  guide(w, ph) { // steering the mixer chute with both hands
    base(w); const j = w.j, m = Math.sin(ph * Math.PI * 2) * 0.05;
    R(j.spine, 0.2); R(j.lSh, -1.3 + m, 0, 0.1); R(j.rSh, -1.3 - m, 0, -0.1); R(j.lEl, -0.5); R(j.rEl, -0.5); R(j.lHip, -0.2); R(j.lKnee, 0.2);
  },
  carryBlock(w, ph) { // walking with a block held in front with both hands
    poses.walk(w, ph); const j = w.j; R(j.lSh, -0.75, 0, 0.2); R(j.rSh, -0.75, 0, -0.2); R(j.lEl, -0.9); R(j.rEl, -0.9); R(j.spine, -0.05);
  },
  place(w, ph) { // setting a block onto the wall in front at chest height
    base(w); const j = w.j, d = Math.sin(ph * Math.PI * 2) * 0.15;
    R(j.spine, 0.3 + d * 0.6); R(j.lSh, -1.25 + d, 0, 0.2); R(j.rSh, -1.25 + d, 0, -0.2); R(j.lEl, -0.6); R(j.rEl, -0.6); R(j.lHip, -0.15); R(j.lKnee, 0.2);
  },
  holdStaff(w, ph) { base(w); const j = w.j; R(j.rSh, -0.5, 0, 0.1); R(j.rEl, -1.1); R(j.lSh, -0.2); R(j.spine, Math.sin(ph * Math.PI * 2) * 0.02); },
};

// place a worker: pos [x,y,z], yaw (0 = facing +z), pose name, phase
export function pose(w, p, yaw, name, ph) { w.g.position.set(...p); w.g.rotation.y = yaw; poses[name](w, ((ph % 1) + 1) % 1); }
