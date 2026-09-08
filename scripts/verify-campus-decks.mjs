import assert from "node:assert/strict";
import { readFile,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const {chromium}=await import(process.env.EDU_PLAYWRIGHT_PATH?pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href:"playwright");
const fixture=JSON.parse(await readFile(resolve(".runtime/campus-browser-info.json"),"utf8"));
const browser=await chromium.launch({headless:true,channel:"msedge"});
const results=[];const errors=[];
try {
  const teacher=await browser.newContext();const student=await browser.newContext({viewport:{width:1600,height:1100}});
  for(const [context,role] of [[teacher,"teacher"],[student,"student"]]) {
    const response=await context.request.post(fixture.address+"/api/identity/login",{data:{username:role+"-qa",password:fixture.password}});assert.equal(response.status(),200);
  }
  const page=await student.newPage();page.on("pageerror",error=>errors.push(error.message));
  for(const [course,id] of Object.entries(fixture.classrooms)) {
    await teacher.request.post(`${fixture.address}/api/class-sessions/${id}/events`,{data:{type:"set_slide",index:1}});
    await page.goto(`${fixture.address}/join/${id}`);await page.locator(".slide-logical-canvas").waitFor();
    const snapshot=await (await teacher.request.get(`${fixture.address}/api/class-sessions/${id}/snapshot`)).json();
    for(let index=1;index<=snapshot.slide.total;index++) {
      const response=await teacher.request.post(`${fixture.address}/api/class-sessions/${id}/events`,{data:{type:"set_slide",index}});assert.equal(response.status(),201);const next=await response.json();
      await page.waitForFunction(title=>document.querySelector(".slide-letterbox")?.getAttribute("aria-label")?.includes(title),next.slide.title);
      for(const width of [1600,390]) {
        await page.setViewportSize({width,height:width===390?844:1100});
        const check=await page.evaluate(async()=>{
          await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const canvas=document.querySelector(".slide-logical-canvas");
          await Promise.all([...canvas.querySelectorAll("img")].map(img=>img.decode().catch(()=>undefined)));
          const bounds=canvas.getBoundingClientRect();const range=document.createRange();const walker=document.createTreeWalker(canvas,NodeFilter.SHOW_TEXT);const clipped=[];
          while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent.trim() || !node.parentElement?.getClientRects().length || node.parentElement.closest("svg,[aria-hidden=true],.katex-mathml"))continue;range.selectNodeContents(node);for(const r of range.getClientRects()){if(r.width>0&&(r.left<bounds.left-2 || r.right>bounds.right+2 || r.top<bounds.top-2 || r.bottom>bounds.bottom+2)){clipped.push(node.textContent.slice(0,70));break;}}}
          return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,logical:[canvas.clientWidth,canvas.clientHeight],broken:[...canvas.querySelectorAll("img")].filter(img=>img.naturalWidth===0).map(img=>img.src),leaks:canvas.querySelectorAll("[data-teaching-cue],[data-assistant-cue],[data-story-beat],[data-open-question],[data-voyage-stage]").length,clipped};
        });
        results.push({course,index,...check});assert.ok(check.scrollWidth<=width+1,JSON.stringify(results.at(-1)));assert.deepEqual(check.logical,[1600,1000]);assert.equal(check.broken.length,0,JSON.stringify(results.at(-1)));assert.equal(check.leaks,0);assert.equal(check.clipped.length,0,JSON.stringify(results.at(-1)));
      }
      if(index%100===0)console.log(`${course}: ${index}/${snapshot.slide.total}`);
    }
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve("output/campus-deployment-review/decks.json"),JSON.stringify({checkedAt:new Date().toISOString(),pages:results.length,errors,results},null,2));console.log(`PASS ${results.length} slide/viewport combinations`);
} catch(error){await writeFile(resolve("output/campus-deployment-review/decks-failure.json"),JSON.stringify({failure:String(error),errors,results},null,2));throw error;}
finally{await browser.close();}
