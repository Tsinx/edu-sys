import './features/classroom/page-tools.css';
import { PageToolsProvider } from './features/classroom/PageTools';
import { CoursePreviewToolbar } from './features/classroom/CoursePreviewToolbar';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MANAGEMENT_DECK_ID,getManagementInteractionDefinition,type ManagementSlide} from '@edu/course-content/management-principles';
import type {SlideInteractionValues} from '@edu/contracts';
import {ManagementSlideStage} from './features/management-principles/ManagementSlideStage';
import './styles.css';
import './features/classroom/classroom.css';
const query=new URLSearchParams(location.search);
function Preview(){
 const [slides,setSlides]=useState<ManagementSlide[]>([]),[error,setError]=useState('');
 const [index,setIndex]=useState(Number(query.get('page'))||1),[values,setValues]=useState<Record<string,SlideInteractionValues>>({});
 useEffect(()=>{fetch('/management-phase3-draft/pages.json').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(setSlides).catch(e=>setError(String(e)));},[]);
 if(error)return <p role="alert">草稿加载失败：{error}</p>;
 if(!slides.length)return <p>正在加载课件…</p>;
 const p=slides[Math.min(slides.length,Math.max(1,index))-1]!;
 const defaults=p.demo?getManagementInteractionDefinition(p.demo).defaults:{};
 return <PageToolsProvider pageKey={p.slideKey} role={new URLSearchParams(location.search).has('student')?'student':'teacher'}><main className="management-preview" style={{background:'#d8dcd0',height:'100dvh',display:'grid',gridTemplateRows:'minmax(0,1fr) auto',overflow:'hidden'}}>

  <ManagementSlideStage slide={p} frame={{deckId:MANAGEMENT_DECK_ID,versionId:'management-principles-2026-v3-draft',slideId:p.slideKey,index:p.index,total:663+slides.length,logicalWidth:1600,logicalHeight:1000,aspectRatio:'16:10',title:p.title,lessonNumber:p.lessonNumber,lessonTitle:p.lessonTitle,section:p.section,summary:p.summary}}
   readOnly={query.has('student')} interaction={p.demo?{deckId:MANAGEMENT_DECK_ID,slideId:p.slideKey,revision:1,values:values[p.slideKey]??defaults}:null}
   onInteractionPatch={patch=>setValues(v=>({...v,[p.slideKey]:{...defaults,...v[p.slideKey],...patch}}))}
   onInteractionReset={()=>setValues(v=>({...v,[p.slideKey]:{...defaults}}))}/>
 <CoursePreviewToolbar title={`管理学 · 第${p.lessonNumber}讲`} page={index} titles={slides.map(s=>s.title)} onPage={setIndex}><p>第三期制作预览 · 尚未验收</p><p>{p.lessonTitle} · {p.title}</p></CoursePreviewToolbar></main></PageToolsProvider>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Preview/></React.StrictMode>);
