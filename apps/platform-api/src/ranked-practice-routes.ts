import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {ServerResponse} from 'node:http';
import {practiceOpenSchema,practiceAnswerSchema,type ClassroomActor} from '@edu/contracts';
import {z} from 'zod';
import type {JsonStateStore} from './store.js';
import type {ClassroomParticipation} from './classroom-participation.js';
import {RankedPractice,practiceError} from './ranked-practice.js';
import {getRankedPracticePack,publicPack} from './practice-content/index.js';
export function registerRankedPractice(app:FastifyInstance,store:JsonStateStore,participation:ClassroomParticipation,resolve:(r:FastifyRequest)=>Promise<ClassroomActor|null>,allowed:(a:ClassroomActor)=>string[]|null){
 const service=new RankedPractice(participation,id=>store.getSession(id)?.status==='live');
 const streams=new Set<ServerResponse>();
 app.addHook('preClose',async()=>{service.close();for(const stream of streams)stream.end();});
 const access=async(r:FastifyRequest,courseId:string,teacher=false)=>{
  const a=await resolve(r);if(!a)throw practiceError(401,'Sign in to access practice.');
  const c=store.getCourse(courseId);if(!c)throw practiceError(404,'Course not found.');
  const ids=allowed(a);if(ids&&!ids.includes(courseId))throw practiceError(403,'You are not enrolled in this course.');
  if(teacher&&(!a.roles.includes('teacher')||c.teacherId!==a.actorId))throw practiceError(403,'Only the course teacher can manage practice.');
  if(!a.roles.includes('teacher')&&!a.roles.includes('student'))throw practiceError(403,'Course access is required.');
  return a;
 };
 const classroom=async(r:FastifyRequest,teacher=false)=>{
  const {sessionId}=r.params as {sessionId:string};const session=store.getSession(sessionId);
  if(!session)throw practiceError(404,'Classroom not found.');
  const a=await access(r,session.courseId,teacher);
  if(a.roles.includes('teacher')&&session.teacherId!==a.actorId)throw practiceError(403,'This classroom belongs to another teacher.');
  return {a,sessionId,session};
 };
 app.get('/api/courses/:courseId/practice-packs/:lesson',async r=>{
  const {courseId,lesson}=r.params as {courseId:string;lesson:string};await access(r,courseId);
  const p=getRankedPracticePack(courseId,Number(lesson));if(!p)throw practiceError(404,'Practice pack not found.');return publicPack(p);
 });
 app.get('/api/courses/:courseId/practice-packs/:lesson/teacher',async r=>{
  const {courseId,lesson}=r.params as {courseId:string;lesson:string};await access(r,courseId,true);
  const p=getRankedPracticePack(courseId,Number(lesson));if(!p)throw practiceError(404,'Practice pack not found.');
  return {pack:publicPack(p),guidance:{teachingMinutes:[45,25],practiceMinutes:[2,14,4],formative:true},answers:p.questions.map(q=>({questionId:q.id,correctOptionId:q.correctOptionId,solution:q.solution,optionExplanations:q.optionExplanations}))};
 });
 app.post('/api/class-sessions/:sessionId/practice/join',async r=>{
  const {a,sessionId,session}=await classroom(r);
  if(a.roles.includes('teacher'))throw practiceError(403,'Teacher preview cannot submit responses.');
  if(!service.joined(sessionId,a.actorId)){if(session.status!=='live')throw practiceError(409,'This classroom has ended.');participation.join(sessionId,a,a.displayName);}
  return {joined:true};
 });
 app.get('/api/class-sessions/:sessionId/practice',async r=>{
  const {a,sessionId}=await classroom(r);const joined=a.roles.includes('teacher')||service.joined(sessionId,a.actorId),id=service.latest(sessionId);
  return {joined,run:joined&&id?service.view(sessionId,id,a):null,...(a.roles.includes('teacher')?{history:service.history(sessionId)}:{})};
 });
 // The stream only signals changes. Each authenticated client fetches its own view.
 app.get('/api/class-sessions/:sessionId/practice/stream',async(r,reply)=>{
  const {a,sessionId}=await classroom(r);
  if(!a.roles.includes('teacher')&&!service.joined(sessionId,a.actorId))throw practiceError(403,'Join this classroom before receiving practice.');
  reply.hijack();const response=reply.raw;
  response.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform',Connection:'keep-alive','X-Accel-Buffering':'no'});
  streams.add(response);
  const send=()=>{if(response.destroyed||response.writableEnded)return;if(response.writableLength>256*1024){response.end();return;}response.write('event: practice\ndata: {"changed":true}\n\n');};
  const unsubscribe=service.subscribe(sessionId,send);
  const timer=setInterval(()=>{void classroom(r).then(({a:current})=>{if(response.destroyed||response.writableEnded)return;if(current.actorId!==a.actorId||current.roles.join()!==a.roles.join())response.end();else response.write(': keepalive\n\n');}).catch(()=>response.end());},15000);timer.unref();
  response.on('close',()=>{clearInterval(timer);unsubscribe();streams.delete(response);});send();
 });
 app.post('/api/class-sessions/:sessionId/practice/runs',async r=>{
  const {a,sessionId,session}=await classroom(r,true);const input=practiceOpenSchema.parse(r.body),p=getRankedPracticePack(session.courseId,input.lesson);
  if(!p)throw practiceError(404,'Practice pack not found.');const id=service.open(sessionId,input.requestId,p,input.durationSeconds);return service.view(sessionId,id,a);
 });
 app.post('/api/class-sessions/:sessionId/practice/runs/:runId/submit',async r=>{
  const {a,sessionId}=await classroom(r);z.object({}).strict().parse(r.body??{});
  const {runId}=r.params as {runId:string};service.submit(sessionId,runId,a);return service.view(sessionId,runId,a);
 });
 app.get('/api/class-sessions/:sessionId/practice/runs/:runId',async r=>{const {a,sessionId}=await classroom(r);return service.view(sessionId,(r.params as {runId:string}).runId,a);});
 app.put('/api/class-sessions/:sessionId/practice/runs/:runId/questions/:questionId/answer',async r=>{
  const {a,sessionId}=await classroom(r),{runId,questionId}=r.params as {runId:string;questionId:string},input=practiceAnswerSchema.parse(r.body);
  service.answer(sessionId,runId,a,questionId,input.selectedOptionId,input.expectedRevision);return service.view(sessionId,runId,a);
 });
 app.post('/api/class-sessions/:sessionId/practice/runs/:runId/action',async r=>{
  const {a,sessionId}=await classroom(r,true),{action}=z.object({action:z.enum(['close','reveal'])}).strict().parse(r.body),{runId}=r.params as {runId:string};
  service.action(sessionId,runId,action);return service.view(sessionId,runId,a);
 });return service;
}
