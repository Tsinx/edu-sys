import type { PortView } from "@edu/port-simulation-core";
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { getPortLessonFourDemo, PORT_LESSON_FOUR_SLIDES, type PortDemoCueId } from '@edu/course-content';
import { PortLessonFourStage } from './PortLessonFourStage';
const Studio=lazy(()=>import('../port-simulation/PortOperationsStudio').then(m=>({default:m.PortOperationsStudio})));
class DemoBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}
}
export function PortLessonFourDemoHost({cueId,scope,runId,initialRevision=0,onReturn,onSummary,onFrame}:{cueId:PortDemoCueId;scope:string;runId:string;initialRevision?:number;onReturn:()=>void;onSummary?:(runId:string,revision:number,summary:string)=>Promise<unknown>;onFrame?:(view:PortView,speed:number)=>void}) {
  const cue=getPortLessonFourDemo(cueId)!;
  const [error,setError]=useState('');
  const [storage]=useState(()=>{try{return window.localStorage;}catch{return null;}});
  const callbacks=useRef({onSummary});callbacks.current={onSummary};
  const report=useRef({revision:initialRevision,pending:'',last:'',busy:false,timer:0,closed:false});
  useEffect(()=>{report.current.closed=false;return()=>{report.current.closed=true;clearTimeout(report.current.timer);};},[]);
  const flush=async()=>{const state=report.current;state.timer=0;if(state.closed||state.busy||!state.pending||state.pending===state.last)return;state.busy=true;const text=state.pending;try{await callbacks.current.onSummary?.(runId,++state.revision,text);state.last=text;}catch{/* A missing summary must never be replaced with an invented result. */}finally{state.busy=false;if(!state.closed&&state.pending!==state.last)state.timer=window.setTimeout(()=>void flush(),500);}};
  const reportSummary=(summary:string)=>{const state=report.current;state.pending=summary;if(!state.busy&&!state.timer&&summary!==state.last)state.timer=window.setTimeout(()=>void flush(),150);};
  const fallback=<div className="l4-demo-error" role="alert"><p>演示暂时无法载入。{error}以下是本段复核课件。</p><button onClick={onReturn}>返回原课件页</button><a href={`/course-assets/port-management/l4/evidence-${cue.unit}-v10.png`} target="_blank" rel="noreferrer">查看已验证的本段证据画面 ↗</a><p>证据画面来自默认演示的独立冻结记录，不代表当前运行。</p><PortLessonFourStage page={PORT_LESSON_FOUR_SLIDES[cue.reviewPage-1]!} readOnly/></div>;
  return <section className="l4-demo-host" aria-label={cue.name+'教师演示'}><header className="l4-demo-bar"><span>第4讲 · {cue.name} · 独立教师演示</span><div><a href={`/course-assets/port-management/l4/evidence-${cue.unit}-v10.png`} target="_blank" rel="noreferrer">证据画面 ↗</a><button onClick={onReturn}>← 返回原课件页</button></div></header><div className="l4-demo-body"><DemoBoundary fallback={fallback}>{error?fallback:<Suspense fallback={<div className="l4-demo-error">正在载入三维现场…<button onClick={onReturn}>返回原课件页</button></div>}><Studio storageScope={'teacher-demo-v1:'+scope+':'+cueId} demonstrationStorage={storage} sourceLabel="第4讲教师演示" embeddedStage demonstration courseUnit={cue.unit} courseSelection={cue.unit} learningStageLocked offerTutorial={false} onDemonstrationFrame={onFrame} onDemonstrationSnapshot={reportSummary} onDemonstrationError={setError}/></Suspense>}</DemoBoundary></div></section>;
}
