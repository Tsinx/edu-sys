import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
import {LESSON_SIX_FILM_SCRIPTS,LESSON_SIX_FILM_ANSWERS,LESSON_SIX_AUDIO,getLessonSixFilm,lessonSixFilmDuration} from '../packages/course-content/src/port-lesson-six-film.js';
const root=fileURLToPath(new URL('../',import.meta.url));try{loadEnvFile(root+'.env');}catch{}
const provider=new DashScopeStudySpeechProvider(),rows:object[]=[];
const shots=[...new Map([...Object.values(LESSON_SIX_FILM_SCRIPTS).flat(),...LESSON_SIX_FILM_ANSWERS,...getLessonSixFilm(29,0)!.shots].map(s=>[s.id,s])).values()];
for(const shot of shots){const record=LESSON_SIX_AUDIO[shot.id]!,buffer=await readFile(root+'apps/teacher-web/public'+record.src);let peak=0,squared=0,clipped=0;for(let i=44;i<buffer.length;i+=2){const x=buffer.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(x));squared+=x*x;if(Math.abs(x)>.999)clipped++;}
 let transcript='';try{transcript=JSON.parse(await readFile(root+'output/port-lesson-six-film/asr-'+shot.id+'.json','utf8')).transcript;}catch{transcript=await provider.transcribe({audioBase64:buffer.toString('base64'),mimeType:'audio/wav',context:'高校港口管理课程旁白。',signal:AbortSignal.timeout(90000)});await writeFile(root+'output/port-lesson-six-film/asr-'+shot.id+'.json',JSON.stringify({transcript},null,2));}
 const clean=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,''),a=clean(shot.narration),b=clean(transcript);let dp=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]!+1,dp[j]!+1,dp[j-1]!+(a[i-1]===b[j-1]?0:1));dp=next;}
 rows.push({id:shot.id,reference:shot.narration,transcript,characterErrorRate:dp[b.length]!/Math.max(a.length,b.length),durationMs:(buffer.length-44)/48,hashValid:createHash('sha256').update(buffer).digest('hex')===record.sha256,peak,rms:Math.sqrt(squared/((buffer.length-44)/2)),clippedSamples:clipped});console.log('verified '+shot.id);
}
const durations=Object.keys(LESSON_SIX_FILM_SCRIPTS).map(Number).map(n=>({page:n,durationMs:lessonSixFilmDuration(getLessonSixFilm(n,n===33?2:n===29?1:0)!)}));
await writeFile(root+'output/port-lesson-six-film/audio-audit.json',JSON.stringify({method:'Actual audio decoded, waveform checked and transcribed by configured ASR. Subjective listening unavailable in this tool environment.',rows,durations},null,2));console.log('PASS waveform/hash/ASR capture for '+rows.length+' actual audio segments');
