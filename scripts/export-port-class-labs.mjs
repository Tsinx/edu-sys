// Run through scripts/course-pdf/run_limited.py, with the same hard 10% CPU / 1536 MiB job cap.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PDF_BUILD_LIMITS } from './course-pdf/build-policy.mjs';
const { chromium }=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const base=process.env.PORT_CLASS_LAB_URL??'http://127.0.0.1:5173';
const illustratedLesson=process.argv.includes('--illustrated12')?12:process.argv.includes('--illustrated11')?11:null;
const documentary=process.argv.includes('--documentary'),facilities=process.argv.includes('--facilities');
const illustrated=illustratedLesson!==null,release=facilities?`port-facilities-v20-l${illustratedLesson}`:documentary?`port-documentary-v19-l${illustratedLesson}`:illustratedLesson===12?'port-safety-civic-v18':illustrated?'port-illustrated-v17':'port-class-labs-v16';
if(documentary&&!illustrated)throw Error('Documentary export requires --illustrated11 or --illustrated12; never exports the whole course.');
const output=resolve('output/pdf/'+release),parts=resolve(facilities?`output/port-facility-repair/pdf-parts-l${illustratedLesson}`:documentary?`output/port-documentary-recut/l${illustratedLesson}/pdf-parts`:illustratedLesson===12?'output/port-twelve-media/pdf-parts':illustrated?'output/port-eleven-media/pdf-parts':'output/port-class-lab-qa/pdf-parts');
const handouts=resolve('apps/teacher-web/public/handouts/'+release);
await mkdir(output,{recursive:true});await mkdir(parts,{recursive:true});await mkdir(handouts,{recursive:true});
const inputs=['packages/course-content/src/port-lesson-eleven.ts','packages/course-content/src/port-lesson-twelve.ts','packages/course-content/src/port-expansion-shared.ts','packages/course-content/src/port-class-lab-evidence.json','apps/teacher-web/src/features/port-expansion/PortAdvancedComposition.tsx','apps/teacher-web/src/features/port-expansion/port-expansion.css'];
if(illustrated)inputs.push('packages/course-content/src/port-lesson-eleven-media.ts','apps/teacher-web/src/features/port-expansion/PortElevenOpening.tsx',...['terminal','yard','gate','anchorage','quayside','control-room'].map(n=>'apps/teacher-web/public/course-assets/port-management/l11-media/'+n+'.jpg'));
if(illustratedLesson===12)inputs.push('packages/course-content/src/port-lesson-twelve-media.ts','packages/course-content/src/port-advanced-media.ts','packages/course-content/src/port-performance-safety-models.ts',...['handoff','warehouse','records','drill','community','gate'].map(n=>'apps/teacher-web/public/course-assets/port-management/l12-media/'+n+'.jpg'));
if(documentary)inputs.push(`apps/teacher-web/public/course-assets/port-management/l${illustratedLesson}-media/documentary-v2/cover.jpg`);
async function sourceHash(){const h=createHash('sha256');for(const path of inputs)h.update(path).update(await readFile(path));return h.digest('hex');}
const hash=await sourceHash(),manifest={version:facilities?'release-port-management-facilities-v20':documentary?'release-port-management-documentary-v19':illustratedLesson===12?'release-port-management-safety-civic-v18':illustrated?'release-port-management-illustrated-v17':'release-port-management-class-labs-v16',sourceHash:hash,files:[]};
for(const lesson of illustrated?[illustratedLesson]:[11,12]){
  // Each lecture owns a fresh browser; legacy globe chapters never enter this export job.
  const browser=await chromium.launch({headless:true,args:['--disable-background-networking','--disable-extensions','--renderer-process-limit=1','--js-flags=--max-old-space-size=256']});
  const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
  page.setDefaultTimeout(PDF_BUILD_LIMITS.renderTimeoutMs);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const names=[],titles=[];
  try{
    await page.goto(`${base}/course-pdf.html?metadata=1`);await page.waitForFunction(()=>window.__COURSE_PDF_METADATA__);
    const metadata=await page.evaluate(()=>window.__COURSE_PDF_METADATA__.find(c=>c.courseId==='course-port-management-intro'));
    const chapter=metadata.chapters.find(c=>c.number===lesson);if(chapter?.indices.length!==32)throw Error('Lecture metadata mismatch');
    const start=metadata.chapters.filter(c=>c.number<lesson).reduce((s,c)=>s+c.indices.length,0);
    for(let offset=0;offset<32;offset+=8){
      const ready=await page.evaluate(input=>window.__COURSE_PDF_RENDER__(input),{courseId:metadata.courseId,start:start+offset,count:8});
      if(ready.errors.length||errors.length)throw Error(JSON.stringify({ready,errors}));
      await page.evaluate(()=>document.fonts.ready);
      titles.push(...await page.locator('.ps-heading h1').allTextContents());
      const path=resolve(parts,`lesson-${lesson}-${offset}.pdf`);
      await page.pdf({path,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,margin:{top:0,bottom:0,left:0,right:0}});names.push(path);
      await page.evaluate(()=>window.__COURSE_PDF_CLEAR__());
      console.log(`Lecture ${lesson}: ${offset+8}/32 pages printed`);
      await new Promise(done=>setTimeout(done,PDF_BUILD_LIMITS.cooldownMs));
    }
  }finally{await browser.close();}
  const filename=facilities?`port-management-lesson-${lesson}-v20-facilities.pdf`:documentary?`port-management-lesson-${lesson}-v19-documentary.pdf`:illustratedLesson===12?'port-management-lesson-12-v18-safety-civic.pdf':illustrated?'port-management-lesson-11-v17-illustrated.pdf':`port-management-lesson-${lesson}-v16-final.pdf`,path=resolve(output,filename),spec=resolve(parts,`assemble-${lesson}.json`);
  if(titles.length!==32)throw Error('Missing PDF navigation titles');
  await writeFile(spec,JSON.stringify({operation:'chapter',parts:names,output:path,pages:32,title:`港口管理概论 · 第${lesson}讲`,bookmarks:titles.map((t,i)=>[1,t,i+1])},null,2));
  const result=spawnSync('python',['scripts/course-pdf/assemble.py',spec],{stdio:'inherit',windowsHide:true});if(result.status!==0)throw Error('PDF assembly failed');
  const bookmarked=spawnSync('python',['-c','import fitz,json,sys,os; s=json.load(open(sys.argv[1],encoding="utf-8")); d=fitz.open(s["output"]); d.set_toc(s["bookmarks"]); p=s["output"]+".bookmarked.pdf"; d.save(p,garbage=4,deflate=True); d.close(); os.replace(p,s["output"])',spec],{stdio:'inherit',windowsHide:true});
  if(bookmarked.status!==0)throw Error('PDF bookmarks failed');
  if(hash!==await sourceHash())throw Error('Source changed during export');
  await copyFile(path,resolve(handouts,filename));const data=await readFile(path);
  manifest.files.push({lesson,pages:32,path,publicUrl:`/handouts/${release}/${filename}`,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
