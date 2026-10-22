/** Inspect short source passages to choose complete spoken sentences at film boundaries. */
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));try{loadEnvFile('.env');}catch{}
const provider=new DashScopeStudySpeechProvider();
const ranges=[['smart',31,4],['smart',35,4],['smart',70,4],['smart',74,4],['green',84,4],['green',88,4],['green',108,4],['green',112,4]] as const;
const results=await Promise.all(ranges.map(async([id,start,seconds])=>{
 const wav=`output/port-transition-media/boundary-${id}-${start}.wav`,json=wav+'.json';
 const r=spawnSync('ffmpeg',['-v','error','-y','-ss',String(start),'-i',`output/port-transition-media/${id}.mp4`,'-t',String(seconds),'-vn','-ac','1','-ar','16000',wav],{encoding:'utf8'});if(r.status!==0)throw Error('Extraction failed');
 let transcript;try{transcript=JSON.parse(await readFile(json,'utf8')).transcript;}catch{}
 if(!transcript){transcript=await provider.transcribe({audioBase64:(await readFile(wav)).toString('base64'),mimeType:'audio/wav',context:'如实转写，不补充被截断的句子。',signal:AbortSignal.timeout(90000)});await writeFile(json,JSON.stringify({transcript}));}
 return {id,start,seconds,transcript};
}));
console.log(JSON.stringify(results));
