import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PORT_LESSON_SIX_SLIDES as pages, PORT_LESSON_SIX_TIMING as timing, LESSON_SIX_DEFAULT, lessonSixStateValid, type LessonSixPresentation } from '@edu/course-content';
import { PortLessonSixStage, PortLessonSixControls } from './features/port-lesson-six/PortLessonSixStage';
import './features/port-lesson-six/port-lesson-six.css';
import './features/globe/interactive-earth-globe.css';
const params=new URLSearchParams(location.search),safe=(n:number)=>Number.isInteger(n)?Math.max(1,Math.min(48,n)):1;
function Preview(){
  const [n,setN]=useState(safe(Number(params.get('page')??1))),[projection,setProjection]=useState(params.get('projection')==='1');
  const follower=params.get('projection')==='1',student=params.get('student')==='1',scope=(student?'student:':'teacher:')+(params.get('channel')??'lesson-six');
  const [state,setState]=useState<LessonSixPresentation>({...LESSON_SIX_DEFAULT,progress:follower?1:0}),channel=useRef<BroadcastChannel|null>(null),current=useRef({n,state});current.current={n,state};
  useEffect(()=>{
    if(student||typeof BroadcastChannel==='undefined')return;
    const c=new BroadcastChannel('port-l6:'+scope);channel.current=c;
    c.onmessage=({data})=>{
      if(follower&&data?.type==='state'&&Number.isInteger(data.n)&&pages[data.n-1]&&data.state&&lessonSixStateValid(pages[data.n-1]!,data.state)){setN(data.n);setState(data.state);}
      if(!follower&&data?.type==='ready')c.postMessage({type:'state',...current.current});
    };
    if(follower)c.postMessage({type:'ready'});
    return()=>{channel.current=null;c.close();};
  },[scope,follower,student]);
  useEffect(()=>{const u=new URL(location.href);u.searchParams.set('page',String(n));history.replaceState(null,'',u);if(!follower&&!student)channel.current?.postMessage({type:'state',...current.current});},[n,state,follower,student]);
  useEffect(()=>{if(follower)return;const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,button,textarea,a'))return;if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();setN(v=>safe(v+1));}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();setN(v=>safe(v-1));}if(e.key==='Escape')setProjection(false);};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[follower]);
  const page=pages[n-1]!,block=timing.find(t=>page.index>=t.slideStart&&page.index<=t.slideEnd)!,elapsed=timing.slice(0,timing.indexOf(block)).reduce((s,t)=>s+t.minutes,0);
  const change=(key:string,next:LessonSixPresentation)=>{if(key===pages[current.current.n-1]?.slideKey)setState(next);};
  return <PortLessonSixControls.Provider value={{scope,audioRole:projection?'projection':student?'student':'teacher',onChange:change}}><main className={'l6-preview'+(projection?' l6-preview--projection':'')+(student?' l6-preview--student':'')}>
    {!projection&&<nav className="l6-preview-bar"><strong>第6讲 · 堆场、集疏运与腹地</strong><button disabled={n===1} onClick={()=>setN(v=>v-1)}>上一页</button><select aria-label="第6讲课件页" value={n} onChange={e=>setN(Number(e.target.value))}>{pages.map(p=><option key={p.slideKey} value={p.localPage}>{p.localPage} / 48 · {p.title}</option>)}</select><button disabled={n===48} onClick={()=>setN(v=>v+1)}>下一页</button>{!student&&<><button onClick={()=>setProjection(true)}>本屏投影</button><a href={`/port-lesson-six-preview.html?page=${n}&projection=1&channel=${encodeURIComponent(params.get('channel')??'lesson-six')}`} target="_blank" rel="noreferrer">另开同步投影 ↗</a></>}</nav>}
    <div className="l6-preview-body"><PortLessonSixStage page={page} readOnly={projection} state={projection?state:undefined}/>{!projection&&!student&&<aside className="l6-guide" aria-label="第6讲教师讲稿"><h2>教师授课台</h2><p className="l6-time">{elapsed}—{elapsed+block.minutes}分钟 · {block.label}</p><h3>本页讲授与操作</h3><p>{page.teachingCue}</p>{page.reveal&&<details><summary>本页参考解析</summary><p>{page.reveal}</p></details>}<details><summary>90分钟进度表</summary>{timing.map(t=><button key={t.label} onClick={()=>setN(t.slideStart-245)}>{t.label} · {t.minutes}分钟</button>)}</details><details><summary>本页助手边界</summary><p>{page.assistantCue}</p></details><p>第24页后课间。所有演示由教师控制；学生任务为口头或纸面思考。</p></aside>}</div>
  </main></PortLessonSixControls.Provider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview/></StrictMode>);
