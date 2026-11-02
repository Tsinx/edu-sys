import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='archive/courseware/economic-mathematics/integral-before-density-2026-11-01',out='output/courseware/economic-integral-foundations-2026-11-01';
try{await access(base+'/manifest.json');throw Error('Archive exists; never overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const b=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const files=[...['lesson-16-antiderivatives.ts','integral-authoring.ts','integral-exercises.ts','integral-model.ts','v2/lesson-18.ts','authoring.ts','curriculum.ts','slides.ts','index.ts','types.ts','interactions.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['IntegralFigure.tsx','EconomicMathematicsTeachingSlides.tsx','EconomicPageNarrator.tsx','PresentationChrome.tsx','limits.css','economic-mathematics.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx','scripts/prepare-economic-antiderivatives.mjs','scripts/verify-economic-antiderivatives.mjs'];
for(const f of await readdir('docs/course'))if(/^economic-mathematics-lesson16-/.test(f))files.push('docs/course/'+f);
for(const f of await readdir('apps/teacher-web/public/course-assets/economic-mathematics/limits'))if(/^lesson16-/.test(f))files.push('apps/teacher-web/public/course-assets/economic-mathematics/limits/'+f);
const hashes=[];for(const file of files){const bytes=await readFile(file),target=base+'/'+file;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await copyFile(file,target);hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(base+'/previous-pages.json',JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(base+'/manifest.json',JSON.stringify({deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:hashes},null,2)+'\n');
await writeFile(base+'/RESTORE.md','# 第16讲压缩、第17讲重构之前\n\n保存 antiderivatives-2026-10-31 版1130页清单，56页第16讲、原第17讲及必要接入文件、讲稿、题库、PDF。逐文件哈希见manifest.json。恢复仅逐项合并经济数学文件，保留其他课程和既有工作区修改。旧课堂按原版本、原页码及原实验状态识别，不自动迁移。\n');
await mkdir(out,{recursive:true});await copyFile('.runtime/platform-api/state.json',out+'/runtime-before.json');
console.log(JSON.stringify({archive:base,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,pages:c.ECONOMIC_MATHEMATICS_SLIDES.length,files:hashes.length}));
