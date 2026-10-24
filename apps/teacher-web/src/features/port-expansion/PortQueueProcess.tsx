import {useEffect,useMemo,useRef,useState} from 'react';
import type {QueueRecord} from '@edu/course-content';
import {QUEUE_PHASE_LABELS,queueClockLabel,queueEventText,queuePhaseAt,queueProcessIndex,queueSnapshot,type QueuePhase,type QueueSnapshot} from './queue-process-model';
import {useQueueProcess} from './useQueueProcess';

export type QueueReplayCommand={sequence:number;kind:'seek';time:number;id?:string}|{sequence:number;kind:'track';id:string};
type Props={records:readonly QueueRecord[];servers?:number;warmup?:number;storageKey:string;identity:string;fallbackTime?:number;command?:QueueReplayCommand|null;onCompleted?:(count:number)=>void;onSelected?:(id:string)=>void};
const number=(value:number)=>value.toLocaleString('zh-CN',{maximumFractionDigits:3});
const phaseOrder:QueuePhase[]=['pending','outside','queue','service','complete'];
type Token={record:QueueRecord;phase:QueuePhase;x:number;y:number};

function processTokens(snapshot:QueueSnapshot,servers:number):Token[]{
 const {outside,queue,service,complete}=snapshot.groups;
 return [
  ...outside.slice(0,4).map((record,i)=>({record,phase:'outside' as const,x:50+(i%2)*105,y:140+Math.floor(i/2)*110})),
  ...queue.slice(0,4).map((record,i)=>({record,phase:'queue' as const,x:585-i*87,y:215})),
  ...service.map(record=>({record,phase:'service' as const,x:770,y:servers===1?215:record.server===1?140:285})),
  ...complete.slice(-3).map((record,i)=>({record,phase:'complete' as const,x:1065,y:110+i*100})),
 ];
}
function Truck({token,selected,warmup,onSelect}:{token:Token;selected:boolean;warmup:boolean;onSelect:(id:string)=>void}){
 const {record,phase,x,y}=token;
 return <g className={`qpr-truck qpr-truck-${phase}${selected?' qpr-selected':''}${warmup?' qpr-warmup':''}`} style={{transform:`translate(${x}px,${y}px)`}} role="button" tabIndex={0} aria-label={`${record.id}，${warmup?'热身车辆，':''}${QUEUE_PHASE_LABELS[phase]}，查看时间记录`} data-vehicle-id={record.id} data-phase={phase} data-server={phase==='service'?record.server:undefined} onClick={()=>onSelect(record.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(record.id);}}}>
  <title>{`${record.id} · ${QUEUE_PHASE_LABELS[phase]}${warmup?' · 热身车辆':''}`}</title>
  <rect className="qpr-truck-focus" x="-7" y="-9" width="95" height="80" rx="8"/>
  <rect className="qpr-container" x="0" y="0" width="53" height="33" rx="3"/>
  {[11,22,33,44].map(line=><path key={line} d={`M${line} 5v23`} className="qpr-container-rib"/>)}
  <path className="qpr-cab" d="M56 9h16l10 13v15H56Z"/>
  <path className="qpr-window" d="M61 13h9l7 10H61Z"/>
  <path className="qpr-chassis" d="M0 37h83"/>
  <circle cx="14" cy="39" r="7"/><circle cx="45" cy="39" r="7"/><circle cx="72" cy="39" r="7"/>
  <text x="40" y="65" textAnchor="middle">{record.id}</text>
 </g>;
}
export function QueueProcessMap({snapshot,servers,selected,focusPhase,warmupIds,onSelect}:{snapshot:QueueSnapshot;servers:number;selected:string;focusPhase:QueuePhase;warmupIds:Set<string>;onSelect:(id:string)=>void}){
 const tokens=processTokens(snapshot,servers),service=snapshot.groups.service;
 const mapRef=useRef<HTMLDivElement>(null),tracked=tokens.find(t=>t.record.id===selected);
 const trackedX=tracked?.x??(focusPhase==='queue'?490:focusPhase==='outside'?120:focusPhase==='complete'?1080:undefined);
 const omittedQueuePosition=!tracked&&focusPhase==='queue'?snapshot.groups.queue.findIndex(r=>r.id===selected)+1:0;
 useEffect(()=>{
  const area=mapRef.current;if(!area)return;
  const center=()=>{
   const svg=area.querySelector('svg');if(!svg)return;
   const left=trackedX===undefined?0:(trackedX+40)*svg.clientWidth/1200-area.clientWidth/2;
   area.scrollTo({left:Math.max(0,Math.min(left,area.scrollWidth-area.clientWidth)),behavior:'instant'});
  };
  center();const observer=new ResizeObserver(center);observer.observe(area);
  return ()=>observer.disconnect();
 },[selected,trackedX]);
 return <div ref={mapRef} className="qpr-map-scroll" tabIndex={0} aria-label="车辆过程示意图，窄屏可左右滑动">
  <svg className="qpr-map" viewBox="0 0 1200 425" role="group" aria-label="港外等待到闸口排队、核验、完成的过程；车辆位置为示意">
   <defs><marker id="qpr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#8daca4"/></marker></defs>
   <rect x="15" y="80" width="250" height="308" rx="12" fill="#e5e9df"/>
   <path d="M290 240H688M925 240H1030" className="qpr-road"/>
   <path d="M290 240H688M925 240H1030" className="qpr-road-center"/>
   <path d="M270 240h30M675 240h48M980 240h50" className="qpr-arrow" markerEnd="url(#qpr-arrow)"/>
   {servers===2&&<path d="M700 240V165h40M700 240v70h40M935 165h30v145h-30" className="qpr-branch"/>}
   <text x="32" y="42" className="qpr-zone-title">① 港外准备区</text><text x="32" y="67" className="qpr-zone-sub">已就绪，尚未到预约入队时刻</text>
   <text x="310" y="42" className="qpr-zone-title">② 闸口等候队列</text><text x="310" y="67" className="qpr-zone-sub">先到先服务 · 队首在右侧</text>
   <text x="735" y="42" className="qpr-zone-title">③ 核验服务</text><text x="735" y="67" className="qpr-zone-sub">{servers===2?'两台共用同一队列':'服务台空闲才可开始'}</text>
   <text x="1005" y="42" className="qpr-zone-title">④ 完成离开</text><text x="1005" y="67" className="qpr-zone-sub">退出本次观察系统</text>
   {Array.from({length:servers},(_,i)=>{
    const busy=service.find(r=>r.server===i+1),top=servers===1?130:i===0?95:240;
    const progress=busy?Math.min(1,Math.max(0,(snapshot.time-busy.start)/busy.service)):0;
    return <g key={i} className="qpr-station" data-station={i+1} data-busy={!!busy}>
     <rect x="740" y={top} width="190" height={servers===1?205:140} rx="10"/>
     <text x="755" y={top+27}>核验台 {i+1}<tspan x="915" textAnchor="end" className={busy?'qpr-busy':'qpr-idle'}>{busy?'忙碌':'空闲'}</tspan></text>
     <rect className="qpr-progress-track" x="755" y={top+(servers===1?167:128)} width="160" height="7" rx="3"/>
     <rect className="qpr-progress-fill" x="755" y={top+(servers===1?167:128)} width={160*progress} height="7" rx="3"/>
    </g>;
   })}
   {tokens.map(token=><Truck key={token.record.id} token={token} selected={token.record.id===selected} warmup={warmupIds.has(token.record.id)} onSelect={onSelect}/>)}
   {!snapshot.groups.outside.length&&<text x="140" y="210" textAnchor="middle" className="qpr-empty">当前没有港外等待</text>}
   {!snapshot.groups.queue.length&&<text x="490" y="200" textAnchor="middle" className="qpr-empty">等候队列为空</text>}
   {omittedQueuePosition>4&&<g className="qpr-omitted"><text x="490" y="125" textAnchor="middle">跟踪 {selected} · 队列第{omittedQueuePosition}位</text><text x="490" y="150" textAnchor="middle" className="qpr-zone-sub">位于省略的后方，仍计入{snapshot.groups.queue.length}辆排队车</text></g>}
   <text x="32" y="367" className="qpr-zone-sub">{snapshot.groups.outside.length>4?`示前4辆；另${snapshot.groups.outside.length-4}辆仍计入人数`:'未就绪车辆不占用准备区'}</text>
   <text x="310" y="330" className="qpr-zone-sub">{snapshot.groups.queue.length>4?`显示队首4辆；后方另${snapshot.groups.queue.length-4}辆`:'每辆车对应同一份逐车记录'}</text>
   <text x="1000" y="407" className="qpr-zone-sub">{snapshot.groups.complete.length>3?`仅绘最近3辆；累计${snapshot.groups.complete.length}辆`:'核验完成即离开'}</text>
  </svg>
 </div>;
}

export function PortQueueProcess({records,servers=1,warmup=0,storageKey,identity,fallbackTime=0,command,onCompleted,onSelected}:Props){
 const index=useMemo(()=>queueProcessIndex(records,servers),[records,servers]);
 const player=useQueueProcess(index,storageKey,identity,fallbackTime);
 const snapshot=useMemo(()=>queueSnapshot(index,player.time),[index,player.time]);
 const warmupIds=useMemo(()=>new Set(records.slice(0,warmup).map(r=>r.id)),[records,warmup]);
 const [lookup,setLookup]=useState(''),[lookupError,setLookupError]=useState('');
 const focus=(player.selected?index.byId.get(player.selected):null)??snapshot.groups.service[0]??snapshot.groups.queue[0]??snapshot.groups.outside[0]??snapshot.groups.pending[0]??snapshot.groups.complete.at(-1);
 const phase=focus?queuePhaseAt(focus,player.time):'pending';
 const queuePosition=focus&&phase==='queue'?snapshot.groups.queue.findIndex(r=>r.id===focus.id)+1:0;
 const completed=snapshot.groups.complete.length;
 useEffect(()=>{onCompleted?.(completed);},[completed,onCompleted]);
 useEffect(()=>{if(focus)onSelected?.(focus.id);},[focus?.id,onSelected]);
 useEffect(()=>{
  if(!command)return;
  if(command.kind==='track')player.track(command.id);
  else{if(command.id)player.setSelected(command.id);player.seek(command.time);}
  // A command is a single user action, rather than a dependency on each animation frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[command]);
 const select=(id:string)=>{player.seek(player.time);player.setSelected(id);};
 const firstFormal=records[warmup];
 return <section className="qpr" aria-label="车辆过程回放" id="queue-process">
  <div className="qpr-heading"><div><span className="qpr-kicker">同一份排程 · 可观察的过程</span><h2>看一辆车怎样经历等待</h2></div><output className="qpr-clock" aria-label="当前回放时刻">{number(player.time)}<small> / {number(index.end)} 分钟</small></output></div>
  <p className="qpr-intro">车辆按就绪、入队、开工和完成四个时刻切换位置。可以先算下一步，再用“下一个事件”核对；回退只改变观察时刻。</p>
  {warmup>0&&<p className="qpr-boundary">过程保留全部{records.length}辆，其中前{warmup}辆为热身（灰色车身）；下方均值和CSV只使用后{records.length-warmup}辆正式记录。正式观察开始时，热身车辆可能仍在核验。</p>}
  <dl className="qpr-counts">{phaseOrder.map(key=><div key={key} data-phase-count={key}><dt>{QUEUE_PHASE_LABELS[key]}</dt><dd>{snapshot.groups[key].length}<small>辆</small></dd></div>)}</dl>
  <div className="qpr-controls" aria-label="过程播放控制"><button className="pql-primary" onClick={player.toggle}>{player.playing?'暂停回放':player.time>=index.end?'从头播放':'播放过程'}</button><button onClick={player.next} disabled={!snapshot.next}>下一个事件</button><button onClick={player.restart}>回到起点</button>{warmup>0&&firstFormal&&<button onClick={()=>{player.setSelected(firstFormal.id);player.seek(firstFormal.arrival);}}>跳至正式观察</button>}<label>回放速度<select aria-label="回放速度" value={player.speed} onChange={e=>player.setSpeed(Number(e.target.value))}>{[.25,.5,1,2,10,60].map(v=><option value={v} key={v}>{v} 分钟 / 秒</option>)}</select></label></div>
  <label className="qpr-scrub">观察时刻 / 分钟<input aria-label="观察时刻" aria-valuetext={`${number(player.time)} 分钟，共 ${number(index.end)} 分钟`} type="range" min="0" max="1" step="any" value={index.end?player.time/index.end:0} onChange={e=>player.seek(Number(e.target.value)*index.end)}/></label>
  <div className="qpr-event" aria-live={player.playing?'off':'polite'}><strong>{snapshot.event?`${number(snapshot.event.time)} 分钟`:'回放起点'}</strong><span>{queueEventText(snapshot.event)}</span></div>
  <p className="qpr-scroll-hint">点击车辆可暂停并查看记录。窄屏自动定位图中跟踪车辆，也可左右滑动查看其他区域。车身移动只表示状态切换，不增加行驶时间。</p>
  <QueueProcessMap snapshot={snapshot} servers={servers} selected={focus?.id??''} focusPhase={phase} warmupIds={warmupIds} onSelect={select}/>
  <div className="qpr-track-bar"><form onSubmit={e=>{e.preventDefault();const id=lookup.trim().toUpperCase();if(player.track(id))setLookupError('');else setLookupError('本次运行中没有这个编号，请按逐车表中的编号查找。');}}><label htmlFor="queue-vehicle-lookup">定位车辆</label><input id="queue-vehicle-lookup" value={lookup} onChange={e=>setLookup(e.target.value)} placeholder={warmup?'如 R501':'如 T02'} maxLength={12}/><button type="submit">定位就绪时刻</button></form><button aria-pressed={player.selected===null} onClick={()=>player.setSelected(null)}>自动跟随核验车辆</button></div>
  {lookupError&&<p className="pql-error" role="alert">{lookupError}</p>}
  {focus&&<div className="qpr-evidence" aria-label="跟踪车辆时间记录"><div className="qpr-evidence-title"><h3>跟踪 {focus.id}{warmupIds.has(focus.id)?' · 热身车辆':''}</h3><strong>{QUEUE_PHASE_LABELS[phase]}{queuePosition?` · 队列第${queuePosition}位`:''}{phase==='service'?` · 核验台${focus.server}`:''}</strong></div>
   <dl className="qpr-clocks">{([['ready','就绪'],['arrival','入队'],['start','开始核验'],['departure','完成离开']] as const).map(([key,label])=><div key={key} data-clock={key} data-occurred={focus[key]<=player.time}><dt>{label}</dt><dd>{queueClockLabel(focus[key],player.time)}</dd></div>)}</dl>
   <p>{phase==='pending'?'车辆尚未就绪，还没有进入港外准备区。':phase==='outside'?`已在港外等待${number(player.time-focus.ready)}分钟，尚未进入闸口队列。`:phase==='queue'?`已在闸口排队${number(player.time-focus.arrival)}分钟；前面还有${queuePosition-1}辆等待车辆。`:phase==='service'?`本车排队${number(focus.wait)}分钟后开始核验，已服务${number(player.time-focus.start)}分钟，还需${number(Math.max(0,focus.departure-player.time))}分钟。`:`全程${number(focus.total)}分钟 = 港外等待${number(focus.outside)} + 闸口排队${number(focus.wait)} + 核验${number(focus.service)}。`}</p>
   <small>{queuePosition>4?'本车位于图中省略的队列后方，位置已在队列上方标出。':''}时刻最多显示三位小数；尚未发生的时刻在回放到达后显示。下方逐车表保留本轮已计算的记录，回放不会改写它们。</small>
  </div>}
  <p className="qpr-footnote">五类车辆合计始终为{records.length}辆。队列较长时只绘队首4辆，港外只绘前4辆，完成区只绘最近3辆；计数和计算保留全部车辆。初始服务台空闲，路程按0处理。</p>
  {!player.saved&&<p className="pql-warning">回放位置暂未保存，逐车结果仍可下载。请保留学习记录后再关闭。</p>}
 </section>;
}
