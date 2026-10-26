import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),base='archive/courseware/economic-mathematics/lessons-11-12-before-mean-value-2026-10-22',dest=path.join(root,base);
try{await access(path.join(dest,'manifest.json'));throw Error('Archive exists; never overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundle=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files=[...['v2/lesson-11.ts','v2/lesson-12.ts','curriculum.ts','slides.ts','index.ts','types.ts','interactions.ts','authoring.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),
 ...['EconomicMathematicsTeachingSlides.tsx','EconomicMathematicsSlideStage.tsx','EconomicPageNarrator.tsx','economic-mathematics.css','limits.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),
 'apps/teacher-web/src/economic-narration.tsx','docs/course/economic-mathematics-lessons-10-13-plan.md'];
for(const n of ['11','12'])for(const type of ['scene','concept'])files.push(`apps/teacher-web/public/course-assets/economic-mathematics/v2/l${n}-${type}.png`);
const pdfs=[];
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true}).catch(()=>[])){const p=path.join(dir,e.name);if(e.isDirectory())await scan(p);else if(/(?:chapter|lesson)[-_]?(?:11|12).*\.pdf$/i.test(e.name))pdfs.push(path.relative(root,p).replaceAll('\\','/'));}}
await scan(path.join(root,'.runtime/course-pdf-cache/artifacts/economic-mathematics'));
await scan(path.join(root,'apps/teacher-web/dist/course-exports/economic-mathematics'));
const records=[];
for(const f of [...files,...pdfs]){let b;try{b=await readFile(path.join(root,f));}catch(e){if(e.code==='ENOENT')continue;throw e;}
 const target=path.join(dest,f);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,f),target);records.push({path:f,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(path.join(dest,'previous-pages.json'),JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES.filter(p=>[11,12].includes(p.lesson)),null,2)+'\n');
await writeFile(path.join(dest,'manifest.json'),JSON.stringify({version:c.ECONOMIC_MATHEMATICS_VERSION_ID,deck:c.ECONOMIC_MATHEMATICS_DECK_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),pdfsFound:pdfs.length,files:records},null,2)+'\n');
await writeFile(path.join(dest,'RESTORE.md'),'# 第十一、十二讲重构前快照\n\n本目录保存旧两讲内容、独立图像、专属渲染与接入快照。manifest.json含原课件版本、每讲页数与文件SHA-256；previous-pages.json是原页面清单。\n\n历史课堂保留原版本、页码和实验状态，禁止自动映射。恢复共享文件时只合并经济数学部分，保护其他课程与平台修改。新页面使用独立页面键。未发现旧分讲PDF时，manifest记录pdfsFound=0，不将不存在的文件声称为已归档。\n');
console.log(JSON.stringify({destination:base,files:records.length,pdfs:pdfs.length,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal)}));
