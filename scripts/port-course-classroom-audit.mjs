import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
const out=fileURLToPath(new URL('../output/port-course-qa/',import.meta.url));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],checks=[];
try{
 const p=await browser.newPage({viewport:{width:1280,height:900}});p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:'export const createHotContext=()=>({accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){},data:{}});export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(url)=>url;'}));
 await p.route('**/port-course-teacher-harness*',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/src/features/port-simulation/port-operations.css"><div id="root"></div><script type="module">
 const Refresh=(await import('/@react-refresh')).default;Refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 const reactModule=await import('/node_modules/.vite/deps/react.js');const {createElement}=reactModule.default??reactModule;const domModule=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=domModule.default??domModule;const {PortCourseStudio}=await import('/src/features/port-simulation/PortCourseStudio.tsx');
 localStorage.setItem('edu-port-operations:curriculum:qa-course:qa-actor',JSON.stringify({selected:'full',completed:['arrival']}));
 createRoot(document.getElementById('root')).render(createElement(PortCourseStudio,{storage:localStorage,storageScope:'qa-course:qa-actor',initialLearningStage:'cargo',learningStageLocked:true,initialTrainingMode:'practice',trainingModeLocked:true,sourceLabel:'课堂验收'}));
 </script>`}));
 await p.goto('http://127.0.0.1:5173/port-course-teacher-harness?course=departure&demo=1');await p.locator('[data-course="cargo"][data-demo="false"]').waitFor();await p.getByRole('button',{name:'跳过，直接练习',exact:true}).click();
 assert.equal(await p.getByRole('navigation',{name:'课程分段'}).getByRole('button',{name:/入港/}).isDisabled(),true);assert.equal(await p.getByRole('navigation',{name:'课程分段'}).getByRole('button',{name:/综合/}).isDisabled(),true);checks.push('teacher-selected cargo checkpoint overrides stored course and URL choices; unrelated module buttons are locked');
 await p.getByRole('button',{name:'标准演示',exact:true}).click();await p.locator('[data-course="cargo"][data-demo="true"]').waitFor();await p.getByRole('button',{name:'下一步演示',exact:true}).click();await p.getByRole('button',{name:'返回自主练习',exact:true}).click();await p.locator('[data-course="cargo"][data-demo="false"][data-status="ready"]').waitFor();checks.push('the teacher-locked segment permits its own demonstration and returns to the untouched checkpoint');
 await p.goto('http://127.0.0.1:4173/port-simulation-preview.html?course=yard&demo=1');await p.locator('[data-course="yard"][data-demo="true"]').waitFor();checks.push('teacher demonstration links open the requested segment directly in production');
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}classroom-browser.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();}
