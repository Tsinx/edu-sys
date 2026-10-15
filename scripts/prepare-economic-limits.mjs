import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundled=await build({entryPoints:[path.join(root,'packages/course-content/src/economic-mathematics/index.ts')],bundle:true,platform:'node',format:'esm',write:false});
const course=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const require=createRequire(path.join(root,'apps/teacher-web/package.json')),katex=require('katex');
const selected=course.ECONOMIC_MATHEMATICS_SLIDES.filter(p=>p.lesson===3||p.lesson===4);
const publicRoot=path.join(root,'apps/teacher-web/public/course-assets/economic-mathematics/limits');
await mkdir(publicRoot,{recursive:true});
const vendor=path.join(publicRoot,'vendor');await mkdir(vendor,{recursive:true});
const katexRoot=path.dirname(require.resolve('katex/dist/katex.min.css'));
await copyFile(path.join(katexRoot,'katex.min.css'),path.join(vendor,'katex.min.css'));
await copyFile(path.join(katexRoot,'../LICENSE'),path.join(vendor,'KATEX-LICENSE.txt'));
await cp(path.join(katexRoot,'fonts'),path.join(vendor,'fonts'),{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=s=>String(s).split(/(\$[^$]+\$)/g).map(t=>t.startsWith('$')&&t.endsWith('$')?katex.renderToString(t.slice(1,-1),{throwOnError:true,strict:'error',trust:false}):esc(t)).join('');
const formula=s=>'<div class="math">'+katex.renderToString(s,{displayMode:true,throwOnError:true,strict:'error',trust:false})+'</div>';
const sources=[
 ['数列、ε–N与正负无穷','https://www.math.ucdavis.edu/~hunter/intro_analysis_pdf/ch3.pdf'],
 ['潜无穷与实无穷的历史讨论','https://classics.mit.edu/Aristotle/physics.3.iii.html'],
 ['定义与极限法则','https://openstax.org/books/calculus-volume-1/pages/2-5-the-precise-definition-of-a-limit'],
 ['法则、精确变形与夹逼','https://openstax.org/books/calculus-volume-1/pages/2-3-the-limit-laws'],
 ['数列与单调界限','https://openstax.org/books/calculus-volume-2/pages/5-1-sequences'],
 ['贝克莱原文','https://www.maths.tcd.ie/pub/HistMath/People/Berkeley/Analyst/Analyst.html'],
 ['牛顿原文及版本说明','https://www.maths.tcd.ie/pub/HistMath/People/Newton/Principia/Bk1Sect1/PrBk1St1.pdf']
];
const style='body{font-family:"Microsoft YaHei",sans-serif;background:#f6f3e9;color:#202c2d;margin:36px auto;max-width:960px;padding:0 28px;font-size:18px;line-height:1.65}h1,h2{font-family:"SimSun",serif}h1{font-size:36px}h2{font-size:28px;margin:0 0 20px}section{padding:24px 0;border-top:1px solid #b9c6bd;break-inside:avoid}p{margin:12px 0}.cue{color:#466d6e;border-left:3px solid;padding-left:16px}.speech{margin:12px 0;padding-left:16px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #c6c8be;text-align:left}a{color:#466d6e}.work-space{height:150px;border-bottom:1px solid #ddd}small{color:#68716c}.math{overflow-x:auto}@media print{body{margin:0;max-width:none;font-size:12pt;background:white}h1{font-size:22pt}h2{font-size:17pt}section{break-inside:auto}.cue{break-inside:avoid}.work-space{height:38mm}a{color:inherit;text-decoration:none}.math{overflow:visible}.katex{font-size:1em}button{display:none}}';
function html(title,body){return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><link rel="stylesheet" href="/course-assets/economic-mathematics/limits/vendor/katex.min.css"><style>'+style+'</style><body><h1>'+esc(title)+'</h1>'+body+'</body></html>';}
function copy(p){return (p.lead?'<p>'+inline(p.lead)+'</p>':'')+(p.formula?formula(p.formula):'')+(p.body??[]).map(s=>'<p>'+inline(s)+'</p>').join('')+(p.table?'<table><thead><tr>'+p.table.columns.map(s=>'<th>'+inline(s)+'</th>').join('')+'</tr></thead><tbody>'+p.table.rows.map(row=>'<tr>'+row.map(s=>'<td>'+inline(s)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'')+(p.prompt?'<p><strong>'+inline(p.prompt)+'</strong></p>':'');}
for(const number of [3,4]){
  const lesson=course.ECONOMIC_MATHEMATICS_LESSONS.find(l=>l.number===number),pages=selected.filter(p=>p.lesson===number),narration=number===3?course.lesson03Narration:course.lesson04Narration;
  const title='经济数学第'+number+'讲 · '+lesson.title;
  const coreCount=pages.filter(p=>p.routeRole==='core').length;
  const route='<p>两个45分钟；主线'+coreCount+'页，拓展'+(pages.length-coreCount)+'页。完整推导和答案仅供备课，课堂按揭示步骤公开。</p>'+lesson.classHours.map(h=>'<p>第'+h.hour+'课时：第'+h.slideStart+'–'+h.slideEnd+'页，45分钟。'+esc(h.activity)+'</p>').join('');
  const script=pages.map(p=>'<section><h2>'+p.localIndex+'. '+esc(p.title)+'</h2><small>'+(p.routeRole==='optional'?'拓展 · 另行安排时间':'第'+p.classHour+'课时 · 预计'+p.teachingSeconds+'秒')+' · '+esc(p.sourceLabel+'：'+p.sourceNote)+'</small>'+copy(p)+(p.historyFilm?'<p><a href="/course-assets/economic-mathematics/calculus-history/index.html">播放三分钟短片</a></p>':'')+(p.steps??[]).map((s,i)=>'<h3>公开步骤'+(i+1)+'：'+esc(s.title)+'</h3>'+(s.text?'<p>'+inline(s.text)+'</p>':'')+(s.formula?formula(s.formula):'')).join('')+'<h3>逐字讲稿</h3>'+narration[p.slideKey].map((s,i)=>'<p class="speech"><small>'+(i?'第'+i+'步公开后':'本页初始状态')+'</small><br>'+esc(s)+'</p>').join('')+'</section>').join('');
  const worksheet=course.LIMIT_EXERCISE_ACTIVITIES.filter(a=>a.lesson===number).map(a=>{
    const page=pages.find(p=>p.exerciseActivityId===a.id);
    return '<section><h2>第'+page.localIndex+'页 · '+esc(a.title)+'</h2><small>'+esc(a.level)+' · 建议'+a.minutes+'分钟</small>'+a.questions.map((q,i)=>'<p><strong>'+(i+1)+'. '+esc(q.stem)+'</strong></p>'+(q.options??[]).map((o,j)=>'<p>'+String.fromCharCode(65+j)+'. '+esc(o)+'</p>').join('')+(q.type==='short'?'<div class="work-space"></div>':'<p>选择：________</p>')).join('')+'</section>';
  }).join('');
  await writeFile(path.join(publicRoot,'lesson0'+number+'-script.html'),html(title+' · 完整讲稿与答案',route+script+'<section><h2>核对来源</h2>'+sources.map(([label,url])=>'<p><a href="'+url+'">'+label+'</a></p>').join('')+'<p>商家、扩容与合同均为给定教学假设；历史影像、文献与原创素材记录沿用短片来源清单。</p></section>'));
  await writeFile(path.join(publicRoot,'lesson0'+number+'-worksheet.html'),html(title+' · 课堂练习单','<p>姓名：_______________　班级：_______________</p>'+worksheet));
  const md=['# '+title,'','两个45分钟；主线'+coreCount+'页，拓展'+(pages.length-coreCount)+'页。拓展安排在主线结束之后，不计入90分钟。',...lesson.classHours.map(h=>'第'+h.hour+'课时：第'+h.slideStart+'–'+h.slideEnd+'页；45分钟。'+h.activity),''];
  for(const p of pages){md.push('## '+p.localIndex+'. '+p.title,'',p.teachingCue,'',...(p.lead?[p.lead]:[]),...(p.body??[]),...(p.formula?['$$'+p.formula+'$$']:[]),...(p.table?['表格：'+JSON.stringify(p.table)]:[]),...(p.prompt?[p.prompt]:[]),...(p.steps??[]).flatMap((s,i)=>['公开步骤'+(i+1)+'：'+s.title,s.text??'',s.formula?'$$'+s.formula+'$$':'']),'','逐字讲稿：',...narration[p.slideKey].map((s,i)=>(i?'第'+i+'步公开后':'初始状态')+'：'+s),'');}
  md.push('## 核对来源','',...sources.map(([label,url])=>'- ['+label+']('+url+')'),'','商家、扩容与两份合同均为给定教学假设，不能当作真实市场统计或合同报价。');
  await writeFile(path.join(root,'docs/course/economic-mathematics-lesson0'+number+'-script.md'),md.join('\n')+'\n');
}
const manifest={deckId:course.ECONOMIC_MATHEMATICS_DECK_ID,versionId:course.ECONOMIC_MATHEMATICS_VERSION_ID,canvas:[1600,1000],hours:64,slideTotal:course.ECONOMIC_MATHEMATICS_SLIDES.length,lessons:course.ECONOMIC_MATHEMATICS_LESSONS,constructivistPages:course.ECONOMIC_MATHEMATICS_SLIDES.filter(s=>s.style==='constructivist').length,pages:course.ECONOMIC_MATHEMATICS_SLIDES.map(s=>({index:s.index,slideKey:s.slideKey,lesson:s.lesson,localIndex:s.localIndex,title:s.title,layout:s.layout,style:s.style,image:s.image,steps:s.steps?.length??0,revealTitles:(s.steps??[]).map(r=>r.title),interactionId:s.interactionId,historyFilm:s.historyFilm,limitLab:s.limitLab}))};
await writeFile(path.join(root,'docs/course/economic-mathematics-deck-v2.json'),JSON.stringify(manifest,null,2)+'\n');
await mkdir(path.join(root,'output/economic-mathematics/reinforcement-2026-10-13'),{recursive:true});
await writeFile(path.join(root,'output/economic-mathematics/reinforcement-2026-10-13/chaoxing-exercises.json'),JSON.stringify(course.LIMIT_EXERCISE_ACTIVITIES,null,2)+'\n');
const exerciseDoc=['# 第三、第四讲课堂习题与参考答案','','基础选择题按组，证明与决策题独立活动；教师依课堂进度启动。答案不进入未公开的助教上下文。',''];
for(const a of course.LIMIT_EXERCISE_ACTIVITIES){const p=selected.find(p=>p.exerciseActivityId===a.id);exerciseDoc.push('## '+a.title,'',`${a.level} · 第${a.lesson}讲第${p.localIndex}页 · ${a.minutes}分钟`,'');for(const [i,q] of a.questions.entries())exerciseDoc.push(`### ${i+1}. ${q.stem}`,'',...(q.options??[]).map((o,j)=>`${String.fromCharCode(65+j)}. ${o}`),'','参考答案：'+q.answer,'','解析：'+q.explanation,'');}
await writeFile(path.join(root,'docs/course/economic-mathematics-limits-exercises.md'),exerciseDoc.join('\n').trimEnd()+'\n');
const sourceFiles=['packages/course-content/src/economic-mathematics/lesson-03-refined.ts','packages/course-content/src/economic-mathematics/lesson-04-refined.ts','packages/course-content/src/economic-mathematics/limit-exercises.ts','packages/course-content/src/economic-mathematics/limit-group-checks.ts','packages/course-content/src/economic-mathematics/limits-authoring.ts','packages/course-content/src/economic-mathematics/limits-model.ts','apps/teacher-web/src/features/economic-mathematics/LimitFigure.tsx','apps/teacher-web/src/features/economic-mathematics/LessonHistoryFilm.tsx','apps/teacher-web/src/features/economic-mathematics/limits.css'];
sourceFiles.push('packages/course-content/src/economic-mathematics/merchant-model.ts','packages/course-content/src/economic-mathematics/curriculum.ts','packages/course-content/src/economic-mathematics/slides.ts','packages/course-content/src/economic-mathematics/interactions.ts','apps/teacher-web/src/features/economic-mathematics/EconomicMathematicsTeachingSlides.tsx','apps/teacher-web/src/features/economic-mathematics/economic-mathematics.css','scripts/economic-mathematics-pdf/entry.tsx','scripts/economic-mathematics-pdf/print.css','apps/teacher-web/public/course-assets/economic-mathematics/calculus-history/poster.png','scripts/prepare-economic-limits.mjs');
const hashes=await Promise.all(sourceFiles.map(async file=>({file,sha256:createHash('sha256').update(await readFile(path.join(root,file))).digest('hex')})));
await writeFile(path.join(publicRoot,'source-fingerprints.json'),JSON.stringify({version:manifest.versionId,files:hashes},null,2)+'\n');
console.log(JSON.stringify({lessons:[3,4].map(n=>selected.filter(p=>p.lesson===n).length),pages:selected.length,courseTotal:manifest.slideTotal,activities:course.LIMIT_EXERCISE_ACTIVITIES.length,assets:'existing editorial scenes, source-verified history film, native mathematical evidence'}));
