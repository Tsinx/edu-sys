import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='archive/courseware/economic-mathematics/business-before-market-2026-10-31';
try{await access(base+'/manifest.json');throw Error('Archive exists; never overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundle=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files=[...['lesson-14-marginal.ts','lesson-15-elasticity.ts','business-authoring.ts','business-exercises.ts','business-model.ts','curriculum.ts','slides.ts','index.ts','types.ts','interactions.ts','authoring.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['BusinessFigure.tsx','EconomicMathematicsTeachingSlides.tsx','EconomicPageNarrator.tsx','PresentationChrome.tsx','economic-mathematics.css','limits.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx','packages/course-content/src/deck-registry.ts','scripts/prepare-economic-business.mjs'];
for(const f of await readdir('docs/course'))if(/economic-mathematics-(business-|lesson1[45]-)/.test(f))files.push('docs/course/'+f);
for(const f of await readdir('apps/teacher-web/public/course-assets/economic-mathematics/limits'))if(/^lesson1[45]-/.test(f))files.push('apps/teacher-web/public/course-assets/economic-mathematics/limits/'+f);
const hashes=[];
for(const file of files){const bytes=await readFile(file),dest=base+'/'+file;await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});await copyFile(file,dest);hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(base+'/previous-pages.json',JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(base+'/manifest.json',JSON.stringify({deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:hashes},null,2)+'\n');
await writeFile(base+'/RESTORE.md','# 价格菜单重构前的第14、15讲\n\n此快照保存原business-2026-10-30版1070页清单、两讲源代码、原生图形、接入代码、讲稿、题库和备课PDF。manifest记录文件SHA-256。恢复时逐项合并经济数学文件，不覆盖其他课程与工作区修改。历史课堂使用自己的版本、页码与实验状态；禁止自动映射到新页面。原有学习通答题数据不在此目录中，不得因课件更新删除。\n');
const out='output/courseware/economic-market-2026-10-31';await mkdir(out,{recursive:true});await copyFile('.runtime/platform-api/state.json',out+'/runtime-before.json');
console.log(JSON.stringify({archive:base,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,pages:c.ECONOMIC_MATHEMATICS_SLIDES.length,files:hashes.length}));
