import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),dest=path.join(root,'archive/courseware/economic-mathematics/lesson-10-before-differential-rules-2026-10-26');
try {await access(path.join(dest,'manifest.json'));throw Error('Archive already exists; do not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundled=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const files=['lesson-10-differentials.ts','differentiation-authoring.ts','differentiation-exercises.ts','differentiation-written-exercises.ts','curriculum.ts','slides.ts','index.ts'].map(x=>'packages/course-content/src/economic-mathematics/'+x).concat(['apps/teacher-web/src/economic-narration.tsx','docs/course/economic-mathematics-lessons-08-10-design.md']);
const records=[];
for(const f of files){const b=await readFile(path.join(root,f)),target=path.join(dest,f);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,f),target);records.push({path:f,sha256:createHash('sha256').update(b).digest('hex')});}
const old={deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,versionId:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal)};
await writeFile(path.join(dest,'manifest.json'),JSON.stringify({...old,files:records},null,2)+'\n');
await writeFile(path.join(dest,'previous-pages.json'),JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES.filter(s=>s.lesson===10),null,2)+'\n');
await writeFile(path.join(dest,'previous-narration.json'),JSON.stringify(c.lesson10Narration,null,2)+'\n');
await writeFile(path.join(dest,'RESTORE.md'),'# 第十讲微分运算整合前归档\n\n恢复时先核对manifest.json中的文件哈希，再按原路径恢复源文件并使用原课件版本。previous-pages.json与previous-narration.json保存原页码和公开步骤。历史课堂保留原版本、页码及实验状态，不自动映射到新课件。\n');
console.log(JSON.stringify(old));
