import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const api=process.env.PORT_L4_API??'http://127.0.0.1:4314',out='output/port-lesson-four-v10-qa';
const login=await fetch(api+'/api/identity/development/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'teacher'})});const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const headers={'content-type':'application/json',cookie};
const session=await(await fetch(api+'/api/courses/course-port-management-intro/class-sessions',{method:'POST',headers,body:'{}'})).json(),root=api+`/api/class-sessions/${session.id}`;
const results=[];
const get=async path=>await(await fetch(root+path,{headers})).json();
const event=async payload=>await(await fetch(root+'/events',{method:'POST',headers,body:JSON.stringify(payload)})).json();
const transientFailures=[];
const turn=async text=>{let body='';for(let attempt=1;attempt<=3;attempt++){
 const r=await fetch(root+'/assistant/turns',{method:'POST',headers,body:JSON.stringify({text,source:'text'}),signal:AbortSignal.timeout(120000)});body=await r.text();assert.ok(r.ok,body);await fs.writeFile(`${out}/live-ai-${results.length}-${attempt}.sse`,body);
 if(body.includes('turn.completed'))return body;
 if(!body.includes('PROVIDER_UNAVAILABLE'))break;
 transientFailures.push({text,attempt,providerUnavailable:true});await new Promise(resolve=>setTimeout(resolve,2000));
}assert.match(body,/turn.completed/);return body;};
try {
 for(const [cueId,page,command] of [['l4-arrival',10,'进入入港演示'],['l4-cargo',19,'进入装卸演示'],['l4-yard',30,'进入堆场演示'],['l4-departure',35,'进入离港演示']]){
  await event({type:'set_slide',index:153+page});const before=await get('/snapshot');await turn(command);let s=await get('/snapshot');assert.equal(s.teacherDemo?.cueId,cueId,JSON.stringify(s.teacherDemo));assert.equal(s.teacherDemo.active,true);assert.equal(s.teacherDemo.visibleSummary,null);assert.deepEqual(s.simulation,before.simulation);results.push({command,cueId,applied:true,noBusinessRun:true});console.log(command+': applied');
  await turn('返回课件');s=await get('/snapshot');assert.equal(s.teacherDemo.active,false);assert.equal(s.slide.index,153+page);results.push({command:'返回课件',origin:page,applied:true});
 }
 await event({type:'set_slide',index:194});const body=await turn('小麦老师，请给这页三个判断一些思考提示。');results.push({command:'第41页思考提示',completed:true,response:body});
 await fs.writeFile(`${out}/live-assistant.json`,JSON.stringify({provider:'configured live classroom provider',sessionId:session.id,results,transientFailures},null,2));console.log('PASS: real configured model selected four demos and returned to each origin');
}catch(error){await fs.writeFile(`${out}/live-assistant-failure.json`,JSON.stringify({sessionId:session.id,results,error:String(error)},null,2));throw error;}
