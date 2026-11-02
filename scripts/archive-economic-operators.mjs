import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),dest=path.join(root,'archive/courseware/economic-mathematics/lesson-10-before-operators-2026-10-29');
try{await access(path.join(dest,'manifest.json'));throw Error('Archive already exists; do not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const bundled=await build({entryPoints:['packages/course-content/src/economic-mathematics/index.ts'],bundle:true,platform:'node',format:'esm',write:false});
const c=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const files=['lesson-10-differentials.ts','differential-rules-pages.ts','differentiation-authoring.ts','differentiation-exercises.ts','differentiation-written-exercises.ts','curriculum.ts','slides.ts','index.ts'].map(f=>'packages/course-content/src/economic-mathematics/'+f).concat(['apps/teacher-web/src/economic-narration.tsx','scripts/prepare-economic-differential-rules.mjs','docs/course/economic-mathematics-lesson10-script.md',...['lesson10-teacher.html','lesson10-worksheet.html','lesson10-script.html','lesson10-rules-worksheet.html'].map(f=>'apps/teacher-web/public/course-assets/economic-mathematics/limits/'+f)]);
const records=[];
for(const file of files){const b=await readFile(path.join(root,file)),target=path.join(dest,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,file),target);records.push({path:file,sha256:createHash('sha256').update(b).digest('hex')});}
const meta={deckId:c.ECONOMIC_MATHEMATICS_DECK_ID,versionId:c.ECONOMIC_MATHEMATICS_VERSION_ID,counts:c.ECONOMIC_MATHEMATICS_LESSONS.map(l=>l.slideTotal),files:records};
await writeFile(path.join(dest,'manifest.json'),JSON.stringify(meta,null,2)+'\n');
await writeFile(path.join(dest,'previous-pages.json'),JSON.stringify(c.ECONOMIC_MATHEMATICS_SLIDES.filter(p=>p.lesson===10),null,2)+'\n');
await writeFile(path.join(dest,'previous-narration.json'),JSON.stringify(c.lesson10Narration,null,2)+'\n');
await writeFile(path.join(dest,'RESTORE.md'),'# 第十讲算子扩充前归档\n\n核对manifest.json中的SHA256，再按原路径恢复。previous-pages.json和previous-narration.json保存75页原文与口播。历史课堂保留原版本、页码与实验状态，不自动迁移。新增内容以独立页面键追加；原75页保持次序。\n');
console.log(JSON.stringify({version:meta.versionId,counts:meta.counts,files:records.length}));
