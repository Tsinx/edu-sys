import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='archive/courseware/economic-mathematics/integral-before-merge-2026-11-01';
const out='output/courseware/economic-integral-merge-2026-11-01';
try{await access(base+'/manifest.json');throw Error('Archive exists; do not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const b=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const files=[...['lesson-16-antiderivatives.ts','lesson-16-integral-density.ts','lesson-17-basic-integrals.ts','integral-authoring.ts','integral-exercises.ts','integral-density-exercises.ts','integral-model.ts','curriculum.ts','slides.ts','index.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['EconomicPageNarrator.tsx','PresentationChrome.tsx'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx','scripts/prepare-economic-integral-foundations.mjs','scripts/verify-economic-integral-foundations.mjs'];
for(const f of await readdir('docs/course'))if(/^economic-mathematics-(lesson1[67]-|integral-(exercises|foundations))/.test(f))files.push('docs/course/'+f);
for(const f of await readdir('apps/teacher-web/public/course-assets/economic-mathematics/limits'))if(/^lesson1[67]-/.test(f))files.push('apps/teacher-web/public/course-assets/economic-mathematics/limits/'+f);
const hashes=[];
for(const file of files){const bytes=await readFile(file),target=base+'/'+file;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await copyFile(file,target);hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(base+'/previous-pages.json',JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(base+'/manifest.json',JSON.stringify({deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:hashes},null,2)+'\n');
await writeFile(base+'/RESTORE.md','# 第16、17讲合并前的完整存档\n\n保存34页第16讲、40页第17讲及1138页完整清单。源文件、讲稿、题库、打印文件和PDF的逐项哈希见manifest.json。恢复时逐项合并经济数学文件，保留其他课程及工作区修改。历史课堂继续使用原版本、页码与实验状态，不自动迁移。\n');
await mkdir(out,{recursive:true});await copyFile('.runtime/platform-api/state.json',out+'/runtime-before.json');
console.log(JSON.stringify({archive:base,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,pages:c.ECONOMIC_MATHEMATICS_SLIDES.length,files:hashes.length}));
