/** Build/export/package the ONE MORE prelude without external browser automation.
 * Run the local exporter, open its URL in a browser, and click Render frames.
 * Every preview and encoded frame uses the same public animation.js file.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const repoAssets = 'apps/teacher-web/public/course-assets/international-mathematics/prelude';
const dirArg = process.argv.indexOf('--dir');
const assets = path.resolve(dirArg >= 0 ? process.argv[dirArg + 1] : fs.existsSync(repoAssets) ? repoAssets : '.');
const inRepo = fs.existsSync(repoAssets) && path.resolve(repoAssets) === assets;
const output = path.resolve(inRepo ? 'output/international-mathematics/kinetic-prelude-v1' : '.export');
const cache = path.join(output, 'render');
fs.mkdirSync(cache, { recursive: true });
const animationModule = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(assets, 'animation.js'), 'utf8'), { module: animationModule });
const api = animationModule.exports;
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 5 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${cmd}: ${result.stderr || result.error}`);
  return result.stdout;
};
const mode = process.argv[2] ?? 'help';
function wav(samples, sampleRate) {
  const file = Buffer.alloc(44 + samples.length * 2);
  file.write('RIFF', 0); file.writeUInt32LE(file.length - 8, 4); file.write('WAVEfmt ', 8);
  file.writeUInt32LE(16, 16); file.writeUInt16LE(1, 20); file.writeUInt16LE(2, 22);
  file.writeUInt32LE(sampleRate, 24); file.writeUInt32LE(sampleRate * 4, 28);
  file.writeUInt16LE(4, 32); file.writeUInt16LE(16, 34); file.write('data', 36);
  file.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) file.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return file;
}
function score() {
  const sr = 48000, frames = api.DURATION * sr, mix = new Float64Array(frames * 2);
  let seed = 22026;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
  const add = (time, duration, synth, gain, pan = 0) => {
    const start = Math.round(time * sr), count = Math.min(Math.round(duration * sr), frames - start);
    const l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
    for (let i = 0; i < count; i++) { const s = synth(i / sr, i / count) * gain; mix[(start + i) * 2] += s * l; mix[(start + i) * 2 + 1] += s * r; }
  };
  const tone = f => (t, p) => (Math.sin(2 * Math.PI * f * t) + 0.23 * Math.sin(2 * Math.PI * f * 2 * t)) * Math.min(1, t / 0.012) * Math.exp(-p * 5);
  const bass = [65.406, 51.913, 77.782, 58.270];
  const chords = [[130.813,155.563,195.998],[103.826,130.813,155.563],[155.563,195.998,233.082],[116.541,146.832,174.614]];
  for (let bar = 0; bar < 18; bar++) {
    const at = bar * 2, c = chords[Math.floor(bar / 2) % 4];
    // Slow harmonic bed: breaths at phrase boundaries, no sampled or borrowed music.
    c.forEach((f, i) => add(at, Math.min(3.8, 36 - at), (t, p) => {
      const envelope = Math.sin(Math.PI * p) ** 1.6;
      return (Math.sin(2 * Math.PI * f * t) + .4 * Math.sin(2 * Math.PI * f * 1.002 * t)) * envelope;
    }, at < 28 ? .033 : .045, (i - 1) * .45));
    if (at >= 28) continue;
    for (let beat = 0; beat < 4; beat++) {
      const time = at + beat * .5;
      if (beat === 0 || beat === 2) add(time, .22, (t, p) => Math.sin(2 * Math.PI * (47 * t + 7 * (1 - Math.exp(-t * 27)))) * Math.exp(-p * 9), .29);
      if (beat === 1 || beat === 3) add(time, .14, (t, p) => (.62 * random() + .38 * Math.sin(2 * Math.PI * 185 * t)) * Math.exp(-p * 10) * Math.min(1,t/.002), .082, .05);
      add(time, .038, (t, p) => random() * Math.exp(-p * 8) * Math.min(1,t/.001), .037, -.22);
      if (at >= 8) add(time + .25, .029, (t,p) => random() * Math.exp(-p * 11), .019, .28);
      if (beat === 0 || (at >= 8 && beat === 2)) add(time, .42, tone(bass[Math.floor(bar / 2) % 4]), .16);
    }
    if (bar % 2 === 1) {
      [0, .75, 1.5].forEach((offset, i) => add(at + offset, .65, tone([391.995,466.164,523.251][i]), .045, [-.4,.35,-.1][i]));
    }
  }
  for (const time of [0, 2, 4, 5.25, 6.5, 8, 12, 16.5, 18, 24, 28]) {
    add(Math.max(0,time - .10), .27, (t,p) => random() * Math.sin(Math.PI * p) ** 3 + .22 * Math.sin(2 * Math.PI * (430 * t - 200 * t * t)) * Math.exp(-p * 8), .036, time % 4 ? -.2 : .2);
  }
  let peak = 0, sum = 0;
  for (let i = 0; i < mix.length; i++) {
    const t = Math.floor(i / 2) / sr;
    const fade = Math.min(1, t / .018, Math.max(0, (36 - t) / 1.8));
    mix[i] = Math.tanh(mix[i] * 1.7) * .79 * fade;
    peak = Math.max(peak, Math.abs(mix[i])); sum += mix[i] ** 2;
  }
  const normalizationGain = .82 / peak;
  for (let i = 0; i < mix.length; i++) mix[i] *= normalizationGain;
  peak *= normalizationGain; sum *= normalizationGain ** 2;
  fs.writeFileSync(path.join(assets, 'score.wav'), wav(mix, sr));
  fs.writeFileSync(path.join(output, 'score.json'), JSON.stringify({ durationSeconds:36,sampleRate:sr,channels:2,tempoBpm:120,peak,peakDb:20*Math.log10(peak),rmsDb:20*Math.log10(Math.sqrt(sum/mix.length)),normalizationGain,provenance:'Original deterministic additive synthesis and seeded percussion; no external music or samples.',sha256:hash(path.join(assets,'score.wav')) },null,2)+'\n');
  console.log('Original 36-second stereo score generated.');
}
function captions() {
  const cues = [
    [0,2,'ONE.'],[2,4,'MORE.'],[4,5.25,'PRICE.'],[5.25,6.5,'COST.'],[6.5,8,'PROFIT.'],
    [8,12,'Every decision has a curve.'],[12,16.5,'How fast? Average rate of change.'],[16.5,18,'The local rate: derivative.'],
    [18,24,'How much? Accumulated total: integral.'],[24,28,'Calculus: change + accumulation.'],
    [28,36,'Higher Mathematics: Calculus for Economics and Business.\nWhen does one more stop being worth it?']
  ];
  const stamp = (n,separator) => { const ms = Math.round(n*1000);return `00:00:${String(Math.floor(ms/1000)).padStart(2,'0')}${separator}${String(ms%1000).padStart(3,'0')}`; };
  fs.writeFileSync(path.join(assets,'one-more.vtt'),'WEBVTT\n\n'+cues.map(c=>`${stamp(c[0],'.')} --> ${stamp(c[1],'.')}\n${c[2]}\n`).join('\n'));
  fs.writeFileSync(path.join(assets,'one-more.srt'),cues.map((c,i)=>`${i+1}\n${stamp(c[0],',')} --> ${stamp(c[1],',')}\n${c[2]}\n`).join('\n'));
  fs.writeFileSync(path.join(assets,'storyboard.json'),JSON.stringify({title:'ONE MORE',durationSeconds:36,width:1920,height:1200,fps:30,tempoBpm:120,language:'en',music:'score.wav',narration:null,shots:api.shots,captions:cues.map(([from,to,text])=>({from,to,text})),models:{profit:'P(q) = 40q − q² USD, 0 ≤ q ≤ 40 items',finiteRate:'[P(10+h) − P(10)] / h, h > 0; limit P′(10) = 20 USD/item',cashFlow:'r(t) = 10 + 2t USD/hour, 0 ≤ t ≤ 6 hours',accumulatedTotal:'Integral from 0 to 6 of r(t) dt, measured in USD; no result revealed in the film.'}},null,2)+'\n');
}
function validateIVF() {
  const file = fs.readFileSync(path.join(cache,'frames.ivf'));
  if (file.toString('ascii',0,4)!=='DKIF'||file.toString('ascii',8,12)!=='VP90'||file.readUInt16LE(12)!==1920||file.readUInt16LE(14)!==1200) throw Error('Invalid IVF dimensions or codec.');
  let offset=32,count=0;
  while(offset<file.length){if(offset+12>file.length)throw Error('Truncated frame header.');const size=file.readUInt32LE(offset);const stamp=file.readBigUInt64LE(offset+4);if(stamp!==BigInt(count))throw Error(`Frame timestamp ${count}: ${stamp}`);offset+=12+size;count++;}
  if(offset!==file.length||count!==1080||file.readUInt32LE(24)!==1080)throw Error(`Invalid frame count: ${count}`);
  return count;
}
function validateBounds() {
  const records=JSON.parse(fs.readFileSync(path.join(cache,'frame-bounds.json'),'utf8'));
  if(records.length!==1080)throw Error('Missing frame bounds.');
  const failures=[];let boxes=0;
  for(const record of records)for(const b of record.bounds){boxes++;if(!Object.values(b).filter(v=>typeof v==='number').every(Number.isFinite)||b.x<0||b.y<0||b.x+b.width>1600.01||b.y+b.height>1000.01)failures.push({time:record.time,...b});}
  if(failures.length){fs.writeFileSync(path.join(output,'bounds-failures.json'),JSON.stringify(failures,null,2));throw Error(`${failures.length} essential text boxes exceed the logical canvas.`);}
  return {frames:records.length,essentialTextBoxes:boxes,overflow:0,shots:[...new Set(records.map(r=>r.shot))]};
}
function mux() {
  validateIVF();validateBounds();
  run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(cache,'frames.ivf'),'-i',path.join(assets,'score.wav'),'-c:v','libx264','-threads','4','-preset','slow','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-t','36','-movflags','+faststart',path.join(assets,'one-more.mp4')]);
  run('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','30','-i',path.join(assets,'one-more.mp4'),'-frames:v','1',path.join(assets,'poster.png')]);
  console.log('Encoded 1920×1200 H.264/AAC MP4.');
}
function verify() {
  const file=path.join(assets,'one-more.mp4');
  const probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]));
  const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
  if(video.codec_name!=='h264'||video.width!==1920||video.height!==1200||video.avg_frame_rate!=='30/1'||Number(video.nb_read_frames)!==1080||audio.codec_name!=='aac'||Number(probe.format.duration)!==36)throw Error('Media metadata does not match delivery specification.');
  run('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-f','null','-']);
  const audit={film:{file:'one-more.mp4',codec:video.codec_name,width:video.width,height:video.height,fps:video.avg_frame_rate,frames:Number(video.nb_read_frames),durationSeconds:Number(probe.format.duration),audioCodec:audio.codec_name,channels:audio.channels,sampleRate:Number(audio.sample_rate),sha256:hash(file)},fullDecode:'pass',bounds:validateBounds(),score:JSON.parse(fs.readFileSync(path.join(output,'score.json'),'utf8')),actualProjectionAndHumanListening:'Separate acceptance; not established by automated checks.'};
  fs.writeFileSync(path.join(output,'media-qa.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit.film));
}
function contact() {
  const frames=[30,90,141,177,219,321,396,516,594,696,795,930];
  const selection=frames.map(n=>`eq(n\\,${n})`).join('+');
  run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(assets,'one-more.mp4'),'-vf',`select=${selection},scale=640:400,tile=4x3`,'-frames:v','1',path.join(output,'contact-sheet.png')]);
  console.log('Exported contact sheet from the final MP4.');
}
async function serve() {
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.ttf':'font/ttf','.wav':'audio/wav','.mp4':'video/mp4','.png':'image/png','.vtt':'text/vtt; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8'};
  const server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://127.0.0.1:5195');
      if(req.method==='POST'&&['/render/frames','/render/audit'].includes(url.pathname)){
        if(req.headers.origin!=='http://127.0.0.1:5195') {res.writeHead(403);res.end();return;}
        const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>150*1024*1024)throw Error('Export exceeds 150 MiB.');chunks.push(chunk);}
        const data=Buffer.concat(chunks);fs.writeFileSync(path.join(cache,url.pathname.endsWith('frames')?'frames.ivf':'frame-bounds.json'),data);
        res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({bytes}));return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
      const resolved=path.resolve(assets,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!resolved.startsWith(assets+path.sep)){res.writeHead(403);res.end();return;}
      if(!fs.existsSync(resolved)||!fs.statSync(resolved).isFile()){res.writeHead(404);res.end('Not found');return;}
      const size=fs.statSync(resolved).size, range=req.headers.range;let start=0,end=size-1,status=200;
      if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416);res.end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;if(start>end){res.writeHead(416);res.end();return;}status=206;}
      const headers={'Content-Type':types[path.extname(resolved)]??'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache'};
      if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
      res.writeHead(status,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(resolved,{start,end}).pipe(res);
    }catch(error){if(!res.headersSent)res.writeHead(500);res.end(String(error));}
  });
  server.listen(5195,'127.0.0.1',()=>console.log('Local renderer: http://127.0.0.1:5195/?export=1'));
}
function filesUnder(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?filesUnder(path.join(dir,e.name)):[path.join(dir,e.name)]); }
function pack() {
  const release=path.join(output,'release');fs.mkdirSync(release,{recursive:true});
  // A standalone re-export writes below .export; never recursively copy it into itself.
  for(const entry of fs.readdirSync(assets,{withFileTypes:true})){
    if(entry.name==='.export')continue;
    fs.cpSync(path.join(assets,entry.name),path.join(release,entry.name),{recursive:true});
  }
  fs.mkdirSync(path.join(release,'tools'),{recursive:true});fs.copyFileSync(new URL(import.meta.url),path.join(release,'tools','export.mjs'));
  fs.copyFileSync(path.join(output,'media-qa.json'),path.join(release,'media-qa.json'));
  fs.copyFileSync(path.join(output,'score.json'),path.join(release,'score.json'));
  for(const name of ['browser-qa.json','contact-sheet.png'])if(fs.existsSync(path.join(output,name)))fs.copyFileSync(path.join(output,name),path.join(release,name));
  const files=filesUnder(release).filter(f=>path.relative(release,f)!=='manifest.json').map(f=>({path:path.relative(release,f).replaceAll('\\','/'),bytes:fs.statSync(f).size,sha256:hash(f)}));
  fs.writeFileSync(path.join(release,'manifest.json'),JSON.stringify({release:'kinetic-prelude-v1',courseId:'course-international-mathematics',files},null,2)+'\n');
  console.log(`Packaged ${files.length} files at ${release}. Create the ZIP with Python zipfile or PowerShell Compress-Archive.`);
}
if(mode==='prepare'){score();captions();}
else if(mode==='serve')await serve();
else if(mode==='mux')mux();
else if(mode==='verify')verify();
else if(mode==='contact')contact();
else if(mode==='package')pack();
else console.log('Commands: prepare | serve | mux | verify | contact | package. Optional: --dir path/to/prelude. Requires Node.js and FFmpeg.');
