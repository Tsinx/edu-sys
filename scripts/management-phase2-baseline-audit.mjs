import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='output/management-principles/phase1-baseline';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const digest=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const baseline=await read(`${base}/manifest.json`);
for(const f of baseline)assert.equal(await digest(`${base}/${f.path}`),f.sha256);
const stem='packages/course-content/src/management-principles';
const old=await read(`${base}/${stem}/pages.json`),pages=await read(`${stem}/pages.json`),manifest=await read(`${stem}/manifest.json`);
assert.deepEqual(pages.slice(0,old.length),old);assert.equal(old.length,367);
assert.deepEqual((await read(`${stem}/lessons.json`)).slice(0,4),await read(`${base}/${stem}/lessons.json`));
const oldImages=await read(`${base}/docs/management/image-manifest.json`),images=await read('docs/management/image-manifest.json');
assert.deepEqual(images.slice(0,oldImages.length),oldImages);
for(const im of oldImages){assert.equal(await digest(im.original),im.originalSha256);assert.equal(await digest(im.adopted),im.webSha256);}
const updates=await read('docs/management/updates.json');assert.equal(updates.length,manifest.sourcePageCount);
assert.equal(pages.length,manifest.webPageCount);assert.equal(new Set(pages.map(p=>p.slideKey)).size,pages.length);
assert.deepEqual(pages.map(p=>p.index),Array.from({length:pages.length},(_,i)=>i+1));
assert.deepEqual(updates.flatMap(u=>u.slideKeys),pages.map(p=>p.slideKey));
const docs=new Map();for(const u of updates){const previous=docs.get(u.documentId)||0;assert.equal(u.page,previous+1);docs.set(u.documentId,u.page);assert.ok(typeof u.oldText==='string'&&u.newText&&u.reason&&Array.isArray(u.sources));}
for(const [doc,count] of Object.entries({l5:60,l6:64,l7:55,l8:39}))assert.equal(docs.get(doc),count);
const sourceMap=await read('docs/management/source-map.json');
assert.deepEqual(sourceMap.map(s=>s.slideKey),pages.map(p=>p.slideKey));
for(const p of pages.filter(p=>p.lessonNumber>=5)){
 const source=sourceMap[p.index-1];assert.ok(source.assistantCue&&source.teachingCue&&source.originalFile&&source.sha256);
 for(const field of ['assistantCue','teachingCue','originalNotes','originalAnimation','modifications'])assert.equal(Object.hasOwn(p,field),false);
}
assert.equal(images.length,manifest.imageCount);assert.equal(images.length-oldImages.length,80);
const report={checkedAt:new Date().toISOString(),status:'passed',preservedBaselineFiles:baseline.length,unchangedPublicPages:old.length,unchangedLessons:4,unchangedOriginalAndWebImages:oldImages.length,sourcePages:updates.length,newSourcePages:218,webPages:pages.length,newWebPages:pages.length-old.length,images:images.length,newImages:80,sourceDocuments:Object.fromEntries(docs),pageOrderAndKeys:'continuous and unique',baselineManifestSha256:await digest(`${base}/manifest.json`),pagesSha256:await digest(`${stem}/pages.json`)};
await writeFile('output/management-principles/qa-phase2/baseline-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
