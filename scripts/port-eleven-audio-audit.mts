/** Waveform checks for every shot, plus actual speech recognition on three representative clips. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {loadEnvFile} from 'node:process';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
const root=fileURLToPath(new URL('../',import.meta.url));try{loadEnvFile(resolve(root,'.env'));}catch{}
const lesson=process.argv.includes('--lesson12')?12:11,documentary=process.argv.includes('--documentary'),output=documentary?`output/port-documentary-recut/l${lesson}`:`output/port-${lesson===12?'twelve':'eleven'}-media`;
const folder=resolve(root,output+'/speech'),film=JSON.parse(await readFile(resolve(root,`apps/teacher-web/public/course-assets/port-management/l${lesson}-media${documentary?'/documentary-v2':''}/storyboard.json`),'utf8'));
const files=await readdir(folder),provider=new DashScopeStudySpeechProvider(),rows=[];
for(const shot of film.shots){const file=files.find(n=>n.startsWith(shot.id+'-')&&n.endsWith('.wav'));if(!file)throw Error('Missing audio '+shot.id);const bytes=await readFile(resolve(folder,file));let peak=0,squared=0,clipped=0;
 for(let i=44;i<bytes.length;i+=2){const x=bytes.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(x));squared+=x*x;if(Math.abs(x)>.999)clipped++;}
 const rms=Math.sqrt(squared/((bytes.length-44)/2));if(rms<.005||clipped)throw Error('Silent/clipped narration '+shot.id);
 let transcript:string|undefined;
 if((lesson===12?['life','archive','question']:['mpa','clock','question']).includes(shot.id)){
  const cache=resolve(folder,'asr-'+shot.id+'.json');try{transcript=JSON.parse(await readFile(cache,'utf8')).transcript;}catch{transcript=await provider.transcribe({audioBase64:bytes.toString('base64'),mimeType:'audio/wav',context:'高校港口绩效课程中文旁白，语音校核。',signal:AbortSignal.timeout(90000)});await writeFile(cache,JSON.stringify({transcript},null,2));}
  if(!transcript||transcript.length<Math.min(15,Math.floor(shot.narration.length*.5)))throw Error('Speech recognition incomplete '+shot.id);
 }
 rows.push({id:shot.id,peak,rms,clippedSamples:clipped,...(transcript?{reference:shot.narration,transcript}:{})});
}
await writeFile(resolve(root,output+'/audio-audit.json'),JSON.stringify({method:'All original voice WAVs checked for silence/clipping. Three representative clips transcribed by configured ASR. Subjective listening and classroom speaker trial are not claimed.',rows},null,2));
console.log(JSON.stringify(rows.filter(r=>r.transcript),null,2));
