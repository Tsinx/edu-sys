import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import assert from 'node:assert/strict';

const out='output/courseware/economic-integral-foundations-2026-11-01';
const archive='archive/courseware/economic-mathematics/integral-before-density-2026-11-01';
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const manifest=await read(out+'/manifest.json'),oldManifest=await read(archive+'/manifest.json');
assert.equal(manifest.version,'release-economic-mathematics-integral-foundations-2026-11-01');
assert.equal(manifest.totalPages,1138);assert.equal(manifest.lessonCount,31);assert.equal(manifest.hours,64);
assert.deepEqual(manifest.lessons.map(l=>l.pages),[34,40]);
for(const l of manifest.lessons)assert.deepEqual(l.hours.map(h=>h.seconds),[2700,2700]);
assert.equal(manifest.activities,13);assert.equal(manifest.questions,16);
for(const file of manifest.hashes)assert.equal(await hash(file.path),file.sha256,file.path);
for(const file of oldManifest.files)assert.equal(await hash(archive+'/'+file.file),file.sha256,file.file);

// Other live courses may legitimately change while this course is being edited.
const after=await read('.runtime/platform-api/state.json'),preserved=[];
for(const name of ['runtime-before.json','runtime-before-restart.json']){
 const before=await read(out+'/'+name);
 const existing=Object.values(before.classSessions).filter(s=>s.courseId==='course-economic-mathematics');
 const current=new Map(Object.values(after.classSessions).map(s=>[s.id,s]));let runtimes=0;
 for(const s of existing){
  assert.ok(isDeepStrictEqual(s,current.get(s.id)),name+': class session '+s.id);
  if(before.classroomRuntimes[s.id]){assert.ok(isDeepStrictEqual(before.classroomRuntimes[s.id],after.classroomRuntimes[s.id]),name+': runtime '+s.id);runtimes++;}
 }
 preserved.push({baseline:name,sessions:existing.length,runtimes});
}

const pdfAudit=await read(out+'/pdf-audit.json'),downloads=await read(out+'/pdf-download-paths.json');
for(const p of pdfAudit){
 assert.equal(p.pages,p.lesson===16?34:40);assert.deepEqual(p.pageSizePoints,[1200,750]);assert.equal(p.allPagesHaveText,true);
 const name='economic-mathematics-lesson'+p.lesson+'-teacher.pdf';
 for(const file of ['output/pdf/'+name,...['public','dist'].map(root=>'apps/teacher-web/'+root+'/course-assets/economic-mathematics/limits/lesson'+p.lesson+'-teacher.pdf')])assert.equal(await hash(file),p.sha256,file);
 assert.equal(await hash('apps/teacher-web/public/course-assets/economic-mathematics/limits/lesson'+p.lesson+'-teacher.html'),p.printHtmlSha256);
 const d=downloads.find(d=>d.lesson===p.lesson);assert.ok(d?.path);assert.equal(await hash(d.path),p.sha256,d.path);
}
const bank=await read(out+'/chaoxing-pending.json');assert.equal(bank.status,'prepared-not-synchronized');assert.equal(bank.remoteChanged,false);assert.equal(bank.activities.length,13);
for(const n of[16,17]){
 const exercises=await read('docs/course/economic-mathematics-lesson'+n+'-exercises.json');
 assert.equal(exercises.status,'prepared-not-synchronized');assert.equal(exercises.activities.length,n===16?6:7);
 assert.equal(exercises.activities.reduce((s,a)=>s+a.minutes,0),n===16?26:30);
 assert.equal(exercises.activities.reduce((s,a)=>s+a.questions.length,0),n===16?7:9);
}

const browser=await read(out+'/browser-pages-final.json');assert.equal(browser.length,148);
for(const p of browser)assert.ok(!p.missing&&!p.over.length&&!p.privateLeak&&!p.brokenImages&&!p.horizontal&&p.toolbars===1,JSON.stringify(p));
for(const n of[16,17]){const pages=await read(out+'/static-lesson'+n+'.json');assert.equal(pages.length,n===16?34:40);for(const p of pages)assert.ok(!p.over.length&&!p.privateLeak,JSON.stringify(p));}
const interaction=await read(out+'/interaction-audit.json');
for(const key of ['pageFullscreenContinuity','pageReturnRestored','reloadRestored','revealOneFeedbackOnly','revealReturnRestored','revealReloadRestored'])assert.equal(interaction[key],true,key);

const paths=['/api/health','/api/courses/course-economic-mathematics',...Array.from([16,17],n=>'/economic-narration.html?lesson='+n+'&page=1'),...[16,17].flatMap(n=>['teacher.html','teacher.pdf','script.html','worksheet.html','answers.html'].map(f=>'/course-assets/economic-mathematics/limits/lesson'+n+'-'+f)),...Array.from([14,15],n=>'/course-assets/economic-mathematics/limits/lesson'+n+'-teacher.pdf')];
const health=await Promise.all(paths.map(async path=>{const r=await fetch('http://127.0.0.1:5174'+path);assert.equal(r.status,200,path);return{path,status:r.status};}));
assert.equal((await fetch('http://127.0.0.1:4300/api/health')).status,200);
const assets=await readdir('apps/teacher-web/dist/assets');let currentAssets=false;
for(const file of assets.filter(f=>f.endsWith('.js')))if((await readFile('apps/teacher-web/dist/assets/'+file,'utf8')).includes(manifest.version))currentAssets=true;
assert.ok(currentAssets,'production assets include current release');
const receipt={version:manifest.version,lessons:manifest.lessons.map(({pageManifest,...l})=>l),hours:manifest.hours,totalPages:manifest.totalPages,activities:13,questions:16,preserved,archiveFilesVerified:oldManifest.files.length,sourceFilesVerified:manifest.hashes.length,pdf:pdfAudit,downloads,browser:{desktopPages:74,narrowPages:74,printPages:74,issues:0,interaction},health,productionAssetsCurrent:true,chaoxing:{status:bank.status,remoteChanged:false},actualProjectionAudioAndTeachingPace:'pending classroom trial'};
await writeFile(out+'/final-receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({...receipt,pdf:pdfAudit.map(({lesson,pages,sha256})=>({lesson,pages,sha256})),health:undefined,downloads:undefined,healthChecks:health.length},null,2));
