import {PORT_EXPANSION_SOURCES,PORT_TRADE_FILMS,expansionTotal,expansionVisiblePoints,bondedComparison,tradeReadiness,tradeClock,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';

const ink='#153f50',teal='#237f83',gold='#b17c40';
function SvgLabel({x,y,text,width=260,size=28,color=ink}:{x:number;y:number;text:string;width?:number;size?:number;color?:string}){
 const count=Math.max(4,Math.floor(width/size)),chars=Array.from(text),lines=Array.from({length:Math.ceil(chars.length/count)},(_,i)=>chars.slice(i*count,(i+1)*count).join(''));
 return <text x={x} y={y} fill={color} fontSize={size} textAnchor="middle">{lines.map((line,i)=><tspan x={x} dy={i?size*1.4:0} key={i}>{line}</tspan>)}</text>;
}
function TradeTable({page,progress,compact=false}:{page:PortExpansionPage;progress:number;compact?:boolean}){
 const [head,...rows]=page.rows??[],count=Math.floor(progress*rows.length+1e-6);
 if(!head)return null;
 return <div className={`pt-table${compact?' pt-table--compact':''}`}><table><thead><tr>{head.map((s,i)=><th key={i}>{s}</th>)}</tr></thead><tbody>{rows.slice(0,count).map((row,i)=><tr key={i}>{row.map((s,j)=><td key={j}>{s}</td>)}</tr>)}</tbody></table></div>;
}
function Harbor({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 return <div className="pt-harbor"><svg viewBox="0 0 1440 510" role="img" aria-label="船、堆场、监管接口与工厂之间的教学联系示意">
  <defs><linearGradient id={`water-${page.lesson}`} x2="1" y2="1"><stop stopColor="#276c80"/><stop offset="1" stopColor="#102f42"/></linearGradient></defs>
  <path d="M0 315Q350 290 700 325T1440 330V510H0Z" fill={`url(#water-${page.lesson})`}/>
  <path d="M390 305H1440V345H390Z" fill="#c1cdbb"/><path d="M0 377H510l-55 80H96Z" fill="#c79557"/>
  {[45,153,261].map((x,i)=><g key={x}><rect x={x} y={321-i*17} width="99" height="54" fill={['#6e9da0','#d8c29a','#497889'][i]}/><path d={`M${x+12} ${341-i*17}h76m-76 15h76`} stroke="#163e4c" opacity=".35"/></g>)}
  {[490,720].map(x=><g key={x} fill="none" stroke="#4e7d80" strokeWidth="10"><path d={`M${x} 310V95H${x+180}V310M${x-100} 100H${x+220}M${x} 98L${x-75} 150M${x+180} 98L${x+210} 155`}/><path d={`M${x+25} 105v97h40`} stroke="#b58b51" strokeWidth="6"/></g>)}
  <path d="M1030 295V184l110-58 110 58v111" fill="#f2e9d0" stroke="#71958b" strokeWidth="5"/><path d="M1057 294V220h59v74m34-74h69v74" fill="#8daea3"/>
  <path d="M1300 300V168h95v132m-75-132V98h30v70" fill="#b6c7b4"/>
  <path d="M505 395H1300" stroke="#a8bcb2" strokeWidth="3" strokeDasharray="11 10"/>
  <text x="680" y="445" fill="#dae5dc" fontSize="25">货物、信息与责任，需要在接口处接续</text>
 </svg><div className="pt-cover-facts">{page.labels?.slice(0,Math.ceil(state.progress*page.labels.length)).map((label,i)=><p key={label}><span>{String(i+1).padStart(2,'0')}</span>{label}</p>)}</div></div>;
}
function Flow({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 if(page.rows?.[0]?.length===4)return <TradeTable page={page} progress={state.progress}/>;
 const labels=page.labels??[],count=Math.floor(state.progress*labels.length+1e-6),w=labels.length>4?238:labels.length>3?300:410,gap=28,start=(1440-(labels.length*w+(labels.length-1)*gap))/2;
 return <div className={`pt-flow${page.rows?' pt-flow--with-table':''}`}><svg viewBox={`0 0 1440 ${page.rows?220:480}`} role="img" aria-label="业务关系示意，具体先后依条件核实">{labels.slice(0,count).map((label,i)=><g key={i}>
  {i>0&&<path d={`M${start+i*(w+gap)-gap+3} ${page.rows?106:222}h20l-7-7m7 7l-7 7`} fill="none" stroke={gold} strokeWidth="3"/>}
  <rect x={start+i*(w+gap)} y={page.rows?44:156} width={w} height="128" rx="4" fill={i%2?'#e5e8d9':'#d7e7df'}/>
  <text x={start+i*(w+gap)+20} y={page.rows?75:187} fill={gold} fontSize="19">{String(i+1).padStart(2,'0')}</text><SvgLabel x={start+i*(w+gap)+w/2} y={page.rows?105:217} width={w-44} text={label} size={27}/>
 </g>)}</svg>{page.rows&&<TradeTable page={page} progress={state.progress} compact/>}</div>;
}
function Network({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const labels=page.labels??[],count=Math.floor(state.progress*labels.length+1e-6),isCQ=page.slideKey==='l14-chongqing-seven';
 const positions=isCQ?[[810,90],[310,90],[310,235],[550,380],[155,380],[1020,380],[1230,235]]:labels.map((_,i)=>[245+(i%3)*475,labels.length<=3?(page.rows?110:230):145+Math.floor(i/3)*230]);
 return <div className={`pt-network${page.rows?' pt-network--with-table':''}`}><svg viewBox={`0 0 1440 ${page.rows?250:500}`} role="img" aria-label={isCQ?'重庆七区联系拓扑示意，非比例、非行政边界':'业务与节点联系示意'}>
  {isCQ?<><path d="M400 480C720 480 700 325 900 320S1140 160 1400 190" fill="none" stroke="#88b7bb" strokeWidth="20" opacity=".5"/><text x="920" y="475" fill="#467d8b" fontSize="23">长江沿线联系（示意）</text><path d="M95 90H760M135 320L550 180" stroke="#c29d68" strokeDasharray="9 10" strokeWidth="4"/></>:<path d={`M85 ${page.rows?110:250}H1355`} stroke="#a4bdb0" strokeWidth="3"/>}
  {labels.slice(0,count).map((label,i)=>{const [x,y]=positions[i]!;return <g key={i}><circle cx={x} cy={y} r="8" fill={gold}/><rect x={x!-145} y={y!-50} width="290" height="113" rx="4" fill={i%2?'#e7e9d9':'#d6e7df'} stroke="#b2c8b9"/><SvgLabel x={x!} y={y!-7} width={250} text={label} size={27}/></g>;})}
 </svg>{page.rows&&<TradeTable page={page} progress={state.progress} compact/>}{isCQ&&<p className="pt-map-note">节点按联系组织；不表示精确距离、线路、区域面积或围网边界</p>}</div>;
}
function Zones({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const platforms=page.slideKey==='l14-cq-platform-layers',count=Math.floor(state.progress*(platforms?4:3)+1e-6);
 if(platforms)return <svg viewBox="0 0 1440 500" role="img" aria-label="开放平台的不同制度维度，方框面积不表示空间包含">{page.labels?.slice(0,count).map((label,i)=><g key={i}><rect x={60+(i%2)*720} y={30+Math.floor(i/2)*245} width="660" height="190" fill={['#d6e7df','#e6e6d5','#d6e2e7','#e9ddc6'][i]} rx="4"/><text x={90+(i%2)*720} y={78+Math.floor(i/2)*245} fill={gold} fontSize="23">{String(i+1).padStart(2,'0')}</text><SvgLabel x={390+(i%2)*720} y={120+Math.floor(i/2)*245} width={570} text={label} size={32}/></g>)}</svg>;
 const names=['境外','综合保税区','境内区外'];return <svg viewBox="0 0 1440 500" role="img" aria-label="境外、综保区与境内区外关系示意，非比例">{names.slice(0,count).map((name,i)=><g key={name}><rect x={45+i*475} y="70" width="400" height="340" fill={['#d8e6e9','#dce8db','#e9e0cb'][i]} stroke={i===1?teal:'transparent'} strokeDasharray={i===1?'12 9':undefined} strokeWidth="4"/><text x={245+i*475} y="220" fontSize="43" textAnchor="middle" fill={ink}>{name}</text><SvgLabel x={245+i*475} y={285} width={350} size={25} text={['货物来源与境外市场','相应业务、账册与货物管理','国内生产、销售与使用'][i]!}/></g>)}{count>1&&<><path d="M450 240h65m-13-10 13 10-13 10" stroke={gold} fill="none" strokeWidth="4"/><text x="480" y="156" textAnchor="middle" fontSize="24" fill={gold}>一线</text></>}{count>2&&<><path d="M925 240h65m-13-10 13 10-13 10" stroke={gold} fill="none" strokeWidth="4"/><text x="955" y="156" textAnchor="middle" fontSize="24" fill={gold}>二线</text></>}<text x="720" y="470" fontSize="23" textAnchor="middle" fill="#5a7a77">流向不同，适用手续与税收判断需分别核实</text></svg>;
}
function Documents({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 return <div className="pt-documents"><div className="pt-paper-stack"><div className="pt-paper pt-paper--back"/><div className="pt-paper"><small>澄江机电 / 教学资料</small><h2>{page.localPage===7?'单证核验':page.localPage===8?'数量换算':'版本核对'}</h2><div className="pt-paper-rule"/><p>{page.localPage===7?'合同 · 发票 · 装箱单':page.localPage===8?'100箱 × 10套/箱':'98箱 × 10套/箱'}</p><strong>{page.localPage===7?'对象与事实':page.localPage===8?'1,000套':'980套'}</strong><p>{page.localPage===9?'实际装运记录：待核实':'单位、型号、版本、对应关系'}</p><span>保留来源与核验依据</span></div></div><TradeTable page={page} progress={state.progress}/></div>;
}
function Readiness({state}:{state:ExpansionPresentation}){
 const v=tradeReadiness(state.option),items=[['海关',v.customs],['承运人交付',v.carrier],['码头',v.terminal],['运输',v.transport]] as const,count=Math.floor(state.progress*4+1e-6),x=(h:number)=>260+(h-6)*105;
 return <svg viewBox="0 0 1440 510" role="img" aria-label={`教学货票${v.id}的四项准备时刻，全部条件满足后另需30分钟`}>
  {[6,8,10,12,14,16].map(h=><g key={h}><path d={`M${x(h)} 55V395`} stroke="#c6d1be" strokeDasharray="4 7"/><text x={x(h)} y="32" fill="#69877d" fontSize="23" textAnchor="middle">{tradeClock(h)}</text></g>)}
  {items.slice(0,count).map(([name,t],i)=><g key={name}><text x="15" y={112+i*82} fill={ink} fontSize="28">{name}</text><path d={`M260 ${102+i*82}H${x(t)}`} stroke={t===v.ready?gold:teal} strokeWidth="19"/><circle cx={x(t)} cy={102+i*82} r="10" fill={ink}/><text x={x(t)+20} y={111+i*82} fill={ink} fontSize="27">{tradeClock(t)}</text></g>)}
  {count===4&&<><path d={`M${x(v.ready)} 70V410`} stroke={gold} strokeWidth="3" strokeDasharray="7 6"/><rect x="260" y="429" width="1110" height="66" fill={ink}/><text x="290" y="472" fill="#f5ecd6" fontSize="29">最后条件 {tradeClock(v.ready)}　＋作业30分钟　＝最早出闸 {tradeClock(v.gateOut)}</text></>}
 </svg>;
}
function Inventory({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const values=[1000,600,400],count=Math.floor(state.progress*3+1e-6);return <div className="pt-inventory"><svg viewBox="0 0 1440 250" role="img" aria-label="教学库存1000件减400件再减200件，余额400件">{values.slice(0,count).map((v,i)=><g key={i}><rect x={180+i*470} y={220-v*.16} width="200" height={v*.16} fill={[teal,'#6d9f94',gold][i]}/><text x={280+i*470} y={200-v*.16} fill={ink} fontSize="37" textAnchor="middle">{v.toLocaleString()}件</text>{i>0&&<text x={40+i*470} y="130" fill={gold} fontSize="29">−{i===1?400:200}</text>}</g>)}</svg><TradeTable page={page} progress={state.progress} compact/></div>;
}
function Cost({state}:{state:ExpansionPresentation}){
 const v=bondedComparison(state.option),data=[['资金收益',v.benefit,teal],['增量费用',v.cost,'#8c9b81'],['净收益',v.net,v.net>=0?teal:'#ad593e']] as const,count=Math.floor(state.progress*3+1e-6);
 return <svg viewBox="0 0 1440 510" role="img" aria-label={`教学${v.days}天，资金成本${v.rate*100}%，资金收益与增量费用比较，单位元`}>
  <text x="20" y="45" fontSize="29" fill={ink}>延期税款100万元　·　{v.days}天　·　资金成本{v.rate*100}% / 年</text><text x="20" y="90" fontSize="24" fill="#65827b">增量费用：6,000元 ＋ 100元/天 × {v.days}天　/　共同成本暂不计</text><path d="M390 135V445" stroke="#78998b" strokeWidth="2"/>
  {data.slice(0,count).map(([name,value,color],i)=><g key={name}><text x="20" y={188+i*110} fill={ink} fontSize="30">{name}</text><rect x={390+Math.min(0,value)*.04} y={155+i*110} width={Math.abs(value)*.04} height="48" fill={color}/><text x={value>=0?410+value*.04:410} y={189+i*110} fill={color} fontSize="29">{value.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}元</text></g>)}
  <text x="390" y="480" fontSize="23" textAnchor="middle" fill="#678277">0元</text><text x="870" y="480" fontSize="23" fill="#678277">暂不计增值税抵扣时点及其他差异</text>
 </svg>;
}
function History({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const rows=page.rows?.slice(1)??[],count=Math.floor(state.progress*rows.length+1e-6);return <div className="pt-history">{rows.slice(0,count).map((row,i)=><div className="pt-history-row" key={i}><strong>{row[0]}</strong><div><h2>{row[1]}</h2><p>{row[2]??''}</p></div></div>)}</div>;
}
function MediaCover({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const film=PORT_TRADE_FILMS[page.mediaId!],source=PORT_EXPANSION_SOURCES[film.source];return <div className="pt-media-cover"><figure><img src={film.poster} alt={`${film.title}，原报道画面`}/><figcaption>{source.date} · 原报道画面与原声节选 · {film.durationMs/1000}秒 · <a href={film.src} target="_blank" rel="noreferrer">独立观看本段 ↗</a></figcaption></figure><div><span className="pt-media-mark">新闻观察</span><h2>{film.title}</h2>{page.labels?.slice(0,Math.ceil(state.progress*page.labels.length)).map((s,i)=><p key={i}><b>{i+1}</b>{s}</p>)}<small>来源：{source.label}<br/>保留报道时点与案例边界</small></div></div>;
}
export function PortTradeComposition({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const source=PORT_EXPANSION_SOURCES[page.source],points=expansionVisiblePoints(page,state.progress),props={page,state};let body;
 switch(page.visual){case 'trade-cover':body=<Harbor {...props}/>;break;case 'trade-flow':body=<Flow {...props}/>;break;case 'trade-network':body=<Network {...props}/>;break;case 'trade-zones':body=<Zones {...props}/>;break;case 'trade-documents':body=<Documents {...props}/>;break;case 'trade-timeline':body=<Readiness state={state}/>;break;case 'trade-inventory':body=<Inventory {...props}/>;break;case 'trade-cost':body=<Cost state={state}/>;break;case 'trade-history':body=<History {...props}/>;break;case 'trade-media':body=<MediaCover {...props}/>;break;default:body=<TradeTable page={page} progress={state.progress}/>;}
 return <article className={`port-expansion-slide pt-slide${page.visual==='trade-cover'?' pt-cover':''}${state.revealed?' pt-answered':''}`} aria-label={`第${page.lesson}讲第${page.localPage}页`}>
  <header className="pt-heading"><div className="pt-eyebrow"><span>PORT STUDIES / {page.lesson}</span><span>{page.section}</span></div><h1>{page.title}</h1><p>{page.lead}</p></header>
  <div className={`pt-body pt-body--${page.visual}`}>{body}</div>
  {page.options&&<p className="pt-option">当前教学情境 / {page.options[state.option]}</p>}
  <div className="pt-observations">{points.map((point,i)=><p key={point}><span>{String(i+1).padStart(2,'0')}</span>{point}</p>)}</div>
  {state.revealed&&page.reveal&&<div className="pt-answer" role="note"><strong>证据与判断</strong><p>{page.reveal}</p></div>}
  <footer><span>{page.narrative.publicLabel} · <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> · {source.date}{page.sourceIds?.slice(1).map((id,i)=><a key={id} href={PORT_EXPANSION_SOURCES[id as keyof typeof PORT_EXPANSION_SOURCES].url} target="_blank" rel="noreferrer"> · 补充资料{i+1}</a>)}</span><span>港口管理概论　{String(page.localPage).padStart(2,'0')} / {expansionTotal(page.lesson)}</span></footer>
 </article>;
}
