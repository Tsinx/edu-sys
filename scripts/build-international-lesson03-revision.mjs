/** Render the revised lecture with the existing student canvas; never reveal quiz feedback. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {build} from 'esbuild';
const root=process.cwd(),scratch=path.join(root,'.runtime/lesson03-scaffolding');
const output=path.join(root,'output/international-mathematics/lesson-03-revision');
await fs.mkdir(path.join(output,'qa'),{recursive:true});
await fs.mkdir(path.join(output,'assets'),{recursive:true});
await fs.writeFile(path.join(scratch,'render.tsx'),`
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {MathematicsCanvas} from '../../apps/teacher-web/src/features/international-mathematics/InternationalMathematicsStage';
import {INTERNATIONAL_MATHEMATICS_SLIDES,INTERNATIONAL_MATHEMATICS_DEFINITIONS,INTERNATIONAL_MATHEMATICS_VERSION_ID} from '../../packages/course-content/src/international-mathematics/index';
export const slides=INTERNATIONAL_MATHEMATICS_SLIDES.filter(s=>s.lesson===3);
export const html=slides.map(spec=>renderToStaticMarkup(<MathematicsCanvas spec={spec} values={{}}/>));
export const lesson=INTERNATIONAL_MATHEMATICS_DEFINITIONS[2];export const version=INTERNATIONAL_MATHEMATICS_VERSION_ID;
`);
await build({entryPoints:[path.join(scratch,'render.tsx')],outfile:path.join(scratch,'render.cjs'),bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env.PROD':'false','import.meta.env.VITE_EDU_RELEASE_ID':'"lesson03-qa"'},nodePaths:[path.join(root,'apps/teacher-web/node_modules')],logLevel:'warning'});
const {slides,html,lesson,version}=createRequire(import.meta.url)(path.join(scratch,'render.cjs'));
if(slides.length!==102)throw Error('Unexpected lecture count');
const assets=path.join(output,'assets');
const css=await fs.readFile(path.join(root,'apps/teacher-web/src/features/international-mathematics/international-mathematics.css'),'utf8');
await fs.writeFile(path.join(assets,'lecture.css'),css);
const katex=path.join(root,'apps/teacher-web/node_modules/katex');
await fs.copyFile(path.join(katex,'dist/katex.min.css'),path.join(assets,'katex.min.css'));
await fs.copyFile(path.join(katex,'LICENSE'),path.join(assets,'KaTeX-LICENSE.txt'));
await fs.cp(path.join(katex,'dist/fonts'),path.join(assets,'fonts'),{recursive:true});
const publicRoot=path.join(root,'apps/teacher-web/public');
for(const src of new Set(html.flatMap(s=>[...s.matchAll(/src="(\/course-assets\/[^"?]+)"/g)].map(m=>m[1])))){
 await fs.copyFile(path.join(publicRoot,src),path.join(assets,path.basename(src)));
}
const markup=html.map(s=>s.replace(/src="\/course-assets\/([^"?]+)"/g,(_m,file)=>`src="assets/${path.basename(file)}"`));
const head='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lecture 3: Quadratic Functions</title><link rel="stylesheet" href="assets/katex.min.css"><link rel="stylesheet" href="assets/lecture.css">';
const fit=`function fitFormulas(){document.querySelectorAll('.im-formula').forEach(el=>{el.style.transform='none';const p=el.parentElement,f=Math.min(1,p.clientWidth/el.scrollWidth,p.clientHeight/el.scrollHeight);el.style.transform='scale('+f+')';el.dataset.fitScale=f.toFixed(3);});}`;
const viewer=`${head}<style>*{box-sizing:border-box}body{margin:0;background:#eceee8;color:#18232c;font:16px Arial}#stage{height:calc(100dvh - 64px);display:grid;place-items:center;overflow:hidden}#stack{position:relative;width:1600px;height:1000px;transform-origin:center}.page{display:none}.page.current{display:block}nav{height:64px;display:flex;align-items:center;justify-content:center;gap:12px;background:#fffdf7}button,input{font:inherit;min-height:40px;padding:6px 10px}input{width:65px}@media(max-width:500px){nav{gap:5px;font-size:12px}button{padding:6px}}</style></head><body><main id="stage"><div id="stack">${markup.map((s,i)=>`<section class="page${i===0?' current':''}">${s}</section>`).join('')}</div></main><nav aria-label="Lecture slides"><button id="prev">Previous</button><label>Page <input id="page" type="number" min="1" max="102" value="1"></label><span>/102</span><button id="next">Next</button><button id="hour">Hour 2</button></nav><script>${fit}
const pages=[...document.querySelectorAll('.page')];let current=1;
function scale(){const p=document.getElementById('stage');document.getElementById('stack').style.transform='scale('+Math.min(p.clientWidth/1600,p.clientHeight/1000)+')';fitFormulas();}
function go(n){current=Math.max(1,Math.min(pages.length,Math.round(Number(n))||1));pages.forEach((p,i)=>p.classList.toggle('current',i===current-1));document.getElementById('page').value=current;document.getElementById('prev').disabled=current===1;document.getElementById('next').disabled=current===pages.length;scale();}
document.getElementById('page').onchange=e=>go(e.target.value);document.getElementById('prev').onclick=()=>go(current-1);document.getElementById('next').onclick=()=>go(current+1);document.getElementById('hour').onclick=()=>go(51);
document.onkeydown=e=>{if(e.target.matches('input,button'))return;if(e.key==='ArrowRight')go(current+1);if(e.key==='ArrowLeft')go(current-1);};new ResizeObserver(scale).observe(document.getElementById('stage'));document.fonts.ready.then(scale);go(1);
</script></body></html>`;
for(const word of ['teachingCue','assistantCue','teacherGuide','im-answer','correctOptionId'])if(viewer.includes(word))throw Error('Public data leak: '+word);
await fs.writeFile(path.join(output,'index.html'),viewer);
await fs.writeFile(path.join(output,'print.html'),`${head}<style>@page{size:1600px 1000px;margin:0}body{margin:0}.im-slide{break-after:page}.im-slide:last-of-type{break-after:auto}</style></head><body>${markup.join('')}<script>${fit}document.fonts.ready.then(fitFormulas);</script></body></html>`);
await fs.writeFile(path.join(output,'lecture-metadata.json'),JSON.stringify({version,lesson:3,pages:102,core:100,optional:2,hours:lesson.hours?.map(({guide,...h})=>h),slideKeys:slides.map(s=>s.slideKey)},null,2));
await fs.writeFile(path.join(output,'teacher-schedule.txt'),[lesson.teacherGuide,...lesson.hours.map(h=>`\nHour ${h.number}: pages ${h.localStart}-${h.localEnd}\n${h.guide}`)].join('\n'));
const dependencyRoot=process.env.CODEX_NODE_MODULES||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=await import(pathToFileURL(path.join(dependencyRoot,'playwright/index.mjs')).href);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(output,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(output+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'msedge',headless:true});
const audit={version,pages:102,viewports:[1600,820,390],checks:0,externalNetworkingBlocked:true,errors:[]};
try{
 const context=await browser.newContext();await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 const p=await context.newPage();p.on('pageerror',e=>audit.errors.push(e.message));
 await p.goto(origin,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 for(const width of audit.viewports){
  await p.setViewportSize({width,height:width===390?844:1100});
  for(let n=1;n<=102;n++){
   await p.locator('#page').fill(String(n));await p.locator('#page').press('Tab');
   const errors=await p.evaluate(()=>{const a=document.querySelector('.page.current .im-slide'),issues=[];if(!a)return ['Missing canvas'];const r=a.getBoundingClientRect();if(Math.abs(r.width/r.height-1.6)>.005)issues.push('Canvas ratio');if(document.documentElement.scrollWidth>innerWidth+2)issues.push('Horizontal overflow');
    for(const e of a.querySelectorAll('h1,.im-text,.im-table-wrap,.im-question'))if(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)issues.push('Text overflow: '+e.textContent.slice(0,100));
    for(const e of a.querySelectorAll('.im-formula'))if(Number(e.dataset.fitScale)<.6)issues.push('Small formula: '+e.textContent.slice(0,60));
    for(const img of a.querySelectorAll('img'))if(!img.complete||!img.naturalWidth)issues.push('Broken image');
    for(const word of ['teachingCue','assistantCue','teacherGuide','correctOptionId'])if(a.outerHTML.includes(word))issues.push('Private metadata');if(a.querySelector('.im-answer'))issues.push('Unrevealed answer');return issues;});
   audit.checks++;audit.errors.push(...errors.map(e=>`${width}px page ${n}: ${e}`));
   if(width===1600)await p.locator('.page.current .im-slide').screenshot({path:path.join(output,`qa/slide-${String(n).padStart(3,'0')}.png`)});
  }
 }
 await fs.writeFile(path.join(output,'qa/browser-audit.json'),JSON.stringify(audit,null,2));
 if(audit.errors.length)throw Error(JSON.stringify(audit.errors));
 await p.goto(origin+'/print.html',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>fitFormulas());
 await p.pdf({path:path.join(output,'lecture-03-completing-square-and-quadratic-formula.pdf'),printBackground:true,width:'1600px',height:'1000px',margin:{top:0,left:0,right:0,bottom:0}});
 console.log(JSON.stringify({output,...audit}));
}finally{await browser.close();await new Promise(done=>server.close(done));}
