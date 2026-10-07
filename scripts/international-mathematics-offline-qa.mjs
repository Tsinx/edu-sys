import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const root=process.cwd(),output=path.resolve(process.env.IM_OUTPUT_ROOT||'output/international-mathematics/v2'),offline=path.join(output,'offline'),origin=process.env.IM_EXPORT_ORIGIN||'http://127.0.0.1:5192';
const manifest=JSON.parse(fs.readFileSync(path.join(offline,'manifest-sha256.json'))),metadata=JSON.parse(fs.readFileSync(path.join(output,'course-metadata.json'))),definitions=JSON.parse(fs.readFileSync(path.join(output,'course-definitions.json'))).lessons;
for(const f of manifest.files){const bytes=fs.readFileSync(path.join(offline,f.file));assert.equal(bytes.length,f.bytes,f.file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.file);}
const {chromium}=await import(pathToFileURL('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'}),page=await browser.newPage({viewport:{width:1600,height:1100}}),external=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
const go=async index=>{await page.evaluate(i=>window.imViewer.go(i),index);await page.waitForFunction(i=>window.imViewer.index===i,index);};
try{
 await page.goto(origin);await page.waitForSelector('.im-slide');
 await page.getByRole('button',{name:'Play introduction',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').currentTime>2);
 await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await page.locator('video').evaluate(v=>({paused:v.paused,time:v.currentTime}));
 await page.getByLabel('Video position').fill('45000');await page.waitForFunction(()=>Math.abs(document.querySelector('video').currentTime-45)<.5);
 await page.getByRole('button',{name:'Replay',exact:true}).click();await page.waitForFunction(()=>document.querySelector('video').currentTime<2&&!document.querySelector('video').paused);
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 const quiz=definitions[0].slides.findIndex(s=>s.pedagogy?.role==='checkpoint');await go(quiz+1);
 assert.equal(await page.locator('.im-answer').count(),0);await page.getByRole('button',{name:'Reveal reasoning',exact:true}).click();await page.waitForSelector('.im-answer');
 await page.getByRole('button',{name:'Hide reasoning',exact:true}).click();assert.equal(await page.locator('.im-answer').count(),0);
 let hourJumps=0,lessonBoundaries=0;
 for(const lesson of metadata.lessons){
  await page.getByLabel('Lesson',{exact:true}).selectOption(String(lesson.number));assert.equal(await page.evaluate(()=>window.imViewer.index),lesson.slideStart);
  for(const hour of lesson.hourRanges){await page.getByLabel('Teaching hour',{exact:true}).selectOption(String(hour.number));await page.waitForFunction(i=>window.imViewer.index===i,hour.slideStart);hourJumps++;}
  await page.getByLabel('Optional challenges').uncheck();await go(lesson.slideStart+lesson.coreSlideTotal-1);
  await page.getByRole('button',{name:'Next',exact:true}).click();const target=metadata.lessons[lesson.number]?.slideStart??lesson.slideStart+lesson.coreSlideTotal-1;
  assert.equal(await page.evaluate(()=>window.imViewer.index),target);lessonBoundaries++;
  await page.getByLabel('Optional challenges').check();await go(lesson.slideEnd);assert.match(await page.locator('.im-slide').innerText(),/optional/i);
 }
 const sliderLocal=definitions[13].slides.findIndex(s=>s.interaction?.key==='n');await go(metadata.lessons[13].slideStart+sliderLocal);
 const slider=page.getByRole('slider').first();assert.equal(await slider.count(),1);await slider.fill('16');assert.equal(await slider.inputValue(),'16');
 const range=await fetch(origin+'/course-assets/international-mathematics/film/lesson-01-intro.mp4',{headers:{Range:'bytes=100000-100999'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,1000);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'qa/offline-audit.json'),JSON.stringify({result:'PASS',hashesVerified:manifest.files.length,externalNetworkBlocked:true,externalRequests:external,paused,seek:true,replay:true,revealAndHide:true,hourJumps,lessonBoundaries,optionalSkipping:true,mathematicsSlider:true,mp4Range:true,loginOrApiRequired:false,errors},null,2));console.log('Offline, navigation and hashes PASS');
}finally{await browser.close();}
