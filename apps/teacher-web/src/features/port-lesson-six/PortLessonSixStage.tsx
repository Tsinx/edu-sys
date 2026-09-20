import {PortLessonSixFilmPlayback} from './PortLessonSixFilmPlayback';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LESSON_SIX_DEFAULT, lessonSixStateValid, type LessonSixPresentation, type PortLessonSixPage } from '@edu/course-content';
import { SlideViewport } from '../classroom/SlideViewport';
import { ClassroomPlaybackSlot } from '../classroom/ClassroomPlaybackSlot';
import { PortLessonSixComposition } from './PortLessonSixComposition';
import {LessonSixGlobeControls} from './PortLessonSixGlobe';
import {lessonSixCamera} from './lesson-six-geography';
export const PortLessonSixControls=createContext<{scope:string;audioRole?:'teacher'|'projection'|'student';initial?:LessonSixPresentation&{slideKey:string}|null;onChange?:(key:string,value:LessonSixPresentation)=>void}>({scope:'reading'});
export function PortLessonSixStage(props:{page:PortLessonSixPage;readOnly?:boolean;state?:LessonSixPresentation}){
  const host=useContext(PortLessonSixControls);
  if(props.page.visual==='map')return <PortLessonSixFilmPlayback key={`${host.scope}:${props.page.slideKey}`} host={host} {...props}/>;
  return <Playback key={`${host.scope}:${props.page.slideKey}:${!!props.readOnly}`} {...props}/>;
}
function Playback({page,readOnly=false,state:controlled}:{page:PortLessonSixPage;readOnly?:boolean;state?:LessonSixPresentation}){
  const host=useContext(PortLessonSixControls),slot=useContext(ClassroomPlaybackSlot),storageKey=`port-l6:${host.scope}:${page.slideKey}`;
  const [state,setState]=useState<LessonSixPresentation>(()=>{
    if(host.initial?.slideKey===page.slideKey&&lessonSixStateValid(page,host.initial))return host.initial;
    if(!readOnly)try{const saved=JSON.parse(sessionStorage.getItem(storageKey)??'null');if(saved&&lessonSixStateValid(page,saved))return saved;}catch{/* storage may be unavailable */}
    return {...LESSON_SIX_DEFAULT,progress:/^(reading|study:|browse:|student:)/.test(host.scope)?1:0};
  });
  const [playing,setPlaying]=useState(false),current=useRef(state),callback=useRef(host.onChange);current.current=state;callback.current=host.onChange;
  const update=useCallback((next:LessonSixPresentation)=>{current.current=next;setState(next);},[]);
  useEffect(()=>{if(!readOnly){callback.current?.(page.slideKey,state);try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{/* optional local persistence */}}} ,[state,readOnly,storageKey,page.slideKey]);
  useEffect(()=>{
    if(readOnly||!playing)return;
    let frame=0,last=0;
    const tick=(now:number)=>{if(last)update({...current.current,progress:Math.min(1,current.current.progress+(now-last)/12000)});last=now;if(current.current.progress<1)frame=requestAnimationFrame(tick);else setPlaying(false);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[readOnly,playing,update]);
  const jump=(progress:number)=>{setPlaying(false);update({...current.current,progress});};
  const play=()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches){jump(1);return;}if(current.current.progress>=1)update({...current.current,progress:0});setPlaying(v=>!v);};
  const stepCount=page.visual==='map'&&page.localPage!==26?4:page.points.length;
  const next=()=>jump(Math.min(1,(Math.floor(current.current.progress*stepCount+1e-6)+1)/stepCount));
  useEffect(()=>{
    if(readOnly)return;
    const onKey=(event:KeyboardEvent)=>{if(event.ctrlKey||event.altKey||event.metaKey||(event.target as HTMLElement).closest('input,select,textarea,button,a'))return;if(event.code==='Space'){event.preventDefault();play();}if(event.key==='.'){event.preventDefault();next();}};
    addEventListener('keydown',onKey);return()=>removeEventListener('keydown',onKey);
  });
  const shown=controlled??(readOnly?{...LESSON_SIX_DEFAULT,progress:1}:state);
  const controls=!readOnly?<div className="l6-playback" aria-label="第6讲播放与揭示控制">
    <button onClick={play}>{playing?'暂停':'播放'}</button><button onClick={()=>{jump(0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setPlaying(true);}}>重播</button><button onClick={next}>下一幕</button>
    <input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(state.progress*1000)} onChange={e=>jump(Number(e.target.value)/1000)}/><output>{Math.round(state.progress*100)}%</output><button onClick={()=>jump(1)}>全景</button>
    {page.options&&<select aria-label="演示选项" value={state.option} onChange={e=>{setPlaying(false);update({...current.current,option:Number(e.target.value),revealed:false,camera:undefined});}}>{page.options.map((text,index)=><option key={text} value={index}>{text}</option>)}</select>}
    {page.visual==='map'&&<><button onClick={()=>update({...current.current,camera:{latitude:30,longitude:110,distance:3.1}})}>地球全貌</button><button onClick={()=>update({...current.current,camera:lessonSixCamera(page.localPage,state.option)})}>回到案例</button><span className="l6-globe-help">拖动旋转 · 滚轮缩放</span></>}
    {page.reveal&&<button onClick={()=>{setPlaying(false);update({...current.current,progress:1,revealed:!state.revealed});}}>{state.revealed?'收起解析':'揭示解析'}</button>}
  </div>:null;
  return <LessonSixGlobeControls.Provider value={{readOnly,onCameraChange:camera=>{setPlaying(false);update({...current.current,camera});}}}><section className="l6-stage"><SlideViewport label={`第6讲 · ${page.localPage}/48`}><PortLessonSixComposition page={page} state={shown}/></SlideViewport>{slot&&controls?createPortal(controls,slot):controls}</section></LessonSixGlobeControls.Provider>;
}
