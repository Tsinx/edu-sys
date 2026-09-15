import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});
const output='output/port-lock-qa';await fs.mkdir(output,{recursive:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`${process.env.PORT_LBL_BASE_URL||'http://127.0.0.1:5173'}/port-lbl-preview.html?page=17`);
  await page.locator('.lbl-process-scene[data-render-state="ready"]').waitFor();
  await page.getByRole('button',{name:'全景',exact:true}).click();
  const geometry=await page.evaluate(async()=>{
    // Inspect the actual animated model, not a separately reimplemented trajectory.
    const source=await (await fetch('/src/features/port-lbl/port-process-scene.ts')).text();
    const threeUrl=source.match(/import \* as THREE from "([^"]+)"/)[1];
    const THREE=await import(threeUrl);
    let scene;
    // Replace only the GPU draw so dense collision sampling remains fast; retain
    // the production geometry and animation. Normal UI renders are checked below.
    if(!/renderer\.render\(scene,\s*camera\);/.test(source))throw new Error('Missing scene draw seam');
    window.__inspectLockScene=value=>{scene=value;value.updateMatrixWorld(true);};
    const sampledSource=source.replace(/renderer\.render\(scene,\s*camera\);/,'window.__inspectLockScene(scene);')
      .replace(/from "(\/[^"\n]+)"/g,(_,url)=>`from "${location.origin}${url}"`);
    const moduleUrl=URL.createObjectURL(new Blob([sampledSource],{type:'text/javascript'}));
    const {createPortProcessScene}=await import(moduleUrl);
    let engine;
    const collisions=[],oldDirectionCollisions=[];
    // Separating-axis test for the vessel footprint and each oriented gate mesh.
    const overlaps=(a,b)=>[a,b].every(poly=>poly.every((point,i)=>{
      const next=poly[(i+1)%poly.length],axis={x:next.z-point.z,z:point.x-next.x};
      const pa=a.map(v=>v.x*axis.x+v.z*axis.z),pb=b.map(v=>v.x*axis.x+v.z*axis.z);
      return Math.max(...pa)>=Math.min(...pb)&&Math.max(...pb)>=Math.min(...pa);
    }));
    const intersects=(ship,gate)=>{
      const bounds=new THREE.Box3().setFromObject(ship);
      const a=[{x:bounds.min.x,z:bounds.min.z},{x:bounds.max.x,z:bounds.min.z},{x:bounds.max.x,z:bounds.max.z},{x:bounds.min.x,z:bounds.max.z}];
      return gate.children.some(mesh=>{
        mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
        const points=[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]].map(([x,z])=>new THREE.Vector3(x,0,z).applyMatrix4(mesh.matrixWorld));
        return overlaps(a,points);
      });
    };
    try{
      engine=createPortProcessScene(document.createElement('canvas'),'lock',1460,520);
      let waitingX,openAngle;
      for(let i=0;i<=1000;i++){
        const p=i/1000;engine.update(p);
        const ship=scene.getObjectByName('lock-vessel'),up=scene.getObjectByName('lock-upstream-gate'),down=scene.getObjectByName('lock-downstream-gate');
        if(intersects(ship,up)||intersects(ship,down))collisions.push(p);
        if(i===830){waitingX=ship.position.x;openAngle=down.rotation.y;}
        // Mutation control proves this check catches the originally reported sweep.
        if(p>=.73&&p<=.83){const angle=down.rotation.y;down.rotation.y=-angle;scene.updateMatrixWorld(true);if(intersects(ship,down))oldDirectionCollisions.push(p);down.rotation.y=angle;}
      }
      return {samples:1001,collisions,oldDirectionCollisions,waitingX,openAngle};
    }finally{engine?.dispose();delete window.__inspectLockScene;URL.revokeObjectURL(moduleUrl);}
  });
  assert.deepEqual(geometry.collisions,[],'A gate sweeps through the vessel');
  assert.ok(geometry.oldDirectionCollisions.length>0,'Regression check must detect the original direction');
  assert.equal(geometry.waitingX,0,'Vessel must wait until the downstream gate is open');
  assert.equal(geometry.openAngle,Math.PI/2);
  for(const value of [0,230,330,680,730,755,780,805,830,840,880,920,1000]){
    await page.getByLabel('动画进度').evaluate((input,value)=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
      input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    },value);
    await page.waitForFunction(value=>Number(document.querySelector('.lbl-process-scene canvas').dataset.progress)===value/1000,value);
    await page.locator('.lbl-slide').screenshot({path:`${output}/lock-${value}.png`});
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${output}/browser-check.json`,JSON.stringify({geometry,frames:13,errors},null,2));
  console.log(JSON.stringify({samples:geometry.samples,collisions:geometry.collisions.length,oldDirectionCollisions:geometry.oldDirectionCollisions.length,frames:13,errors}));
}finally{await browser.close();}
