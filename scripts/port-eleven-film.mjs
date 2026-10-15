/** prepare | render | mux | verify. Deterministic editable source -> real H.264/AAC MP4. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const lesson=process.argv.includes('--lesson12')?12:11;
const repo=process.cwd(),base=path.resolve(`apps/teacher-web/public/course-assets/port-management/l${lesson}-media`),out=path.resolve(`output/port-${lesson===12?'twelve':'eleven'}-media`);fs.mkdirSync(out,{recursive:true});
const dep=process.env.CODEX_WORKSPACE_NODE_MODULES||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require=createRequire(path.join(dep,'entry.js')),sharp=require('sharp'),{chromium}=require('playwright');
const film=JSON.parse(fs.readFileSync(path.join(base,'storyboard.json'),'utf8')),mode=process.argv[2]||'verify';
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:8e6});if(r.status!==0)throw Error(r.stderr||String(r.error));return r.stdout;};
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const imageNames=lesson===12?['handoff','warehouse','records','drill','community','gate']:['terminal','yard','gate','anchorage','quayside','control-room'];
const fingerprint=()=>{const h=createHash('sha256');for(const name of ['storyboard.json','animation.js',...imageNames.map(n=>n+'.jpg')])h.update(name).update(fs.readFileSync(path.join(base,name)));return h.digest('hex');};
function wav(pcm,sr=48000){const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(sr,24);header.writeUInt32LE(sr*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);}
async function prepare(){
 const original=path.resolve('apps/teacher-web/public/course-assets/port-management');
 const inputs=lesson===12?[...imageNames.filter(n=>n!=='gate').map(n=>[n,n+'-source.png']),['gate',path.join(original,'l11-media/gate.jpg')]]:[['terminal','terminal-source.png'],['yard','yard-source.png'],['gate','gate-source.png'],['anchorage','anchorage-source.png'],['quayside',path.join(original,'story-l3-berth-window.png')],['control-room',path.join(original,'story-l3-terminal-diagnosis.png')]];
 for(const [name,src]of inputs)await sharp(path.isAbsolute(src)?src:path.join(base,src)).jpeg({quality:90,mozjpeg:true}).toFile(path.join(base,name+'.jpg'));
 const sr=48000,pcm=Buffer.alloc(film.duration*sr*4);let noise=114514;
 for(let i=0;i<film.duration*sr;i++){const t=i/sr,beat=t*(lesson===12?1.2:1.4),phase=beat%1,bar=Math.floor(beat/8),root=(lesson===12?[65.406,55,73.416,49]:[55,65.406,49,58.27])[bar%4];noise=(Math.imul(noise,1664525)+1013904223)>>>0;const n=noise/4294967296-.5;
  const fade=Math.min(1,t/3,(180-t)/3),pulse=Math.exp(-phase*16)*Math.sin(2*Math.PI*(48*t+3*Math.exp(-phase*25))),pad=[1,1.5,2,2.5].reduce((a,k)=>a+Math.sin(2*Math.PI*root*k*t)*.045,0);
  const shotAccent=Math.exp(-(t%10)*9)*(Math.sin(2*Math.PI*95*t)*.15+n*.11),wave=n*.024*(.6+.4*Math.sin(t*.7));
  const voiceActive=(t%10)>.35&&(t%10)<9.65,duck=voiceActive?.26:.65;
  const s=(pad+pulse*.12+shotAccent+wave)*fade*duck,pan=Math.sin(t*.23)*.18;
  pcm.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(s*(1-pan)*32767))),i*4);pcm.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(s*(1+pan)*32767))),i*4+2);
 }
 fs.writeFileSync(path.join(out,'score.wav'),wav(pcm));run('ffmpeg',['-v','error','-y','-i',path.join(out,'score.wav'),'-c:a','flac',path.join(base,'score.flac')]);
 const stamp=(t,sep)=>`${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.floor(t)%60).padStart(2,'0')}${sep}${String(Math.round((t%1)*1000)).padStart(3,'0')}`;
 for(const [name,sep]of [['captions.srt',','],['captions.vtt','.']])fs.writeFileSync(path.join(base,name),(name.endsWith('vtt')?'WEBVTT\n\n':'')+film.shots.map((s,i)=>`${i+1}\n${stamp(s.from+.4,sep)} --> ${stamp(s.to-.2,sep)}\n${s.narration}\n`).join('\n'));
 const sources=inputs.map(([name,src])=>({name,src:path.isAbsolute(src)?path.relative(repo,src):src,sha256:sha(path.join(base,name+'.jpg')),type:'AI teaching illustration',historicFootage:false}));
 fs.writeFileSync(path.join(base,'asset-fingerprints.json'),JSON.stringify({images:sources,music:'Original deterministic additive synthesis, no external samples',sources:film.sources},null,2)+'\n');
 console.log('Prepared six JPEG illustrations, original score, and Chinese subtitles.');
}
async function render(){const browser=await chromium.launch({headless:true,args:['--disable-background-networking']});const hash=fingerprint(),frames=film.duration*film.fps,ivf=path.join(out,'frames.ivf'),fd=fs.openSync(ivf,'w'),head=Buffer.alloc(32);head.write('DKIF');head.writeUInt16LE(32,6);head.write('VP90',8);head.writeUInt16LE(film.width,12);head.writeUInt16LE(film.height,14);head.writeUInt32LE(film.fps,16);head.writeUInt32LE(1,20);head.writeUInt32LE(frames,24);fs.writeSync(fd,head);let count=0;const errors=[];
 try{const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.exposeBinding('receiveChunk',(_source,b64,timestamp)=>{const b=Buffer.from(b64,'base64'),h=Buffer.alloc(12);h.writeUInt32LE(b.length);h.writeBigUInt64LE(BigInt(Math.round(timestamp*film.fps/1e6)),4);fs.writeSync(fd,h);fs.writeSync(fd,b);count++;});
  await page.exposeBinding('renderProgress',(_source,n)=>console.log(`Rendered ${n}/${frames} frames`));
  await page.goto((process.env.PORT_CLASS_LAB_URL||'http://127.0.0.1:5173')+`/course-assets/port-management/l${lesson}-media/render.html`);await page.evaluate(()=>(window.PortOpeningFilm??window.PortElevenFilm).ready);
  const audit=await page.evaluate(async()=>{const film=window.PortOpeningFilm??window.PortElevenFilm,data=film.data,canvas=document.querySelector('canvas'),audit=[];let pending=[],error;
   const config={codec:'vp09.00.10.08',width:data.width,height:data.height,framerate:data.fps,bitrate:5500000,latencyMode:'realtime'};if(!(await VideoEncoder.isConfigSupported(config)).supported)throw Error('VP9 encoder unavailable');
   const encoder=new VideoEncoder({error:e=>error=e,output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));pending.push(window.receiveChunk(btoa(s),chunk.timestamp));}});encoder.configure(config);
   for(let i=0;i<data.duration*data.fps;i++){const record=film.render(canvas,i/data.fps);if(i%15===0)audit.push(record);const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/data.fps),duration:Math.round(1e6/data.fps)});encoder.encode(frame,{keyFrame:i%60===0});frame.close();if(i%30===0||encoder.encodeQueueSize>25){await encoder.flush();await Promise.all(pending);pending=[];if(error)throw error;}if(i%300===0)await window.renderProgress(i);}
   await encoder.flush();await Promise.all(pending);encoder.close();return audit;
  });if(errors.length||count!==frames||hash!==fingerprint())throw Error('Render consistency check failed: '+JSON.stringify({errors,count}));
  const overflow=audit.flatMap(r=>r.bounds.filter(b=>b.x<0||b.y<0||b.x+b.width>1600.1||b.y+b.height>1000.1).map(b=>({time:r.time,...b})));fs.writeFileSync(path.join(out,'render-audit.json'),JSON.stringify({sourceHash:hash,frames:count,auditedFrames:audit.length,shots:[...new Set(audit.map(r=>r.shot))],textOverflow:overflow},null,2));if(overflow.length)throw Error(`${overflow.length} text bounds exceed film canvas.`);
  for(const t of [4,15,25,35,47,56,65,75,85,95,105,115,125,135,145,155,165,175]){await page.evaluate(t=>(window.PortOpeningFilm??window.PortElevenFilm).render(document.querySelector('canvas'),t),t);await page.locator('canvas').screenshot({path:path.join(out,`frame-${String(t).padStart(3,'0')}.png`)});}
  const tiles=await Promise.all([4,15,25,35,47,56,65,75,85,95,105,115,125,135,145,155,165,175].map(async(t,i)=>({input:await sharp(path.join(out,`frame-${String(t).padStart(3,'0')}.png`)).resize(400,250).toBuffer(),left:i%3*400,top:Math.floor(i/3)*250})));await sharp({create:{width:1200,height:1500,channels:3,background:'#092d39'}}).composite(tiles).png().toFile(path.join(out,'storyboard-contact.png'));
  await sharp(path.join(out,'frame-004.png')).jpeg({quality:93}).toFile(path.join(base,'poster.jpg'));console.log(`Rendered ${count} deterministic frames; all 18 shots; no text overflow.`);
 }finally{fs.closeSync(fd);await browser.close();}
}
function mux(){const audit=JSON.parse(fs.readFileSync(path.join(out,'render-audit.json'),'utf8'));if(audit.sourceHash!==fingerprint()||audit.frames!==5400||audit.textOverflow.length)throw Error('Render source changed or frame audit failed.');
 run('ffmpeg',['-v','error','-y','-i',path.join(base,'narration.flac'),'-i',path.join(base,'score.flac'),'-filter_complex','[0:a][1:a]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8[a]','-map','[a]','-t','180','-ar','48000','-ac','2','-c:a','aac','-b:a','192k',path.join(base,'soundtrack.m4a')]);
 run('ffmpeg',['-v','error','-y','-i',path.join(out,'frames.ivf'),'-i',path.join(base,'soundtrack.m4a'),'-c:v','libx264','-threads','4','-preset','fast','-crf','21','-maxrate','6500k','-bufsize','13000k','-pix_fmt','yuv420p','-r','30','-c:a','copy','-t','180','-movflags','+faststart',path.join(base,'opening.mp4')]);console.log('Exported 180-second H.264/AAC MP4.');
}
function verify(){const file=path.join(base,'opening.mp4'),probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file])),v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
 if(+probe.format.duration!==180||v.width!==1920||v.height!==1200||v.codec_name!=='h264'||v.avg_frame_rate!=='30/1'||+v.nb_read_frames!==5400||a.codec_name!=='aac'||a.sample_rate!=='48000'||a.channels!==2)throw Error('Unexpected final media metadata.');run('ffmpeg',['-v','error','-i',file,'-f','null','-']);
 const r=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json','-vn','-f','null','-'],{encoding:'utf8',windowsHide:true,maxBuffer:4e6});if(r.status!==0)throw Error('Loudness inspection failed');const loudness=JSON.parse(r.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g).at(-1));if(+loudness.input_tp>-.8)throw Error('Audio peak too high');
 const audit={duration:180,width:v.width,height:v.height,fps:30,frames:+v.nb_read_frames,video:'H.264 / yuv420p',audio:'AAC stereo / 48 kHz / Chinese narration + original score',fullDecode:'pass',loudness,bytes:fs.statSync(file).size,sha256:sha(file),sourceHash:fingerprint(),renderAudit:JSON.parse(fs.readFileSync(path.join(out,'render-audit.json'),'utf8')),classroomSpeakerTrial:'not yet run'};
 fs.writeFileSync(path.join(out,'media-qa.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify({...audit,renderAudit:undefined},null,2));
 run('ffmpeg',['-v','error','-y','-i',file,'-vf',`select=${[4,15,25,35,47,56,65,75,85,95,105,115,125,135,145,155,165,175].map(t=>`eq(n\\,${t*30})`).join('+')},scale=400:250,tile=3x6`,'-frames:v','1',path.join(out,'final-contact.png')]);
}
if(mode==='prepare')await prepare();else if(mode==='render')await render();else if(mode==='mux')mux();else if(mode==='verify')verify();else throw Error('prepare | render | mux | verify');
