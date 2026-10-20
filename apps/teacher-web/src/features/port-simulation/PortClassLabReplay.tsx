import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import {portClassLabMetrics,portStudentView,restorePortClassLab,type PortClassVerifiedReport} from '@edu/port-simulation-core';
const Scene=lazy(()=>import('./PortOperationsScene').then(m=>({default:m.PortOperationsScene})));
const labels:Record<string,string>={hypothesis:'假设与证据',changes:'配置与改动',conclusion:'结果与结论',limits:'局限与改进',scope:'影响范围',barriers:'屏障与处置',handover:'交接与改进'};
export function PortClassLabReplay({report}:{report:PortClassVerifiedReport}){
 const [index,setIndex]=useState(0),[position,setPosition]=useState(0),[playing,setPlaying]=useState(false),[showScene,setShowScene]=useState(false);
 const entry=report.runs[index]!,count=entry.record.commands.length;
 const run=useMemo(()=>restorePortClassLab({...entry.record,commands:entry.record.commands.slice(0,position)},report.record.lesson),[entry,position,report.record.lesson]);
 const view=useMemo(()=>portStudentView(run.simulation!),[run]);
 useEffect(()=>{if(!playing||position>=count)return;const timer=setTimeout(()=>setPosition(p=>Math.min(count,p+1)),700);return()=>clearTimeout(timer);},[playing,position,count]);
 return <section className="port-replay-player" aria-label="课堂实验只读复现"><h3>第{report.record.lesson}讲实验 · 只读复现</h3><p>按原指令重建现场；基准和各次试验可分别查看。此处操作不会修改学生存档。</p>
  <label>复现场次<select value={index} onChange={e=>{setPlaying(false);setPosition(0);setIndex(Number(e.target.value));}}>{report.runs.map((r,i)=><option key={i} value={i}>{r.label}</option>)}</select></label>
  <p>本次发现：{entry.finding||'本场景未单列发现，请查看下方复盘。'}</p>
  <div className="port-actions"><button disabled={position>=count} onClick={()=>setPlaying(p=>!p)}>{playing&&position<count?'暂停回放':'播放'}</button><button disabled={position<=0} onClick={()=>{setPlaying(false);setPosition(p=>p-1);}}>上一节点</button><button disabled={position>=count} onClick={()=>{setPlaying(false);setPosition(p=>p+1);}}>下一节点</button><button onClick={()=>{setPlaying(false);setPosition(count);}}>最终状态</button><button onClick={()=>setShowScene(v=>!v)}>{showScene?'收起港区现场':'显示港区现场'}</button></div>
  <label>操作节点 {position} / {count}<input aria-label="课堂实验回放节点" type="range" min={0} max={count} value={position} onChange={e=>{setPlaying(false);setPosition(Number(e.target.value));}}/></label>
  <p role="status">第{run.terminal.minute.toFixed(1)}分钟 · 实际交付{run.terminal.delivered}箱 · 成本{run.terminal.cost.toFixed(1)}教学单位 · {run.events.at(-1)?.text}</p>
  {showScene&&<div className="port-replay-scene"><Suspense fallback={<p>载入港区…</p>}><Scene view={view} selected="" speed={0} quality="balanced" onSelect={()=>{}} onContext={()=>{}} onDrop={()=>{}}/></Suspense></div>}
  <details><summary>当前实际指标</summary><pre>{JSON.stringify(portClassLabMetrics(run),null,2)}</pre></details>
  <details><summary>完整事件记录与指令</summary><ol>{run.events.map((e,i)=><li key={i}>第{e.minute.toFixed(1)}分钟 · {e.text}</li>)}</ol><pre>{JSON.stringify(entry.record.commands,null,2)}</pre></details>
  <h3>学生提交的复盘</h3>{Object.entries(report.record.notes).map(([key,text])=><article key={key}><h4>{labels[key]??key}</h4><p style={{whiteSpace:'pre-wrap'}}>{text}</p></article>)}
 </section>;
}
