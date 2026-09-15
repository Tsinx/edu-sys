import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PORT_LESSON_FOUR_SLIDES, type PortDemoCueId } from '@edu/course-content';
import { PortLessonFourStage, PortLessonFourControls } from './features/port-lesson-four/PortLessonFourStage';
import { lessonFourExperimentUrl } from './features/port-lesson-four/experiment-navigation';
import { PortLessonFourTeacherGuide } from './features/port-lesson-four/PortLessonFourTeacherGuide';
import './features/port-lesson-four/port-lesson-four.css';
const params=new URLSearchParams(location.search);
const safePage=(n:number)=>Number.isInteger(n)?Math.max(1,Math.min(44,n)):1;
function Preview(){
  const [localPage,setPage]=useState(safePage(Number(params.get('page')??1)));
  const [projection,setProjection]=useState(params.get('projection')==='1');
  const [channelId]=useState(()=>params.get('channel')??'lecture-four-preview');
  const [progress,setProgress]=useState(1);
  const channel=useRef<BroadcastChannel|null>(null);
  const current=useRef({localPage,progress});current.current={localPage,progress};
  const follower=params.get('projection')==='1';
  const send=(data:unknown)=>channel.current?.postMessage(data);
  useEffect(()=>{
    if(typeof BroadcastChannel==='undefined')return;
    const c=new BroadcastChannel('port-l4:'+channelId);channel.current=c;
    c.onmessage=({data})=>{
      if(follower&&data?.type==='state'){setPage(safePage(data.localPage));setProgress(data.progress);}
      if(follower&&data?.type==='progress'){setProgress(data.progress);}
      if(!follower&&data?.type==='ready')c.postMessage({type:'state',...current.current});
    };
    if(follower)c.postMessage({type:'ready'});
    return()=>{channel.current=null;c.close();};
  },[channelId,follower]);
  useEffect(()=>{
    const url=new URL(location.href);url.searchParams.set('page',String(localPage));history.replaceState(null,'',url);
    if(!follower)send({type:'state',...current.current});
  },[localPage,follower]);
  const go=(n:number)=>{setPage(safePage(n));};
  useEffect(()=>{
    if(follower)return;
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).closest('input,select,button,textarea,a')||e.ctrlKey||e.metaKey||e.altKey)return;
      if((e.key==='ArrowRight'||e.key==='PageDown')){e.preventDefault();go(localPage+1);}
      if((e.key==='ArrowLeft'||e.key==='PageUp')){e.preventDefault();go(localPage-1);}
      if(e.key==='Escape'){setProjection(false);}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[follower,localPage]);
  const page=PORT_LESSON_FOUR_SLIDES[localPage-1]!;
  const open=(cueId:PortDemoCueId)=>{window.location.assign(lessonFourExperimentUrl(cueId,location.pathname+location.search,channelId));};
  const motion=(p:number)=>{setProgress(p);if(!follower)send({type:'progress',progress:p});};
  return <PortLessonFourControls.Provider value={{scope:channelId,openDemo:open}}><main className={'port-l4-preview'+(projection?' port-l4-preview--projection':'')}>
    {!projection&&<nav className="port-l4-preview-bar" aria-label="教师翻页控制"><strong>第4讲 · 港口物流实验课</strong><button disabled={localPage===1} onClick={()=>go(localPage-1)}>上一页</button><select aria-label="第4讲课件页" value={localPage} onChange={e=>go(Number(e.target.value))}>{PORT_LESSON_FOUR_SLIDES.map(p=><option key={p.slideKey} value={p.localPage}>{p.localPage} / 44 · {p.title.replaceAll('\n','')}</option>)}</select><button disabled={localPage===44} onClick={()=>go(localPage+1)}>下一页</button><button onClick={()=>setProjection(true)}>本屏投影</button><a target="_blank" rel="noreferrer" href={'/port-lesson-four-preview.html?page='+localPage+'&projection=1&channel='+encodeURIComponent(channelId)}>另开同步投影 ↗</a></nav>}
    <div className="port-l4-preview-body"><PortLessonFourStage page={page} readOnly={projection} progress={projection?progress:undefined} onProgress={motion}/>{!projection&&<PortLessonFourTeacherGuide page={page} onPage={go} onOpen={open}/>}</div>
  </main></PortLessonFourControls.Provider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview/></StrictMode>);
