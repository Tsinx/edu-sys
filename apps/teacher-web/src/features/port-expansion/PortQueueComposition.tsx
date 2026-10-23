import type {ReactNode} from 'react';
import katex from 'katex';
import {PORT_EXPANSION_SOURCES,PORT_EXPANSION_FILMS,expansionVisiblePoints,expansionTotal,queueJobs,runQueue,QUEUE_HAND_ARRIVALS,appointmentQueue,mm1,queueCostPlans,type PortExpansionPage,type ExpansionPresentation,type QueueRecord} from '@edu/course-content';

type Props={page:PortExpansionPage;state:ExpansionPresentation};
const shown=(n:number,p:number)=>Math.floor(n*Math.max(0,Math.min(1,p))+1e-6);
const f=(n:number,d=2)=>n.toLocaleString('zh-CN',{maximumFractionDigits:d});
export function QueueMath({tex}:{tex:string}){return <span className="pq-math" dangerouslySetInnerHTML={{__html:katex.renderToString(tex,{displayMode:true,throwOnError:true,strict:'ignore',trust:false})}}/>;}
function Equations({page,state}:Props){return <div className={'pq-equations pq-equations--'+(page.equations?.length??0)}>{page.equations?.slice(0,shown(page.equations.length,state.progress)).map((e,i)=><section key={e.tex}><span className="pq-step">{String(i+1).padStart(2,'0')}</span><QueueMath tex={e.tex}/><p>{e.explanation}</p></section>)}</div>;}
function Table({rows,progress=1}:{rows:readonly (readonly string[])[];progress?:number}){
 const n=1+shown(Math.max(0,rows.length-1),progress);
 return <table className={'pq-table pq-table--'+Math.max(0,...rows.map(r=>r.length))}><thead><tr>{rows[0]?.map((v,i)=><th key={i} scope="col">{v}</th>)}</tr></thead><tbody>{rows.slice(1,n).map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>;
}
function Records({page,state}:Props){return <div className="pq-records"><Table rows={page.rows??[]} progress={state.progress}/></div>;}
const text=(x:number,y:number,value:ReactNode,other:object={})=><text key={x+'-'+y+'-'+String(value)} x={x} y={y} {...other}>{value}</text>;
export function QueueTimeline({records,progress=1,range=24,compact=false}:{records:readonly QueueRecord[];progress?:number;range?:number;compact?:boolean}){
 const top=44,h=compact?30:45,bottom=top+h*records.length+28,x=(t:number)=>140+t/range*1210;
 const height=bottom+46;
 return <svg className="pq-chart" viewBox={'0 0 1440 '+height} role="img" aria-label="逐车时间图，灰色港外等待、琥珀色排队、蓝色服务，时间单位分钟">
  {[0,range/4,range/2,range*.75,range].map(t=><g key={t}><path d={'M'+x(t)+' 22V'+bottom} stroke="#d8d7c8" strokeWidth="1"/>{text(x(t),height-12,f(t,1),{textAnchor:'middle',fill:'#6b7e7e'})}</g>)}
  {records.slice(0,shown(records.length,progress)).map((r,i)=>{const y=top+h*i;return <g key={r.id}>{text(15,y+18,r.id,{fontSize:compact?20:23})}
   <rect x={x(r.ready)} y={y} width={Math.max(0,x(r.arrival)-x(r.ready))} height="22" fill="#a4acb1"/>
   <rect x={x(r.arrival)} y={y} width={Math.max(0,x(r.start)-x(r.arrival))} height="22" fill="#c18a45"/>
   <rect x={x(r.start)} y={y} width={Math.max(0,x(r.departure)-x(r.start))} height="22" fill={r.server===2?'#4f7599':'#237880'}/>
   <path d={'M'+x(r.arrival)+' '+(y-5)+'V'+(y+27)} stroke="#334b56" strokeWidth="2"/>
   {text(x(r.departure)+9,y+18,f(r.departure,1),{fontSize:compact?17:20,fill:'#365562'})}
  </g>;})}
  {text(1430,height-12,'分钟',{textAnchor:'end',fontSize:21})}
 </svg>;
}
function Timeline({state}:Props){return <div className="pq-timeline"><QueueTimeline records={runQueue(queueJobs(state.option===0?QUEUE_HAND_ARRIVALS.regular:QUEUE_HAND_ARRIVALS.paired))} progress={state.progress}/><p className="pq-caption">同到按编号排序，单台先到先服务；最后一列为完成时刻</p></div>;}
function Clocks(props:Props){
 return <div className="pq-clocks"><svg className="pq-chart" viewBox="0 0 1440 210" role="img" aria-label="T03第1分钟到达，第4分钟开始，第6分钟结束"><path d="M80 130H1360" stroke="#9caeaa" strokeWidth="3"/><path d="M280 120H880" stroke="#c18a45" strokeWidth="26"/><path d="M880 120H1280" stroke="#237880" strokeWidth="26"/>{[[280,'1','到达 a₃'],[880,'4','开始 b₃'],[1280,'6','完成 d₃']].slice(0,1+shown(2,props.state.progress)).map(([x,n,label])=><g key={String(n)}><circle cx={Number(x)} cy="120" r="10" fill="#153e50"/>{text(Number(x),175,n,{textAnchor:'middle',fontSize:30})}{text(Number(x),65,label,{textAnchor:'middle',fontSize:27})}</g>)}{text(580,118,'等待3分钟',{fill:'#fff',textAnchor:'middle',fontSize:24})}{text(1080,118,'服务2分钟',{fill:'#fff',textAnchor:'middle',fontSize:24})}</svg><Equations {...props}/></div>;
}
function Area({page,state}:Props){
 const x=(t:number)=>120+t/24*1210,y=(n:number)=>355-n*120,segments=Array.from({length:4},(_,i)=>[{a:i*6,b:i*6+2,n:2},{a:i*6+2,b:i*6+4,n:1}]).flat(),n=shown(segments.length,state.progress);
 return <div className="pq-area"><svg className="pq-chart" viewBox="0 0 1440 430" role="img" aria-label="成对到达的在场数量阶梯图，0至24分钟，曲线下总面积24辆分钟">
  {[0,1,2].map(v=><g key={v}><path d={'M120 '+y(v)+'H1330'} stroke="#c6d0c5"/>{text(90,y(v)+8,v,{textAnchor:'end'})}</g>)}
  {segments.slice(0,n).map(s=><g key={s.a}><rect x={x(s.a)} y={y(s.n)} width={x(s.b)-x(s.a)} height={y(0)-y(s.n)} fill={s.n===2?'#8bb4af':'#bed3c3'} stroke="#37777d" strokeWidth="2"/>{text((x(s.a)+x(s.b))/2,y(s.n)+45,s.n+'×2',{textAnchor:'middle',fontSize:24})}</g>)}
  {[0,6,12,18,24].map(t=>text(x(t),397,t,{textAnchor:'middle'}))}{text(120,35,'系统内车辆数 N(t)',{fontSize:26})}{text(1420,397,'分钟',{textAnchor:'end'})}
 </svg><Equations page={page} state={state}/></div>;
}
function States({state}:Props){return <svg className="pq-chart" viewBox="0 0 1440 500" role="img" aria-label="状态0至4及以上，按到达率lambda向右、非零状态按服务率mu向左转换">{[0,1,2,3,4].slice(0,1+shown(4,state.progress)).map(n=><g key={n}><circle cx={140+n*270} cy="240" r="64" fill="#f4f1e6" stroke="#256f79" strokeWidth="3"/>{text(140+n*270,256,n===4?'4…':n,{textAnchor:'middle',fontSize:44})}{text(140+n*270,385,n===0?'服务台空闲':n===1?'1票服务':'1票服务＋排队',{textAnchor:'middle',fontSize:23})}{n<4&&<><path d={'M'+(211+n*270)+' 205H'+(338+n*270)+'l-14 -9m14 9-14 9'} stroke="#237880" fill="none" strokeWidth="3"/>{text(275+n*270,165,'到达 λ',{textAnchor:'middle',fontSize:25})}<path d={'M'+(338+n*270)+' 278H'+(211+n*270)+'l14 -9m-14 9 14 9'} stroke="#b57c3e" fill="none" strokeWidth="3"/>{text(275+n*270,327,'完成 μ',{textAnchor:'middle',fontSize:25})}</>}</g>)}</svg>;}
function Probabilities({page,state}:Props){
 const vals=[.1,.09,.081,.0729,.6561],labels=['0','1','2','3','4及以上'],n=shown(5,state.progress);
 return <div className="pq-probabilities"><svg className="pq-chart" viewBox="0 0 1440 365" role="img" aria-label="系统人数长期比例，最后一柱合并4票及以上"><path d="M110 300H1360" stroke="#9eb0a7"/>{vals.slice(0,n).map((v,i)=><g key={i}><rect x={150+i*245} y={300-v*350} width="150" height={v*350} fill={i===4?'#b47d41':'#287780'}/>{text(225+i*245,290-v*350,f(v*100)+'%',{textAnchor:'middle',fontSize:27})}{text(225+i*245,343,labels[i],{textAnchor:'middle',fontSize:25})}</g>)}{text(110,30,'占全部观察时间的比例',{fontSize:25})}</svg><Table rows={page.rows??[]} progress={state.progress}/></div>;
}
function Curve({state}:Props){
 const x=(l:number)=>110+(l-40)/60*1200,y=(w:number)=>450-w/60*370,count=shown(237,state.progress),dots=Array.from({length:237},(_,i)=>{const l=40+i*.25;return {l,w:60/(100-l)};}).slice(0,count);
 return <svg className="pq-chart" viewBox="0 0 1440 535" role="img" aria-label="单台模型平均停留随到达率的非线性曲线，服务率100票每小时">
  {[0,12,24,36,48,60].map(v=><g key={v}><path d={'M110 '+y(v)+'H1310'} stroke="#d1d6c9"/>{text(85,y(v)+8,v,{textAnchor:'end',fontSize:22})}</g>)}
  {[40,50,60,70,80,90,100].map(v=>text(x(v),491,v,{textAnchor:'middle',fontSize:23}))}
  <path d="M110 450H1310M110 60V450" stroke="#556c70" fill="none" strokeWidth="2"/>
  <path d={'M'+x(100)+' 50V450'} stroke="#b37a3d" strokeWidth="3" strokeDasharray="8 8"/>
  {dots.length>0&&<path d={dots.map((d,i)=>(i?'L':'M')+x(d.l)+' '+y(d.w)).join(' ')} fill="none" stroke="#237880" strokeWidth="6"/>}
  {[{l:80,w:3},{l:90,w:6},{l:95,w:12},{l:99,w:60}].filter(d=>dots.length&&d.l<=dots[dots.length-1]!.l).map(d=><g key={d.l}><circle cx={x(d.l)} cy={y(d.w)} r="7" fill="#b57739"/>{text(x(d.l)-12,y(d.w)-15,d.l+'票 → '+d.w+'分钟',{textAnchor:'end',fontSize:24})}</g>)}
  {text(110,32,'W / 分钟',{fontSize:25})}{text(1345,529,'λ / 票每小时',{textAnchor:'end',fontSize:25})}{text(1328,81,'μ=100',{fontSize:21})}
 </svg>;
}
function Rate({state}:Props){
 const [lambda,mu]=[[90,100],[99,100],[99,105]][state.option]!,r=mm1(lambda!,mu!),n=shown(4,state.progress);if(!r.stable)return null;
 return <div className="pq-rate"><div className="pq-rate-formula"><div>{n>0&&<QueueMath tex={'W=\\frac{60}{'+r.mu+'-'+r.lambda+'}='+f(r.W)+'\\ \\text{分钟}'}/>}</div><p>同一单台模型，其他假设保持不变</p></div><div className="pq-rate-values">{[['平均到达 λ',r.lambda,'票/小时'],['服务能力 μ',r.mu,'票/小时'],['平均排队 Wq',r.Wq,'分钟']].slice(0,Math.max(0,n-1)).map(([label,v,unit])=><section key={String(label)}><p>{label}</p><strong>{f(Number(v))}<small>{unit}</small></strong></section>)}</div><p className="pq-caption">平均服务时长 {f(r.service)} 分钟；利用率 {f(r.rho*100)}%</p></div>;
}
function Cost({state}:Props){
 const lambda=state.option===0?90:95,plans=queueCostPlans(lambda);
 return <div className="pq-cost"><p>平均到达 λ={lambda}票/小时　　目标 W≤5分钟　　排队价值120元/车小时</p><table className="pq-table"><thead><tr>{['方案','μ / 票每小时','W / 分钟','排队成本','总成本','服务目标'].map(v=><th key={v}>{v}</th>)}</tr></thead><tbody>{plans.slice(0,shown(3,state.progress)).map(p=><tr key={p.id}><td>{p.id}</td><td>{p.mu}</td><td>{p.result.stable?f(p.result.W):'无稳态'}</td><td>{f(p.waitingCost??0)}</td><td>{f(p.totalCost??0)}</td><td className={p.meets?'pq-pass':'pq-fail'}>{p.meets?'满足':'未满足'}</td></tr>)}</tbody></table><p className="pq-caption">成本列单位均为元/运营小时；总成本另加A/B/C支出0/250/650元每小时</p></div>;
}
function Appointment({state}:Props){const v=appointmentQueue((['burst','appointment','two-servers'] as const)[state.option]!);return <div className="pq-appointment"><div className="pq-metrics">{state.progress===1?<><span>港外等待 <b>{f(v.summary.meanOutside)}</b> 分钟</span><span>闸口排队 <b>{f(v.summary.meanWait)}</b> 分钟</span><span>就绪至完成 <b>{f(v.summary.meanTotal)}</b> 分钟</span></>:<span>逐车展开后核对全体均值</span>}</div><QueueTimeline records={v.records} progress={state.progress} range={26} compact/></div>;}
function Externality({state}:Props){const records=runQueue(queueJobs([0,0,2,4]).map((r,i)=>({...r,id:['X','A','B','C'][i]!})));return <div className="pq-externality"><QueueTimeline records={records} progress={state.progress} range={10}/><p>原有A/B/C分别在0/2/4分钟到达；新增X与A同到，并按约定排在前面</p><div className="pq-external-summary">{state.progress===1&&<><strong>0<small>分钟，X自身排队</small></strong><strong>6<small>辆·分钟，其他车新增等待</small></strong></>}</div></div>;}
function Task({page,state}:Props){
 const scene=page.localPage<=8?'hand':page.localPage<=27?'random':'appointment',lab=[6,25,27,35,40].includes(page.localPage);
 return <div className="pq-task"><Records page={page} state={state}/>{lab&&<a className="pq-lab-link" href={'/port-queue-lab.html?scene='+scene} target="_blank" rel="noreferrer">打开独立模拟{scene==='hand'?'一':scene==='random'?'二':'三'} ↗ <small>预测后运行，可随时重置</small></a>}</div>;
}
function Cover({page}:Props){const film=PORT_EXPANSION_FILMS[page.mediaId!];return <div className="pq-cover"><img src={film.poster} alt="青岛港历史作业画面，非东湾港拥堵现场"/><div><p>东湾港南闸口 · 独立教学情境</p><strong>90 <span>到</span> 99</strong><p>每小时到达量 / 票</p><h2>服务能力仍为100票/小时</h2><a href={film.src} target="_blank" rel="noreferrer">播放46秒开场短片 ↗</a></div></div>;}
export function PortQueueComposition({page,state}:Props){
 let body:ReactNode;
 switch(page.visual){
  case 'queue-cover':body=<Cover page={page} state={state}/>;break;
  case 'queue-records':body=<Records page={page} state={state}/>;break;
  case 'queue-task':body=<Task page={page} state={state}/>;break;
  case 'queue-clocks':body=<Clocks page={page} state={state}/>;break;
  case 'queue-proof':body=<Equations page={page} state={state}/>;break;
  case 'queue-timeline':body=<Timeline page={page} state={state}/>;break;
  case 'queue-area':body=<Area page={page} state={state}/>;break;
  case 'queue-states':body=<States page={page} state={state}/>;break;
  case 'queue-probabilities':body=<Probabilities page={page} state={state}/>;break;
  case 'queue-curve':body=<Curve page={page} state={state}/>;break;
  case 'queue-rate':body=<Rate page={page} state={state}/>;break;
  case 'queue-cost':body=<Cost page={page} state={state}/>;break;
  case 'queue-appointment':body=<Appointment page={page} state={state}/>;break;
  case 'queue-externality':body=<Externality page={page} state={state}/>;break;
  default:throw new Error('Unknown lecture 17 composition');
 }
 const source=PORT_EXPANSION_SOURCES[page.source];
 return <article className={'port-expansion-slide pq-slide pq-slide--'+page.visual+(state.revealed?' pq-answered':'')} aria-label={'第17讲第'+page.localPage+'页'}>
  <header className="pq-heading"><div><span>港口管理概论 / 17</span><span>{page.section}</span></div><h1>{page.title}</h1><p>{page.lead}</p></header>
  <div className="pq-body">{body}</div>
  {page.options&&<p className="pq-option">当前情境：{page.options[state.option]}</p>}
  <div className="pq-observations">{expansionVisiblePoints(page,state.progress).map(s=><p key={s}>{s}</p>)}</div>
  {state.revealed&&page.reveal&&<aside className="pq-answer" role="note"><strong>计算与解释</strong><p>{page.reveal}</p></aside>}
  <footer><span>{page.narrative.publicLabel} · <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> · {source.date}{page.sourceIds?.slice(1).map((id,i)=><a key={id} href={PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES].url} target="_blank" rel="noreferrer"> · 资料{i+1}</a>)}</span><span>{String(page.localPage).padStart(2,'0')} / {expansionTotal(17)}</span></footer>
 </article>;
}
