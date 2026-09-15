import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4314',out='output/management-principles/qa';
const pages=JSON.parse(await fs.readFile('packages/course-content/src/management-principles/pages.json','utf8')),p=pages.find(s=>s.demo==='decision-tree');
const login=await fetch(`${base}/api/identity/development/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role:'teacher'})});assert.equal(login.status,201);const cookie=login.headers.get('set-cookie').split(';')[0];
const call=(path,method='GET',body)=>fetch(base+path,{method,headers:{cookie,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
const start=await call('/api/courses/management-principles/class-sessions','POST');assert.equal(start.status,201);const session=(await start.json()).id;
await call(`/api/class-sessions/${session}/events`,'POST',{type:'set_slide',index:p.index});
const prompt=await(await call(`/api/class-sessions/${session}/assistant-prompts`)).json();
await fs.writeFile(`${out}/live-assistant-prompt.json`,JSON.stringify(prompt,null,2));
let report={checkedAt:new Date().toISOString(),origin:base,session,slideKey:p.slideKey,phase:0,request:'请解释当前页面已经显示的选择条件，不计算尚未揭示的答案。',status:'pending'};
try{
 const r=await call(`/api/class-sessions/${session}/assistant/turns`,'POST',{text:report.request,source:'text'});const text=await r.text();await fs.writeFile(`${out}/live-assistant-response.sse`,text);
 const events=text.split('\n\n').filter(Boolean).map(block=>{const kind=block.match(/^event:\s*(.*)$/m)?.[1];const data=block.match(/^data:\s*(.*)$/m)?.[1];try{return{kind,data:JSON.parse(data)}}catch{return{kind,data}}});
 const complete=events.find(e=>e.kind==='turn.completed'||e.data?.type==='turn.completed'),failure=events.find(e=>['turn.failed','error'].includes(e.kind??e.data?.type));
 report={...report,httpStatus:r.status,status:complete?'passed':'external-service-limited',completed:complete??null,failure:failure??null};
}catch(error){report={...report,status:'external-service-limited',reason:String(error)};}
await call(`/api/class-sessions/${session}/end`,'POST');await fs.writeFile(`${out}/live-assistant.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
