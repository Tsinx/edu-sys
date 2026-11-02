import {page,type DifferentialPage} from './differentiation-authoring.js';
import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {INTEGRAL_ACTIVITIES} from './integral-exercises.js';
export {page};export type IntegralPage=DifferentialPage;
export function integralPractice(number:number):IntegralPage{
 const a=INTEGRAL_ACTIVITIES.find(a=>a.number===number)!;
 if(!a||a.questions.some(q=>q.type!=='single'))throw Error('INTEGRAL_PRACTICE:'+number);
 return page(a.title.split('：')[1]!,undefined,[],`请独立完成两道单选题，用两分钟作答并写一条依据。${a.questions.map(q=>q.spoken).join('')}作答完成后再逐题核对。`,{
  seconds:180,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:2,exerciseActivityId:a.id,sourceNote:'个人练习 · 两题均为单选',
  prompt:'独立作答2分钟，每题写一句依据，再逐题核对。',
  table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:[0,1,2,3].map(k=>a.questions.map(q=>`${'ABCD'[k]}. ${q.options![k]}`))},
  steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.answer}`,text:q.explanation,speech:q.feedbackSpeech??q.explanation})),
  teachingCue:'净作答120秒、反馈60秒。先保留独立作答时间，逐题公开反馈；复述错误选项为何不满足定义或条件。'
 });
}
export function integralWritten(number:number):IntegralPage{
 const a=INTEGRAL_ACTIVITIES.find(a=>a.number===number)!,q=a.questions[0]!;
 if(!a||q.type!=='written')throw Error('INTEGRAL_WRITTEN:'+number);
 return page(a.title.split('：')[1]!,undefined,[q.stem],q.spoken,{seconds:a.minutes*60,kind:'exercise',layout:'exercise',exerciseMinutes:a.minutes,exerciseActivityId:a.id,sourceNote:`个人书面练习 · ${a.minutes}分钟`,teachingCue:'完整保留独立作答时间。本页不提前讲答案，后续反馈页分层核对。'});
}
export function integralLesson(pages:readonly IntegralPage[]){
 const split=28;
 for(const [i,part]of[pages.slice(0,split),pages.slice(split)].entries()){
  const seconds=part.reduce((sum,p)=>sum+p.seconds,0);if(seconds!==2700)throw Error(`INTEGRAL_TIME:${i+1}:${seconds}`);
 }
 const key=(i:number)=>`em-l16-integral-20261031-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,teachingCue,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0))throw Error(`INTEGRAL_SPEECH:${i+1}`);
  return {section:i<split?'原函数与函数族':'不定积分与基本计算',kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'自制图形',sourceNote:'数学定义与例题',routeRole:'core',...p,
   slideKey:key(i),compositionId:`em-integral-16-${i+1}`,kicker:`经济数学 / 第十六讲 / 第${i<split?'一':'二'}课时`,classHour:i<split?1:2,teachingSeconds:seconds,moduleId:`integral-16-${i<split?1:2}`,
   teachingCue:`预计${seconds}秒。${teachingCue}`,
   assistantCue:'纯数学讲解，仅解释当前公开内容及实验读数，未公开反馈和后页答案不提前透露。原函数关系必须在整个指定区间逐点成立。两个原函数相差常数的结论需要同一区间，分离区间可各有独立常数。F必须可导，f本身无需可导。积分常数对积分变量保持常数。一个给定函数值只在其所在区间确定常数。给定条件可能不相容。幂函数与对数保留定义域；ln|x|分别在正、负半轴解释。不将积分拆成乘积或商，不把不定积分等同面积或一个数值。只使用d与d/dx记号，不引入大写D。每个新概念先给例子再定义。'
  };
 });
 const routes=['从反向求导建立原函数，以曲线族和中值定理理解常数、区间与给定条件','定义不定积分及微分对应，掌握基本性质与计算，通过零点核验和分层练习深化条件'] as const;
 const lesson:Lesson={number:16,unit:5,unitTitle:'不定积分',title:'原函数与不定积分：从导数恢复函数',hours:2,expectedSlides:slides.length,coreQuestion:'已知一个函数的导数，能找回哪些函数？何时还需要额外条件？',prerequisites:['基本求导与链式法则','微分记号d与d/dx','拉格朗日中值定理','可导必连续'],outcomes:['按区间上的定义核验原函数','用中值定理解释原函数只差常数','区分单个原函数、原函数族与给定条件确定的函数','正确使用不定积分记号、线性性质与基本公式','检查区间、零点及额外条件的相容性'],exerciseCapability:'从定义识别正反例，逆向计算并求导核验，利用区间条件判断唯一性与给定条件相容性',route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:28,activity:routes[0]},{hour:2,minutes:45,slideStart:29,slideEnd:pages.length,activity:routes[1]}],slides};
 return {lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
