import type { EconomicMathematicsAuthoredSlide as Slide, EconomicMathematicsLessonDefinition as Lesson } from './types.js';
import { LIMIT_MASTERY_EXERCISES } from './limit-mastery-exercises.js';
export type MasteryPage = Omit<Partial<Slide>,'teachingSeconds'> & {title:string;seconds:number;teachingCue:string;speech:readonly string[]};
export function personalPractice(lesson:4|5,number:number): MasteryPage {
  const a=LIMIT_MASTERY_EXERCISES.find(a=>a.lesson===lesson&&a.number===number)!;
  return {title:a.title.replace(/^第[四五]讲·/,''),seconds:180,kind:'exercise',layout:'table',conceptCheck:true,
    exerciseMinutes:2,exerciseActivityId:a.id,sourceNote:'个人练习 · 两题均为单选',
    prompt:'请独立作答2分钟，每题写出一个判断依据；完成后再查看反馈。',
    table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(i=>a.questions.map(q=>`${'ABCD'[i]}. ${q.options[i]}`))},
    steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation})),
    teachingCue:'每人独立提交；两分钟作答，一分钟逐题反馈。不组织小组讨论，不自动公开答案。',
    speech:[`请独立完成两道选择题，用两分钟写下各自的答案与理由。${a.questions.map((q,i)=>`第${i+1}题，${q.stem}${q.options.map((o,j)=>`${'ABCD'[j]}，${o}。`).join('')}`).join('')}完成后再查看反馈。`,
      ...a.questions.map((q,i)=>`第${i+1}题选${q.answer}。${q.explanation}`)]};
}
export function masteryLesson(number:4|5,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],split:number,pages:readonly MasteryPage[]){
  const core=pages.filter(p=>p.routeRole!=='optional');
  if(core.length!==pages.slice(0,core.length).filter(p=>p.routeRole!=='optional').length)throw new Error('MASTERY_OPTIONAL_ORDER');
  for(const [i,span]of[core.slice(0,split),core.slice(split)].entries()){
    const seconds=span.reduce((n,p)=>n+p.seconds,0);if(seconds!==2700)throw new Error(`MASTERY_TIME:${number}:${i+1}:${seconds}`);
  }
  const key=(i:number)=>`em-l0${number}-math-first-20261016-p${String(i+1).padStart(3,'0')}`;
  const slides=pages.map(({speech,seconds,teachingCue,...page},i):Slide=>{
    if(speech.length!==1+(page.steps?.length??0))throw new Error(`MASTERY_SPEECH:${number}:${i+1}`);
    const h=i<split?1:2;
    return {section:number===4?'极限的概念、条件与方法':'重要极限与等价无穷小',
      kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'概念模型',sourceNote:'数学例题',
      routeRole:'core',
      teachingCue:`${page.routeRole==='optional'?'拓展另行安排。':'预计'+seconds+'秒。'}${teachingCue}`,
      assistantCue:'仅解释当前公开题设、公式、图形和已揭示反馈。练习由学生个人独立完成，不提前公布答案。极限均注明趋近过程和允许范围；三角函数默认弧度。未经说明不使用新概念。采购和局部极值不属于本讲数学主线。',...page,slideKey:key(i),compositionId:`em-l0${number}-math-first-${i+1}`,kicker:`经济数学 / 第${number===4?'四':'五'}讲 / ${page.routeRole==='optional'?'拓展练习':'第'+h+'课时'}`,classHour:h,teachingSeconds:seconds,moduleId:`math-first-${number}-${h}`};
  });
  const lesson:Lesson={number,title,unit:2,unitTitle:'极限与连续',hours:2,expectedSlides:slides.length,coreQuestion:question,outcomes,exerciseCapability:outcomes.join('；'),
    prerequisites:number===4?['第三讲函数极限与ε–δ语言','高中因式分解、根式与绝对值']:['第四讲左右极限、运算法则与夹逼','高中三角恒等式、指数与对数'],
    route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:split,activity:routes[0]},{hour:2,minutes:45,slideStart:split+1,slideEnd:core.length,activity:routes[1]}],slides};
  return {lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
