import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(process.env.EDU_PLAYWRIGHT_ENTRY||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const output=resolve(process.env.EDU_QA_OUTPUT||'output/live2d-qa/p0-eyes');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin=process.env.EDU_WEB_ORIGIN||'http://127.0.0.1:5173';
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}});
  await page.goto(`${origin}/avatar/xiaomai/preview`);await page.locator('.live2d-avatar[data-status="ready"]').waitFor();
  await page.getByRole('button',{name:'回正',exact:true}).click();await page.waitForTimeout(2000);
  const fidelity=await page.locator('[data-xiaomai-eyes]').evaluate(async root=>{
    const result=[];
    for(const canvas of root.querySelectorAll('canvas')){
      const left=canvas.dataset.eye==='left';const x=left?393:528,y=left?248:234;
      const image=new Image();image.src=`/avatar/live2d/xiaomai/p0/Eye${left?'L':'R'}_Full.png`;await image.decode();
      const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
      const context=reference.getContext('2d');context.drawImage(image,-x,-y);
      const expected=context.getImageData(0,0,canvas.width,canvas.height).data,actual=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let different=0,max=0;for(let i=0;i<expected.length;i++){const d=Math.abs(actual[i]-expected[i]);if(d)different++;max=Math.max(max,d);}
      result.push({eye:left?'left':'right',differentChannels:different,maxChannelDifference:max});
    }
    return result;
  });
  assert.equal(fidelity.length,2);for(const item of fidelity)assert.equal(item.differentChannels,0);
  const avatar=page.locator('.live2d-avatar');await avatar.screenshot({path:resolve(output,'restored.png')});
  for(const [label,name] of [['半睁眼','half'],['轻闭眼','closed'],['看左侧','left'],['看右侧','right'],['看上方','up'],['看下方','down']]){
    await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(1600);
    await avatar.screenshot({path:resolve(output,`${name}.png`)});
  }
  await page.close();
  // Compare against the same native model with its original open-eye meshes enabled.
  const reference=await browser.newPage({viewport:{width:1200,height:1000}});
  await reference.route('**/xiaomai-rig.ts*',async route=>{
    const response=await route.fetch(),body=await response.text();
    const changed=body.replace(/core\.getDrawableOpacity\s*=\s*[^;]+;/,'core.getDrawableOpacity = originals.getDrawableOpacity.bind(core);');
    assert.notEqual(changed,body);await route.fulfill({response,body:changed});
  });
  await reference.goto(`${origin}/avatar/xiaomai/preview`);await reference.locator('.live2d-avatar[data-status="ready"]').waitFor();
  await reference.getByLabel('转头版本').selectOption('p0');
  await reference.getByRole('button',{name:'回正',exact:true}).click();await reference.waitForTimeout(2000);
  await reference.addStyleTag({content:'[data-xiaomai-eyes]{display:none!important}'});
  await reference.locator('.live2d-avatar').screenshot({path:resolve(output,'original-native.png')});
  await reference.close();
  const review=await browser.newPage({viewport:{width:1590,height:720},deviceScaleFactor:1});
  await review.setContent('<html><body style="margin:0;background:#eef4f1;font:16px sans-serif;display:grid;grid-template-columns:repeat(3,530px)"></body></html>');
  for(const [file,label] of [['original-native','原版模型'],['restored','独立瞳孔 · 正视'],['half','半闭眼'],['left','看左'],['right','看右'],['closed','闭眼'],['up','看上'],['down','看下']]){
    const data=(await readFile(resolve(output,`${file}.png`))).toString('base64');
    await review.evaluate(async({data,label})=>{const figure=document.createElement('figure');figure.style.cssText='margin:0;padding:6px';const caption=document.createElement('figcaption');caption.textContent=label;figure.append(caption);const c=document.createElement('canvas');c.width=510;c.height=186;const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();c.getContext('2d').drawImage(image,170,186,170,62,0,0,510,186);figure.append(c);document.body.append(figure);},{data,label});
  }
  await review.screenshot({path:resolve(output,'magnified-review.png')});
  await writeFile(resolve(output,'fidelity.json'),JSON.stringify(fidelity,null,2));console.log(JSON.stringify(fidelity));
}finally{await browser.close();}
