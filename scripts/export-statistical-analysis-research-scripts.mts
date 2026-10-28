import {writeFile} from 'node:fs/promises';
import {researchLessons} from '../packages/course-content/src/statistical-analysis/research-lessons.js';
import {researchTeacherScripts} from '../packages/course-content/src/statistical-analysis/research-teacher-scripts.js';
const stamp=(n:number)=>Math.floor(Math.round(n)/60)+':'+String(Math.round(n)%60).padStart(2,'0');
for(const lesson of [14,15]){
 const items=researchTeacherScripts.filter(s=>s.lesson===lesson);
 if(items.length!==48)throw new Error('48 individually authored scripts required');
 const chars=items.reduce((n,s)=>n+(s.paragraphs.join('').match(/[\u4e00-\u9fff]/g)?.length??0),0);
 const rows=['# 第'+lesson+'讲完整逐页稿','','教师备课稿；不进入学生阅读包、投影、PDF正文或助手提示。',
 '48页；正文汉字'+chars+'。90分钟备课预算：讲述70分钟、观察与个人判断20分钟。',
 '每页含承接、看图或解释顺序与转场。时间为预算，尚未完成真人朗读计时或实际课堂试讲，不能据字数宣称已试讲。',''];
 let elapsed=0;
 for(const s of items){
  const page=researchLessons[lesson-14]![s.localIndex-1]!,end=elapsed+s.spokenSeconds+s.pauseSeconds;
  rows.push('## '+String(s.localIndex).padStart(2,'0')+'｜'+page.title,
   '全局页'+(642+(lesson-14)*48+s.localIndex)+'；键 '+s.slideKey+'；讲内 '+stamp(elapsed)+'—'+stamp(end)+'。','',
   ...s.paragraphs.flatMap(p=>[p,'']),'> 观察与个人判断：'+s.pauseCue,'',
   '讲述预算'+s.spokenSeconds+'秒；停顿预算'+s.pauseSeconds+'秒。','');
  elapsed=end;
 }
 if(Math.abs(elapsed-5400)>1e-7)throw new Error('Timing mismatch');
 await writeFile(new URL('../docs/course/statistical-analysis/lecture-'+lesson+'-script.md',import.meta.url),rows.join('\n').trimEnd()+'\n');
 console.log({lesson,pages:items.length,chars,minutes:elapsed/60});
}
