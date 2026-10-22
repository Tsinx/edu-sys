import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {DIFFERENTIATION_EXERCISES} from './differentiation-exercises.js';
import {DIFFERENTIATION_WRITTEN_EXERCISES} from './differentiation-written-exercises.js';
export type DifferentialPage=Omit<Partial<Slide>,'teachingSeconds'> & {title:string;seconds:number;teachingCue:string;speech:readonly string[]};
type Reveal=NonNullable<Slide['steps']>[number]&{speech:string};
type Details=Omit<Partial<Slide>,'steps'> & {seconds?:number;steps?:readonly Reveal[]};
export function writtenTask(id:string):Details {
 const a=DIFFERENTIATION_WRITTEN_EXERCISES.find(a=>a.id===id);
 if(!a)throw Error('WRITTEN_TASK:'+id);
 return {kind:'exercise',exerciseActivityId:id,exerciseMinutes:a.minutes,sourceNote:'个人短答 · 独立作答1分钟'};
}
/** Convenience for explicit page scripts; this never invents teaching prose or pacing. */
export function page(title:string,formula:string|undefined,body:readonly string[],speech:string,details:Details={}):DifferentialPage{
 const {seconds=60,steps,...rest}=details;
 return {title,formula,body,seconds,teachingCue:details.teachingCue??'按页中条件解释每一步，提问后保留独立判断时间；反馈只在相应步骤公开后讲解。',...rest,
  ...(steps?{steps:steps.map(({speech:_,...s})=>s)}:{}),speech:[speech,...(steps??[]).map(s=>s.speech)]};
}
export function differentialPractice(lesson:8|9|10,number:number):DifferentialPage{
 const a=DIFFERENTIATION_EXERCISES.find(a=>a.lesson===lesson&&a.number===number)!;
 return {title:a.title.replace(/^第[八九十]讲·/,''),seconds:180,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:2,exerciseActivityId:a.id,sourceNote:'个人练习 · 两题均为单选',
 table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(i=>a.questions.map(q=>`${'ABCD'[i]}. ${q.options[i]}`))},
 prompt:'请独立作答2分钟，并写一条依据；随后逐题核对。',steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation})),
 teachingCue:'两分钟个人作答，一分钟反馈；先让每人写依据，再公开答案。基础未稳时延长停留，拓展题另行安排。',
 speech:[`请独立完成两道单选题，并给出一条依据。${a.questions.map((q,i)=>`第${i+1}题，${q.stem}${q.options.map((o,k)=>`${'ABCD'[k]}，${o}。`).join('')}`).join('')}先作答，再核对。`,...a.questions.map((q,i)=>`第${i+1}题选${q.answer}。${q.explanation}`)]};
}
export function differentialLesson(number:8|9|10,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],pages:readonly DifferentialPage[]){
 const core=pages.filter(p=>p.routeRole!=='optional'),split=30;
 if(core.length!==60||pages.slice(60).some(p=>p.routeRole!=='optional'))throw Error(`DIFFERENTIATION_ROUTE:${number}:${core.length}`);
 for(const [i,span]of[core.slice(0,split),core.slice(split)].entries()){const seconds=span.reduce((n,p)=>n+p.seconds,0);if(seconds!==2700)throw Error(`DIFFERENTIATION_TIME:${number}:${i+1}:${seconds}`);}
 const name={8:'八',9:'九',10:'十'}[number],key=(i:number)=>`em-l${String(number).padStart(2,'0')}-calculus-20261020-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,teachingCue,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0))throw Error(`DIFFERENTIATION_SPEECH:${number}:${i+1}`);
  const hour=i<split?1:2;
  return {section:title,kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'概念模型',sourceNote:'数学例题',routeRole:'core',
   assistantCue:'仅使用本页已公开材料，未揭示答案和未来推导不得提前泄露。先解释新名词与符号。核对原定义域、可导性、非零分母、反函数对应点及误差基准。法则条件不满足不能反推结论必错。商业情境为给定连续模型，不宣称因果识别或整数增量精确等于导数。尚不使用中值定理、洛必达或泰勒公式。',
   ...p,slideKey:key(i),compositionId:`em-l${number}-differentiation-${i+1}`,kicker:`经济数学 / 第${name}讲 / ${p.routeRole==='optional'?'拓展思考':'第'+hour+'课时'}`,classHour:hour,teachingSeconds:seconds,moduleId:`differentiation-${number}-${hour}`,
   teachingCue:`${p.routeRole==='optional'?'拓展不计入90分钟。':'预计'+seconds+'秒。'}${teachingCue}`};
 });
 const lesson:Lesson={number,title,unit:3,unitTitle:'导数与微分',hours:2,expectedSlides:slides.length,coreQuestion:question,outcomes,exerciseCapability:outcomes.join('；'),
 prerequisites:number===8?['第七讲导数定义、可导与连续','第五讲重要极限']:number===9?['第二讲复合函数与反函数','第八讲基本求导公式与四则法则']:['第八、九讲求导与链式法则','第七讲切线与边际成本'],
 route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:30,activity:routes[0]},{hour:2,minutes:45,slideStart:31,slideEnd:60,activity:routes[1]}],slides};
 return {lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
