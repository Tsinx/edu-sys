/** Reproducible real-footage edit, sound mix, subtitles, credits, and final-file verification. */
import fs from 'node:fs/promises';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
const root=process.cwd(),lesson=process.argv.includes('--lesson12')?12:11,mode=process.argv[2]||'verify';
const base=path.resolve(`apps/teacher-web/public/course-assets/port-management/l${lesson}-media/documentary-v2`),out=path.resolve(`output/port-documentary-recut/l${lesson}`),sourceDir=path.resolve('output/port-documentary-recut/sources');
await fs.mkdir(out,{recursive:true});
const film=JSON.parse(await fs.readFile(path.join(base,'storyboard.json'),'utf8'));
const dep=process.env.CODEX_WORKSPACE_NODE_MODULES||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require=createRequire(path.join(dep,'task.js')),sharp=require('sharp'),{chromium}=require('playwright');
const digest=b=>createHash('sha256').update(b).digest('hex'),sha=p=>digest(readFileSync(p));
const run=(cmd,args,cwd=root)=>{const r=spawnSync(cmd,args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:8e6});if(r.status!==0)throw Error(r.stderr||String(r.error));return r.stdout;};
const asyncRun=(cmd,args,cwd=root)=>new Promise((resolve,reject)=>{const p=spawn(cmd,args,{cwd,windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',b=>error=(error+b).slice(-12000));p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(error||`${cmd} ${code}`)));});
const assTime=t=>`${Math.floor(t/3600)}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.floor(t)%60).padStart(2,'0')}.${String(Math.round((t%1)*100)).padStart(2,'0')}`;
const srtTime=(t,sep=',')=>`${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.floor(t)%60).padStart(2,'0')}${sep}${String(Math.round((t%1)*1000)).padStart(3,'0')}`;
const escape=s=>s.replaceAll('\\','').replaceAll('{','').replaceAll('}','').replaceAll('\n','\\N');
function chunks(text){const units=text.match(/[^，。？！；：]+[，。？！；：]?/gu)||[text],result=[];let current='';for(const unit of units){if(current.length+unit.length>25&&current){result.push(current);current='';}for(let at=0;at<unit.length;at+=25){const part=unit.slice(at,at+25);if(part.length===25){if(current){result.push(current);current='';}result.push(part);}else current+=part;}}if(current)result.push(current);return result;}
async function graphics(){
 const mp=await sharp(path.join(sourceDir,'mpa-page1.png')).extract({left:240,top:483,width:840,height:64}).png().toBuffer();
 const tj=await sharp(path.join(sourceDir,'tianjin-page1.png')).extract({left:225,top:235,width:830,height:120}).png().toBuffer();
 const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1920,height:1200},deviceScaleFactor:1});
  for(const [id,img,kicker,note]of [['mpa',mp,'档案回看 / 2024.05.30','MPA媒体说明 · 原文标题节选'],['tianjin',tj,'档案回看 / 天津 2015','瑞海公司危险品仓库事故调查报告 · 原文标题节选'],['tianjin-detail',tj,'调查报告 / 2016','从许可、库存、培训与监督，追问屏障如何失效']]){
   await page.setContent(`<html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1920px;height:1200px;background:rgba(4,12,17,.80);color:#f1eee4;font-family:'Microsoft YaHei',sans-serif}.k{position:absolute;left:140px;top:252px;font-size:32px;letter-spacing:4px;color:#e5bd77}.paper{position:absolute;left:140px;top:350px;width:1640px;height:340px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:16px 20px 0 #0005;transform:rotate(-.5deg)}img{width:1490px;height:auto}.note{position:absolute;left:140px;top:746px;font-size:39px;letter-spacing:1px}.line{position:absolute;left:140px;top:838px;width:90px;height:5px;background:#e5bd77}</style><div class="k">${kicker}</div><div class="paper"><img src="data:image/png;base64,${img.toString('base64')}"></div><div class="note">${note}</div><div class="line"></div></html>`);
   await page.screenshot({path:path.join(out,id+'.png'),omitBackground:true});
  }
 }finally{await browser.close();}
 const svg=Buffer.from('<svg width="1920" height="1200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".70"/></linearGradient></defs><rect width="1920" height="1200" fill="url(#g)"/><rect width="1920" height="60" fill="#080f14"/><rect y="1140" width="1920" height="60" fill="#080f14"/></svg>');
 await sharp(svg).png().toFile(path.join(out,'matte.png'));
 const fontDir=path.resolve('output/port-documentary-recut/fonts');await fs.mkdir(fontDir,{recursive:true});for(const name of ['msyh.ttc','msyhbd.ttc'])await fs.copyFile('C:/Windows/Fonts/'+name,path.join(fontDir,name));
}
async function subtitles(){
 const timing=JSON.parse(await fs.readFile(existsSync(path.join(out,'speech/timing.json'))?path.join(out,'speech/timing.json'):path.join(base,'voice-timing.json'),'utf8')),captions=[];const events=[];
 const event=(from,to,style,text,layer=1)=>events.push(`Dialogue: ${layer},${assTime(from)},${assTime(to)},${style},,0,0,0,,${text}`);
 const text=(from,to,x,y,size,s,bold=false,color='FFFFFF',layer=2)=>event(from,to,'Overlay',`{\\an7\\pos(${x},${y})\\fs${size}\\b${bold?1:0}\\1c&H${color}&\\fad(200,220)}${escape(s)}`,layer);
 const box=(from,to,x,y,w,h,alpha='66')=>event(from,to,'Overlay',`{\\an7\\pos(${x},${y})\\p1\\1c&H080B0E&\\1a&H${alpha}&\\bord0\\shad0\\fad(200,220)}m 0 0 l ${w} 0 l ${w} ${h} l 0 ${h}`,0);
 event(0,180,'Overlay','{\\an7\\pos(72,15)\\fs24\\b1\\1c&HDFE4E9&}港口观察',3);
 event(0,180,'Overlay',`{\\an9\\pos(1848,15)\\fs22\\1c&HABB8C2&}第${lesson}讲 / ${escape(film.subtitle)}`,3);
 for(const cut of film.cuts){const source=film.footage.find(s=>s.id===cut.source);let label;
  if(cut.archive)label=lesson===11?'原文标题节选 / MPA 2024.05.30 · 背景实拍非事件现场':'原文标题节选 / 应急管理部公开调查档案';
  else if(['5100045','5100055','7018675','4294434','4291728'].includes(cut.source))label='一般仓储实拍 · 非采访，与历史案件无关';
  else label='一般港口实拍 · 非所述事件现场';
  event(cut.from,cut.to,'Footer',`{\\an7\\pos(72,1157)}${escape(label)}${cut.archive?'':` / ${escape(source.author)} · Pexels`}`,3);
 }
 for(const shot of film.shots){const t=timing.records.find(r=>r.id===shot.id);if(!t)throw Error('Missing voice timing '+shot.id);const parts=chunks(shot.narration),length=parts.reduce((n,s)=>n+s.length,0);let from=t.from;
  for(const part of parts){const to=Math.min(t.spokenEnd,from+(t.spokenEnd-t.from)*part.length/length);captions.push({from,to,text:part});event(from,to,'Caption',escape(part),4);from=to;}
 }
 for(const o of film.overlays){if(o.kind==='lower'){
   box(o.from,o.to,72,748,1776,218,'42');text(o.from,o.to,106,768,25,o.kicker,true,'87C9D5');text(o.from,o.to,102,812,55,o.lines.join('\n'),true);text(o.from,o.to,106,900,27,o.sub,false,'C6D7DB');
  }else{
   box(o.from,o.to,0,60,1920,1080,'70');text(o.from,o.to,112,280,32,o.kicker,true,'87C9D5');
   if(o.kind==='title'&&lesson===11){text(o.from,o.to,106,370,152,o.lines[0],true);text(o.from,o.to,110,552,115,o.lines[1],true);text(o.from,o.to,116,756,39,o.sub);}
   else if(o.kind==='title'){text(o.from,o.to,104,418,170,o.lines.join('\n'),true);text(o.from,o.to,116,704,42,o.sub);}
   else{for(let i=0;i<o.lines.length;i++)text(o.from,o.to,108,386+i*132,91,o.lines[i],true);text(o.from,o.to,114,742,34,o.sub);}
  }
 }
 const credit=film.credits.from;box(credit,180,0,60,1920,1080,'20');text(credit,180,108,204,30,`港口观察 / ${lesson}`,true,'87C9D5');text(credit,180,104,270,75,film.title,true);
 text(credit,180,110,415,28,'实拍素材 / Pexels License',true);const authors=film.credits.authors;for(let i=0;i<authors.length;i+=2)text(credit,180,110,470+i/2*55,28,authors.slice(i,i+2).join('  /  '));
 text(credit,180,110,758,27,lesson===11?'历史资料 / MPA 2024.05.30':'历史资料 / 应急管理部调查报告 · 日本国土交通省');
 text(credit,180,110,815,27,'中文旁白 / 课程合成配音    配乐与剪辑 / 本课程原创');text(credit,180,110,880,25,'完整素材来源、许可、逐字稿与旧版对照：见播放器',false,'BFCED4');
 const header='[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1200\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Microsoft YaHei,44,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2.6,1,2,100,100,132,1\nStyle: Overlay,Microsoft YaHei,40,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,.4,0,7,0,0,0,1\nStyle: Footer,Microsoft YaHei,22,&H00BECBD4,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
 await fs.writeFile(path.join(out,'film.ass'),header+events.join('\n')+'\n');
 for(const [name,sep]of [['captions.srt',','],['captions.vtt','.']])await fs.writeFile(path.join(base,name),(name.endsWith('vtt')?'WEBVTT\n\n':'')+captions.map((c,i)=>`${i+1}\n${srtTime(c.from,sep)} --> ${srtTime(c.to,sep)}\n${c.text}\n`).join('\n'));
 await fs.writeFile(path.join(base,'caption-timing.json'),JSON.stringify(captions,null,2)+'\n');console.log(`L${lesson}: ${captions.length} phrase captions aligned to actual voice takes.`);
}
function wav(pcm,sr=48000){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(sr,24);h.writeUInt32LE(sr*4,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
async function sound(){
 const sr=48000,pcm=Buffer.alloc(180*sr*4);let random=271828;const harmony=lesson===11?[[73.416,110,146.832,174.614],[65.406,98,130.812,164.814],[82.407,110,164.814,196],[55,82.407,110,138.591]]:[[65.406,98,130.812,164.814],[73.416,110,146.832,174.614],[87.307,130.812,174.614,220],[65.406,98,130.812,164.814]];
 for(let i=0;i<180*sr;i++){const t=i/sr,tempo=lesson===11?84:68,beat=t*tempo/60,phase=beat%1,bar=Math.floor(beat/8),chord=harmony[bar%harmony.length],fade=Math.min(1,Math.max(0,(t-5)/5),Math.max(0,(180-t)/5));random=(Math.imul(random,1664525)+1013904223)>>>0;const noise=random/4294967296-.5;
  const body=chord.reduce((n,f,k)=>n+Math.sin(2*Math.PI*f*t+Math.sin(t*.23+k)*.08)*(.022/(1+k*.4)),0),piano=Math.sin(2*Math.PI*chord[Math.floor(beat)%4]*2*t)*Math.exp(-phase*6)*.033;
  const pulse=lesson===11?Math.sin(2*Math.PI*(47*t+.15*Math.exp(-phase*14)))*Math.exp(-phase*15)*.05:Math.sin(2*Math.PI*chord[0]*.5*t)*.018;
  const sting=[9,20,65,124,168].reduce((n,s)=>n+(t>=s&&t<s+1?Math.exp(-(t-s)*7)*(noise*.06+Math.sin(t*2*Math.PI*82)*.05):0),0);
  const quiet=(t>107&&t<111)||(t>34&&t<36)?.18:1,level=(t>11&&t<20?1.5:t>163?1.2:.65)*quiet,signal=(body+piano+pulse+sting)*fade*level;
  const spread=Math.sin(t*.19)*.12;pcm.writeInt16LE(Math.round(Math.max(-.9,Math.min(.9,signal*(1-spread)))*32767),i*4);pcm.writeInt16LE(Math.round(Math.max(-.9,Math.min(.9,signal*(1+spread)))*32767),i*4+2);
 }
 await fs.writeFile(path.join(out,'score.wav'),wav(pcm));
 const ambience=Buffer.alloc(pcm.length);for(const cut of film.cuts.filter(c=>c.sound)){
  const file=path.join(out,`sound-${cut.from}.pcm`),dur=cut.to-cut.from;run('ffmpeg',['-v','error','-y','-ss',String(cut.in),'-i',path.join(sourceDir,cut.source+'.mp4'),'-t',String(dur),'-vn','-af',`volume=${cut.sound*(cut.source==='18718867'?.23:1)},afade=t=in:d=0.12,afade=t=out:st=${dur-.25}:d=0.25`,'-ar','48000','-ac','2','-f','s16le',file]);const data=await fs.readFile(file);for(let i=0;i<data.length;i+=2){const at=cut.from*sr*4+i;if(at+1<ambience.length)ambience.writeInt16LE(Math.max(-32767,Math.min(32767,ambience.readInt16LE(at)+data.readInt16LE(i))),at);}
 }
 await fs.writeFile(path.join(out,'location-sound.wav'),wav(ambience));
 run('ffmpeg',['-v','error','-y','-i',path.join(base,'narration.flac'),'-i',path.join(out,'score.wav'),'-i',path.join(out,'location-sound.wav'),'-filter_complex','[0:a]asplit=2[voice][key];[1:a][2:a]amix=inputs=2:duration=longest:normalize=0[bed];[bed][key]sidechaincompress=threshold=.015:ratio=6:attack=60:release=550[duck];[voice][duck]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8[a]','-map','[a]','-ar','48000','-ac','2','-t','180','-c:a','aac','-b:a','192k',path.join(base,'soundtrack.m4a')]);
 console.log(`L${lesson}: separately composed score, licensed original sound, narration-led ducking, 48kHz stereo mix.`);
}
async function picture(){
 await fs.mkdir(path.join(out,'shots'),{recursive:true});let cursor=0;const records=[];
 async function worker(){while(cursor<film.cuts.length){const i=cursor++,cut=film.cuts[i],name=`${String(i).padStart(2,'0')}.mp4`,file=path.join(out,'shots',name),source=path.join(sourceDir,cut.source+'.mp4');const fingerprint=digest(JSON.stringify({cut,source:film.footage.find(s=>s.id===cut.source).sha256,encoder:2,archive:cut.archive?sha(path.join(out,cut.archive+'.png')):null}));
   let cached=false;try{cached=await fs.readFile(file+'.sha','utf8')===fingerprint&&existsSync(file);}catch{}
   if(!cached){const args=['-v','error','-y','-ss',String(cut.in),'-i',source],filters='fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1200:(ow-iw)/2:(oh-ih)/2,setsar=1,eq=contrast=1.035:saturation=1.03:brightness=-0.006';
    if(cut.archive)args.push('-loop','1','-i',path.join(out,cut.archive+'.png'),'-filter_complex',`[0:v]${filters}[v];[v][1:v]overlay=0:0:format=auto[out]`,'-map','[out]');else args.push('-vf',filters);
    args.push('-t',String(cut.to-cut.from),'-an','-c:v','libx264','-preset','veryfast','-crf','21','-threads','2','-pix_fmt','yuv420p','-r','30','-video_track_timescale','15360',file);await asyncRun('ffmpeg',args);await fs.writeFile(file+'.sha',fingerprint);
   }records.push({i,...cut,fingerprint,file:name});console.log(`L${lesson} picture ${i+1}/${film.cuts.length}: ${cut.from}–${cut.to}s / ${cut.source}${cut.archive?' / archive':''}${cached?' / cached':''}`);
 }}await Promise.all([worker(),worker()]);
 await fs.writeFile(path.join(out,'concat.txt'),records.sort((a,b)=>a.i-b.i).map(r=>`file 'shots/${r.file}'`).join('\n')+'\n');
 run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i','concat.txt','-c','copy','picture.mp4'],out);
 await fs.writeFile(path.join(out,'picture-audit.json'),JSON.stringify({cuts:records,rawSourceDownloadNotPublic:true},null,2)+'\n');
}
async function mux(){
 await asyncRun('ffmpeg',['-v','error','-y','-i','picture.mp4','-i',path.join(base,'soundtrack.m4a'),'-loop','1','-i','matte.png','-filter_complex','[0:v][2:v]overlay=0:0,subtitles=film.ass:fontsdir=../fonts,fade=t=in:st=0:d=0.35,fade=t=out:st=179:d=1[v]','-map','[v]','-map','1:a','-t','180','-c:v','libx264','-threads','4','-preset','fast','-crf','21','-maxrate','9000k','-bufsize','18000k','-pix_fmt','yuv420p','-r','30','-c:a','copy','-metadata',`title=${film.title}`,'-metadata','comment=Edited classroom documentary. Licensed generic footage is not incident footage; full credits in player.','-movflags','+faststart',path.join(base,'opening.pending.mp4')],out);
 await fs.rename(path.join(base,'opening.pending.mp4'),path.join(base,'opening.mp4'));
 run('ffmpeg',['-v','error','-y','-ss',lesson===11?'15':'15.5','-i',path.join(base,'opening.mp4'),'-frames:v','1','-q:v','2',path.join(base,'poster.jpg')]);console.log(`L${lesson}: final 3-minute H.264/AAC edit exported.`);
}
async function cover(){
 run('ffmpeg',['-v','error','-y','-ss',lesson===11?'3':'20','-i',path.join(sourceDir,(lesson===11?'30899354':'7018675')+'.mp4'),'-vf','scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1200','-frames:v','1','-q:v','2',path.join(base,'cover.jpg')]);
}
async function compact(){
 const file=path.join(base,'opening.mp4');if((await fs.stat(file)).size<100000000){console.log(`L${lesson}: playback file is already within the delivery size budget.`);return;}
 const master=path.join(out,`opening-master-${sha(file).slice(0,12)}.mp4`);if(!existsSync(master))await fs.copyFile(file,master);
 await asyncRun('ffmpeg',['-v','error','-y','-i',master,'-map','0:v:0','-map','0:a:0','-c:v','libx264','-threads','4','-preset','fast','-crf','22','-maxrate','4000k','-bufsize','8000k','-pix_fmt','yuv420p','-r','30','-c:a','copy','-t','180','-movflags','+faststart',path.join(base,'opening.compact.mp4')]);
 if((await fs.stat(path.join(base,'opening.compact.mp4'))).size>=100000000)throw Error('Classroom MP4 exceeds the delivery size budget');
 const candidate=path.join(base,'opening.compact.mp4');
 try{await fs.rename(candidate,file);}catch(error){if(!['EPERM','EEXIST'].includes(error.code))throw error;await fs.copyFile(candidate,file);await fs.rename(candidate,path.join(out,`playback-${sha(file).slice(0,12)}.mp4`));}
 console.log(`L${lesson}: playback copy compacted below 100 MB; full master retained in working output.`);
}
async function preview(){
 const samples=lesson===11?[[4,15],[7,40],[8,49],[10,68],[24,170],[25,177]]:[[3,15],[6,40],[7,47],[12,85],[23,169],[24,177]],tiles=[];
 for(let i=0;i<samples.length;i++){const [index,time]=samples[i],cut=film.cuts[index],file=path.join(out,`preview-${time}.jpg`);run('ffmpeg',['-v','error','-y','-ss',String(time-cut.from),'-i',`shots/${String(index).padStart(2,'0')}.mp4`,'-vf',`setpts=PTS+${time}/TB,subtitles=film.ass:fontsdir=../fonts,scale=960:600`,'-frames:v','1','-fps_mode','passthrough',file],out);tiles.push({input:await sharp(file).resize(640,400).toBuffer(),left:i%2*640,top:Math.floor(i/2)*400});}
 await sharp({create:{width:1280,height:1200,channels:3,background:'#080f14'}}).composite(tiles).jpeg({quality:90}).toFile(path.join(out,'type-preview.jpg'));
}
async function verify(){
 const file=path.join(base,'opening.mp4'),probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file])),v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
 if(+probe.format.duration!==180||v.width!==1920||v.height!==1200||v.codec_name!=='h264'||+v.nb_read_frames!==5400||v.avg_frame_rate!=='30/1'||a.sample_rate!=='48000'||a.channels!==2)throw Error('Unexpected final format');
 run('ffmpeg',['-v','error','-i',file,'-f','null','-']);
 const loud=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json','-vn','-f','null','-'],{encoding:'utf8',windowsHide:true,maxBuffer:4e6});if(loud.status)throw Error(loud.stderr);const loudness=JSON.parse(loud.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g).at(-1));if(+loudness.input_tp>-.8)throw Error('Audio true peak');
 const times=[2,6,9.5,15,24,32,40,47,57,68,77,85,99,114,128,143,159,170,177];
 const tiles=[];for(let i=0;i<times.length;i++){const t=times[i],frame=path.join(out,`final-${String(t).padStart(5,'0')}.jpg`);run('ffmpeg',['-v','error','-y','-ss',String(t),'-i',file,'-frames:v','1','-q:v','2',frame]);tiles.push({input:await sharp(frame).resize(480,300).toBuffer(),left:i%4*480,top:Math.floor(i/4)*300});}
 await sharp({create:{width:1920,height:Math.ceil(times.length/4)*300,channels:3,background:'#080f14'}}).composite(tiles).jpeg({quality:90}).toFile(path.join(out,'final-contact.jpg'));
 const timing=JSON.parse(await fs.readFile(existsSync(path.join(out,'speech/timing.json'))?path.join(out,'speech/timing.json'):path.join(base,'voice-timing.json'),'utf8')),voiceSeconds=timing.records.reduce((n,r)=>n+r.spokenEnd-r.from,0);
 const audit={lesson,title:film.title,version:film.id,duration:180,width:v.width,height:v.height,fps:30,frames:+v.nb_read_frames,fullDecode:'pass',codec:'H.264 yuv420p / AAC 48kHz stereo',pictureEdits:film.cuts.length,realVideoSourceCount:film.footage.length,archiveSeconds:film.cuts.filter(c=>c.archive).reduce((n,c)=>n+c.to-c.from,0),voiceSeconds:+voiceSeconds.toFixed(2),noNarrationSeconds:+(180-voiceSeconds).toFixed(2),loudness,bytes:(await fs.stat(file)).size,sha256:sha(file),storyboardSha256:sha(path.join(base,'storyboard.json')),captionsSha256:sha(path.join(base,'captions.srt')),sourceHashes:film.footage.map(s=>({id:s.id,sha256:s.sha256,license:s.license,url:s.url})),subjectiveListening:'not claimed; waveform, ASR and browser playback checked separately',classroomSpeakerTrial:'not yet run'};
 await fs.writeFile(path.join(out,'media-qa.json'),JSON.stringify(audit,null,2)+'\n');await fs.writeFile(path.join(base,'media-qa.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
}
if(mode==='prepare'){await graphics();await subtitles();await sound();await cover();}else if(mode==='compact')await compact();else if(mode==='preview')await preview();else if(mode==='cover')await cover();else if(mode==='subtitles')await subtitles();else if(mode==='sound')await sound();else if(mode==='picture')await picture();else if(mode==='mux'){await mux();await compact();}else if(mode==='verify')await verify();else throw Error('prepare | compact | preview | cover | subtitles | sound | picture | mux | verify');
