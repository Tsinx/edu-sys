import { useEffect, useRef, useState } from 'react';
import type { SlideInteractionValues } from '@edu/contracts';
const root = '/course-assets/economic-mathematics/calculus-history/';

export function LessonHistoryFilm({ pageKey, values, readOnly, onPatch }: { pageKey: string; values: SlideInteractionValues; readOnly: boolean; onPatch?: (patch: SlideInteractionValues) => void }) {
  const video = useRef<HTMLVideoElement>(null), latest = useRef({ values, onPatch });
  latest.current = { values, onPatch };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el=video.current;
    if (!el) return;
    const apply = () => {
      const target=Number(values.filmTime??0);
      if (Number.isFinite(el.duration) && (el.paused || Math.abs(el.currentTime-target)>2) && Math.abs(el.currentTime-target)>.25) el.currentTime=target;
      el.volume=Number(values.filmVolume??100)/100;
      el.muted=readOnly || values.filmMuted===true;
      if (values.filmPlaying===true && target<180) void el.play().catch(()=>{ if(!readOnly) latest.current.onPatch?.({filmPlaying:false}); });
      else el.pause();
    };
    apply(); el.addEventListener('loadedmetadata',apply);
    return ()=>el.removeEventListener('loadedmetadata',apply);
  }, [values.filmTime,values.filmPlaying,values.filmVolume,values.filmMuted,readOnly]);
  useEffect(() => {
    const el=video.current;
    const interrupt=(event:Event)=>{if((event as CustomEvent).detail!==el) el?.pause();};
    const key=(event:KeyboardEvent)=>{
      if(readOnly || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || (event.target instanceof Element&&event.target.closest('input,select,textarea,button,[contenteditable=true]'))) return;
      if(event.key.toLowerCase()==='f') {event.preventDefault();if(el?.paused) void el.play().catch(()=>{});else el?.pause();}
    };
    window.addEventListener('edu:exclusive-audio',interrupt);window.addEventListener('keydown',key);
    return ()=>{
      window.removeEventListener('edu:exclusive-audio',interrupt);window.removeEventListener('keydown',key);
      if(el&&!readOnly) latest.current.onPatch?.({filmPlaying:false,filmTime:Math.min(180,Math.floor(el.currentTime))});
      el?.pause();
    };
  },[readOnly]);
  return <div className="em-history-film">
    <video id={pageKey+'-film'} ref={video} className="em-history-video" src={root+'calculus-history.mp4'} poster={root+'poster.png'} preload="metadata" playsInline controls={false} muted={readOnly||values.filmMuted===true} aria-label="三分钟微积分历史短片"
      onError={()=>setFailed(true)}
      onPlay={event=>{window.dispatchEvent(new CustomEvent('edu:exclusive-audio',{detail:event.currentTarget}));if(!readOnly) onPatch?.({filmPlaying:true});}}
      onPause={event=>{if(!readOnly) onPatch?.({filmPlaying:false,filmTime:Math.min(180,Math.floor(event.currentTarget.currentTime))});}}
      onEnded={()=>{if(!readOnly) onPatch?.({filmPlaying:false,filmTime:180});}}
      onTimeUpdate={event=>{const time=Math.min(180,Math.floor(event.currentTarget.currentTime));if(!readOnly&&time!==Number(latest.current.values.filmTime??0)) latest.current.onPatch?.({filmTime:time});}}/>
    {failed&&<p className="em-film-failure" role="status">短片暂未载入。请用“资料与帮助”中的独立短片入口继续观看。</p>}
    <div className="em-history-print">
      <h1>微积分基础之争</h1><img src={root+'poster.png'} alt="短片封面"/>
      <p>三分钟短片：增量与差商、早期微积分的基础争论、三次数学危机，以及现代误差保证。</p>
      <p>片后思考：受到质疑的是计算结果、运算对象，还是推理依据？怎样在h≠0的前提下得到确定结果？</p>
      <small>可在课程资源中播放；备课PDF保留讨论问题，完整文献与分镜见短片来源清单。</small>
    </div>
  </div>;
}

export function HistoryFilmControls({ pageKey, values, onPatch }: { pageKey:string; values:SlideInteractionValues; onPatch?:(patch:SlideInteractionValues)=>void }) {
  const el=()=>document.getElementById(pageKey+'-film') as HTMLVideoElement|null;
  const time=Number(values.filmTime??0),playing=values.filmPlaying===true;
  return <section className="em-film-controls" aria-label="短片播放控制">
    <div><button type="button" onClick={()=>{const v=el();if(!v)return;if(v.paused)void v.play().catch(()=>{});else v.pause();}}>{playing?'暂停短片':'播放短片'}</button>
      <button type="button" onClick={()=>{const v=el();if(v){v.pause();v.currentTime=0;}onPatch?.({filmTime:0,filmPlaying:false});}}>回到片头</button><output>{Math.floor(time/60)}:{String(time%60).padStart(2,'0')} / 3:00</output></div>
    <label>短片进度<input aria-label="短片进度" type="range" min="0" max="180" step="1" value={time} onChange={event=>{const t=Number(event.target.value),v=el();if(v)v.currentTime=t;onPatch?.({filmTime:t});}}/></label>
    <label>短片音量<input aria-label="短片音量" type="range" min="0" max="100" step="1" value={Number(values.filmVolume??100)} onChange={event=>onPatch?.({filmVolume:Number(event.target.value)})}/><output>{Number(values.filmVolume??100)}%</output></label>
    <label><input type="checkbox" checked={values.filmMuted===true} onChange={event=>onPatch?.({filmMuted:event.target.checked})}/>静音</label>
    <p>F 播放或暂停 · 离开本页自动暂停 · 学生端只读、静音跟随</p>
  </section>;
}
