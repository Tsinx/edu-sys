/* Original geometric motion study. Seconds are the only animation state.
 * Build: node scripts/economic-mathematics-prelude.mjs build
 * Three.js geometry and Canvas paths share this clock in preview and export.
 */
import * as THREE from 'three';

export const DURATION = 90;
export const FPS = 60;
export const shots = [
  { from: 0, to: 10, name: '点场', meaning: '个体选择汇成市场' },
  { from: 10, to: 24, name: '响应', meaning: '价格变化与需求响应' },
  { from: 24, to: 38, name: '变化', meaning: '局部方向与变化率' },
  { from: 38, to: 52, name: '累积', meaning: '微小增量形成累计' },
  { from: 52, to: 68, name: '曲面', meaning: '多因素共同作用' },
  { from: 68, to: 82, name: '选择', meaning: '有限资源下的配置' },
  { from: 82, to: 90, name: '归拢', meaning: '经济数学' }
];
export const words = [
  { from: 3, to: 4.2, text: '变量' }, { from: 7.4, to: 8.6, text: '函数' },
  { from: 20.2, to: 21.6, text: '极限' },
  { from: 27, to: 28.3, text: '导数' }, { from: 31, to: 32.5, text: '变化率' },
  { from: 41, to: 42.4, text: '积分' }, { from: 46, to: 47.5, text: '累积' },
  { from: 54, to: 55.4, text: '多元函数' }, { from: 57, to: 58.4, text: '偏导数' },
  { from: 63, to: 64.4, text: '等高线' },
  { from: 71, to: 72.5, text: '约束' }, { from: 75, to: 76.4, text: '选择' },
  { from: 78, to: 79.6, text: '最优解' },
  { from: 85, to: 90, text: '经济数学' }
];
const TAU = Math.PI * 2, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const mix = (a, b, u) => a + (b - a) * u;
export const palette = { blue: '#1645ff', yellow: '#ffe229', green: '#21e779', ink: '#081b57', paper: '#fff9e8', orange: '#ff633c' };
export const impactTimes = [...new Set([2, 6, 14, 18, 27, 42, 56, 60, 75, ...words.map(w => w.from + .18)])].sort((a, b) => a - b);
const { ink, paper, orange } = palette, cyan = palette.green;
const beatImpact = t => impactTimes.reduce((v, at) => Math.max(v, t >= at ? Math.exp(-(t - at) * 13) : 0), 0);
const cameraKeys = {
  blocks: [[0, 0, 29, .1, 43, 0], [3, 15, 13, 17, 46, -.1], [5.5, 9, 6.7, 15, 53, .09], [9, -13, 9, 16, 49, -.12], [11.5, -8, 22, 7, 45, .1], [14, 8, 23, 16, 43, 0]],
  accumulation: [[0, 18, 17, 25, 43, -.08], [3.5, 12, 8, 16, 50, .1], [7.5, -13, 10, 17, 47, -.12], [11, -8, 23, 12, 42, .08], [14, 12, 20, 22, 43, 0]],
  surface: [[0, 18, 21, 25, 43, -.12], [3.5, 15, 11, 19, 48, .12], [7.5, -14, 13, 20, 49, -.1], [12, -18, 23, -9, 44, .1], [16, 8, 28, -19, 44, 0]],
  allocation: [[0, 17, 20, 25, 44, -.12], [3.5, 10, 9, 19, 47, .1], [7.5, -12, 13, 20, 47, -.08], [11, 0, 28, 6, 40, 0], [14, 0, 29, 3, 40, 0]]
};
export function cameraPose(kind, q) {
  const keys = cameraKeys[kind];
  let b = keys.findIndex(k => k[0] > q); if (b < 0) b = keys.length - 1; b = Math.max(1, b);
  const a = keys[b - 1], z = keys[b], u = ease((q - a[0]) / (z[0] - a[0]));
  return a.slice(1).map((n, i) => mix(n, z[i + 1], u));
}
const hash = i => { const a = Math.sin(i * 127.1 + 311.7) * 43758.5453; return a - Math.floor(a); };
const blendColor = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(mix(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), t)).toString(16).padStart(2, '0')).join('');
export function response(x, y) { return 40 * Math.sqrt(Math.max(0, x)) + 30 * Math.sqrt(Math.max(0, y)); }
export function cumulative(t) { return 120 * t + 12 * t * t - t * t * t; }
export function rate(t) { return 120 + 24 * t - 3 * t * t; }
export function isoCoordinate(level, x) {
  const remaining = (level - 40 * Math.sqrt(x)) / 30;
  return remaining < 0 || remaining > 10 ? null : remaining * remaining;
}
export function prototypeTime(t) {
  // Four prepared passages; each passage is continuous, with deliberate match cuts.
  const passages = [[2, 5.75], [14, 17.75], [28.5, 32.25], [56.5, 60.25]];
  const part = Math.min(3, Math.floor(clamp(t, 0, 14.9999) / 3.75));
  return passages[part][0] + t - part * 3.75;
}
let stage;
function createStage() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(1920, 1200);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1.6, .1, 150);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x274fc6, 1.3); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-8, 16, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: .1, far: 65 }); key.shadow.bias = -.001;
  key.shadow.normalBias = .02; key.shadow.radius = 3; scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8ffe8, .75); rim.position.set(6, 8, -9); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: paper, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.08; floor.receiveShadow = true; scene.add(floor);
  const group = new THREE.Group(); scene.add(group);
  const box = new THREE.BoxGeometry(.8, 1, .8);
  const cubes = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: .34, metalness: 0, color: '#ffffff' }), 256);
  cubes.castShadow = cubes.receiveShadow = true; cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(cubes);
  const colors = new THREE.Color(); for (let i = 0; i < 256; i++) cubes.setColorAt(i, colors.set(i % 17 === 0 ? orange : (i % 5 === 0 ? cyan : '#b9d2d0')));
  const surfaceGeometry = new THREE.PlaneGeometry(12, 12, 48, 48); surfaceGeometry.rotateX(-Math.PI / 2);
  const pos = surfaceGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = (pos.getX(i) + 6) / 12 * 100, y = (pos.getZ(i) + 6) / 12 * 100; pos.setY(i, response(x, y) / 105); }
  surfaceGeometry.computeVertexNormals();
  const surface = new THREE.Mesh(surfaceGeometry, new THREE.MeshStandardMaterial({ color: palette.green, roughness: .36, metalness: 0, side: THREE.DoubleSide }));
  surface.castShadow = surface.receiveShadow = true; group.add(surface);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(surfaceGeometry), new THREE.LineBasicMaterial({ color: palette.blue, transparent: true, opacity: .32 })); group.add(wire);
  const slice = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: palette.yellow, transparent: true, opacity: .23, side: THREE.DoubleSide, depthWrite: false }));
  slice.position.y = 3.5; group.add(slice);
  const contourGroup = new THREE.Group(); group.add(contourGroup);
  for (let level = 120; level <= 660; level += 30) {
    const points = [];
    for (let x = 0; x <= 100; x += .2) { const y = isoCoordinate(level, x); if (y !== null) points.push(new THREE.Vector3(x / 100 * 12 - 6, level / 105 + .018, y / 100 * 12 - 6)); }
    const contour = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: palette.yellow, transparent: true, opacity: 0 }));
    contour.userData.level = level; contourGroup.add(contour);
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.34, 32, 24), new THREE.MeshStandardMaterial({ color: orange, metalness: .17, roughness: .21 }));
  // Keep a real shadow caster; draw the single visible carrier in the compositor
  // so it can travel continuously between planar and volumetric scenes.
  orb.material.colorWrite = false; orb.material.depthWrite = false;
  orb.castShadow = true; group.add(orb);
  const dummy = new THREE.Object3D();
  return { renderer, canvas, scene, camera, floor, group, cubes, surface, wire, slice, contourGroup, orb, dummy, colors };
}
function space(ctx, t, kind, opacity = 1) {
  stage ??= createStage();
  const { renderer, scene, camera, floor, group, cubes, surface, wire, slice, contourGroup, orb, dummy, colors } = stage;
  const background = kind === 'surface' || kind === 'blocks' ? palette.blue : palette.yellow;
  floor.material.color.set(background);
  renderer.setClearColor(background, 1);
  surface.visible = wire.visible = slice.visible = contourGroup.visible = kind === 'surface';
  cubes.visible = kind !== 'surface'; cubes.count = kind === 'allocation' ? 100 : 256;
  orb.visible = true; group.rotation.set(0, 0, 0); group.scale.setScalar(1);
  if (kind === 'blocks') {
    const q = t - 10, lift = ease(q / 2.2);
    for (let i = 0; i < 256; i++) {
      const x = i % 16 - 7.5, z = Math.floor(i / 16) - 7.5, d = Math.hypot(x - 2 * Math.sin(q * .55), z);
      const impactWave = Math.exp(-Math.pow(d - ((q - 4) % 4) * 3.8, 2) / 2) * (q >= 4 ? 1.2 : 0);
      const h = .2 + lift * (1.8 + 1.4 * Math.sin(d * .68 - q * 2.7)) + impactWave;
      dummy.position.set(x * .9, h / 2, z * .9); dummy.scale.set(1, h, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); cubes.setMatrixAt(i, dummy.matrix);
      cubes.setColorAt(i, colors.set((i % 16 + Math.floor(i / 16)) % 5 < 2 ? palette.green : palette.yellow));
    }
    orb.position.set(4.1 * Math.sin(q * .48 - 1.5), 4.1 + .6 * Math.sin(q * 1.5), 3.2 * Math.cos(q * .44));
  } else if (kind === 'accumulation') {
    const q = t - 38, progress = ease(q / 11), count = Math.floor(mix(8, 64, progress)); cubes.count = count * 4;
    for (let i = 0; i < count * 4; i++) {
      const col = i % count, row = Math.floor(i / count), x = (col + .5) / count * 8;
      const h = rate(x) / 50;
      dummy.position.set(-7 + (col + .5) / count * 14, h / 2, (row - 1.5) * 1.65);
      dummy.scale.set(14 / count / .8 * mix(.72, .995, progress), h, 1.9);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); cubes.setMatrixAt(i, dummy.matrix);
      cubes.setColorAt(i, colors.set(row % 2 ? palette.blue : palette.green));
    }
    const x = 8 * ease((q - .5) / 12.5); orb.position.set(-7 + x / 8 * 14, rate(x) / 50 + .48, -2.5);
  } else if (kind === 'surface') {
    const q = t - 52, lift = .12 + .88 * ease(q / 2.2);
    surface.scale.y = wire.scale.y = contourGroup.scale.y = lift;
    const x = mix(15, 80, (Math.sin(q * .35 - 1) + 1) / 2), y = mix(15, 80, (Math.cos(q * .4) + 1) / 2);
    orb.position.set(x / 100 * 12 - 6, response(x, y) / 105 * lift + .38, y / 100 * 12 - 6);
    const cuttingLevel = mix(100, 675, ease(q / 16));
    slice.position.set(0, cuttingLevel / 105 * lift, 0); slice.rotation.set(-Math.PI / 2, 0, 0);
    for (const contour of contourGroup.children) contour.material.opacity = .95 * ease((cuttingLevel - contour.userData.level) / 28);
  } else {
    const q = t - 68;
    for (let i = 0; i < 100; i++) {
      const belongsA = i < 64, k = belongsA ? i : i - 64;
      const targetX = (belongsA ? -4.1 : 3.8) + (k % 8 - 3.5) * .78, targetZ = (Math.floor(k / 8) - 3) * .78;
      const u = ease((q - (i % 16) * .12) / 4.3), oldX = (i % 10 - 4.5) * .88, oldZ = (Math.floor(i / 10) - 4.5) * .88;
      const flight = Math.sin(Math.PI * u), settle = Math.exp(-Math.max(0, q - 6.2) * 4) * Math.sin(Math.max(0, q - 6.2) * 18) * .08;
      dummy.position.set(mix(oldX, targetX, u), .3 + 3.4 * flight + (q > 6.2 ? settle : 0), mix(oldZ, targetZ, u));
      dummy.scale.set(.8, .6, .8); dummy.rotation.set(flight * .4, flight * Math.PI, 0); dummy.updateMatrix(); cubes.setMatrixAt(i, dummy.matrix);
      cubes.setColorAt(i, colors.set(belongsA ? palette.blue : palette.green));
    }
    orb.position.set(5 * Math.cos(q * .4) * (1 - ease((q - 8) / 5)), 3, -2 + Math.sin(q * .5));
  }
  const q = t - ({ blocks: 10, accumulation: 38, surface: 52, allocation: 68 }[kind]);
  const [px, py, pz, fov, roll] = cameraPose(kind, q), kick = beatImpact(t);
  camera.position.set(px + Math.sin(t * 71) * kick * .1, py + kick * .16, pz);
  camera.fov = fov + kick * 1.4; camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(orb.position.x * .3, kind === 'surface' ? 3.2 : 1.6, orb.position.z * .3); camera.updateProjectionMatrix();
  cubes.instanceMatrix.needsUpdate = true; if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
  renderer.render(scene, camera); ctx.save(); ctx.globalAlpha *= opacity; ctx.drawImage(stage.canvas, 0, 0, 1600, 1000); ctx.restore();
  const projected = orb.getWorldPosition(new THREE.Vector3()).project(camera);
  return { x: (projected.x + 1) * 800, y: (1 - projected.y) * 500, r: 16, opacity };
}
function circle(ctx, x, y, r, color) { if (r <= 0) return; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill(); }
function pointField(ctx, t, opacity = 1) {
  ctx.save(); ctx.globalAlpha *= opacity;
  const spread = ease((t - .35) / 2.4), settle = ease((t - 7.1) / 2.7), turn = t * .72;
  const cameraDistance = mix(7.5, 3.6, ease((t - 1) / 3.5)) + 4 * ease((t - 5.8) / 2.4);
  ctx.save(); ctx.translate(800, 500); ctx.rotate(-.16 + .28 * Math.sin(t * .6));
  for (let ring = 0; ring < 3; ring++) {
    const p = (t * .24 + ring / 3) % 1;
    ctx.strokeStyle = ring % 2 ? palette.green : palette.yellow; ctx.globalAlpha = opacity * (1 - p) * .75;
    ctx.lineWidth = 7 + p * 15; ctx.beginPath(); ctx.ellipse(0, 0, 80 + p * 1300, 35 + p * 640, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 720; i++) {
    const col = i % 36, row = Math.floor(i / 36), a = i * 2.399963, z = 1 - 2 * (i + .5) / 720, r0 = Math.sqrt(1 - z * z);
    const x0 = r0 * Math.cos(a + turn) * 2.6, depth = r0 * Math.sin(a + turn) * 2.6;
    const y0 = z * 2.6, pitch = .35 * Math.sin(t * .7), yy = y0 * Math.cos(pitch) - depth * Math.sin(pitch), zz = y0 * Math.sin(pitch) + depth * Math.cos(pitch);
    const perspective = 900 / (cameraDistance - zz), roll = .18 * Math.sin(t * .55);
    const sx = (x0 * Math.cos(roll) - yy * Math.sin(roll)) * perspective, sy = (x0 * Math.sin(roll) + yy * Math.cos(roll)) * perspective;
    const u = ease((t - .25 - hash(i) * .9) / 2.1), x = 800 + mix(sx, -700 + col * 40, settle) * u, y = 500 + mix(sy, -380 + row * 40, settle) * u;
    const r = mix((4.8 + hash(i + 4) * 3.5) * perspective / 190, 10, settle) * spread;
    ctx.fillStyle = i % 3 === 0 ? paper : i % 3 === 1 ? palette.green : palette.yellow;
    if (settle > .35 && i % 3 !== 0) { ctx.save(); ctx.translate(x, y); ctx.rotate((1 - settle) * 1.1); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); }
    else circle(ctx, x, y, r, ctx.fillStyle);
  }
  ctx.restore();
  return { x: 800 + Math.sin(t * .9) * 175 * spread, y: 500 + Math.sin(t * .63) * 135 * spread, r: mix(25, 16, spread), opacity };
}
function curves(ctx, t, opacity = 1) {
  const q = t - 24, zoom = ease((q - 3) / 3) * (1 - ease((q - 9) / 3));
  const angle = -.32 + .58 * Math.sin(q * .36), scale = 1 + zoom * .55;
  const heroX = mix(-520, 520, ease(q / 14)), offsetX = -heroX * zoom * .45;
  const curveY = (x, v) => v * mix(10, 360, ease(q / 2)) + Math.sin(x / 240 + q * .82 + v * 1.9) * Math.exp(-Math.pow(x / 950, 2)) * (210 + v * 70) * (1 - zoom * .3);
  ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(800 + offsetX, 500); ctx.rotate(angle); ctx.scale(scale, scale);
  for (let row = 0; row < 37; row++) {
    const v = (row - 18) / 18; ctx.beginPath();
    for (let n = 0; n <= 150; n++) {
      const x = -1250 + n / 150 * 2500, y = curveY(x, v);
      if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = row === 18 ? orange : row % 5 < 2 ? palette.green : palette.yellow;
    ctx.lineWidth = row === 18 ? 9 : row % 5 === 0 ? 15 : 4; ctx.stroke();
  }
  const y = curveY(heroX, 0);
  ctx.restore();
  return { x: 800 + offsetX + (heroX * Math.cos(angle) - y * Math.sin(angle)) * scale, y: 500 + (heroX * Math.sin(angle) + y * Math.cos(angle)) * scale, r: 17, opacity };
}
function closing(ctx, t) {
  const q = t - 82, u = ease(q / 3.2);
  for (let i = 0; i < 480; i++) {
    const a = i * 2.399963 + q * .8, r = Math.sqrt(i / 480) * 850 * (1 - u), wave = 1 + .12 * Math.sin(q * 4 + i);
    circle(ctx, 800 + Math.cos(a) * r * wave, 320 + Math.sin(a) * r * .65, mix(8, 1.1, u), i % 2 ? palette.green : palette.yellow);
  }
  if (q > 3) { ctx.fillStyle = palette.green; ctx.fillRect(160, 845, 1280 * ease((q - 3) / .7), 18); }
}
function collision(ctx, t) {
  // Short, discrete impacts, followed by a rebound; no full-frame strobe.
  const events = [2, 6, 14, 18, 27, 42, 56, 60, 75];
  for (const at of events) {
    const q = t - at; if (q < -.34 || q > .64) continue;
    const out = ease(q / .64), incoming = ease((q + .34) / .34), width = 52;
    ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(800, 500); ctx.rotate((at % 3 - 1) * .32);
    const distance = q < 0 ? mix(1040, 58, incoming) : 58 + Math.sin(out * Math.PI) * 110;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side * distance, 0); ctx.rotate(side * (1 - incoming) * .7);
      ctx.fillStyle = side < 0 ? palette.yellow : palette.green;
      const squash = q >= 0 ? Math.exp(-q * 22) * .42 : 0;
      ctx.fillRect(-width * (1 - squash), -width * (1 + squash), width * 2 * (1 - squash), width * 2 * (1 + squash)); ctx.restore();
    }
    if (q >= 0) for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, r = 65 + out * 380; ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(a + out * 2);
      ctx.fillStyle = i % 2 ? palette.green : palette.yellow; ctx.fillRect(-7, -7, 14, 14); ctx.restore();
    }
    ctx.restore();
  }
}
function kineticWord(ctx, word, t) {
  const end = word.text === '经济数学', age = t - word.from;
  const arrival = ease(age / .18), exit = end ? 0 : ease((t - word.to + .18) / .18);
  const recoil = age >= .18 ? Math.exp(-(age - .18) * 15) * Math.sin((age - .18) * 30) : 0;
  const font = end ? 240 : word.text.length === 4 ? 218 : word.text.length === 3 ? 276 : 316;
  const x = 800, y = end ? 565 : 505, spacing = end ? 266 : font * 1.12;
  ctx.save(); ctx.globalAlpha = (1 - exit) * ease(age / .045);
  ctx.translate(x, y); ctx.rotate(end ? 0 : -.045 * (1 - exit));
  const bluePlate = ['积分', '累积', '约束', '选择', '最优解'].includes(word.text);
  const yellowPlate = end || ['变量', '导数', '等高线'].includes(word.text);
  ctx.fillStyle = bluePlate ? palette.blue : yellowPlate ? palette.yellow : palette.green;
  const plate = end ? 1340 : spacing * word.text.length + 180;
  ctx.fillRect(-plate / 2, -font * .7, plate, font * 1.42);
  ctx.beginPath(); ctx.rect(-plate / 2, -font * .7, plate, font * 1.42); ctx.clip();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${font}px "Prelude Display", "Microsoft YaHei", sans-serif`;
  ctx.fillStyle = bluePlate ? palette.yellow : palette.blue;
  [...word.text].forEach((letter, i) => {
    const side = i < word.text.length / 2 ? -1 : 1;
    const tx = (i - (word.text.length - 1) / 2) * spacing + side * (1 - arrival) * 500 + side * recoil * 24;
    ctx.save(); ctx.translate(tx, -exit * 450); ctx.scale(1 - recoil * .1, 1 + recoil * .14); ctx.fillText(letter, 0, 0); ctx.restore();
  });
  ctx.restore();
  return { text: word.text, x: x - plate / 2 - 20, y: y - font * .7 - 35, width: plate + 40, height: font * 1.42 + 70 };
}
export function render(canvas, time) {
  const t = clamp(time, 0, DURATION), ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / 1600, 0, 0, canvas.height / 1000, 0, 0);
  const light = (t >= 38 && t < 52) || (t >= 68 && t < 82);
  ctx.fillStyle = light ? palette.yellow : palette.blue; ctx.fillRect(0, 0, 1600, 1000);
  const poses = [];
  if (t < 11) poses.push(pointField(ctx, Math.min(t, 10), 1 - ease((t - 9.7) / 1.3)));
  if (t >= 9.7 && t < 25) poses.push(space(ctx, Math.max(10, t), 'blocks', ease((t - 9.7) / 1.3) * (1 - ease((t - 23.5) / 1.5))));
  if (t >= 23.5 && t < 39) poses.push(curves(ctx, Math.max(24, t), ease((t - 23.5) / 1.5) * (1 - ease((t - 37.5) / 1.5))));
  if (t >= 37.5 && t < 53) poses.push(space(ctx, Math.max(38, t), 'accumulation', ease((t - 37.5) / 1.5) * (1 - ease((t - 51.5) / 1.5))));
  if (t >= 51.5 && t < 69) {
    poses.push(space(ctx, Math.max(52, t), 'surface', ease((t - 51.5) / 1.5) * (1 - ease((t - 67.5) / 1.5))));
  }
  if (t >= 67.5 && t < 83) poses.push(space(ctx, Math.max(68, t), 'allocation', ease((t - 67.5) / 1.5) * (1 - ease((t - 81.8) / 1.2))));
  if (t >= 81.8) { const a = ease((t - 81.8) / 1.2); ctx.save(); ctx.globalAlpha = a; closing(ctx, Math.max(82, t)); ctx.restore(); poses.push({ x: 800, y: 280, r: 22, opacity: a }); }
  collision(ctx, t);
  const weight = poses.reduce((s, p) => s + p.opacity, 0) || 1;
  const carrier = ['x', 'y', 'r'].map(k => poses.reduce((s, p) => s + p[k] * p.opacity, 0) / weight);
  const [cx, cy, cr] = carrier;
  const glow = ctx.createRadialGradient(cx - cr * .34, cy - cr * .38, cr * .08, cx, cy, cr);
  glow.addColorStop(0, '#fff4a9'); glow.addColorStop(.24, '#ffab50'); glow.addColorStop(.72, orange); glow.addColorStop(1, '#bf3419');
  circle(ctx, cx, cy, cr, glow);
  const bounds = [];
  for (const word of words) if (t >= word.from && t <= word.to) {
    bounds.push(kineticWord(ctx, word, t));
  }
  return { time: t, shot: shots.find(s => t >= s.from && t < s.to)?.name ?? '归拢', carrier, bounds };
}
