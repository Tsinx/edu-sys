import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),base='archive/courseware/economic-mathematics/applications-before-merge-2026-10-30',dest=path.join(root,base);
try{await access(path.join(dest,'manifest.json'));throw Error('Archive exists; never overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundled=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const files=[...['curriculum.ts','slides.ts','index.ts','types.ts','analysis-authoring.ts','analysis-exercises.ts','lesson-12-lhopital.ts','next-lesson-plan.ts','v2/lesson-13.ts','v2/lesson-14.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f),...['EconomicMathematicsTeachingSlides.tsx','EconomicPageNarrator.tsx','PresentationChrome.tsx','economic-mathematics.css','limits.css'].map(f=>'apps/teacher-web/src/features/economic-mathematics/'+f),'apps/teacher-web/src/economic-narration.tsx','docs/course/economic-mathematics-lessons-10-13-plan.md'];
const records=[];for(const f of files){const b=await readFile(path.join(root,f));const target=path.join(dest,f);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,f),target);records.push({path:f,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await writeFile(path.join(dest,'previous-pages.json'),JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES,null,2)+'\n');
await writeFile(path.join(dest,'previous-narration.json'),JSON.stringify({lesson12:c.lesson12Narration},null,2)+'\n');
await writeFile(path.join(dest,'manifest.json'),JSON.stringify({version:c.ECONOMIC_MATHEMATICS_VERSION_ID,deck:c.ECONOMIC_MATHEMATICS_DECK_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:records},null,2)+'\n');
await writeFile(path.join(dest,'RESTORE.md'),'# 合并与编号调整前快照\n\n原32讲的完整页面清单和第12讲口播保存在JSON。manifest记录原版本、每讲页数与源文件SHA256。恢复时只合并经济数学相关内容，保留其他课程和平台修改。旧课堂使用原版本与原页码，不自动改写为新31讲。\n');
console.log(JSON.stringify({base,files:records.length,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal)}));
