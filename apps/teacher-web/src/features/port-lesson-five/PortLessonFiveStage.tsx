import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PortLessonFivePage, LessonFivePlan } from '@edu/course-content';
import { SlideViewport } from '../classroom/SlideViewport';
import { ClassroomPlaybackSlot } from '../classroom/ClassroomPlaybackSlot';
import { PortLessonFiveComposition } from './PortLessonFiveComposition';
export interface LessonFivePresentation {progress:number;revealed:boolean}
export const PortLessonFiveControls=createContext<{scope:string;openExperiment?:(id:LessonFivePlan,personal?:boolean)=>void;onChange?:(key:string,state:LessonFivePresentation)=>void}>({scope:'preview'});
function load(key:string):LessonFivePresentation|undefined {try{const v=JSON.parse(sessionStorage.getItem(key)??'null');if(v&&Number.isFinite(v.progress)&&v.progress>=0&&v.progress<=1&&typeof v.revealed==='boolean')return v;}catch{}return undefined;}
export function PortLessonFiveStage(props:{page:PortLessonFivePage;readOnly?:boolean;state?:LessonFivePresentation;onChange?:(key:string,state:LessonFivePresentation)=>void}) {return <Playback key={props.page.slideKey+':'+!!props.readOnly} {...props}/>;}
function Playback({page,readOnly=true,state:controlled,onChange}:{page:PortLessonFivePage;readOnly?:boolean;state?:LessonFivePresentation;onChange?:(key:string,state:LessonFivePresentation)=>void}) {
 const host=useContext(PortLessonFiveControls),slot=useContext(ClassroomPlaybackSlot),key=`port-l5:presentation:${host.scope}:${page.slideKey}`;
 const [saved]=useState(()=>readOnly?undefined:load(key));
 const [state,setState]=useState<LessonFivePresentation>(()=>saved??{progress:page.animationSeconds?0:1,revealed:false});
 const [playing,setPlaying]=useState(false),[reduced,setReduced]=useState(false);
 const current=useRef(state);current.current=state;
 const callback=useRef(onChange??host.onChange);callback.current=onChange??host.onChange;
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancel=useCallback(()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;},[]);
 const update=useCallback((next:LessonFivePresentation)=>{current.current=next;setState(next);callback.current?.(page.slideKey,next);},[page.slideKey]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{setReduced(media.matches);if(media.matches&&!readOnly){cancel();setPlaying(false);update({...current.current,progress:1});}};change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[readOnly,cancel,update]);
 useEffect(()=>{if(readOnly)return;callback.current?.(page.slideKey,current.current);if(page.autoPlay&&page.animationSeconds&&!saved&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer.current=setTimeout(()=>setPlaying(true),1000);return cancel;},[page.slideKey,readOnly,page.animationSeconds,saved,cancel]);
 useEffect(()=>{if(readOnly||!playing||!page.animationSeconds)return;let frame=0,last=0;const tick=(now:number)=>{if(last)update({...current.current,progress:Math.min(1,current.current.progress+(now-last)/(page.animationSeconds!*1000))});last=now;if(current.current.progress<1)frame=requestAnimationFrame(tick);else setPlaying(false);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,readOnly,page.animationSeconds,update]);
 useEffect(()=>{const save=()=>{if(!readOnly)try{sessionStorage.setItem(key,JSON.stringify(current.current));}catch{}};addEventListener('pagehide',save);return()=>{removeEventListener('pagehide',save);save();};},[key,readOnly]);
 const jump=(p:number)=>{cancel();setPlaying(false);update({...current.current,progress:p});};
 const toggle=()=>{cancel();if(current.current.progress>=1)update({...current.current,progress:0});setPlaying(v=>!v);};
 useEffect(()=>{if(readOnly)return;const keydown=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,textarea,button,a')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'&&page.animationSeconds){e.preventDefault();toggle();}if(e.key==='r'&&page.animationSeconds){cancel();update({...current.current,progress:0});setPlaying(true);}if(e.key==='f')jump(1);if(e.key==='.'&&page.animationSeconds)jump(Math.min(1,(Math.floor(current.current.progress*4)+1)/4));};addEventListener('keydown',keydown);return()=>removeEventListener('keydown',keydown);});
 const shown=controlled??(readOnly?{progress:1,revealed:false}:state);
 const controls=!readOnly&&(page.animationSeconds||page.reveal)?<div className="l5-playback" aria-label="第5讲播放与揭示控制">{page.animationSeconds&&<><button onClick={toggle}>{playing?'暂停':'播放'}</button><button onClick={()=>{cancel();update({...current.current,progress:0});setPlaying(true);}}>重播</button><button onClick={()=>jump(Math.min(1,(Math.floor(state.progress*4)+1)/4))}>下一幕</button><input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(state.progress*1000)} onChange={e=>jump(Number(e.target.value)/1000)}/><output>{Math.round(state.progress*100)}%</output><button onClick={()=>jump(1)}>全景</button></>}{page.reveal&&<button onClick={()=>update({...current.current,revealed:!state.revealed})}>{state.revealed?'收起解析':'揭示解析'}</button>}</div>:null;
 return <section className="l5-stage"><SlideViewport label={`第5讲 · ${page.localPage}/48`}><PortLessonFiveComposition page={page} p={reduced?1:shown.progress} revealed={shown.revealed} readOnly={readOnly} onOpen={host.openExperiment}/></SlideViewport>{slot&&controls?createPortal(controls,slot):controls}</section>;
}
