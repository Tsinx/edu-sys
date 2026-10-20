import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createPortClassLab,applyPortClassLabCommand,portLabFinished,serializePortClassLab,makePortClassSubmission,type PortClassLab,type PortClassSubmissionRecord} from '@edu/port-simulation-core';
import {buildApp} from '../src/app.js';
import {CampusIdentityProvider} from '../src/campus/accounts.js';
const course='course-port-management-intro',prefix='/api/port-operations';
function finish(r:PortClassLab){for(let n=0;n<40&&!portLabFinished(r);n++)r=applyPortClassLabCommand(r,{kind:'advance',minutes:360});assert.ok(portLabFinished(r));return r;}
const fields=(lesson:11|12)=>Object.fromEntries((lesson===11?['hypothesis','changes','conclusion','limits']:['scope','barriers','conclusion','handover']).map(k=>[k,'依据本次实验实际交付、成本和观察时点说明证据与结论，下一班仍需继续核查。']));
test('lessons 11 and 12 publish, submit, retry, verify and appear in teacher results and private history',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'edu-class-submissions-')),dataFile=join(dir,'state.json'),identity=new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
 await identity.createAccount('teacher','实验教师','teacher','test-password-123');await identity.createAccount('student','实验学生','student','test-password-123');await identity.createAccount('other','其他学生','student','test-password-123');
 const app=await buildApp({dataFile,identityProvider:identity,campusMode:true,secureIdentityCookie:false});
 try{
  const login=async(username:string)=>String((await app.inject({method:'POST',url:'/api/identity/login',payload:{username,password:'test-password-123'}})).headers['set-cookie']).split(';')[0]!;
  const teacher=await login('teacher'),student=await login('student'),other=await login('other');
  const post=(input:unknown,cookie=student)=>app.inject({method:'POST',url:`${prefix}/submissions`,headers:{cookie},payload:input as object});
  const wait=async(id:string)=>{for(let n=0;n<350;n++){const s=(await app.inject({url:`${prefix}/submissions/${id}`,headers:{cookie:student}})).json();if(s.status==='verified'||s.status==='rejected')return s;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('verification timeout');};
  for(const task of ['performance','emergency-system','emergency-equipment'] as const){
   const lesson=task==='performance'?11:12,run=finish(createPortClassLab(lesson,lesson===11?'trial':'incident',task==='emergency-equipment'?'equipment':lesson===12?'system':undefined));
   const record:PortClassSubmissionRecord={version:'port-class-report/1',lesson,mode:'teaching',run:serializePortClassLab(run),baseline:lesson===11?serializePortClassLab(finish(createPortClassLab(11))):null,trials:lesson===11?[serializePortClassLab(run)]:[],notes:fields(lesson),sealedAt:'2026-10-20T12:00:00Z',findings:{baseline:lesson===11?'基准中闸口等待明显。':'',trials:lesson===11?['试验中实际交付仍需改进。']:[]}};
   const pkg=makePortClassSubmission(record),input={requestId:randomUUID(),courseId:course,expectedRevision:0,package:pkg};
   assert.equal((await post(input)).statusCode,403,'publication is required');assert.equal((await post(input,teacher)).statusCode,403);
   const published=await app.inject({method:'POST',url:`${prefix}/courses/${course}/tasks`,headers:{cookie:teacher},payload:{unit:task}});assert.equal(published.statusCode,200,published.body);
   const sent=await post(input);assert.equal(sent.statusCode,202,sent.body);const id=sent.json().id;assert.equal((await post(input)).json().id,id);
   const done=await wait(id);assert.equal(done.status,'verified',JSON.stringify(done));assert.equal(done.unit,task);
   assert.equal((await app.inject({url:`${prefix}/submissions/${id}/replay`,headers:{cookie:other}})).statusCode,404);
   const replay=await app.inject({url:`${prefix}/submissions/${id}/replay`,headers:{cookie:teacher}});assert.equal(replay.statusCode,200);assert.equal(replay.json().report.kind,'class-lab');assert.equal(replay.json().report.record.mode,'teaching');assert.equal(replay.json().report.runs.length,lesson===11?2:1);
   const results=await app.inject({url:`${prefix}/courses/${course}/results?unit=${task}&status=verified`,headers:{cookie:teacher}});assert.equal(results.statusCode,200,results.body);assert.equal(results.json().rows.length,1);
   const bad=await post({...input,requestId:randomUUID(),package:{...pkg,expected:{...pkg.expected,score:pkg.expected.score===100?99:100}}});assert.equal((await wait(bad.json().id)).status,'rejected');
   const own=(await app.inject({url:`${prefix}/courses/${course}/results`,headers:{cookie:student}})).json();assert.equal(own.rows[0].results.find((s:any)=>s.unit===task).id,id,'a forged grade cannot replace verified evidence');
  }
  const history=await app.inject({url:`${prefix}/history`,headers:{cookie:student}});assert.equal(history.json().total,6);
  assert.equal((await app.inject({url:`${prefix}/history`,headers:{cookie:other}})).json().total,0);
 }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
