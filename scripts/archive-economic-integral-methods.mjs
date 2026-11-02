import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const archive='archive/courseware/economic-mathematics/integral-methods-before-2026-11-01',out='output/courseware/economic-integral-methods-2026-11-01';
try{await access(archive+'/manifest.json');throw Error('Archive already exists; do not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundle=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files=[...['v2/lesson-19.ts','v2/lesson-20.ts','lesson-16-integral-merged.ts','integral-authoring.ts','integral-merged-exercises.ts','integral-model.ts','types.ts','curriculum.ts','slides.ts','index.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['IntegralFigure.tsx','EconomicPageNarrator.tsx','PresentationChrome.tsx'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx'];
for(const name of await readdir('docs/course'))if(/^economic-mathematics-lesson1[678]-/.test(name))files.push('docs/course/'+name);
for(const name of await readdir('apps/teacher-web/public/course-assets/economic-mathematics/limits'))if(/^lesson1[678]-/.test(name))files.push('apps/teacher-web/public/course-assets/economic-mathematics/limits/'+name);
const hashes=[];for(const file of files){const data=await readFile(file),target=archive+'/'+file;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await copyFile(file,target);hashes.push({file,sha256:createHash('sha256').update(data).digest('hex')});}
await writeFile(archive+'/previous-pages.json',JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(archive+'/manifest.json',JSON.stringify({deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,version:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:hashes},null,2)+'\n');
await writeFile(archive+'/RESTORE.md','# 第17、18讲积分方法重构前\n\n保存合并版1099页清单及换元、分部积分的旧源文件。第16讲的内容、题库和资源作为保护基线；本次不改其数学内容。恢复时逐项合并经济数学文件，不覆盖其他课程与工作区修改。旧课堂保留原版本、页码与步骤，不自动映射新版。\n');
await mkdir(out,{recursive:true});await copyFile('.runtime/platform-api/state.json',out+'/runtime-before.json');
console.log(JSON.stringify({archive,files:hashes.length,pages:c.ECONOMIC_MATHEMATICS_SLIDES.length}));
