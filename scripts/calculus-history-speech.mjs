/** Offline film narration. Uses the project's configured provider key in memory.
 * The existing classroom realtime route is not changed by this export tool.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const base = path.resolve('apps/teacher-web/public/course-assets/economic-mathematics/calculus-history');
const output = path.resolve('output/economic-mathematics/calculus-history-v2');
const cache = path.join(output, 'speech'); fs.mkdirSync(cache, {recursive:true});
const film = JSON.parse(fs.readFileSync(path.join(base, 'storyboard.json'), 'utf8'));
const environment = fs.existsSync('.env') ? parseEnv(fs.readFileSync('.env','utf8')) : {};
const key = process.env.DASHSCOPE_API_KEY || process.env.dashscope_api_key || environment.DASHSCOPE_API_KEY || environment.dashscope_api_key;
if(!key) throw Error('The project speech provider is not configured.');
const model = 'qwen3-tts-flash', voice = 'Ethan', sr = 48000;
const run = (cmd,args) => { const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:4e6}); if(r.status!==0)throw Error(r.stderr || String(r.error)); return r.stdout; };
const digest = s => createHash('sha256').update(s).digest('hex');
const mix = new Int16Array(film.duration * sr * 2), records = [];
for(const cue of film.narration) {
  const fingerprint = digest(JSON.stringify({model,voice,text:cue.text,language:'Chinese'}));
  const original = path.join(cache, `${cue.id}-${fingerprint.slice(0,12)}.wav`);
  if(!fs.existsSync(original)) {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,input:{text:cue.text,voice,language_type:'Chinese'}}), signal:AbortSignal.timeout(60000)
    });
    const json = await response.json();
    if(!response.ok || !json.output?.audio?.url) throw Error(`Narration ${cue.id} failed (${response.status}, ${json.code ?? 'missing audio'}).`);
    const audio = await fetch(json.output.audio.url.replace(/^http:/,'https:'), {signal:AbortSignal.timeout(60000)});
    if(!audio.ok) throw Error(`Narration ${cue.id} download failed.`);
    fs.writeFileSync(original, Buffer.from(await audio.arrayBuffer()));
  }
  const probe = JSON.parse(run('ffprobe',['-v','error','-show_format','-of','json',original]));
  const duration = Number(probe.format.duration), window = cue.to-cue.from-.12;
  const tempo = Math.max(1,duration/window);
  if(tempo>1.2) throw Error(`${cue.id} needs ${duration.toFixed(2)}s, exceeds its ${window.toFixed(2)}s window. Revise the script or timeline.`);
  const pcm = path.join(cache, cue.id+'.pcm');
  run('ffmpeg',['-v','error','-y','-i',original,'-af',`atempo=${tempo},afade=t=in:d=0.012,afade=t=out:st=${Math.max(0,duration/tempo-.04)}:d=0.04`,'-ar',String(sr),'-ac','2','-f','s16le',pcm]);
  const samples=fs.readFileSync(pcm), offset=Math.round(cue.from*sr)*2;
  if(offset+samples.length/2>mix.length) throw Error('Narration exceeds the film.');
  for(let i=0;i<samples.length/2;i++) mix[offset+i]=samples.readInt16LE(i*2);
  records.push({id:cue.id,from:cue.from,spokenEnd:cue.from+samples.length/(sr*4),captionUntil:cue.to,naturalSeconds:duration,tempo,fingerprint});
  console.log(`${cue.id}: ${duration.toFixed(2)}s, tempo ${tempo.toFixed(3)}`);
}
const wav=Buffer.alloc(44+mix.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(mix.length*2,40);
for(let i=0;i<mix.length;i++) wav.writeInt16LE(mix[i],44+i*2);
fs.writeFileSync(path.join(cache,'raw-narration.wav'),wav);
// Strong classroom audibility without the previous 500% playback boost.
run('ffmpeg',['-v','error','-y','-i',path.join(cache,'raw-narration.wav'),'-af','loudnorm=I=-17:TP=-2:LRA=7','-ar',String(sr),'-ac','1','-c:a','flac',path.join(base,'narration.flac')]);
fs.writeFileSync(path.join(output,'narration-timing.json'),JSON.stringify({model,voice,generatedFrom:'Original project script',cues:records},null,2)+'\n');
console.log('Saved full offline Chinese narration.');
