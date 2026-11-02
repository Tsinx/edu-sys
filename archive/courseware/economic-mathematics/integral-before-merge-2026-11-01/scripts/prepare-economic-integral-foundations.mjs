import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),out='output/courseware/economic-integral-foundations-2026-11-01',pub='apps/teacher-web/public/course-assets/economic-mathematics/limits';
await mkdir(out,{recursive:true});await mkdir(pub,{recursive:true});
const bundle=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const courseBundle=path.resolve(out,'content.mjs');
await writeFile(courseBundle,bundle.outputFiles[0].text);
const c=await import(pathToFileURL(courseBundle).href);
const require=createRequire(path.join(root,'apps/teacher-web/package.json')),katex=require('katex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const math=s=>katex.renderToString(s,{displayMode:true,throwOnError:true,strict:'error',trust:false});
const inline=s=>String(s).split(/(\$[^$]+\$)/g).map(x=>x.startsWith('$')&&x.endsWith('$')?katex.renderToString(x.slice(1,-1),{throwOnError:true,strict:'error'}):esc(x)).join('');
const content=p=>(p.formula?'<div class="formula">'+math(p.formula)+'</div>':'')+(p.body??[]).map(s=>'<p>'+inline(s)+'</p>').join('')+(p.table?'<table><thead><tr>'+p.table.columns.map(s=>'<th>'+inline(s)+'</th>').join('')+'</tr></thead><tbody>'+p.table.rows.map(r=>'<tr>'+r.map(s=>'<td>'+inline(s)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'')+(p.prompt?'<p>'+inline(p.prompt)+'</p>':'');
const style='body{max-width:1100px;margin:32px auto;padding:0 24px;background:#f6f3e9;color:#202c2d;font:18px/1.75 "Microsoft YaHei",sans-serif}h1,h2{font-family:SimSun,serif}section{border-top:1px solid #a6b9b4;padding:22px 0}.formula{overflow:auto}table{border-collapse:collapse;width:100%}td,th{padding:10px;text-align:left;border-bottom:1px solid #bdc8c2}small{color:#466d6e}.space{height:100px}@media print{body{background:white;font-size:11pt;margin:0}section{break-inside:auto}.formula{overflow:visible}h1{font-size:22pt}h2{font-size:16pt}}';
const html=(title,body)=>'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><link rel="stylesheet" href="/course-assets/economic-mathematics/limits/vendor/katex.min.css"><style>'+style+'</style><body><h1>'+esc(title)+'</h1>'+body+'</body></html>';
const bank=c.INTEGRAL_ACTIVITIES.map(a=>{const p=c.ECONOMIC_MATHEMATICS_SLIDES.find(p=>p.exerciseActivityId===a.id);if(!p)throw Error('MISSING_APPLICATION:'+a.id);return{...a,page:p.localIndex,slideKey:p.slideKey,platformGroup:a.lesson===16?'第十六讲·原函数与结构计算·个人练习':'第十七讲·基本积分与反三角函数·个人练习'};});
await writeFile('docs/course/economic-mathematics-integral-exercises.json',JSON.stringify(bank,null,2)+'\n');

const task=(q,i,answers)=>'<h3>'+i+'. '+inline(q.stem)+'</h3>'+(q.options??[]).map((o,k)=>'<p>'+'ABCD'[k]+'. '+inline(o)+'</p>').join('')+(answers?'<p><b>答案：</b>'+inline(q.answer)+'</p><p>'+inline(q.explanation)+'</p>'+(q.scoring??[]).map(s=>'<p>'+esc(s)+'</p>').join(''):'<div class="space"></div>');
for(const n of [16,17]){
 const pages=c.ECONOMIC_MATHEMATICS_SLIDES.filter(p=>p.lesson===n),lesson=c.ECONOMIC_MATHEMATICS_LESSONS[n-1],speech=c['lesson'+n+'Narration'];
 const route=lesson.classHours.map(h=>'<p>第'+h.hour+'课时：第'+h.slideStart+'—'+h.slideEnd+'页，45分钟；'+esc(h.activity)+'</p>').join('');
 const body=pages.map(p=>'<section><h2>'+p.localIndex+'. '+esc(p.title)+'</h2><small>第'+p.classHour+'课时 · '+p.teachingSeconds+'秒</small>'+content(p)+(p.steps??[]).map((s,i)=>'<h3>公开步骤'+(i+1)+'：'+esc(s.title)+'</h3>'+(s.text?'<p>'+inline(s.text)+'</p>':'')+(s.formula?'<div class="formula">'+math(s.formula)+'</div>':'')).join('')+'<h3>逐页讲稿</h3>'+speech[p.slideKey].map((s,i)=>'<p><small>'+(i?'第'+i+'步公开后':'初始状态')+'</small><br>'+esc(s)+'</p>').join('')+'</section>').join('');
 await writeFile(pub+'/lesson'+n+'-script.html',html('经济数学第'+n+'讲 · 完整讲稿与答案',route+body));
 const md=['# 第'+n+'讲：'+lesson.title,'','版本：'+c.ECONOMIC_MATHEMATICS_VERSION_ID,'',...lesson.classHours.map(h=>'第'+h.hour+'课时：第'+h.slideStart+'—'+h.slideEnd+'页，45分钟；'+h.activity),''];
 for(const p of pages)md.push('## '+p.localIndex+'. '+p.title,'','第'+p.classHour+'课时，预计'+p.teachingSeconds+'秒。',p.teachingCue??'',p.formula?'$$'+p.formula+'$$':'',...(p.body??[]),p.table?'表格：'+JSON.stringify(p.table):'',...(p.steps??[]).flatMap((s,i)=>['公开步骤'+(i+1)+'：'+s.title,s.text??'',s.formula?'$$'+s.formula+'$$':'']),'','逐字讲稿：',...speech[p.slideKey].map((s,i)=>(i?'第'+i+'步公开后':'初始状态')+'：'+s),'');
 await writeFile('docs/course/economic-mathematics-lesson'+n+'-script.md',md.join('\n'));
 for(const answers of [false,true]){
  const sheet=bank.filter(a=>a.lesson===n).map(a=>'<section><h2>'+esc(a.title)+'</h2><small>第'+a.page+'页 · 独立作答'+a.minutes+'分钟</small>'+a.questions.map((q,i)=>task(q,i+1,answers)).join('')+'</section>').join('');
  await writeFile(pub+'/lesson'+n+(answers?'-answers':'-worksheet')+'.html',html('第'+n+'讲 · '+(answers?'练习答案与评分':'个人练习单'),sheet));
 }
}
const printEntry="import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {EconomicMathematicsTeachingSlides as Slide} from './apps/teacher-web/src/features/economic-mathematics/EconomicMathematicsTeachingSlides';import {ECONOMIC_MATHEMATICS_SLIDES as pages,ECONOMIC_MATHEMATICS_DECK_ID as deckId,getEconomicMathematicsInteractionDefinition as definition} from './packages/course-content/src/economic-mathematics/index';export const slides=pages.filter(p=>p.lesson===16||p.lesson===17).map(p=>({lesson:p.lesson,html:renderToStaticMarkup(React.createElement(Slide,{spec:p,readOnly:true,interaction:definition(p)?{deckId,slideId:p.slideKey,revision:1,values:{...definition(p).defaults,presentationStep:p.steps?.length??0}}:null}))}));";
const printBundle=path.resolve(out,'print-render.cjs');
await build({stdin:{contents:printEntry,resolveDir:root,sourcefile:'applications-print.tsx',loader:'tsx'},bundle:true,platform:'node',format:'cjs',outfile:printBundle,jsx:'automatic',loader:{'.css':'empty'},nodePaths:[path.join(root,'apps/teacher-web/node_modules')],logLevel:'warning'});
delete require.cache[printBundle];const printed=require(printBundle).slides;
const css=(await Promise.all(['economic-mathematics.css','limits.css'].map(f=>readFile('apps/teacher-web/src/features/economic-mathematics/'+f,'utf8')))).join('\n');
const printStyle='body{margin:0;background:#dfe6e0}.print-page{width:calc(1600px * var(--scale,1));height:calc(1000px * var(--scale,1));margin:24px auto;position:relative}.print-page .em-slide{width:1600px!important;height:1000px!important;transform:scale(var(--scale,1));transform-origin:0 0}@media print{@page{size:1600px 1000px;margin:0}body{background:white}.print-page{width:1600px;height:1000px;margin:0;break-after:page}.print-page:last-of-type{break-after:auto}.print-page .em-slide{transform:none}}';
for(const n of [16,17])await writeFile(pub+'/lesson'+n+'-teacher.html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>经济数学第'+n+'讲 · 完整备课打印</title><link rel="stylesheet" href="/course-assets/economic-mathematics/limits/vendor/katex.min.css"><style>'+css+'\n'+printStyle+'</style><body>'+printed.filter(s=>s.lesson===n).map((s,i)=>'<section class="print-page" id="p'+(i+1)+'">'+s.html+'</section>').join('')+"<script>function fit(){document.documentElement.style.setProperty('--scale',Math.min(1,(innerWidth-24)/1600))}fit();addEventListener('resize',fit)</script></body></html>");
const files=[...['lesson-16-antiderivatives.ts','lesson-16-integral-density.ts','lesson-17-basic-integrals.ts','integral-authoring.ts','integral-exercises.ts','integral-density-exercises.ts','integral-model.ts','types.ts','curriculum.ts','slides.ts','index.ts','interactions.ts','authoring.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['IntegralFigure.tsx','InverseTrigFigure.tsx','EconomicMathematicsTeachingSlides.tsx','EconomicPageNarrator.tsx','limits.css','economic-mathematics.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx'];
const hashes=await Promise.all(files.map(async file=>({path:file,sha256:createHash('sha256').update(await readFile(file)).digest('hex')})));
const manifest={deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,lessonCount:c.ECONOMIC_MATHEMATICS_LESSONS.length,totalPages:c.ECONOMIC_MATHEMATICS_SLIDES.length,hours:c.ECONOMIC_MATHEMATICS_TOTAL_HOURS,reserveHours:c.ECONOMIC_MATHEMATICS_UNALLOCATED_HOURS,lessons:[16,17].map(n=>{const pages=c.ECONOMIC_MATHEMATICS_SLIDES.filter(p=>p.lesson===n);return{number:n,pages:pages.length,hours:[1,2].map(h=>({hour:h,seconds:pages.filter(p=>p.classHour===h).reduce((s,p)=>s+p.teachingSeconds,0)})),pageManifest:pages.map(p=>({page:p.localIndex,title:p.title,steps:p.steps?.length??0,seconds:p.teachingSeconds,activityId:p.exerciseActivityId}))};}),activities:bank.length,questions:bank.reduce((n,a)=>n+a.questions.length,0),hashes};
await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({...manifest,lessons:manifest.lessons.map(({pageManifest,...l})=>l),hashes:undefined},null,2));

for(const n of [16,17])await writeFile('docs/course/economic-mathematics-lesson'+n+'-exercises.json',JSON.stringify({version:c.ECONOMIC_MATHEMATICS_VERSION_ID,status:'prepared-not-synchronized',activities:bank.filter(a=>a.lesson===n)},null,2)+'\n');
await writeFile(out+'/chaoxing-pending.json',JSON.stringify({courseId:'267794051',classId:'156507419',status:'prepared-not-synchronized',remoteChanged:false,activities:bank},null,2)+'\n');
