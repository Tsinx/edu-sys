import { useEffect, useRef, useState } from 'react';
import { PORT_LESSON_FIVE_EVIDENCE as evidence, capacityTime, type LessonFivePlan } from '@edu/course-content';
import type { CapacityView } from '@edu/port-simulation-core';
import './capacity-experiment.css';
type RecordData={version:'l5-record/1';scope:string;raw:string;hypothesis:string;counterexample:string;interpretation:string;mode:'execution'|'analysis';savedAt:string};
export function CapacityExperiment({actorId,actorName,classroom,scope,personal,initialPlan,returnTo,onReturn,onSummary}:{actorId:string;actorName:string;classroom?:string;scope:string;personal:boolean;initialPlan:LessonFivePlan;returnTo?:string|null;onReturn?:()=>void;onSummary?:(summary:string)=>void}) {
 const [plan,setPlan]=useState<LessonFivePlan>(personal?'C':initialPlan),[generation,setGeneration]=useState(0),[view,setView]=useState<CapacityView>(),[busy,setBusy]=useState(true),[error,setError]=useState(''),[saveError,setSaveError]=useState('');
 const [hypothesis,setHypothesis]=useState(''),[counterexample,setCounterexample]=useState(''),[interpretation,setInterpretation]=useState(''),[mode,setMode]=useState<'execution'|'analysis'>('execution');
 const worker=useRef<Worker|null>(null),raw=useRef(''),sequence=useRef(0),importRaw=useRef<string|null>(null);
 const key=`edu:l5:${encodeURIComponent(actorId)}:${encodeURIComponent(classroom??scope)}:${personal?'personal':'demonstration'}:${plan}`;
 const fields=useRef({hypothesis,counterexample,interpretation,mode});fields.current={hypothesis,counterexample,interpretation,mode};
 const [archives,setArchives]=useState<string[]>([]);
 const ready=!personal||(hypothesis.trim().length>=8&&counterexample.trim().length>=8);
 const persist=()=>{if(!raw.current&&fields.current.mode!=="analysis")return;try{const record:RecordData={version:'l5-record/1',scope:key,raw:raw.current,...fields.current,savedAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(record));setSaveError('');}catch{setSaveError('本机保存失败，请导出记录后再离开。');}};
 const callback=useRef(onSummary);callback.current=onSummary;
 useEffect(()=>{
  setBusy(true);setError('');setView(undefined);raw.current='';let record:RecordData|undefined;
  try{const text=localStorage.getItem(key);if(text){const v=JSON.parse(text);if(v.version!=='l5-record/1'||v.scope!==key)throw new Error('保存记录与当前身份或用途不一致。');record=v;}}
  catch(e){setError(`原记录尚未载入：${(e as Error).message}。可导入备份或明确重置；原数据保留。`);setBusy(false);return;}
  raw.current=record?.raw??'';
  setHypothesis(record?.hypothesis??'');setCounterexample(record?.counterexample??'');setInterpretation(record?.interpretation??'');setMode(record?.mode??'execution');
  fields.current={hypothesis:record?.hypothesis??'',counterexample:record?.counterexample??'',interpretation:record?.interpretation??'',mode:record?.mode??'execution'};
  let w:Worker;
  try{w=new Worker(new URL('./capacity.worker.ts',import.meta.url),{type:'module'});}catch(e){setError(`实验计算不可用：${String(e)}`);setBusy(false);return;}
  worker.current=w;
  w.onmessage=({data})=>{
   setBusy(false);if(data.error){setError(`计算失败，未标记完成：${data.error}`);return;}
   raw.current=data.raw;setView(data.view);setError('');persist();
   const v=data.view as CapacityView;callback.current?.(JSON.stringify({version:v.version,plan:v.plan,purpose:personal?'personal':'demonstration',complete:v.complete,configuration:v.configuration,observation:v.observation,completionSeconds:v.elapsed}));
  };
  w.onerror=()=>{setBusy(false);setError('计算进程中断，最近一次已保存观察点仍保留；可刷新恢复或使用记录分析。');};
  const loaded=importRaw.current??record?.raw;importRaw.current=null;
  w.postMessage({id:++sequence.current,type:'load',plan,raw:loaded});
  try{setArchives(Object.keys(localStorage).filter(k=>k.startsWith(key+':archive:')).sort().reverse());}catch{}
  return()=>{worker.current=null;w.terminate();};
 },[key,generation]);
 useEffect(()=>{persist();},[hypothesis,counterexample,interpretation,mode]);
 useEffect(()=>{const save=()=>persist();addEventListener('pagehide',save);return()=>removeEventListener('pagehide',save);});
 const run=(seconds:number)=>{if(!ready||busy||view?.complete)return;persist();setBusy(true);setError('');worker.current?.postMessage({id:++sequence.current,type:'advance',seconds});};
 const reset=()=>{try{const old=localStorage.getItem(key);if(old)localStorage.setItem(`${key}:archive:${Date.now()}:${crypto.randomUUID()}`,old);localStorage.removeItem(key);importRaw.current=null;setGeneration(v=>v+1);}catch{setSaveError('归档失败；未重置，请先导出记录。');}};
 const download=(text:string,name:string)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const exportRecord=()=>{persist();if(raw.current||mode==="analysis")download(JSON.stringify({version:'l5-record/1',scope:key,raw:raw.current,...fields.current,savedAt:new Date().toISOString()},null,2),`第5讲-${personal?'个人':'演示'}-${plan}.json`);};
 const loadRecord=(text:string)=>{try{if(text.length>350000)throw new Error('记录过大');const v=JSON.parse(text) as RecordData;if(v.version!=='l5-record/1'||v.scope!==key||typeof v.raw!=='string'||[v.hypothesis,v.counterexample,v.interpretation].some(s=>typeof s!=='string'||s.length>2000)||!['analysis','execution'].includes(v.mode))throw new Error('身份、课堂、用途或格式不匹配');if(v.raw){const parsed=JSON.parse(v.raw);if(parsed.plan!==plan)throw new Error('方案不匹配');}else if(v.mode!=='analysis')throw new Error('缺少实机命令记录');const old=localStorage.getItem(key);if(old)localStorage.setItem(`${key}:archive:${Date.now()}:${crypto.randomUUID()}`,old);localStorage.setItem(key,text);setGeneration(g=>g+1);}catch(e){setError(`无法导入：${(e as Error).message}。原记录未作为新结果使用。`);}};
 const obs=view?.observation,elapsed=obs?.elapsed??0,next=[3600,7200,14400,28800,43200,57600,86400].find(t=>t>elapsed)??86400;
 const a=evidence.A,c=evidence.C,showComparison=view?.complete||mode==='analysis';
 return <main className="l5-lab"><header><div><p className="l5-lab-eyebrow">PORT CAPACITY / 第5讲</p><h1>{personal?'个人C对照实验':'教师资源对照演示'}</h1><p>{actorName} · {personal?'个人记录':'演示记录'} · 教学模型，不是生产数据</p></div>{returnTo&&<a href={returnTo} onClick={onReturn?e=>{e.preventDefault();persist();onReturn();}:undefined}>← 返回课件</a>}</header>
 <div className="l5-lab-grid"><section className="l5-lab-main"><div className="l5-lab-config"><strong>方案 {plan}</strong>{!personal&&<select aria-label="演示方案" value={plan} disabled={busy} onChange={e=>setPlan(e.target.value as LessonFivePlan)}>{(['A','B','C','D','E'] as const).map(id=><option key={id}>{id}</option>)}</select>}<span>S01岸桥 {evidence[plan].configuration.cranes} 台</span><span>运输岗位 {evidence[plan].configuration.drivers} 个</span><span>场桥4 · 闸口2</span></div>
 <p className="l5-lab-start">冻结起点：S01已靠妥，四批回执有效，进口116箱、出口78箱。分配已有设备与岗位，其他条件固定。</p>
 <div className="l5-lab-status" role="status">{busy?'正在计算或按命令恢复…':error?'计算失败 · 未标记完成':view?.complete?'本船装卸已完成':view?.started?'运行未完成 · 已停在观察点':'现场已载入 · 尚未开工'}<strong>{capacityTime(elapsed)}</strong><small>相对开工仿真时间</small></div>
 {error&&<p role="alert" className="l5-lab-error">{error}</p>}{saveError&&<p role="alert" className="l5-lab-error">{saveError}</p>}
 <div className="l5-lab-flow">{[{label:'进口已卸船',value:obs?.unloaded??0,total:116},{label:'出口已装船',value:obs?.loaded??0,total:78},{label:'进口已提离',value:obs?.delivered??0,total:116}].map(v=><div key={v.label}><span>{v.label}</span><strong>{v.value}<small> / {v.total}</small></strong><progress max={v.total} value={v.value}/></div>)}</div>
 <div className="l5-lab-positions"><p>岸侧箱数 <b>{obs?.quay??0}</b></p><p>尚未接上运输 <b>{obs?.waitingTransport??0}</b></p><p>堆场交接区 <b>{obs?.yardHandoff??0}</b></p><p>场内/待提取 <b>{obs?.yard??0}</b></p></div><p className="l5-lab-help">岸侧箱数按位置统计；尚未接上运输排除了已分配运输任务的箱子。</p>
 <div className="l5-lab-resources">{(['quay','truck','yard','gate'] as const).map((kind,i)=><div key={kind}><b>{['岸桥','运输','场桥','闸口'][i]}</b><span>作业中 {obs?.active[kind]??0} / 可用 {obs?.available[kind]??0}</span><small>{(obs?.active[kind]??0)<(obs?.available[kind]??0)?'其余未执行任务 · 原因待核查':'按当前任务状态核对'}</small></div>)}</div>
 <div className="l5-lab-actions"><button disabled={busy||!ready||view?.complete||!view} onClick={()=>run(next-elapsed)}>运行至下一观察点</button><button disabled={busy||!ready||view?.complete||!view} onClick={()=>run(86400)}>运行至完成</button><button disabled={busy} onClick={reset}>归档并重置</button><button disabled={busy||(!raw.current&&mode!=="analysis")} onClick={exportRecord}>导出记录</button><label>导入自己的记录<input type="file" accept=".json" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void f.text().then(loadRecord);e.target.value='';}}/></label></div>
 {!ready&&<p className="l5-lab-help">请先填写至少8个字的假设和反证条件，再启动个人实验。</p>}
 <details><summary>观察点账本</summary><div className="l5-lab-table"><table><thead><tr>{['时间','卸船','装船','岸侧','待运输','提离'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{view?.samples.filter(s=>[0,3600,7200,14400,28800,43200,57600,view.observation.elapsed].includes(s.elapsed)).map(s=><tr key={s.elapsed}><td>{capacityTime(s.elapsed)}</td><td>{s.unloaded}</td><td>{s.loaded}</td><td>{s.quay}</td><td>{s.waitingTransport}</td><td>{s.delivered}</td></tr>)}</tbody></table></div></details>
 {archives.length>0&&<details><summary>已归档记录（{archives.length}）</summary>{archives.map(k=><button key={k} onClick={()=>{const v=localStorage.getItem(k);if(v)download(v,`第5讲-${plan}-归档.json`);}}>导出 {new Date(Number(k.split(':archive:')[1]?.split(':')[0])).toLocaleString()}</button>)}</details>}
 </section><aside className="l5-lab-notes"><h2>{personal?'我的假设与解释':'演示记录与参考'}</h2><label>瓶颈假设<textarea aria-label="瓶颈假设" maxLength={2000} value={hypothesis} onChange={e=>setHypothesis(e.target.value)} placeholder="预计哪项结果改变，依据是什么？"/></label><label>可能推翻判断的观察<textarea aria-label="可能推翻判断的观察" maxLength={2000} value={counterexample} onChange={e=>setCounterexample(e.target.value)} placeholder="哪种结果会使你修订原判断？"/></label><h3>教师参考A</h3><p>岸桥2 / 运输2；本船装卸 <strong>{capacityTime(a.elapsed!)}</strong>。此记录不是你的执行。</p>
 {showComparison&&<div className="l5-lab-comparison"><h3>{mode==='analysis'?'A/C参考记录分析':'同一终点的结果对照'}</h3><p>A：{capacityTime(a.elapsed!)}</p><p>{mode==='analysis'?'参考C':'本次'+plan}：{capacityTime(mode==='analysis'?c.elapsed!:view?.elapsed??evidence[plan].elapsed!)}</p><p>{mode==='analysis'?'参考差额':'相对A差额'}：{a.elapsed!-(mode==='analysis'?c.elapsed!:view?.elapsed??evidence[plan].elapsed!)}秒</p></div>}
 {mode==='analysis'&&<details open><summary>A/C过程证据 · 教师参考</summary><div className="l5-lab-table"><table><thead><tr>{['方案/时点','卸/装','岸侧/待运输','提离'].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{(['A','C'] as const).flatMap(id=>evidence[id].samples.filter(s=>[3600,7200,14400].includes(s.elapsed)).map(s=><tr key={id+s.elapsed}><td>{id} / {s.elapsed/3600}h</td><td>{s.unloaded}/{s.loaded}</td><td>{s.quay}/{s.waitingTransport}</td><td>{s.delivered}</td></tr>))}</tbody></table></div><p className="l5-lab-help">完成终点与过程快照来自同一份已复算记录。计数单位均为实体箱。</p></details>}<label>结果解释<textarea aria-label="结果解释" disabled={!view?.complete&&mode!=='analysis'} maxLength={2000} value={interpretation} onChange={e=>setInterpretation(e.target.value)} placeholder="运行完成后，引用一条结果记录和一条过程证据。"/></label><p className="l5-lab-help">保存于本机；导出后沿用教师指定渠道提交，不自动评分。</p><details><summary>软件不可用时：记录分析</summary><p>使用已验证的教师A/C记录完成同样判断；完成方式为记录分析，不算个人实机。</p><button onClick={()=>{setMode('analysis');persist();}}>使用A/C参考记录分析</button>{mode==='analysis'&&<button onClick={()=>setMode('execution')}>返回实机记录方式</button>}</details><p>当前记录方式：<b>{mode==='analysis'?'记录分析':'个人实机 / 模型执行'}</b></p></aside></div></main>;
}
