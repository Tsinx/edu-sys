import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{}
const folder='apps/teacher-web/public/course-assets/port-management/queue-media',file=folder+'/queue-opening.mp4';
const edl=JSON.parse(await readFile(folder+'/edl.json','utf8'));
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
assert.equal(digest(await readFile(file)),edl.outputSha256);
const p=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'});
assert.equal(p.status,0);const metadata=JSON.parse(p.stdout),v=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video');
assert.equal(v.width,1280);assert.equal(v.height,800);assert.ok(Math.abs(Number(metadata.format.duration)-46)<.15);assert.ok(metadata.streams.some((s:{codec_type:string})=>s.codec_type==='audio'));
const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0);assert.equal(decode.stderr.trim(),'');
const wav='output/port-queue-media/final-spoken.wav';
assert.equal(spawnSync('ffmpeg',['-v','error','-y','-i',file,'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',wav]).status,0);
const bytes=await readFile(wav),audioSha256=digest(bytes),receipt='output/port-queue-media/asr-verification.json';
let saved:{audioSha256:string;transcript:string}|undefined;try{saved=JSON.parse(await readFile(receipt,'utf8'));}catch{}
const transcript=saved?.audioSha256===audioSha256?saved.transcript:await new DashScopeStudySpeechProvider().transcribe({audioBase64:bytes.toString('base64'),mimeType:'audio/wav',context:'请如实转写这段中文课程旁白，保留数字，不补写没有听到的内容。',signal:AbortSignal.timeout(90000)});
assert.match(transcript.replace(/\s/g,''),/99|九十九/);assert.match(transcript.replace(/\s/g,''),/100|一百/);
await writeFile(receipt,JSON.stringify({audioSha256,transcript,duration:Number(metadata.format.duration),decoded:true,videoSha256:edl.outputSha256,method:'Full decode, file hash, stream metadata, sampled frames and unprompted ASR. No claim of classroom loudspeaker or subjective listening acceptance.'},null,2)+'\n');
console.log(JSON.stringify({duration:Number(metadata.format.duration),decoded:true,width:v.width,height:v.height,transcript}));
