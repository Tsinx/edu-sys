import { randomUUID } from 'node:crypto';
import type { ClassroomActor, PracticeOptionId, PracticeResponse, PracticeRunView, PracticeSubmission } from '@edu/contracts';
import type { ClassroomParticipation } from './classroom-participation.js';
import { publicPack, type PrivatePracticePack } from './practice-content/index.js';

type CloseReason = NonNullable<PracticeSubmission['finalizationReason']>;
type Row = { id:string; session_id:string; status:'open'|'closed'|'revealed'; snapshot:string; opened_at:string; closed_at:string|null; revealed_at:string|null; duration_seconds:number|null; deadline_at:string|null; close_reason:CloseReason|null };
type ResponseRow = {question_id:string;actor_id:string;option_id:PracticeOptionId;revision:number;saved_at:string};
type SubmissionRow = { submitted_at:string; revision_sum:number; mode:'manual'|'automatic'; finalized_at:string|null; finalization_reason:CloseReason|null };
export const practiceError = (statusCode:number,message:string) => Object.assign(new Error(message),{statusCode,code:'RANKED_PRACTICE_ERROR'});

/** Snapshots, deadlines and submissions share the existing classroom WAL transaction lock. */
export class RankedPractice {
 private readonly listeners = new Map<string,Set<()=>void>>();
 private readonly timer: ReturnType<typeof setInterval>;
 constructor(private readonly participation:ClassroomParticipation,private readonly isLive:(session:string)=>boolean,private readonly now:()=>number=Date.now){
  participation.db.exec(`CREATE TABLE IF NOT EXISTS ranked_practice_runs(
   id TEXT PRIMARY KEY,session_id TEXT NOT NULL,request_id TEXT NOT NULL,snapshot TEXT NOT NULL,
   status TEXT NOT NULL CHECK(status IN ('open','closed','revealed')),opened_at TEXT NOT NULL,closed_at TEXT,revealed_at TEXT,
   UNIQUE(session_id,request_id));
   CREATE UNIQUE INDEX IF NOT EXISTS ranked_practice_one_open ON ranked_practice_runs(session_id) WHERE status='open';
   CREATE INDEX IF NOT EXISTS ranked_practice_session ON ranked_practice_runs(session_id,opened_at);
   CREATE TABLE IF NOT EXISTS ranked_practice_open_requests(session_id TEXT NOT NULL,request_id TEXT NOT NULL,pack_id TEXT NOT NULL,run_id TEXT NOT NULL,PRIMARY KEY(session_id,request_id));
   CREATE TABLE IF NOT EXISTS ranked_practice_responses(run_id TEXT NOT NULL,actor_id TEXT NOT NULL,question_id TEXT NOT NULL,
   option_id TEXT NOT NULL CHECK(option_id IN ('A','B','C','D')),revision INTEGER NOT NULL,saved_at TEXT NOT NULL,
   PRIMARY KEY(run_id,actor_id,question_id));
   CREATE TABLE IF NOT EXISTS ranked_practice_submissions(run_id TEXT NOT NULL,actor_id TEXT NOT NULL,submitted_at TEXT NOT NULL,
   revision_sum INTEGER NOT NULL,mode TEXT NOT NULL,finalized_at TEXT,finalization_reason TEXT,PRIMARY KEY(run_id,actor_id));`);
  // Existing untimed snapshots and their learning records remain untouched.
  const columns = new Set((participation.db.prepare('PRAGMA table_info(ranked_practice_runs)').all() as {name:string}[]).map(c=>c.name));
  for(const [name,type] of [['duration_seconds','INTEGER'],['deadline_at','TEXT'],['close_reason','TEXT']])
   if(!columns.has(name!))participation.db.exec(`ALTER TABLE ranked_practice_runs ADD COLUMN ${name} ${type}`);
  this.expireDue();
  this.timer=setInterval(()=>this.expireDue(),500);this.timer.unref();
 }
 close(){clearInterval(this.timer);this.listeners.clear();}
 subscribe(session:string,listener:()=>void){const set=this.listeners.get(session)??new Set();set.add(listener);this.listeners.set(session,set);return()=>{set.delete(listener);if(!set.size)this.listeners.delete(session);};}
 private changed(session:string){for(const listener of this.listeners.get(session)??[])listener();}
 joined(session:string,actor:string){return Boolean(this.participation.db.prepare('SELECT 1 FROM participation_members WHERE session_id=? AND actor_id=?').get(session,actor));}
 private row(session:string,id:string){const row=this.participation.db.prepare('SELECT * FROM ranked_practice_runs WHERE session_id=? AND id=?').get(session,id) as Row|undefined;if(!row)throw practiceError(404,'Practice run not found in this classroom.');return row;}
 latest(session:string){this.expireDue();return (this.participation.db.prepare('SELECT id FROM ranked_practice_runs WHERE session_id=? ORDER BY opened_at DESC,rowid DESC LIMIT 1').get(session) as {id:string}|undefined)?.id;}
 history(session:string){return this.participation.db.prepare("SELECT id,status,opened_at,closed_at,revealed_at,deadline_at,duration_seconds,close_reason,json_extract(snapshot,'$.lesson') AS lesson FROM ranked_practice_runs WHERE session_id=? ORDER BY opened_at DESC,rowid DESC").all(session);}
 private revisionSum(id:string,actor:string){return (this.participation.db.prepare('SELECT COALESCE(SUM(revision),0) AS total FROM ranked_practice_responses WHERE run_id=? AND actor_id=?').get(id,actor) as {total:number}).total;}
 private submission(row:Row,actor:string):PracticeSubmission {
  const s=this.participation.db.prepare('SELECT * FROM ranked_practice_submissions WHERE run_id=? AND actor_id=?').get(row.id,actor) as SubmissionRow|undefined;
  return {submittedAt:s?.submitted_at??null,mode:s?.mode??null,hasUnsubmittedChanges:row.status==='open'&&(!s||s.revision_sum!==this.revisionSum(row.id,actor)),finalizedAt:s?.finalized_at??null,finalizationReason:s?.finalization_reason??null};
 }
 private finalize(row:Row,at:string,reason:CloseReason){
  this.participation.db.prepare("UPDATE ranked_practice_runs SET status='closed',closed_at=?,close_reason=? WHERE id=? AND status='open'").run(at,reason,row.id);
  const members=this.participation.db.prepare('SELECT actor_id FROM participation_members WHERE session_id=?').all(row.session_id) as {actor_id:string}[];
  for(const {actor_id} of members){
   const revision=this.revisionSum(row.id,actor_id);
   const old=this.participation.db.prepare('SELECT * FROM ranked_practice_submissions WHERE run_id=? AND actor_id=?').get(row.id,actor_id) as SubmissionRow|undefined;
   const submitted=old?.revision_sum===revision;
   this.participation.db.prepare('INSERT OR REPLACE INTO ranked_practice_submissions VALUES(?,?,?,?,?,?,?)').run(row.id,actor_id,submitted?old.submitted_at:at,revision,submitted?old.mode:'automatic',at,reason);
  }
 }
 /** Durable server-side finalization: no connected student or teacher client is required. */
 expireDue(){
  const changed=new Set<string>(),now=this.now(),iso=new Date(now).toISOString();
  this.participation.atomic(()=>{
   const rows=this.participation.db.prepare("SELECT * FROM ranked_practice_runs WHERE status='open'").all() as Row[];
   for(const row of rows){
    const expired=row.deadline_at!==null&&Date.parse(row.deadline_at)<=now;
    if(expired||!this.isLive(row.session_id)){this.finalize(row,expired?row.deadline_at!:iso,expired?'deadline':'class-ended');changed.add(row.session_id);}
   }
  });
  for(const session of changed)this.changed(session);
 }
 open(session:string,requestId:string,pack:PrivatePracticePack,durationSeconds=1200){
  if(!Number.isInteger(durationSeconds)||durationSeconds<10||durationSeconds>7200)throw practiceError(400,'Set a time limit between 10 seconds and 120 minutes.');
  this.expireDue();
  const id=this.participation.atomic(()=>{
   if(!this.isLive(session))throw practiceError(409,'This classroom has ended.');
   const receipt=this.participation.db.prepare('SELECT pack_id,run_id FROM ranked_practice_open_requests WHERE session_id=? AND request_id=?').get(session,requestId) as {pack_id:string;run_id:string}|undefined;
   if(receipt){if(receipt.pack_id!==pack.id)throw practiceError(409,'This request ID was already used for a different set.');return receipt.run_id;}
   const prior=this.participation.db.prepare('SELECT id,snapshot FROM ranked_practice_runs WHERE session_id=? AND request_id=?').get(session,requestId) as {id:string;snapshot:string}|undefined;
   if(prior){if((JSON.parse(prior.snapshot) as PrivatePracticePack).id!==pack.id)throw practiceError(409,'This request ID was already used for a different set.');return prior.id;}
   const active=this.participation.db.prepare("SELECT id,snapshot FROM ranked_practice_runs WHERE session_id=? AND status='open'").get(session) as {id:string;snapshot:string}|undefined;
   if(active){if((JSON.parse(active.snapshot) as PrivatePracticePack).id===pack.id){this.participation.db.prepare('INSERT INTO ranked_practice_open_requests VALUES(?,?,?,?)').run(session,requestId,pack.id,active.id);return active.id;}throw practiceError(409,'Close the current practice set before opening another lesson.');}
   publicPack(pack);const id=`practice-${randomUUID()}`,now=this.now();
   this.participation.db.prepare("INSERT INTO ranked_practice_runs(id,session_id,request_id,snapshot,status,opened_at,duration_seconds,deadline_at) VALUES(?,?,?,?,'open',?,?,?)").run(id,session,requestId,JSON.stringify(pack),new Date(now).toISOString(),durationSeconds,new Date(now+durationSeconds*1000).toISOString());
   this.participation.db.prepare('INSERT INTO ranked_practice_open_requests VALUES(?,?,?,?)').run(session,requestId,pack.id,id);return id;
  });this.changed(session);return id;
 }
 private answering(session:string,id:string,actor:ClassroomActor,at:number){
  if(actor.roles.includes('teacher')||!actor.roles.includes('student'))throw practiceError(403,'Only students can submit practice choices.');
  if(!this.joined(session,actor.actorId))throw practiceError(403,'Join this classroom before answering.');
  const row=this.row(session,id);
  if(!this.isLive(session)||row.status!=='open'||(row.deadline_at!==null&&Date.parse(row.deadline_at)<=at))throw practiceError(409,'This practice set is closed. Responses are locked.');
  return row;
 }
 answer(session:string,id:string,actor:ClassroomActor,question:string,option:PracticeOptionId,expectedRevision:number){
  // Commit expiry before rejecting a late answer; throwing inside its transaction would roll it back.
  this.expireDue();this.participation.atomic(()=>{
   const at=this.now(),row=this.answering(session,id,actor,at),pack=JSON.parse(row.snapshot) as PrivatePracticePack;
   if(!pack.questions.some(q=>q.id===question&&q.options.some(o=>o.id===option)))throw practiceError(400,'Select an option from this practice snapshot.');
   const old=this.participation.db.prepare('SELECT option_id,revision FROM ranked_practice_responses WHERE run_id=? AND actor_id=? AND question_id=?').get(id,actor.actorId,question) as {option_id:string;revision:number}|undefined;
   if(old?.option_id===option)return;
   if((old?.revision??0)!==expectedRevision)throw practiceError(409,'Your answer changed in another tab. Refresh and choose again.');
   this.participation.db.prepare('INSERT INTO ranked_practice_responses VALUES(?,?,?,?,?,?) ON CONFLICT(run_id,actor_id,question_id) DO UPDATE SET option_id=excluded.option_id,revision=excluded.revision,saved_at=excluded.saved_at').run(id,actor.actorId,question,option,(old?.revision??0)+1,new Date(at).toISOString());
  });this.changed(session);
 }
 submit(session:string,id:string,actor:ClassroomActor){
  this.expireDue();this.participation.atomic(()=>{
   const at=this.now();this.answering(session,id,actor,at);
   this.participation.db.prepare("INSERT OR REPLACE INTO ranked_practice_submissions VALUES(?,?,?,?,'manual',NULL,NULL)").run(id,actor.actorId,new Date(at).toISOString(),this.revisionSum(id,actor.actorId));
  });this.changed(session);
 }
 action(session:string,id:string,action:'close'|'reveal'){
  this.expireDue();this.participation.atomic(()=>{
   const row=this.row(session,id),now=new Date(this.now()).toISOString();
   if(row.status==='open')this.finalize(row,now,'teacher');
   if(action==='reveal'&&row.status!=='revealed')this.participation.db.prepare("UPDATE ranked_practice_runs SET status='revealed',revealed_at=? WHERE id=?").run(now,id);
  });this.changed(session);
 }
 end(session:string){this.participation.atomic(()=>{const rows=this.participation.db.prepare("SELECT * FROM ranked_practice_runs WHERE session_id=? AND status='open'").all(session) as Row[];for(const row of rows)this.finalize(row,new Date(this.now()).toISOString(),'class-ended');});this.changed(session);}
 view(session:string,id:string,actor:ClassroomActor):PracticeRunView {
  const teacher=actor.roles.includes('teacher');if(!teacher&&!this.joined(session,actor.actorId))throw practiceError(403,'Join this classroom to access its practice run.');
  this.expireDue();const row=this.row(session,id),p=JSON.parse(row.snapshot) as PrivatePracticePack;
  const own=this.participation.db.prepare('SELECT * FROM ranked_practice_responses WHERE run_id=? AND actor_id=?').all(id,actor.actorId) as ResponseRow[];
  const responses:PracticeResponse[]=own.map(r=>({schemaVersion:1,questionId:r.question_id,selectedOptionId:r.option_id,revision:r.revision,savedAt:r.saved_at})),answers=new Map(responses.map(r=>[r.questionId,r.selectedOptionId])),visible=row.status==='revealed'||teacher;
  const correct=visible?p.questions.filter(q=>answers.get(q.id)===q.correctOptionId).length:null;
  const results=visible?p.questions.map(q=>({questionId:q.id,selectedOptionId:answers.get(q.id)??null,status:!answers.has(q.id)?'not-attempted' as const:answers.get(q.id)===q.correctOptionId?'correct' as const:'incorrect' as const,correctOptionId:q.correctOptionId,solution:q.solution,optionExplanations:{...q.optionExplanations}})):null;
  const view:PracticeRunView={schemaVersion:1,id,sessionId:session,pack:publicPack(p),status:row.status,openedAt:row.opened_at,closedAt:row.closed_at,revealedAt:row.revealed_at,responses,answered:responses.length,correct,results,serverNow:new Date(this.now()).toISOString(),durationSeconds:row.duration_seconds,deadlineAt:row.deadline_at,closeReason:row.close_reason,...(!teacher?{submission:this.submission(row,actor.actorId)}:{})};
  if(teacher){const all=this.participation.db.prepare('SELECT * FROM ranked_practice_responses WHERE run_id=?').all(id) as ResponseRow[];
   const members=this.participation.db.prepare('SELECT actor_id,display_name FROM participation_members WHERE session_id=?').all(session) as {actor_id:string;display_name:string}[];
   view.summary={students:members.map(m=>{const rs=all.filter(r=>r.actor_id===m.actor_id);return {actorId:m.actor_id,displayName:m.display_name,answered:rs.length,correct:rs.filter(r=>p.questions.find(q=>q.id===r.question_id)?.correctOptionId===r.option_id).length,submission:this.submission(row,m.actor_id)};}),questions:p.questions.map(q=>{const rs=all.filter(r=>r.question_id===q.id);return {questionId:q.id,attempted:rs.length,correct:rs.filter(r=>r.option_id===q.correctOptionId).length,choices:{A:rs.filter(r=>r.option_id==='A').length,B:rs.filter(r=>r.option_id==='B').length,C:rs.filter(r=>r.option_id==='C').length,D:rs.filter(r=>r.option_id==='D').length}};})};
  }return view;
 }
}
