import * as THREE from "three";
import { TERMINAL_FACILITIES, terminalLotPosition, type TerminalSetup } from "@edu/port-simulation-core";

export type TerminalCamera = "overview" | "quay" | "yard" | "gate" | "plan";
export const TERMINAL_CAMERAS: Record<TerminalCamera, { position: number[]; target: number[] }> = {
  overview: { position: [210, 205, -240], target: [0, 0, -6] },
  quay: { position: [75, 62, -152], target: [-28, 16, -49] },
  yard: { position: [160, 108, -20], target: [6, 2, 32] },
  gate: { position: [90, 66, 159], target: [-16, 4, 72] },
  plan: { position: [0, 300, 30.01], target: [0, 0, 30] }
};
interface BoxInstance { matrix: THREE.Matrix4; id: string }
/** Static solids are batched by material, preserving instance IDs for selection. */
class Solids {
  private batches = new Map<string, BoxInstance[]>();
  private dummy = new THREE.Object3D();
  constructor(private parent: THREE.Group, private geometry: THREE.BoxGeometry) {}
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, id = "", rotation = 0) {
    this.dummy.position.set(x, y, z); this.dummy.scale.set(w, h, d); this.dummy.rotation.set(0, rotation, 0); this.dummy.updateMatrix();
    const batch = this.batches.get(color) ?? []; batch.push({ matrix: this.dummy.matrix.clone(), id }); this.batches.set(color, batch);
  }
  beam(a: number[], b: number[], width: number, color: string, id = "") {
    const from = new THREE.Vector3(...a); const to = new THREE.Vector3(...b); const delta = to.clone().sub(from);
    this.dummy.position.copy(from).add(to).multiplyScalar(0.5); this.dummy.scale.set(width, delta.length(), width);
    this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); this.dummy.updateMatrix();
    const batch = this.batches.get(color) ?? []; batch.push({ matrix: this.dummy.matrix.clone(), id }); this.batches.set(color, batch);
  }
  finish() {
    for (const [color, values] of this.batches) {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.18 });
      const mesh = new THREE.InstancedMesh(this.geometry, material, values.length);
      values.forEach((value, i) => mesh.setMatrixAt(i, value.matrix));
      mesh.userData.entityIds = values.map(value => value.id); mesh.castShadow = true; mesh.receiveShadow = true;
      this.parent.add(mesh);
    }
  }
}
const colors = ["#bd614b", "#356c78", "#dabf86", "#719789", "#526d89", "#cad4cf"];
function container(b: Solids, x: number, y: number, z: number, color: string, id: string, width = 7.6) {
  b.box(x, y + 1.3, z, width, 2.6, 3.1, color, id);
  b.box(x, y + 2.64, z, width + 0.05, 0.09, 3.14, "#d6d3c3", id);
  // Corrugated side walls and door locking bars catch the directional light.
  for (let k = 0; k < 7; k++) for (const side of [-1, 1])
    b.box(x - width / 2 + 0.55 + k * (width - 1) / 7, y + 1.3, z + side * 1.57, 0.08, 2.36, 0.065, color, id);
  for (const side of [-0.7, 0.7]) b.box(x + width / 2 + 0.025, y + 1.25, z + side, 0.04, 2.22, 0.045, "#b2bfc0", id);
}
function label(text: string, width = 34, color = "#e4f8f6") {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 104;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(8,27,37,0.88)"; ctx.beginPath(); ctx.roundRect(3, 3, 506, 98, 20); ctx.fill();
  ctx.strokeStyle = "rgba(110,186,187,0.5)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '600 44px "Microsoft YaHei", sans-serif'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = color; ctx.fillText(text, 256, 54);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(width, width * 104 / 512, 1); sprite.renderOrder = 5; return sprite;
}
export interface TerminalWorld {
  root: THREE.Group; labels: THREE.Group; routes: THREE.Group; lots: THREE.Group;
  ships: THREE.Group[]; cranes: Array<{ body: THREE.Group; trolley: THREE.Group; index: number; homeX: number }>;
  vehicles: THREE.Group[]; people: THREE.Group[];
  selection: THREE.Mesh; water: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  facilityPositions: Map<string, THREE.Vector3>; vehiclePaths: THREE.Vector3[][];
  dispose: () => void;
}
export function createTerminalWorld(setup: TerminalSetup, options: { liveCargo?: boolean } = {}): TerminalWorld {
  const root = new THREE.Group(); const labels = new THREE.Group(); const routes = new THREE.Group(); const lots = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1); const b = new Solids(root, geometry);
  const facilityPositions = new Map<string, THREE.Vector3>();
  const ships: THREE.Group[] = []; const cranes: TerminalWorld["cranes"] = []; const vehicles: THREE.Group[] = []; const people: THREE.Group[] = [];
  const vehiclePaths: THREE.Vector3[][] = [];
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color("#247f91") } },
    vertexShader: `varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform float time; uniform vec3 tint; varying vec3 vWorld;
      void main(){ vec2 p=vWorld.xz; float a=sin(p.x*.042+p.y*.076+time*.28); float b=sin(p.x*.11-p.y*.055-time*.22);
      float shimmer=pow(max(0.,sin(p.x*.16+p.y*.2+a*1.6+b+time*.3)),9.);
      float coast=exp(-abs(p.y+55.)*.14); vec3 c=tint*(.84+.027*a+.018*b)+vec3(.30,.49,.52)*shimmer*.055;
      c=mix(c,vec3(.35,.70,.71),coast*.28); gl_FragColor=vec4(c,1.); }`,
    side: THREE.DoubleSide
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), waterMaterial); water.rotation.x = -Math.PI / 2; water.position.y = -1.9; root.add(water);
  // Landside terrain continues inland, with a connected exit road and a quiet industrial backdrop.
  b.box(0, -1.2, 430, 1100, 2.8, 630, "#81988a");
  b.box(-18, 0.55, 270, 14, 0.1, 338, "#607478");
  b.box(0, 0.56, 170, 600, 0.1, 12, "#687d80");
  for (let x = -300; x <= 300; x += 52) {
    if (Math.abs(x) < 40) continue;
    b.box(x, 6, 220 + Math.abs(x % 80), 32, 12, 43, "#a2b5ae");
    b.box(x, 12.5, 220 + Math.abs(x % 80), 33, 1, 44, "#7b999d");
  }
  b.box(0, -1.15, 31, 268, 3.1, 176, "#727f83", "land");
  b.box(0, 0.46, 31, 265, 0.12, 172, "#a7b3b0", "land");
  b.box(0, 0.72, -43, 262, 0.5, 23, "#c9c6b4", "quay");
  b.box(0, 0.75, -54.5, 264, 0.65, 1.3, "#e8dcc0", "quay");
  // Roads form a connected graph around six by three reserved buildable blocks.
  for (const z of [-26, 18, 54, 90]) {
    b.box(0, 0.65, z, 254, 0.1, 8, "#596b71", "transport");
    for (let x = -124; x < 127; x += 8) b.box(x, 0.73, z, 3.6, 0.025, 0.16, "#ddcf9b");
  }
  for (const x of [-112, 0, 112]) {
    b.box(x, 0.67, 32, 7, 0.11, 126, "#596b71", "transport");
    for (let z = -26; z < 94; z += 9) b.box(x, 0.76, z, 0.16, 0.02, 4, "#ddcf9b");
  }
  // Pedestrian path is physically separated from the vehicle loop.
  b.box(0, 0.66, 106, 262, 0.25, 4, "#bac6bf");
  b.box(0, 0.86, 102.9, 262, 0.4, 0.3, "#e4d5b5");
  for (const x of [-126, 126]) for (let z = -45; z < 111; z += 9) {
    b.box(x, 1.5, z, 0.2, 2.1, 0.2, "#d7dddd");
    b.box(x, 2.1, z + 4.5, 0.1, 0.2, 9, "#c0cacc");
  }
  for (let x = -122; x < 128; x += 9) {
    b.box(x, 1.05, -53, 1, 1.5, 0.8, "#3a4952");
    b.box(x + 2.5, 0.8, -53, 4, 0.07, 0.6, "#dfb45e");
  }
  for (let col = 0; col < 6; col++) for (let row = 0; row < 3; row++) {
    const p = terminalLotPosition(col, row);
    b.box(p.x, 0.62, p.z, 30, 0.15, 28, "#8e9f9e", `lot:${col}:${row}`);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(30, 0.12, 28), new THREE.MeshBasicMaterial({ color: "#59dcc4", transparent: true, opacity: 0.16 }));
    plate.position.set(p.x, 0.86, p.z); plate.userData.entityId = `lot:${col}:${row}`; lots.add(plate);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: "#6bc9b6", transparent: true, opacity: 0.48 }));
    border.position.copy(plate.position); lots.add(border);
  }
  // Quayside cranes, with A-frame, truss boom, trolley, cable and spreader.
  for (let i = 0; i < setup.cranes; i++) {
    const x = -101 + i * (202 / Math.max(1, setup.cranes - 1)); const id = `crane-${i}`;
    const body = new THREE.Group(); body.userData.entityId = id; root.add(body); const c = new Solids(body, geometry);
    facilityPositions.set(id, new THREE.Vector3(x, 0, -39));
    const paint = "#e5b764"; const steel = "#d7d9c9";
    for (const dx of [-5, 5]) for (const dz of [-5, 5]) {
      c.beam([x + dx, 2, -39 + dz], [x + dx * 0.65, 29, -39 + dz * 0.4], 1.05, paint, id);
      c.box(x + dx, 1.6, -39 + dz, 2, 1.2, 4, "#334b54", id);
    }
    for (const z of [-48, -30]) c.box(x, 0.98, z, 265 / Math.max(1, setup.cranes), 0.12, 0.3, "#697d85");
    c.box(x, 29, -48, 7, 1.4, setup.crane === "wide" ? 58 : 42, paint, id);
    c.box(x, 33, -39, 8, 5.2, 8, "#f0ddaf", id);
    c.box(x + 3.7, 31.6, -44, 2.8, 2.4, 3, "#46636b", id);
    c.beam([x, 31, -38], [x, 49, -37], 1.2, paint, id);
    c.beam([x, 48, -37], [x, 30, -74], 0.19, steel, id);
    c.beam([x, 48, -37], [x, 30, -22], 0.19, steel, id);
    for (let z = -74; z < -25; z += 6) {
      c.beam([x - 2.8, 29, z], [x - 2.8, 31.5, z + 3], 0.18, paint, id);
      c.beam([x + 2.8, 29, z], [x + 2.8, 31.5, z + 3], 0.18, paint, id);
      c.box(x, 31.5, z, 5.8, 0.18, 0.18, paint, id);
    }
    const trolley = new THREE.Group(); trolley.userData.entityId = id;
    const t = new Solids(trolley, geometry);
    t.box(0, 0, 0, 4, 1.1, 4.5, "#e8bc65", id);
    for (const dx of [-2.7, 2.7]) for (const dz of [-1.2, 1.2]) t.box(dx, -4.1, dz, 0.075, 8, 0.075, "#354e58", id);
    t.box(0, -8.5, 0, 6.8, 0.6, 3.2, "#e9c868", id);
    container(t, 0, -11.4, 0, colors[i % colors.length]!, id, 6.4);
    c.finish(); t.finish(); trolley.position.set(x, 28.5, -54); body.add(trolley); cranes.push({ body, trolley, index: i, homeX: x });
  }
  for (let i = 0; i < 2; i++) {
    const ship = new THREE.Group(); const id = i === 0 ? "vessel-a" : "vessel-b"; ship.userData.entityId = id;
    const s = new Solids(ship, geometry);
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-48, -8); hullShape.lineTo(36, -8); hullShape.quadraticCurveTo(50, -5, 54, 0);
    hullShape.quadraticCurveTo(50, 5, 36, 8); hullShape.lineTo(-48, 8); hullShape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 6, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.8, bevelThickness: 0.6 });
    hullGeo.rotateX(-Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: i === 0 ? "#254f62" : "#325b66", roughness: 0.6, metalness: 0.3 }));
    hull.position.y = -2; hull.castShadow = true; hull.receiveShadow = true; ship.add(hull);
    s.box(-5, 4.3, 0, 86, 0.5, 15.6, "#aeb8af", id);
    s.box(-5, -1, 0, 87, 1.3, 15.7, "#b0614e", id);
    const cargoGroup = new THREE.Group(); cargoGroup.name = "vessel-cargo"; ship.add(cargoGroup); const cargo = new Solids(cargoGroup, geometry);
    if (!options.liveCargo) for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) for (let level = 0; level < (col % 3 === 0 ? 2 : 3); level++)
      container(cargo, -26 + col * 8.1, 4.6 + level * 2.8, -5.1 + row * 3.4, colors[(col + row * 2 + level + i) % colors.length]!, id);
    cargo.finish(); cargoGroup.children.forEach(mesh => { mesh.userData.fullCount = (mesh as THREE.InstancedMesh).count; });
    s.box(-39, 8.6, 0, 12, 8, 12, "#e5e7dc", id);
    s.box(-39, 13.3, 0, 14, 2, 15, "#e4e6de", id);
    s.box(-39, 13.3, -7.6, 12, 0.95, 0.12, "#386675", id);
    s.box(-39, 13.3, 7.6, 12, 0.95, 0.12, "#386675", id);
    s.box(-41, 17, 0, 3, 5.5, 4, "#d49766", id);
    s.box(-36, 18, 0, 0.25, 7, 0.25, "#e9e3cd", id);
    s.box(-36, 20, 0, 4, 0.18, 0.3, "#dfe7dc", id);
    for (let x = -44; x < 40; x += 5) for (const z of [-7.7, 7.7]) s.box(x, 5.2, z, 0.08, 1.4, 0.08, "#e1d9c5", id);
    s.finish(); ship.position.set(i === 0 ? -62 : 62, 0, -70); root.add(ship); ships.push(ship);
    const name = label(`教学船 ${i === 0 ? "A" : "B"} · ${i === 0 ? "18" : "24"} 列`); name.userData.vesselIndex = i; name.position.set(i === 0 ? -62 : 62, 22, -79); labels.add(name);
    facilityPositions.set(id, new THREE.Vector3(i === 0 ? -62 : 62, 0, -70));
  }
  for (const f of setup.facilities) {
    const p = terminalLotPosition(f.col, f.row); const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = f.rotation * Math.PI / 2; root.add(g);
    facilityPositions.set(f.id, g.position.clone()); const s = new Solids(g, geometry);
    s.box(0, 0.81, 0, 29, 0.2, 26, "#9caaa2", f.id);
    if (f.kind === "yard" || f.kind === "reefer") {
      if (!options.liveCargo) for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) for (let level = 0; level < 2 + ((row + col) % 3 === 0 ? 1 : 0); level++)
        container(s, -8.4 + col * 8.4, 1 + level * 2.8, -8 + row * 3.65, f.kind === "reefer" ? "#d3dcd8" : colors[(row + col * 2 + level) % colors.length]!, f.id);
      const yardIndex = setup.facilities.filter(q => q.kind === "yard" || q.kind === "reefer").findIndex(q => q.id === f.id);
      if (yardIndex < setup.yardMachines) {
        for (const x of [-13, 13]) {
          for (const z of [-2, 2]) s.box(x, 6.6, z, 0.85, 11.8, 0.85, "#79b9b7", f.id);
          s.box(x, 1.1, 0, 1.7, 1.5, 6, "#354f55", f.id);
          if (setup.yardMachine === "rmg") s.box(x, 0.94, 0, 0.4, 0.2, 26, "#d5dee0", f.id);
        }
        s.box(0, 12.5, 0, 28, 1.4, 4, "#87c7c4", f.id);
        s.box(9, 10.8, 0, 3, 2.6, 3, "#e2e6dc", f.id);
      }
    } else if (f.kind === "warehouse" || f.kind === "workshop") {
      s.box(0, 5.6, 0, 25, 9, 20, f.kind === "warehouse" ? "#c4cdc7" : "#9eafb5", f.id);
      s.box(0, 10.5, 0, 27, 0.65, 22, "#607d89", f.id);
      for (let x = -8; x <= 8; x += 8) { s.box(x, 3.6, -10.1, 5, 5.5, 0.2, "#506774", f.id); s.box(x, 7.8, -10.25, 5, 1, 0.1, "#98c2cb", f.id); }
      for (let x = -10; x <= 10; x += 4) s.box(x, 10.92, 0, 3, 0.1, 16, "#476878", f.id);
    } else if (f.kind === "gate") {
      s.box(0, 0.96, 0, 28, 0.1, 26, "#586b72", f.id);
      for (const x of [-10, 0, 10]) s.box(x, 4.2, 0, 0.8, 7, 0.8, "#d7dfd9", f.id);
      s.box(0, 8, 0, 29, 1.2, 8, "#e8c383", f.id);
      for (const x of [-5, 5]) {
        s.box(x, 2.1, 4, 0.5, 3, 0.5, "#6faea2", f.id);
        s.box(x, 3, 4, 0.2, 0.2, 4, "#e9c37d", f.id);
        s.box(x - 2.6, 2.5, 0, 1.6, 3.2, 3, "#d3ded5", f.id);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        s.box(-10 + i * 6.7, 2.2, 6, 2.2, 3.2, 1.5, "#8bc2ae", f.id);
        s.box(-10 + i * 6.7, 2.6, 5.22, 1.3, 0.7, 0.04, "#375765", f.id);
        s.box(-10 + i * 6.7, 1, -1, 4.8, 0.03, 10, "#789c8b", f.id);
      }
      s.box(0, 7, 0, 28, 0.6, 18, "#496f7b", f.id);
      for (const x of [-13, 13]) s.box(x, 3.5, 5, 0.4, 7, 0.4, "#ced8d2", f.id);
    }
    s.finish();
    const name = label(`${String.fromCharCode(65 + f.col)}${f.row + 1} · ${TERMINAL_FACILITIES[f.kind].label}`, 33);
    name.position.set(p.x, 17, p.z); name.userData.entityId = f.id; labels.add(name);
  }
  const yards = setup.facilities.filter(f => f.kind === "yard" || f.kind === "reefer");
  for (let i = 0; i < setup.vehicles; i++) {
    const g = new THREE.Group(); const id = "transport"; g.userData.entityId = id; const s = new Solids(g, geometry);
    s.box(0, 1.4, 0, 3.4, 1.1, 8, "#d9c587", id);
    if (setup.vehicle !== "agv") { s.box(0, 2.4, -4, 3.3, 2.8, 3.1, setup.vehicle === "electric" ? "#79b6ac" : "#e5d9b5", id); s.box(0, 2.95, -5.6, 2.7, 1.1, 0.06, "#35596c", id); }
    s.box(0, 3, 0.6, 3, 2.4, 6.2, colors[i % colors.length]!, id);
    for (const x of [-1.65, 1.65]) for (const z of [-2.6, 2.6]) s.box(x, 0.95, z, 0.7, 1.4, 1.4, "#283e4b", id);
    s.box(0, 1.2, -5.6, 2.6, 0.25, 0.12, "#fff0bb", id);
    s.finish(); root.add(g); vehicles.push(g);
    const y = yards[i % Math.max(1, yards.length)]; const p = y ? terminalLotPosition(y.col, y.row) : { x: -54, z: 0 };
    const berthX = i % 2 === 0 ? -62 : 62; const connector = p.x < 0 ? -112 : 112;
    vehiclePaths.push([[berthX, -25], [connector, -25], [connector, p.z + 18], [p.x, p.z + 18], [p.x, p.z + 15], [connector + 2, p.z + 15], [connector + 2, -22], [berthX, -22]].map(([x, z]) => new THREE.Vector3(x, 0.75, z)));
  }
  // Production paths visibly follow the reserved roads instead of crossing stacks.
  for (const path of vehiclePaths.filter((_, i) => i < Math.min(3, yards.length))) {
    const points = [...path, path[0]!].map(p => new THREE.Vector3(p.x, 1, p.z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: "#b6f2d4", dashSize: 3, gapSize: 2, transparent: true, opacity: 0.9 }));
    line.computeLineDistances(); routes.add(line);
  }
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group(); const s = new Solids(g, geometry);
    s.box(0, 1.6, 0, 0.7, 1, 0.4, i < 2 ? "#efb573" : "#d4da9a", "people");
    s.box(0, 2.35, 0, 0.58, 0.5, 0.5, "#efdfb2", "people");
    for (const x of [-0.2, 0.2]) s.box(x, 0.75, 0, 0.22, 0.9, 0.22, "#3a5867", "people");
    s.finish(); g.position.set(-117 + i * 9, 0.7, 106); root.add(g); people.push(g);
  }
  for (let i = 0; i < 9; i++) {
    const x = -120 + i * 30; b.box(x, 7, 98, 0.35, 13, 0.35, "#b7c9c9");
    b.box(x, 13.5, 98, 4.5, 0.3, 1.8, "#e3e5cf");
    b.box(x, 1.1, 112, 12, 1, 4, "#73938a");
    for (let k = 0; k < 3; k++) b.box(x - 4 + k * 4, 2.3, 112, 3, 2.2, 3, "#638678");
  }
  b.finish();
  const selection = new THREE.Mesh(new THREE.RingGeometry(11, 12, 64), new THREE.MeshBasicMaterial({ color: "#e7c16e", side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false }));
  selection.rotation.x = -Math.PI / 2; selection.position.y = 1; selection.renderOrder = 4; selection.visible = false; root.add(selection);
  root.add(labels, routes, lots);
  for (const [id, position] of Object.entries({ "berth-a": [-62, 0, -41], "berth-b": [62, 0, -41], "crane-a": [-62, 0, -39], "crane-b": [62, 0, -39], transport: [0, 0, -25], people: [0, 0, 106] })) facilityPositions.set(id, new THREE.Vector3(...position));
  return { root, labels, routes, lots, ships, cranes, vehicles, people, selection, water, facilityPositions, vehiclePaths, dispose() {
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>();
    root.traverse(object => {
      const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(m); if ("map" in m && m.map instanceof THREE.Texture) textures.add(m.map);
      }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  } };
}

export function sampleTerminalPath(path: THREE.Vector3[], fraction: number) {
  let length = 0; const lengths = path.map((p, i) => { const n = p.distanceTo(path[(i + 1) % path.length]!); length += n; return n; });
  let distance = (((fraction % 1) + 1) % 1) * length;
  for (let i = 0; i < path.length; i++) {
    if (distance <= lengths[i]! || i === path.length - 1) {
      const next = path[(i + 1) % path.length]!; const p = path[i]!.clone().lerp(next, distance / Math.max(0.001, lengths[i]!));
      return { position: p, rotation: Math.atan2(next.x - path[i]!.x, next.z - path[i]!.z) + Math.PI };
    }
    distance -= lengths[i]!;
  }
  return { position: path[0]!, rotation: 0 };
}
