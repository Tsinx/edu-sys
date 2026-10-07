import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
import {loadRuntimeEnvironment} from '../apps/platform-api/src/runtime-env.js';
import {INTERNATIONAL_MATHEMATICS_DEFINITIONS,type FilmShot,type MathematicsLesson} from '../packages/course-content/src/international-mathematics/index.js';

const root=fileURLToPath(new URL('../',import.meta.url));
loadRuntimeEnvironment();
const model='qwen3-tts-flash-realtime-2025-11-27',voice='Ethan',language='English' as const;
const provider=new DashScopeStudySpeechProvider();
if(!provider.canSynthesize({language}))throw new Error('English narration needs the configured DASHSCOPE_API_KEY. No audio was substituted.');
const ffmpeg=process.env.EDU_FFMPEG_PATH||'ffmpeg';
const output=join(root,'output','international-mathematics');
const cache=join(output,'audio-cache'),film=join(root,'apps','teacher-web','public','course-assets','international-mathematics','film');
await Promise.all([mkdir(cache,{recursive:true}),mkdir(join(film,'shots'),{recursive:true})]);
const selectedArgument=process.argv.find(value=>value.startsWith('--lessons='));
const selected=selectedArgument?new Set(selectedArgument.slice(10).split(',').map(Number)):undefined;
const order=[1,5,14,...Array.from({length:16},(_,index)=>index+1).filter(number=>![1,5,14].includes(number))];
const lessons=order.filter(number=>!selected||selected.has(number)).map(number=>INTERNATIONAL_MATHEMATICS_DEFINITIONS.find(lesson=>lesson.number===number)!);
if(!lessons.length||lessons.some(lesson=>!lesson))throw new Error('Select registered lessons 1 to 16.');
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const rawFingerprint=hash(JSON.stringify({model,voice,language,speechRate:0.96}));
const fingerprint=hash(JSON.stringify({rawFingerprint,leadingSilenceMs:650,shotMs:15000,maximumSpeechMs:13500,normalizationVersion:2}));
const recoverCurrentRaw=process.argv.includes('--recover-current-raw');
const pad=(n:number)=>String(n).padStart(2,'0');
const safeError=(reason:unknown)=>String(reason).replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,280);
const waveform=(bytes:Buffer)=>{
 let channels=0,sampleRate=0,bits=0,pcm:Buffer|undefined;
 for(let offset=12;offset+8<=bytes.length;){const name=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),start=offset+8;
  if(name==='fmt '){channels=bytes.readUInt16LE(start+2);sampleRate=bytes.readUInt32LE(start+4);bits=bytes.readUInt16LE(start+14);}
  if(name==='data')pcm=bytes.subarray(start,start+length);
  offset=start+length+(length%2);
 }
 if(channels!==1||sampleRate!==24000||bits!==16||!pcm||pcm.length%2)throw new Error('Narration WAV must be 24 kHz mono PCM16.');
 let peak=0,sum=0,clipped=0;for(let i=0;i<pcm.length;i+=2){const value=pcm.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(value));sum+=value*value;if(Math.abs(value)>.999)clipped++;}
 return {durationMs:pcm.length/48,sampleRate,channels,bits,peak,rms:Math.sqrt(sum/(pcm.length/2)),clippedSamples:clipped};
};
function wav(pcm:Buffer){const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);}
function runFfmpeg(args:string[]){const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y',...args],{encoding:'utf8',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)throw new Error(`FFmpeg failed: ${result.stderr.slice(-1200)}`);}
type ShotRecord={id:string;lesson:number;shot:number;narration:string;title:string;source:MathematicsLesson['sources'];textSha256:string;fingerprint:string;rawSrc:string;src:string;rawSha256:string;sha256:string;rawDurationMs:number;speechDurationMs:number;durationMs:number;atempo:number;leadingSilenceMs:number;sampleRate:number;channels:number;peak:number;rms:number;clippedSamples:number};
const records=new Map<string,ShotRecord>(),failures:{id:string;error:string}[]=[];
const jobs=lessons.flatMap(lesson=>{if(lesson.film.length!==6)throw new Error(`Lesson ${lesson.number} must have six 15-second shots.`);return lesson.film.map((shot,index)=>{if(shot.from!==index*15||shot.to!==(index+1)*15)throw new Error(`Lesson ${lesson.number} shot timings must cover 0 to 90 seconds.`);return {lesson,shot,index};});});
let cursor=0;
async function makeShot(lesson:MathematicsLesson,shot:FilmShot,index:number){
 const id=`lesson-${pad(lesson.number)}-shot-${pad(index+1)}`,textSha256=hash(shot.narration),recordPath=join(cache,`${id}.json`),rawRecordPath=join(cache,`${id}-raw.json`),rawPath=join(cache,`${id}-original.wav`),targetPath=join(film,'shots',`${id}.wav`);
 try {const old=JSON.parse(await readFile(recordPath,'utf8')) as ShotRecord;const [raw,normalized]=await Promise.all([readFile(rawPath),readFile(targetPath)]);if(old.fingerprint===fingerprint&&old.textSha256===textSha256&&hash(raw)===old.rawSha256&&hash(normalized)===old.sha256&&waveform(normalized).durationMs===15000){records.set(id,old);console.log(`reuse ${id}`);return;}}catch{/* Invalid or stale caches are regenerated. */}
 let raw:Buffer|undefined;
 try {const old=JSON.parse(await readFile(rawRecordPath,'utf8'));const bytes=await readFile(rawPath);if(old.rawFingerprint===rawFingerprint&&old.textSha256===textSha256&&hash(bytes)===old.sha256)raw=bytes;}catch{}
 if(!raw&&recoverCurrentRaw){try{const bytes=await readFile(rawPath);waveform(bytes);raw=bytes;await writeFile(rawRecordPath,JSON.stringify({id,textSha256,rawFingerprint,sha256:hash(bytes),recoveredAfterNormalizationFailure:true},null,2)+'\n');console.log(`recover current-run raw ${id}`);}catch{}}
 if(!raw){
  for(let attempt=1;attempt<=3;attempt++){
   try {const chunks:Buffer[]=[];for await(const chunk of provider.synthesize(shot.narration,AbortSignal.timeout(120000),'default',{language,voice,model}))chunks.push(Buffer.from(chunk.audioBase64,'base64'));const pcm=Buffer.concat(chunks);if(pcm.length<4800||pcm.length%2)throw new Error('The provider returned missing or invalid narration.');raw=wav(pcm);await writeFile(rawPath,raw);await writeFile(rawRecordPath,JSON.stringify({id,textSha256,rawFingerprint,sha256:hash(raw)},null,2)+'\n');break;}
   catch(reason){console.log(`retry ${id} ${attempt}/3: ${safeError(reason)}`);if(attempt===3)throw reason;await new Promise(resolve=>setTimeout(resolve,attempt*2000));}
  }
 }
 if(!raw)throw new Error('No narration was produced.');
 const original=waveform(raw),atempo=Math.max(1,original.durationMs/13500);
 if(atempo>1.25)throw new Error(`Narration is ${(original.durationMs/1000).toFixed(2)} seconds and would need ${atempo.toFixed(3)}x speed. Shorten the authored narration before retrying.`);
 let spokenPcm=raw.subarray(44);
 if(atempo>1){const spedPath=join(cache,`${id}-spoken.pcm`);runFfmpeg(['-i',rawPath,'-af',`atempo=${atempo.toFixed(8)}`,'-ar','24000','-ac','1','-c:a','pcm_s16le','-f','s16le',spedPath]);spokenPcm=await readFile(spedPath);}
 if(spokenPcm.length>688800)throw new Error('Real speech would overrun the 15-second shot. No speech was truncated.');
 const exactPcm=Buffer.alloc(720000);spokenPcm.copy(exactPcm,31200);await writeFile(targetPath,wav(exactPcm));
 const normalized=await readFile(targetPath),check=waveform(normalized);
 if(check.durationMs!==15000||check.peak<.001||check.clippedSamples>20)throw new Error(`Invalid normalized audio: ${JSON.stringify(check)}`);
 const record:ShotRecord={id,lesson:lesson.number,shot:index+1,narration:shot.narration,title:shot.title,source:lesson.sources,textSha256,fingerprint,rawSrc:rawPath.slice(root.length).replaceAll('\\','/'),src:`/course-assets/international-mathematics/film/shots/${id}.wav`,rawSha256:hash(raw),sha256:hash(normalized),rawDurationMs:original.durationMs,speechDurationMs:spokenPcm.length/48,durationMs:15000,atempo,leadingSilenceMs:650,sampleRate:check.sampleRate,channels:check.channels,peak:check.peak,rms:check.rms,clippedSamples:check.clippedSamples};
 await writeFile(recordPath,JSON.stringify(record,null,2)+'\n');records.set(id,record);console.log(`generated ${id} ${(original.durationMs/1000).toFixed(2)}s → 15.00s, speech ${atempo.toFixed(3)}x`);
}
async function worker(){while(cursor<jobs.length){const job=jobs[cursor++]!;try{await makeShot(job.lesson,job.shot,job.index);}catch(reason){const id=`lesson-${pad(job.lesson.number)}-shot-${pad(job.index+1)}`;failures.push({id,error:safeError(reason)});console.log(`FAILED ${id}: ${safeError(reason)}`);}}}
await Promise.all([worker(),worker()]);
function cueChunks(text:string){const words=text.trim().split(/\s+/),chunks:string[]=[];let current='';for(const word of words){if(current&&(current+' '+word).length>78){chunks.push(current);current=word;}else current+=(current?' ':'')+word;if(current.length>=42&&/[.!?]$/.test(word)){chunks.push(current);current='';}}if(current)chunks.push(current);return chunks;}
function wrap(text:string){const lines:string[]=[];let line='';for(const word of text.split(' ')){if(line&&(line+' '+word).length>42){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);if(lines.length>2)throw new Error('Caption needs more than two lines.');return lines.join('\n');}
function time(ms:number,srt=false){ms=Math.round(ms);const hours=Math.floor(ms/3600000),minutes=Math.floor(ms/60000)%60,seconds=Math.floor(ms/1000)%60,millis=ms%1000;return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${srt?',':'.'}${String(millis).padStart(3,'0')}`;}
type LessonRecord={lesson:number;title:string;src:string;sha256:string;durationMs:number;vtt:string;srt:string;vttSha256:string;srtSha256:string;shots:ShotRecord[]};
const completed:LessonRecord[]=[];
for(const lesson of lessons){
 const shots=lesson.film.map((_,index)=>records.get(`lesson-${pad(lesson.number)}-shot-${pad(index+1)}`));
 if(shots.some(shot=>!shot))continue;
 const actual=shots as ShotRecord[],target=join(film,`lesson-${pad(lesson.number)}-intro.wav`);
 const shotPcm=await Promise.all(actual.map(async shot=>(await readFile(join(root,'apps','teacher-web','public',shot.src))).subarray(44)));
 await writeFile(target,wav(Buffer.concat(shotPcm)));
 const wavBytes=await readFile(target),properties=waveform(wavBytes);if(properties.durationMs!==90000)throw new Error(`Lesson ${lesson.number} is not exactly 90 seconds.`);
 const captions:{from:number;to:number;text:string}[]=[];
 for(const [index,shot]of actual.entries()){const chunks=cueChunks(shot.narration),weights=chunks.map(chunk=>chunk.split(/\s+/).length),total=weights.reduce((a,b)=>a+b,0);let start=index*15000+650;for(const [i,chunk]of chunks.entries()){const end=i===chunks.length-1?index*15000+650+shot.speechDurationMs:start+shot.speechDurationMs*weights[i]!/total;captions.push({from:start,to:end,text:wrap(chunk)});start=end;}}
 const srt=captions.map((cue,index)=>`${index+1}\n${time(cue.from,true)} --> ${time(cue.to,true)}\n${cue.text}\n`).join('\n'),vtt='WEBVTT\n\n'+captions.map(cue=>`${time(cue.from)} --> ${time(cue.to)}\n${cue.text}\n`).join('\n');
 const basename=`lesson-${pad(lesson.number)}-intro`;await Promise.all([writeFile(join(film,basename+'.srt'),srt,'utf8'),writeFile(join(film,basename+'.vtt'),vtt,'utf8')]);
 completed.push({lesson:lesson.number,title:lesson.filmTitle,src:`/course-assets/international-mathematics/film/${basename}.wav`,sha256:hash(wavBytes),durationMs:90000,vtt:`/course-assets/international-mathematics/film/${basename}.vtt`,srt:`/course-assets/international-mathematics/film/${basename}.srt`,vttSha256:hash(vtt),srtSha256:hash(srt),shots:actual});
 console.log(`assembled lesson ${pad(lesson.number)}: exactly 90.00s, ${captions.length} readable English cues`);
}
const manifestPath=join(output,'narration.json');let prior: {lessons?:LessonRecord[]}={};try{prior=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
const merged=new Map((prior.lessons??[]).map(record=>[record.lesson,record]));for(const record of completed)merged.set(record.lesson,record);
const sourceScript=fileURLToPath(import.meta.url),sourceSha256=hash(await readFile(sourceScript));
await writeFile(manifestPath,JSON.stringify({schema:'edu.international-mathematics.narration/1',createdAt:new Date().toISOString(),language,voice,model,fingerprint,workers:2,retries:3,leadingSilenceMs:650,normalization:'Real speech only. Modest speed adjustment when necessary; pad each shot to 15 seconds. Six shots concatenate to 90 seconds.',captionMethod:'Full authored narration; word-weighted timings aligned to normalized speech duration, up to two lines per cue.',sourceScript:'scripts/international-mathematics-audio.mts',sourceSha256,lessons:[...merged.values()].sort((a,b)=>a.lesson-b.lesson),failures},null,2)+'\n');
await writeFile(join(output,'narration.md'),['# English opening-film narration','',`Voice: ${voice}; model: ${model}. Captions are the full spoken narration.`,...INTERNATIONAL_MATHEMATICS_DEFINITIONS.flatMap(lesson=>['',`## Lesson ${lesson.number}: ${lesson.filmTitle}`,...lesson.film.flatMap(shot=>['',`### ${shot.from}–${shot.to} seconds: ${shot.title}`,shot.narration])])].join('\n')+'\n','utf8');
console.log(`${failures.length?'INCOMPLETE':'PASS'} ${completed.length}/${lessons.length} selected lessons; ${records.size}/${jobs.length} real narrated shots. Receipts: output/international-mathematics/narration.json`);
if(failures.length)process.exitCode=1;
