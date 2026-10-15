import type { TerminalSetup } from './terminal-lab.js';

/** Shared teaching geometry. The solver and both renderers use these coordinates. */
export interface FacilityPoint { x: number; z: number }
export interface FacilityPose extends FacilityPoint { heading: number }
export interface FacilityRoute { points: FacilityPoint[]; length: number; edges: string[] }
export interface RoadReservation { key: string; start: number; end: number; owner: number }
export const PORT_ROAD_ROWS = [-26, 18, 54, 90] as const;
export const PORT_ROAD_COLUMNS = [-112, 0, 112] as const;
export const PORT_TRUCK_SPEED = 2; // teaching distance units / simulated second
/** Wheel bottoms meet the road; the quay has a short raised-apron transition. */
export const facilityVehicleHeight=(point:FacilityPoint)=>.47+Math.max(0,Math.min(1,(-point.z-30)/3))*.25;
export const yardCentre = (col: number, row: number): FacilityPoint => ({ x: -90 + col * 36, z: row * 36 });
export const yardExchange = (col: number, row: number): FacilityPoint => ({ x: -90 + col * 36, z: row * 36 + 12.5 });
export const yardRoadFront = (col:number,row:number):FacilityPoint=>({x:-90+col*36,z:row*36+18});
export interface FacilityPosition extends FacilityPoint { y:number; heading:number }
export const yardSlotPosition=(col:number,row:number,slot:number):FacilityPosition=>({x:-90+col*36+(slot%3-1)*7.4,z:row*36+(Math.floor(slot%21/3)-3)*3,y:2.3+Math.floor(slot/21)*2.8,heading:0});
export const shipSlotPosition=(berth:number,slot:number):FacilityPosition=>({x:(berth?62:-62)-27.5+(slot%8)*8,z:-78-5.1+Math.floor(slot%32/8)*3.4,y:6+Math.floor(slot/32)*2.8,heading:0});
export const truckParking = (index: number): FacilityPoint => ({ x: -130, z: -14 + index * 12 });
export const externalParking = (index: number): FacilityPoint => ({ x: 46 + index * 12, z: 108 });
export const gateExchange = (setup: TerminalSetup,lane=0): FacilityPoint => {
  const gates=setup.facilities.filter(f=>f.kind==='gate'),gate=gates[Math.floor(lane/2)%Math.max(1,gates.length)];
  return gate ? {x:-90+gate.col*36+(lane%2?5:-5),z:gate.row*36+4} : { x: 13, z: 76 };
};
const distance = (a: FacilityPoint, b: FacilityPoint) => Math.hypot(a.x - b.x, a.z - b.z);
const key = (p: FacilityPoint) => `${p.x},${p.z}`;
const interpolate = (a: FacilityPoint, b: FacilityPoint, t: number): FacilityPoint => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

function rounded(points: FacilityPoint[], radius = 3): FacilityPoint[] {
  const result: FacilityPoint[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!, b = points[i]!, c = points[i + 1]!;
    const first = distance(a, b), second = distance(b, c);
    if (!first || !second) continue;
    const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
    if (Math.abs(cross) < .001) { result.push(b); continue; }
    const cut = Math.min(radius, first / 3, second / 3);
    const entry = interpolate(b, a, cut / first), exit = interpolate(b, c, cut / second);
    result.push(entry);
    for (let j = 1; j <= 6; j++) { const t = j / 6, u = 1 - t; result.push({ x: u * u * entry.x + 2 * u * t * b.x + t * t * exit.x, z: u * u * entry.z + 2 * u * t * b.z + t * t * exit.z }); }
  }
  result.push(points.at(-1)!); return result;
}

/** Route only on reserved perimeter/central roads and designated exchange spurs. */
export function facilityRoadRoute(from: FacilityPoint, to: FacilityPoint): FacilityRoute {
  if (distance(from, to) < .01) return { points: [from, to], length: 0, edges: [] };
  const snap = (p: FacilityPoint) => {
    if(Math.abs(p.x+130)<.01)return {x:-112,z:p.z};
    const rows = PORT_ROAD_ROWS.map(z => ({ x: p.x, z })), cols = PORT_ROAD_COLUMNS.map(x => ({ x, z: p.z }));
    return [...rows, ...cols].filter(q => q.x >= -132 && q.x <= 132 && q.z >= -26 && q.z <= 174).sort((a, b) => distance(p, a) - distance(p, b))[0]!;
  };
  const isBay=(p:FacilityPoint)=>Math.abs((p.z-12.5)%36)<.01&&Math.abs((p.x+90)%36)<.01;
  const fromBay=isBay(from)?{x:from.x+8,z:from.z}:from,toBay=isBay(to)?{x:to.x-8,z:to.z}:to;
  const start = snap(fromBay), end = snap(toBay);
  const xs = [...new Set([...PORT_ROAD_COLUMNS, start.x, end.x])].sort((a, b) => a - b);
  const zs = [...new Set([...PORT_ROAD_ROWS, start.z, end.z])].sort((a, b) => a - b);
  const nodes: FacilityPoint[] = [];
  for (const x of xs) for (const z of zs) if (PORT_ROAD_COLUMNS.includes(x as any) || PORT_ROAD_ROWS.includes(z as any)) nodes.push({ x, z });
  const lengths = new Map<string, number>(nodes.map(p => [key(p), Infinity])), previous = new Map<string, FacilityPoint>(), remaining = new Set(nodes.map(key));
  lengths.set(key(start), 0);
  while (remaining.size) {
    const id = [...remaining].sort((a, b) => lengths.get(a)! - lengths.get(b)! || a.localeCompare(b))[0]!;
    if (!Number.isFinite(lengths.get(id))) throw new Error('设施之间没有连通道路。');
    remaining.delete(id); if (id === key(end)) break;
    const p = nodes.find(p => key(p) === id)!;
    const neighbours = nodes.filter(q => remaining.has(key(q)) && (q.x === p.x && PORT_ROAD_COLUMNS.includes(p.x as any) || q.z === p.z && PORT_ROAD_ROWS.includes(p.z as any)));
    for (const q of neighbours) { const candidate = lengths.get(id)! + distance(p, q); if (candidate < lengths.get(key(q))!) { lengths.set(key(q), candidate); previous.set(key(q), p); } }
  }
  const chain: FacilityPoint[] = [end];
  while (key(chain[0]!) !== key(start)) { const p = previous.get(key(chain[0]!)); if (!p) throw new Error('设施道路不能连通。'); chain.unshift(p); }
  const clean = [from,...(fromBay===from?[]:[fromBay]), ...chain,...(toBay===to?[]:[toBay]),to].filter((p, i, a) => i === 0 || distance(p, a[i - 1]!) > .01);
  // Directed lanes keep opposite traffic separate. The first/last metres are exchange spurs.
  const lane: FacilityPoint[] = [from];
  for (let i = 0; i < clean.length - 1; i++) {
    const a = clean[i]!, b = clean[i + 1]!, d = distance(a, b);
    const onRoad=a.z===b.z&&PORT_ROAD_ROWS.includes(a.z as any)||a.x===b.x&&PORT_ROAD_COLUMNS.includes(a.x as any);
    const shift = onRoad?2.1:0;
    const normal = { x: -(b.z - a.z) / d * shift, z: (b.x - a.x) / d * shift };
    lane.push({ x: a.x + normal.x, z: a.z + normal.z }, { x: b.x + normal.x, z: b.z + normal.z });
  }
  lane.push(to);
  const points = rounded(lane.filter((p, i, a) => i === 0 || distance(p, a[i - 1]!) > .01));
  return { points, length: points.slice(1).reduce((n, p, i) => n + distance(points[i]!, p), 0), edges: clean.slice(1).map((p, i) => `${key(clean[i]!)}>${key(p)}`) };
}

/** RTG moves between stack fronts; a building in the wheel corridor blocks transfer. */
export function facilityGantryRoute(setup: TerminalSetup, from: FacilityPoint, to: FacilityPoint): FacilityRoute | null {
  const fronts = [18, 54, 90], cols = Array.from({ length: 6 }, (_, i) => -90 + i * 36);
  const nodes = cols.flatMap(x => fronts.map(z => ({ x, z })));
  const lengths = new Map(nodes.map(p => [key(p), Infinity])), previous = new Map<string, FacilityPoint>(), open = new Set(nodes.map(key));
  lengths.set(key(from), 0);
  while (open.size) {
    const id = [...open].sort((a, b) => lengths.get(a)! - lengths.get(b)! || a.localeCompare(b))[0]!;
    if (!Number.isFinite(lengths.get(id))) return null;
    open.delete(id); if (id === key(to)) break;
    const p = nodes.find(p => key(p) === id)!;
    for (const q of nodes.filter(q => open.has(key(q)) && (q.z === p.z && Math.abs(q.x - p.x) === 36 || q.x === p.x && Math.abs(q.z - p.z) === 36))) {
      if (p.x === q.x) {
        const row = Math.max(p.z, q.z) / 36 - .5;
        const blocked = setup.facilities.some(f => -90 + f.col * 36 === p.x && f.row === row && !['yard', 'reefer'].includes(f.kind));
        if (blocked) continue;
      }
      const n = lengths.get(id)! + distance(p, q); if (n < lengths.get(key(q))!) { lengths.set(key(q), n); previous.set(key(q), p); }
    }
  }
  const points = [to]; while (key(points[0]!) !== key(from)) { const p = previous.get(key(points[0]!)); if (!p) return null; points.unshift(p); }
  return { points, length: points.slice(1).reduce((n, p, i) => n + distance(points[i]!, p), 0), edges: points.slice(1).map((p, i) => `gantry:${key(points[i]!)}>${key(p)}`) };
}

export function facilityRoutePose(route: FacilityRoute, fraction: number): FacilityPose {
  let d = Math.max(0, Math.min(1, fraction)) * route.length;
  for (let i = 1; i < route.points.length; i++) { const a = route.points[i - 1]!, b = route.points[i]!, n = distance(a, b); if (d <= n || i === route.points.length - 1) return { ...interpolate(a, b, n ? Math.min(1, d / n) : 1), heading: Math.atan2(b.x - a.x, b.z - a.z) + Math.PI }; d -= n; }
  return { ...route.points[0]!, heading: 0 };
}
export function facilityRoadCells(route:FacilityRoute):string[]{
  const keys=new Set<string>();for(let i=1;i<route.points.length;i++){const a=route.points[i-1]!,b=route.points[i]!,n=Math.max(1,Math.ceil(distance(a,b)/3));for(let j=0;j<=n;j++){const p=interpolate(a,b,j/n);keys.add(`road:${Math.round(p.x/6)},${Math.round(p.z/6)}`);}}return [...keys];
}

/** Book following distance and intersection clearance; any delay is spent at the origin bay. */
export function reserveFacilityRoad(route: FacilityRoute, now: number, speed: number, owner: number, reservations: RoadReservation[]) {
  const duration = Math.max(1, Math.ceil(route.length / speed)), windows: {key:string;offset:number;length:number}[] = [];
  for (let i = 0; i < route.points.length - 1; i++) {
    const p = route.points[i]!, q = route.points[i + 1]!;
    if (i === 0 || i === route.points.length - 2) windows.push({ key: `bay:${Math.round(p.x)},${Math.round(p.z)}`, offset: i === 0 ? 0 : duration, length: 8 });
    // Geometric cells also cover overlapping routes whose endpoints differ.
    const n = distance(p, q), cells = Math.max(1, Math.ceil(n / 6));
    const offset = route.points.slice(1, i + 1).reduce((sum, v, k) => sum + distance(route.points[k]!, v), 0) / speed;
    for (let c = 0; c < cells; c++) { const point = interpolate(p, q, c / cells);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)windows.push({ key: `road:${Math.round(point.x / 6)+dx},${Math.round(point.z / 6)+dz}`, offset: offset + c / cells * n / speed-3/speed, length: Math.max(9,18/speed) }); }
  }
  const merged=new Map<string,{key:string;offset:number;length:number}>();for(const w of windows){const previous=merged.get(w.key);if(previous){const end=Math.max(previous.offset+previous.length,w.offset+w.length);previous.offset=Math.min(previous.offset,w.offset);previous.length=end-previous.offset;}else merged.set(w.key,{...w});}
  const occupied=new Map<string,RoadReservation[]>();for(const r of reservations){const list=occupied.get(r.key)??[];list.push(r);occupied.set(r.key,list);}
  let start = now;
  for (let iteration = 0; iteration < 1000; iteration++) {
    let delay = 0;
    for (const w of merged.values()) for (const r of occupied.get(w.key)??[]) if (r.owner !== owner && start + w.offset < r.end && start + w.offset + w.length > r.start) delay = Math.max(delay, r.end - (start + w.offset));
    if (delay <= 0) { for (const w of merged.values()) reservations.push({ key: w.key, start: start + w.offset, end: start + w.offset + w.length, owner }); return { start: Math.ceil(start), duration }; }
    start += Math.ceil(delay);
  }
  throw new Error('道路预约未能收敛，当前任务保留在交接位。');
}
