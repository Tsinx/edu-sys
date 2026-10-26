import type {EconomicMathematicsAuthoredSlide as Slide,EconomicMathematicsLessonDefinition as Lesson} from './types.js';
import {ANALYSIS_EXERCISES,ANALYSIS_WRITTEN_EXERCISES} from './analysis-exercises.js';
export type AnalysisPage=Partial<Slide>&{title:string;seconds:number;speech:readonly string[]};
type Reveal=NonNullable<Slide['steps']>[number]&{speech:string};
type Details=Omit<Partial<Slide>,'steps'>&{seconds?:number;steps?:readonly Reveal[]};
/** Assigns structure only: every title, paragraph, formula and spoken step is authored by its page. */
export function page(title:string,formula:string|undefined,body:readonly string[],speech:string,details:Details={}):AnalysisPage{
 const {seconds=90,steps,...rest}=details;
 return {title,formula,body,seconds,...rest,...(steps?{steps:steps.map(({speech:_,...s})=>s)}:{}),speech:[speech,...(steps??[]).map(s=>s.speech)]};
}
export function analysisPractice(lesson:11|12,number:number):AnalysisPage{
 const a=ANALYSIS_EXERCISES.filter(a=>a.lesson===lesson)[number-1];if(!a)throw Error('ANALYSIS_EXERCISE:'+lesson+':'+number);
 return {title:`个人练习${lesson}-${String(number).padStart(2,'0')}：${a.title}`,seconds:180,kind:'exercise',layout:'table',conceptCheck:true,exerciseMinutes:2,exerciseActivityId:a.id,
 sourceNote:'个人作答2分钟 · 两题均为单选',
 table:{columns:a.questions.map((q,i)=>`${i+1}. ${q.stem}`),rows:['A','B','C','D'].map(k=>a.questions.map(q=>`${k}. ${q.options[k as 'A'|'B'|'C'|'D']}`))},
 prompt:'先独立选择，并写一条依据；答案公开后再核对。',
 steps:a.questions.map((q,i)=>({title:`第${i+1}题：${q.correctAnswer}`,text:q.explanation})),
 teachingCue:'两分钟独立作答，一分钟反馈；不在初始讲解中公开答案。完整错因与再判断见共同题源。',
 speech:[`现在独立作答两分钟。${a.questions.map((q,i)=>`第${i+1}题，${q.stem}${Object.entries(q.options).map(([k,v])=>`${k}，${v}。`).join('')}`).join('')}请先把选项和依据写下来，准备好后再核对。`,...a.questions.map((q,i)=>`第${i+1}题选${q.correctAnswer}。${q.explanation}${q.distractorDiagnosis}再想一想：${q.feedbackFollowup}`)]};
}
export function writtenTask(id:string):Details{
 const a=ANALYSIS_WRITTEN_EXERCISES.find(a=>a.id===id);if(!a)throw Error('ANALYSIS_WRITTEN:'+id);
 return {kind:'exercise',layout:'exercise',exerciseMinutes:4,exerciseActivityId:id,sourceNote:'个人书面练习 · 独立作答4分钟'};
}
export function analysisLesson(number:11|12,title:string,question:string,outcomes:readonly string[],routes:readonly[string,string],pages:readonly AnalysisPage[]){
 if(pages.length!==56||pages.slice(0,52).some(p=>p.routeRole==='optional')||pages.slice(52).some(p=>p.routeRole!=='optional'))throw Error('ANALYSIS_ROUTE:'+number);
 for(let h=0;h<2;h++)if(pages.slice(h*26,h*26+26).reduce((s,p)=>s+p.seconds,0)!==2700)throw Error(`ANALYSIS_TIME:${number}:${h+1}`);
 const key=(i:number)=>`em-l${number}-analysis-20261022-p${String(i+1).padStart(3,'0')}`;
 const slides=pages.map(({speech,seconds,...p},i):Slide=>{
  if(speech.length!==1+(p.steps?.length??0)||speech.some(s=>!s.trim()))throw Error(`ANALYSIS_SPEECH:${number}:${i+1}`);
  return {section:title,kind:'definition',visual:'formula-board',layout:'essay',style:'editorial',accent:'ink',sourceLabel:'概念模型',sourceNote:'自制数学证据',routeRole:'core',
   teachingCue:'先核对题设与范围，再说明本页推理；保留已完成步骤。',
   assistantCue:'仅解释当前公开的题设、图形和揭示步骤。未公开的答案、之后页面的推导与作者提示不得进入回答。先说明新术语。中值定理的条件是充分条件，不能反向推理；中值点不保证中点或唯一。洛必达比较导数商，每次重新核验原形式、可导性、非零分母、方向和导数商极限；不能反推原商无极限。不得提前使用泰勒公式解释尚未建立的结论。',
   ...p,slideKey:key(i),compositionId:`em-analysis-${number}-${i+1}`,classHour:i<26?1:2,teachingSeconds:seconds,moduleId:`analysis-${number}-${i<26?1:2}`,
   kicker:`经济数学 / 第${number===11?'十一':'十二'}讲 / ${i<52?'第'+(i<26?'一':'二')+'课时':'课后拓展'}`};
 });
 const lesson:Lesson={number,title,unit:number===11?3:4,unitTitle:number===11?'导数与微分':'导数应用、边际与弹性分析',hours:2,expectedSlides:56,coreQuestion:question,outcomes,
 prerequisites:number===11?['闭区间连续函数最值定理','费马必要条件与导数','微分与线性近似']:['柯西中值定理与去心邻域','求导规则、高阶导数','重要极限与等价替换的边界'],
 exerciseCapability:outcomes.join('；'),route:routes.map(activity=>({minutes:45,activity})),
 classHours:[{hour:1,minutes:45,slideStart:1,slideEnd:26,activity:routes[0]},{hour:2,minutes:45,slideStart:27,slideEnd:52,activity:routes[1]}],slides};
 return {lesson,narration:Object.fromEntries(pages.map((p,i)=>[key(i),p.speech])) as Readonly<Record<string,readonly string[]>>};
}
