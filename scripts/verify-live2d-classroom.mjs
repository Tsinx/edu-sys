import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const origin=process.env.EDU_WEB_ORIGIN||'http://127.0.0.1:5173';
const output=resolve('output/live2d-qa');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  const original=window.fetch;
  window.fetch=async(...args)=>{
    const response=await original(...args);
    if(String(args[0]).endsWith('/api/teacher/tts')&&response.ok){
      window.__tts={chunks:0,bytes:0,done:false};
      void(async()=>{const reader=response.clone().body.getReader();const decoder=new TextDecoder();let buffer='';
        while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop();
          for(const line of lines){if(line.startsWith('data:')){const event=JSON.parse(line.slice(5));if(event.audioBase64){window.__tts.chunks++;window.__tts.bytes+=atob(event.audioBase64).length;}if(event.error)window.__tts.error=event.error;}}
          if(done){window.__tts.done=true;break;}}
      })();
    }
    return response;
  };
});
await page.route('**/avatar/live2d/core/live2dcubismcore.min.js',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`;(()=>{const update=Live2DCubismCore.Model.prototype.update;Live2DCubismCore.Model.prototype.update=function(){const mouth=this.parameters.values[this.parameters.ids.indexOf('ParamMouthOpenY')];window.__mouth=mouth;window.__maxMouth=Math.max(window.__maxMouth||0,mouth);return update.apply(this,arguments);};})();`});
});
// Optional live speech test is explicit because it calls the configured AI/TTS service.
try{
  const sessions=await (await page.request.get(`${origin}/api/class-sessions`)).json();
  const session=sessions.filter(s=>s.status==='live').at(-1);assert.ok(session,'A live classroom is required');
  await page.goto(`${origin}/classroom/${session.id}`);
  const expand=page.getByRole('button',{name:'展开小麦老师',exact:true});if(await expand.isVisible())await expand.click();
  await page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:45000});
  async function snapshot(name){
    await page.waitForTimeout(300);await page.screenshot({path:resolve(output,`${name}.png`)});
    const result=await page.evaluate(()=>{const avatar=document.querySelector('.live2d-avatar'),canvas=avatar.querySelector('canvas');const a=avatar.getBoundingClientRect(),c=canvas.getBoundingClientRect();return{avatar:{width:a.width,height:a.height},canvas:{width:c.width,height:c.height},overflow:document.documentElement.scrollWidth>innerWidth,canvasInside:c.top>=a.top-1&&c.bottom<=a.bottom+1};});
    assert.ok(result.avatar.height>=120);assert.equal(result.canvasInside,true);assert.equal(result.overflow,false);checks.push({name,...result});
  }
  await snapshot('classroom-desktop');
  await page.getByRole('button',{name:'头像',exact:true}).click();await snapshot('classroom-portrait');
  await page.getByRole('button',{name:'胸像',exact:true}).click();
  if(process.env.EDU_LIVE_SPEECH_QA==='1'){
    await page.getByRole('button',{name:'文字输入',exact:true}).click();
    await page.getByLabel('文字指令',{exact:true}).fill('请用一句话解释什么是港口。');
    const tts=page.waitForResponse(r=>r.url().endsWith('/api/teacher/tts'),{timeout:60000});
    await page.getByRole('button',{name:'发送文字指令',exact:true}).click();
    const response=await tts;assert.equal(response.status(),200);
    await page.waitForFunction(()=>window.__tts?.done&&window.__maxMouth>0.1,{},{timeout:45000});
    const speech=await page.evaluate(()=>({...window.__tts,maxMouth:window.__maxMouth}));assert.ok(speech.chunks>0);assert.ok(!speech.error);
    checks.push({name:'live classroom question and TTS',status:response.status(),...speech});
    await page.screenshot({path:resolve(output,'classroom-live-speech.png')});
    const stop=page.getByRole('button',{name:'中断讲解',exact:true});if(await stop.isVisible())await stop.click();
  }
  const fullscreen=page.getByRole('button',{name:'全屏',exact:true});
  await fullscreen.click();
  const show=page.getByRole('button',{name:'展开数字人浮窗',exact:true});if(await show.isVisible())await show.click();
  await snapshot('classroom-fullscreen');await page.evaluate(()=>document.exitFullscreen());
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(300);if(await expand.isVisible())await expand.click();
  await snapshot('classroom-narrow');
  await page.goto(`${origin}/study/course-port-management-intro`);
  await page.locator('.live2d-avatar[data-status="ready"]').waitFor({timeout:45000});await snapshot('student-narrow');
  await page.setViewportSize({width:1600,height:1000});await snapshot('student-desktop');
  await writeFile(resolve(output,process.env.EDU_LIVE_SPEECH_QA==='1'?'classroom-live-report.json':'classroom-report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:resolve(output,'classroom-failure.png')});console.error((await page.locator('body').innerText()).slice(-6500));throw error;}
finally{await browser.close();}
