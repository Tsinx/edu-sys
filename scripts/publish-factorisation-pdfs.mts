/** Extend the unchanged, verified v2 PDFs without renumbering or rerendering their 1,312 pages. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {getCourseDeckByCourseId} from '../packages/course-content/src/deck-registry.js';
import {INTERNATIONAL_MATHEMATICS_DEFINITIONS as definitions,FACTORISATION_WORKED_EXAMPLES} from '../packages/course-content/src/international-mathematics/index.js';
import {validatedPdfFiles} from '../apps/teacher-web/src/features/course-export/pdf-model.js';
const root=process.cwd(),oldRoot=path.join(root,'output/international-mathematics/v2');
const output=path.join(root,'output/international-mathematics/factorisation-supplement');
const cache=path.join(root,'.runtime/course-pdf-cache/artifacts'),dist=path.join(root,'apps/teacher-web/dist');
const deck=getCourseDeckByCourseId('course-international-mathematics')!;
const old=JSON.parse(await fs.readFile(path.join(oldRoot,'course-definitions.json'),'utf8'));
assert.deepEqual(old.lessons,JSON.parse(JSON.stringify(definitions)),'Original core content changed: use the full PDF builder instead of reusing v2 PDFs.');
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const art=path.join(root,'apps/teacher-web/public/course-assets/international-mathematics/art');
let checkedArt=0;
for(const filename of await fs.readdir(art))if(filename.endsWith('.png')){
 const original=path.join(oldRoot,'offline/course-assets/international-mathematics/art',filename);
 assert.equal(digest(await fs.readFile(path.join(art,filename))),digest(await fs.readFile(original)),`Core artwork changed: ${filename}`);checkedArt++;
}
const provenance=await Promise.all(deck.lessons.map(async lesson=>{
 const source=lesson.kind==='supplement'?path.join(output,'slides.pdf'):path.join(oldRoot,'slides',`lesson-${String(lesson.number).padStart(2,'0')}.pdf`);
 const bytes=await fs.readFile(source);return {lesson,source,sha256:digest(bytes)};
}));
const fingerprint=digest(JSON.stringify({kind:'factorisation-addition-v1',version:deck.versionId,coreDefinitions:digest(JSON.stringify(definitions)),inputs:provenance.map(p=>({number:p.lesson.number,sha256:p.sha256}))}));
const directory=path.join(cache,deck.courseId,fingerprint);await fs.mkdir(directory,{recursive:true});
const chapters=[];
for(const p of provenance){
 const name=`chapter-${String(p.lesson.number).padStart(2,'0')}.pdf`,target=path.join(directory,name);await fs.copyFile(p.source,target);
 chapters.push({number:p.lesson.number,label:p.lesson.displayLabel!,title:p.lesson.title,pages:p.lesson.slideTotal,path:target,filename:name,
  hours:p.lesson.hourRanges?.map(h=>({number:h.number,page:h.localStart})),examples:p.lesson.kind==='supplement'?FACTORISATION_WORKED_EXAMPLES:undefined});
}
const spec=path.join(root,'.runtime/factorisation-build/course-pdfs.json');
await fs.writeFile(spec,JSON.stringify({directory,chapters,expected:deck.slideTotal}));
const code=String.raw`
import sys,json,zipfile
from pathlib import Path
import fitz
spec=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out=Path(spec['directory']);merged=fitz.open();toc=[];offset=0
for c in spec['chapters']:
 d=fitz.open(c['path']);assert len(d)==c['pages'],(c['number'],len(d))
 assert all(abs(p.rect.width/p.rect.height-1.6)<.001 for p in d)
 merged.insert_pdf(d);toc.append([1,c['label']+': '+c['title'],offset+1])
 for h in c.get('hours') or []:toc.append([2,'Hour '+str(h['number']),offset+h['page']])
 for e in c.get('examples') or []:toc.append([2,'Example '+e['id'],offset+e['pages'][0]])
 offset+=len(d);d.close()
assert offset==spec['expected']==1352
merged.set_toc(toc);merged.save(out/'course.pdf',garbage=4,deflate=True);merged.close()
check=fitz.open(out/'course.pdf');assert len(check)==1352
assert check[234].get_text().find('Two brackets, one quadratic')>=0
assert check[274].get_text().find('ONE BECOMES TWO')>=0
assert len([t for t in check.get_toc() if t[0]==1])==17
with zipfile.ZipFile(out/'chapters.zip','w',zipfile.ZIP_DEFLATED) as z:
 for c in spec['chapters']:z.write(c['path'],c['filename'])
with zipfile.ZipFile(out/'chapters.zip') as z:assert z.testzip() is None and len(z.namelist())==17
print('Verified 1,352 PDF pages: Lecture 3, supplement, Lecture 4 in order; 17 chapter PDFs and bookmarks.')
`;
const assembled=spawnSync(process.env.EDU_PDF_PYTHON||'python',['-c',code,spec],{cwd:root,encoding:'utf8',windowsHide:true});
if(assembled.status!==0)throw Error(assembled.stdout+'\n'+assembled.stderr);
const artifact=async(name:string)=>{const bytes=await fs.readFile(path.join(directory,name));return {url:`/course-exports/${deck.courseId}/${fingerprint}/${name}`,bytes:bytes.length,sha256:digest(bytes)};};
const entry={courseId:deck.courseId,versionId:deck.versionId,title:deck.title,fingerprint,slideTotal:deck.slideTotal,
 chapters:await Promise.all(chapters.map(async c=>({number:c.number,title:c.title,label:c.label,pages:c.pages,file:await artifact(c.filename)}))),complete:await artifact('course.pdf'),archive:await artifact('chapters.zip')};
const offline=JSON.parse(await fs.readFile(path.join(dist,'offline-manifest.json'),'utf8'));
let previous:{courses:Record<string,unknown>[]}={courses:[]};try{previous=JSON.parse(await fs.readFile(path.join(cache,'manifest.json'),'utf8'));}catch{/* first publication */}
const manifest={format:1,releaseId:offline.releaseId,createdAt:new Date().toISOString(),courses:[...previous.courses.filter(c=>c.courseId!==deck.courseId),entry]};
validatedPdfFiles(manifest,deck,offline.releaseId);
await fs.mkdir(cache,{recursive:true});await fs.writeFile(path.join(cache,'manifest.json'),JSON.stringify(manifest,null,2));
// Retain any other already-published courses when Vite has refreshed the dist directory.
for(const course of manifest.courses as (typeof entry)[]){
 for(const file of [...course.chapters.map(c=>c.file),course.complete,course.archive]){
  assert.match(file.url,/^\/course-exports\/[a-z0-9-]+\/[a-f0-9]{64}\/[a-z0-9-]+\.(pdf|zip)$/);
  const relative=file.url.slice('/course-exports/'.length),source=path.join(cache,relative),target=path.join(dist,'course-exports',relative);
  const bytes=await fs.readFile(source);assert.equal(bytes.length,file.bytes);assert.equal(digest(bytes),file.sha256);
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target);
 }
}
await fs.mkdir(path.join(dist,'course-exports'),{recursive:true});await fs.writeFile(path.join(dist,'course-exports/manifest.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(output,'qa/system-pdf-publication.json'),JSON.stringify({status:'passed',coreDefinitionsIdentical:true,unchangedCoreArtFiles:checkedArt,
 corePdfsReused:16,teachingOrder:deck.lessons.map(l=>l.number),totalPages:1352,fingerprint,files:entry,
 provenance:provenance.map(p=>({lesson:p.lesson.number,source:p.source,sha256:p.sha256}))},null,2));
console.log(assembled.stdout.trim());console.log(`Published ${entry.chapters.length} chapter PDFs, the combined PDF and ZIP for local and production viewers.`);
