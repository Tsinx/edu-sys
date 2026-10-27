import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadEnvFile} from 'node:process';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
try{loadEnvFile('.env');}catch{}
const folder='apps/teacher-web/public/course-assets/port-management/investment-media',work='output/port-investment',file=folder+'/investment-opening.mp4',hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const edl=JSON.parse(await readFile(folder+'/edl.json','utf8'));assert.equal(hash(await readFile(file)),edl.outputSha256);
const probe=spawnSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'});assert.equal(probe.status,0);const metadata=JSON.parse(probe.stdout),v=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video');assert.equal(v.width,1280);assert.equal(v.height,800);assert.ok(Math.abs(Number(metadata.format.duration)-44)<.1);assert.ok(metadata.streams.some((s:{codec_type:string})=>s.codec_type==='audio'));
const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0);assert.equal(decode.stderr.trim(),'');
const volume=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-vn','-f','null','-'],{encoding:'utf8'}).stderr,maxDb=Number(volume.match(/max_volume: ([-\d.]+) dB/)?.[1]);assert.ok(Number.isFinite(maxDb)&&maxDb<-1);
const wav=work+'/verify.wav';assert.equal(spawnSync('ffmpeg',['-v','error','-y','-i',file,'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',wav]).status,0);const bytes=await readFile(wav),audioSha256=hash(bytes);
let cached:{audioSha256:string;transcript:string}|undefined;try{cached=JSON.parse(await readFile(work+'/opening-asr.json','utf8'));}catch{}
const provider=new DashScopeStudySpeechProvider(),transcript=cached?.audioSha256===audioSha256?cached.transcript:await provider.transcribe({audioBase64:bytes.toString('base64'),mimeType:'audio/wav',context:'请如实转写实际听到的中文课程旁白，不补写未听到的内容。',signal:AbortSignal.timeout(90000)});
assert.match(transcript,/扩建/);assert.match(transcript,/施工/);assert.match(transcript,/现金/);await writeFile(work+'/opening-asr.json',JSON.stringify({audioSha256,transcript},null,2));
for(const [i,time] of [3,12,24,37].entries())assert.equal(spawnSync('ffmpeg',['-v','error','-y','-ss',String(time),'-i',file,'-frames:v','1',work+'/final-shot-'+i+'.png']).status,0);
await writeFile(work+'/media-verification.json',JSON.stringify({duration:Number(metadata.format.duration),size:[v.width,v.height],decoded:true,videoSha256:edl.outputSha256,maxVolumeDb:maxDb,transcript,method:'Final video hash, full decode, metadata, audio headroom and unprompted complete-audio ASR; separate visual frame review. No classroom loudspeaker claim.'},null,2));console.log(JSON.stringify({decoded:true,maxDb,transcript}));
