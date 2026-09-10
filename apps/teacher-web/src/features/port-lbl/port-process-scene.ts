import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type PortProcessKind = "gate" | "load" | "unload" | "transport" | "rehandle" | "relay" | "lock" | "bulk" | "coal" | "grain" | "oil" | "lng" | "roro" | "heavy";
const smooth=(p:number,a:number,b:number)=>{const t=THREE.MathUtils.clamp((p-a)/(b-a),0,1);return t*t*(3-2*t);};
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);

// All motion is sampled from the slide clock. There are no independent animation loops.
export function createPortProcessScene(canvas:HTMLCanvasElement,kind:PortProcessKind,width:number,height:number){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  renderer.setSize(width,height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#0b1923");
  const extent=["load","unload","heavy","relay","rehandle"].includes(kind)?26:22;
  const camera=new THREE.OrthographicCamera(-extent,extent,extent*height/width,-extent*height/width,.1,140);
  const root=new THREE.Group();scene.add(root);
  scene.add(new THREE.HemisphereLight(0xc8e7ff,0x33434b,2.5));
  const sun=new THREE.DirectionalLight(0xffdfab,4);sun.position.set(-12,28,14);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-23,right:23,top:22,bottom:-22,near:1,far:75});sun.shadow.bias=-.001;sun.shadow.normalBias=.08;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x72d7ed,2);rim.position.set(10,12,-15);scene.add(rim);
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  const mat=(color:string,metalness=.12)=>{const key=color+metalness;let m=materials.get(key);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.62,metalness});materials.set(key,m);}return m;};
  const mesh=(g:THREE.BufferGeometry,color:string,parent:THREE.Object3D=root)=>{const m=new THREE.Mesh(g,mat(color));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent:THREE.Object3D=root)=>{const m=mesh(new THREE.BoxGeometry(w,h,d),color,parent);m.position.set(x,y,z);return m;};
  const cylinder=(x:number,y:number,z:number,r:number,h:number,color:string,parent:THREE.Object3D=root)=>{const m=mesh(new THREE.CylinderGeometry(r,r,h,20),color,parent);m.position.set(x,y,z);return m;};
  const beam=(a:THREE.Vector3,b:THREE.Vector3,r:number,color:string,parent:THREE.Object3D=root)=>{const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),color,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(v(0,1,0),b.clone().sub(a).normalize());return m;};
  const line=(points:THREE.Vector3[],color:string)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.6}));root.add(l);return l;};
  // Corrugations and fittings share one draw call per material, even while moving.
  const consolidate=(group:THREE.Group)=>{
    group.updateMatrixWorld(true);
    const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    const old:THREE.Mesh[]=[];
    group.traverse(object=>{if(object instanceof THREE.Mesh&&!Array.isArray(object.material)){
      const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
      const bucket=batches.get(object.material)||[];bucket.push(geometry);batches.set(object.material,bucket);old.push(object);
    }});
    group.clear();old.forEach(object=>object.geometry.dispose());
    for(const [material,geometries] of batches){const combined=mergeGeometries(geometries,false);geometries.forEach(geometry=>geometry.dispose());if(combined){const m=new THREE.Mesh(combined,material);m.castShadow=true;m.receiveShadow=true;group.add(m);}}
    return group;
  };
  const container=(color="#328b9e")=>{
    const g=new THREE.Group();box(0,.8,0,3.8,1.6,1.6,color,g);
    for(let i=0;i<21;i++)for(const z of [-.813,.813])box(-1.8+i*.18,.8,z,.044,1.46,.038,color,g);
    for(const y of [.08,1.52])for(const z of [-.84,.84])box(0,y,z,3.94,.12,.1,"#83afaf",g);
    for(const x of [-1.86,1.86])for(const z of [-.78,.78])box(x,.8,z,.11,1.64,.12,"#88b5b5",g);
    for(const z of [-.5,.5]){box(1.93,.8,z,.045,1.35,.035,"#d6d8c8",g);box(1.96,.58,z,.05,.05,.3,"#d6d8c8",g);}
    box(-.4,.94,.839,.85,.18,.025,"#d9e5d8",g);return consolidate(g);
  };
  const truck=()=>{
    const g=new THREE.Group();box(0,.8,0,5.1,.26,1.9,"#d6aa58",g);box(2.75,1.42,0,1.5,1.7,1.85,"#e6e6d9",g);
    box(2.99,1.75,0,1.03,.72,1.91,"#294a59",g);box(3.53,1.1,0,.12,.62,1.8,"#c4ccc3",g);
    for(const x of [-1.9,-1.05,2.9])for(const z of [-1,1]){const tire=cylinder(x,.43,z,.43,.25,"#15232b",g);tire.rotation.x=Math.PI/2;const hub=cylinder(x,.43,z*1.14,.22,.05,"#98a9ac",g);hub.rotation.x=Math.PI/2;}
    for(const z of [-.62,.62])box(3.61,1.02,z,.06,.16,.29,"#ffeac4",g);return consolidate(g);
  };
  const vessel=(type:"container"|"bulk"|"oil"|"lng"|"roro"="container")=>{
    const g=new THREE.Group();const shape=new THREE.Shape();shape.moveTo(-8,-1.8);shape.lineTo(6.8,-1.8);shape.quadraticCurveTo(9,-1.5,9,0);shape.quadraticCurveTo(9,1.5,6.8,1.8);shape.lineTo(-8,1.8);shape.closePath();
    const hull=mesh(new THREE.ExtrudeGeometry(shape,{depth:1.4,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.2,bevelThickness:.2}),"#244b61",g);hull.rotation.x=-Math.PI/2;hull.position.y=-.55;
    box(0,1.03,0,15.6,.18,3.4,"#768b87",g);box(-6.6,2.15,0,2.1,2.25,2.8,"#dfe5da",g);box(-6.6,3.35,0,2.6,.65,3.2,"#dfe5da",g);box(-6.45,3.4,1.62,2.05,.3,.04,"#244e61",g);
    box(-7.2,4.15,0,.8,1.05,.85,"#d19c4e",g);beam(v(-6,3.7,0),v(-6,5,0),.045,"#d7dbcb",g);
    for(let i=0;i<16;i++)for(const z of [-1.69,1.69])beam(v(-7.6+i,1.1,z),v(-7.6+i,1.58,z),.018,"#cedad5",g);
    for(const z of [-1.69,1.69])beam(v(-7.6,1.58,z),v(7.7,1.58,z),.022,"#cedad5",g);
    if(type==="container")for(const x of [-3.6,4.2]){const c=container(x<0?"#b96f4e":"#879775");c.scale.set(.9,.8,.9);c.position.set(x,1.13,0);g.add(c);}
    if(type==="bulk")for(const x of [-3,1,5]){box(x,1.2,0,3.45,.2,2.8,"#b59d70",g);box(x,1.31,0,3.1,.08,2.48,"#192b34",g);}
    if(type==="oil")for(let i=0;i<9;i++){cylinder(-4+i*1.3,1.28,0,.32,.22,"#b49054",g);beam(v(-5,1.55,.8),v(6.8,1.55,.8),.065,"#d4b178",g);}
    if(type==="lng")for(const x of [-3.5,.4,4.3]){const s=mesh(new THREE.SphereGeometry(1.55,24,16),"#d1dbd4",g);s.position.set(x,1.4,0);}
    if(type==="roro"){box(.25,3.05,0,12.1,3.85,3.1,"#d9e0d8",g);box(.6,3.95,1.57,11,.12,.05,"#5493a3",g);box(4.8,1.9,1.61,2.25,1.6,.07,"#152c38",g);}
    return consolidate(g);
  };
  const water=box(0,-.43,-6.8,33,.4,13,"#15566a");
  const quay=box(0,-.02,4.2,33,.95,10.5,"#54666a");box(0,.48,-.92,33,.16,.3,"#d0bd8a");
  for(let x=-15;x<16;x+=1.4){box(x,.48,3.6,.72,.026,.085,"#b7c3be");box(x,.48,6.9,.72,.026,.085,"#b7c3be");}
  for(let x=-14;x<16;x+=3){box(x,-.1,-1.16,.42,.75,.32,"#182c36");cylinder(x,.64,-.65,.16,.32,"#a6a796");}
  const ripples:THREE.Line[]=[];
  for(let i=0;i<18;i++){const points=Array.from({length:15},(_,j)=>v(-16+j*2.3,-.2,-1.8-i*.65+Math.sin(j*1.3+i)*.07));ripples.push(line(points,i%3?"#4e94a2":"#92b9bb"));}
  const updates:Array<(p:number)=>void>=[];
  const add=(g:THREE.Object3D,x:number,y:number,z:number)=>{g.position.set(x,y,z);root.add(g);return g;};
  const yard=()=>{for(let row=0;row<2;row++)for(let col=0;col<5;col++){const c=container(["#697d77","#af7957","#417181"][(col+row)%3]);c.scale.setScalar(.73);add(c,-10+col*4.6,.5,7.8+row*1.4);}};
  const crane=()=>{
    const g=new THREE.Group();root.add(g);
    for(const x of [-2.7,2.7])for(const z of [1,5]){beam(v(x,.5,z),v(x*.7,9.7,z),.17,"#d8ae5e",g);box(x,.66,z,1.2,.38,.7,"#284653",g);for(const yy of [2.3,4.5,6.7])beam(v(x,yy,z),v(x*.7,yy+2.1,z===1?5:1),.065,"#c4954e",g);}
    for(const x of [-1.9,1.9]){box(x,9.8,-.9,.28,.35,14.5,"#e1b96b",g);box(x,10.8,-.9,.18,.18,14.5,"#d7aa59",g);for(let z=-7.7;z<5.5;z+=1.2)beam(v(x,9.8,z),v(x,10.8,z+1.2),.045,"#c69a51",g);}
    for(const z of [-7.8,5.9])box(0,10.1,z,4,.2,.2,"#d9b367",g);
    const trolley=box(0,10.13,3,3.6,.5,1.4,"#dee2d2",g);box(-2.35,8.9,3,.9,1.25,1.15,"#d8dccd",g);box(-2.81,9.05,3,.04,.7,.82,"#1b4e65",g);
    const spreader=new THREE.Group();g.add(spreader);box(0,0,0,4,.17,1.7,"#e5ba52",spreader);
    for(const x of [-1.7,1.7])for(const z of [-.64,.64])box(x,-.16,z,.15,.26,.13,"#2c4048",spreader);
    const ropes=Array.from({length:4},()=>mesh(new THREE.CylinderGeometry(.021,.021,1,6),"#aababb",g));
    const hoist=(x:number,z:number,y:number)=>{trolley.position.x=x;trolley.position.z=z;spreader.position.set(x,y,z);ropes.forEach((r,i)=>{const top=9.86;r.scale.y=Math.max(.01,top-y);r.position.set(x+(i<2?-1.6:1.6),(top+y)/2,z+(i%2?-.56:.56));});};
    return {hoist,g};
  };
  if(["load","unload","heavy","relay"].includes(kind)){
    yard();const ship=add(vessel(),0,.33,-5);const vehicle=add(truck(),0,.5,3.2);const lift=crane();
    const cargo=kind==="heavy"?new THREE.Group():container("#208fa7");
    if(kind==="heavy"){const drum=cylinder(0,.9,0,.8,3.5,"#b1c2c2",cargo);drum.rotation.z=Math.PI/2;for(const x of [-1.2,1.2]){box(x,.25,0,.3,.45,1.9,"#c5a16b",cargo);for(const z of [-.6,.6])beam(v(x,1.1,z),v(x,1.8,z*.7),.035,"#d4c5a0",cargo);}}
    root.add(cargo);
    updates.push(p=>{
      const q=kind==="unload"?1-p:p;
      const travel=smooth(q,.36,.67);const z=3.2-8.2*travel;
      const y=1.45+4.5*smooth(q,.14,.34)-4.5*smooth(q,.7,.88);
      cargo.position.set(0,y,z);
      const release=1.1*(1-smooth(q,0,.1))+1.7*smooth(q,.91,1);
      lift.hoist(0,z,y+(kind==="heavy"?1.98:1.78)+release);
      vehicle.position.x=kind==="relay"?-9*(1-smooth(p,0,.12)):0;
      if(kind==="relay"&&p<.12)cargo.position.x=vehicle.position.x;
      ship.rotation.y=0;
    });
  }else if(["gate","transport"].includes(kind)){
    yard();add(vessel(),1,.2,-5);const g=add(truck(),-10,.5,3.8);const cargo=container();cargo.position.set(0,.95,0);g.add(cargo);
    if(kind==="gate"){
      for(const z of [1.9,5.6])box(0,2.3,z,.26,3.7,.3,"#aec0bc");box(0,4.23,3.7,1.5,.3,4.6,"#b9c9c4");box(1.2,1.3,6.5,1.6,1.6,1.4,"#c4c9b7");box(.33,1.65,6.5,.05,.62,1.08,"#406271");
      const barrier=new THREE.Group();add(barrier,1,.95,2);box(0,0,1.7,.15,.17,3.4,"#e1b55e",barrier);
      updates.push(p=>{barrier.rotation.x=-Math.PI/2*smooth(p,.2,.36)+Math.PI/2*smooth(p,.77,.93);g.position.x=-10+6.2*smooth(p,0,.2)+14.8*smooth(p,.39,.85);});
    }else{const c=crane();c.hoist(0,-4,7);c.g.position.x=-9;updates.push(p=>{g.position.x=-9+18*smooth(p,.08,.91);});}
  }else if(kind==="rehandle"){
    water.visible=false;quay.scale.z=2.4;yard();const c=crane();c.g.position.z=0;
    const target=add(container(),0,.5,3.2);const upper=add(container("#b6834e"),0,2.1,3.2);
    updates.push(p=>{
      const z=3.2-7*smooth(p,.22,.4);const y=2.1+3.4*smooth(p,.04,.19)-5*smooth(p,.43,.57);
      upper.position.set(0,y,z);target.position.y=.5+4.1*smooth(p,.8,.97);
      const back=smooth(p,.65,.74);const hz=z+(3.2-z)*back;const hy=y+1.8+3.4*smooth(p,.58,.64)-3.4*smooth(p,.75,.79)+4.1*smooth(p,.8,.97);
      c.hoist(0,hz,hy);
    });
  }else if(kind==="lock"){
    root.children.forEach(child=>{child.visible=false;});
    box(0,-1.1,0,32,1,8,"#667475");box(0,1.3,-3.4,32,4.3,.8,"#8e9992");box(0,3.48,-3.4,32,.18,1.1,"#c4c8b6");
    // The near wall is cut away so the hull and changing water level remain visible.
    box(0,-.4,3.4,32,.45,.8,"#8e9992");
    box(-11,.3625,0,10,1.925,6,"#287c90");const chamber=box(0,.3625,0,12,1.925,6,"#398da0");box(11,-.3625,0,10,.475,6,"#287c90");
    const ship=add(vessel(),-11,1.3,0);ship.scale.setScalar(.38);
    const gates=[-6,6].map(x=>{const g=new THREE.Group();add(g,x,1.1,-3);box(0,0,3,.3,4,6,"#566967",g);for(let y=-1;y<=1;y++)box(.2,y,3,.15,.1,5.8,"#9aab9e",g);return g;});
    updates.push(p=>{
      const drop=smooth(p,.4,.68);chamber.scale.y=(1.925-1.45*drop)/1.925;chamber.position.y=.3625-.725*drop;ship.position.set(-11+11*smooth(p,0,.2)+11*smooth(p,.84,1),1.3-1.45*drop,0);
      gates[0]!.rotation.y=-Math.PI/2*(1-smooth(p,.23,.33));gates[1]!.rotation.y=-Math.PI/2*smooth(p,.73,.83);
    });
  }else if(["bulk","coal","grain"].includes(kind)){
    if(kind!=="coal")add(vessel("bulk"),0,.2,-5);
    if(kind!=="grain")for(const x of [-9,-4]){const pile=mesh(new THREE.ConeGeometry(3,2.9,32),"#6b6460");pile.position.set(x,1.95,5);pile.scale.z=.65;}
    if(kind==="grain")for(const x of [-9,-5.8,-2.6]){cylinder(x,3.45,7,1.35,5.8,"#adbdb6");const roof=mesh(new THREE.ConeGeometry(1.45,.9,24),"#d1d4bc");roof.position.set(x,6.8,7);}
    const belt=kind==="coal"?[v(-8,1.4,4),v(-3,4.1,4),v(3,4.1,4),v(12,4.1,4)]:kind==="grain"?[v(-5.8,6.5,7),v(-3,6.5,7),v(3,6.5,0),v(3,6.7,-4.7)]:[v(-8,1.4,4),v(-3,4.1,4),v(3,4.1,4),v(3,6.7,-4.7)];
    for(let i=0;i<belt.length-1;i++){
      const a=belt[i]!,b=belt[i+1]!,dir=b.clone().sub(a).normalize();
      const deck=mesh(new THREE.BoxGeometry(.8,.17,a.distanceTo(b)),"#34464b");deck.position.copy(a).add(b).multiplyScalar(.5);deck.quaternion.setFromUnitVectors(v(0,0,1),dir);
      const side=v(-dir.z,0,dir.x).normalize().multiplyScalar(.47);
      for(const sign of [-1,1])beam(a.clone().addScaledVector(side,sign),b.clone().addScaledVector(side,sign),.065,"#d3b474");
      if(kind==="grain"){const cover=beam(a,b,.43,"#a4c7c2");cover.material=cover.material.clone();cover.material.transparent=true;cover.material.opacity=.27;cover.material.depthWrite=false;cover.castShadow=false;}
    }
    for(const x of [-3,3]){beam(v(x,.5,4),v(x,4,4),.16,"#9caaa0");beam(v(x,.5,4),v(x,6,-3),.09,"#aaa989");}
    const destination=kind==="coal"?v(12,1.55,4):v(3,1.55,-4.7);
    beam(belt.at(-1)!,destination.clone().add(v(0,2.15,0)),.3,"#d1bd8d");
    const path=new THREE.CurvePath<THREE.Vector3>();for(let i=0;i<belt.length-1;i++)path.add(new THREE.LineCurve3(belt[i]!,belt[i+1]!));path.add(new THREE.LineCurve3(belt.at(-1)!,destination));
    const pieces=Array.from({length:65},(_,i)=>mesh(new THREE.IcosahedronGeometry(.1+(i%3)*.035,0),kind==="grain"?"#e0c682":"#b29a76"));
    const cargo=mesh(new THREE.ConeGeometry(1.4,1,24),kind==="grain"?"#c7ad73":"#796f60");cargo.position.copy(destination);cargo.scale.set(1,.05,1);
    updates.push(p=>{pieces.forEach((m,i)=>{const t=(i/65+p*3)%1;m.position.copy(path.getPoint(t)).add(v(Math.sin(i*31)*.16,.26,Math.cos(i*7)*.13));m.visible=p>.06&&p<.95;});cargo.scale.y=.05+.8*smooth(p,.08,.9);});
  }else if(["oil","lng"].includes(kind)){
    add(vessel(kind==="lng"?"lng":"oil"),0,.2,-5);
    for(const x of [-7,-1,5]){cylinder(x,2.3,6.4,2.2,3.6,"#c3cec3");cylinder(x,4.14,6.4,2.22,.16,"#e0dfc6");for(let y=1;y<4;y+=.6){const ring=mesh(new THREE.TorusGeometry(2.21,.024,4,40),"#809a96");ring.rotation.x=Math.PI/2;ring.position.set(x,y,6.4);}}
    const nodes=[v(2,1.8,-4),v(2,4,-2.5),v(3,4,-.5),v(3,1.2,1),v(7,1.2,1),v(7,1.2,6),v(5,1.2,6)];
    const path=new THREE.CurvePath<THREE.Vector3>();for(let i=0;i<nodes.length-1;i++){beam(nodes[i]!,nodes[i+1]!,.12,"#d4b572");path.add(new THREE.LineCurve3(nodes[i]!,nodes[i+1]!));}
    for(const n of nodes.slice(1,4)){const joint=mesh(new THREE.SphereGeometry(.2,12,8),"#e1c482");joint.position.copy(n);}
    const flowMaterial=new THREE.MeshBasicMaterial({color:kind==="lng"?"#8be0e2":"#ffe4a2",depthTest:false,transparent:true,opacity:.95});
    const dots=Array.from({length:16},()=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),flowMaterial);dot.renderOrder=3;root.add(dot);return dot;});
    const gauge=box(7.24,1.2,6.4,.06,.1,.4,"#69d1ce");
    updates.push(p=>{dots.forEach((dot,i)=>{dot.position.copy(path.getPoint((i/16+p*2)%1));dot.visible=p>.12&&p<.95;});const fill=2.8*smooth(p,.12,.94);gauge.scale.y=Math.max(.1,fill/.1);gauge.position.y=.7+fill/2;});
  }else if(kind==="roro"){
    add(vessel("roro"),0,.2,-5);const rampA=v(4.8,.6,3.4),rampB=v(4.8,1.5,-3.35);
    const ramp=box(4.8,1.05,.02,2.6,.16,6.82,"#a29c81");ramp.rotation.x=.133;
    for(const x of [3.45,6.15])beam(v(x,.85,3.4),v(x,1.77,-3.35),.045,"#dfcba1");
    const car=()=>{const g=new THREE.Group();box(0,.32,0,.95,.45,1.9,"#d0d9ce",g);box(0,.68,-.12,.83,.4,1,"#5f8995",g);for(const x of [-.5,.5])for(const z of [-.6,.6]){const wheel=cylinder(x,.23,z,.23,.16,"#142a35",g);wheel.rotation.z=Math.PI/2;}return g;};
    for(let i=0;i<7;i++){const g=add(car(),0,0,0);updates.push(p=>{
      const distance=p*42-i*3.1;
      const pos=distance<13.8?v(-9+distance,.55,3.4):distance<20.6?rampA.clone().lerp(rampB,(distance-13.8)/6.8):v(4.8,1.5,-3.35-(distance-20.6));
      g.position.copy(pos);g.rotation.y=-Math.PI/2*(1-smooth(distance,12.8,13.8));g.rotation.x=distance>13.8&&distance<20.6?-.133:0;g.visible=distance<22.1&&distance>-6;
    });}
  }
  const update=(progress:number)=>{
    const p=THREE.MathUtils.clamp(progress,0,1);updates.forEach(fn=>fn(p));
    ripples.forEach((r,i)=>{r.position.x=Math.sin(p*8+i)*.24;r.visible=kind!=="lock"&&kind!=="rehandle";});
    camera.position.set(20+Math.sin(p*Math.PI)*1.4,18,24);camera.lookAt(0,3.5,0);camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    canvas.dataset.progress=p.toFixed(4);
  };
  const dispose=()=>{const geometries=new Set<THREE.BufferGeometry>();const allMaterials=new Set<THREE.Material>();scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Line){geometries.add(obj.geometry);const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>allMaterials.add(m));}});geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());renderer.dispose();};
  return {update,dispose};
}
