import {page,type DifferentialPage} from './differentiation-authoring.js';
import {INTEGRAL_METHOD_ACTIVITIES} from './integral-method-exercises.js';
import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
export {page};export type MethodPage=DifferentialPage;
/** One authored four-question sheet, followed by its four separately authored solutions. */
export function methodPractice(lesson:17|18,number:number):readonly MethodPage[]{
 const a=INTEGRAL_METHOD_ACTIVITIES.find(a=>a.lesson===lesson&&a.number===number);
 if(!a||a.questions.length!==4||a.questions.some(q=>q.type!=='written'))throw Error('METHOD_PRACTICE:'+lesson+':'+number);
 const cell=(i:number)=>`${i+1}. ${a.questions[i]!.stem} ${a.questions[i]!.conditions.join(' ')}`;
 const task=page(a.title.split('：')[1]!,undefined,[],`本组独立作答${a.minutes}分钟。${a.questions.map(q=>q.spoken).join('')}请写出方法、关键变换、原变量答案及范围；核验可以用于检查，不能代替变换过程。`,{
  kind:'exercise',layout:'table',seconds:a.minutes*60,exerciseMinutes:a.minutes,exerciseActivityId:a.id,
  table:{columns:[cell(0),cell(1)],rows:[[cell(2),cell(3)]]},sourceNote:`个人简答 · 4题 · ${a.minutes}分钟`,
  prompt:'先完成前两题，再推进后两题；写出方法、关键计算与适用区间。',teachingCue:`本组${a.minutes*60}秒，先完成基础题，再推进综合解释。题目页不包含答案或候选项；四题反馈分后四页展开。`
 });
 const feedback=a.questions.map((q,i)=>page(`练习${number}反馈 · 第${i+1}题`,q.formula,[...q.conditions,q.hint],`${q.spoken}${q.hint}`,{
  kind:'solution',seconds:60,steps:q.steps,sourceNote:`个人简答 · 推导与核验`,teachingCue:`本题反馈预算60秒，先依据学生独立解法定位错因；完整推导与评分在备课资源中。`
 }));
 return [task,...feedback];
}
export function methodLesson(number:17|18,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],pages:readonly MethodPage[]){
 const split=22;if(pages.length!==44)throw Error(`METHOD_PAGES:${number}:${pages.length}`);
 for(const [i,part]of[pages.slice(0,split),pages.slice(split)].entries()){const seconds=part.reduce((s,p)=>s+p.seconds,0);if(seconds!==2700)throw Error(`METHOD_TIME:${number}:${i+1}:${seconds}`);}
 const key=(i:number)=>`em-l${number}-integral-methods-20261101-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,teachingCue,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0))throw Error(`METHOD_SPEECH:${number}:${i+1}`);
  return{section:title,kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',routeRole:'core',sourceLabel:p.integralFigure?'自制图形':'概念模型',sourceNote:'方法、条件与例题',...p,
   slideKey:key(i),compositionId:`em-integral-methods-${number}-${i+1}`,kicker:`经济数学 / 第${number===17?'十七':'十八'}讲 / 第${i<split?'一':'二'}课时`,classHour:i<split?1:2,teachingSeconds:seconds,moduleId:`integral-methods-${number}-${i<split?1:2}`,
   teachingCue:`预计${seconds}秒。${teachingCue}`,
   assistantCue:'只解释本页已经公开的题目、条件和推导，不提前给出反馈页或未展开步骤的答案。本讲练习全为个人简答，不提供选择项。第一类换元来自链式法则，内层函数可不单调、导数可在部分点为零；第二类换元在本讲采用可唯一反解、导数非零的区间条件，根号去除应检查绝对值及所选支。分部积分来自乘积求导，明确区分u、du、v、dv，循环移项需核验系数；参数为零时需单独检查除法是否可用。积分常数在每个原定义区间独立，回代及求导核验不可补回原式缺失点。不引入大写D算子。'
  };
 });
 const lesson:Lesson={number,unit:5,unitTitle:'不定积分',title,hours:2,expectedSlides:44,coreQuestion:question,prerequisites:number===17?['第16讲原函数、线性性质和基本公式','链式法则与微分','反函数与主值区间']:['第16讲原函数与基本公式','第17讲两类换元及区间条件','乘积求导'],outcomes,exerciseCapability:outcomes.join('；'),route:routes.map(activity=>({minutes:45,activity})),classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:22,activity:routes[0]},{hour:2,minutes:45,slideStart:23,slideEnd:44,activity:routes[1]}],slides};
 return{lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
