import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),destination=path.join(root,'archive/courseware/economic-mathematics/lessons-06-07-before-continuity-derivative-2026-10-17');
const files=['packages/course-content/src/economic-mathematics/lesson-06-refined.ts','packages/course-content/src/economic-mathematics/v2/lesson-07.ts','packages/course-content/src/economic-mathematics/derivative-topic-moved.ts','packages/course-content/src/economic-mathematics/curriculum.ts','packages/course-content/src/economic-mathematics/slides.ts','packages/course-content/src/economic-mathematics/index.ts','packages/course-content/src/economic-mathematics/types.ts','packages/course-content/src/economic-mathematics/interactions.ts','packages/course-content/src/economic-mathematics/foundations-model.ts','apps/teacher-web/src/features/economic-mathematics/EconomicPageNarrator.tsx','apps/teacher-web/src/features/economic-mathematics/PresentationChrome.tsx','apps/teacher-web/src/features/economic-mathematics/FoundationFigure.tsx','apps/teacher-web/src/economic-narration.tsx','docs/course/economic-mathematics-blueprint-v3.md','docs/course/economic-mathematics-deck-v2.json','docs/course/economic-mathematics-lesson06-script.md','apps/teacher-web/public/course-assets/economic-mathematics/limits/lesson06-script.html','apps/teacher-web/public/course-assets/economic-mathematics/limits/lesson06-worksheet.html','apps/teacher-web/public/course-assets/economic-mathematics/limits/lesson06-teacher.pdf'];
await mkdir(destination,{recursive:true});
const exists=await readFile(path.join(destination,'manifest.json'),'utf8').catch(()=>null);
if(exists)throw Error('Archive already exists; do not overwrite it');
const records=[];
for(const file of files){const bytes=await readFile(path.join(root,file));const target=path.join(destination,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,file),target);records.push({path:file,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(path.join(destination,'manifest.json'),JSON.stringify({version:'release-economic-mathematics-math-first-2026-10-16',slideTotal:648,files:records},null,2)+'\n');
await writeFile(path.join(destination,'RESTORE.md'),'本归档保存第六、七讲重构前的专属内容、讲稿、PDF和必要接入代码。恢复必须同时核对课件版本、页面清单与数据结构；不得把历史课堂页码映射到新版本。共享文件恢复时仅合并经济数学相关变更，保留其他课程与平台的修改。文件SHA-256见manifest.json。\n');
console.log(JSON.stringify({archived:records.length,destination}));
