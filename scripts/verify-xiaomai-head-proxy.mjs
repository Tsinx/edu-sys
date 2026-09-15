import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const origin=process.env.EDU_WEB_ORIGIN||'http://127.0.0.1:5173';
const out=resolve(process.env.EDU_QA_OUTPUT||'output/live2d-qa/head-delivery');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
  let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  page.on('pageerror',e=>errors.push(e.message));
  if(process.env.EDU_P0_PRODUCTION==='1'){
    const assets=await readdir(resolve('apps/teacher-web/dist/assets'));
    const asset=p=>{const name=assets.find(n=>p.test(n));assert.ok(name);return '/assets/'+name;};
    const styles=assets.filter(n=>/\.css$/.test(n)&&/live2d|Live2D|Xiaomai/.test(n));
    const html=`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(n=>`<link rel="stylesheet" href="/assets/${n}">`).join('')}</head><body style="margin:0"><div id="root"></div><script type="module">import {t as React} from '${asset(/^react-.*\.js$/)}';import {t as Client} from '${asset(/^client-.*\.js$/)}';import {XiaomaiAnimationPreview} from '${asset(/^XiaomaiAnimationPreview-.*\.js$/)}';Client().createRoot(document.getElementById('root')).render(React().createElement(XiaomaiAnimationPreview));</script></body></html>`;
    await page.route(`${origin}/avatar/xiaomai/preview`,route=>route.fulfill({contentType:'text/html',body:html}));
  }
  await page.goto(origin+'/avatar/xiaomai/preview');
  await page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:60000});
  const avatar=page.locator('.live2d-avatar'),shots=[];
  await page.getByRole('button',{name:'回正',exact:true}).click();await page.waitForTimeout(3000);
  for(const version of ['p0','volume']){
    await page.getByLabel('转头版本').selectOption(version);await page.waitForTimeout(500);
    const name=`neutral-${version}`;await avatar.screenshot({path:resolve(out,`${name}.png`)});shots.push({name,label:name});
    if(process.env.EDU_QA_QUICK==='1')continue;
    for(const [action,label] of [['向左转头','left'],['向右转头','right']]){
      await page.getByRole('button',{name:action,exact:true}).click();await page.waitForTimeout(1600);
      const name=`${label}-${version}`;await avatar.screenshot({path:resolve(out,`${name}.png`)});shots.push({name,label:name});
    }
    await page.getByRole('button',{name:'回正',exact:true}).click();await page.waitForTimeout(2400);
  }
  // Flat source reference at the identical placement and browser scaling.
  await page.route('**/qa-original.png',route=>route.fulfill({contentType:'image/png',path:resolve('artifacts/avatar/xiaomai/cubism-trial-v1/import/import-composite.png')}));
  await page.evaluate(async()=>{
    const root=document.querySelector('.live2d-avatar__canvas'),eyes=root.querySelector('[data-xiaomai-eyes]');
    const image=new Image();image.src='/qa-original.png';await image.decode();image.id='qa-original';
    image.style.cssText=`position:absolute;left:0;top:0;width:1024px;height:760px;max-width:none;transform-origin:0 0;transform:${eyes.style.transform}`;
    for(const child of root.children)child.style.opacity='0';root.append(image);
  });
  await avatar.screenshot({path:resolve(out,'source-reference.png')});
  await page.evaluate(()=>{const im=document.getElementById('qa-original'),root=im.parentElement;im.remove();for(const child of root.children)child.style.opacity='';});
  if(process.env.EDU_QA_QUICK!=='1'){
    const extras=['身体轻转左','身体轻转右','稍向前倾','重心移动','微笑鼓励','思考疑问','专注倾听','轻微惊讶','认真强调','短促微笑','柔和眯眼','待机变化','欢迎开课','解释概念','提出问题','等待回答','肯定答案','结束讲解'];
    for(let i=0;i<extras.length;i++){
      await page.getByRole('button',{name:extras[i],exact:true}).click();await page.waitForTimeout(1250);
      const name=`expression-${i}`;await avatar.screenshot({path:resolve(out,`${name}.png`)});shots.push({name,label:extras[i]});
    }
    await page.getByRole('button',{name:'转头并眨眼',exact:true}).click();
    await page.getByLabel('口型示范').selectOption('D');
    for(let i=0;i<18;i++){
      await page.waitForTimeout(200);const name=`combo-${i}`;
      await avatar.screenshot({path:resolve(out,`${name}.png`)});shots.push({name,label:name});
    }
    await page.getByLabel('口型示范').selectOption('off');
    for(const turn of ['向左转头','向右转头'])for(const eye of ['0.5','0']){
      await page.getByRole('button',{name:turn,exact:true}).click();await page.getByLabel('叠加眼睑').selectOption(eye);await page.waitForTimeout(1500);
      const name=`lid-${turn==='向左转头'?'left':'right'}-${eye}`;await avatar.screenshot({path:resolve(out,`${name}.png`)});shots.push({name,label:name});
    }
    await page.getByLabel('叠加眼睑').selectOption('auto');
  }
  const compare=async(files)=>page.evaluate(async([a,b])=>{
    const load=async s=>{const im=new Image();im.src=s;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const x=await load(a),y=await load(b);let total=0,max=0,n=0;
    for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);total+=d;max=Math.max(max,d);if(d)n++;}
    return {meanChannelError:total/x.length,maxChannelError:max,differentChannels:n};
  },await Promise.all(files.map(async file=>'data:image/png;base64,'+(await readFile(resolve(out,`${file}.png`))).toString('base64'))));
  const neutralDifference=await compare(['neutral-p0','neutral-volume']);
  const sourceDifference=await compare(['source-reference','neutral-volume']);
  assert.ok(sourceDifference.meanChannelError<.3,'frontal painting stays within browser resampling tolerance');
  await page.getByRole('button',{name:'连续左右转头',exact:true}).click();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const before=await cdp.send('Performance.getMetrics');
  const timing=await page.evaluate(async()=>{
    const t=[];await new Promise(resolve=>{const frame=x=>{t.push(x);if(t.length===181)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
    const dt=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b);return {fps:180000/(t.at(-1)-t[0]),p95FrameMs:dt[Math.floor(dt.length*.95)]};
  });
  const after=await cdp.send('Performance.getMetrics');const metric=(r,n)=>r.metrics.find(m=>m.name===n).value;
  timing.scriptMsPerFrame=(metric(after,'ScriptDuration')-metric(before,'ScriptDuration'))*1000/180;
  await page.close();
  const review=await browser.newPage({viewport:{width:1440,height:1200}});
  await review.setContent('<body style="margin:0;background:#e8f0ed;font:16px sans-serif;display:grid;grid-template-columns:repeat(3,480px)"></body>');
  for(const shot of shots){
    const data=(await readFile(resolve(out,`${shot.name}.png`))).toString('base64');
    await review.evaluate(async({data,label})=>{const f=document.createElement('figure');f.style.cssText='margin:0;padding:5px';const cap=document.createElement('figcaption');cap.textContent=label;f.append(cap);const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=470;c.height=450;c.getContext('2d').drawImage(im,100,70,320,300,0,0,470,450);f.append(c);document.body.append(f);},{data,label:shot.label});
  }
  await review.screenshot({path:resolve(out,'review.png'),fullPage:true});
  for(let i=0;i<shots.length;i+=6){
    await review.evaluate(({start,end})=>{[...document.querySelectorAll('figure')].forEach((f,i)=>f.style.display=i>=start&&i<end?'':'none');},{start:i,end:i+6});
    await review.screenshot({path:resolve(out,`review-${Math.floor(i/6)}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  assert.equal(navigations,1,'no reload or hot update may invalidate this visual audit');
  await writeFile(resolve(out,'report.json'),JSON.stringify({neutralDifference,sourceDifference,timing,shots,errors},null,2));
  console.log(JSON.stringify({neutralDifference,sourceDifference,timing,shots:shots.length,errors}));
}finally{await browser.close();}
