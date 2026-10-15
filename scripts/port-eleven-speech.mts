/** Offline narration from the existing configured classroom voice. Never writes credentials. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
const root=fileURLToPath(new URL('../',import.meta.url));
try{loadEnvFile(resolve(root,'.env'));}catch{}
const provider=new DashScopeStudySpeechProvider();
if(!provider.ttsConfigured)throw Error('Chinese classroom speech is not configured.');
const lesson=process.argv.includes('--lesson12')?12:11;
const documentary=process.argv.includes('--documentary');
const base=resolve(root,`apps/teacher-web/public/course-assets/port-management/l${lesson}-media${documentary?'/documentary-v2':''}`),out=resolve(root,documentary?`output/port-documentary-recut/l${lesson}/speech`:`output/port-${lesson===12?'twelve':'eleven'}-media/speech`);
await mkdir(out,{recursive:true});
const film=JSON.parse(await readFile(resolve(base,'storyboard.json'),'utf8'));
const records:any[]=[],digest=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const fingerprint=digest(JSON.stringify({model:process.env.EDU_SELFSTUDY_TTS_MODEL,voice:process.env.EDU_SELFSTUDY_TTS_VOICE_ID}));
function wav(pcm:Buffer){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
const run=(args:string[])=>{const r=spawnSync('ffmpeg',args,{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr||String(r.error));};
let cursor=0;
async function worker(){while(cursor<film.shots.length){const shot=film.shots[cursor++],hash=digest(shot.narration+fingerprint),file=resolve(out,shot.id+'-'+hash.slice(0,12)+'.wav');let bytes:Buffer;
 try{bytes=await readFile(file);}catch{let result:Buffer|undefined;for(let attempt=0;attempt<4;attempt++){try{const chunks:Buffer[]=[];for await(const c of provider.synthesize(shot.narration,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(c.audioBase64,'base64'));result=wav(Buffer.concat(chunks));break;}catch(error){if(attempt===3||!/rate limit|429|try again later/i.test(String(error)))throw error;await new Promise(done=>setTimeout(done,(attempt+1)*4000));}}if(!result)throw Error('Empty voice take');bytes=result;await writeFile(file,bytes);}
 // A very short full-scale plateau can occur in generated PCM. Preserve the original,
 // interpolate only isolated peaks, and reject sustained distortion instead of hiding it with gain.
 let waveformRepair:any;try{waveformRepair=JSON.parse(await readFile(file+'.repair.json','utf8'));}catch{}
 const peaks:number[]=[];for(let i=44;i<bytes.length;i+=2)if(Math.abs(bytes.readInt16LE(i))>=32735)peaks.push(i);
 if(peaks.length){if(peaks.length>(bytes.length-44)/2*.0002)throw Error('Excessive clipped voice requires a new take: '+shot.id);const originalHash=digest(bytes),originalFolder=resolve(out,'original-voice');await mkdir(originalFolder,{recursive:true});await writeFile(resolve(originalFolder,shot.id+'-'+originalHash.slice(0,12)+'.wav'),bytes);
  for(let k=0;k<peaks.length;){const first=peaks[k]!,start=first;let end=first;while(k+1<peaks.length&&peaks[k+1]===end+2){end=peaks[++k]!;}const count=(end-start)/2+1;if(count>16||start===44||end+2>=bytes.length)throw Error('Sustained clipped voice requires a new take: '+shot.id);const left=bytes.readInt16LE(start-2),right=bytes.readInt16LE(end+2);for(let j=0;j<count;j++)bytes.writeInt16LE(Math.round(left+(right-left)*(j+1)/(count+1)),start+j*2);k++;}
  waveformRepair={method:'linear interpolation of isolated near-full-scale PCM peaks',samples:peaks.length,originalSha256:originalHash};await writeFile(file,bytes);await writeFile(file+'.repair.json',JSON.stringify(waveformRepair,null,2));
 }
 const natural=(bytes.length-44)/48000,window=shot.to-shot.from-1,tempo=Math.max(1,natural/window);
 if(tempo>(documentary?1.12:1.25))throw Error(`${shot.id}: narration ${natural.toFixed(2)}s exceeds ${window.toFixed(2)}s window. Revise script.`);
 const pcm=resolve(out,shot.id+'.pcm');run(['-v','error','-y','-i',file,'-af',`atempo=${tempo},afade=t=in:d=0.015,afade=t=out:st=${Math.max(0,natural/tempo-.06)}:d=0.06`,'-ar','24000','-ac','1','-f','s16le',pcm]);
 records.push({id:shot.id,from:shot.from+.5,spokenEnd:shot.from+.5+natural/tempo,naturalSeconds:natural,tempo,sha256:digest(bytes),...(waveformRepair?{waveformRepair}:{}),file:pcm});console.log(`${shot.id}: ${natural.toFixed(2)}s / tempo ${tempo.toFixed(3)}`);
}}
await Promise.all(documentary?[worker()]:[worker(),worker()]);
const pcm=Buffer.alloc(film.duration*48000);for(const r of records){const data=await readFile(r.file);if(Math.round(r.from*48000)+data.length>pcm.length)throw Error('Audio overflow');data.copy(pcm,Math.round(r.from*24000)*2);}
await writeFile(resolve(out,'narration.wav'),wav(pcm));
run(['-v','error','-y','-i',resolve(out,'narration.wav'),'-af','loudnorm=I=-17:TP=-2:LRA=7','-ar','48000','-ac','1','-c:a','flac',resolve(base,'narration.flac')]);
const voiceTiming=JSON.stringify({voice:'existing classroom default',fingerprint,records:records.sort((a,b)=>a.from-b.from).map(({file,...r})=>r)},null,2);
await writeFile(resolve(out,'timing.json'),voiceTiming);
if(documentary)await writeFile(resolve(base,'voice-timing.json'),voiceTiming);
console.log(`PASS: all ${film.shots.length} Chinese narration passages fit their edit windows.`);
