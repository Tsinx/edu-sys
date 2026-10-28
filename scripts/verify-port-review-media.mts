import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadEnvFile} from 'node:process';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
try{loadEnvFile('.env');}catch{}
const folder='apps/teacher-web/public/course-assets/port-management/review-media-v2',work='output/port-review-media',hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),provider=new DashScopeStudySpeechProvider(),results=[];
for(const edl of JSON.parse(await readFile(folder+'/edl.json','utf8'))){
 const stem='review'+edl.lesson+'-opening',file=folder+'/'+stem+'.mp4';assert.equal(hash(await readFile(file)),edl.outputSha256);
 const probe=spawnSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'});assert.equal(probe.status,0);const metadata=JSON.parse(probe.stdout),v=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video');assert.equal(v.width,1280);assert.equal(v.height,800);assert.ok(Math.abs(Number(metadata.format.duration)-32)<.1);assert.ok(metadata.streams.some((s:{codec_type:string})=>s.codec_type==='audio'));
 const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0);assert.equal(decode.stderr.trim(),'');
 const volume=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-vn','-f','null','-'],{encoding:'utf8'}).stderr,maxDb=Number(volume.match(/max_volume: ([-\d.]+) dB/)?.[1]);assert.ok(Number.isFinite(maxDb)&&maxDb<-1);
 const wav=work+'/'+stem+'-verify.wav';assert.equal(spawnSync('ffmpeg',['-v','error','-y','-i',file,'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',wav]).status,0);const bytes=await readFile(wav),audioSha256=hash(bytes);let saved:{audioSha256:string;transcript:string}|undefined;const asr=work+'/'+stem+'-asr.json';try{saved=JSON.parse(await readFile(asr,'utf8'));}catch{}
 const transcript=saved?.audioSha256===audioSha256?saved.transcript:await provider.transcribe({audioBase64:bytes.toString('base64'),mimeType:'audio/wav',context:'如实转写实际听到的中文旁白，不补写未听到的内容。',signal:AbortSignal.timeout(90000)});
 assert.match(transcript,edl.lesson===20?/交付/:/长期经营/);assert.match(transcript,edl.lesson===20?/恢复/:/条件/);await writeFile(asr,JSON.stringify({audioSha256,transcript},null,2));
 for(const [i,time] of [3,9,18,27].entries())assert.equal(spawnSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',file,'-frames:v','1',work+'/'+stem+'-shot-'+i+'.png']).status,0);
 results.push({lesson:edl.lesson,duration:Number(metadata.format.duration),size:[v.width,v.height],decoded:true,videoSha256:edl.outputSha256,maxVolumeDb:maxDb,transcript});console.log(JSON.stringify(results.at(-1)));
}
await writeFile(work+'/verification.json',JSON.stringify({method:'Final-file SHA256, complete decode, audio headroom and unprompted full-audio ASR; visual frames inspected separately. No classroom speaker trial claimed.',results},null,2));
