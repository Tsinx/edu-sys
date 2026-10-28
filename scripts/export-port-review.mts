import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PORT_LESSON_TWENTY_SLIDES,PORT_LESSON_TWENTY_ONE_SLIDES,EXPANSION_TITLES,PORT_EXPANSION_SOURCES,expansionTiming} from '../packages/course-content/src/port-expansion.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
await mkdir('output/port-review-20261028',{recursive:true});
for(const pages of [PORT_LESSON_TWENTY_SLIDES,PORT_LESSON_TWENTY_ONE_SLIDES]){
 const lesson=pages[0]!.lesson,name=lesson===20?'twenty':'twenty-one';
 let text=`# 第${lesson}讲 · ${EXPANSION_TITLES[lesson]}\n\n2026-10-28。32页、90分钟，第16页后课间。教师讲解与完整案例，无学生操作、模拟或提交。教师进入每页后自动播放，可暂停、逐步展开或重播；学生阅读端展示完整材料，同步投影端跟随教师。\n\n## 课堂节奏\n\n| 段落 | 页码 | 分钟 |\n|---|---|---:|\n`;
 for(const t of expansionTiming(lesson))text+=`| ${t.label} | ${t.slideStart-pages[0]!.index+1}—${t.slideEnd-pages[0]!.index+1} | ${t.minutes} |\n`;
 for(const p of pages){
  text+=`\n## ${String(p.localPage).padStart(2,'0')} · ${p.title}\n\n${p.lead}\n`;
  if(p.rows){text+='\n| '+p.rows[0]!.join(' | ')+' |\n| '+p.rows[0]!.map(()=>'---').join(' | ')+' |\n';for(const row of p.rows.slice(1))text+='| '+row.join(' | ')+' |\n';}
  if(p.equations)for(const e of p.equations)text+=`\n$$${e.tex}$$\n\n${e.explanation}。\n`;
  if(p.review)for(const i of p.review.items)text+=`\n- **${i.title}**：${i.body.replace(/[。；]$/u,'')}${i.value?'；'+i.value:''}。\n`;
  text+='\n'+p.points.join('。')+'。\n\n讲解：'+p.teachingCue+'\n\n';
  for(const id of p.sourceIds??[p.source]){const s=PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES];text+=`资料：[${s.label}](${s.url})，${s.date}。${s.boundary}\n\n`;}
 }
 await writeFile(`docs/course/port-management-lesson-${name}-teacher.md`,text);
}
await writeFile('output/port-review-20261028/authored-pages.json',JSON.stringify([...PORT_LESSON_TWENTY_SLIDES,...PORT_LESSON_TWENTY_ONE_SLIDES],null,2));
console.log('Exported 64 individually authored page notes and review metadata.');
