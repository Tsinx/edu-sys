import { useEffect, useRef, useState } from "react";
import type { PortLblPage } from "../../../../../packages/course-content/src/port-lbl";
import { SlideViewport } from "../classroom/SlideViewport";
import { LblPlayback } from "./PortLblPrimitives";
import { PortLblLessonTwo } from "./PortLblLessonTwo";
import { PortLblLessonThree } from "./PortLblLessonThree";

// Returning to a page restores its frame, always paused; this needs no server.
const frames=new Map<string,number>();
export function PortLblStage({page,readOnly=true,projection=false}:{page:PortLblPage;readOnly?:boolean;projection?:boolean}) {
  const [progress,setProgress]=useState(()=>readOnly?1:frames.get(page.slideKey)??1);
  const [playing,setPlaying]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const current=useRef(progress);
  current.current=progress;
  const duration=page.lesson===2 && [3,18,24,31,36,43].includes(page.localPage)?24000:16000;
  useEffect(()=>{if(!readOnly)frames.set(page.slideKey,progress);},[page.slideKey,progress,readOnly]);
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
      if(event.code==="Space"){event.preventDefault();if(current.current>=1)setProgress(0);setPlaying(value=>!value);}
      if(event.key.toLowerCase()==="r"){setProgress(0);setPlaying(true);}
      if(event.key.toLowerCase()==="f"){setProgress(1);setPlaying(false);}
      if(event.key==="."){setProgress(Math.min(1,Math.floor(current.current*4+1.001)/4));setPlaying(false);}
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[readOnly]);
  const jump=(next:number)=>{setPlaying(false);setProgress(next);};
  return <section className={`lbl-stage${readOnly||projection?"":" lbl-stage--teacher"}`}>
    <LblPlayback.Provider value={{progress:readOnly?1:progress,playing:!readOnly&&playing,reducedMotion}}>
      <SlideViewport label={page.title}>{page.lesson===2?<PortLblLessonTwo page={page}/>:<PortLblLessonThree page={page}/>}</SlideViewport>
    </LblPlayback.Provider>
    {!readOnly&&!projection&&<div className="lbl-controls" aria-label="教师动画控制">
      <button onClick={()=>{if(progress>=1)setProgress(0);setPlaying(!playing);}}>{playing?"暂停":"播放"}</button>
      <button onClick={()=>{setProgress(0);setPlaying(true);}}>重播</button>
      <button onClick={()=>jump(Math.min(1,Math.floor(progress*4+1.001)/4))} disabled={progress>=1}>下一幕</button>
      <input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={event=>jump(Number(event.target.value)/1000)}/>
      <output>{Math.round(progress*100)}%</output><button onClick={()=>jump(1)}>全景</button><span>教师控制 · 不自动翻页</span>
    </div>}
  </section>;
}
