import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const root='output/port-lbl-qa/pdf-pages';await fs.mkdir(root,{recursive:true});
const selected=process.argv.find(value=>value.startsWith('--page='));
const start=selected?Number(selected.split('=')[1]):0;
if(!Number.isInteger(start)||start<0||start>105)throw new Error('Invalid page index');
await page.goto(`http://127.0.0.1:8198/port-lbl-preview.html?projection=1&page=${start}`,{waitUntil:'networkidle'});
await page.addStyleTag({content:'@page{size:1600px 1000px;margin:0}html,body,#root{width:1600px!important;height:1000px!important;margin:0!important;overflow:hidden!important}.lbl-preview{height:1000px!important;grid-template-rows:1000px!important}.lbl-stage{height:1000px!important}.slide-logical-canvas{transform:translate(-50%,-50%) scale(1)!important}.lbl-print-globe{display:none}@media print{.lbl-print-globe{display:block!important}.lbl-globe .earth-globe{visibility:hidden!important}}'});
const metadata=selected?JSON.parse(await fs.readFile(`${root}/page-metadata.json`,'utf8')):[];
const limit=selected?start+1:process.argv.includes('--sample')?3:106;
for(let index=start;index<limit;index++){
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
  if(await page.locator('.lbl-globe').count()){
    await page.waitForFunction(()=>[...document.querySelectorAll('.lbl-globe .earth-globe')].every(e=>e.classList.contains('earth-globe--ready')));
    await page.waitForTimeout(300);
    // Capture just the globe layer; the authored typography stays vector text.
    await page.evaluate(()=>{for(const element of document.querySelector('.lbl-slide').children)if(!element.classList.contains('lbl-globe')){element.dataset.pdfVisibility=element.style.visibility;element.style.visibility='hidden';}});
    for(const globe of await page.locator('.lbl-globe').all()){
      const box=await globe.boundingBox();
      const clip={x:Math.max(0,box.x),y:Math.max(0,box.y),width:Math.min(1600,box.x+box.width)-Math.max(0,box.x),height:Math.min(1000,box.y+box.height)-Math.max(0,box.y)};
      const bitmap=await page.screenshot({clip,type:'jpeg',quality:96});
      await globe.evaluate((element,{bitmap,box,clip})=>{const image=document.createElement('img');image.className='lbl-print-globe';image.src='data:image/jpeg;base64,'+bitmap;Object.assign(image.style,{position:'absolute',left:`${clip.x-box.x}px`,top:`${clip.y-box.y}px`,width:`${clip.width}px`,height:`${clip.height}px`});element.append(image);},{bitmap:bitmap.toString('base64'),box,clip});
    }
    await page.evaluate(()=>{for(const element of document.querySelectorAll('[data-pdf-visibility]')){element.style.visibility=element.dataset.pdfVisibility;delete element.dataset.pdfVisibility;}});
  }
  metadata[index]=await page.evaluate(()=>({title:document.querySelector('.lbl-title')?.textContent,text:document.querySelector('.lbl-slide')?.textContent}));
  await page.pdf({path:`${root}/page-${String(index+1).padStart(3,'0')}.pdf`,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
  await page.evaluate(()=>document.querySelectorAll('.lbl-print-globe').forEach(e=>e.remove()));
  await page.keyboard.press('ArrowRight');
  if(index%20===0)console.log(`PDF ${index+1}/${limit}`);
}
await fs.writeFile(`${root}/page-metadata.json`,JSON.stringify(metadata,null,2));await browser.close();
