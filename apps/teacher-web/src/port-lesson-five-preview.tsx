import { PageToolsProvider } from './features/classroom/PageTools';
import { CoursePreviewToolbar } from './features/classroom/CoursePreviewToolbar';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PORT_LESSON_FIVE_SLIDES as pages, PORT_LESSON_FIVE_TIMING as timing, type LessonFivePlan } from '@edu/course-content';
import { PortLessonFiveStage, PortLessonFiveControls, type LessonFivePresentation } from './features/port-lesson-five/PortLessonFiveStage';
import { lessonFiveExperimentUrl } from './features/port-lesson-five/navigation';
import './features/port-lesson-five/port-lesson-five.css';
const params=new URLSearchParams(location.search),safe=(n:number)=>Number.isInteger(n)?Math.max(1,Math.min(48,n)):1;
function Preview(){
 const [n,setN]=useState(safe(Number(params.get('page')??1))),[projection,setProjection]=useState(params.get('projection')==='1'||params.get('student')==='1');
 const follower=params.get('projection')==='1',student=params.get('student')==='1',scope=params.get('channel')??'lesson-five';
 const [state,setState]=useState<LessonFivePresentation>({progress:1,revealed:false}),channel=useRef<BroadcastChannel|null>(null),current=useRef({n,state});current.current={n,state};
 useEffect(()=>{if(typeof BroadcastChannel==='undefined')return;const c=new BroadcastChannel('port-l5:'+scope);channel.current=c;c.onmessage=({data})=>{if(follower&&data?.type==='state'&&Number.isInteger(data.n)){setN(safe(data.n));setState(data.state);}if(follower&&data?.type==='presentation'){setState(data.state);}if(!follower&&data?.type==='ready')c.postMessage({type:'state',...current.current});};if(follower)c.postMessage({type:'ready'});return()=>{channel.current=null;c.close();};},[scope,follower]);
 useEffect(()=>{const u=new URL(location.href);u.searchParams.set('page',String(n));history.replaceState(null,'',u);if(!follower)channel.current?.postMessage({type:'state',...current.current});},[n,follower]);
 useEffect(()=>{if(follower)return;const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,button,textarea,a'))return;if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();setN(v=>safe(v+1));}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();setN(v=>safe(v-1));}if(e.key==='Escape'&&!student)setProjection(false);};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[follower,student]);
 const page=pages[n-1]!,block=timing.find(t=>page.index>=t.slideStart&&page.index<=t.slideEnd)!,elapsed=timing.slice(0,timing.indexOf(block)).reduce((s,t)=>s+t.minutes,0);
 const open=(plan:LessonFivePlan,personal=false)=>location.assign(lessonFiveExperimentUrl(plan,location.pathname+location.search,scope,personal));
 const change=(_key:string,next:LessonFivePresentation)=>{setState(next);channel.current?.postMessage({type:'presentation',state:next});};
 return <PageToolsProvider courseId="course-port-management-intro" pageKey={page.slideKey} role={projection?'projection':'teacher'}><PortLessonFiveControls.Provider value={{scope,openExperiment:open}}><main className={'l5-preview'+(projection?' l5-preview--projection':'')}>

 <div className="l5-preview-body"><PortLessonFiveStage page={page} readOnly={projection} state={follower||projection&&!student?state:undefined} onChange={change}/>{!projection&&<aside className="l5-guide" aria-label="第5讲教师讲稿"><h2>教师授课台</h2><p className="l5-time">{elapsed}—{elapsed+block.minutes}分钟 · {block.label}</p><h3>本页讲授与操作</h3><p>{page.teachingCue}</p>{page.answerHidden&&<p>独立判断阶段：先保留学生解释，再公开后续解析。</p>}<h3>演示与个人实验</h3>{(['A','B','C','D','E'] as const).map(id=><button key={id} onClick={()=>open(id)}>教师演示 · {id}</button>)}<button onClick={()=>open('C',true)}>进入个人C实验</button><p>入口只加载现场；明确点击推进才运行。教师参考不等于学生完成。</p><details><summary>90分钟进度表</summary>{timing.map(t=><button key={t.label} onClick={()=>setN(t.slideStart-197)}>{t.label} · {t.minutes}分钟</button>)}</details><details><summary>本页助手边界</summary><p>{page.assistantCue}</p></details><details><summary>课堂准备</summary><p>预先检查A—E记录。个人任务只改变运输岗位2→4。软件故障时使用实验页的记录分析，保留完成方式。此页面为本机授课预览；正式课堂与学生入口使用系统账号。</p></details></aside>}</div>
 {!projection&&<CoursePreviewToolbar title="第5讲" page={n} titles={pages.map(p=>p.title)} onPage={setN} onProjection={()=>setProjection(true)}><a href={`/port-lesson-five-preview.html?page=${n}&projection=1&channel=${encodeURIComponent(scope)}`} target="_blank" rel="noreferrer">另开同步投影 ↗</a></CoursePreviewToolbar>}</main></PortLessonFiveControls.Provider></PageToolsProvider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview/></StrictMode>);
