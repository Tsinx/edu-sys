import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),destination=path.join(root,'archive/courseware/economic-mathematics/lessons-08-10-before-differentiation-2026-10-20');
const files=['packages/course-content/src/economic-mathematics/v2/lesson-08.ts','packages/course-content/src/economic-mathematics/v2/lesson-09.ts','packages/course-content/src/economic-mathematics/v2/lesson-10.ts','packages/course-content/src/economic-mathematics/curriculum.ts','packages/course-content/src/economic-mathematics/slides.ts','packages/course-content/src/economic-mathematics/index.ts','packages/course-content/src/economic-mathematics/types.ts','packages/course-content/src/economic-mathematics/interactions.ts','packages/course-content/src/economic-mathematics/next-lesson-plan.ts','apps/teacher-web/src/features/economic-mathematics/EconomicPageNarrator.tsx','apps/teacher-web/src/economic-narration.tsx','docs/course/economic-mathematics-lessons-10-13-plan.md','docs/course/economic-mathematics-deck-v2.json'];
try{await readFile(path.join(destination,'manifest.json'));throw Error('Archive already exists; never overwrite it');}catch(e){if(e.code!=='ENOENT')throw e;}
const result=await build({entryPoints:[path.join(root,'packages/course-content/src/economic-mathematics/index.ts')],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
await mkdir(destination,{recursive:true});const records=[];
for(const f of files){const b=await readFile(path.join(root,f)),target=path.join(destination,f);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,f),target);records.push({path:f,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(path.join(destination,'manifest.json'),JSON.stringify({version:c.ECONOMIC_MATHEMATICS_VERSION_ID,deck:c.ECONOMIC_MATHEMATICS_DECK_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:records},null,2)+'\n');
await writeFile(path.join(destination,'RESTORE.md'),'本归档保存第8—10讲重构前的专属内容、接入和规划，SHA-256见manifest.json。历史课堂须保留原版本和原页码，不自动映射到新版。恢复共享文件时仅合并经济数学相关代码，保护其他课程与平台修改。V2原始图像仍在原资源目录，本轮不覆盖。\n');
console.log(JSON.stringify({destination,count:records.length,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal)}));
