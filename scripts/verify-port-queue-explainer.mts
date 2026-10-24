import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{}
const folder='apps/teacher-web/public/course-assets/port-management/queue-media',work='output/port-queue-explainer';
await mkdir(work,{recursive:true});
const file=folder+'/queue-explainer.mp4',edl=JSON.parse(await readFile(folder+'/queue-explainer-edl.json','utf8'));
const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(await readFile(file)),edl.videoSha256);
const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'});
assert.equal(probe.status,0);const metadata=JSON.parse(probe.stdout),video=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video');
assert.equal(video.width,1600);assert.equal(video.height,1000);assert.ok(Math.abs(Number(metadata.format.duration)-edl.duration)<.1);
assert.equal(video.codec_name,'h264');assert.ok(metadata.streams.some((s:{codec_type:string})=>s.codec_type==='audio'&&s.codec_name==='aac'));
const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0);assert.equal(decode.stderr.trim(),'');
const levels=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-vn','-f','null','-'],{encoding:'utf8'});
assert.equal(levels.status,0);const maxVolume=Number(levels.stderr.match(/max_volume: ([-\d.]+) dB/)?.[1]);assert.ok(Number.isFinite(maxVolume)&&maxVolume<-1,'Narration must have headroom');
const boundaries=[0,...[3,5,7,9].map(index=>edl.shots[index].from),edl.duration],provider=new DashScopeStudySpeechProvider(),parts=[];
for(let i=0;i<boundaries.length-1;i++){
 const wav=work+'/verify-'+i+'.wav',from=boundaries[i]!,duration=boundaries[i+1]!-from;
 assert.equal(spawnSync('ffmpeg',['-v','error','-y','-ss',String(from),'-i',file,'-t',String(duration),'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',wav]).status,0);
 const bytes=await readFile(wav),audioSha256=digest(bytes),cache=work+'/asr-'+i+'.json';
 let saved:{audioSha256:string;transcript:string}|undefined;try{saved=JSON.parse(await readFile(cache,'utf8'));}catch{}
 const transcript=saved?.audioSha256===audioSha256?saved.transcript:await provider.transcribe({audioBase64:bytes.toString('base64'),mimeType:'audio/wav',context:'请如实转写这段中文教学旁白，保留数字，不补写未听到的内容。',signal:AbortSignal.timeout(90000)});
 const part={from,duration,audioSha256,transcript};await writeFile(cache,JSON.stringify(part,null,2)+'\n');parts.push(part);console.log(`Transcribed actual output ${i+1}/${boundaries.length-1}`);
}
const transcript=parts.map(p=>p.transcript).join('\n');
assert.match(transcript,/空闲/);assert.match(transcript,/先到先服务/);assert.match(transcript,/一分钟|1分钟/);assert.match(transcript,/第三|第3/);
await writeFile(work+'/verification.json',JSON.stringify({videoSha256:edl.videoSha256,duration:Number(metadata.format.duration),size:[video.width,video.height],decoded:true,maxVolumeDb:maxVolume,parts,method:'Final-file hash, full decode, audio headroom, all-scene frame review, unprompted ASR of the complete released audio in scene-aligned parts. Caption times use character weights; no forced word alignment or classroom loudspeaker claim.'},null,2)+'\n');
console.log(JSON.stringify({duration:Number(metadata.format.duration),decoded:true,maxVolumeDb:maxVolume,transcript}));
