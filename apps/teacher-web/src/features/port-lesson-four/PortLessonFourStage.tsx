import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PortDemoCueId, PortLessonFourPage } from '@edu/course-content';
import { SlideViewport } from '../classroom/SlideViewport';
import { ClassroomPlaybackSlot } from '../classroom/ClassroomPlaybackSlot';
import { PortLessonFourComposition } from './PortLessonFourComposition';

export const PortLessonFourControls = createContext<{scope:string;openDemo?:(cueId:PortDemoCueId)=>void;onProgress?:(key:string,p:number)=>void}>({scope:'preview'});
const remembered = new Map<string,number>();
function readProgress(key:string) { if(remembered.has(key)) return remembered.get(key); try { const value=sessionStorage.getItem(key); if(value!==null){const n=Number(value);if(Number.isFinite(n)&&n>=0&&n<=1)return n;} }catch{} return undefined; }
export function PortLessonFourStage({page,readOnly=true,progress,onProgress}:{page:PortLessonFourPage;readOnly?:boolean;progress?:number;onProgress?:(p:number)=>void}) {
  return <Playback key={page.slideKey+':'+readOnly} page={page} readOnly={readOnly} progress={progress} onProgress={onProgress}/>;
}
function Playback({page,readOnly,progress:controlled,onProgress}:{page:PortLessonFourPage;readOnly:boolean;progress?:number;onProgress?:(p:number)=>void}) {
  const host=useContext(PortLessonFourControls), slot=useContext(ClassroomPlaybackSlot);
  const cacheKey='port-l4:motion:'+host.scope+':'+page.slideKey;
  const restored=useRef(readProgress(cacheKey)!==undefined);
  const [progress,setProgress]=useState(()=>readOnly?1:page.animationSeconds?(readProgress(cacheKey)??0):1);
  const [playing,setPlaying]=useState(false);
  const [reduced,setReduced]=useState(false);
  const value=useRef(progress);value.current=progress;
  const report=useRef(onProgress??((p:number)=>host.onProgress?.(page.slideKey,p)));report.current=onProgress??((p:number)=>host.onProgress?.(page.slideKey,p));
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const cancel=useCallback(()=>{if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}},[]);
  const write=useCallback((p:number)=>{value.current=p;setProgress(p);remembered.set(cacheKey,p);report.current?.(p);},[cacheKey]);
  useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>{setReduced(q.matches);if(q.matches&&!readOnly){cancel();setPlaying(false);write(1);}};changed();q.addEventListener('change',changed);return()=>q.removeEventListener('change',changed);},[readOnly,cancel,write]);
  useEffect(()=>{if(readOnly||!page.animationSeconds||restored.current)return;timer.current=setTimeout(()=>{timer.current=null;setPlaying(true);},1000);return cancel;},[readOnly,page.animationSeconds,cacheKey,cancel]);
  useEffect(()=>{if(!playing||readOnly||!page.animationSeconds)return;let frame=0,last=0;const tick=(now:number)=>{if(last)write(Math.min(1,value.current+(now-last)/(page.animationSeconds!*1000)));last=now;if(value.current<1)frame=requestAnimationFrame(tick);else setPlaying(false);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,readOnly,page.animationSeconds,write]);
  useEffect(()=>{
    const save=()=>{if(!readOnly){remembered.set(cacheKey,value.current);try{sessionStorage.setItem(cacheKey,String(value.current));}catch{}}};
    // A full-page experiment navigation does not run React's unmount cleanup.
    window.addEventListener('pagehide',save);
    return()=>{window.removeEventListener('pagehide',save);save();};
  },[cacheKey,readOnly]);
  useEffect(()=>{if(!readOnly)report.current?.(value.current);},[page.slideKey,readOnly]);
  const jump=(p:number)=>{cancel();setPlaying(false);write(p);};
  const start=()=>{cancel();if(value.current>=1)write(0);setPlaying(v=>!v);};
  useEffect(()=>{if(readOnly||!page.animationSeconds)return;const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,select,button,a')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();cancel();if(value.current>=1)write(0);setPlaying(v=>!v);}if(e.key==='r'){cancel();write(0);setPlaying(true);}if(e.key==='f'){cancel();setPlaying(false);write(1);}if(e.key==='.'){cancel();setPlaying(false);write(Math.min(1,(Math.floor(value.current*4)+1)/4));}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[readOnly,page.animationSeconds,cancel,write]);
  const controls=!readOnly&&page.animationSeconds?<div className="l4-playback" aria-label="动画播放控制"><button onClick={start}>{playing?'暂停':'播放'}</button><button onClick={()=>{cancel();write(0);setPlaying(true);}}>重播</button><button onClick={()=>jump(Math.min(1,(Math.floor(value.current*4)+1)/4))}>下一幕</button><input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(progress*1000)} onPointerDown={()=>{cancel();setPlaying(false);}} onChange={e=>jump(Number(e.target.value)/1000)}/><output>{Math.round(progress*100)}%</output><button onClick={()=>jump(1)}>全景</button></div>:null;
  return <section className="l4-stage"><SlideViewport label={'第4讲 · '+page.localPage+'/44 · '+page.title}><PortLessonFourComposition page={page} p={reduced?1:controlled??(readOnly?1:progress)} readOnly={readOnly} onOpen={host.openDemo}/></SlideViewport>{slot&&controls?createPortal(controls,slot):controls}</section>;
}
