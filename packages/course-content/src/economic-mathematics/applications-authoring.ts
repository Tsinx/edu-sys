import {page,type DifferentialPage as Page} from './differentiation-authoring.js';
import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {SHAPE_CHOICE_ACTIVITIES,SHAPE_WRITTEN_ACTIVITIES} from './applications-exercises.js';
export {page}; export type ApplicationPage=Page;
export function shapePractice(number:number):Page {
 const a=SHAPE_CHOICE_ACTIVITIES[number-1]!;
 return page(a.title.replace('第十三讲·',''),undefined,[],'请独立完成两道单选，并写一条依据。'+a.questions.map((q,i)=>`第${i+1}题，${q.stem}${q.options!.map((o,k)=>`${'ABCD'[k]}，${o}。`).join('')}`).join(''),{seconds:180,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:2,exerciseActivityId:a.id,table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(k=>a.questions.map(q=>`${'ABCD'[k]}. ${q.options![k]}`))},steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation,speech:`第${i+1}题选${q.answer}。${q.explanation}`}))});
}
export function shapeWritten(index:number):Page {
 const a=SHAPE_WRITTEN_ACTIVITIES[index]!,q=a.questions[0]!;
 return page(a.title.replace('第十三讲·',''),undefined,[q.stem],q.stem+`请独立作答${a.minutes}分钟，写出推理，再查看反馈。`,{seconds:a.minutes*60,kind:'exercise',layout:'exercise',exerciseMinutes:a.minutes,exerciseActivityId:a.id});
}
export function applicationLesson(number:12|13,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],split:number,pages:readonly Page[]) {
 for(const [h,p]of[pages.slice(0,split),pages.slice(split)].entries())if(p.reduce((n,s)=>n+s.seconds,0)!==2700)throw Error(`APPLICATION_HOUR:${number}:${h+1}:${p.reduce((n,s)=>n+s.seconds,0)}`);
 const key=(i:number)=>`em-l${number}-applications-20261030-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,...p},i):Slide=>{if(speech.length!==1+(p.steps?.length??0))throw Error('APPLICATION_SPEECH:'+number+':'+i);return{section:title,kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'概念模型',sourceNote:'自制数学证据',routeRole:'core',...p,slideKey:key(i),compositionId:`em-applications-${number}-${i+1}`,kicker:`经济数学 / 第${number===12?'十二':'十三'}讲 / 第${i<split?'一':'二'}课时`,classHour:i<split?1:2,moduleId:`applications-${number}-${i<split?1:2}`,teachingSeconds:seconds,assistantCue:'仅解释当前已公开题设、公式、图形和步骤，不提供未公开答案或之后页面的推导。洛必达先核对原形式、方向、可导性与非零分母导数，不反向推理。凹凸按弦线不等式和英文convex/concave命名，明确与高数凹弧/凸弧的用语差异；严格凸不要求二阶导数处处为正。区分局部、全局、必要、充分、存在与唯一。'};});
 const lesson:Lesson={number,title,unit:4,unitTitle:'导数应用、边际与弹性分析',hours:2,expectedSlides:pages.length,coreQuestion:question,outcomes,prerequisites:number===12?['柯西中值定理','求导法则与极限']:['导数与中值定理','闭区间连续函数最值定理'],exerciseCapability:outcomes.join('；'),route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:split,activity:routes[0]},{hour:2,minutes:45,slideStart:split+1,slideEnd:pages.length,activity:routes[1]}],slides};
 return{lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
