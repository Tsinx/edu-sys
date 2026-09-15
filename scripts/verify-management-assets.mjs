import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const release=process.argv[2]??'apps/teacher-web/dist',web=release.endsWith('/dist')?release:path.join(release,'web');
const manifest=JSON.parse(await fs.readFile(path.join(web,'offline-manifest.json'),'utf8')),images=JSON.parse(await fs.readFile('docs/management/image-manifest.json','utf8'));
assert.ok(manifest.groups.some(g=>g.id==='management'));
const files=manifest.files.filter(f=>f.url.startsWith('/course-assets/management-principles/'));
assert.equal(files.filter(f=>/\/mg-\d+\.webp$/.test(f.url)).length,110);
for(const f of files){assert.equal(f.group,'management');const data=await fs.readFile(path.join(web,f.url));assert.equal(data.length,f.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),f.sha256);}
for(const im of images)assert.equal(files.find(f=>f.url.endsWith(`/${im.id}.webp`))?.sha256,im.webSha256);
assert.ok(!manifest.files.some(f=>/source-map|originalNotes|authored\/|\.pptx|\.rar|image-briefs/.test(f.url)));
const sw=await fs.readFile(path.join(web,'service-worker.js'),'utf8');assert.match(sw,/"management"/);
const privateMap=JSON.parse(await fs.readFile('docs/management/source-map.json','utf8'));const secrets=privateMap.flatMap(m=>m.originalNotes).flatMap(n=>typeof n==='string'?[n]:n?.text?[n.text]:[]).filter(s=>s.length>70);
const js=await Promise.all((await fs.readdir(path.join(web,'assets'))).filter(n=>n.endsWith('.js')).map(n=>fs.readFile(path.join(web,'assets',n),'utf8')));const combined=js.join('\n');
for(const secret of secrets)assert.ok(!combined.includes(secret),'original note leaked into public JavaScript');
const report={checkedAt:new Date().toISOString(),release,releaseId:manifest.releaseId,generatedImages:110,originalReferenceAssets:files.length-110,managementFiles:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0),allHashesMatch:true,privateSourceFilesAbsent:true,originalNotesAbsent:true,cacheGroup:'management'};
await fs.writeFile('output/management-principles/qa/asset-integrity.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
