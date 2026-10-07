import {useEffect,useRef,useState} from 'react';
import type {ClassroomActor,PracticeOptionId,PracticePack,PracticeResult,PracticeRunView} from '@edu/contracts';
import {ApiError,request} from '../../api';
import {PracticeSheet} from './PracticeSheet';
type Latest={joined:boolean;run:PracticeRunView|null;history?:{id:string;lesson:number;status:string;opened_at:string}[]};
export function CoursePracticePreview({courseId,lesson}:{courseId:string;lesson:number}){
 const [pack,setPack]=useState<PracticePack>(),[error,setError]=useState(''),[answers,setAnswers]=useState<PracticeResult[]|null>(null);
 useEffect(()=>{let active=true;setPack(undefined);setAnswers(null);setError('');void request<PracticePack>(`/api/courses/${courseId}/practice-packs/${lesson}`).then(p=>{if(active)setPack(p);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[courseId,lesson]);
 async function show(){try{const r=await request<{answers:Omit<PracticeResult,'selectedOptionId'|'status'>[]}>(`/api/courses/${courseId}/practice-packs/${lesson}/teacher`);setAnswers(r.answers.map(a=>({...a,selectedOptionId:null,status:'not-attempted'})));}catch(e){setError((e as Error).message);}}
 return <section className="ranked-practice"><header className="practice-heading"><span>RANKED PRACTICE</span><h2>Lesson {lesson} · {pack?.title}</h2><p>10 single-choice questions · 20 minutes · work at your own pace</p><p>45 minutes teaching + 25 minutes teaching + 20 minutes practice (2 + 14 + 4)</p></header>
 <p>All ten questions are available together. Rank 4 is optional. This practice is formative.</p>
 <div className="practice-actions"><a href={`/course-assets/international-mathematics/practice-v1/documents/lesson-${String(lesson).padStart(2,'0')}-choice-practice.pdf`} download>Download worksheet</a><button onClick={()=>answers?setAnswers(null):void show()}>{answers?'Hide teacher answers':'Teacher answer preview'}</button></div>
 {error&&<p role="alert">{error}</p>}{pack?<PracticeSheet pack={pack} results={answers}/>:!error&&<p>Loading practice…</p>}</section>;
}
export function ClassroomRankedPractice({sessionId,actor,lesson=1,teacher=false}:{sessionId:string;actor?:ClassroomActor;lesson?:number;teacher?:boolean}){
 const base=`/api/class-sessions/${sessionId}/practice`,[latest,setLatest]=useState<Latest>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[choices,setChoices]=useState<Record<string,PracticeOptionId>>({}),[pending,setPending]=useState<string[]>([]),[selectedLesson,setLesson]=useState(lesson),[preview,setPreview]=useState(false);
 const view=useRef<PracticeRunView|null>(null),wanted=useRef<Record<string,PracticeOptionId>>({}),saving=useRef(new Set<string>()),mounted=useRef(true);
 const storage=(id:string)=>`ranked-practice-pending:${actor?.actorId??'teacher'}:${sessionId}:${id}`;
 const persist=()=>{if(view.current)try{localStorage.setItem(storage(view.current.id),JSON.stringify(wanted.current));}catch{/* optional storage */}};
 const apply=(r:Latest)=>{
  const old=view.current,previous=old?.id;
  if(old&&r.run&&previous===r.run.id){
   const merged=new Map(r.run.responses.map(a=>[a.questionId,a]));
   for(const a of old.responses)if(a.revision>(merged.get(a.questionId)?.revision??0))merged.set(a.questionId,a);
   const order={open:0,closed:1,revealed:2};
   r={...r,run:{...(order[old.status]>order[r.run.status]?old:r.run),responses:[...merged.values()],answered:merged.size}};
  }
  view.current=r.run;
  if(r.run&&r.run.id!==previous){wanted.current={};try{wanted.current=JSON.parse(localStorage.getItem(storage(r.run.id))??'{}');}catch{/* empty local draft */}}
  if(r.run?.status!=='open')wanted.current={};
  const saved=Object.fromEntries(r.run?.responses.map(a=>[a.questionId,a.selectedOptionId])??[]);
  for(const [id,option] of Object.entries(wanted.current))if(saved[id]===option&&!saving.current.has(id))delete wanted.current[id];
  if(mounted.current){setLatest(r);setChoices({...saved,...wanted.current});setPending(Object.keys(wanted.current));}persist();
 };
 async function flush(questionId:string){
  if(saving.current.has(questionId)||!view.current||view.current.status!=='open')return;
  saving.current.add(questionId);
  try{while(wanted.current[questionId]&&view.current?.status==='open'){
   const run:PracticeRunView=view.current,option:PracticeOptionId=wanted.current[questionId]!,revision=run.responses.find(a=>a.questionId===questionId)?.revision??0;
   const next=await request<PracticeRunView>(`${base}/runs/${run.id}/questions/${questionId}/answer`,{method:'PUT',body:JSON.stringify({selectedOptionId:option,expectedRevision:revision})});
   if(view.current?.id!==run.id)break;
   if(wanted.current[questionId]===option)delete wanted.current[questionId];
   // Merge only this question: parallel saves must not replace newer responses to other questions.
   const response=next.responses.find(a=>a.questionId===questionId);
   const merged={...view.current,responses:[...view.current.responses.filter(a=>a.questionId!==questionId),...(response?[response]:[])]};merged.answered=merged.responses.length;
   apply({joined:true,run:merged});if(mounted.current)setError('');
  }}catch(e){if(e instanceof ApiError&&e.status===409)void refresh();if(mounted.current)setError((e as Error).message);}
  finally{saving.current.delete(questionId);persist();if(mounted.current)setPending(Object.keys(wanted.current));}
 }
 async function refresh(){try{const r=await request<Latest>(base);if(!mounted.current)return;apply(r);if(r.run?.status==='open'&&!teacher)for(const id of Object.keys(wanted.current))void flush(id);}catch(e){if(mounted.current)setError((e as Error).message);}}
 useEffect(()=>{mounted.current=true;void (async()=>{try{if(!teacher&&actor&&!actor.roles.includes('teacher'))await request(`${base}/join`,{method:'POST'});await refresh();}catch(e){if(mounted.current)setError((e as Error).message);}})();const timer=setInterval(()=>void refresh(),2000);const reconnect=()=>void refresh();window.addEventListener('online',reconnect);return()=>{mounted.current=false;clearInterval(timer);window.removeEventListener('online',reconnect);};},[sessionId,teacher,actor?.actorId]);
 async function mutate(path:string,body:unknown){setBusy(true);setError('');try{const run=await request<PracticeRunView>(`${base}${path}`,{method:'POST',body:JSON.stringify(body)});apply({joined:true,run});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function choose(id:string,option:PracticeOptionId){wanted.current[id]=option;setChoices(old=>({...old,[id]:option}));setPending(Object.keys(wanted.current));persist();void flush(id);}
 const run=latest?.run,attempted=Object.keys(choices).length,locked=!run||run.status!=='open'||teacher||Boolean(actor?.roles.includes('teacher'));
 return <section className="ranked-practice" id={teacher?undefined:'student-ranked-practice'} lang="en"><header className="practice-heading"><span>RANKED PRACTICE</span><h2>{run?`Lesson ${run.pack.lesson} · ${run.pack.title}`:'Lesson practice'}</h2><p>One shared set · choose one option per question · Rank 4 is optional</p></header>
 {teacher&&<div className="practice-actions"><label>Lesson <select value={selectedLesson} onChange={e=>setLesson(Number(e.target.value))}>{Array.from({length:16},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><button disabled={busy||run?.status==='open'} onClick={()=>void mutate('/runs',{requestId:crypto.randomUUID(),lesson:selectedLesson})}>Open shared set</button><button disabled={busy||run?.status!=='open'} onClick={()=>void mutate(`/runs/${run?.id}/action`,{action:'close'})}>Close and lock</button><button disabled={busy||!run||run.status==='revealed'} onClick={()=>void mutate(`/runs/${run?.id}/action`,{action:'reveal'})}>Reveal answers</button><button onClick={()=>setPreview(!preview)}>{preview?'Hide answer preview':'Teacher answer preview'}</button></div>}
 {error&&<p role="alert" className="practice-error">{error}{pending.length>0&&' Your choices are retained on this device. Reconnecting will retry while the set remains open.'}</p>}
 {!run&&<p>{teacher?'Open the set when the final 20-minute practice block begins.':'Waiting for the teacher to open the practice set.'}</p>}
 {run&&<><div className="practice-progress" role="status"><strong>Answered {attempted}/10</strong><span>{run.status==='open'?'Open · you may revise your choices':run.status==='closed'?'Closed · responses locked':'Answers revealed'}</span>{!teacher&&run.correct!==null&&<span>{run.correct} correct / {run.answered} attempted</span>}<span>{pending.length?`${pending.length} choice(s) awaiting save`:'All choices saved'}</span></div>
 {!teacher&&<p>Work at your own pace. You can start any question. Leave an unanswered question as “Not attempted”.</p>}
 {teacher&&run.summary&&<details className="practice-summary" open><summary>Completion and question results</summary><div className="practice-summary-grid"><div>{run.summary.students.length?run.summary.students.map(s=><p key={s.actorId}><b>{s.displayName}</b>: answered {s.answered}/10 · {s.correct} correct / {s.answered} attempted</p>):<p>No students have joined yet.</p>}</div><div>{run.summary.questions.map((q,i)=><p key={q.questionId}>Q{i+1}: {q.attempted} attempted · {q.correct} correct · A {q.choices.A}, B {q.choices.B}, C {q.choices.C}, D {q.choices.D}</p>)}</div></div></details>}
 <PracticeSheet pack={run.pack} choices={choices} locked={locked} onChoose={choose} pending={pending} results={teacher?(preview?run.results:null):run.status==='revealed'?run.results:null}/></>}
 </section>;
}
export function TeacherRankedPractice({sessionId,lesson,open,onClose}:{sessionId:string;lesson:number;open:boolean;onClose:()=>void}){
 if(!open)return null;return <div className="practice-modal" role="dialog" aria-modal="true" aria-label="Ranked Practice"><button className="practice-modal-close" onClick={onClose}>Close panel ×</button><ClassroomRankedPractice sessionId={sessionId} lesson={lesson} teacher/></div>;
}
