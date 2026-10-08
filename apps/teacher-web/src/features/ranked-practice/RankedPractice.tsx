import {useEffect,useRef,useState} from 'react';
import type {ClassroomActor,PracticeOptionId,PracticePack,PracticeResult,PracticeRunView} from '@edu/contracts';
import {ApiError,request} from '../../api';
import {PracticeSheet} from './PracticeSheet';
import {practiceClock,practiceSecondsRemaining,practiceTimeLabel,type PracticeClock} from './practice-clock';
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
 const [minutes,setMinutes]=useState(20),[seconds,setSeconds]=useState(0),[clockTick,setClockTick]=useState(performance.now()),[announcement,setAnnouncement]=useState(false);
 const view=useRef<PracticeRunView|null>(null),wanted=useRef<Record<string,PracticeOptionId>>({}),saving=useRef(new Set<string>()),mounted=useRef(true),clock=useRef<PracticeClock|null>(null),section=useRef<HTMLElement|null>(null);
 const storage=(id:string)=>`ranked-practice-pending:${actor?.actorId??'teacher'}:${sessionId}:${id}`;
 const persist=()=>{if(view.current)try{localStorage.setItem(storage(view.current.id),JSON.stringify(wanted.current));}catch{/* optional storage */}};
 const apply=(r:Latest)=>{
  const old=view.current,previous=old?.id;
  // A delayed poll for the previous set must not replace a newly released set.
  if(old&&(!r.run||r.run.openedAt<old.openedAt))return;
  if(old&&r.run&&previous===r.run.id){
   const merged=new Map(r.run.responses.map(a=>[a.questionId,a]));
   for(const a of old.responses)if(a.revision>(merged.get(a.questionId)?.revision??0))merged.set(a.questionId,a);
   const order={open:0,closed:1,revealed:2};
   const newer=order[old.status]>order[r.run.status]||(old.status===r.run.status&&(old.serverNow??'')>(r.run.serverNow??''))?old:r.run;
   r={...r,run:{...newer,responses:[...merged.values()],answered:merged.size}};
  }
  view.current=r.run;
  if(teacher&&r.run?.status==='open'&&r.run.id!==previous){setLesson(r.run.pack.lesson);if(r.run.durationSeconds){setMinutes(Math.floor(r.run.durationSeconds/60));setSeconds(r.run.durationSeconds%60);}}
  if(r.run&&r.run.id!==previous){wanted.current={};setError('');if(!teacher&&r.run.status==='open')setAnnouncement(true);try{wanted.current=JSON.parse(localStorage.getItem(storage(r.run.id))??'{}');}catch{/* empty local draft */}}
  if(r.run?.status!=='open'){if(Object.keys(wanted.current).length&&mounted.current)setError('This set is closed. Choices that could not reach the server before closure were not submitted.');wanted.current={};setAnnouncement(false);}
  if(r.run&&(r.run.id!==previous||r.run.serverNow!==old?.serverNow))clock.current=practiceClock(r.run,performance.now());
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
   apply({joined:true,run:next});if(mounted.current)setError('');
  }}catch(e){if(e instanceof ApiError&&e.status===409)void refresh();if(mounted.current)setError((e as Error).message);}
  finally{saving.current.delete(questionId);persist();if(mounted.current)setPending(Object.keys(wanted.current));}
 }
 async function refresh(){try{const r=await request<Latest>(base);if(!mounted.current)return;apply(r);if(r.run?.status==='open'&&!teacher)for(const id of Object.keys(wanted.current))void flush(id);}catch(e){if(mounted.current)setError((e as Error).message);}}
 useEffect(()=>{mounted.current=true;let events:EventSource|undefined;void (async()=>{try{if(!teacher&&actor&&!actor.roles.includes('teacher'))await request(`${base}/join`,{method:'POST'});await refresh();if(!mounted.current)return;events=new EventSource(`${base}/stream`);events.addEventListener('practice',()=>void refresh());}catch(e){if(mounted.current)setError((e as Error).message);}})();const timer=setInterval(()=>void refresh(),2000),tick=setInterval(()=>setClockTick(performance.now()),250);const reconnect=()=>void refresh();window.addEventListener('online',reconnect);return()=>{mounted.current=false;events?.close();clearInterval(timer);clearInterval(tick);window.removeEventListener('online',reconnect);};},[sessionId,teacher,actor?.actorId]);
 async function mutate(path:string,body:unknown){setBusy(true);setError('');try{const run=await request<PracticeRunView>(`${base}${path}`,{method:'POST',body:JSON.stringify(body)});apply({joined:true,run});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function choose(id:string,option:PracticeOptionId){if(view.current?.status!=='open'||practiceSecondsRemaining(clock.current,performance.now())===0)return;wanted.current[id]=option;setChoices(old=>({...old,[id]:option}));setPending(Object.keys(wanted.current));persist();void flush(id);}
 const run=latest?.run,remaining=practiceSecondsRemaining(clock.current,clockTick),expired=remaining===0,attempted=Object.keys(choices).length,locked=!run||run.status!=='open'||expired||teacher||Boolean(actor?.roles.includes('teacher')),durationSeconds=minutes*60+seconds;
 useEffect(()=>{if(expired&&run?.status==='open')void refresh();},[expired,run?.id,run?.status]);
 async function submit(){if(Object.keys(wanted.current).length||saving.current.size){setError('Wait for all choices to save before submitting.');return;}if(run&&!locked)await mutate(`/runs/${run.id}/submit`,{});}
 const submissionLabel=run?.submission?.finalizedAt?(run.submission.mode==='automatic'?'Submitted automatically':'Submission finalized'):run?.submission?.submittedAt?(run.submission.hasUnsubmittedChanges?'Changes saved · submit again':'Submitted · you may revise until closure'):'Not submitted yet';
 return <section ref={section} className="ranked-practice" id={teacher?undefined:'student-ranked-practice'} lang="en"><header className="practice-heading"><span>RANKED PRACTICE</span><h2>{run?`Lesson ${run.pack.lesson} · ${run.pack.title}`:'Lesson practice'}</h2><p>One shared set · choose one option per question · Rank 4 is optional</p></header>
 {!teacher&&announcement&&run?.status==='open'&&!expired&&<div className="practice-announcement" role="alert"><strong>Timed practice is open</strong><button onClick={()=>{setAnnouncement(false);section.current?.scrollIntoView({behavior:'smooth',block:'start'});}}>Start answering</button></div>}
 {teacher&&<div className="practice-actions"><label>Lesson <select value={selectedLesson} onChange={e=>setLesson(Number(e.target.value))}>{Array.from({length:16},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><fieldset className="practice-time-input" disabled={busy||run?.status==='open'}><legend>Time limit for the whole set</legend><label>Minutes <input type="number" min="0" max="120" step="1" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label><label>Seconds <input type="number" min="0" max="59" step="1" value={seconds} onChange={e=>setSeconds(Number(e.target.value))}/></label></fieldset><button disabled={busy||run?.status==='open'||!Number.isInteger(minutes)||!Number.isInteger(seconds)||durationSeconds<10||durationSeconds>7200||seconds<0||seconds>59||minutes<0} onClick={()=>void mutate('/runs',{requestId:crypto.randomUUID(),lesson:selectedLesson,durationSeconds})}>Open shared set</button><button disabled={busy||run?.status!=='open'} onClick={()=>void mutate(`/runs/${run?.id}/action`,{action:'close'})}>Close and lock</button><button disabled={busy||!run||run.status==='revealed'} onClick={()=>void mutate(`/runs/${run?.id}/action`,{action:'reveal'})}>Reveal answers</button><button onClick={()=>setPreview(!preview)}>{preview?'Hide answer preview':'Teacher answer preview'}</button></div>}
 {error&&<p role="alert" className="practice-error">{error}{pending.length>0&&' Your choices are retained on this device. Reconnecting will retry while the set remains open.'}</p>}
 {!run&&<p>{teacher?'Open the set when the final 20-minute practice block begins.':'Waiting for the teacher to open the practice set.'}</p>}
 {teacher&&run?.status==='open'&&!run.deadlineAt&&<p>This existing set is untimed. Close it before starting a timed set.</p>}
 {run&&<><div className="practice-progress" role="status"><strong>Answered {attempted}/10</strong><span>{run.status==='revealed'?'Answers revealed':run.status==='open'&&!expired?'Open · you may revise your choices':run.closeReason==='deadline'||(run.status==='open'&&expired)?'Time is up · responses locked':'Closed · responses locked'}</span>{remaining!==null&&run.status==='open'&&<strong className={`practice-countdown${remaining<=60?' is-urgent':''}`} aria-label="Time remaining">Time left {practiceTimeLabel(remaining)}</strong>}{!teacher&&run.correct!==null&&<span>{run.correct} correct / {run.answered} attempted</span>}<span>{pending.length?`${pending.length} choice(s) awaiting save`:'All choices saved'}</span>{!teacher&&<span>{submissionLabel}</span>}</div>
 {!teacher&&<><p>Work at your own pace. You can start any question. Unanswered questions remain “Not attempted”. {run.deadlineAt?'Your saved choices are submitted automatically when time is up.':'Your saved choices are finalized when the teacher closes the set.'}</p><div className="practice-actions"><button disabled={busy||locked||pending.length>0} onClick={()=>void submit()}>{busy?'Submitting…':run.submission?.submittedAt?'Resubmit answers':'Submit answers'}</button><span>You may revise and resubmit while the set is open.</span></div></>}
 {teacher&&run.summary&&<details className="practice-summary" open><summary>Completion and question results · {run.summary.students.filter(s=>s.submission?.submittedAt&&!s.submission.hasUnsubmittedChanges).length}/{run.summary.students.length} submitted</summary><div className="practice-summary-grid"><div>{run.summary.students.length?run.summary.students.map(s=><p key={s.actorId}><b>{s.displayName}</b>: answered {s.answered}/10 · {s.correct} correct / {s.answered} attempted · {s.submission?.finalizedAt?(s.submission.mode==='automatic'?'Submitted automatically':'Finalized'):s.submission?.submittedAt?(s.submission.hasUnsubmittedChanges?'Revised since submission':'Submitted'):'Not submitted'}</p>):<p>No students have joined yet.</p>}</div><div>{run.summary.questions.map((q,i)=><p key={q.questionId}>Q{i+1}: {q.attempted} attempted · {q.correct} correct · A {q.choices.A}, B {q.choices.B}, C {q.choices.C}, D {q.choices.D}</p>)}</div></div></details>}
 <PracticeSheet pack={run.pack} choices={choices} locked={locked} onChoose={choose} pending={pending} results={teacher?(preview?run.results:null):run.status==='revealed'?run.results:null}/></>}
 </section>;
}
export function TeacherRankedPractice({sessionId,lesson,open,onClose}:{sessionId:string;lesson:number;open:boolean;onClose:()=>void}){
 if(!open)return null;return <div className="practice-modal" role="dialog" aria-modal="true" aria-label="Ranked Practice"><button className="practice-modal-close" onClick={onClose}>Close panel ×</button><ClassroomRankedPractice sessionId={sessionId} lesson={lesson} teacher/></div>;
}
