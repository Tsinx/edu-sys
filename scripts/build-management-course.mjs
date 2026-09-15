// Compilation only: prose, splits, tables and diagrams are individually authored in docs/management/authored.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import phase1Sources from '../docs/management/sources.mjs';
import phase2Sources from '../docs/management/sources-phase2.mjs';
import { imageBriefs as phase1Briefs } from '../docs/management/image-briefs.mjs';
import phase2Briefs from '../docs/management/image-briefs-phase2.mjs';
const root = process.cwd();
const phase=process.argv.includes('--phase1')?1:2;
const sourceRoot=`output/management-principles/${phase===1?'source':'source-phase2'}`;
const corpus = JSON.parse(fs.readFileSync(`${sourceRoot}/corpus.json`,'utf8'));
const sources={...phase1Sources,...phase2Sources},imageBriefs=[...phase1Briefs,...phase2Briefs];
const titles = ['管理导论','管理理论的历史演变','决策与决策过程','环境分析与理性决策',...(phase===2?['决策的实施与调整','组织设计','人员配备','组织文化']:[])];
const authored = await Promise.all(corpus.decks.map(async d => ({d, pages:(await import(`../docs/management/authored/${d.id}.mjs`)).default})));
const baseline='output/management-principles/phase1-baseline';
const readBase=file=>phase===2?JSON.parse(fs.readFileSync(`${baseline}/${file}`,'utf8')):[];
const publicPages = readBase('packages/course-content/src/management-principles/pages.json'), sourceMap = readBase('packages/course-content/src/management-principles/source-map.private.json'), changes = readBase('docs/management/updates.json'), imageLinks = readBase('docs/management/image-page-links.json');
const baselinePages=structuredClone(publicPages);
const claimedImages = new Set(authored.flatMap(({pages})=>pages.map(p=>p.image).filter(Boolean)));
for (const {d,pages} of authored) {
  assert.equal(pages.length,d.pages,`${d.id} original page count`);
  for (const [i,page] of pages.entries()) {
    assert.equal(page.page,i+1,`${d.id} original order`);
    const original = d.slides[i];
    let art = page.image === null ? undefined : page.image ?? imageBriefs.find(b=>b.deck===d.id && b.page===page.page && !claimedImages.has(b.id))?.id;
    const portrait = page.portrait ? `/course-assets/management-principles/source/${page.portrait}` : undefined;
    if (portrait) {
      const out = `apps/teacher-web/public${portrait}`;
      fs.mkdirSync(path.dirname(out),{recursive:true});
      fs.copyFileSync(`${sourceRoot}/media/${page.portrait}`,out);
    }
    const keys = [];
    for(const [part,body] of page.parts.entries()) {
      const key = `mg-${d.id}-s${String(page.page).padStart(3,'0')}-${String(part+1).padStart(2,'0')}`;
      keys.push(key);
      const refs = (page.sources??[]).map(id=>{assert(sources[id],`unknown source ${id}`);const s=sources[id];return {id,title:s.title,url:s.url,period:s.period};});
      const table = page.partTables?.[part] ?? (part===0?page.table:undefined);
      const rawDiagram=page.partDiagrams?.[part]??(part===0?page.diagram:undefined);
      const diagram = rawDiagram ? Array.isArray(rawDiagram) ? {kind:'flow',items:rawDiagram} : rawDiagram : undefined;
      const demo = part===(page.demoPart??0)?page.demo:undefined;
      const image = part===0 && (art||portrait) ? {src:art?`/course-assets/management-principles/${art}.webp`:portrait,alt:art?imageBriefs.find(b=>b.id===art)?.title??page.title:`${page.title} · 原课件资料`,label:art?'艺术示意 · Imagegen':'原课件文献／人物资料'} : undefined;
      const referenceImage=part===0&&art&&portrait?{src:portrait,alt:`${page.title} · 原课件资料`,label:'原课件文献／人物资料'}:undefined;
      publicPages.push({index:publicPages.length+1,slideKey:key,lessonNumber:d.lesson,lessonTitle:titles[d.lesson-1],section:d.id==='l4b'?'理性决策与决策方法':titles[d.lesson-1],title:page.partTitles?.[part]??page.title,part:part+1,partTotal:page.parts.length,layout:demo?'demo':table?'table':diagram?'diagram':part>0?'essay':page.layout,body,table,diagram,demo,image,referenceImage,label:page.label??'',note:page.note??'',sources:refs,summary:body.join('；')});
      if(image && art) imageLinks.push({id:art,slideKey:key});
      sourceMap.push({slideKey:key,index:publicPages.length,lessonNumber:d.lesson,documentId:d.id,originalFile:d.file,sha256:d.sha256,originalPage:page.page,splitIndex:part+1,splitTotal:page.parts.length,modifications:[`原第${page.page}页按原顺序重排为网页原生文字与图解。`,...(page.parts.length>1?[`密集内容拆为${page.parts.length}个连续页面。`]:[]),...(image?[portrait?'沿用原稿人物图像，保持比例。':`采用${art}艺术示意图。`]:[]),...(page.change?[page.change]:[])],teachingCue:page.teachingCue??`围绕“${page.title}”按原稿顺序讲解；本原页共${page.parts.length}个连续页面。保留问题的思考空间。`,assistantCue:'只解释当前页面及已经揭示的演示步骤，不推断后续答案。',originalNotes:original.notes??[],originalAnimation:original.animation??original.timing??null});
    }
    const originalText = original.text ?? original.objects.flatMap(o=>(o.paragraphs??[]).map(t=>t.text)).join('\n');
    changes.push({documentId:d.id,originalFile:d.file,page:page.page,slideKeys:keys,oldText:originalText,newText:page.parts.map(x=>x.join('\n')).join('\n\n'),newTables:page.partTables??(page.table?[page.table]:[]),newDiagrams:page.partDiagrams??(page.diagram?[page.diagram]:[]),sources:(page.sources??[]).map(id=>({id,...sources[id]})),period:(page.sources??[]).map(id=>sources[id].period),verifiedAt:phase===2?'2026-09-15':'2026-09-14',reason:page.change??'保持原知识点、问题及顺序；按投影可读性重新编排。',sourceReview:'原PPT播放顺序与渲染图已审阅',webReview:'pending'});
  }
}
assert.equal(changes.length,phase===2?517:299);
for(const [i,p] of publicPages.entries()) {const same=publicPages.filter(s=>s.lessonNumber===p.lessonNumber);p.localIndex=i-same[0].index+2;p.localTotal=same.length;}
const lessons=titles.map((title,i)=>{const pp=publicPages.filter(p=>p.lessonNumber===i+1);return {number:i+1,title,slideStart:pp[0].index,slideEnd:pp.at(-1).index,slideTotal:pp.length,status:'ready'};});
if(phase===2)assert.deepEqual(publicPages.slice(0,baselinePages.length),baselinePages,'First four lectures must preserve their exact public content');
const out='packages/course-content/src/management-principles';fs.mkdirSync(out,{recursive:true});
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
write(`${out}/pages.json`,publicPages);write(`${out}/lessons.json`,lessons);
write(`${out}/source-map.private.json`,sourceMap);
write('docs/management/source-map.json',sourceMap);
write('docs/management/updates.json',changes);
write('docs/management/image-page-links.json',imageLinks);
const activeBriefs=phase===2?imageBriefs:phase1Briefs;
const used=new Set(imageLinks.map(x=>x.id)),unused=activeBriefs.filter(b=>!used.has(b.id)).map(b=>({id:b.id,deck:b.deck,page:b.page,title:b.title}));
write('docs/management/coverage.json',{sourcePages:changes.length,webPages:publicPages.length,lessons,imageCount:used.size,unusedImages:unused,generatedAt:new Date().toISOString()});
const manifest={version:`management-principles-2026-v${phase}`,phase,sourcePageCount:changes.length,webPageCount:publicPages.length,imageCount:used.size,lessons:lessons.map(l=>({...l,sourcePages:new Set(sourceMap.filter(s=>s.lessonNumber===l.number).map(s=>`${s.documentId}:${s.originalPage}`)).size,imageCount:activeBriefs.filter(b=>Number(b.deck.slice(1,2))===l.number&&used.has(b.id)).length}))};
write(`${out}/manifest.json`,manifest);
if(phase===2){write('docs/management/updates-phase2.json',changes.slice(299));write('docs/management/source-map-phase2.json',sourceMap.slice(baselinePages.length));write('docs/management/image-page-links-phase2.json',imageLinks.filter(x=>Number(x.id.slice(3))>110));}
console.log(JSON.stringify({sourcePages:changes.length,webPages:publicPages.length,lessons:lessons.map(l=>l.slideTotal),linkedImages:used.size,unusedImages:unused},null,2));
