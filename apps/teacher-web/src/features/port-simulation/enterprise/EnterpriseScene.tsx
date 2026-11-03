import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CARGO_LABELS, assetSpec, type EnterpriseView,type Asset } from '@edu/port-simulation-core';

const colors = [0xdfa544, 0x168f8a, 0x8399a5, 0xb899bf, 0xcb8c63, 0x6da7ab, 0x6d96c8];
export interface EnterpriseSceneSelection {kind:'ship'|'asset';id:string;terminalId:string;}
export type EnterpriseSceneLayer='normal'|'load'|'staff'|'health';
export function enterpriseAssetVisual(v:EnterpriseView,a:Asset,layer:EnterpriseSceneLayer){
  const history=v.telemetry.assets[a.id],reason=history?.last?.reason;
  const flag=a.status==='failed'?'故障':a.status==='maintenance'?'检修':a.status!=='active'?'未投产':v.finance.halted?'停产':reason==='staff'?'缺人':reason==='power'?'缺电':reason==='fuel'?'缺油':reason==='charging'?'补能':reason==='blocked'?'受阻':'';
  const value=layer==='health'?1-a.health/100:layer==='staff'?history?.staffCoverage??null:layer==='load'?history?.load??null:null;
  const color=a.status==='failed'?0xb45a47:a.status==='maintenance'?0xc69a48:a.status!=='active'||flag==='停产'||flag==='受阻'?0x899c9c:layer==='normal'?0xd3ad58:value===null?0x96a5a3:value<.25?0x6b9eaf:value<.55?0x58a593:value<.8?0xc9ad60:0xc87854;
  return {color,flag,value};
}
export function EnterpriseScene({ view, selected, onSelect, onObjectSelect, animate = false,layer='load',mode='briefing',focusToken=0 }: { view: EnterpriseView; selected: string; onSelect: (id: string) => void; onObjectSelect?:(selection:EnterpriseSceneSelection)=>void; animate?: boolean;layer?:EnterpriseSceneLayer;mode?:'briefing'|'observation'|'emergency';focusToken?:number }) {
  const host = useRef<HTMLDivElement>(null), latest = useRef({ view, selected, onSelect, onObjectSelect, animate,layer,mode,focusToken });
  latest.current = { view, selected, onSelect, onObjectSelect, animate,layer,mode,focusToken };
  const [fallback, setFallback] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => {
    const el = host.current; if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(0xe8eef0); el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xe8eef0, 500, 1100);
    const camera = new THREE.PerspectiveCamera(38, 1, 1, 1500); camera.position.set(280, 320, 430);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(15, 0, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .46; controls.minDistance = 200; controls.maxDistance = 850;
    const ambient=new THREE.HemisphereLight(0xffffff,0x53646c,2.2);scene.add(ambient); const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(-100, 300, 120); scene.add(sun);
    const materials = new Map<number, THREE.MeshStandardMaterial>();
    const material = (color: number) => { let m = materials.get(color); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: .85 }); materials.set(color, m); } return m; };
    const geometries: THREE.BufferGeometry[] = [], geometryCache = new Map<string,THREE.BoxGeometry>();
    const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: number) => {
      const key=w+':'+h+':'+d;let g=geometryCache.get(key);if(!g){g=new THREE.BoxGeometry(w,h,d);geometryCache.set(key,g);geometries.push(g);} const mesh = new THREE.Mesh(g, material(color)); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
    };
    const textures:THREE.Texture[]=[],spriteMaterials:THREE.SpriteMaterial[]=[],cylinderCache=new Map<string,THREE.CylinderGeometry>();
    const cylinder=(parent:THREE.Object3D,x:number,y:number,z:number,r:number,h:number,color:number,top=r)=>{const key=r+':'+h+':'+top;let g=cylinderCache.get(key);if(!g){g=new THREE.CylinderGeometry(top,r,h,16);cylinderCache.set(key,g);geometries.push(g);}const mesh=new THREE.Mesh(g,material(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
    const label=(parent:THREE.Object3D,name:string,x:number,z:number)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='rgba(250,255,251,.90)';ctx.fillRect(0,0,512,64);ctx.fillStyle='#244e53';ctx.font='bold 28px Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.fillText(name,256,43);const texture=new THREE.CanvasTexture(canvas);textures.push(texture);const m=new THREE.SpriteMaterial({map:texture,depthTest:false});spriteMaterials.push(m);const sprite=new THREE.Sprite(m);sprite.position.set(x,37,z);sprite.scale.set(60,7.5,1);sprite.renderOrder=10;parent.add(sprite);};
    const statusMaterials=new Map<string,THREE.SpriteMaterial>();
    const statusLabel=(parent:THREE.Object3D,text:string,x:number,z:number)=>{let m=statusMaterials.get(text);if(!m){const canvas=document.createElement('canvas');canvas.width=160;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle=text==='故障'?'#984e3d':'#345e61';ctx.fillRect(0,0,160,64);ctx.fillStyle='#fff9e9';ctx.font='bold 35px Microsoft YaHei,sans-serif';ctx.textAlign='center';ctx.fillText(text,80,46);const texture=new THREE.CanvasTexture(canvas);textures.push(texture);m=new THREE.SpriteMaterial({map:texture,depthTest:false});spriteMaterials.push(m);statusMaterials.set(text,m);}const sprite=new THREE.Sprite(m);sprite.position.set(x,32,z);sprite.scale.set(16,6.4,1);sprite.renderOrder=11;parent.add(sprite);};
    box(scene, -140, -4, 0, 290, 6, 520, 0x0a506a); box(scene, 118, -3, 0, 225, 6, 430, 0x77938e);
    box(scene, 25, 0, 0, 34, 4, 398, 0xc8c5b5); box(scene, 90, 1, 0, 13, 2, 410, 0x56676c); box(scene, 170, 1, 0, 9, 2, 410, 0x56676c);
    for (let z = -195; z <= 195; z += 12) box(scene, 90, 2.1, z, 1, .1, 5, 0xe4d9aa);
    for(let z=-195;z<=195;z+=22){box(scene,205,1.1,z,14,1,2,0x63736e);box(scene,202,2,z,1,1,22,0x66706a);box(scene,208,2,z,1,1,22,0x66706a);}
    for(let z=-200;z<=200;z+=70){cylinder(scene,-85,1,z,1.2,5,0xdbad50);cylinder(scene,-85,4,z,2,1,0xf3d078);}
    box(scene,214,8,-195,20,16,20,0x759293);box(scene,214,18,-195,22,4,22,0x345c67);label(scene,'港作服务 / 能源',211,-195);
    const zones: { id: string; z: number; group: THREE.Group; highlight: THREE.Mesh; ship: THREE.Group; stocks: THREE.Group; machines: THREE.Group; truck: THREE.Mesh;target:THREE.Vector3 }[] = [];
    const machineMotion:{group:THREE.Group;base:THREE.Vector3;assetId:string;stage:string;hook?:THREE.Mesh;phase:number}[]=[];
    for (let index = 0; index < latest.current.view.terminals.length; index++) {
      const t = latest.current.view.terminals[index]!, z = -165 + index * 55, group = new THREE.Group(); group.userData.terminalId = t.id; scene.add(group);
      const highlight = box(group, 48, .5, z, 80, 1, 49, 0xd0d2c4); highlight.userData.terminalId = t.id;
      const stocks = new THREE.Group(); group.add(stocks);
      const machines = new THREE.Group(); group.add(machines);
      const ship = new THREE.Group(); group.add(ship);
      box(group,131,1, z,90,2,12,0x607479);box(group,187,5,z,6,8,14,0xf0e9cc);box(group,192,10,z,17,2,2,0xd4ab5d);
      for(let i=0;i<4;i++)box(group,175,2.1,z-18+i*10,15,.2,1,0xf3e9b9);
      label(group,t.id+' '+CARGO_LABELS[t.goods].name+'作业区',126,z-20);
      if(t.goods==='liquid')for(let i=0;i<3;i++){cylinder(group,115+i*18,11,z,8,20,0xd9e2df);cylinder(group,115+i*18,21.5,z,8.3,1,0x89a4a3);box(group,120+i*16,3,z+16,2,4,24,0xc9b85d);}
      else if(t.goods==='bulk'){box(group,132,5,z,58,9,35,0xc0b59a);box(group,132,10,z,60,2,37,0x6b817c);box(group,63,9,z,68,3,4,0x657b77);}
      else if(t.goods==='passenger'){box(group,131,10,z,58,19,32,0xe8e0c8);box(group,131,21,z,62,3,36,0x2c777f);for(let i=0;i<6;i++)box(group,108+i*8,12,z+16.2,5,10,.5,0x79b3ba);}
      else if(t.goods==='roro'){box(group,134,2,z,64,3,36,0x879b91);for(let i=0;i<7;i++)box(group,109+i*8,3.6,z,1,.1,33,0xdbe0c5);box(group,17,3,z,31,2,24,0x9eaca4);}
      else {box(group,134,11,z,58,21,34,t.goods==='container'?0x9fb4b2:0xb7b8a3);box(group,134,23,z,62,3,38,0x436c72);for(let i=0;i<4;i++)box(group,112+i*13,8,z+17.5,9,14,1,0x53676b);}
      box(ship, 0, 5, 0, 24, 10, 42, colors[index]!); box(ship, 0, 12, -12, 15, 6, 11, 0xe4e9e8); box(ship, 0, 17, -14, 10, 3, 5, 0x233f50);
      for (let i = 0; i < 6; i++) box(ship, (i % 2) * 7 - 3.5, 12, Math.floor(i / 2) * 8 - 2, 6, 5, 7, i % 2 ? 0xaab4a6 : colors[index]!);
      const truck = box(group, 90, 4, z, 7, 5, 12, 0xe6b747);
      truck.visible=false;zones.push({ id: t.id, z, group, highlight, ship, stocks, machines, truck,target:new THREE.Vector3(-18,0,z) });
    }
    const waiting: THREE.Group[] = [];
    for (let i = 0; i < 10; i++) { const g = new THREE.Group(); scene.add(g); box(g, 0, 3, 0, 13, 7, 30, i % 2 ? 0x397a91 : 0xdda34a); box(g, 0, 8, -8, 9, 5, 8, 0xc5d5d6); g.position.set(-140 - i % 3 * 38, 0, -140 + Math.floor(i / 3) * 90); waiting.push(g); }
    let lastSignature = '', frame = 0, disposed = false,lastMode='',lastFocus=-1,visualTime=0,lastNow=0,cameraMoving=false;
    const cameraTo=new THREE.Vector3(),lookTo=new THREE.Vector3();controls.addEventListener('start',()=>{cameraMoving=false;});
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down = { x: 0, y: 0 };
    const start = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const choose = (e: PointerEvent) => { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera); for (const hit of ray.intersectObjects(scene.children, true)) { let p: THREE.Object3D | null = hit.object; while (p) { if(latest.current.onObjectSelect&&p.userData.callId){latest.current.onObjectSelect({kind:'ship',id:String(p.userData.callId),terminalId:String(p.userData.terminalId)});return;} if(latest.current.onObjectSelect&&p.userData.assetId){latest.current.onObjectSelect({kind:'asset',id:String(p.userData.assetId),terminalId:String(p.userData.terminalId)});return;} if (p.userData.terminalId) { latest.current.onSelect(String(p.userData.terminalId)); return; } p = p.parent; } } };
    renderer.domElement.addEventListener('pointerdown', start); renderer.domElement.addEventListener('pointerup', choose);
    const draw = () => {
      if (disposed) return;
      const { view: v, selected: pick, animate: running,layer:heat,mode:directorMode } = latest.current;
      const now=performance.now(),dt=lastNow?Math.min(.08,(now-lastNow)/1000):0;lastNow=now;if(running&&!document.hidden)visualTime+=dt;
      if(directorMode!==lastMode||latest.current.focusToken!==lastFocus){lastMode=directorMode;lastFocus=latest.current.focusToken;const z=zones.find(t=>t.id===pick)?.z??0;if(directorMode==='briefing'&&!lastFocus){cameraTo.set(280,320,430);lookTo.set(15,0,0);}else{cameraTo.set(185,200,z+250);lookTo.set(38,0,z);}cameraMoving=true;}
      if(cameraMoving){const alpha=Math.min(1,dt*3);camera.position.lerp(cameraTo,alpha);controls.target.lerp(lookTo,alpha);if(camera.position.distanceTo(cameraTo)<.5)cameraMoving=false;}
      const daylight=directorMode==='briefing'?1:Math.max(.15,Math.sin((v.hour%24-6)/12*Math.PI));sun.intensity+=(2.5*daylight-sun.intensity)*Math.min(1,dt*2);ambient.intensity+=(1.1+daylight*1.1-ambient.intensity)*Math.min(1,dt*2);
      const signature = v.hour + ':' + v.assets.length + ':' + v.projects.length + ':' + v.journal.length+':'+heat+':'+directorMode+':'+pick;
      if (signature !== lastSignature) {
        lastSignature = signature;
        machineMotion.length=0;
        for (const zone of zones) {
          zone.stocks.clear(); zone.machines.clear();
          const t = v.terminals.find(t => t.id === zone.id)!;
          const stock = Math.min(36, Math.ceil(t.stock / Math.max(1, t.storageCapacity) * 36));
          if(t.goods==='container')for(const b of v.management.yardBlocks.filter(b=>b.terminalId===t.id)){
            const x=45+b.index%5*7,z=zone.z-14+Math.floor(b.index/5)*22,color=b.purpose==='shared'?0xc5a65e:b.purpose==='import'?0x4b8f7a:0x668eae;
            box(zone.stocks,x,1.4,z,6,.7,17,color);
            const height=b.used?Math.max(1,b.layers):0;
            for(let level=0;level<height;level++)box(zone.stocks,x,3+level*3,z,5.5,2.6,15,color);
          }
          else if(t.goods==='bulk')for(let i=0;i<Math.ceil(stock/6);i++)cylinder(zone.stocks,48+i%3*12,6,zone.z-12+Math.floor(i/3)*17,8,12,0x665d50,0);
          else if(t.goods==='liquid')for(let i=0;i<3;i++)box(zone.stocks,114+i*18,4+Math.min(14,stock*.4)/2,zone.z+8.1,11,Math.max(1,Math.min(14,stock*.4)),.5,0x55a3a4);
          else if(t.goods==='roro')for(let i=0;i<Math.min(24,stock);i++){box(zone.stocks,48+i%4*8,3,zone.z-17+Math.floor(i/4)*6,5,3,3,i%2?0xe4e1d1:0x517d8b);}
          else for (let i = 0; i < stock; i++) box(zone.stocks, 46 + i % 4 * 8, 4 + Math.floor(i / 12) * 5, zone.z - 17 + Math.floor(i % 12 / 4) * 12, 6, 5, 10, colors[v.terminals.indexOf(t)]!);
          const assets = v.assets.filter(a => a.terminalId === zone.id && a.status !== 'retired' && a.status !== 'ordered');
          const positions:Record<string,number>={};
          assets.forEach(a => {
            const spec=assetSpec(a.model),stage=spec.stage,i=positions[stage]??0;positions[stage]=i+1;
            const assetGroup=new THREE.Group();assetGroup.userData={assetId:a.id,terminalId:t.id};zone.machines.add(assetGroup);
            const visual=enterpriseAssetVisual(v,a,heat),color=visual.color;let hook:THREE.Mesh|undefined;
            let x=0,z=0;
            if(stage==='quay'){
              x=10+Math.floor(i/5)*5;z=zone.z-16+i%5*9;
              if(t.goods==='container'||t.goods==='general'){box(assetGroup,x,13,z,3,25,3,color);box(assetGroup,x+16,13,z,3,25,3,color);box(assetGroup,x+4,27,z,45,3,3,color);hook=box(assetGroup,-6,17,z,1,18,1,color);}
              else if(t.goods==='bulk'){box(assetGroup,16,10,z,8,18,8,color);const belt=box(assetGroup,-1,19,z,45,4,5,color);belt.rotation.z=.13;}
              else if(t.goods==='liquid'){cylinder(assetGroup,13,7,z,2,14,color);box(assetGroup,0,14,z,28,2,2,color);box(assetGroup,-12,10,z,2,8,2,color);}
              else box(assetGroup,9,4,z,35,3,12,color);
            }else if(stage==='yard'){
              x=47+(i%3)*12;z=zone.z-13+Math.floor(i/3)*12;
              if(t.goods==='container'&&['rtg','rmg'].includes(a.model)){box(assetGroup,x,10,z,2,19,2,color);box(assetGroup,x+23,10,z,2,19,2,color);box(assetGroup,x+12,20,z,27,3,4,color);}
              else{box(assetGroup,x,4,z,7,7,9,color);box(assetGroup,x+5,4,z,2,8,2,color);}
            }else if(stage==='transport'){
              x=90+(i%3)*8;z=zone.z-15+Math.floor(i/3)*11;box(assetGroup,x,3.5,z,5,4,9,color);box(assetGroup,x,4,z+6,4,5,4,0xd5e2dc);
            }else if(stage==='gate'){
              x=179+(i%3)*7;z=zone.z-13+Math.floor(i/3)*10;box(assetGroup,x,4,z,5,7,6,color);box(assetGroup,x+4,7,z,7,1,1,color);
            }else{x=-38;z=zone.z+13+i*8;box(assetGroup,x,3,z,9,5,15,color);box(assetGroup,x,7,z-3,6,4,6,0xcbd9d7);}
            if(visual.flag){const flag=box(assetGroup,x+2,24,z,4,4,2,color);flag.rotation.z=Math.PI/4;if(visual.flag==='故障'||visual.flag==='检修'){const cross=box(assetGroup,x+2,27,z,1,6,1,0xf3ede1);cross.rotation.z=.7;}if(zone.id===pick||visual.flag==='故障')statusLabel(assetGroup,visual.flag,x+2,z);}
            machineMotion.push({group:assetGroup,base:assetGroup.position.clone(),assetId:a.id,stage,hook,phase:Number(a.id.split('-').at(-1)??0)*.7});
          });
          for(const p of v.projects.filter(p=>p.terminalId===t.id)){const progress=Math.min(1,Math.max(0,(v.hour-p.started)/Math.max(1,p.completes-p.started)));if(p.status==='building'){box(zone.stocks,153,1,zone.z+12,22,1,12,0xb5a47a);for(let j=0;j<Math.ceil(progress*4);j++)box(zone.stocks,145+j*5,3+progress*7,zone.z+12,1,6+progress*14,1,0xc3a355);}else if(p.type==='yard-extension')box(zone.stocks,151,4,zone.z+12,20,7,12,0x86a9a0);}
          const c = v.calls.find(c => c.id === t.berthCall),recent=directorMode==='briefing'&&assets.some(a=>assetSpec(a.model).stage==='quay'&&(v.telemetry.assets[a.id]?.work??0)>0); zone.ship.visible = !!c||recent;
          if (c) {zone.target.set(c.stage === 'entering' || c.stage === 'leaving' ? -50 : -18,0,zone.z);zone.ship.userData={callId:c.id,terminalId:t.id};}else{zone.target.set(-18,0,zone.z);zone.ship.userData={terminalId:t.id};}
          zone.highlight.material = material(pick === zone.id ? 0xe8c97c : 0xc5c9bb);
          zone.truck.visible=false;
        }
        const queued = v.calls.filter(c => c.stage === 'waiting'); waiting.forEach((g, i) => { g.visible = i < queued.length;if(queued[i])g.userData={callId:queued[i]!.id,terminalId:queued[i]!.terminalId}; });
      }
      for (const z of zones) { z.highlight.material = material(pick === z.id ? 0xe8c97c : 0xc5c9bb);z.ship.position.lerp(z.target,Math.min(1,dt*4)); }
      const byId=new Map(v.assets.map(a=>[a.id,a]));for(const m of machineMotion){const a=byId.get(m.assetId);if(!a)continue;const active=a.status==='active'&&!v.finance.halted&&(directorMode==='briefing'?(v.telemetry.assets[a.id]?.work??0)>0:a.lastWork>0);if(running&&active){if(m.stage==='transport')m.group.position.z=m.base.z+Math.sin(visualTime*.7+m.phase)*14;if(m.hook)m.hook.scale.y=.6+(Math.sin(visualTime*1.2+m.phase)+1)*.3;}}
      controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(draw);
    };
    draw(); setReady(true);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', start); renderer.domElement.removeEventListener('pointerup', choose); for (const g of geometries) g.dispose(); for (const m of materials.values()) m.dispose();for(const t of textures)t.dispose();for(const m of spriteMaterials)m.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
  }, []);
  return <div className="enterprise-scene" data-renderer={fallback ? 'fallback' : ready ? 'ready' : 'loading'}>
    <div className="enterprise-scene__canvas" ref={host} aria-label="可旋转缩放的港口三维场景" />
    {fallback && <svg className="enterprise-scene__fallback" viewBox="0 0 800 440" aria-label="全港业务与实际设备平面图"><rect width="800" height="440" fill="#125268"/><rect x="280" width="520" height="440" fill="#dce3df"/>{view.terminals.map((t, i) => <g key={t.id}><g role="button" tabIndex={0} aria-label={'查看'+t.name} onClick={() => onSelect(t.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onSelect(t.id);}} style={{ cursor: 'pointer' }}><rect x="255" y={14 + i * 59} width="215" height="49" rx="5" fill={selected === t.id ? '#ecc779' : '#aec4b9'}/><text x="270" y={35 + i * 59} fontSize="13" fill="#173c43">{t.name}</text><text x="270" y={51 + i * 59} fontSize="10" fill="#173c43">{t.stock}/{t.storageCapacity}{CARGO_LABELS[t.goods].unit} · 等泊{t.queued}</text>{t.berthCall && <rect x="190" y={20 + i * 59} width="47" height="30" fill="#e5b557"/>}</g>{view.assets.filter(a=>a.terminalId===t.id&&!['retired','ordered'].includes(a.status)).map((a,j)=>{const visual=enterpriseAssetVisual(view,a,layer),name=assetSpec(a.model).name+' '+a.id+' · '+(visual.flag||(visual.value===null?'无样本':Math.round(visual.value*100)+'%')),choose=()=>onObjectSelect?.({kind:'asset',id:a.id,terminalId:t.id});return <g key={a.id} role="button" tabIndex={0} aria-label={name} onClick={choose} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')choose();}} style={{cursor:'pointer'}}><title>{name}</title><rect x={487+j%14*21} y={18+i*59+Math.floor(j/14)*12} width="16" height="10" rx="2" fill={'#'+visual.color.toString(16).padStart(6,'0')}/>{visual.flag&&<text x={495+j%14*21} y={26+i*59+Math.floor(j/14)*12} textAnchor="middle" fontSize="8" fill="#fff">{visual.flag[0]}</text>}</g>;})}</g>)}</svg>}
    <div className="enterprise-scene__caption"><span>东湾港 · 教学情境</span><span>{fallback ? '业务平面图' : mode==='briefing'?'拖动旋转 · 近24小时业务流量示意':'拖动旋转 · 点击实际设备与在港船舶'}</span></div>
    <div className="enterprise-scene__legend">水域 / 航道 <i/> 岸线与库场 <i/> 在港船舶 <i/> 实际业务投影</div>
  </div>;
}
