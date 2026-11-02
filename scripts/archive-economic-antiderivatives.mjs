import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='archive/courseware/economic-mathematics/lesson16-before-antiderivatives-2026-10-31';
try{await access(base+'/manifest.json');throw Error('Archive exists; never overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const result=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const course=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const files=[
 ...['v2/lesson-17.ts','authoring.ts','curriculum.ts','slides.ts','index.ts','types.ts','interactions.ts','next-lesson-plan.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),
 ...['EconomicMathematicsTeachingSlides.tsx','EconomicPageNarrator.tsx','PresentationChrome.tsx','economic-mathematics.css','limits.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),
 'apps/teacher-web/src/economic-narration.tsx','packages/course-content/src/deck-registry.ts'
];
const hashes=[];
for(const file of files){const bytes=await readFile(file),target=base+'/'+file;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await copyFile(file,target);hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(base+'/previous-pages.json',JSON.stringify(course.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(base+'/manifest.json',JSON.stringify({deckId:course.ECONOMIC_MATHEMATICS_DECK_ID,version:course.ECONOMIC_MATHEMATICS_VERSION_ID,counts:course.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:hashes},null,2)+'\n');
await writeFile(base+'/RESTORE.md','# 第16讲重构前快照\n\n保存 market-2026-10-31 版的完整页面清单、原第16讲（源第17讲）及必要接入代码。manifest.json 记录逐文件 SHA-256。恢复时仅逐项合并经济数学变更，保留其他课程及工作区修改。历史课堂继续按原版本、页码及实验状态识别，禁止自动迁移。\n');
const out='output/courseware/economic-antiderivatives-2026-10-31';await mkdir(out,{recursive:true});await copyFile('.runtime/platform-api/state.json',out+'/runtime-before.json');
await writeFile(out+'/baseline.json',JSON.stringify({version:course.ECONOMIC_MATHEMATICS_VERSION_ID,counts:course.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),total:course.ECONOMIC_MATHEMATICS_SLIDES.length},null,2));
console.log(JSON.stringify({archive:base,version:course.ECONOMIC_MATHEMATICS_VERSION_ID,pages:course.ECONOMIC_MATHEMATICS_SLIDES.length,files:hashes.length}));
