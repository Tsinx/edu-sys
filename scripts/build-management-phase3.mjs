// Assemble individually authored pages and explicit multi-source dispositions. No prose extraction/generation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sources from '../docs/management/sources-phase3.mjs';
import briefs from '../docs/management/image-briefs-phase3.mjs';
const publish=process.argv.includes('--publish');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const base='output/management-principles/phase2-baseline';
const src='output/management-principles/source-phase3';
const corpus=read(`${src}/corpus.json`);
const titles={0:'绪论',9:'领导的一般理论',10:'激励',11:'沟通',12:'控制的类型与过程',13:'控制的方法和技术',14:'风险控制与危机管理',15:'创新原理',16:'组织创新'};
const oldPages=read(`${base}/packages/course-content/src/management-principles/pages.json`);
assert.equal(oldPages.length,663);
const pages=structuredClone(oldPages),mappings=read(`${base}/packages/course-content/src/management-principles/source-map.private.json`);
const updates=read(`${base}/docs/management/updates.json`),links=read(`${base}/docs/management/image-page-links.json`);
const authored=new Map();
for(const d of corpus.decks){
 const file=`docs/management/authored/${d.id}.mjs`;
 if(!fs.existsSync(file)){assert(!publish,`Missing authored document ${d.id}`);continue;}
 const rows=(await import(`../${file}`)).default;
 assert.equal(rows.length,d.pages,`${d.id} original count`);
 rows.forEach((p,i)=>assert.equal(p.page,i+1,`${d.id} order`));
 authored.set(d.id,{d,rows});
}
const allRecords=[...authored.values()].flatMap(({d,rows})=>rows.map(p=>({d,p})));
const pageTargets=new Map(),dispositions=[];
const claimed=new Set(allRecords.map(({p})=>p.image).filter(Boolean));
const diagrams=x=>x?Array.isArray(x)?{kind:'flow',items:x}:x:undefined;
const imagePath=(relative)=>{
 const publicPath=`/course-assets/management-principles/source/${relative}`;
 const target=`apps/teacher-web/public${publicPath}`;
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(`${src}/media/${relative}`,target);
 return publicPath;
};
function compile({d,p}){
 assert(p.parts?.length,`${d.id}:${p.page} has no authored text`);
 const original=d.slides[p.page-1],targets=[];
 const art=p.image===null?undefined:p.image??briefs.find(b=>b.deck===d.id&&b.page===p.page&&!claimed.has(b.id))?.id;
 for(const [part,body] of p.parts.entries()){
  const key=`mg-${d.id}-s${String(p.page).padStart(3,'0')}-${String(part+1).padStart(2,'0')}`;
  const table=p.partTables? p.partTables[part] : part===0?p.table:undefined;
  const diagram=diagrams(p.partDiagrams?p.partDiagrams[part]:part===0?p.diagram:undefined);
  const demo=part===(p.demoPart??0)?p.demo:undefined;
  const portrait=p.partPortraits?.[part]??(part===0?p.portrait:undefined);
  const image=part===0&&art?{src:`/course-assets/management-principles/${art}.webp`,alt:briefs.find(b=>b.id===art)?.title??p.title,label:'艺术示意 · Imagegen'}:portrait?{src:imagePath(portrait),alt:`${p.title} · 原课件资料`,label:'原课件图像资料'}:undefined;
  const refs=(p.sources??[]).map(id=>{assert(sources[id],`Unknown source ${id}`);const s=sources[id];return {id,title:s.title,url:s.url,period:s.period};});
  const index=pages.length+1;
  pages.push({index,slideKey:key,lessonNumber:d.lesson,lessonTitle:titles[d.lesson],section:titles[d.lesson],title:p.partTitles?.[part]??p.title,part:part+1,partTotal:p.parts.length,layout:demo?'demo':table?'table':diagram?'diagram':portrait?'case':part>0?'essay':p.layout,body,table,diagram,demo,image,label:p.label??'',note:p.note??'',sources:refs,summary:body.join('；')});
  const mods=[`原第${p.page}页逐页编写，网页拆页${part+1}/${p.parts.length}。`,...(p.change?[p.change]:[]),...(art&&part===0?[`采用${art}艺术示意图。`]:[])];
  mappings.push({slideKey:key,index,lessonNumber:d.lesson,documentId:d.id,originalFile:d.file,sha256:d.sha256,originalPage:p.page,splitIndex:part+1,splitTotal:p.parts.length,disposition:'independent',modifications:mods,teachingCue:p.teachingCue??`围绕“${p.title}”讨论原知识点，保留问题的思考空间。`,assistantCue:p.assistantCue??'仅解释当前公开页面和已揭示的演示内容；不得提前给出后续答案。',originalNotes:original.notes,originalAnimation:original.timing});
  targets.push({slideKey:key,index});if(part===0&&art)links.push({id:art,slideKey:key});
 }
 pageTargets.set(`${d.id}:${p.page}`,targets);
}
// Historical global indices remain append-only. Intro is stored last, then played first.
const sequence=[];
for(const lesson of [9,10,11,12,13,14,15,16,0]){
 const primary=[...authored.values()].find(x=>x.d.lesson===lesson&&x.d.role==='primary');
 if(!primary)continue;
 for(const p of primary.rows){
  if(!p.disposition||p.disposition==='independent')sequence.push({d:primary.d,p});
  const supplements=allRecords.filter(x=>x.p.after?.documentId===primary.d.id&&x.p.after.page===p.page&&(!x.p.disposition||x.p.disposition==='independent'));
  sequence.push(...supplements);
 }
}
for(const record of sequence)compile(record);
const resolve=(id,page,seen=new Set())=>{
 const key=`${id}:${page}`;assert(!seen.has(key),`Cyclic source mapping ${key}`);
 if(pageTargets.has(key))return pageTargets.get(key);
 seen.add(key);const record=allRecords.find(x=>x.d.id===id&&x.p.page===page);assert(record,`Missing target ${key}`);
 assert.equal(record.p.disposition,'shared',`Uncompiled target ${key}`);
 const targets=record.p.targets.flatMap(t=>resolve(t.documentId,t.page,new Set(seen)));
 pageTargets.set(key,targets);return targets;
};
for(const {d,p} of allRecords){
 const status=p.disposition??'independent',original=d.slides[p.page-1];
 assert(['independent','shared','omitted'].includes(status));
 const targets=status==='omitted'?[]:resolve(d.id,p.page);
 assert(status!=='omitted'||p.change,`Omission needs reason ${d.id}:${p.page}`);
 if(status==='shared')for(const [i,t] of targets.entries())mappings.push({slideKey:t.slideKey,index:t.index,lessonNumber:d.lesson,documentId:d.id,originalFile:d.file,sha256:d.sha256,originalPage:p.page,splitIndex:i+1,splitTotal:targets.length,disposition:'shared',modifications:[p.change],teachingCue:'与主稿对应内容共用网页；从该原页定位时保留原版本身份。',assistantCue:'只解释当前公开页面和已揭示步骤。',originalNotes:original.notes,originalAnimation:original.timing});
 dispositions.push({documentId:d.id,originalFile:d.file,sha256:d.sha256,lessonNumber:d.lesson,originalPage:p.page,disposition:status,targets,reason:p.change??'独立转换，保留原知识点及顺序。',originalNotes:original.notes,originalAnimation:original.timing});
 updates.push({documentId:d.id,originalFile:d.file,page:p.page,slideKeys:targets.map(t=>t.slideKey),disposition:status,oldText:original.paragraphs.join('\n'),newText:p.parts?.map(x=>x.join('\n')).join('\n\n')??'',newTables:p.partTables??(p.table?[p.table]:[]),newDiagrams:p.partDiagrams??(p.diagram?[p.diagram]:[]),sources:(p.sources??[]).map(id=>({id,...sources[id]})),period:(p.sources??[]).map(id=>sources[id].period),verifiedAt:p.verifiedAt??(d.lesson>=14||d.lesson===0?'2026-09-20':'2026-09-19'),reason:p.change??'沿原稿逐页编写并重新构图。',sourceReview:'see phase3 source review evidence',webReview:'pending'});
}
const oldLessons=read(`${base}/packages/course-content/src/management-principles/lessons.json`);
const newLessons=[9,10,11,12,13,14,15,16,0].flatMap(number=>{
 const pp=pages.filter(p=>p.lessonNumber===number);if(!pp.length)return [];
 pp.forEach((p,i)=>{p.localIndex=i+1;p.localTotal=pp.length;});
 return [{number,title:titles[number],kind:number===0?'introduction':'lecture',displayLabel:number===0?'绪论':`第${number}讲`,slideStart:pp[0].index,slideEnd:pp.at(-1).index,slideTotal:pp.length,status:'ready'}];
});
const lessons=[...newLessons.filter(l=>l.number===0),...oldLessons,...newLessons.filter(l=>l.number!==0)];
const playbackOrder=lessons.flatMap(l=>pages.filter(p=>p.lessonNumber===l.number).map(p=>p.index));
assert.deepEqual(pages.slice(0,663),oldPages,'Existing pages changed');
assert.equal(new Set(pages.map(p=>p.slideKey)).size,pages.length);
const used=new Set(links.map(l=>l.id));
if(publish){assert.equal(dispositions.length,728);assert.equal(lessons.length,17);assert.equal(lessons.filter(l=>l.number>0).length,16);assert(used.size>=400&&used.size<=420);for(const p of pages)if(p.image)assert(fs.existsSync(`apps/teacher-web/public${p.image.src}`),`Missing image ${p.image.src}`);}
const manifest={version:'management-principles-2026-v3',phase:3,status:publish?'built-awaiting-validation':'draft',sourcePageCount:517+dispositions.length,webPageCount:pages.length,imageCount:used.size,lectureCount:lessons.filter(l=>l.number>0).length,introductionCount:lessons.filter(l=>l.number===0).length,demoCount:pages.filter(p=>p.demo).length,phase3:{reviewScope:728,recordedSources:dispositions.length,independent:dispositions.filter(x=>x.disposition==='independent').length,shared:dispositions.filter(x=>x.disposition==='shared').length,omitted:dispositions.filter(x=>x.disposition==='omitted').length},lessons};
const out=publish?'packages/course-content/src/management-principles':'output/management-principles/draft-phase3';
for(const [name,value] of Object.entries({'pages.json':pages,'lessons.json':lessons,'manifest.json':manifest,'playback-order.json':playbackOrder,'source-map.private.json':mappings,'source-dispositions.private.json':dispositions,'updates.json':updates,'image-page-links.json':links}))write(`${out}/${name}`,value);
if(publish){write('docs/management/source-map.json',mappings);write('docs/management/source-map-phase3.json',mappings.slice(663));write('docs/management/source-dispositions-phase3.json',dispositions);write('docs/management/updates.json',updates);write('docs/management/updates-phase3.json',updates.slice(517));write('docs/management/image-page-links.json',links);write('docs/management/image-page-links-phase3.json',links.filter(x=>Number(x.id.slice(3))>=191));write('docs/management/coverage.json',{...manifest,generatedAt:new Date().toISOString()});}
else write('apps/teacher-web/public/management-phase3-draft/pages.json',pages.slice(663));
console.log(JSON.stringify({mode:publish?'publish':'draft',sourceRecords:dispositions.length,newPages:pages.length-663,images:used.size-190,lessons:newLessons.map(l=>({number:l.number,pages:l.slideTotal}))}));
