import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const out='output/port-navigation-qa/',raw=await fs.readFile('output/port-operations-qa/battle-prod.json','utf8');
const b=await chromium.launch({headless:true,args:['--disable-webgl']}),p=await b.newPage(),checks=[];
await p.addInitScript(()=>{window.__wire=[];const W=window.Worker;window.Worker=class extends W{constructor(...args){super(...args);this.label=window.__wire.length;window.__wire.push({created:this.label,url:String(args[0])});this.addEventListener('message',e=>{window.__wire.push({received:this.label,type:e.data.type,id:e.data.id,schema:e.data.view?.schema,rule:e.data.result?.rule,reference:e.data.reference,message:e.data.message});if(e.data.view)window.__view=e.data.view;});this.addEventListener('error',e=>window.__wire.push({error:this.label,message:e.message}));}postMessage(m){window.__wire.push({sent:this.label,type:m.type,id:m.id,schema:m.schema});super.postMessage(m);}};});
const monitor=setInterval(()=>p.evaluate(()=>({view:window.__view?{schema:window.__view.schema,score:window.__view.score}:null,wire:window.__wire})).then(x=>fs.writeFile(`${out}history-trace.json`,JSON.stringify(x,null,2))).catch(()=>{}),5000);
try{
 await p.goto('http://127.0.0.1:4173/port-simulation-preview.html?course=full');await p.getByRole('button',{name:'跳过，直接练习',exact:true}).click();
 await p.locator('input[type=file]').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await p.waitForFunction(()=>window.__view?.schema==='port-operations/3.0'&&window.__view.status==='completed',null,{timeout:180000});
 await p.waitForFunction(()=>window.__view.score.referenceReady,null,{timeout:180000});assert.equal(await p.evaluate(()=>window.__view.score.total),92.66);checks.push('3.0 completed replay recomputes its original 92.66 score');
 await p.getByRole('navigation',{name:'业务工作台'}).getByRole('button',{name:'复盘',exact:true}).click();
 const old=p.locator('.port-history>div').filter({hasText:'原通航规则'});await old.getByRole('button',{name:'同船期重练',exact:true}).click();await p.waitForFunction(()=>window.__view.schema==='port-operations/3.0'&&window.__view.status==='ready');checks.push('same-schedule retry retains legacy navigation rules');
 await p.reload();await p.waitForFunction(()=>window.__view?.schema==='port-operations/3.0');checks.push('version-isolated history restores the selected legacy rules after refresh');
 await fs.writeFile(`${out}history-browser.json`,JSON.stringify({checks,score:92.66},null,2));console.log(JSON.stringify({checks}));
}finally{clearInterval(monitor);await b.close();}
