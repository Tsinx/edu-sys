import {PORT_EXPANSION_SOURCES,PORT_TRADE_FILMS,expansionTotal,expansionVisiblePoints,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';
import {Label,Symbol,TradeCover,TradeDocuments,TradeSwimlanes,TradeNetwork,TradeZones,TradePaths,TradeHistory,TradeReadiness,TradeInventory,TradeCost,TradeDelivery} from './PortTradeDiagrams';

type Props={page:PortExpansionPage;state:ExpansionPresentation};
const count=(progress:number,n:number)=>Math.floor(progress*n+1e-6);
const specialLayouts:Record<string,string>={
 'l13-three-orders':'orders','l14-orders-not-identical':'comparison',
 'l13-status-language':'receipts','l13-first-record':'evidence','l13-release-and-delivery':'conditions',
 'l13-three-customs-questions':'columns','l13-terms-and-boundaries':'columns',
 'l13-same-release-different-result':'comparison','l13-critical-condition':'comparison',
 'l13-cost-clocks':'ledger','l13-convenience-and-risk':'conditions','l13-diagnosis-card':'dossier',
 'l13-new-receipts':'receipts','l13-finding-note':'worksheet','l13-performance-transfer':'ledger','l13-exit-evidence':'worksheet',
 'l14-tax-distinction':'columns','l14-types-family':'taxonomy','l14-ftz-and-free-port':'comparison',
 'l14-domestic-entry':'ledger','l14-inventory-gap':'dossier','l14-five-businesses':'columns',
 'l14-service-conditions':'conditions','l14-air-water-functions':'columns',
 'l14-fuling-industry':'profile','l14-yongchuan-clusters':'profile','l14-seven-comparison':'comparison',
 'l14-bonded-cost-inputs':'ledger','l14-cost-sensitivity':'comparison','l14-more-than-tax':'evidence',
 'l14-proposal-card':'worksheet','l14-change-order':'dossier','l14-exit-route':'worksheet',
};
const rowIcons:Record<string,string[]>={
 'l13-three-customs-questions':['boxes','coin','ship'],
 'l13-terms-and-boundaries':['truck','coin','document'],
 'l14-tax-distinction':['clock','shield','coin'],
 'l14-five-businesses':['factory','warehouse','search','people'],
 'l14-air-water-functions':['ship','plane','document'],
};
function TradeTable({page,progress,compact=false}:{page:PortExpansionPage;progress:number;compact?:boolean}){
 const [head,...rows]=page.rows??[];if(!head)return null;
 return <div className={`pt-table${compact?' pt-table--compact':''}`}><table><thead><tr>{head.map((s,i)=><th key={i}>{s}</th>)}</tr></thead><tbody>{rows.slice(0,count(progress,rows.length)).map((row,i)=><tr key={i}>{row.map((s,j)=><td key={j} className={page.slideKey==='l14-cost-sensitivity'&&j===3?(s.startsWith('−')?'pt-negative':'pt-positive'):undefined}>{s}</td>)}</tr>)}</tbody></table></div>;
}
function Records({page,state}:Props){
 const [head,...rows]=page.rows??[],n=count(state.progress,rows.length),layout=specialLayouts[page.slideKey]??(page.visual==='decision'?'worksheet':'table');if(!head)return null;
 if(layout==='table'||layout==='comparison')return <div className={`pt-records pt-records--${layout}`}><TradeTable page={page} progress={state.progress}/></div>;
 if(layout==='orders')return <div className="pt-orders">{rows.slice(0,n).map((r,i)=><section key={i}><div className="pt-order-letter">{['A','B','C'][i]}</div><div className="pt-order-icon"><svg viewBox="0 0 90 90"><Symbol kind={['factory','warehouse','ship'][i]!} x={8} y={8} size={74}/></svg></div><h2>{r[0]?.slice(2)}</h2><p>{r[1]}</p><span>需要作出的决定</span><strong>{r[2]}</strong></section>)}</div>;
 if(layout==='columns')return <div className={`pt-columns pt-columns--${rows.length}`} aria-label={head.join('、')}>{rows.slice(0,n).map((r,i)=><section key={i}><svg viewBox="0 0 96 96"><Symbol kind={rowIcons[page.slideKey]?.[i]??'document'} x={10} y={10} size={76}/></svg><h2>{r[0]}</h2>{r.slice(1).map((s,j)=><div key={j}><small>{head[j+1]}</small><p>{s}</p></div>)}</section>)}</div>;
 if(layout==='taxonomy')return <div className="pt-taxonomy">{rows.slice(0,n).map((r,i)=><section key={i}><span>0{i+1}</span><h2>{r[0]}</h2><p>{r[1]}</p><small>{r[2]}</small></section>)}</div>;
 if(layout==='profile')return <div className="pt-profile"><div className="pt-profile-heading"><svg viewBox="0 0 150 150"><Symbol kind="factory" x={10} y={10} size={130}/></svg><strong>{page.localPage===28?'涪陵':'永川'}</strong><span>{page.localPage===28?'长江沿线产业联系':'渝西产业集群联系'}</span></div><div className="pt-evidence">{rows.slice(0,n).map((r,i)=><div className="pt-evidence-row" key={i}><h2>{r[0]}</h2><p>{r[1]}</p></div>)}</div></div>;
 const worksheet=layout==='worksheet',dossier=layout==='dossier';
 return <div className={`pt-records pt-records--${layout}`}>
 {(worksheet||dossier)&&<aside className="pt-task-margin"><span>{worksheet?'个人判断':'业务诊断'}</span><strong>{worksheet?'用证据\n支持结论':'先核对\n再行动'}</strong><svg viewBox="0 0 110 110"><Symbol kind={worksheet?'document':'search'} x={10} y={10} size={90}/></svg><p>{page.lead}</p></aside>}
 <div className="pt-evidence" aria-label={head.join('、')}>{rows.slice(0,n).map((r,i)=><div className="pt-evidence-row" key={i}><span className="pt-row-index">{String(i+1).padStart(2,'0')}</span><h2>{r[0]}</h2><div>{r.slice(1).map((s,j)=><p key={j}>{s}</p>)}</div></div>)}</div>
 </div>;
}
function Flow({page,state}:Props){
 if(page.slideKey==='l13-customs-swimlanes')return <TradeSwimlanes page={page} state={state}/>;
 if(page.slideKey==='l14-three-routes')return <TradePaths page={page} state={state}/>;
 if(page.slideKey==='l13-delivery-promise')return <TradeDelivery page={page} state={state}/>;
 const labels=page.labels??[],n=count(state.progress,labels.length);if(!labels.length)return <TradePaths page={page} state={state}/>;
 const icons:Record<string,string[]>={
  'l13-time-endpoints':['ship','shield','truck','factory'],
  'l13-agency-and-truth':['factory','document','search','shield'],
  'l13-advance-declaration':['boxes','ship','document','warehouse'],
  'l13-terminal-transport':['shield','clock','truck','factory'],
  'l13-export-counterpart':['document','truck','shield','ship'],
  'l14-status-triple':['warehouse','shield','ship'],
  'l14-railway-port':['rail','boxes','warehouse','people'],
  'l14-management-evidence':['people','shield','warehouse','coin','search'],
 };
 const step=1448/labels.length;
 return <div className={`pt-flow${page.rows?' pt-flow--with-table':''}`}><svg viewBox={`0 0 1448 ${page.rows?190:520}`} className="pt-flow-stages" role="img" aria-label="阶段之间的业务联系，具体顺序和条件另行核实">{labels.slice(0,n).map((s,i)=><g key={s}>
 <text x={i*step+14} y={page.rows?35:50} fontSize="20" fill="#b37b3e">{String(i+1).padStart(2,'0')}</text><Symbol kind={icons[page.slideKey]?.[i]??'document'} x={i*step+step/2-32} y={page.rows?4:100} size={page.rows?58:82}/>
 <Label x={i*step+step/2} y={page.rows?112:260} width={step-55} size={page.rows?26:30}>{s}</Label>
 {i<labels.length-1&&<path d={`M${(i+1)*step-35} ${page.rows?55:156}h45l-10-7m10 7-10 7`} stroke="#b37b3e" fill="none" strokeWidth="2"/>}
 </g>)}</svg>{page.rows&&<TradeTable page={page} progress={state.progress} compact/>}</div>;
}
function MediaCover({page,state}:Props){const film=PORT_TRADE_FILMS[page.mediaId!],source=PORT_EXPANSION_SOURCES[film.source];return <div className="pt-media-cover"><figure><img src={film.poster} alt={`${film.title}，原报道画面`}/><figcaption>{source.date} · 原报道画面与原声节选 · {film.durationMs/1000}秒</figcaption></figure><div className="pt-media-observe"><span className="pt-media-mark">观看时，留下三项记录</span>{page.labels?.slice(0,Math.ceil(state.progress*page.labels.length)).map((s,i)=><div className="pt-media-question" key={i}><b>{String(i+1).padStart(2,'0')}</b><p>{s}</p></div>)}<small>{source.label}<br/>保留报道时点与案例边界</small><a href={film.src} target="_blank" rel="noreferrer">独立观看本段 ↗</a></div></div>;}
export function PortTradeComposition({page,state}:Props){
 const source=PORT_EXPANSION_SOURCES[page.source],points=expansionVisiblePoints(page,state.progress),props={page,state};let body;
 switch(page.visual){case 'trade-cover':body=<TradeCover {...props}/>;break;case 'trade-flow':body=<Flow {...props}/>;break;case 'trade-network':body=<TradeNetwork {...props}/>;break;case 'trade-zones':body=<TradeZones {...props}/>;break;case 'trade-documents':body=<TradeDocuments {...props}/>;break;case 'trade-timeline':body=<TradeReadiness {...props}/>;break;case 'trade-inventory':body=<TradeInventory {...props}/>;break;case 'trade-cost':body=<TradeCost {...props}/>;break;case 'trade-history':body=<TradeHistory {...props}/>;break;case 'trade-media':body=<MediaCover {...props}/>;break;default:body=<Records {...props}/>;}
 return <article className={`port-expansion-slide pt-slide${page.visual==='trade-cover'?' pt-cover':''}${state.revealed?' pt-answered':''}`} aria-label={`第${page.lesson}讲第${page.localPage}页`} data-slide-composition={`port-trade-${page.slideKey}`}>
 <header className="pt-heading"><div className="pt-eyebrow"><span>港口管理概论 / {page.lesson}</span><span>{page.section}</span></div><h1>{page.title}</h1><p>{page.lead}</p></header>
 <div className={`pt-body pt-body--${page.visual}`}>{body}</div>
 {page.options&&<p className="pt-option">当前教学情境 / {page.options[state.option]}</p>}
 <div className="pt-observations">{points.map((point,i)=><p key={point}><span>{String(i+1).padStart(2,'0')}</span>{point}</p>)}</div>
 {state.revealed&&page.reveal&&<div className="pt-answer" role="note"><strong>证据与判断</strong><p>{page.reveal}</p></div>}
 <footer><span>{page.narrative.publicLabel} · <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> · {source.date}{page.sourceIds?.slice(1).map((id,i)=><a key={id} href={PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES].url} target="_blank" rel="noreferrer"> · 补充资料{i+1}</a>)}</span><span>港口管理概论　{String(page.localPage).padStart(2,'0')} / {expansionTotal(page.lesson)}</span></footer>
 </article>;
}
