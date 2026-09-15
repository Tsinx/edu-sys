import { StrictMode, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PORT_LESSON_FOUR_SLIDES, getPortLessonFourDemo, type PortDemoCueId } from '@edu/course-content';
import type { PortView } from '@edu/port-simulation-core';
import { PortLessonFourStage, PortLessonFourControls } from './features/port-lesson-four/PortLessonFourStage';
import { PortLessonFourDemoHost } from './features/port-lesson-four/PortLessonFourDemoHost';
import { PortLessonFourTeacherGuide } from './features/port-lesson-four/PortLessonFourTeacherGuide';
import './features/port-lesson-four/port-lesson-four.css';
import './features/port-simulation/terminal-studio.css';
import './features/port-simulation/port-operations.css';
const Scene=lazy(()=>import('./features/port-simulation/PortOperationsScene').then(m=>({default:m.PortOperationsScene})));
const params=new URLSearchParams(location.search);
const safePage=(n:number)=>Number.isInteger(n)?Math.max(1,Math.min(44,n)):1;
type Frame={view:PortView;speed:number};
function Preview(){
  const [localPage,setPage]=useState(safePage(Number(params.get('page')??1)));
  const [projection,setProjection]=useState(params.get('projection')==='1');
  const [channelId]=useState(()=>params.get('channel')??'lecture-four-preview');
  const [demo,setDemo]=useState<{cueId:PortDemoCueId;runId:string}|null>(()=>{try{const saved=JSON.parse(sessionStorage.getItem('port-l4:preview-navigation:'+channelId)??'null');return params.get('projection')!=='1'&&saved?.page===localPage&&getPortLessonFourDemo(saved?.demo?.cueId)&&typeof saved.demo.runId==='string'?saved.demo:null;}catch{return null;}});
  const [frame,setFrame]=useState<Frame|null>(null);
  const [progress,setProgress]=useState(1);
  const channel=useRef<BroadcastChannel|null>(null);
  const current=useRef({localPage,progress,demo,frame});current.current={localPage,progress,demo,frame};
  const follower=params.get('projection')==='1';
  const send=(data:unknown)=>channel.current?.postMessage(data);
  useEffect(()=>{
    if(typeof BroadcastChannel==='undefined')return;
    const c=new BroadcastChannel('port-l4:'+channelId);channel.current=c;
    c.onmessage=({data})=>{
      if(follower&&data?.type==='state'){setPage(safePage(data.localPage));setProgress(data.progress);setDemo(data.demo);setFrame(data.frame);}
      if(follower&&data?.type==='progress'){setProgress(data.progress);}
      if(follower&&data?.type==='frame'){setFrame(data.frame);}
      if(!follower&&data?.type==='ready')c.postMessage({type:'state',...current.current});
    };
    if(follower)c.postMessage({type:'ready'});
    return()=>{channel.current=null;c.close();};
  },[channelId,follower]);
  useEffect(()=>{
    const url=new URL(location.href);url.searchParams.set('page',String(localPage));history.replaceState(null,'',url);
    if(!follower)send({type:'state',...current.current});
  },[localPage,demo,follower]);
  const go=(n:number)=>{setDemo(null);setFrame(null);setPage(safePage(n));};
  useEffect(()=>{
    if(follower)return;
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).closest('input,select,button,textarea,a')||e.ctrlKey||e.metaKey||e.altKey)return;
      if(!demo&&(e.key==='ArrowRight'||e.key==='PageDown')){e.preventDefault();go(localPage+1);}
      if(!demo&&(e.key==='ArrowLeft'||e.key==='PageUp')){e.preventDefault();go(localPage-1);}
      if(e.key==='Escape'){if(demo)setDemo(null);else setProjection(false);}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[follower,demo,localPage]);
  useEffect(()=>{if(!follower)try{sessionStorage.setItem('port-l4:preview-navigation:'+channelId,JSON.stringify({page:localPage,demo}));}catch{}},[demo,localPage,channelId,follower]);
  const page=PORT_LESSON_FOUR_SLIDES[localPage-1]!;
  const open=(cueId:PortDemoCueId)=>{setFrame(null);setDemo({cueId,runId:crypto.randomUUID()});};
  const motion=(p:number)=>{setProgress(p);if(!follower)send({type:'progress',progress:p});};
  return <PortLessonFourControls.Provider value={{scope:channelId,openDemo:open}}><main className={'port-l4-preview'+(projection?' port-l4-preview--projection':'')}>
    {!projection&&<nav className="port-l4-preview-bar" aria-label="教师翻页控制"><strong>第4讲 · 港口物流实验课</strong><button disabled={localPage===1} onClick={()=>go(localPage-1)}>上一页</button><select aria-label="第4讲课件页" value={localPage} onChange={e=>go(Number(e.target.value))}>{PORT_LESSON_FOUR_SLIDES.map(p=><option key={p.slideKey} value={p.localPage}>{p.localPage} / 44 · {p.title.replaceAll('\n','')}</option>)}</select><button disabled={localPage===44} onClick={()=>go(localPage+1)}>下一页</button><button onClick={()=>setProjection(true)}>本屏投影</button><a target="_blank" rel="noreferrer" href={'/port-lesson-four-preview.html?page='+localPage+'&projection=1&channel='+encodeURIComponent(channelId)}>另开同步投影 ↗</a></nav>}
    <div className="port-l4-preview-body">{demo?(follower?<div className="l4-readonly-demo" inert>{frame?<Suspense fallback={<p>正在载入现场…</p>}><Scene view={frame.view} speed={frame.speed} selected="S01" onSelect={()=>{}} onContext={()=>{}} onDrop={()=>{}}/></Suspense>:<p>等待教师现场…</p>}</div>:<PortLessonFourDemoHost key={demo.runId} {...demo} scope={channelId} onReturn={()=>setDemo(null)} onFrame={(view,speed)=>{setFrame({view,speed});current.current.frame={view,speed};send({type:'frame',frame:{view,speed}});}}/>):<PortLessonFourStage page={page} readOnly={projection} progress={projection?progress:undefined} onProgress={motion}/>}{!projection&&<PortLessonFourTeacherGuide page={page} onPage={go} onOpen={open}/>}</div>
  </main></PortLessonFourControls.Provider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview/></StrictMode>);
