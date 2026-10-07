import {page,text,math,plot,table,diagram,shape} from '../authoring.js';
import type {LessonSlide,MathematicsLesson,PlotSpec,SlideElement,SourceReference} from '../types.js';
export interface Insertion {before:string;slide:LessonSlide;}
type Detail={sequence?:string;question?:string;answer?:string;role?:'concept'|'worked-step'|'checkpoint'|'misconception';seconds?:number;cue?:string;};
export function author(lesson:number,ref:SourceReference){
 const put=(before:string,id:string,title:string,elements:readonly SlideElement[],detail:Detail={},label='STEP BY STEP'):Insertion=>({before,slide:page(lesson,`${before}-${id}`,title,label,ref,elements,{publicLabel:detail.sequence?'Worked example':'Mathematical model',question:detail.question,answer:detail.answer,pedagogy:{role:detail.role??(detail.sequence?'worked-step':'concept'),sequence:detail.sequence,seconds:detail.seconds??(detail.role==='checkpoint'?105:detail.role==='misconception'?80:50)},teachingCue:detail.cue??`围绕“${title}”检查这一小步的量、单位与依据；先请学生解释，再推进下一页。`,assistantCue:`Explain this page in clear English. Stay within its stated model and single-variable calculus. ${detail.question?'Give a hint first; do not disclose the private answer until revealed.':'Relate the displayed mathematical step to its context.'}`})});
 return {
  m:(at:string,id:string,title:string,tex:string|string[],note:string,detail:Detail={})=>put(at,id,title,[...(Array.isArray(tex)?tex:[tex]).map((v,i)=>math(v,90,270+i*155,1390,115,Array.isArray(tex)?52:66)),text(note,100,Math.max(640,270+(Array.isArray(tex)?tex.length:1)*155),1370,120,35)],detail),
  c:(at:string,id:string,title:string,statement:string,note:string,detail:Detail={})=>put(at,id,title,[text(statement,100,285,1380,230,48,'blue',600),shape('yellow',95,635,1395,145),text(note,125,660,1330,100,34)],detail,'NOTICE • EXPLAIN'),
  q:(at:string,id:string,title:string,prompt:string,answer:string)=>put(at,id,title,[text(prompt,100,300,1370,290,45),text('State a reason and include the unit when one is needed.',100,685,1360,100,32,'green')],{role:'checkpoint',question:prompt,answer},'QUICK CHECK'),
  e:(at:string,id:string,title:string,claim:string,repair:string)=>put(at,id,title,[text(claim,100,300,1350,220,46,'coral'),text('Find the first step that needs repair.',100,675,1350,90,36)],{role:'misconception',question:'What is wrong with this claim?',answer:repair},'ERROR DETECTIVE'),
  g:(at:string,id:string,title:string,p:PlotSpec,tex:string,note:string,detail:Detail={})=>put(at,id,title,[plot(p,70,235,920,555),math(tex,1050,315,450,145,40),text(note,1050,565,440,215,31)],detail,'READ THE GRAPH'),
  t:(at:string,id:string,title:string,columns:string[],rows:string[][],note:string,detail:Detail={})=>put(at,id,title,[table(columns,rows,90,265,1410,390),text(note,100,715,1380,100,34)],detail,'READ THE EVIDENCE'),
  d:(at:string,id:string,title:string,labels:string[],values:string[],tex:string,note:string,detail:Detail={})=>put(at,id,title,[diagram('flow',labels,100,300,1350,235,values),math(tex,100,575,1360,105,53),text(note,100,745,1370,75,32)],detail,'CONNECT THE STEPS')
 };
}
export function expandLesson(base:MathematicsLesson,insertions:readonly Insertion[],target:number,hourGuides:readonly [string,string],hourTitles:readonly [string,string]):MathematicsLesson{
 if(!insertions.length)return base;
 const slides=base.slides.flatMap(s=>[...insertions.filter(x=>s.slideKey.endsWith('-'+x.before)).map(x=>x.slide),s]);
 const core=slides.filter(s=>!s.optionalChallenge);if(core.length!==target)throw Error(`Lesson ${base.number}: ${core.length} core pages, expected ${target}`);
 const split=target/2;
 for(let h=0;h<2;h++){
  const block=core.slice(h*split,(h+1)*split),weights=block.map(s=>s.pedagogy?.seconds??(s.openingFilm?105:/exit/i.test(s.kicker)?120:s.answer?70:50)),total=weights.reduce((a,b)=>a+b,0);
  const durations=weights.map(w=>Math.floor(w*2700/total));let remaining=2700-durations.reduce((a,b)=>a+b,0);for(let j=0;remaining>0;j=(j+1)%durations.length,remaining--)durations[j]!++;
  block.forEach((s,j)=>{const pos=slides.indexOf(s);slides[pos]={...s,pedagogy:{...s.pedagogy,role:s.pedagogy?.role??(s.openingFilm?'scene':/exit/i.test(s.kicker)?'exit':'concept'),hour:(h+1) as 1|2,seconds:durations[j]!}};});
 }
 const hours=([1,2] as const).map((h,i)=>({number:h,title:hourTitles[i]!,durationMinutes:45 as const,coreSlides:split,localStart:i*split+1,localEnd:(i+1)*split,guide:hourGuides[i]!}));
 const ranges=hours.map(h=>`第${h.number}学时45分钟，核心页${h.localStart}–${h.localEnd}：${h.guide}`).join('\n');
 return {...base,slides,hours,teacherGuide:ranges+'\n选学页不计入90分钟核心路线。逐页建议秒数为备课估计；按理解情况调整并记录试讲用时。\n'+base.teacherGuide.replace(/^第\d+讲90分钟。[\s\S]*?用语：/,'英文话术：')};
}
