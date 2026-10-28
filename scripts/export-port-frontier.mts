import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PORT_LESSON_NINETEEN_SLIDES as pages,PORT_EXPANSION_SOURCES,expansionTiming} from '../packages/course-content/src/port-expansion.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
await mkdir('output/port-frontier-20261028',{recursive:true});
let text='# 第19讲 · 港口AI与前沿技术：从识别、决策到可信协同\n\n2026-10-28。40页，90分钟，第20页后课间。纯讲解与完整案例，不要求学生操作、训练模型或提交。进入每页后自动展开，教师可暂停、逐步讲解和重播；阅读端显示完整材料，同步端跟随教师。\n\n## 课堂节奏\n\n| 段落 | 页码 | 分钟 |\n|---|---|---:|\n';
for(const t of expansionTiming(19))text+=`| ${t.label} | ${t.slideStart-767}—${t.slideEnd-767} | ${t.minutes} |\n`;
for(const p of pages){
 text+=`\n## ${String(p.localPage).padStart(2,'0')} · ${p.title}\n\n${p.lead}\n`;
 if(p.rows){text+='\n| '+p.rows[0]!.join(' | ')+' |\n| '+p.rows[0]!.map(()=>'---').join(' | ')+' |\n';for(const row of p.rows.slice(1))text+='| '+row.join(' | ')+' |\n';}
 for(const e of p.equations??[])text+=`\n$$${e.tex}$$\n\n${e.explanation}。\n`;
 for(const i of p.frontier?.items??[])text+=`\n- **${i.title}**：${i.body}${i.value?'；'+i.value:''}\n`;
 if(p.frontier?.caption)text+='\n图注：'+p.frontier.caption+'\n';
 text+='\n'+p.points.join('。')+'。\n\n讲解：'+p.teachingCue+'\n\n';
 for(const id of p.sourceIds??[p.source]){const s=PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES];text+=`资料：[${s.label}](${s.url})，${s.date}。${s.boundary}\n\n`;}
}
await writeFile('docs/course/port-management-lesson-nineteen-teacher.md',text);
await writeFile('output/port-frontier-20261028/authored-pages.json',JSON.stringify(pages,null,2));
console.log('Exported 40 individually authored frontier page notes.');
