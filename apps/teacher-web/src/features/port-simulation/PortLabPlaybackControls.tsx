import type { PortClassLab } from '@edu/port-simulation-core';
import { useEffect, useRef } from 'react';
import { PORT_LAB_SPEEDS, type usePortLabPlayback } from './usePortLabPlayback';
import type { LabCoachEvent } from './port-lab-coach';
import { incidentTarget, type IncidentCoachStep } from './port-incident-coach';

const clockLabel=(second:number)=>`第${Math.floor(second/60)}分${String(Math.floor(second%60)).padStart(2,'0')}秒`;
const taskLabels={audit:'备用记录核验',reconcile:'恢复检查',scope:'独立范围检查',logs:'接口日志追查',backup:'备用资料调取',mechanical:'设备诊断',secure:'安全隔离'};

export function PortLabPlaybackControls({playback,run,finished,pendingDispatch,onAdvance,onQuickCalculate,onGuideEvent,onReset,guided=true,guidance}:{
  playback:ReturnType<typeof usePortLabPlayback>;run:PortClassLab;finished:boolean;pendingDispatch:boolean;
  onAdvance:(minutes:number)=>void;onQuickCalculate:(minutes:number)=>void;
  onGuideEvent?:(event:LabCoachEvent)=>void;onReset?:()=>void;guided?:boolean;guidance?:IncidentCoachStep|null;
}) {
  const second=run.simulation!.second,{playing}=playback;
  const incident=run.incident,system=run.scenario==='system';
  const nextAction=run.emergency&&incident?incident.restoredAt!==null?'恢复审查已通过；继续观察至第240分钟，核对积压与代价。':incident.testPassed?'实际受控交接已通过，等待你下达恢复审查指令。':incident.testing?'受控交接已启动；设备按实际任务作业，完成3次后自动暂停。':incident.dataChecked?run.emergency.reliefReturning?'替代设备返回中；连续推进至返回完成，再启动场桥1试吊。':!system&&run.simulation!.facilities!.yardIncident?.relief!==null?'检查已完成；先撤回替代场桥并推进至返回，再启动试吊。':`检查已完成，${system?'3箱试放行':'场桥1试吊'}尚未启动；请在处置台下达启动指令。`:incident.repairWork>=run.emergency.repairTarget?'技术工作完成；先在处置台启动恢复检查，再进行实际受控交接。':null:null;
  const quickPanel=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{if(playing&&quickPanel.current)quickPanel.current.open=false;},[playing]);
  return <section className="pcl-playback" aria-label="实验运行控制" data-playback-state={playing?'running':'paused'}>
    <div className="pcl-playback-heading"><output aria-label="仿真时钟" data-second={second}>{clockLabel(second)}</output><div className="pcl-playback-heading-tools"><label>运行倍速<select data-tutorial-target="lab:speed" aria-label="运行倍速" value={playback.speed} onChange={e=>{playback.setSpeed(Number(e.target.value));onGuideEvent?.({kind:'speed'});}}>{PORT_LAB_SPEEDS.map(speed=><option key={speed} value={speed}>{speed}×{speed===1?' · 观察动作':speed===120?' · 快速演练':''}</option>)}</select></label>{onReset&&<button type="button" className="pcl-reset" data-tutorial-target="lab:reset" onClick={onReset}><span aria-hidden="true">↺ </span>重置本次实验</button>}</div></div>
    <div className="pcl-clock-controls"><button {...incidentTarget('pause',guidance)} data-tutorial-target="lab:pause" className="pcl-primary" disabled={!playing} onClick={()=>{playback.pause();onGuideEvent?.({kind:'pause'});}}>暂停推进</button><button disabled={playing||finished||pendingDispatch} {...incidentTarget('continue',guidance)} data-tutorial-target="lab:continue" onClick={()=>playback.resume()}>{playback.targetSecond!==null&&playback.targetSecond>second&&['manual','hidden'].includes(playback.reason)?'继续至目标节点':run.pendingTask?'继续耗时操作':'运行至下一节点'}</button>{[5,15,30].map(n=><button data-tutorial-target={n===5?'lab:advance':undefined} key={n} disabled={finished||playing||pendingDispatch||!!run.pendingTask} onClick={()=>onAdvance(n)}>连续推进 {n} 分钟</button>)}<button data-tutorial-target="lab:endpoint" {...incidentTarget('endpoint',guidance)} disabled={finished||playing||pendingDispatch||!!run.pendingTask} onClick={()=>onAdvance(360)}>连续运行至终点</button></div>
    <p className="pcl-playback-status" role="status">{finished?'观察已结束。':playing?`连续运行中 · ${playback.speed}× · 到${clockLabel(playback.targetSecond!)}自动暂停。`:playback.reason==='checkpoint'?'已在业务节点自动暂停，请核对处置结果后继续。':playback.reason==='target'?'已到目标节点，自动暂停。':playback.reason==='hidden'?'离开页面已自动暂停，返回后可继续。':playback.reason==='manual'?'已暂停，设备和车辆保持当前作业状态。':'连续推进将显示设备与车辆作业；下一观察节点为下一个整10分钟。'}{run.pendingTask&&` ${taskLabels[run.pendingTask.kind]}进行中，完成时间：${clockLabel(run.pendingTask.completesAt)}。`}</p>
    {guidance?<aside className="pcl-playback-guide" aria-label="运行区当前指导"><strong>{guidance.title}</strong><p>{guidance.body}</p></aside>:guided&&nextAction&&<p className="pcl-alert" role="status">{nextAction}</p>}
    {playback.targetSecond!==null&&<progress aria-label="本段推进进度" max={Math.max(1,playback.targetSecond-playback.fromSecond)} value={Math.max(0,Math.min(playback.targetSecond,second)-playback.fromSecond)}/>}
    <details ref={quickPanel} className="pcl-quick-calculate" data-tutorial-target="lab:quick"><summary>快算 · 跳过过程画面</summary><p>逐箱计算后直接显示终态；恢复、核验和试运行节点仍会停下。观察设备作业请使用上方连续推进。</p><div className="pcl-clock-controls">{[5,15,30].map(n=><button key={n} disabled={finished||playing||pendingDispatch} onClick={()=>onQuickCalculate(n)}>快算 {n} 分钟</button>)}<button disabled={finished||playing||pendingDispatch} onClick={()=>onQuickCalculate(360)}>快算至观察终点</button></div></details>
  </section>;
}
