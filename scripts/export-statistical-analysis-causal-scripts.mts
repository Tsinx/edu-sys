import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {statisticalAnalysisTeacherScripts as scripts} from '../packages/course-content/src/statistical-analysis/causal-teacher-scripts.js';
import {causalLessons} from '../packages/course-content/src/statistical-analysis/causal-lessons.js';
const root=resolve(import.meta.dirname,'..');
const stamp=(seconds:number)=>{const rounded=Math.round(seconds);return `${Math.floor(rounded/60)}:${String(rounded%60).padStart(2,'0')}`;};
for(const lesson of [10,11]){
 const pages=scripts.filter(p=>p.lesson===lesson);if(pages.length!==48)throw new Error(`Missing lecture ${lesson} scripts`);
 const title=lesson===10?'因果推断基础与匹配、加权方法':'面板数据与固定效应模型';
 const chars=pages.reduce((n,p)=>n+(p.paragraphs.join('').match(/[\u4e00-\u9fff]/g)?.length??0),0);
 const spoken=pages.reduce((n,p)=>n+p.spokenSeconds,0),pause=pages.reduce((n,p)=>n+p.pauseSeconds,0);
 if(Math.abs(spoken-4200)>.01||Math.abs(pause-1200)>.01)throw new Error('Timing must total 70 + 20 minutes');
 let elapsed=0;
 const text=[`# 第${lesson}讲逐字稿：${title}`,'','教师备课文档；不进入学生画布、投影或PDF正文。','',`48页；总预算90分钟（讲述70分钟，观察与个人判断20分钟）；正文汉字${chars}。`,
 '时间是按页分配的备课预算，并非已完成实际试讲。正文自然语速需约每分钟200—230汉字；公式与图形需留足指示和观察时间。不得宣称已完成真人朗读或实际课堂验收。',
 '每页末段承担下一页转场；下一页首段承接前页。正文、停顿与时长均从同一稿源导出。',''];
 for(const p of pages){const page=causalLessons[lesson-10]![p.localIndex-1]!,end=elapsed+p.spokenSeconds+p.pauseSeconds;
  text.push(`## ${String(p.localIndex).padStart(2,'0')}｜${page.title}`,`全局页${450+(lesson-10)*48+p.localIndex}；键 ${p.slideKey}；讲内 ${stamp(elapsed)}—${stamp(end)}。`,'',...p.paragraphs.flatMap(s=>[s,'']),`> 观察与思考：${p.pauseCue}`,'',`讲述预算${Math.round(p.spokenSeconds)}秒；停顿预算${Math.round(p.pauseSeconds)}秒。`,'');elapsed=end;
 }
 for(const folder of ['docs/course/statistical-analysis','output/statistical-analysis-causal']){await mkdir(resolve(root,folder),{recursive:true});await writeFile(resolve(root,folder,`lecture-${lesson}-script.md`),text.join('\n').trimEnd()+'\n');}
 console.log(JSON.stringify({lesson,pages:pages.length,chineseCharacters:chars,spokenMinutes:spoken/60,pauseMinutes:pause/60}));
}
