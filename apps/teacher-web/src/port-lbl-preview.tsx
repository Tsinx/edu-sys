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
  return <main className="lbl-preview" style={projection?{gridTemplateRows:"minmax(0,1fr)"}:undefined}>
    {!projection&&<nav className="lbl-preview-bar"><strong>港口管理 · 双讲课件</strong><button onClick={()=>move(-1)} disabled={index===0}>上一页</button><select aria-label="选择课件页" value={index} onChange={e=>setIndex(Number(e.target.value))}>{PORT_LBL_SLIDES.map((p,i)=><option key={p.slideKey} value={i}>{p.lesson===2?"Ⅱ":"Ⅲ"} · {p.localPage}　{p.title}</option>)}</select><button onClick={()=>move(1)} disabled={index===105}>下一页</button><button onClick={()=>setProjection(true)}>投影</button></nav>}
    <PortLblStage key={page.slideKey} page={page} readOnly={false} projection={projection}/>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Preview/></StrictMode>);
