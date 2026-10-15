import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js'),{chromium}=require('playwright'),sharp=require('sharp');
const lesson=process.argv.includes('--lesson12')?12:11;
const documentary=process.argv.includes('--documentary');
const base=process.env.PORT_CLASS_LAB_URL||'http://127.0.0.1:5173',out=path.resolve(documentary?`output/port-documentary-recut/l${lesson}/browser`:`output/port-${lesson===12?'twelve':'eleven'}-media/browser`);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});
const errors=[],consoleErrors=[],checks=[],issues=[];const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});};const pass=s=>{checks.push(s);console.log('PASS '+s);};
const page=await context.newPage();watch(page);page.setDefaultTimeout(30000);
const filmPath=`/course-assets/port-management/l${lesson}-media/${documentary?'documentary-v2/':''}`;
const videoState=p=>p.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,muted:v.muted,volume:v.volume,width:v.videoWidth,height:v.videoHeight,ready:v.readyState,duration:v.duration,ended:v.ended}));
try{
 await page.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=1&channel=media-audit-${lesson}`);
 await page.getByRole('button',{name:'播放开场片',exact:true}).waitFor();
 assert.equal((await videoState(page)).paused,true);
 await page.getByRole('button',{name:'播放开场片',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').currentTime>1.5);
 const first=await videoState(page);assert.equal(first.paused,false);assert.equal(first.muted,false);assert.equal(first.width,1920);assert.equal(first.height,1200);assert.equal(first.duration,180);
 await page.locator('video').evaluate(v=>{window.__verifiedFilmElement=v;});
 pass('teacher gesture starts the real 180-second MP4 with Chinese soundtrack and 1920×1200 picture');
 const projection=await context.newPage();watch(projection);await projection.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=1&projection=1&channel=media-audit-${lesson}`);
 await projection.waitForFunction(()=>document.querySelector('video').currentTime>1&&!document.querySelector('video').paused);
 assert.equal((await videoState(projection)).muted,true);assert.ok(Math.abs((await videoState(page)).time-(await videoState(projection)).time)<1.2);
 assert.equal(await projection.getByRole('button',{name:'暂停短片',exact:true}).count(),0);
 await page.getByRole('button',{name:'网页全屏',exact:true}).click();await page.waitForTimeout(600);
 assert.ok(await page.locator('video').evaluate(v=>v===window.__verifiedFilmElement&&!v.paused));assert.equal(await page.locator('[aria-label="课件工具栏"]').count(),1);
 await page.getByRole('button',{name:'退出网页全屏',exact:true}).click();
 await page.getByRole('button',{name:'屏幕全屏',exact:true}).click();await page.waitForTimeout(400);
 const native=await page.evaluate(()=>!!document.fullscreenElement);
 if(native){assert.ok(await page.locator('video').evaluate(v=>v===window.__verifiedFilmElement&&!v.paused));await page.getByRole('button',{name:'退出屏幕全屏',exact:true}).click();}
 else assert.ok(await page.getByRole('status').filter({hasText:'浏览器未允许屏幕全屏'}).count());
 await page.getByRole('button',{name:'暂停短片',exact:true}).click();await projection.waitForFunction(()=>document.querySelector('video').paused);
 const stopped=(await videoState(page)).time;await page.waitForTimeout(500);assert.ok(Math.abs((await videoState(page)).time-stopped)<.1);
 pass('pause synchronizes to silent read-only projection; page/screen fullscreen keep the same playing video element');
 await page.getByRole('button',{name:'影片控制',exact:true}).click();
 const seek=page.getByLabel('开场片进度',{exact:true});await seek.focus();await seek.press('Home');await seek.press('ArrowRight');
 await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-1)<.15);
 await seek.press('End');await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-180)<.15);
 await page.getByRole('button',{name:'重播开场片',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.5&&document.querySelector('video').currentTime<4);
 await page.getByRole('button',{name:'暂停短片',exact:true}).click();
 await page.getByRole('button',{name:'影片控制',exact:true}).click();
 await seek.focus();await seek.press('End');await seek.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('video').currentTime>178.8&&document.querySelector('video').currentTime<179.2);
 await page.getByRole('button',{name:'播放开场片',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').ended);
 assert.equal(await page.getByRole('button',{name:'重播开场片',exact:true}).count(),1);
 pass('toolbar seek, restart and natural completion retain correct clock and replay controls');
 await page.reload();await page.getByRole('button',{name:'重播开场片',exact:true}).waitFor();assert.equal((await videoState(page)).paused,true);
 await page.getByRole('button',{name:'影片控制',exact:true}).click();await page.getByRole('button',{name:'回到封面',exact:true}).click();
 assert.ok(!(await page.locator('.ps-film-stage').getAttribute('class')).includes('--active'));
 await page.getByRole('button',{name:'影片控制',exact:true}).click();
 await page.locator('video').evaluate(v=>{window.__verifiedFilmElement=v;});
 await page.getByRole('button',{name:'播放开场片',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.2&&!document.querySelector('video').paused);
 await page.getByLabel('当前页码',{exact:true}).fill('2');await page.waitForFunction(lesson=>document.querySelector('h1')?.textContent?.includes(lesson===12?'从许可':'原始说明'),lesson);
 assert.equal(await page.getByRole('button',{name:'影片控制',exact:true}).count(),0);assert.equal(await page.locator('video').count(),0);
 assert.equal(await page.evaluate(()=>window.__verifiedFilmElement.paused),true);
 pass('reload restores paused; leaving the opening page closes its controls and stops its media');
 await projection.close();
 const independent=await context.newPage();watch(independent);await independent.goto(base+filmPath+'index.html');
 await independent.locator('video').evaluate(v=>v.play());await independent.waitForFunction(()=>document.querySelector('video').currentTime>.5);await independent.locator('video').evaluate(v=>v.pause());
 if(documentary){
  assert.ok((await independent.locator('video').getAttribute('src')).endsWith('opening.mp4'));
  await independent.getByText('章节定位与完整旁白',{exact:true}).click();await independent.getByRole('button',{name:'02:48 · 带入课堂的问题',exact:true}).click();await independent.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-168)<.2);
  assert.ok((await independent.locator('#footage a').count())>=8);
  await independent.locator('video').evaluate(v=>{v.currentTime=0;v.playbackRate=4;return v.play();});
  for(let attempt=0;attempt<4;attempt++){try{await independent.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:25000});break;}catch(error){const playback=await videoState(independent);console.log('Continuous playback checkpoint: '+JSON.stringify(playback));if(attempt===3)throw error;}}
  assert.equal(await independent.locator('video').evaluate(v=>v.error),null);pass('new documentary chapters and credits work; continuous 4× playback reaches the end without media errors');
  const stable=await context.newPage();watch(stable);await stable.goto(base+`/course-assets/port-management/l${lesson}-media/index.html`);await stable.waitForURL('**/documentary-v2/index.html');await stable.close();
 }
 const downloaded=independent.waitForEvent('download');await independent.getByRole('link',{name:'下载MP4',exact:true}).click();await(await downloaded).saveAs(path.join(out,'downloaded-opening.mp4'));
 assert.ok((await fs.stat(path.join(out,'downloaded-opening.mp4'))).size>1e6);
 await independent.setViewportSize({width:390,height:844});assert.ok(await independent.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await independent.screenshot({path:path.join(out,'player-390.png'),fullPage:true});await independent.close();
 pass('independent player plays the exported MP4, downloads it, and fits a 390px screen');
 const student=await context.newPage();watch(student);await student.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=1&student=1`);
 assert.equal(await student.getByRole('button',{name:'播放开场片',exact:true}).count(),0);assert.equal(await student.locator('[aria-label="教师讲稿"]').count(),0);await student.close();
 const tiles=[];
 for(const width of [1600,390]){
  await page.setViewportSize({width,height:1100});
  for(let n=1;n<=32;n++){
   await page.goto(`${base}/port-expansion-preview.html?lesson=${lesson}&page=${n}&student=1`);await page.locator('.ps-advanced').waitFor();await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>[...document.querySelectorAll('.ps-advanced img')].every(i=>i.complete&&i.naturalWidth>0));
   const problems=await page.evaluate(()=>{const slide=document.querySelector('.ps-advanced'),box=slide.getBoundingClientRect(),bad=[];
    if(document.documentElement.scrollWidth>innerWidth+1)bad.push('document width');
    const walker=document.createTreeWalker(slide,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width>0&&(r.left<box.left-2||r.right>box.right+2||r.top<box.top-2||r.bottom>box.bottom+2))bad.push('text outside: '+node.textContent.slice(0,50));}
    for(const e of slide.querySelectorAll('.ps-records,.ps-illustrated-data,.ps-scene-chain,.ps-scene-facts'))if(e.scrollHeight>e.clientHeight+3||e.scrollWidth>e.clientWidth+3)bad.push('local overflow: '+e.className);
    const body=slide.querySelector('.ps-body'),obs=slide.querySelector('.ps-observations');if(body&&obs){const bottom=Math.max(...[...body.querySelectorAll('td,figcaption,.ps-scene-facts p,.ps-scene-chain span')].map(e=>e.getBoundingClientRect().bottom));if(bottom>obs.getBoundingClientRect().top+1)bad.push('body overlaps observations');}
    if(/teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生/.test(slide.textContent))bad.push('teacher metadata');if(document.querySelector('[aria-label="教师讲稿"]'))bad.push('guide on student route');
    return bad;});
   if(problems.length)issues.push({page:n,width,problems});
   if(width===1600){const file=path.join(out,`slide-${String(n).padStart(2,'0')}.png`);await page.locator('.ps-advanced').screenshot({path:file});tiles.push({input:await sharp(file).resize(400,250).toBuffer(),left:(n-1)%4*400,top:Math.floor((n-1)/4)*250});}
  }
 }
 await sharp({create:{width:1600,height:2000,channels:3,background:'#f4f0df'}}).composite(tiles).png().toFile(path.join(out,'slides-contact.png'));
 assert.deepEqual(issues,[]);pass('all 32 illustrated lecture pages pass desktop and 390px image, text, fixed-canvas and student-boundary checks');
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
 await fs.writeFile(path.join(out,'audit.json'),JSON.stringify({base,checks,errors,consoleErrors,issues},null,2));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),checks,errors,consoleErrors,issues},null,2));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
finally{await context.close();await browser.close();}
