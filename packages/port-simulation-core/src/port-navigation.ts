/** Deterministic teaching navigation. One scene unit = two metres; no hydrodynamic claims. */
export const PORT_NAVIGATION_VERSION = "port-navigation/1.0";
export const NAV_METRES = 2;
export const NAV_KNOT = 1852 / 3600;
export type NavPoint = { x: number; z: number };
export type NavPose = NavPoint & { heading: number };
export type NavPhase = "港外航行" | "港内航行" | "转弯" | "辅助靠离泊";
export interface NavSegment { kind: "line" | "arc"; from: NavPose; to: NavPose; length: number; phase: NavPhase; center?: NavPoint; radius?: number; sweep?: number; }
export interface NavSample { distance: number; time: number; speed: number; }
export interface PortNavigation { version: typeof PORT_NAVIGATION_VERSION; large: boolean; segments: NavSegment[]; samples: NavSample[]; duration: number; distance: number; releaseAfter: number; }
export const portNavigationProfile = (large: boolean) => ({ outerKnots: large ? 5 : 6, innerKnots: large ? 2.5 : 3, turnKnots: 2, assistKnots: .3, radiusMetres: large ? 400 : 300, acceleration: large ? .015 : .02, deceleration: large ? .02 : .03 });
export const portBerthPoint = (slot: number): NavPose => ({ x: slot ? 62 : -62, z: -78, heading: 0 });
export const portAnchorPoint = (slot: number): NavPose => ({ x: slot % 2 ? 650 : -650, z: -500 - Math.floor(slot / 2) * 350, heading: 0 });
export const PORT_ENTRANCE: NavPose = { x: -450, z: -1150, heading: Math.PI / 2 };
export function portLocationPose(location: string, id = "S01"): NavPose {
  if (location.startsWith("berth:")) return portBerthPoint(Number(location.split(":")[1]));
  if (location.startsWith("anchor:")) return portAnchorPoint(Number(location.split(":")[1]));
  const ordinal = Math.max(0, Number(id.replace(/\D/g, "")) - 1) || 0;
  return location === "sea" ? { x: -780, z: -1450, heading: Math.PI } : { x: -780, z: -1500 - ordinal * 128, heading: 0 };
}
const tau = Math.PI * 2;
const mod = (a: number) => (a % tau + tau) % tau;
const distance = (a: NavPoint, b: NavPoint) => Math.hypot(b.x - a.x, b.z - a.z);
function line(from: NavPose, to: NavPose, phase: NavPhase = "港内航行"): NavSegment { return { kind: "line", from, to, length: distance(from, to), phase }; }
function arc(from: NavPose, to: NavPose, center: NavPoint, radius: number, sign: number): NavSegment {
  const sweep = sign * mod(sign * (Math.atan2(to.z - center.z, to.x - center.x) - Math.atan2(from.z - center.z, from.x - center.x)));
  return { kind: "arc", from, to, center, radius, sweep, length: Math.abs(sweep) * radius, phase: "转弯" };
}
/** All four forward circle-straight-circle tangent paths; stable order breaks equal-length ties. */
function tangentPaths(a: NavPose, b: NavPose, radius: number): NavSegment[][] {
  const paths: NavSegment[][] = [];
  if (Math.abs(Math.sin(a.heading - b.heading)) < 1e-8 && Math.abs(Math.sin(Math.atan2(b.z-a.z,b.x-a.x)-a.heading)) < 1e-8 && (b.x-a.x)*Math.cos(a.heading)+(b.z-a.z)*Math.sin(a.heading)>=0) paths.push([line(a,b)]);
  for (const sa of [1, -1]) for (const sb of [1, -1]) {
    const ca = { x: a.x - sa * radius * Math.sin(a.heading), z: a.z + sa * radius * Math.cos(a.heading) };
    const cb = { x: b.x - sb * radius * Math.sin(b.heading), z: b.z + sb * radius * Math.cos(b.heading) };
    const d = distance(ca, cb), q = (sb-sa)*radius/d;
    if (d < 1e-8 || Math.abs(q) > 1) continue;
    const heading = Math.atan2(cb.z-ca.z,cb.x-ca.x)-Math.asin(q);
    const p = { x: ca.x+sa*radius*Math.sin(heading), z: ca.z-sa*radius*Math.cos(heading), heading };
    const n = { x: cb.x+sb*radius*Math.sin(heading), z: cb.z-sb*radius*Math.cos(heading), heading };
    if ((n.x-p.x)*Math.cos(heading)+(n.z-p.z)*Math.sin(heading)<-1e-6) continue;
    paths.push([arc(a,p,ca,radius,sa),line(p,n),arc(n,b,cb,radius,sb)].filter(s=>s.length>1e-7));
  }
  return paths;
}
export function navigationPoint(segment: NavSegment, fraction: number): NavPose {
  const f = Math.max(0, Math.min(1, fraction));
  if (segment.kind === "line") return { x: segment.from.x+(segment.to.x-segment.from.x)*f, z: segment.from.z+(segment.to.z-segment.from.z)*f, heading: segment.from.heading };
  const angle = Math.atan2(segment.from.z-segment.center!.z,segment.from.x-segment.center!.x)+segment.sweep!*f;
  return { x: segment.center!.x+segment.radius!*Math.cos(angle), z: segment.center!.z+segment.radius!*Math.sin(angle), heading: angle+Math.sign(segment.sweep!)*Math.PI/2 };
}
/** Conservative oriented hull rectangle, including a safety margin (scene units). */
export function navigationHullsOverlap(a: NavPose, b: NavPose, margin = 4) {
  const axes = [a.heading, a.heading+Math.PI/2, b.heading, b.heading+Math.PI/2];
  return axes.every(h => {
    const radius = (p: NavPose) => (55+margin)*Math.abs(Math.cos(p.heading-h))+(10+margin)*Math.abs(Math.sin(p.heading-h));
    return Math.abs((a.x-b.x)*Math.cos(h)+(a.z-b.z)*Math.sin(h)) < radius(a)+radius(b)-1e-7;
  });
}
function obstacles(from: string, to: string) {
  return [0,1].map(i=>`berth:${i}`).concat([0,1,2,3].map(i=>`anchor:${i}`)).filter(p=>p!==from&&p!==to).map(p=>portLocationPose(p));
}
export function navigationPathClear(segments: NavSegment[], from: string, to: string, id="S01") {
  const blocked = obstacles(from,to);
  for (const segment of segments) {
    const count = Math.max(1,Math.ceil(segment.length/3));
    for(let i=0;i<=count;i++) {
      const p=navigationPoint(segment,i/count), ex=59*Math.abs(Math.cos(p.heading))+14*Math.abs(Math.sin(p.heading)), ez=59*Math.abs(Math.sin(p.heading))+14*Math.abs(Math.cos(p.heading));
      if (p.x+ex>-138 && p.x-ex<138 && p.z+ez>-57) return false;
      if (p.x+ex>-550 && p.x-ex<550 && p.z+ez>115) return false;
      if(blocked.some(b=>navigationHullsOverlap(p,b))) return false;
      if(Math.abs(p.x+780)<ex+60) {
        const nearest=Math.round((-p.z-1500)/128);
        for(let slot=Math.max(0,nearest-1);slot<=nearest+1;slot++) {
          const parkedId=`S${String(slot+1).padStart(2,"0")}`;
          if(from==="outer"&&parkedId===id)continue;
          if(navigationHullsOverlap(p,portLocationPose("outer",parkedId)))return false;
        }
      }
    }
  }
  return true;
}
const pathLength=(segments:NavSegment[])=>segments.reduce((n,s)=>n+s.length,0);
function route(from: string,to:string,large:boolean,id:string) {
  const a=portLocationPose(from,id), b=portLocationPose(to,id), prefix:NavSegment[]=[], suffix:NavSegment[]=[];
  let start=a,end=b;
  const r=portNavigationProfile(large).radiusMetres/NAV_METRES;
  if(from==="outer") {
    const corner={x:PORT_ENTRANCE.x-r,z:a.z,heading:0},north={x:PORT_ENTRANCE.x,z:a.z+r,heading:Math.PI/2};
    prefix.push(line(a,corner,"港外航行"),arc(corner,north,{x:corner.x,z:north.z},r,1),line(north,PORT_ENTRANCE,"港外航行"));start=PORT_ENTRANCE;
  }
  if(from.startsWith("berth:")) { start={...a,z:-125};prefix.push(line(a,start,"辅助靠离泊")); }
  if(to.startsWith("berth:")) { end={...b,z:-125};suffix.push(line(end,b,"辅助靠离泊")); }
  const candidates=tangentPaths(start,end,r).map(p=>[...prefix,...p,...suffix]);
  const valid=candidates.filter(p=>navigationPathClear(p,from,to,id));
  if(!valid.length) for(const via of [{x:0,z:-1200,heading:0},{x:450,z:-1250,heading:Math.PI},{x:-450,z:-1450,heading:0}]) {
    for(const left of tangentPaths(start,via,r)) for(const right of tangentPaths(via,end,r)) {
      const p=[...prefix,...left,...right,...suffix];if(navigationPathClear(p,from,to,id)) valid.push(p);
    }
  }
  valid.sort((a,b)=>pathLength(a)-pathLength(b));
  if(!valid[0]) throw new Error("当前航线尚无安全通行路径，请保留等待位置。");
  return valid[0];
}
export function createPortNavigation(from:string,to:string,large:boolean,id="S01"):PortNavigation {
  const segments=route(from,to,large,id), profile=portNavigationProfile(large), samples:NavSample[]=[{distance:0,time:0,speed:0}];
  let cumulative=0;
  for(const seg of segments) {
    const cap=(seg.phase==="辅助靠离泊"?profile.assistKnots:seg.kind==="arc"?profile.turnKnots:seg.phase==="港外航行"?profile.outerKnots:profile.innerKnots)*NAV_KNOT;
    samples[samples.length-1]!.speed=Math.min(samples[samples.length-1]!.speed,cap);
    const count=Math.max(1,Math.ceil(seg.length*NAV_METRES/4));
    for(let i=1;i<=count;i++) samples.push({distance:cumulative+seg.length*NAV_METRES*i/count,time:0,speed:cap});
    cumulative+=seg.length*NAV_METRES;
  }
  samples[0]!.speed=0;samples[samples.length-1]!.speed=0;
  for(let i=1;i<samples.length;i++) {const a=samples[i-1]!,b=samples[i]!;b.speed=Math.min(b.speed,Math.sqrt(a.speed*a.speed+2*profile.acceleration*(b.distance-a.distance)));}
  for(let i=samples.length-2;i>=0;i--) {const a=samples[i]!,b=samples[i+1]!;a.speed=Math.min(a.speed,Math.sqrt(b.speed*b.speed+2*profile.deceleration*(b.distance-a.distance)));}
  for(let i=1;i<samples.length;i++) {const a=samples[i-1]!,b=samples[i]!;b.time=a.time+2*(b.distance-a.distance)/(a.speed+b.speed);}
  const duration=Math.ceil(samples.at(-1)!.time), navigation:PortNavigation={version:PORT_NAVIGATION_VERSION,large,segments,samples,duration,distance:cumulative,releaseAfter:0};
  // The source remains reserved until the whole hull has cleared its original footprint.
  if(from.startsWith("berth:")||from.startsWith("anchor:")) {
    const origin=portLocationPose(from,id);
    navigation.releaseAfter=duration;
    for(const sample of samples) if(!navigationHullsOverlap(portNavigationPose(navigation,sample.time),origin)) {navigation.releaseAfter=Math.ceil(sample.time);break;}
  }
  return navigation;
}
export function portNavigationPose(nav:PortNavigation,elapsed:number):NavPose & {speedKnots:number;phase:NavPhase;radiusMetres:number|null;remaining:number} {
  const t=Math.max(0,Math.min(nav.duration,elapsed)),samples=nav.samples;
  let lo=0,hi=samples.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid]!.time<=t)lo=mid;else hi=mid;}
  const a=samples[lo]!,b=samples[hi]!,dt=Math.max(0,Math.min(t-a.time,b.time-a.time)),acc=(b.speed-a.speed)/(b.time-a.time||1);
  let d=Math.min(nav.distance,a.distance+a.speed*dt+.5*acc*dt*dt)/NAV_METRES;
  let segment=nav.segments.at(-1)!;
  for(const s of nav.segments){segment=s;if(d<=s.length)break;d-=s.length;}
  const done=t>=samples.at(-1)!.time;
  const pose=done?nav.segments.at(-1)!.to:navigationPoint(segment,d/segment.length);
  return {...pose,speedKnots:done?0:(a.speed+acc*dt)/NAV_KNOT,phase:segment.phase,radiusMetres:segment.radius?segment.radius*NAV_METRES:null,remaining:Math.max(0,nav.duration-t)};
}
