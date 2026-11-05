import {writeFile,mkdir} from 'node:fs/promises';
import {forecastLessonSixteen,forecastTiming} from '../packages/course-content/src/statistical-analysis/forecast-lessons.js';
import {forecastTeacherScripts as scripts} from '../packages/course-content/src/statistical-analysis/forecast-teacher-scripts.js';
const stamp=(s:number)=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const chars=scripts.reduce((n,s)=>n+(s.paragraphs.join('').match(/[\u4e00-\u9fff]/g)?.length??0),0);
const rows=['# 第16讲完整逐页讲稿：经营预测','','90页；课堂预算90分钟，讲述60分钟、Python跟做20分钟、个人判断10分钟。',`正文汉字${chars}。预算用于备课，尚未完成实际课堂试讲与真人逐段朗读计时。`,'','教师稿保存在备课区；学生画布、课件PDF、助手上下文与学生包均使用公开课件内容。',''];
let elapsed=0;
for(const s of scripts){const page=forecastLessonSixteen[s.localIndex-1]!,time=forecastTiming(s.localIndex),end=elapsed+s.spokenSeconds+s.pauseSeconds;
 rows.push(`## ${String(s.localIndex).padStart(2,'0')}｜${page.title}`,`全局页${744+s.localIndex}；键${s.slideKey}；${stamp(elapsed)}—${stamp(end)}。`,'',...s.paragraphs.flatMap(p=>[p,'']),`> ${time.practice?'个人跟做':'停顿与观察'}：${s.pauseCue}`,'',`讲述预算${s.spokenSeconds}秒；停顿预算${s.pauseSeconds}秒。`,'');elapsed=end;}
if(elapsed!==5400)throw new Error('Lecture timing must total 90 minutes');
await mkdir(new URL('../docs/course/statistical-analysis/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/course/statistical-analysis/lecture-16-script.md',import.meta.url),rows.join('\n'));
console.log({pages:scripts.length,chars,minutes:elapsed/60});
