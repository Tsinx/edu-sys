import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PORT_CLASS_LAB_VERSION, PORT_LAB_LEDGER, applyPortClassLabCommand, createPortClassLab,
  portClassLabMetrics, portLabCsv, portLabFinished, restorePortClassLab, serializePortClassLab,
  type PortClassLab, type PortClassLesson, type PortLabCommand, type TerminalDispatch,
  PORT_LAB_SCENARIOS, comparablePortIncident,
} from '@edu/port-simulation-core';
import { PortOperationsScene, type PortSceneHandle } from './PortOperationsScene';
import { portStudentView } from '@edu/port-simulation-core';
import { PortFacilityReadout } from './PortFacilityReadout';
import { decodeNotebook,loadNotebook,newNotebookId,notebookSession,packedNotebook as packed,reportReady,saveNotebook,savedNotebooks,type Notebook } from './port-class-notebook';
import { usePortLabPlayback } from './usePortLabPlayback';
import { PortLabLiveOperations } from './PortLabLiveOperations';
import { PortLabPlaybackControls } from './PortLabPlaybackControls';
import { PortLabAnalysis } from './PortLabAnalysis';
import { PORT_INCIDENT_TASKS, PortIncidentControls, PortIncidentEvidence, PortIncidentSummary, PortIncidentHistory } from './PortIncidentControls';

const format = (n: number | null, digits = 1) => n === null ? '—' : n.toLocaleString('zh-CN',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const download = (content: string, name: string, type: string) => {
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};const TASKS = {
  11: [
    {title:'定位瓶颈',minutes:5,body:'查看设备负荷、运输等待和箱流接续模板；选择设备添加状态时间轴，结合队列找出两条瓶颈证据，写出可被结果否定的假设。'},
    {title:'取得基准',minutes:5,body:'保持预置岗位，推进至第360分钟。记录已交付、未交付、在制等待和成本，再从原检查点建立试验。'},
    {title:'改变与验证',minutes:12,body:'修改一项岗位，或明确列出协同改动；从相同检查点运行至同一终点。自选设备与时段，比较占用、等待和完成量，核对改善及代价。'},
    {title:'评审建议',minutes:8,body:'用基准与试验的实际差异支持、修正或否定假设；说明哪些未完成量仍未解决，以及模型之外还需核查什么。'},
  ],
  12: [
    {title:'界定事件',minutes:5,body:'固定告警证据，区分接口失去可信数据与设备故障。选择隔离范围，解释它会影响哪几段业务。'},
    {title:'维持必要业务',minutes:8,body:'核对备用清单中的重复票号与过期记录。隔离异常行，决定是否使用24箱的双人复核额度，并启动技术恢复。'},
    {title:'验证恢复',minutes:10,body:'技术恢复需要60人分钟；完成独立记录对账，再实际交付3箱作为受控试运行。证据齐备后恢复电子交付。'},
    {title:'复盘影响',minutes:7,body:'推进至第240分钟，区分技术恢复、服务恢复与积压消化。核对RTO 60分钟目标和RPO 10分钟目标，写出屏障与责任改进。'},
  ],
} as const;

export function PortClassLabPage({lesson}:{lesson:PortClassLesson}) {
  const [sessionId,setSessionId]=useState(newNotebookId);
  const [loaded]=useState(()=>loadNotebook(lesson)), [book,setBook]=useState<Notebook>(loaded.book);
  const [error,setError]=useState(''),[saveError,setSaveError]=useState(''),[notice,setNotice]=useState('');
  const [dispatch,setDispatch]=useState<TerminalDispatch>(book.run.terminal.setup.dispatch),[scope,setScope]=useState<'gate'|'all'>(book.run.incident?.scope??'gate'),[quarantine,setQuarantine]=useState<string[]>(()=>{const audit=book.run.commands.find(c=>c.kind==='audit'||c.kind==='start-audit');return audit&&(audit.kind==='audit'||audit.kind==='start-audit')?[...audit.quarantine]:[];});
  const [selected,setSelected]=useState(book.run.scenario==='equipment'?'yard-crane-0':'gate-1'); const scene=useRef<PortSceneHandle>(null),stage=useRef<HTMLElement>(null);
  const comparisonChoice=book.comparison??'latest';
  const setComparisonChoice=(value:string)=>setBook(p=>({...p,comparison:value}));
  const r=book.run,m=portClassLabMetrics(r),incident=r.incident,finished=portLabFinished(r);
  const tasks=r.scenario?PORT_INCIDENT_TASKS[r.scenario]:TASKS[lesson];
  const completedPlans=book.archive.map((a,index)=>({run:a.run,index})).filter(a=>comparablePortIncident(a.run,r)&&portLabFinished(a.run));
  const comparisonPlan=lesson===11?book.baseline:comparisonChoice==='none'?null:comparisonChoice==='latest'?completedPlans.at(-1)?.run??null:completedPlans.find(a=>String(a.index)===comparisonChoice)?.run??null;
  const view=useMemo(()=>portStudentView(r.simulation!),[r.simulation]),flows='observedRates' in m?m.observedRates as number[]:m.capacities;
  const pendingDispatch=lesson===11&&r.kind==='trial'&&r.terminal.minute===r.checkpoint&&JSON.stringify(dispatch)!==JSON.stringify(r.terminal.setup.dispatch);
  const latest=useRef(book);latest.current=book;
  const send=(command:PortLabCommand)=>{
    const previous=latest.current;
    try{const step=lesson===12?(command.kind==='isolate'?1:['reconcile','start-reconcile','test'].includes(command.kind)?2:command.kind==='restore'?3:previous.step):['advance','tick'].includes(command.kind)&&previous.run.kind==='baseline'&&previous.run.terminal.minute===previous.run.checkpoint?1:previous.step;const next={...previous,run:applyPortClassLabCommand(previous.run,command),step,sealedAt:null};latest.current=next;setBook(next);setError('');return next.run;}
    catch(e){const message=e instanceof Error?e.message:String(e);playback.pause('error');setError(message);const next={...previous,attempts:[...previous.attempts,{minute:previous.run.terminal.minute,command:command.kind,message}].slice(-80),sealedAt:null};latest.current=next;setBook(next);return undefined;}
  };
  const playback=usePortLabPlayback(()=>latest.current.run,seconds=>send({kind:'tick',seconds}));
  const {playing}=playback;
  useEffect(()=>{if(playing)stage.current?.scrollIntoView({block:'start',behavior:'smooth'});},[playing]);
  const operationLocked=playing||finished||!!r.pendingTask;
  const sceneView=useMemo(()=>({...view,status:playing?'running' as const:'paused' as const}),[view,playing]);
  const persist=()=>{try{saveNotebook(latest.current,lesson,sessionId);setSaveError('');const url=new URL(location.href);url.searchParams.set('session',sessionId);if(latest.current.run.scenario)url.searchParams.set('scenario',latest.current.run.scenario);else url.searchParams.delete('scenario');if(location.href!==url.href)history.replaceState(null,'',url);}catch{setSaveError('本窗口尚未写入本地存储，请下载记录后再离开。');}};
  useEffect(()=>{if(!playing)persist();},[book,playing,lesson,sessionId]);
  useEffect(()=>{const timer=setInterval(persist,1000),pause=()=>{playback.pause('hidden');persist();},visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);};},[lesson,sessionId,playback.pause]);
  useEffect(()=>{setDispatch(book.run.terminal.setup.dispatch);},[book.run.kind,book.trials.length,book.baseline]);
  const advanceContinuously=(minutes:number)=>{if(!playing&&!finished&&!pendingDispatch)playback.start(view.second+minutes*60);};
  const quickCalculate=(minutes:number)=>{playback.reset();send({kind:'advance',minutes});};
  const timedOperation=(command:PortLabCommand)=>{const next=send(command);if(next?.pendingTask)playback.start(next.pendingTask.completesAt);};
  const field=(id:string,label:string,placeholder:string)=><label className="pcl-field">{label}<textarea aria-label={label} value={book.notes[id]??''} maxLength={5000} placeholder={placeholder} onChange={e=>setBook(p=>({...p,notes:{...p.notes,[id]:e.target.value},sealedAt:null}))}/></label>;
  const saveBaseline=()=>{
    if(!finished||r.kind!=='baseline')return;
    playback.reset();const next=createPortClassLab(11,'trial');setDispatch(next.terminal.setup.dispatch);
    setBook(p=>({...p,baseline:p.run,run:next,step:2,sealedAt:null}));
  };
  const saveTrial=(restart=false)=>{
    if(!finished||r.kind!=='trial'||book.trials.length>=3)return;
    playback.reset();const next=restart?createPortClassLab(11,'trial'):r;setDispatch(next.terminal.setup.dispatch);
    setBook(p=>({...p,trials:[...p.trials,p.run],run:next,step:restart?2:3,sealedAt:null}));
  };
  const runs=[...(book.baseline?[book.baseline]:[]),...book.trials];
  const currentSaved=book.trials.some(t=>JSON.stringify(t.commands)===JSON.stringify(r.commands));
  const comparisonRuns=lesson===12?[...book.archive.map(a=>a.run).filter(a=>comparablePortIncident(a,r)),r]:[...runs,...(!currentSaved&&r.kind==='trial'?[r]:[])];
  const hasReportEvidence=lesson===11?!!book.baseline&&book.trials.length>0:finished;
  const requiredNotes=lesson===11?['hypothesis','changes','conclusion','limits']:['scope','barriers','conclusion','handover'];
  const ready=reportReady(book);
  const chartMax=Math.max(10,Math.ceil(Math.max(...r.terminal.samples.flatMap(s=>[s.delivered,s.yard]))/10)*10);
  let sessions:ReturnType<typeof savedNotebooks>=[];try{sessions=savedNotebooks(lesson);}catch{/* the storage status above reports unavailable storage */}
  const complete=()=>{if(!ready){setError('请完成观察并保存试验，为每项复盘写至少15字。失败处置也可复盘；文字只作完整性检查，分析质量由教师复核。');return;}setError('');setBook(p=>({...p,step:3,sealedAt:new Date().toISOString()}));};
  const exportJson=()=>download(JSON.stringify({...packed(book,lesson),exportedAt:new Date().toISOString(),metrics:comparisonRuns.map(x=>({kind:x.kind,...portClassLabMetrics(x)})),boundary:'独立教学模拟；本机学习记录，未上传教学平台。'},null,2),`port-lesson-${lesson}-experiment.json`,'application/json');
  const importJson=async(file:File|undefined)=>{
    if(!file)return;
    try{
      if(file.size>2_000_000)throw Error('记录文件超过2MB');
      const next=decodeNotebook(JSON.parse(await file.text()),lesson);
      download(JSON.stringify(packed(latest.current,lesson),null,2),`port-lesson-${lesson}-before-import.json`,'application/json');
      playback.reset();setSessionId(newNotebookId());latest.current=next;setBook(next);setDispatch(next.run.terminal.setup.dispatch);setScope(next.run.incident?.scope??'gate');
      const audit=next.run.commands.find(c=>c.kind==='audit'||c.kind==='start-audit');setQuarantine(audit&&(audit.kind==='audit'||audit.kind==='start-audit')?[...audit.quarantine]:[]);setError('');
      setNotice('已按逐箱指令重放，数值和完成状态重新核验；原场次保留，新副本在本窗口独立保存。');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  const restart=()=>{playback.reset();setError('');setQuarantine([]);setScope('gate');setComparisonChoice('latest');const next=createPortClassLab(lesson,lesson===11&&book.baseline?'trial':undefined,r.scenario);setDispatch(next.terminal.setup.dispatch);setBook(p=>({...p,archive:[...p.archive,{run:p.run,notes:p.notes,attempts:p.attempts,sealedAt:p.sealedAt}].slice(-8),attempts:[],notes:lesson===12?{}:p.notes,run:next,step:lesson===11&&p.baseline?2:0,sealedAt:null}));};
  return <main className="pcl" data-lesson={lesson} data-lab-version={PORT_CLASS_LAB_VERSION}>
    <header className="pcl-header"><a className="pcl-brand" href="/port-class-lab.html?lesson=11"><span>PORT / FIELD LAB</span><strong>港口管理概论 · 课堂实验</strong></a><nav aria-label="专用实验入口"><a aria-current={lesson===11?'page':undefined} href="/port-class-lab.html?lesson=11">11 · 绩效诊断</a><a aria-current={lesson===12?'page':undefined} href="/port-class-lab.html?lesson=12">12 · 中断恢复</a><a href={`/port-expansion-preview.html?lesson=${lesson}`}>本讲课件 ↗</a><a href="/port-lab-guide.html" target="_blank" rel="noopener">诊断系统使用说明 ↗</a></nav></header>
    <section className="pcl-intro"><div><span className="pcl-eyebrow">第 {lesson} 讲　/　个人电脑实操　/　{lesson===12?'每场景':'约'} 30 分钟</span><h1>{lesson===11?'拥堵从哪里来，改善有没有兑现？':r.scenario?PORT_LAB_SCENARIOS[r.scenario].title:'接口中断后，怎样保持业务并验证恢复？'}</h1><p>{lesson===11?'双船300箱；从同一个拥堵检查点比较岗位安排，用真实箱流与成本检验诊断。':r.scenario?PORT_LAB_SCENARIOS[r.scenario].description:'原版系统中断场景记录；可继续复盘，或选择下方新版场景。'}</p></div><div className="pcl-clock"><span>{r.kind==='baseline'?'基准运行':r.kind==='trial'?`试验 ${Math.min(3,currentSaved?book.trials.length:book.trials.length+1)}`:'事件处置'}</span><strong>第 {format(m.minute,1)} 分钟</strong><small>预置 {r.checkpoint} → 观察 {r.endpoint} 分钟</small></div></section>
    {lesson===12&&<nav className="pcl-scenarios" aria-label="第12讲独立场景">{(['system','equipment'] as const).map((id,index)=><a key={id} aria-current={r.scenario===id?'page':undefined} href={`/port-class-lab.html?lesson=12&scenario=${id}`}><span>场景 {index+1} · 约30分钟</span><strong>{PORT_LAB_SCENARIOS[id].title}</strong><small>{PORT_LAB_SCENARIOS[id].description}</small></a>)}<a className="pcl-task-link" href={`/port-lab-taskbook.html#${r.scenario??'system'}`} target="_blank" rel="noopener">打开／打印场景任务书 ↗</a></nav>}
    {(loaded.error||saveError)&&<aside className="pcl-alert" role="alert">{loaded.error||saveError}{loaded.raw&&<button onClick={()=>download(loaded.raw!,'port-lab-original.txt','text/plain')}>下载原笔记</button>}</aside>}
    {loaded.legacyRaw&&<aside className="pcl-feedback">已保留旧版流量实验记录。本页使用逐箱模型，旧版与本版结果分开保存。<button onClick={()=>download(loaded.legacyRaw!,'port-lab-v1-original.json','application/json')}>下载旧版原记录</button></aside>}
    <nav className="pcl-steps" aria-label="30分钟任务书">{tasks.map((task,i)=><button key={task.title} aria-current={book.step===i?'step':undefined} onClick={()=>setBook(p=>({...p,step:i}))}><b>{i+1}</b><span>{task.title}<small>{task.minutes} 分钟</small></span></button>)}</nav>
    <section className="pcl-task"><div><span className="pcl-eyebrow">任务 {book.step+1} / 4</span><h2>{tasks[book.step]!.title}</h2></div><p>{tasks[book.step]!.body}</p><span className="pcl-task-proof">{lesson===11?book.baseline?`基准已保存 · 试验 ${book.trials.length}/3 份`:'基准尚未保存':`技术工作 ${format(incident!.repairWork,0)}/${r.emergency?.repairTarget??60} 人分钟 · ${incident!.restoredAt===null?'尚未恢复':'已恢复'}`}</span></section>
    {r.emergency&&<PortIncidentEvidence run={r}/>}
    <section className="pcl-kpis" aria-label="实际运行指标">{[
      ['本段已交付',format(m.delivered),'箱'],['全部未交付',format(m.remaining),'箱'],['平均在制量',format(m.averageInProcess),'箱'],['本段等待',format(m.waitingBoxMinutes),'箱分钟'],['本段成本',format(m.cost),'教学单位'],['单位交付成本',format(m.costPerDelivered,2),'单位/箱'],
    ].map(([label,value,unit])=><div key={label}><span>{label}</span><strong>{value}</strong><small>{unit}</small></div>)}</section>
    <div className="pcl-workspace"><section ref={stage} className="pcl-现场">
      <div className="pcl-section-heading"><h2>现场箱流</h2><div className="pcl-camera">{(['overview','quay','yard','gate'] as const).map((v,i)=><button key={v} onClick={()=>scene.current?.camera(v)}>{['总览','岸侧','堆场','闸口'][i]}</button>)}</div></div>
      <PortLabPlaybackControls playback={playback} run={r} finished={finished} pendingDispatch={pendingDispatch} onAdvance={advanceContinuously} onQuickCalculate={quickCalculate}/>
      <div className="pcl-scene"><PortOperationsScene ref={scene} view={sceneView} fieldLab selected={selected} speed={playback.speed} clockLimit={Math.min(playback.targetSecond??Infinity,r.pendingTask?.completesAt??Infinity,...view.jobs.map(j=>j.end??Infinity))} quality="balanced" onSelect={setSelected} onContext={setSelected} onDrop={()=>{}}/><span className="pcl-scene-label">{incident?r.scenario==='equipment'?(incident.restoredAt!==null?'场桥1复工 · 继续核查积压':incident.testing?'场桥1受控试吊 · 实际3次交接':'场桥1保护停机 · 其他作业按当前指令运行'):incident.restoredAt!==null?'电子交付恢复 · 继续消化积压':incident.manual?'备用交付 · 已核验额度内':incident.testing?'受控试运行 · 3箱': '电子交付暂停 · 内部作业独立判断':'同检查点试验 · 固定设备与货量'}</span></div>
      <PortLabLiveOperations view={view} onFocus={id=>{setSelected(id);scene.current?.focus(id);}}/>
      <div className="pcl-flow" aria-label="队列与近10分钟实际出流">{['岸侧已接箱','运输与交接','场内待交付'].map((label,i)=><div key={label}><span>{label}</span><strong>{format(m.queues[i]!)}</strong><meter min={0} max={i===0?60:i===1?40:280} value={m.queues[i]}/><small>近10分钟 {format(flows[i+1]!)} 箱/时</small></div>)}</div>
      <p className="pcl-feedback" role="status">{r.feedback}</p>{pendingDispatch&&<p className="pcl-alert" role="status">岗位修改尚未应用，请先应用配置，再运行试验。</p>}{error&&<p className="pcl-alert" role="alert">{error}</p>}
      <p className="pcl-caption">逐箱作业模型；300箱守恒。空驶、道路等待、设备交接和闸口核验均计时；外集卡为4辆独立提箱车。离开页面自动暂停。已交付与成本均从预置检查点增量计算；未交付包括仍在船、岸侧、运输和堆场的全部剩余量。</p>
    </section><aside className="pcl-operation"><h2>{lesson===11?'岗位与试验设计':'事件处置台'}</h2>
      {lesson===11?<><p>设备数量固定：4台岸桥、8辆集卡、3台场桥、2道闸口。基准为2名司机、1名闸口员；岗位不是设备能力的同义词。</p><fieldset disabled={playing||r.kind==='baseline'||r.terminal.minute!==r.checkpoint}><legend>试验开局岗位</legend>{([['craneOperators','岸桥操作员',4],['drivers','集卡司机',8],['yardOperators','场桥操作员',3],['gateClerks','闸口岗位',2],['technicians','技术岗位',2]] as const).map(([id,label,max])=><label className="pcl-number" key={id}>{label}<input aria-label={label} type="number" min={0} max={max} value={dispatch[id]} onChange={e=>setDispatch(p=>({...p,[id]:Number(e.target.value)}))}/></label>)}<button onClick={()=>send({kind:'dispatch',value:dispatch})}>应用岗位配置</button></fieldset><p className="pcl-caption">新增人员产生实际教学成本；多项改动应全部披露。运输能力还受距离约束。</p>{r.kind==='baseline'?<button className="pcl-primary" disabled={!finished} onClick={saveBaseline}>保存基准并建立试验</button>:<div className="pcl-stack"><button className="pcl-primary" disabled={!finished||currentSaved||book.trials.length>=3} onClick={()=>saveTrial()}>保存本次试验</button><button disabled={!finished||currentSaved||book.trials.length>=2} onClick={()=>saveTrial(true)}>保存并建立下一试验</button></div>}</>:r.scenario?<PortIncidentControls run={r} locked={operationLocked} scope={scope} onScope={setScope} quarantine={quarantine} onQuarantine={setQuarantine} onSend={send} onTimed={timedOperation}/>:<>
        <p>告警：接口记录不可信。最后可信快照第75分钟，故障第90分钟。RTO目标60分钟；RPO目标10分钟。</p>
        <div className="pcl-stack"><button disabled={operationLocked||incident!.recorded} onClick={()=>send({kind:'record'})}>固定事件证据</button><label>隔离范围<select aria-label="隔离范围" value={scope} disabled={incident!.isolated||operationLocked} onChange={e=>setScope(e.target.value as 'gate'|'all')}><option value="gate">仅隔离受影响接口</option><option value="all">同时暂停全部内部箱流</option></select></label><button disabled={operationLocked||incident!.isolated} onClick={()=>send({kind:'isolate',scope})}>执行所选隔离</button><button disabled={operationLocked||!incident!.isolated} onClick={()=>send({kind:'resume-internal'})}>恢复非受影响内部作业</button></div>
        <details open><summary>独立备用记录核验</summary><p className="pcl-caption">勾选须隔离的异常行。可信版本18；每一票号只能保留一条有效记录。“独立核验”来自本情境另一份记录。</p><div className="pcl-table"><table><thead><tr><th>隔离</th><th>票号</th><th>版本</th><th>申报/独立</th></tr></thead><tbody>{PORT_LAB_LEDGER.map(row=><tr key={row.id}><td><input type="checkbox" aria-label={`隔离${row.id}`} checked={quarantine.includes(row.id)} disabled={incident!.backupVerified||operationLocked} onChange={e=>setQuarantine(p=>e.target.checked?[...p,row.id]:p.filter(id=>id!==row.id))}/>{row.id}</td><td>{row.ticket}</td><td>{row.version}</td><td>{row.declared}/{row.independent}</td></tr>)}</tbody></table></div><button disabled={operationLocked||incident!.backupVerified} onClick={()=>timedOperation({kind:'start-audit',quarantine})}>核验备用记录 · 耗时10分钟</button></details>
        <div className="pcl-stack"><button disabled={operationLocked||incident!.manual||incident!.manualDelivered>=24||incident!.restoredAt!==null} onClick={()=>send({kind:'manual'})}>启用有限备用交付</button><small>已用 {format(incident!.manualDelivered)}/24 箱；单道额定22箱/时，另计2名复核人员成本。</small><button disabled={operationLocked||incident!.repairStarted} onClick={()=>send({kind:'repair'})}>启动技术恢复 · 2名技术人员</button><progress max={60} value={incident!.repairWork}/><small>技术工作 {format(incident!.repairWork)}/60 人分钟；时钟推进才产生进度。</small><button disabled={operationLocked||incident!.dataChecked} onClick={()=>timedOperation({kind:'start-reconcile'})}>恢复记录对账 · 耗时10分钟</button><button disabled={operationLocked||incident!.testing||incident!.testPassed} onClick={()=>send({kind:'test'})}>启动3箱受控试运行</button><small>已验证 {format(incident!.testDelivered)}/3 箱</small><button className="pcl-primary" disabled={operationLocked||incident!.restoredAt!==null} onClick={()=>send({kind:'restore'})}>审查证据并恢复电子交付</button></div>
      </>}
    </aside></div>
    <PortFacilityReadout view={view} onSelect={setSelected} individualVehicles/>
    {lesson===12&&<section className="pcl-plan-comparison"><h2>选择方案对照</h2><label>诊断图表中的基准<select aria-label="图表对照方案" value={comparisonChoice} onChange={e=>setComparisonChoice(e.target.value)}><option value="latest">最近一份已完成的同场景方案</option><option value="none">暂不叠加</option>{completedPlans.map(p=><option key={p.index} value={p.index}>历史方案 {p.index+1} · 第{p.run.terminal.minute}分钟</option>)}</select></label><p>{comparisonPlan?'已选方案以浅色／虚线显示；与当前使用相同设备和已观察时间窗。':'完成到第240分钟后，点击“从同一开局重开方案”，即可在下一方案中叠加图表。'}不同场景、不同规则版本不进入同一组对照。</p></section>}
    <PortLabAnalysis run={r} baseline={comparisonPlan} dashboard={book.analysis} selected={selected} onSelect={setSelected} onChange={analysis=>setBook(p=>({...p,analysis}))} onFocus={id=>{setSelected(id);scene.current?.focus(id);stage.current?.scrollIntoView({block:'start',behavior:'smooth'});}}/>
    <section className="pcl-results"><div className="pcl-section-heading"><h2>{lesson===11?'基准与试验对照':'恢复与经营影响'}</h2><button disabled={playing||lesson===11&&book.trials.length>=3} title={lesson===11&&book.trials.length>=3?'本场已保留3份试验，请继续复盘或恢复历史场次。':undefined} onClick={restart}>{lesson===11&&book.baseline?'从同一检查点重开试验':r.scenario?'从同一开局重开方案':'从预置现场重开'}</button></div>
      {lesson===11?<div className="pcl-table"><table><caption>统一第360分钟观察；运行未结束的行标为“进行中”。</caption><thead><tr><th>记录</th><th>操作员/司机/场桥/闸口/技术</th><th>观察分钟</th><th>新增交付 / 较基准</th><th>本段成本 / 较基准</th><th>全部未交付</th><th>平均在制</th><th>单位交付成本</th><th>第300分钟交付/300</th></tr></thead><tbody>{comparisonRuns.map((run,i)=>{const v=portClassLabMetrics(run);return <tr key={i}><th>{run.kind==='baseline'?'基准':`试验 ${i}`} {!portLabFinished(run)&&'· 进行中'}</th><td>{(['craneOperators','drivers','yardOperators','gateClerks','technicians'] as const).map(k=>run.terminal.setup.dispatch[k]).join(' / ')}</td><td>{format(v.minute)}</td><td>{format(v.delivered)} / {book.baseline?format(v.delivered-portClassLabMetrics(book.baseline).delivered):'—'}</td><td>{format(v.cost,2)} / {book.baseline?format(v.cost-portClassLabMetrics(book.baseline).cost,2):'—'}</td><td>{format(v.remaining)}</td><td>{format(v.averageInProcess)}</td><td>{format(v.costPerDelivered,2)}</td><td>{v.deadlineShare===null?'—':format(v.deadlineShare*100)+'%'}</td></tr>;})}</tbody></table>{!book.baseline&&<p>完成基准运行后，此处显示可比结果。保存基准不会带走预置现场，试验始终从第120分钟重新分支。</p>}</div>:r.scenario?<PortIncidentSummary run={r}/>:<div className="pcl-recovery-grid"><div><span>服务恢复耗时 / RTO 60分钟</span><strong>{m.recoveryMinutes===null?'尚未恢复':`${format(m.recoveryMinutes)} 分钟 · ${m.recoveryMinutes<=60?'达标':'超出目标'}`}</strong><p>技术工作完成不会自动登记服务恢复；以审查通过时点计时。</p></div><div><span>初始可恢复点 / RPO目标10分钟</span><strong>落后15分钟 · 初始备份超出目标</strong><p>此处显示故障时的记录暴露窗口；最终数据丢失量须另凭完整重建证据确认。</p></div><div><span>恢复后的积压</span><strong>{format(m.remaining)} 箱未交付</strong><p>服务恢复与积压清空分别核对；继续运行至观察终点才能评价经营影响。</p></div></div>}
      <div className="pcl-chart"><svg viewBox="0 0 1000 200" role="img" aria-label="本次实际累计交付与堆场积压轨迹"><line x1="45" y1="170" x2="970" y2="170" stroke="#8aa79d"/>{[0,chartMax/3,chartMax*2/3,chartMax].map(n=><g key={n}><line x1="45" y1={170-n/chartMax*150} x2="970" y2={170-n/chartMax*150} stroke="#d6e0d6"/><text x="5" y={174-n/chartMax*150}>{format(n,0)}</text></g>)}{(['delivered','yard'] as const).map((id,i)=><polyline key={id} fill="none" stroke={i?'#b96b36':'#216c73'} strokeWidth="3" points={r.terminal.samples.filter(s=>s.minute>=r.checkpoint).map(s=>`${45+(s.minute-r.checkpoint)/(r.endpoint-r.checkpoint)*925},${170-s[id]/chartMax*150}`).join(' ')}/>)}<text x="45" y="195">第{r.checkpoint}分钟</text><text x="845" y="195">第{r.endpoint}分钟</text><text x="620" y="25" fill="#216c73">累计交付</text><text x="800" y="25" fill="#b96b36">堆场积压</text></svg></div>
      <div className="pcl-notes">{lesson===11?<>{field('hypothesis','改善假设与可推翻它的证据','指出哪个队列和哪项能力支持诊断；什么结果会使你放弃这个解释？')}{field('changes','改动项及实验控制','列出全部岗位改动、同一检查点和观察终点；区分单项试验与协同方案。')}{field('conclusion','结果与经营建议','至少引用一项改善、一项代价或未解决问题，说明保留、修改或否定哪项建议。')}{field('limits','适用范围与下一次验证','这次模型没有覆盖哪些真实条件？下一次需要什么记录或不同情境？')}</>:<>{field('scope','影响范围与隔离依据','引用已取得的现场证据，说明暂停或保留哪些业务，以及处置代价。')}{field('barriers','失效屏障与共同依赖',r.scenario==='equipment'?'说明保护停机、安全隔离、替代设备和维修依赖；引用故障与转场记录。':'指出哪道屏障依赖哪份资料；说明独立记录和复核能解决什么问题。')}{field('conclusion','恢复证据与目标核对',r.scenario==='equipment'?'比较同终点方案的维修、实际试吊、复工时点、车辆等待和成本；说明替代设备的原区代价。':'比较同终点方案的恢复时点、交付、等待和成本；解释RTO、初始恢复点与积压。')}{field('handover','责任交接与下一班任务','写清仍未完成的工作、责任岗位、下一项证据和触发复核的条件。')}</>}</div>
      <div className="pcl-report"><button className="pcl-primary" disabled={playing} onClick={complete}>完成并保存复盘</button><button onClick={exportJson}>下载完整实验记录 JSON</button><button onClick={()=>download(portLabCsv(comparisonRuns.length?comparisonRuns:[r]),`port-lesson-${lesson}-results.csv`,'text/csv;charset=utf-8')}>下载结果 CSV</button><label className="pcl-import">载入JSON复盘<input aria-label="载入JSON复盘" type="file" accept="application/json,.json" onChange={e=>{void importJson(e.target.files?.[0]);e.target.value='';}}/></label><span role="status">{saveError?'本窗口尚未自动保存，请下载备份。':book.sealedAt?lesson===12&&incident?.restoredAt===null?'失败处置复盘已保存，可下载提交。':'复盘已在本机保存，可下载提交。':'本窗口独立保存进度与草稿；未上传教学平台。'}</span></div>{notice&&<p className="pcl-feedback" role="status">{notice}</p>}
    </section>
    {lesson===12&&book.archive.length>0&&<PortIncidentHistory current={r} archive={book.archive}/>}
    <details className="pcl-log"><summary>查看实际操作与事件记录（{r.events.length}条）</summary><ol>{r.events.map((event,i)=><li key={i}><time>第 {format(event.minute)} 分钟</time>{event.text}</li>)}</ol>{book.attempts.length>0&&<><h3>被前置条件拒绝的尝试</h3><ol>{book.attempts.map((a,i)=><li key={i}><time>第 {format(a.minute)} 分钟</time>{a.message}</li>)}</ol></>}</details>
    <details className="pcl-log"><summary>恢复本机历史场次</summary><p>每个窗口独立写入。载入会建立副本，保留原场次；刷新前后的记录均可在此找回。</p><label>选择场次<select aria-label="恢复历史场次" defaultValue="" disabled={playing} onChange={e=>{if(e.target.value){persist();location.assign(`/port-class-lab.html?lesson=${lesson}&session=${encodeURIComponent(e.target.value)}`);}}}><option value="">请选择</option>{sessions.filter(s=>s.id!==sessionId).map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label></details>
    <footer className="pcl-footer">本实验为独立教学情境，参数与票据均为课程设定。与综合模拟共用逐箱、车辆及设施内核，不重演新加坡、天津或名古屋现场。<a href={`/port-expansion-preview.html?lesson=${lesson}&student=1`}>阅读本讲课件</a> · <a href={lesson===11?'/handouts/port-facilities-v20-l11/port-management-lesson-11-v20-facilities.pdf':'/handouts/port-facilities-v20-l12/port-management-lesson-12-v20-facilities.pdf'} download>下载本讲PDF</a> · <a href="/port-simulation-preview.html?course=full">48小时综合实训</a></footer>
  </main>;
}



