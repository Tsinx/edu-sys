import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, RotateCcw, SkipForward, Scan } from "lucide-react";
import { ClassroomPlaybackSlot } from "../classroom/ClassroomPlaybackSlot";
import type { PortLblPage } from "../../../../../packages/course-content/src/port-lbl";
import { SlideViewport } from "../classroom/SlideViewport";
import { LblPlayback } from "./PortLblPrimitives";
import { PortLblLessonTwo } from "./PortLblLessonTwo";
import { PortLblLessonThree } from "./PortLblLessonThree";

export function PortLblStage({page,readOnly=true,projection=false}:{page:PortLblPage;readOnly?:boolean;projection?:boolean}) {
  return <PortLblPlaybackStage key={`${page.slideKey}:${readOnly}`} page={page} readOnly={readOnly} projection={projection}/>;
}

function PortLblPlaybackStage({page,readOnly,projection}:{page:PortLblPage;readOnly:boolean;projection:boolean}) {
  const controlsTarget=useContext(ClassroomPlaybackSlot);
  const [progress,setProgress]=useState(readOnly?1:0);
  const [playing,setPlaying]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const autoPlayTimer=useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAutoPlay=useCallback(()=>{
    if(autoPlayTimer.current!==null){clearTimeout(autoPlayTimer.current);autoPlayTimer.current=null;}
  },[]);
  const current=useRef(progress);
  current.current=progress;
  const duration=page.lesson===2 && [3,18,24,31,36,43].includes(page.localPage)?24000:16000;
  // Each page entry starts at its initial frame; manual controls take over the timer.
  // Read-only previews and exports retain the complete static composition.
  useEffect(()=>{
    if(readOnly)return;
    autoPlayTimer.current=setTimeout(()=>{autoPlayTimer.current=null;setPlaying(true);},5000);
    return cancelAutoPlay;
  },[readOnly,cancelAutoPlay]);
  useEffect(()=>{
    const query=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReducedMotion(query.matches);update();
    query.addEventListener("change",update);return()=>query.removeEventListener("change",update);
  },[]);
  useEffect(()=>{
    if(!playing || readOnly)return;
    let frame=0;let previous=0;
    const tick=(now:number)=>{
      if(previous){current.current=Math.min(1,current.current+(now-previous)/duration);setProgress(current.current);}
      previous=now;
      if(current.current<1)frame=requestAnimationFrame(tick);else setPlaying(false);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,readOnly,duration]);
  useEffect(()=>{
    if(readOnly)return;
    const key=(event:KeyboardEvent)=>{
      if((event.target as HTMLElement).closest("input,select,textarea,button"))return;
      if(event.code==="Space"){event.preventDefault();cancelAutoPlay();if(current.current>=1)setProgress(0);setPlaying(value=>!value);}
      if(event.key.toLowerCase()==="r"){cancelAutoPlay();setProgress(0);setPlaying(true);}
      if(event.key.toLowerCase()==="f"){cancelAutoPlay();setProgress(1);setPlaying(false);}
      if(event.key==="."){cancelAutoPlay();setProgress(Math.min(1,Math.floor(current.current*4+1.001)/4));setPlaying(false);}
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[readOnly,cancelAutoPlay]);
  const jump=(next:number)=>{cancelAutoPlay();setPlaying(false);setProgress(next);};
  const controls=!readOnly&&!projection?<div className={`lbl-controls${controlsTarget?" lbl-controls--integrated":""}`} role="group" aria-label="教师动画控制">
    <button type="button" aria-label={playing?"暂停":"播放"} title={playing?"暂停（空格）":"播放（空格）"} onClick={()=>{cancelAutoPlay();if(progress>=1)setProgress(0);setPlaying(!playing);}}>{playing?<Pause size={17}/>:<Play size={17}/>}<span>{playing?"暂停":"播放"}</span></button>
    <button type="button" aria-label="重播" title="重播（R）" onClick={()=>{cancelAutoPlay();setProgress(0);setPlaying(true);}}><RotateCcw size={17}/><span>重播</span></button>
    <button type="button" aria-label="下一幕" title="下一幕（.）" onClick={()=>jump(Math.min(1,Math.floor(progress*4+1.001)/4))} disabled={progress>=1}><SkipForward size={17}/><span>下一幕</span></button>
    <input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={event=>jump(Number(event.target.value)/1000)}/>
    <output>{Math.round(progress*100)}%</output>
    <button type="button" aria-label="全景" title="显示完整画面（F）" onClick={()=>jump(1)}><Scan size={17}/><span>全景</span></button>
  </div>:null;
  return <section className={`lbl-stage${readOnly||projection||controlsTarget?"":" lbl-stage--teacher"}`}>
    <LblPlayback.Provider value={{progress:readOnly?1:progress,playing:!readOnly&&playing,reducedMotion}}>
      <SlideViewport label={page.title}>{page.lesson===2?<PortLblLessonTwo page={page}/>:<PortLblLessonThree page={page}/>}</SlideViewport>
    </LblPlayback.Provider>
    {controlsTarget&&controls?createPortal(controls,controlsTarget):controls}
  </section>;
}
