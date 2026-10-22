import {writeFile} from 'node:fs/promises';
import {policyLessons,policyTiming} from '../packages/course-content/src/statistical-analysis/policy-lessons.js';
import {policyTeacherScripts as scripts} from '../packages/course-content/src/statistical-analysis/policy-teacher-scripts.js';
const stamp=(v:number)=>`${Math.floor(Math.round(v)/60)}:${String(Math.round(v)%60).padStart(2,'0')}`;
for(const lesson of [12,13]){
 const items=scripts.filter(s=>s.lesson===lesson);if(items.length!==48)throw new Error('Need all 48 scripts');
 const chars=items.reduce((n,s)=>n+(s.paragraphs.join('').match(/[\u4e00-\u9fff]/g)?.length??0),0);
 const rows=[`# 第${lesson}讲完整逐页稿`,'','教师备课稿；不放入学生项目包、投影或助手提示。',
  `48页；正文汉字${chars}。90分钟预算：讲述55分钟、个人Python/vibe coding跟做25分钟、观察与个人判断10分钟。`,
  '逐页承接句、看图/解释顺序和翻页转场在正文中；6个跟做检查点的停顿单列。时间为备课预算，没有完成真人朗读计时或实际课堂试讲。',''];
 let elapsed=0;
 for(const s of items){const p=policyLessons[lesson-12]![s.localIndex-1]!,timing=policyTiming(lesson,s.localIndex),end=elapsed+s.spokenSeconds+s.pauseSeconds;
  rows.push(`## ${String(s.localIndex).padStart(2,'0')}｜${p.title}`,`全局页${546+(lesson-12)*48+s.localIndex}；键 ${s.slideKey}；讲内 ${stamp(elapsed)}—${stamp(end)}。`,'',...s.paragraphs.flatMap(x=>[x,'']),
    `> ${timing.practice?'个人跟做':'观察与判断'}：${s.pauseCue}`,'',`讲述预算${Math.round(s.spokenSeconds)}秒；${timing.practice?'跟做':'观察'}预算${Math.round(s.pauseSeconds)}秒。`,'');elapsed=end;
 }
 if(Math.abs(elapsed-5400)>1e-7)throw new Error('Timing must total 90 minutes');
 await writeFile(new URL(`../docs/course/statistical-analysis/lecture-${lesson}-script.md`,import.meta.url),rows.join('\n').trimEnd()+'\n');
 console.log({lesson,pages:items.length,chars,minutes:elapsed/60});
}
