import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PORT_EXPANSION_SLIDES as pages,PORT_EXPANSION_SOURCES as sources,expansionTiming,EXPANSION_TITLES} from '../packages/course-content/src/port-expansion.js';
const folder=fileURLToPath(new URL('../docs/course/',import.meta.url));await mkdir(folder,{recursive:true});
for(const lesson of [9,10] as const){let minutes=0;const timing=expansionTiming(lesson);const lines=[`# 港口管理概论 · 第${lesson}讲教师讲稿`,``,`主题：${EXPANSION_TITLES[lesson]} 48页，90分钟，45＋45分钟。第24页后课间。`,``,`教师主导逐步展开与情境比较，个人口头或纸面判断，无分组和个人仿真提交。`,``,`## 节奏`,``,`| 时间 | 页码 | 内容 |`,`|---|---|---|`,...timing.map(t=>{const start=minutes;minutes+=t.minutes;return `| ${start}—${minutes}分钟 | ${t.slideStart-(293+(lesson-7)*48)}—${t.slideEnd-(293+(lesson-7)*48)} | ${t.label} |`;}),``];
 for(const p of pages.filter(p=>p.lesson===lesson))lines.push(`## ${String(p.localPage).padStart(2,'0')}　${p.title}`,``,p.lead,``,`**本页讲授与操作**`, ``,p.teachingCue,``,`**投影要点**`, ``,...p.points.map(t=>`- ${t}`),``,...(p.options?[`**演示选项：** ${p.options.join('；')}`,``]:[]),...(p.reveal?[`**教师参考解析（受控揭示）：** ${p.reveal}`,``]:[]),`**来源：** [${sources[p.source].label}](${sources[p.source].url}) · ${sources[p.source].date}`,``,`**助手边界：** ${p.assistantCue}`,``);
 await writeFile(folder+`port-management-lesson-${lesson===9?'nine':'ten'}-teacher.md`,lines.join('\n'));
}
const selected=pages.filter(p=>p.lesson===9||p.lesson===10);
const lines=['# 第9—10讲来源台账','','访问复核：2026-09-22。公开案例、通用框架与独立教学情境分开使用。','','| 编号 | 来源 | 日期 | 页面 | 边界 |','|---|---|---|---|---|',...Object.entries(sources).filter(([id])=>selected.some(p=>p.source===id)).map(([id,s])=>`| ${id} | [${s.label}](${s.url}) | ${s.date} | ${selected.filter(p=>p.source===id).map(p=>`${p.lesson}-${p.localPage}`).join('、')} | ${s.boundary} |`),'','图像复用现有港口教学复原素材，新图解为代码原生SVG。图中结构不等于真实港口资产清单；价格、货流、支付及交付记录均为本课程独立教学设定。',''];
await writeFile(folder+'port-management-lessons-nine-ten-sources.md',lines.join('\n'));console.log('Lesson 9-10 notes and sources exported.');
