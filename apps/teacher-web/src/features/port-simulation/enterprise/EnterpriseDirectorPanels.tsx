import {useEffect,useRef,useState} from 'react';
import {assetSpec,hourDate,hourLabel,type EnterpriseView,type EnterpriseDailyReport,type AssetHourReason} from '@edu/port-simulation-core';
import {EnterpriseTable,Metric,fmt,wan,pct} from './EnterpriseForms';
import type {PanelProps} from './EnterprisePanels';
import {DIRECTOR_MODE_LABELS} from './enterprise-clock';

export const ASSET_REASON_LABELS:Record<AssetHourReason,string>={working:'正在作业',waiting:'待命或等待上下游',staff:'缺少合格岗位',power:'等待供电',fuel:'等待燃料',charging:'补能',blocked:'区域或作业条件受阻',maintenance:'计划检修',failed:'故障停机',inactive:'未投产或已退出',finance:'资金拖欠停产'};
type TrendKey='cash'|'debt'|'waiting'|'delivery'|'energy'|'load';
const TREND_INFO:Record<TrendKey,{label:string;unit:string;value:(d:EnterpriseDailyReport)=>number|null}>={cash:{label:'可用现金',unit:'万元',value:d=>d.cash/10000},debt:{label:'借款本金',unit:'万元',value:d=>d.debt/10000},waiting:{label:'当日离港船平均等待',unit:'小时',value:d=>d.meanBerthWait},delivery:{label:'当日到期履约',unit:'%',value:d=>d.deliveryRate===null?null:d.deliveryRate*100},energy:{label:'当日用电',unit:'MWh',value:d=>d.energy/1000},load:{label:'设备实际作业时长占比',unit:'%',value:d=>d.availableHours?d.workingHours/d.availableHours*100:null}};

/** Keep real extremes and gaps when a ten-year history is reduced for drawing. */
export function sampleTrend(rows:EnterpriseDailyReport[],key:TrendKey,limit=180){
  if(rows.length<=limit)return rows;
  const bucket=Math.ceil(rows.length/Math.max(1,Math.floor(limit/5))),indexes=new Set<number>();
  for(let start=0;start<rows.length;start+=bucket){const end=Math.min(rows.length,start+bucket),valid=Array.from({length:end-start},(_,i)=>start+i).filter(i=>TREND_INFO[key].value(rows[i]!)!==null);indexes.add(start);indexes.add(end-1);
    if(valid.length){indexes.add(valid.reduce((a,b)=>TREND_INFO[key].value(rows[a]!)!<TREND_INFO[key].value(rows[b]!)!?a:b));indexes.add(valid.reduce((a,b)=>TREND_INFO[key].value(rows[a]!)!>TREND_INFO[key].value(rows[b]!)!?a:b));}
    const gap=Array.from({length:end-start},(_,i)=>start+i).find(i=>TREND_INFO[key].value(rows[i]!)===null);if(gap!==undefined)indexes.add(gap);
  }
  return [...indexes].sort((a,b)=>a-b).map(i=>rows[i]!);
}
function DailyTrend({rows,metric,selected,onSelect,events}:{rows:EnterpriseDailyReport[];metric:TrendKey;selected:number;onSelect:(hour:number)=>void;events:EnterpriseView['events']}){
  const host=useRef<HTMLDivElement>(null),[width,setWidth]=useState(560);useEffect(()=>{const el=host.current;if(!el)return;const size=()=>setWidth(Math.max(260,el.clientWidth));size();const observer=new ResizeObserver(size);observer.observe(el);return()=>observer.disconnect();},[]);
  const info=TREND_INFO[metric],sample=sampleTrend(rows,metric),values=sample.map(info.value).filter((v):v is number=>v!==null),height=210,left=62,right=15,top=18,bottom=36;
  const min=metric==='delivery'||metric==='load'?0:Math.min(0,...values),max=metric==='delivery'||metric==='load'?100:Math.max(1,...values)*1.08;
  const first=rows[0]?.hour??0,last=rows.at(-1)?.hour??24,x=(hour:number)=>left+(hour-first)/Math.max(24,last-first)*(width-left-right),y=(n:number)=>top+(max-n)/(max-min)*(height-top-bottom);
  let line='',connected=false;for(const d of sample){const n=info.value(d);if(n===null){connected=false;continue;}line+=(connected?'L':'M')+x(d.hour).toFixed(2)+','+y(n).toFixed(2);connected=true;}
  const current=rows.find(d=>d.hour===selected),currentValue=current?info.value(current):null;
  const ticks=[0,.5,1].map(t=>first+(last-first)*t),marks=events.filter(e=>['incident','recovery','project','finance'].includes(e.kind)&&e.hour>=first&&e.hour<=last).slice(-6);
  return <div ref={host} className="enterprise-daily-chart"><h3>{info.label}<small> · {info.unit}</small></h3>{!values.length?<p className="enterprise-empty">尚无该指标的有效日结；没有离港或到期业务的日子保留空缺。</p>:<svg viewBox={'0 0 '+width+' '+height} role="img" aria-label={info.label+'，'+info.unit+'；日结数据，可用下方日期滑块核对'} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect(),hour=first+((e.clientX-r.left)/r.width*width-left)/(width-left-right)*(last-first);const closest=rows.reduce((a,b)=>Math.abs(a.hour-hour)<Math.abs(b.hour-hour)?a:b);if(closest)onSelect(closest.hour);}}>
    {[min,(min+max)/2,max].map((n,i)=><g key={i}><line x1={left} x2={width-right} y1={y(n)} y2={y(n)} className="enterprise-trend-grid"/><text x={left-8} y={y(n)+4} textAnchor="end">{fmt(n,1)}</text></g>)}
    {ticks.map((hour,i)=><text key={i} x={x(hour)} y={height-8} textAnchor={i===0?'start':i===2?'end':'middle'}>{hourLabel(hour-24).slice(5,10)}</text>)}
    {marks.map(e=><g key={e.id}><line x1={x(e.hour)} x2={x(e.hour)} y1={top} y2={height-bottom} className="enterprise-trend-event"/><title>{hourLabel(e.hour)+' '+e.title}</title></g>)}
    <path d={line} className="enterprise-trend-line"/>{current&&currentValue!==null&&<g><line x1={x(current.hour)} x2={x(current.hour)} y1={top} y2={height-bottom} className="enterprise-trend-selection"/><circle cx={x(current.hour)} cy={y(currentValue)} r={4} className="enterprise-trend-point"/></g>}
  </svg>}<p className="enterprise-chart-value">{current?hourLabel(current.hour-24).slice(0,10):'尚无日结'} · {currentValue===null?'无到期或离港样本':fmt(currentValue,2)+' '+info.unit}</p></div>;
}
export function TrendsPanel({v}:Pick<PanelProps,'v'>){
  const [range,setRange]=useState(30),[left,setLeft]=useState<TrendKey>('cash'),[right,setRight]=useState<TrendKey>('waiting'),[selected,setSelected]=useState<number|null>(null);
  const days=v.telemetry.days,rows=range?days.slice(-range):days,current=rows.find(d=>d.hour===selected)??rows.at(-1),hour=current?.hour??0;
  return <><h2>经营趋势与日结</h2><p>每天形成一个真实日结点。无样本的履约或等待指标保留空缺；图中的事件线仅标示同时发生的记录，不能单独证明因果。</p>
    <div className="enterprise-trend-controls"><label>观察时段<select aria-label="趋势观察时段" value={range} onChange={e=>{setRange(Number(e.target.value));setSelected(null);}}><option value={30}>最近30日</option><option value={90}>最近90日</option><option value={365}>最近一年</option><option value={0}>完整经营期</option></select></label>{([['第一张图',left,setLeft],['第二张图',right,setRight]] as const).map(([label,key,set])=><label key={label}>{label}<select aria-label={label+'指标'} value={key} onChange={e=>set(e.target.value as TrendKey)}>{Object.entries(TREND_INFO).map(([id,i])=><option key={id} value={id}>{i.label} · {i.unit}</option>)}</select></label>)}</div>
    <button data-enterprise-control="trends-live-check" onClick={()=>setSelected(days.at(-1)?.hour??null)}>定位最新日结</button>
    {!rows.length?<p className="enterprise-empty">完成第一个生产日后会出现日结折线。当前数据不会补造为零。</p>:<><div className="enterprise-trend-grid-layout"><DailyTrend rows={rows} metric={left} selected={hour} onSelect={setSelected} events={v.events}/><DailyTrend rows={rows} metric={right} selected={hour} onSelect={setSelected} events={v.events}/></div><label className="enterprise-trend-date">核对日结日期<input aria-label="核对日结日期" type="range" min={0} max={rows.length-1} value={Math.max(0,rows.findIndex(d=>d.hour===hour))} onChange={e=>setSelected(rows[Number(e.target.value)]!.hour)}/></label>{current&&<div className="enterprise-review-detail" role="status">{hourLabel(current.hour-24).slice(0,10)}：现金{wan(current.cash)}，定存{wan(current.deposits)}，借款{wan(current.debt)}，应付未付{wan(current.unpaid)}；当日收入{wan(current.revenue)}、运营费用{wan(current.operating)}。当前港口进度保持不变。</div>}</>}
  </>;
}

export function DirectorPanel({v}:Pick<PanelProps,'v'>){
  const [checked,setChecked]=useState(false),d=hourDate(v.hour),count=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  return <><h2>总经理巡港日程</h2><p>每月8日到港观察24小时。日常约1秒推进1天，现场约1秒推进10分钟；打开管理窗口会暂停推进。重大异常到场核查并授权后，后续修复可由部门继续执行。</p><div className="enterprise-metrics"><Metric label="当前管理状态" value={DIRECTOR_MODE_LABELS[v.director.mode]}/><Metric label={v.director.scheduled?'本次现场日结束':'下一次现场日'} value={hourLabel(v.director.scheduled?v.director.visitEnd:v.director.nextVisit)}/><Metric label="已模拟完成的巡港日" value={v.telemetry.days.filter(r=>hourDate(r.hour-24).getUTCDate()===8).length+'日'} detail="经营日历统计，不作为本人学习或到场证明"/></div>
    <div className="enterprise-director-calendar" aria-label="本月经营日历">{Array.from({length:count},(_,i)=>i+1).map(day=>day===8?<button key={day} data-enterprise-control="director-calendar-check" onClick={()=>setChecked(true)} aria-label="核对本月8日现场观察日"><strong>8</strong><span>现场日</span></button>:<span key={day} className={day===d.getUTCDate()?'is-current':''}>{day}</span>)}</div>
    {checked&&<p className="enterprise-review-detail" role="status">已核对：每月8日00:00至次日00:00观察港口现场；一次完整现场日约2分24秒。重大异常会在准确发生时点暂停，不等待日结后才通知。</p>}
    <p>十年包含120个计划现场日，单是现场运行约4小时48分钟，适合分多次课完成。关闭程序会停止经营，可随时保存并续接同一港口。</p>
  </>;
}
export function CraneAllocationPanel({v}:Pick<PanelProps,'v'>){
  const [checked,setChecked]=useState(false);
  return <><h2>岸桥岗位分配</h2><p>先为具备实际装卸条件的起重作业泊位各保障一台，再按剩余标准作业小时分配追加岗位。数量受适配设备、合格人员、供电、燃料和当前可作业货量共同约束。</p><button data-enterprise-control="crane-current-check" onClick={()=>setChecked(true)}>核对实际岸桥分配</button>
    <EnterpriseTable headings={['泊位','剩余工作量','适配且有工作需求','基础保障','追加岗位','本小时分配依据']} rows={v.telemetry.cranes.map(c=>[v.terminals.find(t=>t.id===c.terminalId)?.name??c.terminalId,fmt(c.workHours,1)+'标准小时',c.eligible+'台',c.baseline+'台',c.extra+'台',c.reason])}/>
    {!v.telemetry.cranes.length&&<p className="enterprise-empty">当前没有已就绪的起重装卸任务。岸桥保持待命，不预占作业人员；到港、货物准备和装卸条件改变后重新分配。</p>}
    {checked&&<p className="enterprise-review-detail" role="status">此表来自最近一个实际作业小时。若人员少于需要工作的泊位数，先比较到期时间与累计等待；已等待较久的泊位提高优先级。缺人或缺电不会被算成已经分配。</p>}
  </>;
}
export function AssetWorkEvidence({v,assetId}:{v:EnterpriseView;assetId:string}){
  const asset=v.assets.find(a=>a.id===assetId),stats=v.telemetry.assets[assetId];if(!asset||!stats)return null;
  return <section className="enterprise-asset-evidence" data-asset-evidence={assetId}><h3>{assetSpec(asset.model).name} · 过去24小时</h3><p>{stats.hours?'已记录'+stats.hours+'个作业小时':'尚无已完成的作业小时'}；当前状态：{asset.note}</p><div className="enterprise-metrics"><Metric label="实际作业折合时长" value={fmt(stats.work,2)+'小时'}/><Metric label="作业时长占比" value={stats.load===null?'无样本':pct(stats.load)}/><Metric label="已配岗位时长" value={fmt(stats.staffed)+'小时'}/></div><EnterpriseTable headings={['主要状态','小时数']} rows={Object.entries(stats.reasons).map(([reason,hours])=>[ASSET_REASON_LABELS[reason as AssetHourReason],fmt(hours)])}/><p className="enterprise-muted">状态时长按整小时分类；实际作业折合时长按该小时的真实能力使用比例累计。待命可能是合理备用，不能只凭颜色判断浪费。</p></section>;
}
