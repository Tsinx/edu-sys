import { useCallback, useContext, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { ClassroomActor } from '@edu/contracts';
import { Anchor, ArrowRight, Bell, Boxes, ChartColumn, CheckCircle2, Cpu, Download, GraduationCap, Menu, Pause, Play, Save, ShipWheel, Users, X } from 'lucide-react';
import { SCENARIOS, CARGO_LABELS, ENTERPRISE_VERSION, enterpriseRulesMatch, assetSpec, hourLabel, type EnterpriseCommand, type EnterpriseConfig, type EnterpriseRecord } from '@edu/port-simulation-core';
import { api } from '../../../api';
import { FullscreenButtons } from '../../classroom/FullscreenButtons';
import { usePresentationFullscreen } from '../../classroom/usePresentationFullscreen';
import { PageToolsProvider, PresentationToolbar } from '../../classroom/PageTools';
import '../../classroom/page-tools.css';
import { useEnterprise } from './useEnterprise';
import { EnterpriseScene, type EnterpriseSceneSelection } from './EnterpriseScene';
import { EnterpriseDrafts, DraftsContext, EnterpriseFeedbackContext, CommandForm, EnterpriseTable, wan, pct, useEnterpriseDraft } from './EnterpriseForms';
import { AssetsPanel, ProjectsPanel, StaffPanel, DispatchPanel, ShipsPanel, CargoPanel, LogisticsPanel, MarketPanel, FinancePanel, EnergyPanel, DigitalPanel, EmergencyPanel, AnalysisPanel, JournalPanel, HandbookPanel, type Comparison, type PanelProps } from './EnterprisePanels';
import {EnterpriseHubPanel,LogisticsPolicyPanel,workspaceParent} from './EnterpriseStrategyPanels';
import { EnterpriseTasks } from './EnterpriseTasks';
import { EnterpriseTeachingCoach } from './EnterpriseTeachingCoach';
import { EnterpriseRecoveryNotice } from './EnterpriseRecoveryNotice';
import {ManagementPanel,ManagementStaffPanel,ManagementEnergyPanel,YardPanel,ReviewPanel,TechnologyPanel,ManagementEmergencyPanel} from './EnterpriseManagement';
import { ENTERPRISE_TEACHING_VERSION,currentTeachingStep,teachingAllowsCommand } from './enterprise-teaching';
import { downloadEnterprise, enterpriseScope } from './enterprise-storage';
import {parseEnterpriseImport} from './enterprise-import';
import {EnterpriseTopBar} from './EnterpriseTopBar';
import {TrendsPanel,DirectorPanel,CraneAllocationPanel} from './EnterpriseDirectorPanels';
import {enterpriseClockStep,DIRECTOR_MODE_LABELS} from './enterprise-clock';
import type {EnterpriseSceneLayer} from './EnterpriseScene';
import { ENTERPRISE_WORKSPACES,ENTERPRISE_MAIN_WORKSPACES, enterpriseDecisionFeedback, nextEnterpriseObservation, workspaceLabel, type EnterpriseDecisionFeedback } from './enterprise-game';
import type {EnterpriseYardExperiment} from '@edu/port-simulation-core';
import './enterprise.css';
import './enterprise-game.css';
import './enterprise-management.css';
import './enterprise-tour.css';
import './enterprise-director.css';

declare global { interface Window { __PORT_ENTERPRISE_OFFLINE__?: boolean; } }
export function EnterprisePage() {
  const offline = typeof window !== 'undefined' && (!!window.__PORT_ENTERPRISE_OFFLINE__ || new URLSearchParams(window.location.search).get('offline') === '1');
  const [identity, setIdentity] = useState<{ actor?: ClassroomActor; confirmed: boolean; ready: boolean }>({ confirmed:false,ready:offline });
  useEffect(()=>{
    if(offline)return;
    let live=true;
    void api.getIdentitySession().then(session=>{if(!live)return;setIdentity({actor:session.actor,confirmed:true,ready:true});try{localStorage.setItem('edu-enterprise-last-identity',JSON.stringify({actorId:session.actor.actorId,displayName:session.actor.displayName}));}catch{/* Local saves still support export. */}}).catch(()=>{
      if(!live)return;
      let actor:ClassroomActor|undefined;
      try{const cache=JSON.parse(localStorage.getItem('edu-enterprise-last-identity')??'null');if(cache?.actorId)actor={actorId:cache.actorId,displayName:cache.displayName,roles:['student'],identitySource:'development'};}catch{/* Anonymous practice remains available. */}
      setIdentity({actor,confirmed:false,ready:true});
    });return()=>{live=false;};
  },[offline]);
  if(!identity.ready)return <main className="enterprise-boot" role="status"><ShipWheel size={42}/><h1>正在打开个人经营空间</h1><p>确认身份后，生产计算与存档在当前电脑运行。</p></main>;
  return <EnterpriseDrafts><EnterpriseApp key={enterpriseScope(identity.actor?.actorId)} actor={identity.actor} confirmed={identity.confirmed} offline={offline}/></EnterpriseDrafts>;
}
function EnterpriseApp({actor,confirmed,offline}:{actor?:ClassroomActor;confirmed:boolean;offline:boolean}) {
  const runtime=useEnterprise(enterpriseScope(actor?.actorId)),v=runtime.view;
  const drafts=useContext(DraftsContext),saveId=runtime.currentSave?.id;
  useEffect(()=>{if(saveId)drafts.selectScope(saveId);},[saveId,drafts.selectScope]);
  const [surface,setSurface]=useState<string|null>(()=>{const t=new URLSearchParams(window.location.search).get('tab');return t&&t!=='overview'&&ENTERPRISE_WORKSPACES.some(w=>w.id===t)?t:null;});
  const [selected,setSelected]=useState('T1'),[playing,setPlaying]=useState(false),[comparisons,setComparisons]=useState<Comparison[]>([]);
  const [layer,setLayer]=useState<EnterpriseSceneLayer>('load'),[contextOpen,setContextOpen]=useState(false);
  const [menuSearch,setMenuSearch]=useState(''),[outcome,setOutcome]=useState<EnterpriseDecisionFeedback|null>(null);
  const [submission,setSubmission]=useState<{id:string;position:number}>();
  const [experiment,setExperiment]=useState<EnterpriseYardExperiment>();
  useEffect(()=>{setOutcome(null);setSubmission(undefined);setExperiment(undefined);setPlaying(false);},[saveId]);
  const current=useRef(v);current.current=v;
  const windowRef=useRef<HTMLElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const fullscreen=usePresentationFullscreen({onError:runtime.setError});
  const writeDisabled=runtime.busy||runtime.replaying||!!v?.sealed||runtime.conflict||runtime.workerFailed;
  const failed=v?.finance.status==='bankrupt',disabled=writeDisabled||failed;
  useEffect(()=>{if(runtime.conflict||runtime.workerFailed)setPlaying(false);},[runtime.conflict,runtime.workerFailed]);
  const guided=!!(runtime.currentSave?.teaching?.schema===ENTERPRISE_TEACHING_VERSION&&runtime.currentSave.teaching.active&&!runtime.currentSave.attemptId&&v?.config.mode==='practice'&&!v.sealed&&!failed&&!v.finance.tutorialPaused&&!runtime.replaying);
  const tutorial=guided&&v&&runtime.currentSave?.teaching?currentTeachingStep(v,runtime.currentSave.record,runtime.currentSave.teaching):undefined;
  const teachingState=useRef({guided,profile:runtime.currentSave?.teaching,record:runtime.currentSave?.record});teachingState.current={guided,profile:runtime.currentSave?.teaching,record:runtime.currentSave?.record};
  const navigate=useCallback((id:string)=>{
    setPlaying(false);
    windowRef.current?.querySelector<HTMLElement>('.enterprise-game-window__body')?.scrollTo({top:0,left:0,behavior:'instant'});
    windowRef.current?.querySelector<HTMLElement>('[data-window-close]')?.focus({preventScroll:true});
    setSurface(id==='overview'?null:id);if(id==='menu')setMenuSearch('');
  },[]);
  const openContext=(id:string,terminal=selected)=>{
    setSelected(terminal);
    if(id==='assets'){drafts.set('assets-terminal',terminal);drafts.set('asset-order.terminal',terminal);}
    if(id==='projects')drafts.set('project.terminal',terminal);
    if(id==='logistics')drafts.set('logistics-terminal',terminal);
    if(id==='cargo')drafts.set('cargo-filter',terminal);
    if(id==='ships'){
      const call=v?.calls.find(c=>c.terminalId===terminal&&c.stage!=='leaving');if(call)drafts.set('selected-call',call.id);
    }
    navigate(id);
  };
  const selectObject=(item:EnterpriseSceneSelection)=>{
    setSelected(item.terminalId);
    if(item.kind==='ship'){drafts.set('selected-call',item.id);navigate('ships');}
    else if(item.kind==='asset'){drafts.set('assets-terminal',item.terminalId);drafts.set('asset-order.terminal',item.terminalId);drafts.set('assets-filter','all');drafts.set('assets-focus',item.id);navigate('assets');}
  };
  const act=useCallback((command:EnterpriseCommand)=>{
    const before=current.current;if(!before)return;
    const lesson=teachingState.current;if(lesson.guided&&lesson.profile&&!teachingAllowsCommand(before,lesson.record,lesson.profile,command))return;
    void runtime.command(command).then(m=>{if(m.view?.result?.ok)setOutcome(enterpriseDecisionFeedback(before,m.view,command));}).catch(e=>runtime.setError((e as Error).message));
  },[runtime.command,runtime.setError]);
  const advance=useCallback(async(hours:number)=>{
    const before=current.current;if(!before||runtime.busy||runtime.replaying||before.sealed||before.finance.status==='bankrupt'||before.finance.tutorialPaused||hours<=0)return;
    const command:EnterpriseCommand={kind:'advance',hours:Math.min(hours,before.horizon-before.hour),stopOnIncident:true,stopAtVisit:true};
    const lesson=teachingState.current;if(lesson.guided&&lesson.profile&&!teachingAllowsCommand(before,lesson.record,lesson.profile,command))return;
    setOutcome(null);
    try{
      const result=await runtime.command(command);
      if(result.view){
        if(result.view.management.attention.some(id=>!before.management.attention.includes(id))){setPlaying(false);setSurface(null);const incident=result.view.incidents.find(i=>result.view!.management.attention.includes(i.id));if(incident?.terminalId)setSelected(incident.terminalId);}
        if(result.view.finance.status==='bankrupt'||result.view.finance.tutorialPaused){setPlaying(false);setSurface('finance');}
        else if(result.view.finance.status==='distress'&&before.finance.status!=='distress'){setPlaying(false);setSurface('finance');}
        if(result.view.hour===result.view.horizon||result.view.result?.ok===false)setPlaying(false);
        if(result.view.director.mode!==before.director.mode&&!lesson.guided&&!['distress','bankrupt'].includes(result.view.finance.status)&&!result.view.finance.tutorialPaused){setPlaying(false);setSurface(null);setOutcome({title:result.view.director.mode==='observation'?'本月现场观察日开始':before.director.mode==='observation'?'现场日结束，恢复日常简报':'总经理管理状态已更新',message:'日常与现场共用同一座港口、经营时钟和完整责任。',changes:['可从顶部经营菜单查看巡港日程'],workspace:'director'});}
        if(lesson.guided&&lesson.profile){const step=currentTeachingStep(before,lesson.record,lesson.profile);if(step.kind==='advance'&&result.view.hour>=(step.planHour??before.horizon))setPlaying(false);}
      }
    }catch(e){setPlaying(false);runtime.setError((e as Error).message);}
  },[runtime.busy,runtime.replaying,runtime.command,runtime.setError]);
  useEffect(()=>{if(!playing||runtime.busy||disabled||surface||!v||v.hour>=v.horizon||v.finance.tutorialPaused)return;if(guided&&tutorial?.kind!=='advance')return;const step=enterpriseClockStep(v,guided?tutorial?.planHour:undefined);if(!step){setPlaying(false);return;}const id=setTimeout(()=>void advance(step.hours),step.delay);return()=>clearTimeout(id);},[playing,runtime.busy,disabled,surface,guided,v,tutorial?.id,tutorial?.planHour,advance]);
  useEffect(()=>{const pause=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[]);
  const hasWindow=surface!==null;
  useEffect(()=>{
    if(!hasWindow||!v||guided)return;
    returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!document.fullscreenElement){e.preventDefault();e.stopPropagation();setSurface(null);return;}
      if(e.key!=='Tab')return;
      const controls=[...windowRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')??[]].filter(e=>e.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',key,true);
    (windowRef.current?.querySelector<HTMLElement>('[data-teaching-highlight="true"]')??windowRef.current?.querySelector<HTMLElement>('[data-window-close]'))?.focus({preventScroll:true});
    return()=>{document.removeEventListener('keydown',key,true);if(returnFocus.current?.isConnected)returnFocus.current.focus({preventScroll:true});};
  },[hasWindow,!!v,guided]);
  const requestRecord=async()=>{try{const r=await runtime.send({type:'record'});if(r.record)downloadEnterprise('东湾港-个人经营-'+(v?.hour??0)+'小时.json',r.record);}catch(e){runtime.setError((e as Error).message);}};
  const csv=async()=>{try{const r=await runtime.send({type:'csv'});downloadEnterprise('东湾港-月度财务与能源.csv',r.csv??'','text/csv');}catch(e){runtime.setError((e as Error).message);}};
  const importFile=async(e:ChangeEvent<HTMLInputElement>)=>{setPlaying(false);const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>8000000)throw Error('存档超过8MB。');await runtime.importRecord(parseEnterpriseImport(await file.text()));setSurface(null);}catch(reason){runtime.setError((reason as Error).message);}};
  if(!v)return <main className="enterprise-boot" role="status">
    <ShipWheel size={42}/><h1>正在打开东湾港</h1>
    <p>{runtime.busy?(runtime.progress||'正在本机重建经营记录…'):runtime.listError?'原有存档保留，恢复读取后可继续原场次。':runtime.error.includes('版本')?'经营规则已更新，原记录保留。请新建当前版本场次，旧记录仍可导出备份。':'准备个人仿真引擎…'}</p>
    {runtime.error&&<p role="alert">{runtime.error}</p>}{runtime.storageError&&<p role="alert">{runtime.storageError}</p>}{runtime.listError&&<p role="alert">{runtime.listError}</p>}
    {runtime.workerFailed&&<button disabled={runtime.busy} onClick={()=>void runtime.recover().catch(e=>runtime.setError(e.message))}>恢复本机计算</button>}
    {runtime.listError&&<button disabled={runtime.busy} onClick={()=>void runtime.retryStorage().catch(e=>runtime.setError(e.message))}>重试读取本机存档</button>}
    {!runtime.workerFailed&&(runtime.error||runtime.listError)&&<button disabled={runtime.busy} onClick={()=>void runtime.create({seed:20261025,years:10,scenario:'balanced',mode:'practice'}).catch(e=>runtime.setError(e.message))}>{runtime.listError?'另建练习（保留原存档）':'新建个人练习'}</button>}
  </main>;
  const props:PanelProps={v,act,disabled,selected,select:setSelected,navigate};
  const chosen=v.terminals.find(t=>t.id===selected)??v.terminals[0]!;
  const pending=v.incidents.filter(i=>v.management.attention.includes(i.id));
  const attention=pending.length+v.assets.filter(a=>a.status==='commissioning').length;
  const calls=v.calls.filter(c=>(c.plannedTerminal??c.terminalId)===chosen.id);
  const observation=nextEnterpriseObservation(v);
  const clock=enterpriseClockStep(v,guided&&tutorial?.kind==='advance'?tutorial.planHour:undefined);
  const closed=!!v.sealed||v.hour>=v.horizon||failed;
  const canSeal=!writeDisabled&&v.hour>=24&&(!guided||v.hour>=v.horizon&&['经营决策','设备投资','生产调度','异常与边界'].every(t=>v.notes.some(n=>n.topic===t&&n.text.trim().length>=20)));
  const saveObservation=()=>setComparisons(old=>[...old,{title:'观察 '+(old.length+1),hour:v.hour,config:JSON.stringify(v.config),rules:JSON.stringify(v.rules),score:structuredClone(v.score),goods:structuredClone(v.goods)}].slice(-12));
  const inlineResponse=submission&&v.journal.length===submission.position+1;
  const error=runtime.error||runtime.storageError||runtime.listError||drafts.error||(!inlineResponse&&v.result?.ok===false?v.result.message:'');
  const menuEntries=ENTERPRISE_WORKSPACES.filter(w=>!menuSearch.trim()||(w.label+w.description).toLowerCase().includes(menuSearch.trim().toLowerCase()));
  const renderMenu=(advanced:boolean)=>[...new Set(menuEntries.filter(w=>!['learning','storage','tasks'].includes(w.id)&&ENTERPRISE_MAIN_WORKSPACES.has(w.id)!==advanced).map(w=>w.group))].map(group=><section className="enterprise-game-menu-group" key={group}><h3>{group}</h3><div>{menuEntries.filter(w=>!['learning','storage','tasks'].includes(w.id)&&w.group===group&&ENTERPRISE_MAIN_WORKSPACES.has(w.id)!==advanced).map(w=><button key={w.id} data-enterprise-control={'menu-'+w.id} onClick={()=>navigate(w.id)}><span><strong>{w.label}</strong><small>{w.description}</small></span><ArrowRight size={17}/></button>)}</div></section>);
  const runExperiment=()=>{void runtime.send({type:'experiment'}).then(r=>setExperiment(r.experiment)).catch(e=>runtime.setError(e.message));};
  const title=surface==='menu'?'经营菜单':surface==='events'?'事件与待办':workspaceLabel(surface??'');
  const outcomeCard=outcome&&!guided&&<details className="enterprise-game-outcome"><summary><CheckCircle2 size={16}/><strong>{outcome.title}</strong><span>{outcome.changes[0]}</span></summary><p>{outcome.message}</p><ul>{outcome.changes.slice(1).map(t=><li key={t}>{t}</li>)}</ul><div><button onClick={()=>navigate(outcome.workspace)}>查看相关业务<ArrowRight size={14}/></button><button onClick={()=>setOutcome(null)} aria-label="收起本次结果">知道了</button></div></details>;
  return <EnterpriseFeedbackContext.Provider value={{control:submission?.id,result:inlineResponse?v.result??undefined:undefined,submit:id=>setSubmission({id,position:v.journal.length})}}><PageToolsProvider pageKey="port-enterprise" role="student">
  <div ref={fullscreen.containerRef} tabIndex={-1} className={'enterprise-app enterprise-game '+(hasWindow?'has-window ':'')+fullscreen.fullscreenClassName} data-enterprise-hour={v.hour} data-enterprise-schema={v.schema} onFocusCapture={e=>{if((e.target as HTMLElement).matches('input,textarea,select'))setPlaying(false);}}>
    <EnterpriseRecoveryNotice runtime={runtime} onExport={requestRecord} navigate={navigate}/>
    <main className="enterprise-game-harbor" aria-label="东湾港经营现场"><EnterpriseScene view={v} selected={selected} layer={layer} mode={v.director.mode} onSelect={id=>{setSelected(id);setContextOpen(true);setPlaying(false);}} onObjectSelect={selectObject} animate={playing&&!runtime.busy}/></main>
    <EnterpriseTopBar v={v} navigate={navigate} attention={attention} formal={!!runtime.currentSave?.attemptId}/>
    {!hasWindow&&<>
      <div className="enterprise-director-scene-tools" aria-label="场景图层与现场查询"><label><span>场景图层</span><select aria-label="港口场景图层" value={layer} onChange={e=>{setLayer(e.target.value as EnterpriseSceneLayer);setPlaying(false);}}><option value="normal">场景原貌</option><option value="load">设备负荷 · 过去24小时</option><option value="staff">岗位保障 · 过去24小时</option><option value="health">设备当前健康</option></select></label><button data-enterprise-control="scene-load" onClick={()=>{setLayer('load');setPlaying(false);}}>设备负荷</button><button className="enterprise-layer-helper" onClick={()=>navigate('cranes')}>岸桥分配</button></div>
      <div className={'enterprise-director-phase '+(v.director.mode!=='briefing'&&!closed?'is-onsite':'')}><div><strong>{closed?failed?'经营失败':v.hour>=v.horizon?'本期经营完成':'本场已封存':DIRECTOR_MODE_LABELS[v.director.mode]}</strong><span>{closed?'可查看报告、经营记录与未完责任':v.director.mode==='observation'?'本次现场日剩余 '+v.director.remaining+' 小时':v.director.mode==='emergency'?'经营已停在事件时点，先核对影响与处置':'下次巡港 '+hourLabel(v.director.nextVisit).slice(5,16)}</span></div><button data-enterprise-control="director-site-inspect" onClick={()=>navigate(closed?'reports':v.director.mode==='emergency'?'emergency':'cranes')}>{closed?'查看报告':v.director.mode==='emergency'?'到场处置':'查看现场'}</button></div>
      <div className="enterprise-director-layer-legend" aria-label="图层图例">{layer==='normal'?<span>场景原貌 · 点击港区或设备查看实际业务</span>:<><span>{layer==='load'?'作业时长占比':layer==='staff'?'已配岗位占比':'当前健康 100 → 0'}</span><i className="enterprise-director-gradient"/><span>{layer==='health'?'健康 → 损耗':'0% → 100%'}</span><span>× 停机或受阻 · 空白为无样本</span></>}<span>{v.director.mode==='briefing'?'日常流量示意':'当前作业现场'}</span></div>
      <section className={'enterprise-game-context '+(!contextOpen?'is-collapsed':'')} aria-label="选中作业区">{!contextOpen?<button onClick={()=>setContextOpen(true)} aria-label={'展开'+chosen.name+'现场信息'}><strong>{chosen.id} · {chosen.name}</strong><span>查看港区 ↑</span></button>:<><button className="enterprise-context-close" aria-label="收起作业区信息" onClick={()=>setContextOpen(false)}><X size={15}/></button><label className="enterprise-management-select">查看港区<select aria-label="选择港区" value={selected} onChange={e=>{setSelected(e.target.value);setPlaying(false);}}>{v.terminals.map(t=><option key={t.id} value={t.id}>{t.id} · {CARGO_LABELS[t.goods].name}</option>)}</select></label><h2>{chosen.name}</h2><div className="enterprise-game-context__facts"><span>港外等泊<strong>{chosen.queued}艘</strong></span><span>库场占用<strong>{pct(chosen.stock/chosen.storageCapacity)}</strong></span><span>可用设备<strong>{v.assets.filter(a=>a.terminalId===chosen.id&&a.status==='active').length}台</strong></span></div><div className="enterprise-game-context__actions"><button onClick={()=>openContext(chosen.goods==='container'?'yard':'management')}>管理规则</button><button onClick={()=>openContext('assets')}>查看设备</button><button onClick={()=>navigate('cranes')}>岸桥分配</button><button onClick={()=>openContext('ships')}>船舶资料</button></div></>}</section>
    </>}
    {hasWindow&&<div className="enterprise-game-scrim" onClick={()=>setSurface(null)} aria-hidden="true"/>}
    <section ref={windowRef} className={'enterprise-game-window '+(hasWindow?'is-open':'is-mission')} role={hasWindow?guided?'region':'dialog':undefined} aria-modal={hasWindow&&!guided?true:undefined} aria-labelledby={hasWindow?'enterprise-window-title':undefined}>
      {hasWindow&&<header className="enterprise-game-window__header"><div><span>东湾港 / {chosen.id}</span><h2 id="enterprise-window-title">{title}</h2></div><div><button onClick={()=>navigate('menu')} aria-label="返回经营菜单"><Menu size={17}/></button><button data-window-close data-enterprise-control="window-close" onClick={()=>setSurface(null)} aria-label="关闭窗口，返回港口"><X size={21}/></button></div></header>}
      <EnterpriseTeachingCoach runtime={runtime} tab={surface??'overview'} navigate={navigate} pause={()=>setPlaying(false)} rootRef={fullscreen.containerRef} compact={!hasWindow}/>
      {hasWindow&&surface!=='learning'&&<>{outcomeCard}{error&&<p className="enterprise-error" role="alert">{error}</p>}<div className="enterprise-game-window__body">
        {runtime.replaying&&<div className="enterprise-notice">只读回放 · 业务操作暂停。<button onClick={()=>void runtime.send({type:'live'}).catch(e=>runtime.setError(e.message))}>返回当前现场</button></div>}
        {v.sealed&&<p className="enterprise-notice">本场已封存，可以导出、回放或主动提交。新的探索请另开练习。</p>}
        {surface&&workspaceParent(surface)!==surface&&<button className="enterprise-parent-link" onClick={()=>navigate(workspaceParent(surface))}>← 返回{workspaceLabel(workspaceParent(surface))}</button>}{surface==='menu'&&<><label className="enterprise-game-search">查找经营操作<input aria-label="查找经营操作" placeholder="例如：设备、排班、借款、存档" value={menuSearch} onChange={e=>setMenuSearch(e.target.value)}/></label>{menuEntries.length===0&&<p className="enterprise-empty" role="status">没有找到对应操作，可尝试“设备”“排班”“借款”或“存档”。</p>}{renderMenu(false)}<div className="enterprise-management-links enterprise-menu-utilities">{['learning','storage','tasks'].map(id=><button key={id} data-enterprise-control={'menu-'+id} onClick={()=>navigate(id)}>{workspaceLabel(id)}</button>)}</div><details open={!!menuSearch.trim()}><summary>展开业务追踪与专业接管</summary>{renderMenu(true)}</details></>}
        {surface==='events'&&<><h3>需要你决定的现场事项</h3><div className="enterprise-game-events">{pending.map(i=><article key={i.id}><span className="enterprise-badge enterprise-badge--failed">{i.status==='active'?'正在影响业务':'已控制，待恢复'}</span><h3>{i.title}</h3><p>发生于{hourLabel(i.started)} · 核查、隔离、技术修复与恢复分别记录。</p><button onClick={()=>navigate('emergency')}>处理本次事件<ArrowRight size={15}/></button></article>)}{v.calls.filter(c=>c.needsCorrection).slice(0,5).map(c=><article key={c.id}><h3>{c.name} · 舱单需要补正</h3><p>核对原始挂靠资料，保留原业务记录。</p><button onClick={()=>{drafts.set('selected-call',c.id);navigate('ships');}}>打开该船资料</button></article>)}{v.assets.filter(a=>a.status==='commissioning'||a.status==='failed').slice(0,5).map(a=><article key={a.id}><h3>{assetSpec(a.model).name} · {a.status==='failed'?'设备故障':'等待投运'}</h3><p>{a.note}</p><button onClick={()=>selectObject({kind:'asset',id:a.id,terminalId:a.terminalId})}>查看设备条件</button></article>)}{attention===0&&<p className="enterprise-empty">当前没有需要批准的事项。已授权的常规处理继续按规则执行。</p>}</div><h3>最近发生的业务</h3><div className="enterprise-game-timeline">{v.events.slice(-18).reverse().map(e=><article key={e.id}><time>{hourLabel(e.hour)}</time><div><strong>{e.title}</strong><p>{e.detail}</p></div></article>)}</div></>}
        {surface==='trends'&&<TrendsPanel v={v}/>} {surface==='director'&&<DirectorPanel v={v}/>} {surface==='cranes'&&<CraneAllocationPanel v={v}/>} {['operations','resources','investment','funds','reports'].includes(surface??'')&&<EnterpriseHubPanel {...props} id={surface!}/>} {surface==='management'&&<ManagementPanel {...props}/>} {surface==='yard'&&<YardPanel {...props}/>} {surface==='review'&&<ReviewPanel {...props} disabled={runtime.busy||runtime.replaying} experiment={experiment} onExperiment={runExperiment}/>} {surface==='technology'&&<TechnologyPanel {...props}/>}
        {surface==='assets'&&<AssetsPanel {...props}/>} {surface==='projects'&&<ProjectsPanel {...props}/>} {surface==='staff'&&<ManagementStaffPanel {...props}/>} {surface==='dispatch'&&<DispatchPanel {...props}/>} {surface==='ships'&&<ShipsPanel {...props}/>} {surface==='cargo'&&<CargoPanel {...props}/>} {surface==='logistics'&&<LogisticsPolicyPanel {...props}/>} {surface==='market'&&<MarketPanel {...props}/>} {surface==='finance'&&<FinancePanel {...props} disabled={writeDisabled}/>} {surface==='energy'&&<ManagementEnergyPanel {...props}/>} {surface==='digital'&&<DigitalPanel {...props}/>} {surface==='emergency'&&<><ManagementEmergencyPanel {...props}/><details><summary>展开现场处置记录与逐项接管</summary><EmergencyPanel {...props}/></details></>} {surface==='analysis'&&<><AnalysisPanel {...props} comparisons={comparisons} onSave={saveObservation}/><button data-enterprise-control="seal" disabled={!canSeal} onClick={()=>act({kind:'seal'})}>封存当前经营记录</button></>} {surface==='journal'&&<JournalPanel {...props} disabled={writeDisabled}/>} {surface==='handbook'&&<HandbookPanel {...props}/>} {surface==='tasks'&&<EnterpriseTasks actor={actor} confirmed={confirmed} runtime={runtime} navigate={navigate}/>}
        {surface==='storage'&&<StoragePanel runtime={runtime} requestRecord={requestRecord} csv={csv} importFile={importFile} setPlaying={setPlaying}/>}
      </div></>}
    </section>
    {!hasWindow&&<div className="enterprise-game-notices">{error&&<p className="enterprise-error" role="alert">{error}</p>}{outcomeCard}{runtime.replaying&&<button onClick={()=>{void runtime.send({type:'live'}).catch(e=>runtime.setError(e.message));}}>退出只读回放</button>}{(failed||v.finance.tutorialPaused||v.finance.status==='distress')&&<button onClick={()=>navigate('finance')}>{failed?'经营失败 · 进入破产复盘':v.finance.tutorialPaused?'带教资金暂停 · 查看固定方案':'财务预警 · 处理到期付款'}</button>}{v.sealed&&<button onClick={()=>navigate('storage')}>本场已封存 · 查看保存与回放</button>}</div>}
    <div className="enterprise-bottom"><PresentationToolbar label="独立经营运行工具栏" navigation={<>
      {guided?<button data-enterprise-control="tour-advance" className="enterprise-button--primary" disabled={disabled||hasWindow||tutorial?.kind!=='advance'||attention>0||!!tutorial.complete} onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={17}/>:<Play size={17}/>}<span>{tutorial?.kind==='advance'?(playing?'暂停带教推进':'经营至 '+hourLabel(tutorial.planHour??v.hour).slice(5,16)):'跟随鼠标操作'}</span></button>:<><button aria-label={playing?'暂停经营':'继续经营'} disabled={disabled||hasWindow||!clock} onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={17}/>:<Play size={17}/>}<span>{playing?'暂停经营':'继续经营'}</span></button><button disabled={disabled||hasWindow||!clock} onClick={()=>void advance(clock?.hours??1)}>{v.director.mode==='briefing'?'推进1日':'推进1小时'}</button></>}
      <span className="enterprise-director-time"><strong>{clock?.rate??'经营已停止'}</strong><small>{v.director.mode==='briefing'?'巡港与重大事件处暂停':'现场24小时约2分24秒'}</small></span>
    </>} utilities={<><span className="enterprise-clock-status" role="status">{runtime.busy?runtime.progress||'本机正在计算…':runtime.replaying?'只读回放':v.sealed?'本场已封存':failed?'经营失败':v.finance.tutorialPaused?'带教资金已暂停':guided?'前半年带教 · 当前操作已锁定':playing?'正在经营':'已暂停'}</span><button aria-label={runtime.storageError?'保存需要处理':'存档'} onClick={()=>navigate('storage')} title={runtime.savedAt?'已自动保存 '+runtime.savedAt:'准备本机存档'}><Save size={16}/><span>{runtime.storageError?'保存需要处理':'存档'}</span></button><small className="enterprise-game-local">单人 · 本机计算</small></>} end={<FullscreenButtons controls={fullscreen}/>}/></div>
  </div></PageToolsProvider></EnterpriseFeedbackContext.Provider>;
}

function StoragePanel({runtime,requestRecord,csv,importFile,setPlaying}:{runtime:ReturnType<typeof useEnterprise>;requestRecord:()=>Promise<void>;csv:()=>Promise<void>;importFile:(e:ChangeEvent<HTMLInputElement>)=>Promise<void>;setPlaying:(value:boolean)=>void}){
 const v=runtime.view!;const currentRules=(record:EnterpriseRecord)=>record.schema===ENTERPRISE_VERSION&&enterpriseRulesMatch(record.rules);
 return <>{runtime.listError&&<button disabled={runtime.busy} onClick={()=>void runtime.retryStorage().catch(e=>runtime.setError(e.message))}>重试读取本机存档</button>}<h2>本机存档、检查点与回放</h2><p>生产在当前电脑执行，存档按个人身份隔离。JSON用于备份与恢复；导出只包含情境和指令，不包含登录凭据、姓名或学号。正式任务需要主动提交并取得核验回执。</p><div className="enterprise-inline-actions" data-enterprise-control="storage-export">{runtime.storageError&&<button disabled={runtime.busy} onClick={()=>void runtime.saveNow().catch(e=>runtime.setError(e.message))}>重试保存进度</button>}<button disabled={runtime.busy} onClick={()=>void requestRecord()}><Download size={16}/>导出完整经营记录</button><button disabled={runtime.busy} onClick={()=>void csv()}><Download size={16}/>导出月度CSV</button><button disabled={runtime.busy||!v.sealed} onClick={()=>void runtime.send({type:'package'}).then(r=>{if(r.package)downloadEnterprise('东湾港-封存核验包.json',r.package);}).catch(e=>runtime.setError(e.message))}><Download size={16}/>导出封存核验包</button><label className="enterprise-upload">导入经营记录<input type="file" accept=".json,application/json" disabled={runtime.busy} onChange={e=>void importFile(e)}/></label></div>
        <CommandForm id="new-enterprise" title="另建独立个人练习" fields={[{name:'scenario',label:'情境',type:'select',options:Object.entries(SCENARIOS).map(([id,s])=>[id,s.name])},{name:'years',label:'经营年数',type:'select',value:'10',options:[['1','1年'],['3','3年'],['5','5年'],['10','10年 · 完整经营']]},{name:'seed',label:'情境种子',type:'number',min:1,max:2147483647,value:20261025}]} disabled={runtime.busy} onSubmit={f=>{setPlaying(false);void runtime.waitForSave().then(()=>runtime.create({seed:Number(f.seed),years:Number(f.years) as EnterpriseConfig['years'],scenario:f.scenario as EnterpriseConfig['scenario'],mode:'practice'})).catch(e=>runtime.setError(e.message));}} submit="另建练习并保留当前记录"/>
        <EnterpriseTable headings={['本机记录','最近保存','类型','指令数','操作']} rows={runtime.saves.map(s=>[s.title,new Date(s.savedAt).toLocaleString('zh-CN'),!currentRules(s.record)?'已归档 · '+s.record.schema:(s.attemptId?'正式个人场次 · ':'个人练习 · ')+s.record.schema,s.record.commands.length,<div className="enterprise-inline-actions"><button disabled={runtime.busy||!currentRules(s.record)} title={!currentRules(s.record)?'旧规则记录保留，可导出并使用原版本查看':undefined} onClick={()=>{setPlaying(false);void runtime.load(s).catch(e=>runtime.setError(e.message));}}>恢复该记录</button><button onClick={()=>downloadEnterprise('东湾港-存档备份.json',s.record)}>导出</button><button disabled={runtime.busy||!currentRules(s.record)} onClick={()=>{const record:EnterpriseRecord={...s.record,config:{...s.record.config,mode:'practice'},commands:s.record.commands.filter(c=>c.kind!=='seal')};void runtime.importRecord(record).catch(e=>runtime.setError(e.message));}}>复制为个人练习</button></div>])}/>
        <section className="enterprise-subpanel"><h3>当前记录的只读回放</h3><label>指令节点<input aria-label="回放指令节点" type="range" min={0} max={runtime.currentSave?.record.commands.length??0} defaultValue={runtime.currentSave?.record.commands.length??0} disabled={runtime.busy} onPointerUp={e=>void runtime.send({type:'seek',position:Number(e.currentTarget.value)}).catch(e=>runtime.setError(e.message))} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))void runtime.send({type:'seek',position:Number(e.currentTarget.value)}).catch(e=>runtime.setError(e.message));}}/></label><p>回放不保存为运行进度；业务操作在回放期间禁用。</p><button disabled={runtime.busy} onClick={()=>void runtime.send({type:'live'}).catch(e=>runtime.setError(e.message))}>返回当前经营现场</button></section>
        <EnterpriseTable headings={['检查点','指令位置','操作']} rows={(runtime.currentSave?.checkpoints??[]).map(c=>[hourLabel(c.hour),c.position,<button disabled={runtime.busy} onClick={()=>void runtime.send({type:'seek',position:c.position}).catch(e=>runtime.setError(e.message))}>只读查看检查点</button>])}/>

 </>;
}
