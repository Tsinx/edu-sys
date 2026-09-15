// Uses the real classroom UI and isolated API store; model and TTS responses are fixtures.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildApp } from '../apps/platform-api/src/app.ts';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.EDU_PLAYWRIGHT_PATH ? pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href : 'playwright');
process.chdir((await import('node:url')).fileURLToPath(new URL('..',import.meta.url)));
const out=resolve('output/silent-assistant-review');await mkdir(out,{recursive:true});
const app=await buildApp({dataFile:resolve(out,'ui-state.json'),allowDevelopmentIdentity:true,assistantProvider:{name:'silent-ui-fixture',async *streamJson(request){
 const text=request.messages.at(-1)!.content;
 const answer=text.includes('讲解');
 yield JSON.stringify({replyKind:answer?'answer':'control',dialogue:answer?'港口连接水运与陆运。':'好的，为您翻到下一页。',actions:[{type:'slides.next'}],schema:'edu.classroom.assistant.response',version:'1.0'});
}}});
const id=(await app.inject({method:'POST',url:'/api/courses/course-port-management-intro/class-sessions'})).json().id;
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(25000);
const tts:string[]=[];const errors:string[]=[];const checks:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.pathname==='/api/runtime/config')return route.fulfill({json:{profile:'development',identity:'development',avatar:'browser',simulation:'local_solo',synchronization:'checkpoints-v1',speech:{asr:true,tts:true}}});
 if(url.pathname.endsWith('/snapshot/stream'))return route.fulfill({contentType:'text/event-stream',body:': keepalive\n\n'});
 if(url.pathname==='/api/teacher/tts'){tts.push(req.postDataJSON().text);return route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({audioBase64:Buffer.alloc(4800).toString('base64'),sampleRate:24000})+'\n\n'});}
 const result=await app.inject({method:req.method() as any,url:url.pathname+url.search,payload:req.postData()||undefined,headers:{'content-type':req.headers()['content-type']||'application/json'}});
 return route.fulfill({status:result.statusCode,contentType:String(result.headers['content-type']||'application/json'),body:result.body});
});
try{
 await page.goto('http://127.0.0.1:5173/classroom/'+id);
 const expand=page.getByRole('button',{name:'展开港航教学助手',exact:true});if(await expand.count())await expand.click();
 await page.getByRole('button',{name:'文字输入',exact:true}).click();
 const input=page.getByRole('textbox',{name:'文字指令'}),send=page.getByRole('button',{name:'发送文字指令',exact:true});
 await input.fill('下一页');await send.click();
 await page.getByText(/课堂动作已执行：/).waitFor();
 await page.waitForTimeout(500);
 assert.equal(tts.length,0);
 assert.equal((await app.inject({url:'/api/class-sessions/'+id+'/snapshot'})).json().slide.index,2);
 checks.push('real classroom UI executes next slide with zero TTS requests despite model acknowledgement');
 await page.screenshot({path:resolve(out,'silent-command.png')});
 await input.fill('翻到下一页并讲解');await send.click();
 await page.waitForResponse(r=>new URL(r.url()).pathname==='/api/teacher/tts');
 assert.deepEqual(tts,['港口连接水运与陆运。']);
 assert.equal((await app.inject({url:'/api/class-sessions/'+id+'/snapshot'})).json().slide.index,3);
 checks.push('explicit explanation both advances slide and makes one TTS request for teaching content');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'browser-report.json'),JSON.stringify({checks,tts,errors},null,2));console.log(JSON.stringify({checks,tts,errors}));
}finally{await browser.close();await app.close();}
