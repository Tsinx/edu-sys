import { PageToolsProvider } from './features/classroom/PageTools';
import { CoursePreviewToolbar } from './features/classroom/CoursePreviewToolbar';
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PORT_LBL_SLIDES } from "../../../packages/course-content/src/port-lbl";
import { PortLblStage } from "./features/port-lbl/PortLblStage";
import "./features/classroom/classroom.css";
import "./features/globe/interactive-earth-globe.css";
import "./features/port-lbl/port-lbl.css";

function Preview(){
  const start=Number(new URLSearchParams(location.search).get("page")||0);
  const [index,setIndex]=useState(Math.max(0,Math.min(105,start)));
  const [projection,setProjection]=useState(new URLSearchParams(location.search).has("projection"));
  const page=PORT_LBL_SLIDES[index]!;
  const move=(offset:number)=>setIndex(v=>Math.min(105,Math.max(0,v+offset)));
  useEffect(()=>{
    const url=new URL(location.href);url.searchParams.set("page",String(index));history.replaceState(null,"",url);
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).closest("input,select,button"))return;
      if(e.key==="ArrowRight"||e.key==="PageDown")move(1);
      if(e.key==="ArrowLeft"||e.key==="PageUp")move(-1);
      if(e.key==="Escape")setProjection(false);
    };window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[index]);
  return <PageToolsProvider courseId="course-port-management-intro" pageKey={page.slideKey} role={projection?'projection':'teacher'}><main className="lbl-preview" style={projection?{gridTemplateRows:"minmax(0,1fr)"}:undefined}>

    <PortLblStage key={page.slideKey} page={page} readOnly={false} projection={projection}/>
    {!projection&&<CoursePreviewToolbar title={`第${page.lesson}讲`} page={index+1} titles={PORT_LBL_SLIDES.map(p=>`${p.lesson} · ${p.localPage} ${p.title}`)} onPage={n=>setIndex(n-1)} onProjection={()=>setProjection(true)}/>}
  </main></PageToolsProvider>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Preview/></StrictMode>);
