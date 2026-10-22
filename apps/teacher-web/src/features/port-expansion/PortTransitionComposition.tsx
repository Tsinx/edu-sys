import {PORT_EXPANSION_SOURCES,expansionTotal,expansionVisiblePoints,digitalHandoff,transitionClock,shoreComparison,greenIntensity,transitionPortfolio,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';
import {MediaCover} from './PortTradeComposition';
type Props={page:PortExpansionPage;state:ExpansionPresentation};
const shown=(n:number,progress:number)=>Math.floor(n*progress+1e-6);
const palette=['#246c77','#b28044','#547b65','#768fa0'];
const f=(n:number)=>Number(n.toFixed(2)).toLocaleString('en-US');

function Records({page,state}:Props){
 const [head,...rows]=page.rows??[];if(!head)return null;
 if(head.length===2)return <div className="px-ledger">{rows.slice(0,shown(rows.length,state.progress)).map((r,i)=><section key={i}><span>{String(i+1).padStart(2,'0')}</span><h2>{r[0]}</h2><p>{r[1]}</p></section>)}</div>;
 return <div className={`px-records${head.length===4?' px-records--numeric':''}`}><table><thead><tr>{head.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,shown(rows.length,state.progress)).map((r,i)=><tr key={i}>{r.map((s,j)=><td key={j}>{s}</td>)}</tr>)}</tbody></table></div>;
}
function Task({page,state}:Props){
 const [head,...rows]=page.rows??[];
 return <div className="px-task"><aside><span>个人判断</span><strong>写出依据<br/>保留修订</strong><p>{page.lesson===16&&page.localPage>=24?'预算、服务与环境条件一起核对':'从当前证据中提出可以检查的解释'}</p></aside><div className="px-task-lines" aria-label={head?.join('、')}>{rows.slice(0,shown(rows.length,state.progress)).map((r,i)=><section key={i}><span>{String(i+1).padStart(2,'0')}</span><div><h2>{r[0]}</h2><p>{r[1]}</p></div></section>)}</div></div>;
}
function Layers({page,state}:Props){
 const [head,...rows]=page.rows??[];
 return <div className="px-layers" aria-label={head?.join('、')}>{rows.slice(0,shown(rows.length,state.progress)).map((r,i)=><section key={i}><div className="px-layer-name"><span>0{i+1}</span><h2>{r[0]}</h2></div><p>{r[1]}</p><div className="px-layer-check"><small>检查点</small><p>{r[2]}</p></div>{i<rows.length-1&&<b aria-hidden="true">↓</b>}</section>)}</div>;
}
function Flow({page,state}:Props){
 const labels=page.labels??[],n=shown(labels.length,state.progress);
 return <ol className="px-flow">{labels.slice(0,n).map((s,i)=><li key={s}><span>{String(i+1).padStart(2,'0')}</span><h2>{s}</h2>{i<labels.length-1&&<b aria-hidden="true">→</b>}</li>)}</ol>;
}
function Events({page,state}:Props){
 const rows=(page.rows??[]).slice(1),n=shown(rows.length,state.progress),x=(m:number)=>370+(m-420)/240*1000;
 const minutes=(s:string)=>{const [h,m]=s.split(':').map(Number);return h!*60+m!;};
 return <svg className="px-diagram" viewBox="0 0 1448 520" role="img" aria-label="同一事件的发生与接收时刻，对应线段为信息延迟">
  {[420,480,540,600,660].map(m=><g key={m}><path d={`M${x(m)} 60V420`} stroke="#cad2c1" strokeDasharray="5 7"/><text x={x(m)} y="39" textAnchor="middle" fontSize="23" fill="#6b8174">{transitionClock(m)}</text></g>)}
  {rows.slice(0,n).map((r,i)=>{const y=109+i*89,a=x(minutes(r[1]!)),b=x(minutes(r[2]!));return <g key={i}><text x="0" y={y+8} fontSize="29" fill="#205c68">{r[0]}</text><path d={`M${a} ${y}H${b}`} stroke="#bc8d50" strokeWidth="9"/><circle cx={a} cy={y} r="10" fill="#246c77"/><rect x={b-8} y={y-8} width="16" height="16" fill="#b28044"/><text x={b+20} y={y+8} fontSize="23" fill="#6b8174">{minutes(r[2]!)-minutes(r[1]!)}分钟</text></g>;})}
  <circle cx="375" cy="485" r="8" fill="#246c77"/><text x="398" y="494" fontSize="23" fill="#246c77">事件发生</text><rect x="645" y="477" width="16" height="16" fill="#b28044"/><text x="678" y="494" fontSize="23" fill="#987342">调度收到</text><text x="1050" y="494" fontSize="21" fill="#6b8174">同一日 · 同一时区 · 教学时刻</text>
 </svg>;
}
function Handoff({state}:Props){
 const v=digitalHandoff(state.option),data=[['承运交付',v.carrier,v.carrier+v.latency],['海关放行',v.customs,v.customs+v.latency],['码头可安排',v.terminal,v.terminal+v.latency],['车辆到位',v.transport,v.transport]] as const;
 const x=(m:number)=>280+(m-420)/270*1060;
 return <div className="px-handoff"><svg className="px-diagram" viewBox="0 0 1448 350" role="img" aria-label="业务条件与共享到达时刻，须全部满足后才可安排出闸">
 {[420,480,540,600,660].map(m=><g key={m}><text x={x(m)} y="30" textAnchor="middle" fontSize="22" fill="#6b8174">{transitionClock(m)}</text><path d={`M${x(m)} 48V323`} stroke="#ccd3c2" strokeDasharray="5 7"/></g>)}
 {data.slice(0,shown(4,state.progress)).map(([label,a,b],i)=><g key={label}><text x="0" y={91+i*69} fontSize="29" fill="#205c68">{label}</text><path d={`M${x(a)} ${82+i*69}H${x(b)}`} stroke="#b88b4d" strokeWidth="8"/><circle cx={x(a)} cy={82+i*69} r="9" fill="#246c77"/><rect x={x(b)-7} y={75+i*69} width="14" height="14" fill="#b28044"/><text x={x(b)+17} y={90+i*69} fontSize="22" fill="#8b7049">{transitionClock(b)}</text></g>)}
 </svg>{state.progress===1&&<div className="px-results"><div><small>全部物理条件齐备</small><strong>{transitionClock(v.conditions)}</strong></div><div><small>调度识别全部条件</small><strong>{transitionClock(v.recognized)}</strong></div><div><small>最早出闸</small><strong>{transitionClock(v.gate)}</strong></div><div><small>到厂</small><strong>{transitionClock(v.factory)}</strong></div></div>}</div>;
}
function Boundary({page,state}:Props){
 const labels=page.labels??[],n=shown(labels.length,state.progress);
 return <div className="px-boundary"><div className="px-boundary-core"><span>所选企业组织边界</span>{n>0&&<h2>{labels[0]}</h2>}<p>按控制等选定口径纳入</p></div><div className="px-boundary-outside">{labels.slice(1,n).map((s,i)=><section key={s}><span>{['购入能源','相关运输','更广生命周期'][i]}</span><h2>{s}</h2><p>{['发电排放发生在边界外，购电计入相应间接排放','先核对企业控制关系及相关间接排放分类','若纳入比较，需要说明阶段和共同基准'][i]}</p></section>)}</div></div>;
}
function Shore({page,state}:Props){
 const labels=page.labels??[],n=shown(labels.length,state.progress);
 return <div className="px-shore"><div className="px-shore-sides"><span>岸上供电与服务</span><span>船舶受电与使用</span></div><ol>{labels.slice(0,n).map((s,i)=><li key={s}><small>{String(i+1).padStart(2,'0')}</small><h2>{s}</h2><p>{['能源来源、设施容量与供电保障','设施可用、专业服务、费用与安排','参数相符、责任明确、安全确认','实际负荷、用电量与有效使用时间'][i]}</p>{i<3&&<b aria-hidden="true">→</b>}</li>)}</ol><p className="px-shore-foot">相同用能需求下比较 · 实际使用后记录kWh及有效小时</p></div>;
}
function Carbon({state}:Props){
 const v=shoreComparison(state.option),n=shown(3,state.progress);
 return <div className="px-carbon"><div className="px-carbon-plot"><p>本次相同供电需求 · {v.kwh} kWh</p>{[['柴油发电',v.dieselKg],['岸电对应发电',v.gridKg]].slice(0,n).map(([label,value],i)=><section key={label}><h2>{label}</h2><div><span style={{width:`${Number(value)/600*100}%`,background:palette[i]}}/><strong>{f(Number(value))}<small>kg CO₂</small></strong></div></section>)}<div className="px-scale"><span>0</span><span>300</span><span>600 kg CO₂</span></div><small>两行使用同一刻度；柴油为燃烧、电力为发电相关排放</small></div>{n===3&&<aside className={v.savedKg<0?'px-adverse':''}><span>与柴油相比的差额</span><strong>{v.savedKg<0?'−':''}{f(Math.abs(v.savedKg))}<small>kg CO₂</small></strong><p>{v.savedKg>=0?'所列范围内排放减少':'所列范围内排放增加'}</p><hr/><span>使用费用节约</span><b>{f(v.savedCost)} 元</b><p>未计设施投资与其他成本</p></aside>}</div>;
}
function Intensity({state}:Props){
 const v=greenIntensity(state.option),n=shown(3,state.progress);
 return <div className="px-intensity">{[['业务量',f(v.boxes),'实体箱',v.boxes/160000,'比较业务规模'],['CO₂总量',f(v.tonnes),'吨',v.tonnes/1200,'比较相同边界排放'],['单位排放',f(v.kgPerBox),'kg CO₂/实体箱',v.kgPerBox/12,'总量÷业务量']].slice(0,n).map(([label,value,unit,ratio,note],i)=><section key={String(label)}><span>{label}</span><strong>{value}<small>{unit}</small></strong><div className="px-intensity-track"><i style={{width:`${Number(ratio)*100}%`,background:palette[i]}}/></div><p>{note} · 各列独立刻度</p></section>)}</div>;
}
function Portfolio({state}:Props){
 const v=transitionPortfolio(state.option),n=shown(4,state.progress);
 return <div className="px-portfolio"><div className="px-budget"><span>初始投入 / 预算</span>{n>0&&<><strong>{v.capital}<small> / 420 万元</small></strong><div><i style={{width:`${Math.min(1,v.capital/520)*100}%`,background:v.withinBudget?'#246c77':'#ad5b40'}}/><b style={{left:`${420/520*100}%`}}>预算上限</b></div><p>{v.withinBudget?`预算余量 ${420-v.capital} 万元`:`超出预算 ${v.capital-420} 万元`}</p></>}</div><div className="px-portfolio-values">{n>1&&<section><span>年度净节约</span><strong>{v.netAnnual}<small>万元 / 年</small></strong><p>年度节约扣除持续支出</p></section>}{n>2&&<section><span>年度CO₂减少</span><strong>{v.reduction}<small>吨 / 年</small></strong><p>教学目标 ≥ 200 吨 / 年</p></section>}{n>3&&<section><span>静态回收期</span><strong>{f(v.simplePayback)}<small>年</small></strong><p>未含折现、税费和融资</p></section>}</div></div>;
}
function Photo({page,state}:Props){
 return <div className="px-photo"><figure><img src={page.image} alt={page.lesson===15?'青岛港自动化设备协同作业，央视2025年5月报道原画面':'天津港新能源运输设备，央视2025年6月报道原画面'}/><figcaption>{page.lesson===15?'青岛港 · 2025-05-22':'天津港 · 2025-06-09'} · 原报道画面</figcaption></figure><Records page={page} state={state}/></div>;
}
export function PortTransitionComposition({page,state}:Props){
 const source=PORT_EXPANSION_SOURCES[page.source],props={page,state};let body;
 switch(page.visual){case 'trade-media':body=<MediaCover {...props}/>;break;case 'transition-task':body=<Task {...props}/>;break;case 'transition-layers':body=<Layers {...props}/>;break;case 'transition-flow':body=<Flow {...props}/>;break;case 'transition-events':body=<Events {...props}/>;break;case 'transition-handoff':body=<Handoff {...props}/>;break;case 'transition-boundary':body=<Boundary {...props}/>;break;case 'transition-shore':body=<Shore {...props}/>;break;case 'transition-carbon':body=<Carbon {...props}/>;break;case 'transition-intensity':body=<Intensity {...props}/>;break;case 'transition-portfolio':body=<Portfolio {...props}/>;break;case 'transition-photo':body=<Photo {...props}/>;break;default:body=<Records {...props}/>;}
 return <article className={`port-expansion-slide pt-slide px-slide${page.lesson===16?' px-green':''}${state.revealed?' pt-answered':''}`} aria-label={`第${page.lesson}讲第${page.localPage}页`} data-slide-composition={`port-transition-${page.slideKey}`}>
  <header className="pt-heading"><div className="pt-eyebrow"><span>港口管理概论 / {page.lesson}</span><span>{page.section}</span></div><h1>{page.title}</h1><p>{page.lead}</p></header>
  <div className={`pt-body px-body px-body--${page.visual}`}>{body}</div>
  {page.options&&<p className="pt-option">当前教学情境 / {page.options[state.option]}</p>}
  <div className="pt-observations">{expansionVisiblePoints(page,state.progress).map((s,i)=><p key={s}><span>{String(i+1).padStart(2,'0')}</span>{s}</p>)}</div>
  {state.revealed&&page.reveal&&<div className="pt-answer" role="note"><strong>证据与判断</strong><p>{page.reveal}</p></div>}
  <footer><span>{page.narrative.publicLabel} · <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> · {source.date}{page.sourceIds?.slice(1).map((id,i)=><a key={id} href={PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES].url} target="_blank" rel="noreferrer"> · 补充资料{i+1}</a>)}</span><span>港口管理概论　{String(page.localPage).padStart(2,'0')} / {expansionTotal(page.lesson)}</span></footer>
 </article>;
}
