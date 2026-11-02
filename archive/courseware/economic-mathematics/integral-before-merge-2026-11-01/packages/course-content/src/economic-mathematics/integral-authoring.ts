import {page,type DifferentialPage} from './differentiation-authoring.js';
import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {INTEGRAL_ACTIVITIES} from './integral-exercises.js';
export {page};export type IntegralPage=DifferentialPage;
export function integralPractice(lesson:16|17,number:number):IntegralPage{
 const a=INTEGRAL_ACTIVITIES.find(a=>a.lesson===lesson&&a.number===number);
 if(!a||a.questions.some(q=>q.type!=='single'))throw Error('INTEGRAL_PRACTICE:'+lesson+':'+number);
 return page(a.title.split('：')[1]!,undefined,[],`请独立作答${a.minutes}分钟。${a.questions.map(q=>q.spoken).join('')}作答后再核对条件与依据。`,{
  seconds:a.minutes*60+60,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:a.minutes,exerciseActivityId:a.id,sourceNote:'个人诊断 · 两题均为单选',
  prompt:`独立作答${a.minutes}分钟，每题给出依据，再逐题核对。`,
  table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(k=>a.questions.map(q=>`${'ABCD'[k]}. ${q.options![k]}`))},
  steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation,speech:q.feedbackSpeech??q.explanation})),
  teachingCue:`净作答${a.minutes*60}秒、反馈60秒；本讲只在需要辨明条件的位置设置诊断，不反复操练同一种基础辨认。`
 });
}
export function integralWritten(lesson:16|17,number:number):IntegralPage{
 const a=INTEGRAL_ACTIVITIES.find(a=>a.lesson===lesson&&a.number===number),q=a?.questions[0];
 if(!a||!q||q.type!=='written')throw Error('INTEGRAL_WRITTEN:'+lesson+':'+number);
 return page(a.title.split('：')[1]!,q.formula,q.parts??[q.stem],q.spoken,{seconds:a.minutes*60,kind:'exercise',layout:'exercise',exerciseMinutes:a.minutes,exerciseActivityId:a.id,sourceNote:`个人书面练习 · ${a.minutes}分钟`,teachingCue:'保留完整独立作答时间，基础计算与深入解释分层完成，后页统一反馈。'});
}
export function integralLesson(number:16|17,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],pages:readonly IntegralPage[],split:number){
 for(const [i,part]of[pages.slice(0,split),pages.slice(split)].entries()){
  const seconds=part.reduce((sum,p)=>sum+p.seconds,0);if(seconds!==2700)throw Error(`INTEGRAL_TIME:${number}:${i+1}:${seconds}`);
 }
 const key=(i:number)=>`em-l${number}-integral-20261101-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,teachingCue,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0))throw Error(`INTEGRAL_SPEECH:${number}:${i+1}`);
  return {section:title,kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:p.integralFigure?'自制图形':'概念模型',sourceNote:'数学定义与例题',routeRole:'core',...p,
   slideKey:key(i),compositionId:`em-integral-${number}-20261101-${i+1}`,kicker:`经济数学 / 第${number===16?'十六':'十七'}讲 / 第${i<split?'一':'二'}课时`,classHour:i<split?1:2,teachingSeconds:seconds,moduleId:`integral-${number}-${i<split?1:2}`,
   teachingCue:`预计${seconds}秒。${teachingCue}`,
   assistantCue:'只解释当前公开数学材料与实验读数，不提前公开反馈。原函数同一区间只差常数；分离区间可有独立常数。常数对积分变量固定但可依赖另一个参数。不能把变量因子移出积分号。先核验原定义域、内层导数及系数。arctan在实数域取主值(-π/2,π/2)，反函数不等于倒数，arctan(tanθ)=θ只在主值区间成立。arcsin的主值范围为[-π/2,π/2]，导数公式只在(-1,1)使用。参数积分公式注明a>0，a趋零的结论在固定x>0上由显式恒等式推得，不宣称一般可交换极限与积分。不引入大写D算子。'
  };
 });
 const lesson:Lesson={number,unit:5,unitTitle:'不定积分',title,hours:2,expectedSlides:slides.length,coreQuestion:question,prerequisites:number===16?['基本求导与链式、乘积法则','微分记号d与d/dx','拉格朗日中值定理']:['第16讲原函数、直接整理与整体微分','反函数及其求导','正切、正弦与弧度'],outcomes,exerciseCapability:outcomes.join('；'),route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:split,activity:routes[0]},{hour:2,minutes:45,slideStart:split+1,slideEnd:pages.length,activity:routes[1]}],slides};
 return {lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
