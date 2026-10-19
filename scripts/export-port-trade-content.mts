/** Export the authored web compositions as portable reading copies and teacher notes. */
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PORT_LESSON_THIRTEEN_SLIDES,PORT_LESSON_FOURTEEN_SLIDES,PORT_TRADE_SOURCES,PORT_TRADE_FILMS,expansionTiming,expansionStart,type PortExpansionPage} from '../packages/course-content/src/port-expansion.js';
import {PortTradeComposition} from '../apps/teacher-web/src/features/port-expansion/PortTradeComposition.js';

const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const require=createRequire(resolve(root,'apps/teacher-web/package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const out=resolve('output/port-trade-delivery');await mkdir(out,{recursive:true});await mkdir(resolve(out,'视频'),{recursive:true});
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const css=await readFile(resolve('apps/teacher-web/src/features/port-expansion/port-trade.css'),'utf8');
const baseCss=`*{box-sizing:border-box}body{margin:0;background:#d9e1d6;font-family:'Microsoft YaHei',sans-serif;color:#163f50}main>header{max-width:1100px;padding:24px;margin:0 auto;font-size:19px;line-height:1.7}nav{display:flex;flex-wrap:wrap;gap:8px}nav a{padding:3px 10px;color:#275f70}.frame{margin:24px auto;width:calc(1600px * var(--scale,1));height:calc(1000px * var(--scale,1));position:relative}.port-expansion-slide{position:relative;width:1600px;height:1000px;overflow:hidden;transform:scale(var(--scale,1));transform-origin:0 0}.port-expansion-slide footer{position:absolute;display:flex;justify-content:space-between;gap:16px}a{color:inherit}.media-reading{max-width:1100px;margin:12px auto 35px;padding:20px;background:#f4f0e3;font-size:20px;line-height:1.7}.media-reading video{display:block;width:100%;aspect-ratio:1.6;background:#103444}@media print{@page{size:1600px 1000px;margin:0}body{background:white}main>header,.media-reading{display:none}.frame{margin:0;width:1600px;height:1000px;break-after:page}.port-expansion-slide{transform:none}a{text-decoration:none}}`;
for(const pages of [PORT_LESSON_THIRTEEN_SLIDES,PORT_LESSON_FOURTEEN_SLIDES]){
 const lesson=pages[0]!.lesson,title=pages[0]!.lessonTitle;
 let content='';
 for(const p of pages){
  let markup=renderToStaticMarkup(React.createElement(PortTradeComposition,{page:p,state:{progress:1,option:0,revealed:false}}));
  for(const f of Object.values(PORT_TRADE_FILMS)){
   const file=resolve(root,'apps/teacher-web/public'+f.poster),base64=(await readFile(file)).toString('base64');
   markup=markup.replaceAll(f.poster,'data:image/jpeg;base64,'+base64).replaceAll(f.src,'视频/'+f.src.split('/').at(-1));
  }
  content+=`<section class="frame" id="p${p.localPage}">${markup}</section>`;
  if(p.mediaId){const f=PORT_TRADE_FILMS[p.mediaId];content+=`<section class="media-reading"><p>${escape(f.title)} · ${f.durationMs/1000}秒</p><video controls preload="metadata" src="视频/${f.src.split('/').at(-1)}"><track kind="captions" src="视频/${f.captions.split('/').at(-1)}" srclang="zh" label="中文观察字幕"></video><p>${escape(PORT_TRADE_SOURCES[f.source].boundary)}</p></section>`;}
 }
 const toc=pages.map(p=>`<a href="#p${p.localPage}">${p.localPage}</a>`).join('');
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第${lesson}讲 · ${escape(title)}</title><style>${baseCss}\n${css}</style><main><header><h1>第${lesson}讲 · ${escape(title)}</h1><p>课堂阅读版 · ${pages.length}页 · 90分钟。视频可在相应画面后播放；图解显示完整公开材料，任务解析和教师稿保留在独立教师文件中。网页课件的逐步展开与选项切换请使用课程系统。</p><nav>${toc}</nav></header>${content}</main><script>function size(){document.documentElement.style.setProperty('--scale',Math.min(1,Math.max(.15,(innerWidth-24)/1600)))}size();addEventListener('resize',size)</script></html>`;
 await writeFile(resolve(out,`第${lesson}讲-课堂阅读.html`),html,'utf8');
 const timing=expansionTiming(lesson);let notes=`# 第${lesson}讲 ${title}\n\n90分钟，前四段45分钟、后四段45分钟。每页教师稿在投影画布之外。课堂阅读版不含隐藏解析；教师文件包含参考解释。\n\n| 时间 | 页码 | 内容 |\n|---|---|---|\n`;let t=0;
 for(const b of timing){notes+=`| ${t}—${t+b.minutes}分钟 | ${b.slideStart-expansionStart(lesson)+1}—${b.slideEnd-expansionStart(lesson)+1} | ${b.label} |\n`;t+=b.minutes;}
 for(const p of pages){notes+=`\n## ${p.localPage}. ${p.title}\n\n${p.lead}\n\n${p.teachingCue}\n`;if(p.reveal)notes+=`\n参考解析：${p.reveal}\n`;if(p.mediaId){const f=PORT_TRADE_FILMS[p.mediaId];notes+=`\n视频：${f.title}，${f.durationMs/1000}秒；文件：视频/${f.src.split('/').at(-1)}。\n`;}notes+=`\n资料：${p.sourceIds?.map(id=>{const s=PORT_TRADE_SOURCES[id as keyof typeof PORT_TRADE_SOURCES];return s?`[${s.label}](${s.url})（${s.date}）`:id;}).join('；')}。\n`;}
 await writeFile(resolve(out,`第${lesson}讲-逐页教师稿.md`),notes,'utf8');
 await writeFile(resolve('docs/course',`port-management-lesson-${lesson===13?'thirteen':'fourteen'}-teacher.md`),notes,'utf8');
}
for(const f of Object.values(PORT_TRADE_FILMS))for(const path of [f.src,f.poster,f.captions])await copyFile(resolve(root,'apps/teacher-web/public'+path),resolve(out,'视频',path.split('/').at(-1)!));
for(const name of ['index.html','edl.json'])await copyFile(resolve('apps/teacher-web/public/course-assets/port-management/trade-media',name),resolve(out,'视频',name));
let sources='# 港口管理概论第13—14讲：来源与证据边界\n\n核对日期：2026-10-19。法规、历史记录、新闻影像和课程情境分别解释。\n';
for(const [id,s] of Object.entries(PORT_TRADE_SOURCES))sources+=`\n## ${id} / ${s.label}\n\n日期：${s.date}。\n\n[原始资料](${s.url})\n\n${s.boundary}\n`;
await writeFile(resolve(out,'来源与证据边界.md'),sources,'utf8');await writeFile(resolve('docs/course/port-management-lessons-thirteen-fourteen-sources.md'),sources,'utf8');
const findings=[...PORT_LESSON_THIRTEEN_SLIDES,...PORT_LESSON_FOURTEEN_SLIDES].filter(p=>p.reveal).map(p=>({lesson:p.lesson,page:p.localPage,title:p.title,answer:p.reveal}));
const audit={lessons:[{lesson:13,pages:32,minutes:90},{lesson:14,pages:40,minutes:90}],publicCanvas:'1600x1000',videoCount:4,videoSeconds:Object.values(PORT_TRADE_FILMS).reduce((s,f)=>s+f.durationMs/1000,0),sources:Object.keys(PORT_TRADE_SOURCES).length,answerPages:findings.length,browserAcceptance:'用户明确要求先忽略浏览器连接故障，未执行实际浏览器操作验收。'};
await writeFile(resolve(out,'内容交付记录.json'),JSON.stringify(audit,null,2)+'\n');
await writeFile(resolve(out,'layout-inputs.json'),JSON.stringify([...PORT_LESSON_THIRTEEN_SLIDES,...PORT_LESSON_FOURTEEN_SLIDES].map(p=>({slideKey:p.slideKey,title:p.title,lead:p.lead,visual:p.visual,rows:p.rows??[],points:p.points})),null,2)+'\n');
await writeFile(resolve(out,'使用说明.md'),`# 港口管理概论：第13—14讲\n\n第13讲32页，第14讲40页，各90分钟。两讲沿用澄江机电三票货物的连续案例。\n\n## 离线阅读\n\n解压完整文件夹后，用浏览器打开“第13讲-课堂阅读.html”或“第14讲-课堂阅读.html”。相应画面后可播放本地视频；“视频/index.html”集中列出4段节选、原报道链接、剪辑范围和下载入口。请保留视频子目录与HTML的相对位置。\n\n课堂阅读版展示完整公开材料，可按浏览器打印功能打印；不含隐藏任务解析。网页课程系统提供逐步展开、教学选项、解析揭示及统一教师工具栏。\n\n## 教师材料\n\n“逐页教师稿”各含90分钟节奏、每页讲授提示、课堂任务、参考解析和视频位置。“来源与证据边界”列29项资料，新闻日期和教学情境分别标识。\n\n## 内容覆盖\n\n第13讲包含单证核验、海关申报及手续、并行业务、放行与交付、时间条件、运输费用和证据诊断。第14讲包含中国保税制度沿革、类型辨析、货物流向、账货管理、业务功能，以及两路果园港、西永、国际铁路港、江津、涪陵、万州、永川七区的比较和成本演算。\n\n## 当前验证\n\n已完成静态内容及助手上下文检查、教学计算检查、视频完整解码、音轨及文件检查、全仓类型检查和前端生产构建。实际浏览器、投影音响和课堂操作验收按用户要求暂缓；课堂阅读版与课程系统的交互能力有所区别。\n`,'utf8');
await writeFile(resolve(out,'课堂任务单.md'),`# 第13—14讲个人课堂任务单\n\n## 第13讲：A货为什么仍在等待\n\n已知6时卸船，8时30分取得相应海关放行，工厂要求16时到货。先记录：\n\n| 项目 | 我的记录 |\n|---|---|\n| 最初判断 | |\n| 最希望查看的一项记录 | |\n| 该记录能够排除什么解释 | |\n\n得到新回执后补充：承运人交付条件7时满足，码头9时可安排，运输14时就绪。教学假设所有条件就绪后另需30分钟出闸，公路运输3小时。\n\n| 项目 | 我的记录 |\n|---|---|\n| 修订的判断与具体证据 | |\n| 预计影响及仍未计入的条件 | |\n| 下一步联系谁、核实什么 | |\n| 本次发现 | |\n\n## 第14讲：B与C应该选择什么路径\n\nB未来分批供国内工厂，C境内外去向待定。先核查适用条件，再作比较；B教学计算采用期末全部内销。延期税款100万元，年资金成本8%，增量费用6,000元加每天100元；不反推实际税率，其他共同成本与抵扣时点暂不计。\n\n| 项目 | B货 | C货 |\n|---|---|---|\n| 企业具体需求 | | |\n| 建议路径与服务 | | |\n| 一条需求或成本依据 | | |\n| 尚需核查的业务条件 | | |\n| 复核触发点 | | |\n\n变化卡：B改为30天内使用完，C新增一笔境内订单。各自修订一项判断并说明机制。\n\n本次发现：\n\n同桌质询：你的建议最依赖哪一项尚未验证的条件？\n\n每人保留自己的判断与修订。纸面或现有答题功能均可，不将本机保存视为教师已收到。\n`,'utf8');
console.log(JSON.stringify(audit));
