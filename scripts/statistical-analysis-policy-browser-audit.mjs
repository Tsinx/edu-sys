import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
if(!process.env.PLAYWRIGHT_MODULE)throw new Error('Set PLAYWRIGHT_MODULE to an installed Playwright index.mjs');
const {chromium}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const base=process.env.STATS_POLICY_ORIGIN||'http://127.0.0.1:5180';
const out='output/statistical-analysis-policy/browser';await fs.mkdir(out,{recursive:true});
const full=process.argv.includes('--full'),indices=full?Array.from({length:642},(_,i)=>i+1):[546,...Array.from({length:96},(_,i)=>i+547)];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--renderer-process-limit=1']});
const results=[],errors=[],checks=[];
try{
 for(const width of [1600,390]){
  const page=await browser.newPage({viewport:{width,height:width===1600?1080:844}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/statistical-analysis-preview.html?page=${indices[0]}`,{waitUntil:'networkidle'});
  for(const index of indices){
   if(index!==indices[0])await page.getByRole('spinbutton',{name:'当前页码'}).fill(String(index));
   const slide=page.locator('.sa-slide');
   await page.waitForFunction(i=>document.querySelector('.sa-slide')?.dataset.slideKey===`stats-l${i<=546?'':i<=594?'12':'13'}-${String((i-(i<=594?546:594))).padStart(2,'0')}`||Number(new URL(location.href).searchParams.get('page'))===i,index);
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>[...document.querySelectorAll('.sa-slide img')].every(i=>i.complete&&i.naturalWidth));
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const r=await slide.evaluate(a=>{
    const b=a.getBoundingClientRect(),overflow=[],overlap=[];let n;
    const walker=document.createTreeWalker(a,NodeFilter.SHOW_TEXT);
    while(n=walker.nextNode()){
     if(!n.textContent.trim()||n.parentElement.closest('annotation,.katex-mathml,svg'))continue;
     const range=document.createRange();range.selectNodeContents(n);
     for(const r of range.getClientRects())if(r.width&&r.height&&(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1))overflow.push(n.textContent.slice(0,70));
    }
    const header=a.querySelector('.sa-header'),body=a.querySelector('.sap-evidence'),caption=a.querySelector('.sa-caption');
    if(header&&body&&header.getBoundingClientRect().bottom>body.getBoundingClientRect().top+2)overlap.push('header/evidence');
    if(body&&caption&&body.getBoundingClientRect().bottom>caption.getBoundingClientRect().top+2)overlap.push('evidence/caption');
    for(const pre of a.querySelectorAll('pre'))if(pre.scrollHeight>pre.clientHeight+1||pre.scrollWidth>pre.clientWidth+1)overflow.push('code scroll');
    return {key:a.dataset.slideKey,width:a.offsetWidth,height:a.offsetHeight,ratio:b.width/b.height,
      leaks:/teachingCue|assistantCue|spokenSeconds|pauseSeconds|transitionToNext|教师逐页讲稿|sap-resources/.test(a.outerHTML),
      broken:[...a.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
      overflow,overlap,formulaErrors:a.querySelectorAll('.katex-error').length};
   });
   results.push({index,viewport:width,...r});
   if([546,547,553,559,562,568,574,575,580,589,594,595,600,603,610,614,618,623,627,635,642].includes(index))await page.screenshot({path:`${out}/${width}-${index}.png`});
   if(index%48===0)console.log(`canvas ${width}: ${index}`);
  }
  await page.getByRole('spinbutton',{name:'当前页码'}).fill('553');
  await page.getByRole('button',{name:'项目材料',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'项目材料'});
  await panel.waitFor();
  for(const file of ['project-12-13.zip','01_did.ipynb','README.txt','vibe-coding-prompts.txt'])assert.ok((await page.request.get(`${base}/course-assets/statistical-analysis/project-12-13/${file}`)).ok(),file);
  const download=panel.getByRole('link').first();const box=await download.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1);
  const waiting=page.waitForEvent('download');await download.click();const d=await waiting;await d.saveAs(`${out}/student-project-${width}.zip`);
  await page.screenshot({path:`${out}/${width}-project-panel.png`});
  await page.getByRole('spinbutton',{name:'当前页码'}).fill('554');await panel.waitFor({state:'hidden'});
  assert.equal(await page.locator('.presentation-toolbar').count(),1);
  await page.getByRole('button',{name:'网页全屏',exact:true}).click();
  assert.equal(await page.locator('.presentation-toolbar').count(),1);
  assert.equal(await page.locator('.sa-slide').getAttribute('data-slide-key'),'stats-l12-08');
  await page.getByRole('button',{name:'退出网页全屏',exact:true}).click();
  checks.push({viewport:width,download:true,currentPanelCloses:true,oneToolbar:true,pageFullscreen:true});
  await page.close();
 }
 const projection=await browser.newPage({viewport:{width:1600,height:1000}});
 await projection.goto(`${base}/statistical-analysis-preview.html?page=595&projection`,{waitUntil:'networkidle'});
 assert.equal(await projection.locator('.presentation-toolbar').count(),0);
 assert.equal(await projection.locator('.sap-resources').count(),0);
 assert.equal(await projection.locator('.stats-teacher-notes').count(),0);
 checks.push({projection:true,noTools:true,noTeacherNotes:true});
 await projection.close();
 // Inspect saved executed notebooks through their self-contained HTML exports.
 for(const name of ['01_did','02_iv']){
  const p=await browser.newPage({viewport:{width:1400,height:1000}});
  await p.goto(pathToFileURL(resolve(`output/statistical-analysis-policy/project/${name}.html`)).href,{waitUntil:'load'});
  assert.equal(await p.locator('.output_error').count(),0);
  assert.ok(await p.locator('.output_png').count()>=1);
  await p.screenshot({path:`${out}/${name}-top.png`});
  const figures=p.locator('.output_png');for(let i=0;i<await figures.count();i++)await figures.nth(i).screenshot({path:`${out}/${name}-figure-${i}.png`});
  checks.push({notebook:name,figures:await figures.count(),htmlInspected:true});await p.close();
 }
}finally{await browser.close();}
const failures=results.filter(r=>r.leaks||r.broken.length||r.overflow.length||r.overlap.length||r.formulaErrors||r.width!==1600||r.height!==1000||Math.abs(r.ratio-1.6)>.001);
await fs.writeFile(`${out}/${full?'full':'new-pages'}-audit.json`,JSON.stringify({base,checked:results.length,checks,errors,failures,results},null,2));
console.log(JSON.stringify({checked:results.length,checks,errors,failures},null,2));
assert.equal(errors.length,0);assert.equal(failures.length,0);
