/** Replace only the revised chapter; preserve prior releases and verify reusable chapter content. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getCourseDeckByCourseId} from '../packages/course-content/src/deck-registry.js';
import {INTERNATIONAL_MATHEMATICS_DEFINITIONS as definitions} from '../packages/course-content/src/international-mathematics/index.js';
import {validatedPdfFiles,type CoursePdfManifest} from '../apps/teacher-web/src/features/course-export/pdf-model.js';
const root=fileURLToPath(new URL('..',import.meta.url)),oldRoot=path.join(root,'output/international-mathematics/v2');
const output=path.join(root,'output/international-mathematics/lesson-03-revision');
const cache=path.join(root,'.runtime/course-pdf-cache/artifacts'),dist=path.join(root,'apps/teacher-web/dist');
const deck=getCourseDeckByCourseId('course-international-mathematics')!;
const previous:CoursePdfManifest=JSON.parse(await fs.readFile(path.join(cache,'manifest.json'),'utf8'));
const previousCourse=previous.courses.find(c=>c.courseId===deck.courseId)!;
const old=JSON.parse(await fs.readFile(path.join(oldRoot,'course-definitions.json'),'utf8'));
for(const [i,l] of definitions.entries())if(l.number!==3)assert.deepEqual(old.lessons[i],JSON.parse(JSON.stringify(l)),`Changed chapter ${l.number} cannot reuse its old PDF`);
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const art=path.join(root,'apps/teacher-web/public/course-assets/international-mathematics/art');
for(const name of await fs.readdir(art))if(name.endsWith('.png'))assert.equal(digest(await fs.readFile(path.join(art,name))),digest(await fs.readFile(path.join(oldRoot,'offline/course-assets/international-mathematics/art',name))));
const provenance=await Promise.all(deck.lessons.map(async lesson=>{
 const source=lesson.number===3?path.join(output,'lecture-03-completing-square-and-quadratic-formula.pdf'):lesson.kind==='supplement'?path.join(root,'apps/teacher-web/public/course-assets/international-mathematics/factorisation/slides.pdf'):path.join(oldRoot,'slides',`lesson-${String(lesson.number).padStart(2,'0')}.pdf`);
 const sha256=digest(await fs.readFile(source));
 if(lesson.number!==3)assert.equal(sha256,previousCourse.chapters.find(c=>c.number===lesson.number)!.file.sha256,`Reused PDF ${lesson.number} must match its verified publication`);
 return {lesson,source,sha256};
}));
const fingerprint=digest(JSON.stringify({kind:'lesson03-scaffolding-v3',version:deck.versionId,definitions,inputs:provenance.map(p=>p.sha256)}));
const directory=path.join(cache,deck.courseId,fingerprint);await fs.mkdir(directory,{recursive:true});
const chapters=[];
for(const p of provenance){const filename=`chapter-${String(p.lesson.number).padStart(2,'0')}.pdf`,target=path.join(directory,filename);await fs.copyFile(p.source,target);chapters.push({number:p.lesson.number,label:p.lesson.displayLabel!,title:p.lesson.title,pages:p.lesson.slideTotal,path:target,filename,hours:p.lesson.hourRanges?.map(h=>({number:h.number,page:h.localStart}))});}
const spec=path.join(root,'.runtime/lesson03-scaffolding/course-pdfs.json');await fs.writeFile(spec,JSON.stringify({directory,chapters,expected:deck.slideTotal}));
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
 c['combinedStart']=offset+1;offset+=len(d);d.close()
assert offset==spec['expected']
merged.set_toc(toc);merged.save(out/'course.pdf',garbage=4,deflate=True);merged.close()
check=fitz.open(out/'course.pdf');assert len(check)==spec['expected']
assert len([t for t in check.get_toc() if t[0]==1])==len(spec['chapters'])
for c in spec['chapters']:
 assert check[c['combinedStart']-1].get_text().strip()
check.close()
with zipfile.ZipFile(out/'chapters.zip','w',zipfile.ZIP_DEFLATED) as z:
 for c in spec['chapters']:z.write(c['path'],c['filename'])
with zipfile.ZipFile(out/'chapters.zip') as z:assert z.testzip() is None and len(z.namelist())==len(spec['chapters'])
print('Verified '+str(offset)+' combined pages, chapter/hour bookmarks and chapter ZIP integrity.')
`;
const result=spawnSync(process.env.EDU_PDF_PYTHON||'python',['-c',code,spec],{encoding:'utf8',windowsHide:true});if(result.status!==0)throw Error(result.stdout+'\n'+result.stderr);
const artifact=async(name:string)=>{const bytes=await fs.readFile(path.join(directory,name));return {url:`/course-exports/${deck.courseId}/${fingerprint}/${name}`,bytes:bytes.length,sha256:digest(bytes)};};
const entry={courseId:deck.courseId,versionId:deck.versionId,title:deck.title,fingerprint,slideTotal:deck.slideTotal,chapters:await Promise.all(chapters.map(async c=>({number:c.number,title:c.title,label:c.label,pages:c.pages,file:await artifact(c.filename)}))),complete:await artifact('course.pdf'),archive:await artifact('chapters.zip')};
const offline=JSON.parse(await fs.readFile(path.join(dist,'offline-manifest.json'),'utf8'));
const manifest:CoursePdfManifest={format:1,releaseId:offline.releaseId,createdAt:new Date().toISOString(),courses:[...previous.courses.filter(c=>c.courseId!==deck.courseId),entry]};
validatedPdfFiles(manifest,deck,offline.releaseId);
for(const course of manifest.courses)for(const file of [...course.chapters.map(c=>c.file),course.complete,course.archive]){
 assert.match(file.url,/^\/course-exports\/[a-z0-9-]+\/[a-f0-9]{64}\/[a-z0-9-]+\.(pdf|zip)$/);
 const relative=file.url.slice('/course-exports/'.length),source=path.join(cache,relative),target=path.join(dist,'course-exports',relative),bytes=await fs.readFile(source);
 assert.equal(bytes.length,file.bytes);assert.equal(digest(bytes),file.sha256);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target);
}
await fs.writeFile(path.join(cache,'manifest.json'),JSON.stringify(manifest,null,2));await fs.writeFile(path.join(dist,'course-exports/manifest.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(output,'qa/system-pdf-publication.json'),JSON.stringify({status:'passed',version:deck.versionId,totalPages:deck.slideTotal,unchangedLecturePdfsReused:15,fingerprint,files:entry,provenance:provenance.map(p=>({lesson:p.lesson.number,sha256:p.sha256}))},null,2));
console.log(result.stdout.trim());console.log('Updated current-course PDF downloads; prior release files are preserved.');
