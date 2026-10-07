import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),output=path.join(root,process.env.IM_OUTPUT_ROOT||'output/international-mathematics/v2'),offline=path.join(output,'offline');
const copy=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
copy(path.join(root,'apps/teacher-web/public/course-assets/international-mathematics'),path.join(offline,'course-assets/international-mathematics'));
copy(path.join(output,'slides'),path.join(offline,'slides'));copy(path.join(output,'documents'),path.join(offline,'documents'));
for(const file of ['server.mjs','start.ps1','Start-Course.cmd','README.md'])copy(path.join(root,'scripts/international-mathematics-viewer',file),path.join(offline,file));
copy('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe',path.join(offline,'runtime/node.exe'));
copy(path.join(root,'packages/course-content/src/international-mathematics'),path.join(offline,'source/course-content'));
copy(path.join(root,'apps/teacher-web/src/features/international-mathematics'),path.join(offline,'source/presentation-and-animation'));
copy(path.join(root,'scripts/international-mathematics-viewer'),path.join(offline,'source/offline-viewer'));
copy(path.join(root,'scripts/international-mathematics-sync-qa'),path.join(offline,'source/synchronization-qa'));
for(const file of fs.readdirSync(path.join(root,'scripts')).filter(f=>f.startsWith('international-mathematics-')&&!fs.statSync(path.join(root,'scripts',f)).isDirectory()))copy(path.join(root,'scripts',file),path.join(offline,'source/scripts',file));
for(const file of ['image-prompts.json','image-provenance.json','course-definitions.json','narration.json','narration-script.md','sound-design.json','content-validation.json','v1-page-mapping.json','course-metadata.json'])if(fs.existsSync(path.join(output,file)))copy(path.join(output,file),path.join(offline,'source',file));
if(fs.existsSync(path.join(output,'narration.md')))copy(path.join(output,'narration.md'),path.join(offline,'source/narration-script.md'));
// Preserve the system integration alongside the editable standalone course.
const integrationFiles=[
 'packages/contracts/src/index.ts','packages/course-content/src/deck-registry.ts','packages/course-content/package.json',
 'apps/platform-api/src/portal-routes.ts','apps/platform-api/src/app.ts','apps/platform-api/src/assistant/prompts.ts','apps/platform-api/src/assistant/tool-prompts.ts','apps/platform-api/src/seed.ts','apps/platform-api/src/store.ts','apps/platform-api/src/study/orchestrator.ts','apps/platform-api/src/study/speech.ts',
 'apps/teacher-web/campus-build.ts','apps/teacher-web/src/campus/BrowserAvatarSurface.tsx','apps/teacher-web/src/campus/StudentApp.tsx','apps/teacher-web/src/campus/runtime.ts','apps/teacher-web/src/campus/service-worker.js',
 'apps/teacher-web/src/features/classroom/ClassroomParticipation.tsx','apps/teacher-web/src/features/classroom/ClassroomSubsystem.tsx','apps/teacher-web/src/features/classroom/HandsFreeVoiceControl.tsx','apps/teacher-web/src/features/classroom/LamAvatarSurface.tsx','apps/teacher-web/src/features/classroom/SlideViewport.tsx','apps/teacher-web/src/features/classroom/StudentClassroom.tsx','apps/teacher-web/src/features/classroom/student-navigation.ts','apps/teacher-web/src/features/classroom/TeachingSlides.tsx','apps/teacher-web/src/features/classroom/VoiceCommandComposer.tsx',
 'apps/teacher-web/src/features/study/EnglishReadingAssistant.tsx','apps/teacher-web/src/features/study/english-reading-assistant.css','apps/teacher-web/src/portal/WorkspacePages.tsx',
 'apps/platform-api/test/international-mathematics.test.ts','apps/platform-api/test/speech-language.test.ts','apps/platform-api/test/assistant-prompts.test.ts','apps/teacher-web/test/international-mathematics-content.test.ts','apps/teacher-web/test/course-language.test.tsx','apps/teacher-web/test/student-navigation.test.ts',
 'package.json','pnpm-lock.yaml','pnpm-workspace.yaml'
];
for(const file of integrationFiles)if(fs.existsSync(path.join(root,file)))copy(path.join(root,file),path.join(offline,'source/system-integration',file));
for(const file of ['DELIVERY.md','SOURCE-README.md'])if(fs.existsSync(path.join(output,file)))copy(path.join(output,file),path.join(offline,file));
// The ZIP's own hash is an external receipt: embedding it would be circular.
fs.mkdirSync(path.join(offline,'verification'),{recursive:true});
fs.cpSync(path.join(output,'qa'),path.join(offline,'verification'),{recursive:true,filter:source=>path.basename(source)!=='zip-audit.json'});
function list(directory,prefix=''){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{const key=prefix?prefix+'/'+entry.name:entry.name;if(entry.name==='.server-port'||key==='manifest-sha256.json')return[];return entry.isDirectory()?list(path.join(directory,entry.name),key):[{file:key,bytes:fs.statSync(path.join(directory,entry.name)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,entry.name))).digest('hex')}];});}
const metadata=JSON.parse(fs.readFileSync(path.join(output,'course-metadata.json'),'utf8'));const definitions=JSON.parse(fs.readFileSync(path.join(output,'course-definitions.json'),'utf8')).lessons;const files=list(offline);fs.writeFileSync(path.join(offline,'manifest-sha256.json'),JSON.stringify({course:'course-international-mathematics',version:metadata.version,files},null,2));fs.writeFileSync(path.join(output,'delivery-inventory.json'),JSON.stringify({lessons:definitions.length,teachingHours:definitions.reduce((n,l)=>n+l.hours.length,0),corePages:metadata.coreSlides,optionalPages:metadata.optionalSlides,totalPages:metadata.totalSlides,art:36,openingFilms:16,exerciseCore:definitions.reduce((n,l)=>n+l.exercises.filter(e=>!e.optional).length,0),exerciseOptional:definitions.reduce((n,l)=>n+l.exercises.filter(e=>e.optional).length,0),studentSlidePdfs:17,companionPdfs:4,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files:files.length},null,2));console.log(`Packaged ${files.length} files; ${(files.reduce((n,f)=>n+f.bytes,0)/1048576).toFixed(1)} MiB`);
