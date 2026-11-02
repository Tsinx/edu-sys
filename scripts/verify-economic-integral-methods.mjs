import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import assert from 'node:assert/strict';
const out='output/courseware/economic-integral-methods-2026-11-01',archive='archive/courseware/economic-mathematics/integral-methods-before-2026-11-01';
const read=async f=>JSON.parse(await readFile(f,'utf8'));
const hash=async f=>createHash('sha256').update(await readFile(f)).digest('hex');
const m=await read(out+'/manifest.json'),previous=await read(archive+'/manifest.json');
assert.equal(m.version,'release-economic-mathematics-integral-methods-2026-11-01');assert.equal(m.totalPages,1167);assert.equal(m.lessonCount,30);assert.equal(m.hours,64);assert.equal(m.reserveHours,5);
assert.deepEqual(m.lessons.map(l=>[l.number,l.pages,l.hours.map(h=>h.seconds)]),[[17,44,[2700,2700]],[18,44,[2700,2700]]]);assert.equal(m.activities,8);assert.equal(m.questions,32);
for(const f of m.hashes)assert.equal(await hash(f.path),f.sha256,f.path);
for(const f of m.protected16){assert.equal(await hash(f.file),f.sha256,f.file);if(f.file.startsWith('apps/teacher-web/public/'))assert.equal(await hash(f.file.replace('/public/','/dist/')),f.sha256,'protected dist: '+f.file);}
for(const f of previous.files)assert.equal(await hash(archive+'/'+f.file),f.sha256,f.file);
const after=await read('.runtime/platform-api/state.json'),preserved=[];
for(const name of['runtime-before.json','runtime-before-restart.json']){
 const before=await read(out+'/'+name),sessions=Object.values(before.classSessions).filter(s=>s.courseId==='course-economic-mathematics'),current=new Map(Object.values(after.classSessions).map(s=>[s.id,s]));let runtimes=0;
 for(const s of sessions){assert.ok(isDeepStrictEqual(s,current.get(s.id)),name+':session:'+s.id);if(before.classroomRuntimes[s.id]){assert.ok(isDeepStrictEqual(before.classroomRuntimes[s.id],after.classroomRuntimes[s.id]),name+':runtime:'+s.id);runtimes++;}}
 preserved.push({baseline:name,sessions:sessions.length,runtimes});
}
const pdf=await read(out+'/pdf-audit.json'),downloads=await read(out+'/pdf-downloads.json');assert.equal(pdf.length,2);
for(const p of pdf){assert.equal(p.pages,44);assert.deepEqual(p.pageSizePoints,[1200,750]);assert.equal(p.allPagesHaveText,true);const d=downloads.find(d=>d.lesson===p.lesson);assert.ok(d?.path);
 for(const f of ['output/pdf/economic-mathematics-lesson'+p.lesson+'-teacher.pdf',...['public','dist'].map(k=>'apps/teacher-web/'+k+'/course-assets/economic-mathematics/limits/lesson'+p.lesson+'-teacher.pdf'),d.path])assert.equal(await hash(f),p.sha256,f);
 assert.equal(await hash('apps/teacher-web/public/course-assets/economic-mathematics/limits/lesson'+p.lesson+'-teacher.html'),p.printHtmlSha256);
}
const bank=await read(out+'/chaoxing-pending.json');assert.equal(bank.status,'prepared-not-synchronized');assert.equal(bank.remoteChanged,false);assert.equal(bank.activities.length,8);
for(const n of[17,18]){const groups=bank.activities.filter(a=>a.lesson===n);assert.equal(groups.length,4);assert.equal(groups.reduce((s,a)=>s+a.minutes,0),36);const doc=await read('docs/course/economic-mathematics-lesson'+n+'-exercises.json');assert.equal(doc.version,m.version);assert.equal(doc.status,'prepared-not-synchronized');assert.deepEqual(doc.activities,groups);for(const a of groups){assert.equal(a.questions.length,4);for(const q of a.questions){assert.equal(q.type,'written');assert.ok(!q.options);assert.equal(q.points,10);assert.ok(q.explanation&&q.scoring.length>=3);}}}
const math=await read(out+'/math-audit.json');assert.equal(math.computationalQuestions,31);assert.equal(math.checks.length,33);assert.ok(math.cycleCoefficientChecks&&math.parameterZeroCase&&math.zeroDerivativeAndBranchChecks);
const browser=await read(out+'/browser-pages.json');assert.equal(browser.length,176);assert.equal(new Set(browser.map(p=>`${p.lesson}:${p.page}:${p.layout}`)).size,176);
for(const p of browser){assert.ok(!p.missing&&!p.over.length&&!p.privateLeak&&!p.brokenImages&&!p.horizontal&&p.toolbars===1,JSON.stringify(p));assert.equal(p.title,m.lessons.find(l=>l.number===p.lesson).pageManifest[p.page-1].title);}
for(const n of[17,18]){const print=await read(out+'/static-lesson'+n+'.json');assert.equal(print.length,44);for(const p of print)assert.ok(!p.over.length&&!p.privateLeak,JSON.stringify(p));}
const interactions=await read(out+'/interaction-audit.json');for(const key of['lesson17Step1ReturnReload','lesson18Step1ReturnReload','pageFullscreenContinuity'])assert.equal(interactions[key],true);
for(const[file,count]of[['teacher-tests.log',81],['api-tests.log',24]]){const log=await readFile(out+'/'+file,'utf8');assert.match(log,new RegExp('ℹ pass '+count));assert.match(log,/ℹ fail 0/);}
assert.match(await readFile(out+'/typecheck.log','utf8'),/apps\/teacher-web typecheck: Done/);assert.match(await readFile(out+'/production-build.log','utf8'),/built in/);
let currentAssets=false;for(const name of(await readdir('apps/teacher-web/dist/assets')).filter(n=>n.endsWith('.js')))if((await readFile('apps/teacher-web/dist/assets/'+name,'utf8')).includes(m.version))currentAssets=true;assert.ok(currentAssets);
const paths=['/api/health','/api/courses/course-economic-mathematics',...[16,17,18,19].map(n=>'/economic-narration.html?lesson='+n+'&page=1'),...[17,18].flatMap(n=>['teacher.pdf','teacher.html','script.html','worksheet.html','answers.html'].map(f=>'/course-assets/economic-mathematics/limits/lesson'+n+'-'+f))];
const health=await Promise.all(paths.map(async path=>{const r=await fetch('http://127.0.0.1:5174'+path);assert.equal(r.status,200,path);return{path,status:r.status};}));assert.equal((await fetch('http://127.0.0.1:4300/api/health')).status,200);
const receipt={version:m.version,lessons:m.lessons.map(({pageManifest,...l})=>l),lessonCount:30,totalPages:1167,totalHours:64,activities:8,questions:32,questionType:'written-only',individualMinutesPerLesson:36,protected16:m.protected16.length,preserved,archiveFilesVerified:previous.files.length,sourceFilesVerified:m.hashes.length,pdf,downloads,browser:{desktopPages:88,narrowPages:88,printPages:88,issues:0,interactions},math:{computationalQuestions:31,symbolicCases:33,conceptualCycleQuestionVerified:true},tests:{teacher:81,apiAndContext:24,typecheck:true,productionBuild:true},health,chaoxing:{status:bank.status,remoteChanged:false},classroomPaceProjectionAndAudio:'pending classroom trial'};
await writeFile(out+'/final-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({...receipt,pdf:pdf.map(p=>({lesson:p.lesson,pages:p.pages,sha256:p.sha256})),downloads:undefined,health:undefined,healthChecks:health.length},null,2));
