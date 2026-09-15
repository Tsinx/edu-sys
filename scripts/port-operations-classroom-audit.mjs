import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const output=fileURLToPath(new URL('../output/port-operations-qa/',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:'export const createHotContext=()=>({accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(url)=>url;'}));
 await page.route('**/port-operations-teacher-harness',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/src/features/port-simulation/port-operations.css"><div id="root"></div><script type="module">
 const Refresh=(await import('/@react-refresh')).default;Refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 const reactModule=await import('/node_modules/.vite/deps/react.js');const {createElement}=reactModule.default??reactModule;const domModule=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=domModule.default??domModule;const {PortOperationsStudio}=await import('/src/features/port-simulation/PortOperationsStudio.tsx');
 localStorage.setItem('edu-port-operations:selection:qa-course:qa-actor','practice');
 createRoot(document.getElementById('root')).render(createElement(PortOperationsStudio,{storage:localStorage,storageScope:'qa-course:qa-actor',initialTrainingMode:'battle',trainingModeLocked:true,sourceLabel:'课堂验收'}));
 </script>`}));
 await page.goto('http://127.0.0.1:5173/port-operations-teacher-harness');await page.locator('[data-mode="battle"]').waitFor({timeout:90000});await page.getByRole('navigation',{name:'业务工作台'}).getByRole('button',{name:'规划',exact:true}).click();assert.equal(await page.getByLabel('场次类型',{exact:true}).isDisabled(),true);assert.equal(await page.getByLabel('场次类型',{exact:true}).inputValue(),'battle');
 const wrong=JSON.parse(await fs.readFile(`${output}efficient-plan.json`,'utf8'));wrong.mode='practice';await page.locator('input[type="file"]').setInputFiles({name:'wrong-mode.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(wrong))});await page.getByText('导入场次与教师指定模式不一致。',{exact:true}).waitFor();assert.equal(await page.locator('.port-ops').getAttribute('data-mode'),'battle');assert.equal(await page.locator('.port-ops').getAttribute('data-status'),'ready');
 assert.deepEqual(errors,[]);await fs.writeFile(`${output}classroom-browser.json`,JSON.stringify({checks:['teacher battle overrides saved practice preference','student cannot change the teacher-selected mode','opposite-mode import is rejected without interrupting the selected session'],errors},null,2));console.log('PASS classroom mode lock, preference override and import boundary');
}finally{await browser.close();}
