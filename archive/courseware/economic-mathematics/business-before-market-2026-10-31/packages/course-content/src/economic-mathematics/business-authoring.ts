import {page,type DifferentialPage as Page} from './differentiation-authoring.js';
import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {BUSINESS_ACTIVITIES} from './business-exercises.js';
export {page};export type BusinessPage=Page;
export function businessPractice(lesson:14|15,number:number):Page{
 const a=BUSINESS_ACTIVITIES.find(a=>a.lesson===lesson&&a.number===number)!;
 return page(a.title.split('：')[1]!,undefined,[],`请独立完成两道单选，用两分钟作答，再核对依据。${a.questions.map((q,i)=>`第${i+1}题。${q.stem}${q.options!.map((o,k)=>`${'ABCD'[k]}，${o}。`).join('')}`).join('')}`,{seconds:180,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:2,exerciseActivityId:a.id,sourceNote:'个人练习 · 两题均为单选',prompt:'独立作答2分钟，写一条依据；再逐题核对。',table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(k=>a.questions.map(q=>`${'ABCD'[k]}. ${q.options![k]}`))},steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation,speech:`第${i+1}题选${q.answer}。${q.explanation}`}))});
}
export function businessWritten(lesson:14|15,number:7|8):Page{
 const a=BUSINESS_ACTIVITIES.find(a=>a.lesson===lesson&&a.number===number)!,q=a.questions[0]!;
 return page(a.title.split('：')[1]!,undefined,[q.stem],`请独立作答${a.minutes}分钟，保留公式的条件和判断依据。${q.stem}`,{seconds:a.minutes*60,kind:'exercise',layout:'exercise',exerciseMinutes:a.minutes,exerciseActivityId:a.id,sourceNote:`个人书面练习 · ${a.minutes}分钟`});
}
export function businessLesson(number:14|15,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],pages:readonly Page[]){
 const split=24;
 for(const [i,p]of[pages.slice(0,split),pages.slice(split)].entries()){const seconds=p.reduce((n,p)=>n+p.seconds,0);if(seconds!==2700)throw Error(`BUSINESS_TIME:${number}:${i+1}:${seconds}`);}
 const key=(i:number)=>`em-l${number}-business-20261030-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0))throw Error(`BUSINESS_SPEECH:${number}:${i+1}`);
  return{section:title,kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'概念模型',sourceNote:'给定模型 · 自制图形',routeRole:'core',...p,slideKey:key(i),compositionId:`em-business-${number}-${i+1}`,kicker:`经济数学 / 第${number===14?'十四':'十五'}讲 / 第${i<split?'一':'二'}课时`,classHour:i<split?1:2,teachingSeconds:seconds,moduleId:`business-${number}-${i<split?1:2}`,assistantCue:'只讲当前公开的题设、图形、动态读数与步骤，不泄露未公开反馈。商业案例均为给定教学模型，不能宣称实证因果。统一价格作用于全部销量，销量与产量相同；连续近似与整数增量分开。MR和MC都对销量求导。MR=MC和加成率等式只在可导内点最优且其余条件满足时使用；核对全局凹性、容量、退出选项与成本是否可避免。弹性按本讲负号惯例，p,q正，需求下降；局部弹性不自动决定有限变动或全局最优。反需求导数要求非零原导数。术语必须先解释。'};
 });
 const lesson:Lesson={number,title,unit:4,unitTitle:'导数应用、边际与弹性分析',hours:2,expectedSlides:pages.length,coreQuestion:question,outcomes,prerequisites:number===14?['第13讲极值、凹性与全局判据','第2讲函数、反函数与经济定义域','第10讲微分与实际增量']:['第14讲统一定价、边际量与容量约束','第9讲反函数求导与对数求导','第13讲驻点与全局判据'],exerciseCapability:outcomes.join('；'),route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:split,activity:routes[0]},{hour:2,minutes:45,slideStart:split+1,slideEnd:pages.length,activity:routes[1]}],slides};
 return{lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
