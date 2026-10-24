/** Reading copies and individual, authored teacher cues; canonical pages remain in course-content. */
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PORT_LESSON_FIFTEEN_SLIDES,PORT_LESSON_SIXTEEN_SLIDES,PORT_TRANSITION_SOURCES,PORT_TRANSITION_FILMS,PORT_EXPANSION_SOURCES,expansionTiming,expansionStart} from '../packages/course-content/src/port-expansion.js';
import {PortTransitionComposition} from '../apps/teacher-web/src/features/port-expansion/PortTransitionComposition.js';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const require=createRequire(resolve('apps/teacher-web/package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const out=resolve('output/port-transition-delivery');await mkdir(out,{recursive:true});await mkdir(resolve(out,'视频'),{recursive:true});
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const css=(await Promise.all(['port-trade.css','port-transition.css'].map(s=>readFile(resolve('apps/teacher-web/src/features/port-expansion',s),'utf8')))).join('\n');
for(const pages of [PORT_LESSON_FIFTEEN_SLIDES,PORT_LESSON_SIXTEEN_SLIDES]){
 const lesson=pages[0]!.lesson,title=pages[0]!.lessonTitle,times=expansionTiming(lesson);let minute=0;
 let notes=`# 第${lesson}讲 ${title}\n\n32页，90分钟，上下半讲各45分钟。第${lesson===15?'15讲讨论日常业务与数据设计，区别于第12讲中断恢复。':'16讲用五座港口的案例贯穿过程解释，再用组合选择和条件变化讨论取舍。案例页用“下一段”手动推进，“回到开头”可以重新讲解。'}\n\n| 时间 | 页码 | 内容 |\n|---|---|---|\n`;
 for(const b of times){notes+=`| ${minute}—${minute+b.minutes}分钟 | ${b.slideStart-expansionStart(lesson)+1}—${b.slideEnd-expansionStart(lesson)+1} | ${b.label} |\n`;minute+=b.minutes;}
 let html='';
 for(const p of pages){
  notes+=`\n## ${p.localPage}. ${p.title}\n\n${p.lead}\n\n${p.teachingCue}\n`;
  if(p.reveal)notes+=`\n参考解析：${p.reveal}\n`;
  if(p.mediaId){const f=PORT_TRANSITION_FILMS[p.mediaId as keyof typeof PORT_TRANSITION_FILMS];notes+=`\n片头：${f.durationMs/1000}秒，视频/${f.src.split('/').at(-1)}。\n`;}
  notes+=`\n资料：${p.sourceIds?.map(id=>{const s=PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES];return `[${s.label}](${s.url})（${s.date}）。${lesson===16?'':s.boundary}`;}).join('；')}\n`;
  let markup=renderToStaticMarkup(React.createElement(PortTransitionComposition,{page:p,state:{progress:1,option:0,revealed:false}}));
  const paths=[p.image,p.mediaId?PORT_TRANSITION_FILMS[p.mediaId as keyof typeof PORT_TRANSITION_FILMS].poster:undefined].filter(Boolean) as string[];
  for(const path of paths){const b64=(await readFile(resolve('apps/teacher-web/public'+path))).toString('base64');markup=markup.replaceAll(path,'data:image/jpeg;base64,'+b64);}
  for(const f of Object.values(PORT_TRANSITION_FILMS))markup=markup.replaceAll(f.src,'视频/'+f.src.split('/').at(-1));
  html+=`<section class="frame" id="p${p.localPage}">${markup}</section>`;
  if(p.mediaId){const f=PORT_TRANSITION_FILMS[p.mediaId as keyof typeof PORT_TRANSITION_FILMS];html+=`<section class="video"><h2>${esc(f.title)}</h2><video controls preload="metadata" src="视频/${f.src.split('/').at(-1)}"></video><p>${esc(PORT_TRANSITION_SOURCES[f.source].boundary)}</p></section>`;}
 }
 await writeFile(resolve('docs/course',`port-management-lesson-${lesson===15?'fifteen':'sixteen'}-teacher.md`),notes,'utf8');
 await writeFile(resolve(out,`第${lesson}讲-逐页教师稿.md`),notes,'utf8');
 const base=`*{box-sizing:border-box}body{margin:0;background:#dce5dc;color:#153f50;font-family:'Microsoft YaHei',sans-serif}main>header,.video{max-width:1100px;margin:30px auto;padding:20px;font-size:19px;line-height:1.7}nav{display:flex;flex-wrap:wrap;gap:15px}a{color:inherit}.frame{margin:24px auto;width:calc(1600px * var(--scale,1));height:calc(1000px * var(--scale,1));position:relative}.port-expansion-slide{position:relative;width:1600px;height:1000px;overflow:hidden;transform:scale(var(--scale,1));transform-origin:0 0}.port-expansion-slide footer{position:absolute;display:flex;justify-content:space-between;gap:20px}video{width:100%;aspect-ratio:1.6;background:#103444}@media print{@page{size:1600px 1000px;margin:0}body{background:white}.frame{margin:0;width:1600px;height:1000px;break-after:page}.port-expansion-slide{transform:none}main>header,.video{display:none}}`;
 await writeFile(resolve(out,`第${lesson}讲-课堂阅读.html`),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第${lesson}讲 ${esc(title)}</title><style>${base}\n${css}</style><main><header><h1>第${lesson}讲 ${esc(title)}</h1><p>32页、90分钟。阅读版显示公开图解与第一个教学选项；选项切换、逐步展开及解析由课程系统的教师工具提供。本文件不含教师稿与隐藏答案。</p><nav>${pages.map(p=>`<a href="#p${p.localPage}">${p.localPage}</a>`).join('')}</nav></header>${html}</main><script>function fit(){document.documentElement.style.setProperty('--scale',Math.min(1,(innerWidth-24)/1600))}fit();addEventListener('resize',fit)</script></html>`,'utf8');
}
for(const f of Object.values(PORT_TRANSITION_FILMS))for(const path of [f.src,f.poster,f.captions])await copyFile(resolve('apps/teacher-web/public'+path),resolve(out,'视频',path.split('/').at(-1)!));
for(const name of ['index.html','edl.json','stills.json'])await copyFile(resolve('apps/teacher-web/public/course-assets/port-management/transition-media',name),resolve(out,'视频',name));
let sources='# 第15—16讲案例资料与来源\n\n核对日期：2026-10-23。历史案例、政策与独立教学推演分别标明。\n';
for(const [id,s] of Object.entries(PORT_TRANSITION_SOURCES))sources+=`\n## ${id} · ${s.label}\n\n[原始资料](${s.url})，${s.date}。\n\n${s.boundary}\n`;
await writeFile(resolve('docs/course/port-management-lessons-fifteen-sixteen-sources.md'),sources,'utf8');
await writeFile(resolve(out,'资料与边界.md'),sources,'utf8');
console.log(JSON.stringify({lessons:2,pages:64,minutes:180,films:Object.values(PORT_TRANSITION_FILMS).map(f=>({id:f.id,seconds:f.durationMs/1000})),out}));

await copyFile(resolve('docs/course/port-management-lessons-fifteen-sixteen-worksheet.md'),resolve(out,'个人课堂任务单.md'));
await copyFile(resolve('docs/course/port-management-lessons-fifteen-sixteen-design.md'),resolve(out,'教学安排与计算说明.md'));
await writeFile(resolve(out,'使用说明.md'),'# 港口管理概论第15—16讲\n\n各32页、90分钟。课程系统提供逐步展开、选项与教师解析；课堂阅读HTML显示完整公开材料和默认情境，不含隐藏解析。保持视频子目录与两份HTML的相对位置，浏览器打开阅读HTML即可使用。\n\n两份逐页教师稿含提问、操作、计算、常见误解与参考解析；个人课堂任务单可打印。视频/index.html汇总片头、原报道、剪辑入出点和校验记录。\n\n第15讲片头45秒，第16讲37.4秒，保留原台标与原声，统一响度；原新闻画面清晰度以源视频为限。原报道版权归原权利人。\n\n\n','utf8');
