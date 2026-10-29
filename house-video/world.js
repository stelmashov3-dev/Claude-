import * as THREE from 'three';

// World model: every element of the build is a pure function of master construction time T (see update).
// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);
const ease = (t0, t1, t) => smooth(clamp((t - t0) / (t1 - t0)));
const lin = (t0, t1, t) => clamp((t - t0) / (t1 - t0));
const outBack = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// value noise for procedural textures
function makeNoise(seed) {
  const r = rng(seed), N = 256, p = new Float32Array(N * N);
  for (let i = 0; i < p.length; i++) p[i] = r();
  const v = (x, y) => p[((y & 255) * N) + (x & 255)];
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    return lerp(lerp(v(xi, yi), v(xi + 1, yi), xf), lerp(v(xi, yi + 1), v(xi + 1, yi + 1), xf), yf); };
  return (x, y, oct = 4) => { let s = 0, a = 0.5, f = 1, w = 0; for (let o = 0; o < oct; o++) { s += a * n(x * f, y * f); w += a; a *= 0.5; f *= 2; } return s / w; };
}
function canvasTex(size, painter, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b] = painter(x / size, y / size); const i = (y * size + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function noisyTex(c1, c2, { scale = 8, grain = 18, seed = 1, size = 256, repeat = [1, 1], extra } = {}) {
  const nz = makeNoise(seed), gr = rng(seed + 7), A = hex(c1), B = hex(c2);
  return canvasTex(size, (u, v) => {
    // tileable: blend noise at wrapped coords
    const k = nz(u * scale, v * scale) * (1 - u) * (1 - v) + nz((u - 1) * scale, v * scale) * u * (1 - v)
      + nz(u * scale, (v - 1) * scale) * (1 - u) * v + nz((u - 1) * scale, (v - 1) * scale) * u * v;
    let c = mixc(A, B, clamp((k - 0.3) * 2.2));
    const g = (gr() - 0.5) * grain; c = [c[0] + g, c[1] + g, c[2] + g];
    return extra ? extra(c, u, v, gr) : c;
  }, repeat);
}

// ---------- renderer / scene ----------
const VERT = new URLSearchParams(location.search).get('fmt') === 'v';
export const W = VERT ? 1080 : 1920, H = VERT ? 1920 : 1080;
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.insertBefore(renderer.domElement, document.getElementById('ui'));
export { THREE, VERT };

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd5dbd9, 70, 260);
export const camera = new THREE.PerspectiveCamera(VERT ? 58 : 35, W / H, 0.1, 600);

scene.add(new THREE.HemisphereLight(0xd6e4f5, 0x6d5c47, 1.25));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.9);
sun.position.set(20, 30, 14); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 });
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
scene.add(sun);

// ---------- materials ----------
const M = (opts) => new THREE.MeshStandardMaterial(opts);
const tex = {
  grass: noisyTex(0x56653a, 0x828a58, { scale: 6, grain: 26, seed: 3, repeat: [90, 90] }),
  sand: noisyTex(0xbd9f72, 0xdcc49a, { scale: 10, grain: 30, seed: 5, repeat: [0.3, 0.3] }),
  soil: noisyTex(0x5e4330, 0x8b6a49, { scale: 9, grain: 30, seed: 9, repeat: [0.4, 0.4] }),
  concrete: noisyTex(0x8f8f8a, 0xb6b5ae, { scale: 12, grain: 22, seed: 11, extra: (c, u, v, r) => r() < 0.02 ? mixc(c, [60, 60, 58], 0.5) : c }),
  wood: noisyTex(0xa77f4f, 0xd2ac78, { scale: 3, grain: 14, seed: 13, extra: (c, u, v) => mixc(c, [120, 85, 50], 0.25 * (0.5 + 0.5 * Math.sin(v * 90 + Math.sin(u * 6) * 3))) }),
  block: noisyTex(0xdedad0, 0xf1eee6, { scale: 14, grain: 12, seed: 17, extra: (c, u, v, r) => r() < 0.05 ? mixc(c, [150, 145, 135], 0.6) : c }),
  gravel: noisyTex(0x77736b, 0xa39d90, { scale: 20, grain: 50, seed: 21, repeat: [4, 30] }),
  roof: canvasTex(256, (u, v) => { const w = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 3); const s = (v * 8) % 1; const step = s < 0.12 ? 0.55 : 0.9 + 0.1 * s; const k = (0.6 + 0.4 * w) * step; return [58 * k + 8, 61 * k + 8, 66 * k + 10]; }, [1, 1]),
  drum: canvasTex(256, (u, v) => { const k = ((u * 3 + v * 1.5) % 1) < 0.06 ? 0.72 : 1; return [222 * k, 224 * k, 222 * k]; }),
};
tex.wood.rotation = 0;
const mat = {
  grass: M({ map: tex.grass, roughness: 1 }),
  sand: M({ map: tex.sand, roughness: 0.98 }),
  soil: M({ map: tex.soil, roughness: 1 }),
  concrete: M({ map: tex.concrete, roughness: 0.9 }),
  wetConcrete: M({ map: tex.concrete, roughness: 0.4, color: 0xa9a8a3 }),
  wood: M({ map: tex.wood, roughness: 0.85 }),
  block: M({ map: tex.block, roughness: 0.92 }),
  film: M({ color: 0x30363c, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide }),
  membrane: M({ color: 0x23211f, roughness: 0.6 }),
  rebar: M({ color: 0xa8683f, roughness: 0.5, metalness: 0.55 }),
  roof: M({ map: tex.roof, roughness: 0.45, metalness: 0.45 }),
  gravel: M({ map: tex.gravel, roughness: 1 }),
  yellow: M({ color: 0xe1a412, roughness: 0.5, metalness: 0.2 }),
  dark: M({ color: 0x24272b, roughness: 0.7, metalness: 0.3 }),
  steel: M({ color: 0x8b9096, roughness: 0.4, metalness: 0.8 }),
  glassCab: M({ color: 0x1d2a33, roughness: 0.1, metalness: 0.6 }),
  white: M({ color: 0xe9e9e6, roughness: 0.5 }),
  red: M({ color: 0xd8401f, roughness: 0.6 }),
  string: new THREE.MeshBasicMaterial({ color: 0xff5a1f }),
  frame: M({ color: 0x33373c, roughness: 0.45, metalness: 0.3 }),
  glass: M({ color: 0x7f9fb3, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 }),
  door: M({ color: 0x3b2c22, roughness: 0.55 }),
  drum: M({ map: tex.drum, roughness: 0.45, metalness: 0.3 }),
  trunk: M({ color: 0x4a3a2c, roughness: 1 }),
  leaf: M({ color: 0x46552f, roughness: 1 }),
  leaf2: M({ color: 0x3a4a2b, roughness: 1 }),
  fence: M({ color: 0x3a3e42, roughness: 0.6, metalness: 0.4 }),
};
const box = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
const cyl = (rt, rb, h, m, seg = 24) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.castShadow = o.receiveShadow = true; return o; };
const UNIT = new THREE.BoxGeometry(1, 1, 1);
// place a unit box by world extents
function setExt(o, x0, x1, y0, y1, z0, z1) {
  const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
  o.visible = sx > 1e-4 && sy > 1e-4 && sz > 1e-4;
  o.scale.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), Math.max(sz, 1e-4));
  o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
const ubox = (m) => { const o = new THREE.Mesh(UNIT, m); o.castShadow = o.receiveShadow = true; return o; };

// ---------- world ----------
// lawn with a hole under the building pad; the patch inside it is shown only until the pad is filled
const lawnShape = new THREE.Shape([[-300, -300], [300, -300], [300, 300], [-300, 300]].map(([x, y]) => new THREE.Vector2(x, y)));
lawnShape.holes.push(new THREE.Path([[-8, -7], [-8, 7], [8, 7], [8, -7]].map(([x, y]) => new THREE.Vector2(x, y))));
const lawnG = new THREE.ShapeGeometry(lawnShape); { const uv = lawnG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 300) / 600, (uv.getY(i) + 300) / 600); }
const ground = new THREE.Mesh(lawnG, mat.grass);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true; scene.add(ground);
const lawnPatch = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), M({ map: tex.grass.clone(), roughness: 1 }));
lawnPatch.material.map.repeat.set(16 / 600 * 90, 14 / 600 * 90); lawnPatch.rotation.x = -Math.PI / 2; lawnPatch.position.y = -0.5; lawnPatch.receiveShadow = true; scene.add(lawnPatch);
const drive = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 60), mat.gravel);
drive.rotation.set(-Math.PI / 2, 0, Math.PI / 2); drive.position.set(38, -0.49, 3.5); drive.receiveShadow = true; scene.add(drive);

// trees around the plot
{
  const r = rng(42), trunkG = new THREE.CylinderGeometry(0.18, 0.28, 1, 8), crownG = new THREE.IcosahedronGeometry(1, 3);
  const pos = crownG.attributes.position, nz = makeNoise(77);
  for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); v.multiplyScalar(0.85 + 0.3 * nz(v.x * 2 + 5, v.y * 2 + v.z * 2 + 5, 2)); pos.setXYZ(i, v.x, v.y, v.z); }
  crownG.computeVertexNormals();
  const n = 90, trunks = new THREE.InstancedMesh(trunkG, mat.trunk, n), c1 = new THREE.InstancedMesh(crownG, mat.leaf, n), c2 = new THREE.InstancedMesh(crownG, mat.leaf2, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    let x, z; do { const a = r() * Math.PI * 2, d = 24 + r() * 80; x = Math.cos(a) * d; z = Math.sin(a) * d; } while ((x > 10 && Math.abs(z - 3.5) < 6) || (z > -6 && Math.hypot(x, z) < 60));
    const h = 4 + r() * 5, s = 1.6 + r() * 1.8;
    m4.compose(new THREE.Vector3(x, -0.5 + h / 2, z), q, new THREE.Vector3(1, h, 1)); trunks.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, -0.5 + h + s * 0.5, z), q, new THREE.Vector3(s, s * 1.25, s)); c1.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x + s * 0.5, -0.5 + h + s * 0.1, z - s * 0.3), q, new THREE.Vector3(s * 0.8, s, s * 0.8)); c2.setMatrixAt(i, m4);
  }
  for (const o of [trunks, c1, c2]) { o.castShadow = true; scene.add(o); }
}
// fence
{
  const posts = [], add = (x, z) => posts.push([x, z]);
  for (let x = -14; x <= 14; x += 2.5) { add(x, -12); add(x, 12); }
  for (let z = -12; z <= 12; z += 2.5) { add(-14, z); if (z < -4 || z > 10) add(14, z); }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), mat.fence, posts.length), m4 = new THREE.Matrix4();
  posts.forEach(([x, z], i) => { m4.makeTranslation(x, 0.4, z); im.setMatrixAt(i, m4); });
  im.castShadow = true; scene.add(im);
  const rail = (x0, z0, x1, z1) => { for (const y of [0.1, 1.15]) { const o = ubox(mat.fence); setExt(o, Math.min(x0, x1) - 0.02, Math.max(x0, x1) + 0.02, y, y + 0.05, Math.min(z0, z1) - 0.02, Math.max(z0, z1) + 0.02); scene.add(o); } };
  rail(-14, -12, 14, -12); rail(-14, 12, 14, 12); rail(-14, -12, -14, 12); rail(14, -12, 14, -4); rail(14, 10, 14, 12);
}

// ---------- building pad (raised by sand fill) ----------
const padG = new THREE.Group(); scene.add(padG);
{
  const rect = (x0, z0, x1, z1) => { const s = new THREE.Shape(); s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.closePath(); return s; };
  const outer = rect(-8, -7, 8, 7); const hole = new THREE.Path(); hole.moveTo(-6.0, 5.0); hole.lineTo(-6.0, -5.0); hole.lineTo(6.0, -5.0); hole.lineTo(6.0, 5.0); hole.closePath(); outer.holes.push(hole);
  const shapes = [outer, rect(-4.7, -3.7, -0.3, 3.7), rect(0.3, -3.7, 4.7, 3.7)];
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 3, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, -3, 0);
  const sandSide = M({ map: tex.sand, roughness: 1, color: 0xd9c8aa });
  const pad = new THREE.Mesh(g, [mat.sand, sandSide]); pad.receiveShadow = pad.castShadow = true; padG.add(pad);
}

// foundation axes
const SEGS = [
  { id: 'S2', ax: 'x', c: 4, a0: -5, a1: 5, n: [0, 1] },
  { id: 'S4', ax: 'z', c: 5, a0: -4, a1: 4, n: [1, 0] },
  { id: 'S1', ax: 'x', c: -4, a0: -5, a1: 5, n: [0, -1] },
  { id: 'S3', ax: 'z', c: -5, a0: -4, a1: 4, n: [-1, 0] },
  { id: 'S5', ax: 'z', c: 0, a0: -4, a1: 4, n: [1, 0] },
];
// extents of a strip of half-width hw along a segment; x-segments cover corners, z-segments are trimmed
function stripExt(s, hw, y0, y1, along0, along1) {
  const e = s.ax === 'x' ? hw : -hw;
  const a0 = along0 ?? s.a0 - e, a1 = along1 ?? s.a1 + e;
  return s.ax === 'x' ? [a0, a1, y0, y1, s.c - hw, s.c + hw] : [s.c - hw, s.c + hw, y0, y1, a0, a1];
}
const pointOn = (s, a, off = 0) => s.ax === 'x' ? [a + s.n[0] * off, s.c + s.n[1] * off] : [s.c + s.n[0] * off, a + s.n[1] * off];

// trench chunks (diggable soil)
const TRENCH_HW = 0.3, TRENCH_BOT = -1.2;
const soilTopMats = [mat.soil, mat.soil, mat.sand, mat.soil, mat.soil, mat.soil];
const chunks = [];
SEGS.forEach((s, si) => {
  const [lo, hi] = s.ax === 'x' ? [s.a0 - TRENCH_HW, s.a1 + TRENCH_HW] : [s.a0 + TRENCH_HW, s.a1 - TRENCH_HW];
  const n = Math.round((hi - lo) / 0.8);
  for (let j = 0; j < n; j++) {
    const o = new THREE.Mesh(UNIT, soilTopMats.slice()); o.receiveShadow = o.castShadow = true; padG.add(o);
    chunks.push({ o, s, si, j, n, lo: lo + (hi - lo) * j / n, hi: lo + (hi - lo) * (j + 1) / n });
  }
});
// berms: ground just outside the perimeter trenches, dug out in episode 3 to open the foundation's outer face
const berms = SEGS.filter((s) => s.id !== 'S5').map((s) => {
  const o = new THREE.Mesh(UNIT, soilTopMats.slice()); o.receiveShadow = o.castShadow = true; padG.add(o);
  const nn = s.ax === 'x' ? s.n[1] : s.n[0], b = [s.c + nn * 0.3, s.c + nn * 1.0].sort((p, r) => p - r);
  return { o, s, ext: (top) => s.ax === 'x' ? [-6.0, 6.0, TRENCH_BOT, top, ...b] : [...b, TRENCH_BOT, top, -4.3, 4.3] };
});
// spoil heap
function heap(seed, r, h, m) {
  const g = new THREE.ConeGeometry(r, h, 48, 10); const p = g.attributes.position, nz = makeNoise(seed);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + 0.18 * (nz(x * 0.8 + 9, z * 0.8 + y * 0.3 + 9, 3) - 0.5); p.setXYZ(i, x * k, y, z * k); }
  g.translate(0, h / 2, 0); g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o;
}
const spoil = heap(5, 3.2, 2.2, mat.soil); spoil.position.set(-11, -0.5, -2.5); scene.add(spoil);
const sandPiles = [[6.8, 2.2], [-2.5, -5.6], [2.5, 5.6], [-6.5, 1.5], [0, 0]].map(([x, z], i) => { const o = heap(30 + i, 1.7, 1.1, mat.sand); o.position.set(x, 0, z); scene.add(o); return o; });

// setting-out: profile boards (obnoska) and strings
const markG = new THREE.Group(); scene.add(markG);
const stakes = [], boards = [], strings = [];
{
  const B = [[-6.6, 6.6, 5.6], [-6.6, 6.6, -5.6]]; // along x at z
  for (const [x0, x1, z] of B) { const o = ubox(mat.wood); o.userData.ext = [x0, x1, 0.45, 0.6, z - 0.02, z + 0.02]; boards.push(o); }
  for (const x of [-6.6, 6.6]) { const o = ubox(mat.wood); o.userData.ext = [x - 0.02, x + 0.02, 0.45, 0.6, -5.6, 5.6]; boards.push(o); }
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) for (const z of [-5.6, 5.6]) stakes.push([x, z]);
  for (const z of [-2.8, 0, 2.8]) for (const x of [-6.6, 6.6]) stakes.push([x, z]);
  stakes.forEach((p, i) => { const o = ubox(mat.wood); o.userData.p = p; stakes[i] = o; markG.add(o); });
  boards.forEach((o) => markG.add(o));
  const line = (x0, z0, x1, z1) => { const o = new THREE.Mesh(UNIT, mat.string); o.userData.l = [x0, z0, x1, z1]; strings.push(o); markG.add(o); };
  line(-6.6, -4, 6.6, -4); line(-6.6, 4, 6.6, 4); line(-5, -5.6, -5, 5.6); line(5, -5.6, 5, 5.6); line(0, -5.6, 0, 5.6);
}

// sand cushion, formwork, film, rebar, concrete, membrane per segment
const cushion = SEGS.map(() => { const o = ubox(mat.sand); padG.add(o); return o; });
const concrete = SEGS.map(() => { const o = ubox(mat.wetConcrete); padG.add(o); return o; });
const filmMats = (s) => { const inv = new THREE.MeshBasicMaterial({ visible: false }); const m = [mat.film, mat.film, inv, mat.film, mat.film, mat.film]; if (s.ax === 'x') { m[0] = m[1] = inv; } else { m[4] = m[5] = inv; } return m; };
const film = SEGS.map((s) => { const o = new THREE.Mesh(UNIT, filmMats(s)); o.receiveShadow = true; padG.add(o); return o; });
const membrane = SEGS.map(() => { const o = ubox(mat.membrane); padG.add(o); return o; });
// foundation insulation (episode 3): bitumen coating and XPS boards on the outer faces of the perimeter strips
const coatMat = M({ color: 0x141210, roughness: 0.25, metalness: 0.05 });
const xpsMat = M({ map: noisyTex(0xe9902f, 0xf4ad4f, { scale: 6, grain: 10, seed: 23 }), roughness: 0.85 });
const PERIM = SEGS.filter((s) => s.id !== 'S5');
const coat = PERIM.map(() => { const o = ubox(coatMat); padG.add(o); return o; });
const xpsList = [];
PERIM.forEach((s, si) => {
  const [lo, hi] = s.ax === 'x' ? [s.a0 - 0.3, s.a1 + 0.3] : [s.a0 + 0.2, s.a1 - 0.2], n = Math.ceil((hi - lo) / 1.2);
  for (let i = 0; i < n; i++) for (const [y0, y1] of [[-1.0, -0.35], [-0.35, 0.3]]) xpsList.push({ s, si, a0: lo + (hi - lo) * i / n, a1: lo + (hi - lo) * (i + 1) / n, y0, y1, f: (si + i / n) / PERIM.length });
});
const xps = new THREE.InstancedMesh(UNIT, xpsMat, xpsList.length); xps.castShadow = xps.receiveShadow = true; padG.add(xps);
// outward band [d0,d1] off the axis of a perimeter strip, as world extents
function faceExt(s, d0, d1, y0, y1, a0, a1) {
  const nn = s.ax === 'x' ? s.n[1] : s.n[0], b0 = s.c + nn * d0, b1 = s.c + nn * d1;
  return s.ax === 'x' ? [a0, a1, y0, y1, Math.min(b0, b1), Math.max(b0, b1)] : [Math.min(b0, b1), Math.max(b0, b1), y0, y1, a0, a1];
}
const FW_Y0 = -1.0, FW_Y1 = 0.42, FW_OFF = 0.225, FW_T = 0.03;
const formMat = mat.wood.clone(); formMat.transparent = true; // fades out when the formwork is stripped
const formBoards = [];
SEGS.forEach((s, si) => {
  for (const side of [1, -1]) {
    const outer = s.id !== 'S5' && side === 1; // side=+1 means toward outward normal
    let spans;
    if (outer) spans = s.ax === 'x' ? [[s.a0 - 0.24, s.a1 + 0.24]] : [[s.a0 - 0.24, s.a1 + 0.24]];
    else spans = s.ax === 'x' ? [[s.a0 + 0.21, -0.21], [0.21, s.a1 - 0.21]] : [[s.a0 + 0.21, s.a1 - 0.21]];
    for (const [a0, a1] of spans) {
      const o = ubox(formMat); const off = s.c + (s.ax === 'x' ? s.n[1] : s.n[0]) * side * FW_OFF;
      o.userData = { s, si, a0, a1, off }; formBoards.push(o); padG.add(o);
    }
  }
});
const spacers = [];
SEGS.forEach((s, si) => { for (let a = s.a0 + 0.5; a < s.a1 - 0.2; a += 1.0) { const o = ubox(formMat); o.userData = { s, si, a }; spacers.push(o); padG.add(o); } });

// rebar
const barG = new THREE.CylinderGeometry(0.024, 0.024, 1, 8); barG.rotateZ(Math.PI / 2); // along x, length 1
const bars = [];
SEGS.forEach((s, si) => { for (const lat of [-0.14, 0.14]) for (const y of [-0.86, 0.16]) { const o = new THREE.Mesh(barG, mat.rebar); o.castShadow = true; o.userData = { s, si, lat, y }; bars.push(o); padG.add(o); } });
const stirrupList = [];
SEGS.forEach((s, si) => { for (let a = s.a0 + 0.2; a <= s.a1 - 0.2 + 1e-6; a += 0.4) stirrupList.push({ s, si, a }); });
const stirrups = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.rebar, stirrupList.length * 4); stirrups.castShadow = true; padG.add(stirrups);

// ---------- walls (aerated concrete blocks) ----------
const WALL_Y0 = 0.31, ROW_H = 0.25, ROWS = 12, WALL_HW = 0.15;
const WALLS = { S1: { ax: 'x', c: -4, lo: -5.15, hi: 5.15 }, S2: { ax: 'x', c: 4, lo: -5.15, hi: 5.15 }, S3: { ax: 'z', c: -5, lo: -3.85, hi: 3.85 }, S4: { ax: 'z', c: 5, lo: -3.85, hi: 3.85 }, S5: { ax: 'z', c: 0, lo: -3.85, hi: 3.85 } };
const OPENINGS = [
  { w: 'S2', a0: -3.7, a1: -2.0, r0: 3, r1: 9, kind: 'win' }, { w: 'S2', a0: 2.1, a1: 3.8, r0: 3, r1: 9, kind: 'win' },
  { w: 'S2', a0: 0.35, a1: 1.35, r0: 0, r1: 9, kind: 'door' },
  { w: 'S4', a0: -1.0, a1: 1.0, r0: 3, r1: 9, kind: 'win' },
  { w: 'S1', a0: -3.2, a1: -1.6, r0: 3, r1: 9, kind: 'win' }, { w: 'S1', a0: 1.6, a1: 3.2, r0: 3, r1: 9, kind: 'win' },
  { w: 'S3', a0: -1.8, a1: 0.2, r0: 3, r1: 9, kind: 'win' },
];
// wall intervals of one block row, with window and door openings cut out
function rowIntervals(r, wid, w) {
  let iv = [[w.lo, w.hi]];
  for (const op of OPENINGS) if (op.w === wid && r >= op.r0 && r <= op.r1) iv = iv.flatMap(([a, b]) => { const out = []; if (op.a0 > a) out.push([a, Math.min(b, op.a0)]); if (op.a1 < b) out.push([Math.max(a, op.a1), b]); return out; });
  return iv;
}
const blocks = [];
for (let r = 0; r < ROWS; r++) {
  for (const [wid, w] of Object.entries(WALLS)) {
    for (const [a, b] of rowIntervals(r, wid, w)) {
      let cur = a, first = true;
      while (cur < b - 0.02) {
        const len = Math.min(first && r % 2 ? 0.3 : 0.6, b - cur);
        blocks.push({ wid, w, r, a0: cur, a1: cur + len, f: (cur - w.lo) / (w.hi - w.lo) });
        cur += len; first = false;
      }
    }
  }
}
// row schedule (legacy time t): a pause after every reinforced row for the bars in the chase
const REINF_ROWS = [0, 3, 7], ROW_DT = 0.68, REINF_PAUSE = 0.6;
const rowStart = (r) => 65.3 + r * ROW_DT + REINF_ROWS.filter((x) => x < r).length * REINF_PAUSE;
const rowDone = (r) => rowStart(r) + 0.5 + 0.28;
const reinf = [];
for (const r of REINF_ROWS) for (const [wid, w] of Object.entries(WALLS)) for (const [a, b] of rowIntervals(r, wid, w)) for (const off of [-0.07, 0.07]) reinf.push({ r, w, a, b, off });
const reinfIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.rebar, reinf.length); reinfIM.castShadow = true; scene.add(reinfIM);
// masons' scaffold inside along the front wall, and pallets of blocks
const scaffold = new THREE.Group(); scene.add(scaffold);
for (const [x0, x1] of [[-4.5, -0.5], [0.5, 4.5]]) {
  for (const x of [x0, (x0 + x1) / 2, x1]) for (const z of [2.75, 3.6]) { const p = cyl(0.024, 0.024, 1.85, mat.steel, 8); p.position.set(x, 0.92, z); scaffold.add(p); }
  for (const z of [2.75, 3.6]) for (const y of [0.9, 1.55]) { const r = box(x1 - x0, 0.04, 0.04, mat.steel); r.position.set((x0 + x1) / 2, y, z); scaffold.add(r); }
  for (let i = 0; i < 3; i++) { const pl = box(x1 - x0, 0.05, 0.26, mat.wood); pl.position.set((x0 + x1) / 2, 1.6, 2.86 + i * 0.28); scaffold.add(pl); }
}
for (const [x, z] of [[7.0, -2.2], [7.0, -0.6], [-7.2, 1.2]]) {
  const pal = box(1.2, 0.14, 1.0, mat.wood); pal.position.set(x, 0.07, z); scaffold.add(pal);
  const st = box(1.2, 1.25, 1.0, mat.block); st.position.set(x, 0.77, z); scaffold.add(st);
}
const blockIM = new THREE.InstancedMesh(UNIT, mat.block, blocks.length); blockIM.castShadow = blockIM.receiveShadow = true;
{ const r = rng(9), c = new THREE.Color(); blocks.forEach((b, i) => {
  const lintel = OPENINGS.some((op) => op.w === b.wid && b.r === op.r1 + 1 && (b.a0 + b.a1) / 2 > op.a0 - 0.3 && (b.a0 + b.a1) / 2 < op.a1 + 0.3);
  const k = 0.93 + r() * 0.07; if (lintel) c.setRGB(0.62, 0.62, 0.6); else c.setRGB(k, k * 0.995, k * 0.985); blockIM.setColorAt(i, c);
}); }
scene.add(blockIM);
const ringBeam = SEGS.map(() => { const o = ubox(mat.concrete); scene.add(o); return o; });

// ---------- roof ----------
const ROOF_Y = 3.56, SLOPE = 0.6, ANG = Math.atan(SLOPE), RIDGE = ROOF_Y + 4.15 * SLOPE;
const yb = (z) => ROOF_Y + (4.15 - Math.abs(z)) * SLOPE;
const gables = [-5, 5].map((x) => {
  const sh = new THREE.Shape(); sh.moveTo(-4.15, 0); sh.lineTo(4.15, 0); sh.lineTo(0, 4.15 * SLOPE); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-0.15, 0, 0);
  const o = new THREE.Mesh(g, mat.block); o.castShadow = o.receiveShadow = true; o.position.set(x, ROOF_Y, 0); scene.add(o); return o;
});
const mauerlat = [-4, 4].map((z) => { const o = ubox(mat.wood); scene.add(o); o.userData.z = z; return o; });
const rafterL = 4.75 / Math.cos(ANG);
const rafterList = []; for (let x = -5.4; x <= 5.41; x += 0.6) for (const s of [1, -1]) rafterList.push({ x, s });
const rafters = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.18, rafterL), mat.wood, rafterList.length); rafters.castShadow = true; scene.add(rafters);
const sheets = [];
for (const s of [1, -1]) for (let i = 0; i < 10; i++) {
  const L = rafterL + 0.15, g = new THREE.BoxGeometry(1.16, 0.035, L); g.translate(0, 0, -s * L / 2);
  const o = new THREE.Mesh(g, mat.roof); o.castShadow = o.receiveShadow = true;
  const t = tex.roof.clone(); t.repeat.set(3.3, 17); t.needsUpdate = true; o.material = mat.roof.clone(); o.material.map = t;
  o.userData = { s, i, x: -5.7 + 0.585 + i * 1.14 }; scene.add(o); sheets.push(o);
}
const ridgeCap = box(11.6, 0.22, 0.22, mat.roof); ridgeCap.rotation.x = Math.PI / 4; scene.add(ridgeCap);

// windows and door
const windows = OPENINGS.map((op) => {
  const w = WALLS[op.w], g = new THREE.Group(), wd = op.a1 - op.a0, ht = (op.r1 - op.r0 + 1) * ROW_H, F = 0.07;
  if (op.kind === 'door') {
    const p = box(wd - 0.1, ht - 0.05, 0.08, mat.door); g.add(p);
    const h = box(0.04, 0.4, 0.06, mat.steel); h.position.set(wd / 2 - 0.2, 0, 0.07); g.add(h);
  } else {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(wd - 0.1, ht - 0.1), mat.glass); g.add(gl);
    const mul = box(F, ht, 0.08, mat.frame); g.add(mul);
  }
  for (const [x, y, sx, sy] of [[0, ht / 2 - F / 2, wd, F], [0, -ht / 2 + F / 2, wd, F], [wd / 2 - F / 2, 0, F, ht], [-wd / 2 + F / 2, 0, F, ht]]) { const f = box(sx, sy, 0.1, mat.frame); f.position.set(x, y, 0); g.add(f); }
  const sill = box(wd + 0.1, 0.03, 0.22, mat.steel); sill.position.set(0, -ht / 2 - 0.015, 0.1); if (op.kind === 'win') g.add(sill);
  const yc = WALL_Y0 + op.r0 * ROW_H + ht / 2, ac = (op.a0 + op.a1) / 2;
  const out = op.w === 'S1' || op.w === 'S3' ? -1 : 1;
  if (w.ax === 'x') { g.position.set(ac, yc, w.c + out * 0.04); g.rotation.y = out < 0 ? Math.PI : 0; }
  else { g.position.set(w.c + out * 0.04, yc, ac); g.rotation.y = out * Math.PI / 2; }
  g.userData.base = g.position.clone(); g.userData.out = out; g.userData.ax = w.ax;
  scene.add(g); return g;
});

// ---------- machines ----------
function wheel(r = 0.5, w = 0.4) { const g = new THREE.Group(); const t = cyl(r, r, w, mat.dark, 20); t.rotation.x = Math.PI / 2; g.add(t); const h = cyl(r * 0.5, r * 0.5, w + 0.02, mat.steel, 16); h.rotation.x = Math.PI / 2; g.add(h); return g; }
function excavator() {
  const g = new THREE.Group(), upper = new THREE.Group();
  for (const z of [-1.15, 1.15]) { const t = box(3.6, 0.8, 0.6, mat.dark); t.position.set(0, 0.4, z); g.add(t); }
  const turn = cyl(0.8, 0.8, 0.3, mat.dark); turn.position.y = 0.95; g.add(turn);
  upper.position.y = 1.1; g.add(upper);
  const body = box(3.0, 1.0, 2.4, mat.yellow); body.position.set(-0.4, 0.5, 0); upper.add(body);
  const cw = box(0.7, 0.9, 2.4, mat.dark); cw.position.set(-1.9, 0.55, 0); upper.add(cw);
  const cab = box(1.1, 1.5, 0.95, mat.yellow); cab.position.set(0.45, 1.75, 0.7); upper.add(cab);
  const win = box(0.02, 1.0, 0.8, mat.glassCab); win.position.set(1.01, 1.9, 0.7); upper.add(win);
  const sideWin = box(0.8, 0.9, 0.02, mat.glassCab); sideWin.position.set(0.45, 1.9, 1.18); upper.add(sideWin);
  const boom = new THREE.Group(); boom.position.set(0.9, 0.9, -0.25); upper.add(boom);
  const bm = box(4.2, 0.45, 0.4, mat.yellow); bm.position.x = 2.1; boom.add(bm);
  const stick = new THREE.Group(); stick.position.x = 4.2; boom.add(stick);
  const st = box(0.35, 2.6, 0.32, mat.yellow); st.position.y = -1.3; stick.add(st);
  const bucket = new THREE.Group(); bucket.position.y = -2.6; stick.add(bucket);
  const bk = box(0.7, 0.6, 0.85, mat.dark); bk.position.set(0.25, -0.3, 0); bucket.add(bk);
  const ram = cyl(0.07, 0.07, 2.2, mat.steel, 8); ram.rotation.z = Math.PI / 2 - 0.5; ram.position.set(1.2, 0.2, 0); boom.add(ram);
  g.scale.setScalar(0.8);
  return { g, upper, boom, stick, bucket };
}
function dumpTruck() {
  const g = new THREE.Group();
  const ch = box(6.4, 0.35, 1.0, mat.dark); ch.position.set(0, 0.85, 0); g.add(ch);
  const cab = box(1.7, 1.9, 2.4, mat.white); cab.position.set(2.45, 1.85, 0); g.add(cab);
  const ws = box(0.03, 0.8, 2.1, mat.glassCab); ws.position.set(3.31, 2.3, 0); g.add(ws);
  const bed = new THREE.Group(); bed.position.set(-2.9, 1.1, 0); g.add(bed);
  const bb = box(4.4, 1.2, 2.4, M({ color: 0x8c3b22, roughness: 0.55, metalness: 0.3 })); bb.position.set(2.2, 0.6, 0); bed.add(bb);
  const load = heap(55, 1.05, 0.6, mat.sand); load.scale.set(1.9, 1, 1); load.position.set(2.2, 1.0, 0); bed.add(load);
  for (const x of [2.3, -1.4, -2.6]) for (const z of [-1.05, 1.05]) { const w = wheel(0.52, 0.42); w.position.set(x, 0.52, z); g.add(w); }
  return { g, bed, load };
}
function mixer() {
  const g = new THREE.Group();
  const ch = box(7.4, 0.35, 1.0, mat.dark); ch.position.set(0, 0.85, 0); g.add(ch);
  const cab = box(1.7, 1.9, 2.4, mat.white); cab.position.set(2.9, 1.85, 0); g.add(cab);
  const ws = box(0.03, 0.8, 2.1, mat.glassCab); ws.position.set(3.76, 2.3, 0); g.add(ws);
  const drumG = new THREE.Group(); drumG.position.set(-0.6, 2.25, 0); drumG.rotation.z = -0.2; g.add(drumG);
  const d = cyl(0.75, 1.2, 4.4, mat.drum, 28); d.rotation.z = Math.PI / 2; drumG.add(d);
  const chute = box(3.9, 0.12, 0.45, mat.steel); g.add(chute); chute.userData.base = true;
  for (const x of [2.7, -1.6, -2.9]) for (const z of [-1.05, 1.05]) { const w = wheel(0.52, 0.42); w.position.set(x, 0.52, z); g.add(w); }
  return { g, drum: d, chute };
}
function roller() {
  const g = new THREE.Group();
  const drum = cyl(0.65, 0.65, 2.0, mat.yellow, 24); drum.rotation.x = Math.PI / 2; drum.position.set(1.3, 0.65, 0); g.add(drum);
  const frame = box(2.2, 1.0, 1.9, mat.yellow); frame.position.set(-0.6, 1.0, 0); g.add(frame);
  const cab = box(1.0, 1.2, 1.2, mat.dark); cab.position.set(-0.4, 2.1, 0); g.add(cab);
  for (const z of [-0.85, 0.85]) { const w = wheel(0.6, 0.45); w.position.set(-1.1, 0.6, z); g.add(w); }
  return { g, drum };
}
const exc = excavator(); scene.add(exc.g);
const dump = dumpTruck(); scene.add(dump.g);
const mix = mixer(); scene.add(mix.g);
const rol = roller(); scene.add(rol.g);
for (const o of [exc.g, dump.g, mix.g, rol.g]) o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

// ---------- per-frame state ----------
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), vs = new THREE.Vector3(), vp = new THREE.Vector3();
const DIG0 = 18.6, DIG_SEG = 1.55;

export function update(T) {
  // master time; episode 3 inserts 5 s of insulation work at 58.2, so later stages run on t = T - 5
  const t = T < 58.2 ? T : Math.max(58.2, T - 5);
  PERIM.forEach((s, i) => {
    const a = ease(58.4 + i * 0.4, 59.6 + i * 0.4, T), [lo, hi] = s.ax === 'x' ? [s.a0 - 0.215, s.a1 + 0.215] : [s.a0 - 0.215, s.a1 + 0.215];
    setExt(coat[i], ...faceExt(s, 0.206, 0.214, -1.0, lerp(-1.0, 0.3, a), lo, hi)); coat[i].visible = a > 0.001;
  });
  xpsList.forEach((p, i) => {
    const k = ease(60.5 + p.f * 2.2 + (p.y0 > -0.5 ? 0.15 : 0), 60.8 + p.f * 2.2 + (p.y0 > -0.5 ? 0.15 : 0), T);
    if (k <= 0) { m4.makeScale(0, 0, 0); xps.setMatrixAt(i, m4); return; }
    const [x0, x1, y0, y1, z0, z1] = faceExt(p.s, 0.216 + (1 - k) * 0.4, 0.296 + (1 - k) * 0.4, p.y0, p.y1, p.a0 + 0.004, p.a1 - 0.004);
    vp.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.004, (z0 + z1) / 2); vs.set(x1 - x0, y1 - y0 - 0.008, z1 - z0); m4.compose(vp, q.identity(), vs); xps.setMatrixAt(i, m4);
  });
  xps.instanceMatrix.needsUpdate = true;
  // stage 1: dump truck reverses in, tips, leaves; pad rises; roller compacts
  {
    const inP = ease(5.0, 7.4, t), outP = ease(9.6, 11.6, t);
    const x = lerp(30, 11.2, inP) + lerp(0, 22, outP);
    dump.g.position.set(x, -0.5, 4.2); dump.g.visible = t > 4.9 && t < 11.7;
    dump.bed.rotation.z = -0.8 * (ease(7.5, 8.6, t) - ease(9.0, 9.7, t));
    dump.load.visible = t < 8.4; dump.load.scale.y = 1 - lin(7.8, 8.4, t) * 0.8;
    const padY = lerp(-0.53, 0, ease(8.6, 12, t)); padG.position.y = padY; lawnPatch.visible = padY <= -0.5;
    sandPiles.forEach((o, i) => {
      const a = outBack(lin(7.9 + i * 0.25, 8.6 + i * 0.25, t)), f = ease(9.8, 12.3, t);
      o.visible = a > 0.001 && f < 0.999; o.position.y = padY;
      o.scale.set(a * (1 + f * 0.8), a * (1 - f) + 1e-3, a * (1 + f * 0.8));
    });
    rol.g.visible = t > 10.3 && t < 13.6;
    const rp = lin(10.4, 13.5, t), pass = rp < 0.5 ? rp * 2 : (1 - rp) * 2 + 0;
    rol.g.position.set(lerp(-5.5, 5.5, smooth(pass)), padY, rp < 0.5 ? -2 : 2);
    rol.g.rotation.y = rp < 0.5 ? 0 : Math.PI; rol.drum.rotation.y = t * 3;
  }
  // stage 2: setting out
  {
    const fade = 1 - ease(56.4, 57.4, T); // profile boards come down once the concrete is in
    stakes.forEach((o, i) => { const a = ease(13.3 + i * 0.07, 13.8 + i * 0.07, t) * fade; const [x, z] = o.userData.p; setExt(o, x - 0.04, x + 0.04, -0.3, -0.3 + 1.05 * a, z - 0.04, z + 0.04); });
    boards.forEach((o, i) => { const a = ease(14.3 + i * 0.2, 15.0 + i * 0.2, t) * fade; const [x0, x1, y0, y1, z0, z1] = o.userData.ext; setExt(o, x0, x1, y0, lerp(y0, y1, a), z0, z1); });
    strings.forEach((o, i) => {
      const a = ease(15.2 + i * 0.25, 16.3 + i * 0.25, t) * (1 - ease(26.8, 27.6, t)); const [x0, z0, x1, z1] = o.userData.l; const y = 0.56;
      if (x0 === x1) setExt(o, x0 - 0.01, x0 + 0.01, y, y + 0.02, z0, lerp(z0, z1, a)); else setExt(o, x0, lerp(x0, x1, a), y, y + 0.02, z0 - 0.01, z0 + 0.01);
    });
  }
  // stage 3: excavation (chunks), stage 9: backfill
  const backfill = ease(58.2, 60.8, t);
  for (const c of chunks) {
    const ts = DIG0 + c.si * DIG_SEG, f = clamp((t - ts) / DIG_SEG);
    const d = smooth(clamp(f * (c.n + 1) - c.j));
    let top = lerp(0, TRENCH_BOT, d);
    if (backfill > 0) top = lerp(TRENCH_BOT, 0, smooth(clamp(backfill * 1.4 - (c.j / c.n) * 0.4)));
    c.o.material[2] = (d > 0 && backfill <= 0) ? mat.soil : mat.sand;
    const ext = c.s.ax === 'x' ? [c.lo, c.hi, TRENCH_BOT, top, c.s.c - TRENCH_HW, c.s.c + TRENCH_HW] : [c.s.c - TRENCH_HW, c.s.c + TRENCH_HW, TRENCH_BOT, top, c.lo, c.hi];
    setExt(c.o, ...ext);
  }
  berms.forEach((b, i) => {
    const dig = ease(57.3 + i * 0.25, 58.2 + i * 0.25, T), fill = ease(58.2, 60.8, t) * (T > 58.2 ? 1 : 0);
    const top = fill > 0 ? lerp(-1.0, 0, fill) : lerp(0, -1.0, dig);
    b.o.material[2] = dig > 0 && fill <= 0 ? mat.soil : mat.sand; setExt(b.o, ...b.ext(top));
  });
  spoil.scale.setScalar(Math.max(1e-3, ease(18.8, 26.5, t) * (1 - ease(58.2, 60.8, t) * 0.85)));
  spoil.visible = t > 18.8;
  {
    const on = t > 16.8 && t < 28.2; exc.g.visible = on;
    if (on) {
      const si = clamp(Math.floor((t - DIG0) / DIG_SEG), 0, SEGS.length - 1), s = SEGS[si];
      const f = clamp((t - DIG0 - si * DIG_SEG) / DIG_SEG);
      const [px, pz] = pointOn(s, lerp(s.a0, s.a1, f), 3.6);
      let pos = new THREE.Vector3(px, 0, pz), yaw = Math.atan2(s.n[1], -s.n[0]);
      if (si > 0) { const sp = SEGS[si - 1]; const [qx, qz] = pointOn(sp, sp.a1, 3.6); const k = ease(0, 0.18, f); pos.lerp(new THREE.Vector3(qx, 0, qz), 1 - k); }
      const arrive = ease(16.8, DIG0, t), leave = ease(26.6, 28.2, t);
      pos.add(new THREE.Vector3(8, 0, 9).multiplyScalar(1 - arrive)).add(new THREE.Vector3(-9, 0, 9).multiplyScalar(leave));
      exc.g.position.copy(pos); exc.g.rotation.y = yaw;
      const ph = ((t - DIG0) * 0.9) % 1, digging = t > DIG0 && t < DIG0 + DIG_SEG * 5;
      const w = digging ? 1 : 0;
      exc.upper.rotation.y = w * 0.9 * (ease(0.55, 0.72, ph) - ease(0.82, 0.98, ph));
      exc.boom.rotation.z = lerp(0.35, -0.32 + 0.45 * (ease(0.35, 0.55, ph) - ease(0.85, 1, ph)), w);
      exc.stick.rotation.z = lerp(-0.4, -0.1 - 0.7 * (ease(0.0, 0.35, ph) - ease(0.7, 0.85, ph)), w);
      exc.bucket.rotation.z = lerp(0.6, 0.9 * (ease(0.25, 0.45, ph) - ease(0.72, 0.8, ph)), w);
    }
  }
  // stage 4: cushion
  SEGS.forEach((s, i) => { const a = ease(27.4 + i * 0.4, 29.4 + i * 0.4, t); setExt(cushion[i], ...stripExt(s, TRENCH_HW - 0.002, TRENCH_BOT, TRENCH_BOT + 0.2 * a + (a > 0 ? 0 : -1))); });
  // stage 5: formwork, stripped at stage 9
  const strip = ease(56.3, 57.6, t) * 0.4; formMat.opacity = 1 - ease(56.3, 57.6, t); formMat.depthWrite = formMat.opacity > 0.99;
  formBoards.forEach((o) => {
    const { s, si, a0, a1, off } = o.userData; const a = ease(31.3 + si * 0.75, 32.6 + si * 0.75, t);
    const y1 = lerp(FW_Y0, FW_Y1, a) + strip, y0 = FW_Y0 + strip; o.visible = formMat.opacity > 0.001;
    if (s.ax === 'x') setExt(o, a0, a1, y0, y1, off - FW_T / 2, off + FW_T / 2); else setExt(o, off - FW_T / 2, off + FW_T / 2, y0, y1, a0, a1);
    if (formMat.opacity <= 0.001) o.visible = false;
  });
  spacers.forEach((o) => {
    const { s, si, a } = o.userData; const k = outBack(lin(35.0 + si * 0.25 + (a - s.a0) * 0.03, 35.5 + si * 0.25 + (a - s.a0) * 0.03, t));
    const y = FW_Y1 + 0.01 + strip; const hw = 0.27 * k;
    if (s.ax === 'x') setExt(o, a - 0.025, a + 0.025, y, y + 0.05 * (k > 0 ? 1 : 0), s.c - hw, s.c + hw); else setExt(o, s.c - hw, s.c + hw, y, y + 0.05 * (k > 0 ? 1 : 0), a - 0.025, a + 0.025);
    if (formMat.opacity <= 0.001) o.visible = false;
  });
  // stage 6: film
  SEGS.forEach((s, i) => { const a = ease(37.3 + i * 0.5, 39.0 + i * 0.5, t); setExt(film[i], ...stripExt(s, 0.205, FW_Y0, lerp(FW_Y0 + 0.01, 0.4, a))); film[i].visible = a > 0.001; });
  // stage 7: rebar
  bars.forEach((o) => {
    const { s, si, lat, y } = o.userData, a = ease(41.3 + si * 0.45, 42.8 + si * 0.45, t);
    const lo = s.ax === 'x' ? s.a0 - 0.14 : s.a0 + 0.14, hi = s.ax === 'x' ? s.a1 + 0.14 : s.a1 - 0.14, len = (hi - lo) * a;
    o.visible = a > 0.001; o.scale.set(Math.max(len, 1e-3), 1, 1);
    const mid = lo + len / 2;
    if (s.ax === 'x') { o.position.set(mid, y, s.c + lat); o.rotation.y = 0; } else { o.position.set(s.c + lat, y, mid); o.rotation.y = Math.PI / 2; }
  });
  stirrupList.forEach((st, i) => {
    const { s, si, a } = st, k = outBack(lin(43.2 + si * 0.9 + (a - s.a0) / (s.a1 - s.a0) * 1.4, 43.6 + si * 0.9 + (a - s.a0) / (s.a1 - s.a0) * 1.4, t));
    const parts = [[0, 0.16, 0.3, 0.025], [0, -0.86, 0.3, 0.025], [0.14, -0.35, 0.025, 1.04], [-0.14, -0.35, 0.025, 1.04]];
    parts.forEach(([lat, y, sl, sy], j) => {
      const sc = Math.max(k, 1e-4);
      if (s.ax === 'x') { vp.set(a, y, s.c + lat); vs.set(0.03 * sc, sy * sc, sl * sc); } else { vp.set(s.c + lat, y, a); vs.set(sl * sc, sy * sc, 0.03 * sc); }
      m4.compose(vp, q.identity(), vs); stirrups.setMatrixAt(i * 4 + j, m4);
    });
  });
  stirrups.instanceMatrix.needsUpdate = true;
  // stage 8: concrete
  SEGS.forEach((s, i) => {
    const a = ease(50.0 + i * 1.0, 52.6 + i * 1.0, t); setExt(concrete[i], ...stripExt(s, 0.2, FW_Y0, lerp(FW_Y0, 0.3, a)));
    concrete[i].material = t > 57 ? mat.concrete : mat.wetConcrete;
  });
  {
    mix.g.visible = t > 47.5 && t < 57.2;
    const x = lerp(30, 9.9, ease(47.5, 49.8, t)) + lerp(0, 24, ease(55.6, 57.2, t));
    mix.g.position.set(x, -0.5, 2.0); mix.g.rotation.y = 0; mix.drum.rotation.y = -t * 2.4;
    // chute from rear of truck to the foundation
    const pour = ease(49.6, 50.2, t) * (1 - ease(55.2, 55.6, t));
    const rear = new THREE.Vector3(-3.7, 1.35, 0), tgt = new THREE.Vector3(lerp(-3.7, 5.3 - x, pour), lerp(1.35, 0.95, pour), 0);
    const dir = tgt.clone().sub(rear); mix.chute.visible = pour > 0.01;
    mix.chute.position.copy(rear).add(dir.clone().multiplyScalar(0.5)); mix.chute.scale.set(Math.max(dir.length(), 0.01) / 3.9, 1, 1);
    mix.chute.rotation.set(0, 0, Math.atan2(dir.y, dir.x));
  }
  // stage 10: membrane
  SEGS.forEach((s, i) => {
    const a = ease(61.3 + i * 0.55, 62.7 + i * 0.55, t), [lo, hi] = s.ax === 'x' ? [s.a0 - 0.2, s.a1 + 0.2] : [s.a0 + 0.2, s.a1 - 0.2];
    setExt(membrane[i], ...stripExt(s, 0.205, 0.3, 0.315, lo, lerp(lo, hi, a))); membrane[i].visible = a > 0.001;
  });
  // stage 11: walls
  blocks.forEach((b, i) => {
    const t0 = rowStart(b.r) + b.f * 0.5, k = ease(t0, t0 + 0.28, t);
    const y0 = WALL_Y0 + b.r * ROW_H + (1 - k) * 0.5, gap = 0.006;
    if (k <= 0) { m4.makeScale(0, 0, 0); blockIM.setMatrixAt(i, m4); return; }
    const L = b.a1 - b.a0 - gap, mid = (b.a0 + b.a1) / 2;
    if (b.w.ax === 'x') { vp.set(mid, y0 + ROW_H / 2, b.w.c); vs.set(L, ROW_H - gap, WALL_HW * 2); } else { vp.set(b.w.c, y0 + ROW_H / 2, mid); vs.set(WALL_HW * 2, ROW_H - gap, L); }
    m4.compose(vp, q.identity(), vs); blockIM.setMatrixAt(i, m4);
  });
  blockIM.instanceMatrix.needsUpdate = true;
  reinf.forEach((p, i) => {
    const k = ease(rowDone(p.r) + 0.05, rowDone(p.r) + 0.45, t), y = WALL_Y0 + (p.r + 1) * ROW_H + 0.008, len = (p.b - p.a) * k;
    if (k <= 0) { m4.makeScale(0, 0, 0); reinfIM.setMatrixAt(i, m4); return; }
    if (p.w.ax === 'x') { vp.set(p.a + len / 2, y, p.w.c + p.off); vs.set(len, 0.016, 0.016); } else { vp.set(p.w.c + p.off, y, p.a + len / 2); vs.set(0.016, 0.016, len); }
    m4.compose(vp, q.identity(), vs); reinfIM.setMatrixAt(i, m4);
  });
  reinfIM.instanceMatrix.needsUpdate = true;
  scaffold.visible = t > 64.8 && t < 79.2;
  // stage 12: ring beam
  SEGS.forEach((s, i) => { const a = ease(76.3 + i * 0.35, 77.6 + i * 0.35, t); const y0 = WALL_Y0 + ROWS * ROW_H; setExt(ringBeam[i], ...stripExt(s, WALL_HW, y0, y0 + 0.25 * a)); ringBeam[i].visible = a > 0.001; });
  // stage 13: roof
  gables.forEach((o, i) => { const a = ease(79.3 + i * 0.4, 80.8 + i * 0.4, t); o.scale.set(1, Math.max(a, 1e-3), 1); o.visible = a > 0.001; });
  mauerlat.forEach((o, i) => { const a = ease(80.4 + i * 0.3, 81.2 + i * 0.3, t); const z = o.userData.z; setExt(o, -5.3, lerp(-5.3, 5.3, a), ROOF_Y, ROOF_Y + 0.15, z - 0.075, z + 0.075); o.visible = a > 0.001; });
  rafterList.forEach((r, i) => {
    const k = outBack(lin(81.0 + (r.x + 5.4) * 0.2 + (r.s < 0 ? 0.15 : 0), 81.4 + (r.x + 5.4) * 0.2 + (r.s < 0 ? 0.15 : 0), t));
    const zc = r.s * 4.75 / 2, yc = yb(zc) + 0.09 / Math.cos(ANG) + (1 - Math.min(k, 1)) * 0.6;
    e.set(r.s * ANG, 0, 0); q.setFromEuler(e); vp.set(r.x, yc, zc); vs.setScalar(Math.max(k, 1e-4));
    m4.compose(vp, q, vs); rafters.setMatrixAt(i, m4);
  });
  rafters.instanceMatrix.needsUpdate = true; q.identity();
  sheets.forEach((o) => {
    const { s, i, x } = o.userData, k = ease(84.0 + i * 0.28 + (s < 0 ? 0.12 : 0), 84.5 + i * 0.28 + (s < 0 ? 0.12 : 0), t);
    const ze = s * 4.8, ye = yb(ze) + 0.18 / Math.cos(ANG) + 0.02;
    o.visible = k > 0.001; o.rotation.set(s * ANG, 0, 0);
    o.position.set(x, ye + (1 - k) * 0.8, ze); o.material.opacity = 1;
  });
  { const k = ease(87.3, 87.8, t); ridgeCap.visible = k > 0.001; ridgeCap.position.set(0, RIDGE + 0.27 + (1 - k) * 0.5, 0); }
  // stage 14: windows
  windows.forEach((g, i) => {
    const k = ease(88.3 + i * 0.35, 88.9 + i * 0.35, t); g.visible = k > 0.001;
    const d = (1 - k) * 0.8 * g.userData.out; g.position.copy(g.userData.base);
    if (g.userData.ax === 'x') g.position.z += d; else g.position.x += d;
  });
}

export { clamp, smooth, ease, lin, outBack, lerp, rng, M, mat, box, cyl, ubox, setExt, SEGS, padG, WALLS, ROW_H, WALL_Y0, TRENCH_BOT, DIG0, DIG_SEG, rowStart, rowDone };
