(async function(){
  'use strict';
  const $=id=>document.getElementById(id),film=window.CalculusHistoryFilm,data=window.CalculusFilmData;
  const video=$('movie'),canvas=$('picture'),sound=$('soundtrack'),query=new URLSearchParams(location.search);
  let native=false,position=0,playing=false,raf=0,prepared=false;
  const fmt=n=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
  const chapters=[];
  for(const shot of data.chapters){const b=document.createElement('button');b.textContent=shot.title;b.onclick=()=>seek(shot.from+.7);$('chapters').append(b);chapters.push({b,shot});}
  function update(t){position=Math.max(0,Math.min(data.duration,t));$('seek').value=String(position);$('clock').value=`${fmt(position)} / ${fmt(data.duration)}`;for(const {b,shot}of chapters)b.setAttribute('aria-current',String(position>=shot.from&&position<shot.to));}
  function stop(){playing=false;cancelAnimationFrame(raf);video.pause();sound.pause();$('play').textContent='▶';$('play').setAttribute('aria-label','播放');}
  async function prepare(){if(prepared)return;await film.prepare();prepared=true;}
  async function draw(t){await prepare();film.render(canvas,t);update(t);}
  async function seek(t){stop();$('start').hidden=true;if(native){sound.currentTime=t;await draw(t);}else{video.currentTime=t;update(t);}}
  function tick(){if(!playing)return;if(native){film.render(canvas,sound.currentTime);update(sound.currentTime);}else update(video.currentTime);if((native?sound:video).ended){stop();update(data.duration);return;}raf=requestAnimationFrame(tick);}
  async function play(){
    if(playing){stop();return;}if(position>=data.duration-.03)await seek(0);$('start').hidden=true;
    try{if(native){await prepare();sound.currentTime=position;await sound.play();}else{video.currentTime=position;await video.play();}playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','暂停');raf=requestAnimationFrame(tick);}
    catch{$('status').textContent='声音或视频未启动，请再次点击播放。';stop();}
  }
  $('play').onclick=play;$('start').onclick=play;$('replay').onclick=async()=>{await seek(0);void play();};$('seek').oninput=()=>seek(Number($('seek').value));
  video.volume=sound.volume=.85;
  $('volume').oninput=()=>{video.volume=sound.volume=Number($('volume').value);};
  $('mute').onclick=()=>{video.muted=sound.muted=!video.muted;$('mute').textContent=video.muted?'静音':'声音';$('mute').setAttribute('aria-label',video.muted?'开启声音':'静音');};
  $('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.querySelector('.cinema').requestFullscreen();
  document.addEventListener('fullscreenchange',()=>{$('full').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏播放');});
  async function setNative(value){stop();native=value;video.hidden=value;canvas.hidden=!value;$('mode').textContent=value?'观看成片':'动画源预览';if(value)await draw(position);else{video.currentTime=position;update(position);}}
  $('mode').onclick=()=>setNative(!native);
  video.onended=sound.onended=()=>{stop();update(data.duration);};video.onerror=()=>{if(!query.has('export'))$('status').textContent='MP4暂不可读取；可打开动画源预览。';};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;if(e.code==='Space'){e.preventDefault();void play();}if(e.key==='ArrowRight'){e.preventDefault();void seek(Math.min(data.duration,position+5));}if(e.key==='ArrowLeft'){e.preventDefault();void seek(Math.max(0,position-5));}});
  update(0);
  if(query.has('export')&&['localhost','127.0.0.1'].includes(location.hostname)){
    $('exporter').hidden=false;await setNative(true);$('start').hidden=true;
    const sample=query.has('sample'),duration=sample?15:data.duration;
    $('export').textContent=sample?'导出15秒检查片段':'导出全部动画帧';
    $('export').onclick=async()=>{
      stop();$('export').disabled=true;await prepare();
      try{
        const support=await VideoEncoder.isConfigSupported({codec:'vp09.00.10.08',width:1920,height:1200,framerate:data.fps,bitrate:8_000_000});
        if(!support.supported)throw Error('当前浏览器不支持所需编码。');
        const target=document.createElement('canvas');target.width=1920;target.height=1200;
        const packets=[],audit=[],total=duration*data.fps;let failure;
        const encoder=new VideoEncoder({error:e=>{failure=e;},output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);const head=new Uint8Array(12),v=new DataView(head.buffer);v.setUint32(0,bytes.length,true);v.setBigUint64(4,BigInt(Math.round(chunk.timestamp*data.fps/1e6)),true);packets.push(head,bytes);}});
        encoder.configure(support.config);
        const passages=[4,19,42,64,85,105,122,140,159,174];
        for(let i=0;i<total;i++){
          const local=i/data.fps,t=sample?passages[Math.min(9,Math.floor(local/1.5))]+local%1.5:local;
          audit.push(film.render(target,t));const frame=new VideoFrame(target,{timestamp:Math.round(i*1e6/data.fps),duration:Math.round(1e6/data.fps)});
          encoder.encode(frame,{keyFrame:i%120===0});frame.close();
          if(i%18===0||encoder.encodeQueueSize>18){await encoder.flush();await new Promise(r=>setTimeout(r,0));}
          if(failure)throw failure;
          if(i%60===0){$('exportStatus').value=`${i} / ${total} 帧`;
            const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(target,0,0,canvas.width,canvas.height);update(t);}
        }
        await encoder.flush();encoder.close();if(packets.length!==total*2)throw Error('编码帧数不完整。');
        const header=new Uint8Array(32),v=new DataView(header.buffer);header.set([... 'DKIF'].map(c=>c.charCodeAt(0)));v.setUint16(6,32,true);header.set([... 'VP90'].map(c=>c.charCodeAt(0)),8);v.setUint16(12,1920,true);v.setUint16(14,1200,true);v.setUint32(16,data.fps,true);v.setUint32(20,1,true);v.setUint32(24,total,true);
        for(const [name,body]of [['frames',new Blob([header,...packets])],['audit',JSON.stringify(audit)]]){
          const r=await fetch(`/render/${sample?'sample-':''}${name}`,{method:'POST',body});if(!r.ok)throw Error(`本地保存失败：${r.status}`);
        }
        $('exportStatus').value=`已保存 ${total} 帧及检查记录。`;
      }catch(e){$('exportStatus').value=`导出失败：${e.message}`;}finally{$('export').disabled=false;}
    };
  }
})();
