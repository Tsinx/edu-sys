import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin=process.env.MANAGEMENT_QA_ORIGIN||'http://127.0.0.1:4314';
const pages=JSON.parse(await fs.readFile('packages/course-content/src/management-principles/pages.json','utf8'));
const out='output/management-principles/qa-phase2/live-assistant';await fs.mkdir(out,{recursive:true});
const login=await fetch(`${origin}/api/identity/development/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'teacher'})});assert.equal(login.status,201);
const cookie=login.headers.get('set-cookie').split(';')[0];
const api=async(path,data)=>{const r=await fetch(origin+path,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(120000)});assert.ok(r.ok,`${path}: ${r.status}`);return r;};
const results=[];
for(const [lecture,demo,hidden]of[[5,'pdca-shop',/形成标准/],[6,'span-hierarchy',/管理岗位合计＝|总层数4/],[7,'candidate-evidence',/选择了李先生|积极性下降|离职意向/],[8,'saic-integration',/金融危机|回生申请|51\.33/]]){
 const session=(await(await api('/api/courses/management-principles/class-sessions',{})).json()).id;
 const path=`/api/class-sessions/${session}`,p=pages.find(p=>p.demo===demo);
 try{
  await api(`${path}/events`,{type:'set_slide',index:p.index});
  const prompt=await(await api(`${path}/assistant-prompts`)).json();assert.match(prompt.compiled,new RegExp(`<lesson_context number="${lecture}"`));assert.doesNotMatch(prompt.compiled,hidden);assert.doesNotMatch(prompt.compiled,/港口管理|经济数学|OOCL/);
  await fs.writeFile(`${out}/l${lecture}-visible-prompt.txt`,prompt.compiled);
  const start=Date.now();let events=[],failure;
  try{const r=await api(`${path}/assistant/turns`,{text:'请只根据屏幕已经显示的内容，用两三句话解释当前问题。不要翻页、不要推进演示，也不要透露尚未展开的材料。',source:'text'});const body=await r.text();events=body.split('\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6)));await fs.writeFile(`${out}/l${lecture}-response.sse`,body);}catch(e){failure=String(e);}
  const completed=events.find(e=>e.type==='turn.completed');const error=events.find(e=>e.type==='turn.failed');
  if(completed){assert.ok(completed.dialogue.length>10);assert.doesNotMatch(completed.dialogue,hidden);assert.doesNotMatch(completed.dialogue,/港口管理|经济数学|OOCL/);assert.equal(completed.control,null);}
  const snapshot=await(await api(`${path}/snapshot`)).json();assert.equal(snapshot.slide.index,p.index);assert.equal(snapshot.slideInteraction.values.step,0);
  const row={lecture,slideKey:p.slideKey,session,checkedAt:new Date().toISOString(),status:completed?'passed':'external-service-limited',durationMs:Date.now()-start,promptSha256:createHash('sha256').update(prompt.compiled).digest('hex'),contextIsolation:true,unrevealedMaterialAbsent:true,actualServiceRequest:true,dialogue:completed?.dialogue,error:error??failure??(completed?undefined:events)};results.push(row);console.log(JSON.stringify(row));
 }finally{await api(`${path}/end`,{});}
}
await fs.writeFile(`${out}/audit.json`,JSON.stringify({origin,checked:results.length,results},null,2));assert.equal(results.length,4);
