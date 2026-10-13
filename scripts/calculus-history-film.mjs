/** Original educational film pipeline. No external browser automation.
 * prepare | serve | mux [--sample] | verify | contact | package
 * --dir <film source folder> --output <build folder> also support the standalone package.
 * Preview/export: open http://127.0.0.1:5198/?export=1 and click the export button.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const argumentsList=process.argv.slice(2);
const option=name=>{const i=argumentsList.indexOf(name);if(i<0)return undefined;const value=argumentsList[i+1];if(!value||value.startsWith('--'))throw Error(`Missing value for ${name}.`);return value;};
const base=path.resolve(option('--dir')||'apps/teacher-web/public/course-assets/economic-mathematics/calculus-history');
const output=path.resolve(option('--output')||'output/economic-mathematics/calculus-history-v2');
const cache=path.join(output,'render');fs.mkdirSync(cache,{recursive:true});
const film=JSON.parse(fs.readFileSync(path.join(base,'storyboard.json'),'utf8'));
const mode=process.argv[2],sample=process.argv.includes('--sample'),prefix=sample?'sample-':'',duration=sample?15:film.duration;
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:8e6});if(r.status!==0)throw Error(r.stderr||String(r.error));return r.stdout;};
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function score(){
  const sr=48000,total=film.duration*sr,mix=new Float32Array(total*2);let seed=100102026;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296*2-1;};
  const hz=n=>440*2**((n-69)/12);
  const add=(at,len,synth,gain,pan=0)=>{const start=Math.round(at*sr),count=Math.min(Math.round(len*sr),total-start);if(start<0)return;const l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);for(let i=0;i<count;i++){const s=synth(i/sr,i/count)*gain;mix[(start+i)*2]+=s*l;mix[(start+i)*2+1]+=s*r;}};
  const pluck=f=>(t,p)=>(Math.sin(2*Math.PI*f*t)+.18*Math.sin(4*Math.PI*f*t))*Math.min(1,t/.006)*Math.exp(-p*6);
  const chords=[[48,55,62,63],[44,51,58,60],[46,53,60,62],[51,58,65,67]];
  const guaranteeFrom=film.chapters.find(c=>c.id==='guarantee').from;
  for(let bar=0;bar<Math.ceil(film.duration/2.5);bar++){
    const at=bar*2.5,chord=chords[Math.floor(bar/4)%4];
    const tension=at>=57&&at<79,clear=at>=guaranteeFrom,space=at>=79&&at<97;
    chord.forEach((n,i)=>add(at,Math.min(4.9,film.duration-at),(t,p)=>(Math.sin(TAU*hz(n)*t)+.22*Math.sin(TAU*hz(n)*1.003*t))*Math.sin(Math.PI*p)**1.7,.027,(i-1.5)/2));
    for(let beat=0;beat<4;beat++){
      const time=at+beat*.625;
      if(!space&&beat%2===0)add(time,.42,(t,p)=>Math.sin(TAU*(43*t+5*(1-Math.exp(-t*28))))*Math.exp(-p*8),.17);
      if(tension||clear)add(time+.3125,.075,(t,p)=>random()*Math.exp(-p*10),.014,beat%2?.4:-.4);
      const note=chord[[0,2,1,3][beat]]+12;
      if(beat%2===0||clear)add(time,.95,pluck(hz(note)),space?.045:.032,Math.sin(time*.13)*.6);
      if(tension&&beat===3)add(time,1.4,(t,p)=>Math.sin(TAU*(140*t+30*t*t))*Math.sin(Math.PI*p)**2,.024);
    }
  }
  const accents=[...film.chapters.slice(1).map(c=>c.from),...film.chapters.find(c=>c.id==='crises').segments.slice(1).map(c=>c.from)].sort((a,b)=>a-b);
  for(const at of accents){
    add(at-.35,.65,(t,p)=>random()*Math.sin(Math.PI*p)**4,.05,-.15);
    add(at,.65,(t,p)=>Math.sin(TAU*(38*t+5*(1-Math.exp(-t*36))))*Math.exp(-p*8),.26);
    add(at+.02,1.2,pluck(hz(at===guaranteeFrom?79:72)),.052,.25);
  }
  let peak=0;for(const n of mix)peak=Math.max(peak,Math.abs(n));const gain=.78/peak;
  const bytes=Buffer.alloc(44+mix.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(sr,24);bytes.writeUInt32LE(sr*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(mix.length*2,40);
  for(let i=0;i<mix.length;i++){
    const t=i/2/sr,active=film.narration.some(c=>t>=c.from-.2&&t<c.to+.15),duck=active?.19:.54;
    const v=mix[i]*gain*duck*Math.min(1,t/.05,(film.duration-t)/2);
    bytes.writeInt16LE(Math.round(v*32767),44+i*2);
  }
  fs.writeFileSync(path.join(output,'score.wav'),bytes);
  run('ffmpeg',['-v','error','-y','-i',path.join(output,'score.wav'),'-c:a','flac',path.join(base,'score.flac')]);
  fs.writeFileSync(path.join(output,'score.json'),JSON.stringify({seconds:film.duration,sampleRate:sr,channels:2,tempoBpm:96,accents,original:'Seeded additive synthesis and percussion. No external musical samples.',ducking:'Music is attenuated throughout all narration/caption windows.',sha256:sha(path.join(base,'score.flac'))},null,2)+'\n');
}
const TAU=Math.PI*2;
function prepare(){
  const publicData={title:film.title,subtitle:film.subtitle,duration:film.duration,fps:film.fps,chapters:film.chapters.map(({id,from,to,title,segments})=>({id,from,to,title,...(segments?{segments:segments.map(({id,from,to,title})=>({id,from,to,title}))}:{})})),narration:film.narration.map(({id,from,to,caption})=>({id,from,to,caption}))};
  fs.writeFileSync(path.join(base,'data.js'),'window.CalculusFilmData = '+JSON.stringify(publicData,null,2)+';\n');
  score();
  if(!fs.existsSync(path.join(base,'narration.flac')))throw Error('Run calculus-history-speech.mjs first.');
  const filters='[0:a]volume=1.0[a];[1:a]volume=1.0[b];[a][b]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8';
  run('ffmpeg',['-v','error','-y','-i',path.join(base,'narration.flac'),'-i',path.join(base,'score.flac'),'-filter_complex',filters,'-t',String(film.duration),'-ar','48000','-ac','2','-c:a','aac','-b:a','192k',path.join(base,'soundtrack.m4a')]);
  const stamp=(n,sep)=>{const ms=Math.round(n*1000);return`${Math.floor(ms/3600000).toString().padStart(2,'0')}:${Math.floor(ms/60000%60).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}${sep}${(ms%1000).toString().padStart(3,'0')}`;};
  const captions=sep=>film.narration.map((n,i)=>`${i+1}\n${stamp(n.from,sep)} --> ${stamp(n.to,sep)}\n${n.caption}\n`).join('\n');
  fs.writeFileSync(path.join(base,'captions.srt'),captions(','));fs.writeFileSync(path.join(base,'captions.vtt'),'WEBVTT\n\n'+captions('.'));
  console.log('Prepared shared timeline, original score, offline narration mix and captions.');
}
function validateFrames(){
  const f=fs.readFileSync(path.join(cache,prefix+'frames.ivf'));let at=32,count=0;
  if(f.toString('ascii',0,4)!=='DKIF'||f.toString('ascii',8,12)!=='VP90'||f.readUInt16LE(12)!==1920||f.readUInt16LE(14)!==1200||f.readUInt32LE(16)!==60)throw Error('Unexpected intermediate video format.');
  while(at<f.length){if(at+12>f.length||f.readBigUInt64LE(at+4)!==BigInt(count))throw Error('Incomplete or out-of-order frame.');at+=12+f.readUInt32LE(at);count++;}
  if(at!==f.length||count!==duration*60||f.readUInt32LE(24)!==count)throw Error('Unexpected frame count.');
  const records=JSON.parse(fs.readFileSync(path.join(cache,prefix+'audit.json'),'utf8')),overflow=[];
  if(records.length!==count)throw Error('Missing frame records.');
  for(const r of records)for(const b of r.bounds){if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.x<-.5||b.y<-.5||b.x+b.width>1600.5||b.y+b.height>1000.5)overflow.push({time:r.time,...b});}
  fs.writeFileSync(path.join(output,prefix+'overflow.json'),JSON.stringify(overflow.slice(0,30),null,2)+'\n');
  if(overflow.length)throw Error(`Text overflows in ${overflow.length} frame records. See overflow.json.`);
  return{frames:count,textOverflow:0,shots:[...new Set(records.map(r=>r.shot))]};
}
function mux(){
  const audit=validateFrames(),name=sample?'sample.mp4':'calculus-history.mp4',args=['-v','error','-y','-i',path.join(cache,prefix+'frames.ivf')];
  if(!sample)args.push('-i',path.join(base,'soundtrack.m4a'));
  args.push('-c:v','libx264','-threads','4','-preset','slow','-crf','19','-maxrate','4500k','-bufsize','9000k','-pix_fmt','yuv420p','-r','60');
  if(!sample)args.push('-c:a','copy');
  args.push('-t',String(duration),'-movflags','+faststart',path.join(sample?output:base,name));run('ffmpeg',args);
  if(!sample)run('ffmpeg',['-v','error','-y','-ss','2.7','-i',path.join(base,name),'-frames:v','1',path.join(base,'poster.png')]);
  console.log(`Muxed ${name}: ${audit.frames} frames.`);
}
function verify(){
  const file=path.join(sample?output:base,sample?'sample.mp4':'calculus-history.mp4'),probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]));
  const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
  if(v.width!==1920||v.height!==1200||v.avg_frame_rate!=='60/1'||+v.nb_read_frames!==duration*60||Math.abs(+probe.format.duration-duration)>.01||v.codec_name!=='h264'||(!sample&&(!a||a.codec_name!=='aac'||a.channels!==2)))throw Error('Final media does not match the film specification.');
  run('ffmpeg',['-v','error','-i',file,'-f','null','-']);
  let loudness=null;
  if(!sample){const r=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json','-vn','-f','null','-'],{encoding:'utf8',windowsHide:true,maxBuffer:4e6});if(r.status!==0)throw Error('Audio verification failed.');const matches=r.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);loudness=JSON.parse(matches.at(-1));if(+loudness.input_tp>-.8)throw Error('Audio true peak exceeds the margin.');}
  const audit={duration,width:v.width,height:v.height,fps:60,frames:+v.nb_read_frames,fullDecode:'pass',audio:sample?'none':'AAC stereo 48kHz, Chinese narration and original music',loudness,sha256:sha(file),render:validateFrames(),classroomProjectionAndSpeakerAcceptance:'Requires classroom trial.'};
  fs.writeFileSync(path.join(output,prefix+'media-qa.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
}
function contact(){
  const times=sample?[1,2.8,4.1,5.8,7.2,8.7,10.2,11.7,13.2,14.7]:[3,11,18,27,33,40,47,54,61,69,75,82,89,95,100,109,117,127,135,144,148,153,161,167,174,179];
  const file=path.join(sample?output:base,sample?'sample.mp4':'calculus-history.mp4');
  run('ffmpeg',['-v','error','-y','-i',file,'-vf',`select=${times.map(t=>`eq(n\\,${Math.round(t*60)})`).join('+')},scale=480:300,tile=4x${Math.ceil(times.length/4)}`,'-frames:v','1',path.join(output,prefix+'contact-sheet.png')]);console.log('Exported final-video contact sheet.');
}
async function serve(){
  const origin='http://127.0.0.1:5198',types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.woff':'font/woff','.flac':'audio/flac','.m4a':'audio/mp4','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.srt':'text/plain; charset=utf-8'};
  http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,origin);
    if(req.method==='POST'&&/^\/render\/(sample-)?(frames|audit)$/.test(url.pathname)){
      if(req.headers.origin!==origin){res.writeHead(403);res.end();return;}
      const chunks=[];let count=0;for await(const chunk of req){count+=chunk.length;if(count>400*1024*1024)throw Error('Export exceeds 400MiB.');chunks.push(chunk);}
      const name=url.pathname.split('/').at(-1);fs.writeFileSync(path.join(cache,name+(name.endsWith('frames')?'.ivf':'.json')),Buffer.concat(chunks));res.writeHead(200);res.end('Saved');return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const file=path.resolve(base,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    const size=fs.statSync(file).size;let start=0,end=size-1,status=200;
    if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416);res.end();return;}start=+m[1];end=m[2]?Math.min(+m[2],size-1):size-1;if(start>end){res.writeHead(416);res.end();return;}status=206;}
    res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache',...(status===206?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
  }catch(e){if(!res.headersSent)res.writeHead(500);res.end(String(e));}}).listen(5198,'127.0.0.1',()=>console.log(origin+'/?export=1'));
}
function pack(){
  const release=path.join(output,'release');if(release.startsWith(base+path.sep))throw Error('For packaging, keep --output outside the film source folder.');fs.mkdirSync(release,{recursive:true});fs.cpSync(base,release,{recursive:true,filter:source=>!path.relative(base,source).split(path.sep).includes('.export')});fs.mkdirSync(path.join(release,'tools'),{recursive:true});for(const name of ['calculus-history-film.mjs','calculus-history-assets.py','calculus-history-speech.mjs'])fs.copyFileSync(path.join('scripts',name),path.join(release,'tools',name));
  for(const name of ['media-qa.json','content-qa.json','browser-qa.json','production-qa.json','render-source-fingerprint.json','render-source-verification.json','contact-sheet.png','browser-desktop.jpg','browser-narrow.jpg','narration-timing.json','score.json'])fs.copyFileSync(path.join(output,name),path.join(release,name));
  const guide=fs.readFileSync('docs/course/economic-mathematics-calculus-history-film.md','utf8')
    .replaceAll('../../apps/teacher-web/public/course-assets/economic-mathematics/calculus-history/','')
    .replaceAll('(economic-mathematics-calculus-history-validation.md)','(validation.md)');
  fs.writeFileSync(path.join(release,'classroom-guide.md'),guide);
  fs.copyFileSync('docs/course/economic-mathematics-calculus-history-validation.md',path.join(release,'validation.md'));
  const scan=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):[path.join(dir,e.name)]);
  const files=scan(release).filter(f=>path.basename(f)!=='manifest.json').map(f=>({path:path.relative(release,f).replaceAll('\\','/'),bytes:fs.statSync(f).size,sha256:sha(f)}));
  fs.writeFileSync(path.join(release,'manifest.json'),JSON.stringify({film:film.id,files},null,2)+'\n');console.log(`Packaged ${files.length} files. No keys, signed provider URLs or raw provider responses included.`);
}
if(mode==='prepare')prepare();else if(mode==='serve')await serve();else if(mode==='mux')mux();else if(mode==='verify')verify();else if(mode==='contact')contact();else if(mode==='package')pack();else console.log('prepare | serve | mux [--sample] | verify | contact | package');
