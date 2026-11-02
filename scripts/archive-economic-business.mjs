import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='archive/courseware/economic-mathematics/business-before-rebuild-2026-10-30';
try{await access(base+'/manifest.json');throw Error('Archive exists; never overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundle=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files=[...['curriculum.ts','slides.ts','index.ts','types.ts','interactions.ts','next-lesson-plan.ts','v2/lesson-15.ts','v2/lesson-16.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['EconomicMathematicsTeachingSlides.tsx','EconomicPageNarrator.tsx','PresentationChrome.tsx','economic-mathematics.css','limits.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx','packages/course-content/src/deck-registry.ts'];
const hashes=[];for(const file of files){const data=await readFile(file);const dest=base+'/'+file;await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});await copyFile(file,dest);hashes.push({file,sha256:createHash('sha256').update(data).digest('hex')});}
await writeFile(base+'/previous-pages.json',JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(base+'/manifest.json',JSON.stringify({deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:hashes},null,2)+'\n');
await writeFile(base+'/RESTORE.md','# 第14、15讲重做前快照\n\n保存合并后的31讲完整页面、原第14/15讲源文件和接入代码及SHA-256。恢复时仅合并经济数学相关改动，不覆盖其他课程。历史课堂保留原版本、原编号、原页键与实验状态；不自动迁移。\n');
const out='output/courseware/economic-business-2026-10-30';await mkdir(out,{recursive:true});
await copyFile('.runtime/platform-api/state.json',out+'/runtime-before.json');
console.log(JSON.stringify({base,pages:c.ECONOMIC_MATHEMATICS_SLIDES.length,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal)}));
