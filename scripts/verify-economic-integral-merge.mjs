import {readFile,writeFile,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import assert from 'node:assert/strict';
const out='output/courseware/economic-integral-merge-2026-11-01',archive='archive/courseware/economic-mathematics/integral-before-merge-2026-11-01';
const read=async f=>JSON.parse(await readFile(f,'utf8'));
const hash=async f=>createHash('sha256').update(await readFile(f)).digest('hex');
const m=await read(out+'/manifest.json'),old=await read(archive+'/manifest.json');
assert.equal(m.version,'release-economic-mathematics-integral-merged-2026-11-01');assert.equal(m.totalPages,1099);assert.equal(m.lessonCount,30);assert.equal(m.hours,64);assert.equal(m.reserveHours,5);
assert.deepEqual(m.lessons.map(l=>[l.number,l.pages,l.hours.map(h=>h.seconds)]),[[16,35,[2700,2700]]]);assert.equal(m.activities,7);assert.equal(m.questions,10);
for(const f of m.hashes)assert.equal(await hash(f.path),f.sha256,f.path);
for(const f of old.files)assert.equal(await hash(archive+'/'+f.file),f.sha256,f.file);
const after=await read('.runtime/platform-api/state.json'),preserved=[];
for(const name of ['runtime-before.json','runtime-before-restart.json']){
 const before=await read(out+'/'+name),sessions=Object.values(before.classSessions).filter(s=>s.courseId==='course-economic-mathematics');let runtimes=0;
 const current=new Map(Object.values(after.classSessions).map(s=>[s.id,s]));
 for(const s of sessions){assert.ok(isDeepStrictEqual(s,current.get(s.id)),name+':session:'+s.id);if(before.classroomRuntimes[s.id]){assert.ok(isDeepStrictEqual(before.classroomRuntimes[s.id],after.classroomRuntimes[s.id]),name+':runtime:'+s.id);runtimes++;}}
 preserved.push({baseline:name,sessions:sessions.length,runtimes});
}
const [pdf]=await read(out+'/pdf-audit.json'),download=await read(out+'/pdf-download.json');assert.equal(pdf.pages,35);assert.deepEqual(pdf.pageSizePoints,[1200,750]);assert.equal(pdf.allPagesHaveText,true);
for(const f of ['output/pdf/economic-mathematics-lesson16-teacher.pdf',...['public','dist'].map(k=>'apps/teacher-web/'+k+'/course-assets/economic-mathematics/limits/lesson16-teacher.pdf'),download.path])assert.equal(await hash(f),pdf.sha256,f);
assert.equal(await hash('apps/teacher-web/public/course-assets/economic-mathematics/limits/lesson16-teacher.html'),pdf.printHtmlSha256);
for(const root of ['public','dist']){let absent=false;try{await access('apps/teacher-web/'+root+'/course-assets/economic-mathematics/limits/lesson17-teacher.pdf');}catch(e){if(e.code==='ENOENT')absent=true;else throw e;}assert.ok(absent,'retired arctan PDF is absent from '+root);}
const bank=await read(out+'/chaoxing-pending.json');assert.equal(bank.remoteChanged,false);assert.equal(bank.status,'prepared-not-synchronized');assert.equal(bank.activities.length,7);assert.ok(bank.activities.every(a=>a.lesson===16));assert.equal(bank.activities.reduce((n,a)=>n+a.minutes,0),24);
for(const a of bank.activities)for(const q of a.questions)assert.doesNotMatch(JSON.stringify(q),/换元|分部积分|微分因子|待定系数|完整乘积|内层/);
const retired=await read('docs/course/economic-mathematics-lesson17-exercises.json');assert.equal(retired.status,'merged-into-lesson16');assert.equal(retired.activities.length,0);
const browser=await read(out+'/browser-pages.json');assert.equal(browser.length,70);for(const p of browser){assert.ok(!p.missing&&!p.over.length&&!p.privateLeak&&!p.brokenImages&&!p.horizontal&&p.toolbars===1,JSON.stringify(p));assert.equal(p.title,m.lessons[0].pageManifest[p.page-1].title);}
const printed=await read(out+'/static-pages.json');assert.equal(printed.length,35);for(const p of printed)assert.ok(!p.over.length&&!p.privateLeak,JSON.stringify(p));
const interactions=await read(out+'/interaction-audit.json');for(const key of ['pageFullscreenContinuity','pageReturnRestored','reloadRestored','revealOneFeedbackOnly','revealReturnRestored','revealReloadRestored'])assert.equal(interactions[key],true,key);
const successors=await read(out+'/renumbered-entry-audit.json');assert.deepEqual(successors.map(p=>p.lesson),[17,18,30]);for(const p of successors){assert.equal(p.brokenImages,0);assert.equal(p.toolbars,1);assert.equal(p.oldPdfAdvertised,false);}assert.match(successors[0].selected,/第17讲.*换元/);assert.match(successors[1].selected,/第18讲.*分部/);assert.match(successors[2].selected,/第30讲.*综合/);
const health=await Promise.all(['/api/health','/api/courses/course-economic-mathematics',...Array.from([16,17,18,30],n=>'/economic-narration.html?lesson='+n+'&page=1'),...['teacher.pdf','teacher.html','script.html','worksheet.html','answers.html'].map(f=>'/course-assets/economic-mathematics/limits/lesson16-'+f)].map(async path=>{const r=await fetch('http://127.0.0.1:5174'+path);assert.equal(r.status,200,path);return{path,status:r.status};}));assert.equal((await fetch('http://127.0.0.1:4300/api/health')).status,200);
let currentAssets=false;for(const name of(await readdir('apps/teacher-web/dist/assets')).filter(n=>n.endsWith('.js')))if((await readFile('apps/teacher-web/dist/assets/'+name,'utf8')).includes(m.version))currentAssets=true;assert.ok(currentAssets);
for(const [file,count]of[['teacher-tests.log',77],['api-tests.log',22]]){const log=await readFile(out+'/'+file,'utf8');assert.match(log,new RegExp('ℹ pass '+count));assert.match(log,/ℹ fail 0/);}
assert.match(await readFile(out+'/typecheck.log','utf8'),/apps\/teacher-web typecheck: Done/);assert.match(await readFile(out+'/production-build.log','utf8'),/built in/);
const receipt={version:m.version,lessons:30,totalPages:1099,mergedLecture:{number:16,pages:35,hours:2,periodsSeconds:[2700,2700],activities:7,questions:10,individualWorkMinutes:24},nextLectures:{17:'换元积分（原第18讲）',18:'分部积分（原第19讲）'},preserved,archiveFilesVerified:old.files.length,sourceFilesVerified:m.hashes.length,pdf,download,browser:{desktopPages:35,narrowPages:35,printPages:35,issues:0,interactions,successors},tests:{teacher:77,apiAndContext:22,typecheck:true,productionBuild:true},health,chaoxing:{status:bank.status,remoteChanged:false},classroomPace:'pending classroom trial'};
await writeFile(out+'/final-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...receipt,pdf:{pages:pdf.pages,sha256:pdf.sha256},download:undefined,health:undefined,healthChecks:health.length},null,2));
