import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{/* Speech provider will report unavailable without credentials. */}
const provider=new DashScopeStudySpeechProvider(),dir='apps/teacher-web/public/course-assets/port-management/transition-media';
const edits=JSON.parse(await readFile(dir+'/edl.json','utf8')),records=[];
for(const e of edits){
 const path=dir+'/'+e.id+'.mp4',probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],{encoding:'utf8'});if(probe.status!==0)throw Error('ffprobe failed '+e.id);
 const metadata=JSON.parse(probe.stdout),decode=spawnSync('ffmpeg',['-v','error','-i',path,'-f','null','-'],{encoding:'utf8'});if(decode.status!==0||decode.stderr.trim())throw Error('Decode failed '+e.id+': '+decode.stderr);
 const wav='output/port-transition-media/'+e.id+'-spoken.wav',extract=spawnSync('ffmpeg',['-v','error','-y','-ss',String(e.intro),'-i',path,'-t',String(e.seconds),'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',wav],{encoding:'utf8'});if(extract.status!==0)throw Error('Audio extraction failed');
 const bytes=await readFile(wav),hash=createHash('sha256').update(bytes).digest('hex'),asr='output/port-transition-media/'+e.id+'-asr.json';let transcription;
 try{const saved=JSON.parse(await readFile(asr,'utf8'));if(saved.audioSha256===hash)transcription=saved.transcript;}catch{}
 if(!transcription){transcription=await provider.transcribe({audioBase64:bytes.toString('base64'),mimeType:'audio/wav',context:'请如实转写这段港口新闻，不补写没有听到的内容。',signal:AbortSignal.timeout(90000)});await writeFile(asr,JSON.stringify({audioSha256:hash,transcript:transcription},null,2)+'\n');}
 const waveform=spawnSync('ffmpeg',['-hide_banner','-ss',String(e.intro),'-i',path,'-t',String(e.seconds),'-vn','-af','volumedetect','-f','null','-'],{encoding:'utf8'}).stderr;
 const row={id:e.id,duration:Number(metadata.format.duration),width:metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video').width,height:metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video').height,audio:metadata.streams.some((s:{codec_type:string})=>s.codec_type==='audio'),decoded:true,hashValid:createHash('sha256').update(await readFile(path)).digest('hex')===e.outputSha256,meanDb:waveform.match(/mean_volume:\s*([^\n]+)/)?.[1],maxDb:waveform.match(/max_volume:\s*([^\n]+)/)?.[1],transcript:transcription};
 if(Math.abs(row.duration-e.duration)>.15||row.width!==1280||row.height!==800||!row.audio||!row.hashValid)throw Error('Metadata mismatch '+e.id);
 records.push(row);console.log(JSON.stringify(row));
}
await writeFile('output/port-transition-media/verification.json',JSON.stringify({method:'Full decode, metadata, SHA-256, waveform and unprompted ASR. No claim of subjective listening or classroom loudspeaker acceptance.',records},null,2)+'\n');
