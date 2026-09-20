import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
import {LESSON_SIX_FILM_SCRIPTS,LESSON_SIX_FILM_ANSWERS,getLessonSixFilm} from '../packages/course-content/src/port-lesson-six-film.js';
const root=fileURLToPath(new URL('../',import.meta.url));try{loadEnvFile(root+'.env');}catch{}
const provider=new DashScopeStudySpeechProvider();if(!provider.ttsConfigured)throw Error('现有中文授课音色未配置，不能生成旁白');
const dir=root+'apps/teacher-web/public/course-assets/port-management/l6-film/',receipt=root+'output/port-lesson-six-film/';await mkdir(dir,{recursive:true});await mkdir(receipt,{recursive:true});
const shots=[...new Map([...Object.values(LESSON_SIX_FILM_SCRIPTS).flat(),...LESSON_SIX_FILM_ANSWERS,...getLessonSixFilm(29,0)!.shots].map(s=>[s.id,s])).values()];
const digest=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const model=process.env.EDU_SELFSTUDY_TTS_MODEL??'qwen3-tts-vd-realtime-2026-01-15',voiceFingerprint=digest(process.env.EDU_SELFSTUDY_TTS_VOICE_ID!);
const manifest:Record<string,unknown>={};let cursor=0;
function wav(pcm:Buffer){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
async function worker(){while(cursor<shots.length){const s=shots[cursor++]!,textSha256=digest(s.narration),name=`${s.id}-${textSha256.slice(0,12)}.wav`,path=dir+name,recordPath=receipt+s.id+'.json';
 try{const old=JSON.parse(await readFile(recordPath,'utf8')),bytes=await readFile(path);if(old.textSha256===textSha256&&old.voiceFingerprint===voiceFingerprint&&old.model===model&&digest(bytes)===old.sha256){manifest[s.id]=old;console.log('reuse '+s.id);continue;}}catch{}
 let pcm:Buffer|undefined;
 for(let attempt=0;attempt<3;attempt++){try{const chunks:Buffer[]=[];for await(const c of provider.synthesize(s.narration,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(c.audioBase64,'base64'));pcm=Buffer.concat(chunks);if(pcm.length<4800)throw Error('音频过短');break;}catch(error){if(attempt===2)throw Error(`旁白 ${s.id} 生成失败: ${String(error).slice(0,200)}`);await new Promise(r=>setTimeout(r,2000*(attempt+1)));}}
 const bytes=wav(pcm!),entry={src:'/course-assets/port-management/l6-film/'+name,durationMs:pcm!.length/48,sha256:digest(bytes),textSha256,voiceProfile:'default',voiceFingerprint,model};await writeFile(path,bytes);await writeFile(recordPath,JSON.stringify(entry,null,2));manifest[s.id]=entry;console.log(`generated ${s.id} ${(entry.durationMs/1000).toFixed(2)}s`);
}}
await Promise.all([worker(),worker()]);await writeFile(root+'packages/course-content/src/lesson-six-film-audio.json',JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()),null,2)+'\n');console.log(`PASS ${shots.length} real narrated audio segments`);
