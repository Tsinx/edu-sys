/** Build and audit the append-only Lecture 3 supplement. Never publish the private answer book. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
const root=process.cwd(),scratch=path.join(root,'.runtime/factorisation-build');
const output=path.join(root,'output/international-mathematics/factorisation-supplement');
const publicRoot=path.join(root,'apps/teacher-web/public/course-assets/international-mathematics/factorisation');
for(const p of [scratch,output,publicRoot,path.join(output,'qa')])await fs.mkdir(p,{recursive:true});
const entry=`
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {MathematicsCanvas} from '../../apps/teacher-web/src/features/international-mathematics/InternationalMathematicsStage';
import {PracticeSheet,PracticeText,PracticePlot} from '../../apps/teacher-web/src/features/ranked-practice/PracticeSheet';
import {INTERNATIONAL_MATHEMATICS_SLIDES,FACTORISATION_SUPPLEMENT,FACTORISATION_WORKED_EXAMPLES} from '../../packages/course-content/src/international-mathematics/index';
import {factorisationPractice} from '../../apps/platform-api/src/practice-content/factorisation-supplement';
import {publicPack} from '../../apps/platform-api/src/practice-content/authoring';
export function prepare(){return {
 slides:INTERNATIONAL_MATHEMATICS_SLIDES.filter(s=>s.lesson===17).map(spec=>render(<MathematicsCanvas spec={spec}/>)),
 practice:render(<PracticeSheet pack={publicPack(factorisationPractice)} locked={false}/>),
 pack:publicPack(factorisationPractice),privatePack:factorisationPractice,
 guide:FACTORISATION_SUPPLEMENT.teacherGuide,examples:FACTORISATION_WORKED_EXAMPLES};}
export const rich=(text)=>render(<PracticeText text={text}/>);
export const graph=(g)=>g?render(<PracticePlot graph={g}/>):'';
`;
await fs.writeFile(path.join(scratch,'render.tsx'),entry);
await build({entryPoints:[path.join(scratch,'render.tsx')],bundle:true,platform:'node',format:'cjs',outfile:path.join(scratch,'render.cjs'),jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env.PROD':'false','import.meta.env.VITE_EDU_RELEASE_ID':'"supplement-qa"'},nodePaths:[path.join(root,'apps/teacher-web/node_modules')],logLevel:'warning'});
const {createRequire}=await import('node:module'),require=createRequire(import.meta.url);
const {prepare,rich,graph}=require(path.join(scratch,'render.cjs'));
const data=prepare(),ranks=['','Foundation','Core','Application','Challenge'];
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const imCss=await fs.readFile(path.join(root,'apps/teacher-web/src/features/international-mathematics/international-mathematics.css'),'utf8');
const practiceCss=await fs.readFile(path.join(root,'apps/teacher-web/src/features/ranked-practice/practice.css'),'utf8');
await fs.copyFile(path.join(root,'apps/teacher-web/node_modules/katex/dist/katex.min.css'),path.join(publicRoot,'katex.min.css'));
await fs.copyFile(path.join(root,'apps/teacher-web/node_modules/katex/LICENSE'),path.join(publicRoot,'KaTeX-LICENSE.txt'));
await fs.cp(path.join(root,'apps/teacher-web/node_modules/katex/dist/fonts'),path.join(publicRoot,'fonts'),{recursive:true});
await fs.writeFile(path.join(publicRoot,'supplement.css'),`${imCss}\n${practiceCss}`);
await fs.writeFile(path.join(scratch,'private-packs.json'),JSON.stringify([data.privatePack],null,2));
const head=title=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><link rel="stylesheet" href="katex.min.css"><link rel="stylesheet" href="supplement.css">`;
const fit=`function fitFormulas(){document.querySelectorAll('.im-formula').forEach(el=>{el.style.transform='none';const p=el.parentElement,f=Math.min(1,p.clientWidth/el.scrollWidth,p.clientHeight/el.scrollHeight);el.style.transform='scale('+f+')';el.dataset.fitScale=f.toFixed(3);});}`;
const viewer=`${head('Lecture 3 supplement: Factoring Quadratics')}
<style>*{box-sizing:border-box}body{margin:0;background:#eceee8;color:#18232c;font:16px Arial,sans-serif}header.viewer-header{height:65px;padding:8px 18px;display:flex;align-items:center;gap:18px;background:#fffdf7;border-bottom:1px solid #ccd2cb}header.viewer-header strong{font-size:19px}a{color:#2357d8}#slides{height:calc(100dvh - 65px);display:flex;flex-direction:column}#stage{flex:1;min-height:0;display:grid;place-items:center;overflow:hidden}#slide-stack{width:1600px;height:1000px;position:relative;transform-origin:center}.viewer-slide{display:none;width:1600px;height:1000px}.viewer-slide.is-current{display:block}.viewer-toolbar{height:63px;display:flex;align-items:center;justify-content:center;gap:12px;background:#fffdf7;border-top:1px solid #ccd2cb;flex-shrink:0}button{min-height:42px;padding:8px 14px;border:1px solid #18232c60;border-radius:5px;color:#18232c;background:#fffdf7;cursor:pointer}.viewer-toolbar button{background:#2357d8;color:white}.viewer-toolbar input{width:60px;padding:9px;font:inherit}#practice{padding:20px;max-width:1100px;margin:auto}.practice-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.offline-note{line-height:1.5}#practice[hidden],#slides[hidden]{display:none}.practice-sheet{margin-top:20px}@media(max-width:600px){header.viewer-header{height:78px;gap:8px;flex-wrap:wrap;padding:7px 10px}header.viewer-header strong{font-size:16px;flex-basis:100%}#slides{height:calc(100dvh - 78px)}.viewer-toolbar{gap:6px;font-size:13px}.viewer-toolbar button{padding:7px 10px}#practice{padding:12px}}</style></head><body>
<header class="viewer-header"><strong>Lecture 3 supplement: Factoring Quadratics</strong><a href="slides.pdf" download>Slides PDF</a><a href="worksheet.pdf" download>Worksheet</a><button id="mode" type="button">Practice: 24 questions</button></header>
<section id="slides"><div id="stage"><div id="slide-stack">${data.slides.map((html,i)=>`<div class="viewer-slide${i===0?' is-current':''}" data-page="${i+1}">${html}</div>`).join('')}</div></div><nav class="viewer-toolbar" aria-label="Supplement slides"><button id="previous" type="button">Previous</button><label>Page <input id="page" type="number" min="1" max="40" value="1"></label><span>of 40</span><button id="next" type="button">Next</button></nav></section>
<section id="practice" hidden><div class="practice-top"><h1>24 ranked choice questions</h1><strong id="progress" role="status">Answered 0/24</strong></div><p class="offline-note">Choose one option per question. Rank 4 is optional. Choices save on this device. This offline viewer does not submit to a classroom or display answer keys.</p>${data.practice}</section>
<script>${fit}
let current=1;const key='im-factorisation-practice-v1';const slides=document.getElementById('slides'),practice=document.getElementById('practice');
function scale(){const s=document.getElementById('stage');document.getElementById('slide-stack').style.transform='scale('+Math.min(s.clientWidth/1600,s.clientHeight/1000)+')';fitFormulas();}
function go(n){current=Math.min(40,Math.max(1,Math.round(Number(n))||1));document.querySelectorAll('.viewer-slide').forEach((el,i)=>el.classList.toggle('is-current',i+1===current));document.getElementById('page').value=current;document.getElementById('previous').disabled=current===1;document.getElementById('next').disabled=current===40;scale();}
document.getElementById('previous').onclick=()=>go(current-1);document.getElementById('next').onclick=()=>go(current+1);document.getElementById('page').onchange=e=>go(e.target.value);
document.addEventListener('keydown',e=>{if(e.target.matches('input,button')||slides.hidden)return;if(e.key==='ArrowRight'){e.preventDefault();go(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(current-1);}});
document.getElementById('mode').onclick=e=>{slides.hidden=!slides.hidden;practice.hidden=!practice.hidden;e.target.textContent=practice.hidden?'Practice: 24 questions':'Back to slides';if(!slides.hidden)scale();};
let choices={};try{choices=JSON.parse(localStorage.getItem(key)||'{}');}catch{};
function update(){let count=0;document.querySelectorAll('.practice-question').forEach(q=>{const selected=q.querySelector('input:checked');if(selected)count++;q.querySelector('.practice-question-status').textContent=selected?'Saved on this device':'Not attempted';q.querySelectorAll('.practice-option').forEach(o=>o.classList.toggle('is-selected',!!o.querySelector('input:checked')));});document.getElementById('progress').textContent='Answered '+count+'/24';}
document.querySelectorAll('.practice-question').forEach(q=>{q.querySelectorAll('input').forEach(input=>{input.checked=choices[q.dataset.questionId]===input.value;input.onchange=()=>{choices[q.dataset.questionId]=input.value;try{localStorage.setItem(key,JSON.stringify(choices));}catch{}update();};});});
new ResizeObserver(()=>{if(!slides.hidden)scale();}).observe(document.getElementById('stage'));document.fonts.ready.then(()=>go(current));go(1);update();
</script></body></html>`;
for(const forbidden of ['"correctOptionId"','"optionExplanations"','"teachingCue"','"assistantCue"'])if(viewer.includes(forbidden))throw Error(`Public viewer contains ${forbidden}`);
await fs.writeFile(path.join(publicRoot,'index.html'),viewer);
await fs.writeFile(path.join(publicRoot,'slides-print.html'),`${head('Factoring Quadratics: 40 slides')}<style>@page{size:1600px 1000px;margin:0}body{margin:0}.im-slide{break-after:page}.im-slide:last-of-type{break-after:auto}</style></head><body>${data.slides.join('')}<script>${fit}document.fonts.ready.then(fitFormulas);</script></body></html>`);
const printCss=`@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#18232c;font:14px/1.42 Arial,sans-serif}.paper{height:980px;position:relative;break-after:page}.paper:last-child{break-after:auto}.paper>header{border-top:7px solid #2357d8;padding-top:10px}.paper h1{font-size:25px;line-height:1.15;margin:5px 0 10px}.paper small{color:#2357d8;letter-spacing:.08em}.print-questions{display:grid;grid-template-rows:1fr 1fr;height:790px;gap:14px;margin-top:14px}.print-question{border:1px solid #ced8d6;padding:13px 16px;break-inside:avoid}.print-question h2{font-size:15px;color:#2357d8;margin:0 0 10px}.print-question p{margin:9px 0}.print-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0}.print-options>div{border:1px solid #ced8d6;padding:9px;display:flex;gap:9px}.print-source{font-size:10px;line-height:1.35;color:#5b6470}.paper>footer{position:absolute;bottom:0;left:0;right:0;border-top:1px solid #ced8d6;padding-top:7px;font-size:11px;display:flex;justify-content:space-between}.print-question .practice-graph{margin:5px 0}.print-question .practice-graph svg{height:140px}.print-question .practice-graph figcaption{font-size:10px}.teacher .print-question{margin-top:16px}.teacher .feedback{background:#eef6f2;border-left:4px solid #14877b;padding:12px 15px;margin-top:14px}.teacher .feedback h3{margin:0 0 10px;font-size:16px}.teacher .feedback p{margin:9px 0}.guide{font-size:15px;line-height:1.6}.guide table{width:100%;border-collapse:collapse}.guide td,.guide th{border-bottom:1px solid #ced8d6;text-align:left;padding:9px 5px;vertical-align:top}`;
const reference='Original supplementary questions based on Jacques §2.1, printed pp.127–128 / PDF pp.144–145.';
const paperHeader=(subtitle)=>`<header><small>LECTURE 3 SUPPLEMENT</small><h1>Factoring Quadratics: Step by Step</h1><p>${subtitle}</p></header>`;
function question(q,i,teacher=false){return `<article class="print-question" data-question-id="${q.id}"><h2>Q${i+1} · Rank ${q.rank}: ${ranks[q.rank]}${q.optional?' (optional)':''}</h2><p>${rich(q.stem)}</p>${teacher?'':graph(q.graph)}<div class="print-options">${q.options.map(o=>`<div><b>${o.id}</b><span>${rich(o.text)}</span></div>`).join('')}</div><p class="print-source">${reference}</p>${teacher?`<div class="feedback"><h3>Correct answer: ${q.correctOptionId}</h3><p>${rich(q.solution)}</p>${q.options.map(o=>`<p><b>${o.id}:</b> ${rich(q.optionExplanations[o.id])}</p>`).join('')}</div>`:''}</article>`;}
const paperFooter=(label,i,total)=>`<footer><span>${label}</span><span>${i}/${total}</span></footer>`;
let worksheet='';for(let i=0;i<24;i+=2)worksheet+=`<section class="paper">${paperHeader('24 single-choice questions. Ranks 1–3 build the core skills. Rank 4 is optional. Work at your own pace.')}<div class="print-questions">${data.pack.questions.slice(i,i+2).map((q,j)=>question(q,i+j)).join('')}</div>${paperFooter('Student worksheet · Choose one option per question',i/2+1,12)}</section>`;
await fs.writeFile(path.join(publicRoot,'worksheet-print.html'),`${head('Factorisation: student worksheet')}<style>${printCss}</style></head><body>${worksheet}</body></html>`);
const teacherBody=`<section class="paper guide">${paperHeader('Teacher guide and separate answer book. Keep private.')}<p>${escape(data.guide)}</p><table><thead><tr><th>Example</th><th>Slides</th><th>Factor constants</th></tr></thead><tbody>${data.examples.map(e=>`<tr><td>${e.id}</td><td>${e.pages[0]}–${e.pages.at(-1)}</td><td>${e.factors.join(', ')}</td></tr>`).join('')}</tbody></table><p>Practice ranks: 8 Foundation, 8 Core, 6 Application and 2 optional Challenge. The classroom timer controls the whole set. Students may revise and resubmit until closure. Saved choices finalize automatically at the deadline.</p>${paperFooter('Private teaching guide',1,25)}</section>`+data.privatePack.questions.map((q,i)=>`<section class="paper teacher">${paperHeader(`Private answer and distractor explanations · Q${i+1}/24`)}${question(q,i,true)}${paperFooter('Teacher answer book · Formative practice',i+2,25)}</section>`).join('');
const teacherHtml=`${head('Factorisation: private teacher guide and answers')}<style>${printCss}</style></head><body>${teacherBody}</body></html>`;
await fs.writeFile(path.join(scratch,'teacher-print.html'),teacherHtml);
await fs.writeFile(path.join(publicRoot,'public-pack.json'),JSON.stringify(data.pack,null,2));
const dependencyRoot=process.env.CODEX_NODE_MODULES||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=await import(pathToFileURL(path.join(dependencyRoot,'playwright/index.mjs')).href);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.pdf':'application/pdf','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/teacher-print.html'){res.setHeader('Content-Type',mime['.html']);res.end(teacherHtml);return;}const file=path.resolve(publicRoot,`.${name==='/'?'/index.html':name}`);if(!file.startsWith(publicRoot+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'msedge',headless:true});
const audit={createdAt:new Date().toISOString(),pages:40,workedExamples:8,questions:24,ranks:[8,8,6,2],slideChecks:0,questionChecks:0,errors:[],offlineRequestsBlocked:true};
try{
 const context=await browser.newContext();await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 const p=await context.newPage();p.on('pageerror',e=>audit.errors.push(e.message));
 await p.goto(origin,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 for(const width of [1600,820,390]){
  await p.setViewportSize({width,height:width===390?844:1100});
  for(let n=1;n<=40;n++){
   await p.locator('#page').fill(String(n));await p.locator('#page').press('Tab');
   const errors=await p.evaluate(()=>{const a=document.querySelector('.viewer-slide.is-current .im-slide'),issues=[];if(!a){return ['Missing canvas'];}const r=a.getBoundingClientRect();if(Math.abs(r.width/r.height-1.6)>.005)issues.push('Canvas ratio');if(document.documentElement.scrollWidth>innerWidth+2)issues.push('Horizontal overflow');
    for(const e of a.querySelectorAll('.im-text,.im-table-wrap'))if(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)issues.push('Text overflow: '+e.textContent.slice(0,100));
    for(const e of a.querySelectorAll('.im-formula'))if(Number(e.dataset.fitScale)<.6)issues.push('Formula too small');
    if(a.querySelector('.im-answer'))issues.push('Unrevealed feedback visible');
    for(const word of ['teachingCue','assistantCue','teacherGuide','correctOptionId'])if(a.outerHTML.includes(word))issues.push('Private metadata: '+word);return issues;});
   audit.slideChecks++;audit.errors.push(...errors.map(e=>`${width}px page ${n}: ${e}`));
   if(width===1600&&[3,8,16,24,29,36,39].includes(n))await p.locator('.viewer-slide.is-current .im-slide').screenshot({path:path.join(output,`qa/slide-${String(n).padStart(2,'0')}.png`)});
  }
  await p.locator('#mode').click();
  const qerrors=await p.evaluate(()=>{const problems=[];for(const q of document.querySelectorAll('.practice-question')){if(q.querySelectorAll('input[type=radio]').length!==4)problems.push('Four options required');if(q.querySelector('.practice-solution'))problems.push('Private answer visible');for(const e of q.querySelectorAll('.practice-stem,.practice-option'))if(e.scrollWidth>e.clientWidth+2)problems.push('Question overflow: '+q.dataset.questionId);}if(document.documentElement.scrollWidth>innerWidth+2)problems.push('Practice horizontal overflow');return problems;});
  audit.questionChecks+=24;audit.errors.push(...qerrors.map(e=>`${width}px: ${e}`));
  if(width===390)await p.screenshot({path:path.join(output,'qa/practice-390.png'),fullPage:false});
  await p.locator('#mode').click();
 }
 await p.locator('#mode').click();await p.locator('.practice-question').last().locator('input[value="B"]').check();await p.reload({waitUntil:'networkidle'});await p.locator('#mode').click();
 if(!await p.locator('.practice-question').last().locator('input[value="B"]').isChecked())audit.errors.push('Offline choice did not restore');
 if(!await p.locator('#progress').textContent().then(s=>s==='Answered 1/24'))audit.errors.push('Offline attempt count');
 audit.localChoiceRestoration=true;
 if(audit.errors.length)throw Error(JSON.stringify(audit.errors,null,2));
 for(const [name,url,slide] of [['slides','/slides-print.html',true],['worksheet','/worksheet-print.html',false],['teacher-answers','/teacher-print.html',false]]){
  await p.goto(origin+url,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  if(slide)await p.evaluate(()=>{for(const el of document.querySelectorAll('.im-formula')){el.style.transform='none';const parent=el.parentElement;el.style.transform=`scale(${Math.min(1,parent.clientWidth/el.scrollWidth,parent.clientHeight/el.scrollHeight)})`;}});
  await p.pdf({path:path.join(output,`${name}.pdf`),printBackground:true,...(slide?{width:'1600px',height:'1000px',margin:{top:0,left:0,right:0,bottom:0}}:{format:'A4',preferCSSPageSize:true})});
 }
 await fs.writeFile(path.join(output,'qa/browser-audit.json'),JSON.stringify(audit,null,2));
 const verified=spawnSync(process.env.EDU_PDF_PYTHON||'python',[path.join(root,'scripts/verify-factorisation-pdfs.py')],{cwd:root,encoding:'utf8',windowsHide:true});
 if(verified.status!==0)throw Error(verified.stdout+'\n'+verified.stderr);
 await fs.copyFile(path.join(output,'slides.pdf'),path.join(publicRoot,'slides.pdf'));
 await fs.copyFile(path.join(output,'worksheet.pdf'),path.join(publicRoot,'worksheet.pdf'));
 await fs.writeFile(path.join(output,'teacher-guide.txt'),data.guide+'\n');
 await fs.writeFile(path.join(output,'README.txt'),'Lecture 3 supplement: Factoring Quadratics.\n40 slides, eight worked examples, 24 ranked multiple-choice questions.\nThe main course remains 16 lectures / 32 teaching hours. This supplement adds 40 minutes of foundation support plus separately scheduled practice.\nTeacher answers are private and are excluded from public assets and the student offline package.\nOffline choices stay on the device and are never submitted automatically to a live classroom.\nClassroom pacing and real projector acceptance require a teaching trial.\n');
 const manifest={courseId:'course-international-mathematics',lesson:17,displayLabel:'Lecture 3 supplement',afterLesson:3,slides:40,workedExamples:8,questions:24,rankCounts:[8,8,6,2],files:[]};
 for(const name of ['slides.pdf','worksheet.pdf','teacher-answers.pdf','teacher-guide.txt']){const b=await fs.readFile(path.join(output,name));manifest.files.push({file:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),audience:name.startsWith('teacher')?'teacher':'student'});}
 await fs.writeFile(path.join(output,'manifest-sha256.json'),JSON.stringify(manifest,null,2));
 console.log(JSON.stringify({output,publicRoot,audit},null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
