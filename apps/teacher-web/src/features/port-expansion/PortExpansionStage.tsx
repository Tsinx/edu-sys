import {usePortAutoplay} from '../classroom/usePortAutoplay';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {EXPANSION_DEFAULT,expansionStateValid,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';
import {SlideViewport} from '../classroom/SlideViewport';
import {ClassroomPlaybackSlot} from '../classroom/ClassroomPlaybackSlot';
import {PortExpansionComposition} from './PortExpansionComposition';
export const PortExpansionControls=createContext<{scope:string;initial?:(ExpansionPresentation&{slideKey:string})|null;onChange?:(key:string,state:ExpansionPresentation)=>void}>({scope:'reading'});
export function PortExpansionStage(props:{page:PortExpansionPage;readOnly?:boolean;state?:ExpansionPresentation}){const host=useContext(PortExpansionControls);return <Playback key={`${host.scope}:${props.page.slideKey}:${!!props.readOnly}`} {...props}/>;}
function Playback({page,readOnly=true,state:controlled}:{page:PortExpansionPage;readOnly?:boolean;state?:ExpansionPresentation}){
 const host=useContext(PortExpansionControls),slot=useContext(ClassroomPlaybackSlot),key=`port-expansion:${host.scope}:${page.slideKey}`;
 const [state,setState]=useState<ExpansionPresentation>(()=>{
  if(!readOnly&&host.initial?.slideKey===page.slideKey&&expansionStateValid(page,host.initial))return host.initial;
  if(!readOnly)try{const value=JSON.parse(sessionStorage.getItem(key)??'null');if(expansionStateValid(page,value))return value;}catch{/* Optional persistence. */}
  return {...EXPANSION_DEFAULT,progress:readOnly?1:0};
 }),[playing,setPlaying]=useState(false),current=useRef(state),callback=useRef(host.onChange);current.current=state;callback.current=host.onChange;
 const update=useCallback((v:ExpansionPresentation)=>{current.current=v;setState(v);},[]);
 useEffect(()=>{if(!readOnly){callback.current?.(page.slideKey,state);try{sessionStorage.setItem(key,JSON.stringify(state));}catch{/* Optional persistence. */}}},[state,readOnly,key,page.slideKey]);
 useEffect(()=>{if(readOnly||!playing)return;let frame=0,last=0;const tick=(now:number)=>{if(last)update({...current.current,progress:Math.min(1,current.current.progress+(now-last)/12000)});last=now;if(current.current.progress<1)frame=requestAnimationFrame(tick);else setPlaying(false);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,readOnly,update]);
 const cancel=usePortAutoplay(!readOnly,()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches){update({...current.current,progress:1});return;}if(current.current.progress>=1)update({...current.current,progress:0});setPlaying(true);});
 const jump=(progress:number)=>{cancel();setPlaying(false);update({...current.current,progress});};
 const play=()=>{cancel();if(matchMedia('(prefers-reduced-motion: reduce)').matches){jump(1);return;}if(current.current.progress>=1)update({...current.current,progress:0});setPlaying(v=>!v);};
 const next=()=>jump(Math.min(1,(Math.floor(current.current.progress*6+1e-6)+1)/6));
 useEffect(()=>{if(readOnly)return;const handler=(e:KeyboardEvent)=>{if(e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('input,select,button,a,textarea'))return;if(e.code==='Space'){e.preventDefault();play();}if(e.key==='.'){e.preventDefault();next();}};addEventListener('keydown',handler);return()=>removeEventListener('keydown',handler);});
 const shown=controlled&&expansionStateValid(page,controlled)?controlled:state;
 const controls=readOnly?null:<div className="pe-playback" aria-label={`第${page.lesson}讲播放控制`}><button onClick={play}>{playing?'暂停':'播放'}</button><button onClick={()=>{jump(0);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setPlaying(true);}}>重播</button><button onClick={next}>下一幕</button><input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(state.progress*1000)} onChange={e=>jump(Number(e.target.value)/1000)}/><output>{Math.round(state.progress*100)}%</output><button onClick={()=>jump(1)}>全景</button>{page.options&&<select aria-label="演示选项" value={state.option} onChange={e=>{cancel();setPlaying(false);update({...current.current,option:Number(e.target.value),revealed:false});}}>{page.options.map((o,i)=><option key={o} value={i}>{o}</option>)}</select>}{page.reveal&&<button onClick={()=>{cancel();setPlaying(false);update({...current.current,progress:1,revealed:!current.current.revealed});}}>{state.revealed?'收起解析':'揭示解析'}</button>}</div>;
 return <section className="pe-stage"><SlideViewport label={`第${page.lesson}讲 · ${page.localPage}/48`}><PortExpansionComposition page={page} state={shown}/></SlideViewport>{slot&&controls?createPortal(controls,slot):controls}</section>;
}
