import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {CONTINUITY_DERIVATIVE_EXERCISES} from './continuity-derivative-exercises.js';
export type CalculusPage=Omit<Partial<Slide>,'teachingSeconds'> & {title:string;seconds:number;teachingCue:string;speech:readonly string[]};
export function calculusPractice(lesson:6|7,number:number):CalculusPage{
 const a=CONTINUITY_DERIVATIVE_EXERCISES.find(a=>a.lesson===lesson&&a.number===number)!;
 return {title:a.title.replace(/^第[六七]讲·/,''),seconds:180,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:2,exerciseActivityId:a.id,sourceNote:'个人练习 · 两题均为单选',
 table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(i=>a.questions.map(q=>`${'ABCD'[i]}. ${q.options[i]}`))},
 prompt:'请独立作答2分钟，每题写出一条依据；随后逐题核对。',steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation})),
 teachingCue:'个人独立作答，不组织小组讨论。两分钟作答，一分钟逐题反馈；基础未稳时可延长停留，减少课末拓展。',
 speech:[`请独立完成两道题，并写下一条判断依据。${a.questions.map((q,i)=>`第${i+1}题，${q.stem}${q.options.map((o,k)=>`${'ABCD'[k]}，${o}。`).join('')}`).join('')}请先完成作答，再逐题核对。`,...a.questions.map((q,i)=>`第${i+1}题选${q.answer}。${q.explanation}`)]};
}
/** Structural checks only; all page copy, evidence, questions and speech are authored explicitly. */
export function calculusLesson(number:6|7,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],split:number,pages:readonly CalculusPage[]){
 const core=pages.filter(p=>p.routeRole!=='optional');
 if(core.length!==pages.slice(0,core.length).filter(p=>p.routeRole!=='optional').length)throw Error('CALCULUS_OPTIONAL_ORDER');
 for(const [i,span]of[core.slice(0,split),core.slice(split)].entries()){const seconds=span.reduce((n,p)=>n+p.seconds,0);if(seconds!==2700)throw Error(`CALCULUS_TIME:${number}:${i+1}:${seconds}`);}
 const key=(i:number)=>`em-l0${number}-calculus-20261017-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,teachingCue,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0))throw Error(`CALCULUS_SPEECH:${number}:${i+1}:${p.title}`);
  const hour=i<split?1:2;
  return {section:number===6?'连续性与区间上的存在性':'导数的定义、条件与局部变化',kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'概念模型',sourceNote:'数学例题',routeRole:'core',
   assistantCue:'仅使用当前公开的题设和步骤。个人练习反馈未揭示时不得泄露。先说明新术语；核对定义域、内点、单侧及有限极限条件。定理条件不满足不等于结论必错。商业函数为给定的教学模型，连续产量是明确假设；导数不等于有限增量。尚未教授洛必达、泰勒和一般求导法则。',
   ...p,slideKey:key(i),compositionId:`em-l0${number}-calculus-${i+1}`,kicker:`经济数学 / 第${number===6?'六':'七'}讲 / ${p.routeRole==='optional'?'拓展思考':'第'+hour+'课时'}`,classHour:hour,teachingSeconds:seconds,moduleId:`calculus-${number}-${hour}`,
   teachingCue:`${p.routeRole==='optional'?'拓展另行安排。':'预计'+seconds+'秒。'}${teachingCue}`};
 });
 const lesson:Lesson={number,title,unit:number===6?2:3,unitTitle:number===6?'极限与连续':'导数与微分',hours:2,expectedSlides:slides.length,coreQuestion:question,outcomes,exerciseCapability:outcomes.join('；'),
 prerequisites:number===6?['第三、四讲极限、左右极限与误差语言','第五讲重要极限与等价']:['第六讲连续性与区间条件','高中代数、第三至第五讲极限'],route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:split,activity:routes[0]},{hour:2,minutes:45,slideStart:split+1,slideEnd:core.length,activity:routes[1]}],slides};
 return {lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
