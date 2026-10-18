import type {ReactNode} from 'react';
import katex from 'katex';
import {MEASUREMENT_DATA as D, measurementLessons, measurementWording, measurementTeachingTables,factorTables, type MeasurementPage} from '@edu/course-content/statistical-analysis';
import {FactorEvidence,hasFactorEvidence} from './FactorEvidence';
import './measurement-pages.css';
import './measurement-survey.css';

type Series={label:string;kind:string;color:string;values:number[][]};
type Chart={xlabel:string;ylabel:string;series:Series[];xmin?:number;xmax?:number;ymin?:number;ymax?:number;barWidth?:number};
type Table={headers:string[];rows:(string|number)[][]};
const ink='#152e3e',amber='#b87921',teal='#197f7a',muted='#667980';
const colors:Record<string,string>={ink,amber,teal};
const plots=D.plots as Record<string,Chart>, tables={...D.tables,...measurementTeachingTables,...factorTables} as Record<string,Table>;
const f=(n:number,d=3)=>Math.abs(n)>=1000?Math.round(n).toLocaleString('en-US'):Number(n.toPrecision(d)).toString();
function ChartView({chart,compact=false,selected=false}:{chart:Chart;compact?:boolean;selected?:boolean}){
 const width=compact?600:1100,height=560,l=compact?96:112,r=width-44,top=150,bottom=426;
 const xs=chart.series.flatMap(s=>s.values.map(v=>v[0]!)),ys=chart.series.flatMap(s=>s.values.map(v=>v[1]!));
 const extent=(values:number[],lo?:number,hi?:number)=>{const a=lo??Math.min(...values),b=hi??Math.max(...values),span=b-a||1;return [lo??a-span*.06,hi??b+span*.06] as const;};
 const bars=chart.series[0]?.kind==='bars';
 const xextent=bars?xs.flatMap(v=>[v-(chart.barWidth??1)/2,v+(chart.barWidth??1)/2]):xs;
 const [xmin,xmax]=extent(xextent,chart.xmin??(Math.min(...xextent)>=0?0:undefined),chart.xmax),[ymin,ymax]=extent(ys,chart.ymin??(bars||Math.min(...ys)>=0?0:undefined),chart.ymax);
 const sx=(x:number)=>l+(x-xmin)/(xmax-xmin)*(r-l),sy=(y:number)=>bottom-(y-ymin)/(ymax-ymin)*(bottom-top);
 const ticks=(a:number,b:number)=>{const unit=10**Math.floor(Math.log10((b-a)/5)),step=[1,2,2.5,5,10].map(v=>v*unit).find(v=>v>=(b-a)/5)??10*unit,first=Math.ceil(a/step)*step;return Array.from({length:Math.floor((b-first)/step+1e-9)+1},(_,i)=>first+i*step);};
 const integers=chart.xlabel.includes('成分')?Array.from({length:Math.floor(xmax)-Math.ceil(xmin)+1},(_,i)=>Math.ceil(xmin)+i):ticks(xmin,xmax);
 return <svg className="sam-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${chart.xlabel}与${chart.ylabel}，${chart.series.map(s=>s.label).join('；')}`}>
  <text x="20" y="112" className="sam-axis-title">{chart.ylabel}</text>
  {ticks(ymin,ymax).map(v=><g key={v}><path d={`M${l} ${sy(v)}H${r}`} stroke={ink} opacity=".1"/><text x={l-13} y={sy(v)+8} textAnchor="end">{f(v)}</text></g>)}
  {integers.map(v=><g key={v}><path d={`M${sx(v)} ${bottom}v7`} stroke={muted}/><text x={sx(v)} y="488" textAnchor="middle">{f(v)}</text></g>)}
  <path d={`M${l} ${top}V${bottom}H${r}`} stroke={muted} fill="none"/>
  {xmin<0&&xmax>0&&<path d={`M${sx(0)} ${top}V${bottom}`} stroke={ink} opacity=".25" strokeDasharray="5 6"/>}
  {ymin<0&&ymax>0&&<path d={`M${l} ${sy(0)}H${r}`} stroke={ink} opacity=".25" strokeDasharray="5 6"/>}
  {chart.series.map((s,j)=><g key={s.label}>{s.kind==='line'?<><path d={s.values.map((v,i)=>`${i?'L':'M'}${sx(v[0]!)} ${sy(v[1]!)}`).join(' ')} fill="none" stroke={colors[s.color]} strokeWidth="4"/>{s.values.map((v,i)=><circle key={i} cx={sx(v[0]!)} cy={sy(v[1]!)} r="5" fill={colors[s.color]}/>)}</>:s.kind==='bars'?s.values.map((v,i)=>{const bw=(chart.barWidth??1)/(xmax-xmin)*(r-l);return <rect key={i} x={sx(v[0]!)-bw/2} y={sy(v[1]!)} width={bw*.94} height={bottom-sy(v[1]!)} fill={colors[s.color]} opacity=".8"/>;}):s.values.map((v,i)=>j===1?<path key={i} d={`M${sx(v[0]!)} ${sy(v[1]!)-5}l5 10h-10Z`} fill={colors[s.color]} opacity=".58"/>:<circle key={i} cx={sx(v[0]!)} cy={sy(v[1]!)} r="4.2" fill={colors[s.color]} opacity=".48"/>)}</g>)}
  {chart.series.map((s,i)=><g key={s.label} transform={`translate(${l} ${28+i*38})`}><path d={i===1?'M0 -6l7 13h-14Z':'M-9 0h18'} stroke={colors[s.color]} fill={colors[s.color]} strokeWidth="4"/><text x="25" y="8">{s.label}</text></g>)}
  {selected&&<g><circle cx={sx(D.wholesale.model.scores[0]![0]!)} cy={sy(D.wholesale.model.scores[0]![1]!)} r="12" fill="none" stroke={amber} strokeWidth="4"/><text x={sx(D.wholesale.model.scores[0]![0]!)+18} y={sy(D.wholesale.model.scores[0]![1]!)-12} fill={amber}>W001</text></g>}
  <text x={(l+r)/2} y="538" textAnchor="middle" className="sam-axis-title">{chart.xlabel}</text>
 </svg>;
}
function DataTable({id,focusRows,focusColumns}:{id:string;focusRows?:number[];focusColumns?:number[]}){
 const t=tables[id]!;
 return <table className={`sam-table sam-table--${id}`}><thead><tr>{t.headers.map((h,j)=><th key={h} className={focusColumns?.includes(j)?'sam-focus':undefined}>{h}</th>)}</tr></thead><tbody>{t.rows.map((r,i)=><tr key={i} className={focusRows?.includes(i)?'sam-focus-row':undefined}>{r.map((v,j)=><td key={j} className={focusColumns?.includes(j)?'sam-focus':undefined}>{v}</td>)}</tr>)}</tbody></table>;
}
function Rows({rows}:{rows:[string,string][]}){return <div className="sam-rows">{rows.map(([a,b],i)=><div key={a}><span>{String(i+1).padStart(2,'0')}</span><strong>{a}</strong><p>{b}</p></div>)}</div>;}
function Comparison({id}:{id:string}){const v=measurementWording[id]!;return <div className="sam-wording"><div className="sam-original"><span>原题</span><p>“{v.before}”</p><small>{v.issue}</small></div><div className="sam-revised"><span>修订示意</span>{v.after.map(a=><p key={a}>{a}</p>)}</div></div>;}
function Profiles(){return <svg className="sam-chart" viewBox="0 0 1100 560" role="img" aria-label="六题均分相同的两个示意画像，A响应5透明1，B两个领域都3">
 <text x="145" y="45">计分后题项：高分代表更正面的体验</text>
 {[1,2,3,4,5].map(v=><g key={v}><path d={`M145 ${430-(v-1)*76}H920`} stroke={ink} opacity=".12"/><text x="120" y={438-(v-1)*76} textAnchor="end">{v}</text></g>)}
 <path d="M145 126V430H920" fill="none" stroke={muted}/>
 {['R1','R2','R3','T1','T2','T3*'].map((v,i)=><text key={v} x={185+i*140} y="477" textAnchor="middle">{v}</text>)}
 {[{v:[5,5,5,1,1,1],color:amber},{v:[3,3,3,3,3,3],color:teal}].map(s=><g key={s.color}><path d={s.v.map((v,i)=>`${i?'L':'M'}${185+i*140} ${430-(v-1)*76}`).join(' ')} fill="none" stroke={s.color} strokeWidth="4"/>{s.v.map((v,i)=><circle key={i} cx={185+i*140} cy={430-(v-1)*76} r="7" fill={s.color}/>)}</g>)}
 <text x="925" y="140" fill={amber}>A</text><text x="925" y="292" fill={teal}>B</text><text x="390" y="535" textAnchor="middle">服务响应</text><text x="790" y="535" textAnchor="middle">信息透明</text>
 </svg>;}
function Correlation({survey=false}:{survey?:boolean}){
 const values=survey?D.survey.correlation:D.wholesale.correlation,labels=survey?['R1','R2','R3','T1','T2','T3*']:D.wholesale.labels;
 return <svg className="sam-chart" viewBox="0 0 1100 560" role="img" aria-label={`${survey?'六题':'六类标准化对数采购'}Pearson相关矩阵，带实际相关系数`}>
  {labels.map((label,j)=><text key={label} x={240+j*103} y="54" textAnchor="middle">{label}</text>)}
  {values.map((row,i)=><g key={i}><text x="171" y={107+i*64} textAnchor="end">{labels[i]}</text>{row.map((v,j)=><g key={j}><rect x={189+j*103} y={67+i*64} width="100" height="62" fill={v>=0?teal:amber} opacity={.05+Math.abs(v)*.3}/><text x={240+j*103} y={107+i*64} textAnchor="middle">{v.toFixed(2)}</text></g>)}</g>)}
  <rect x="189" y="67" width="615" height="382" fill="none" stroke={ink} opacity=".18"/>
  <text x="855" y="116" fill={teal}>正相关</text><text x="855" y="164" fill={amber}>负相关</text><text x="855" y="226">深浅：|r|</text>
  <text x="210" y="522">−1 ≤ r ≤ 1；数值与颜色同时保留</text>
 </svg>;
}
function Distribution(){const sw=['#a86426','#cfab78','#c9c8be','#87b7b0','#197f7a'];return <svg className="sam-chart" viewBox="0 0 1300 560" role="img" aria-label="六题计分后1到5的有效回答比例与缺失数量">
 {[1,2,3,4,5].map((v,i)=><g key={v}><rect x={220+i*173} y="14" width="28" height="28" fill={sw[i]}/><text x={260+i*173} y="39">{v}{v===1?'（低）':v===5?'（高）':''}</text></g>)}
 {D.survey.distribution.map((d,i)=>{let at=220;return <g key={d.item}><text x="30" y={119+i*66}>{d.item}{d.item==='T3'?'*':''}</text><text x="110" y={119+i*66}>n={d.n}</text>{d.counts.map((c,j)=>{const left=at,w=820*c/d.n;at+=w;return <g key={j}><rect x={left} y={82+i*66} width={w} height="52" fill={sw[j]}/>{c/d.n>=.09&&<text x={left+w/2} y={116+i*66} textAnchor="middle" fill={j===0||j===4?'#fff9ee':ink}>{(100*c/d.n).toFixed(0)}%</text>}</g>;})}<text x="1080" y={119+i*66}>缺失 {d.missing}</text></g>;})}
 <text x="220" y="533">* T3已反向；条宽100%对应各题有效回答。</text>
 </svg>;}
function Geometry({mode}:{mode:string}){
 const original=mode==='original',g=D.geometry,w=g.model.weights,selected=g.selected;
 const sx=(x:number)=>345+x*67,sy=(y:number)=>278-y*67;
 const axis=(j:number,color:string)=>{const a=w[0]![j]!,b=w[1]![j]!;return <g><path d={`M${sx(-2.85*a)} ${sy(-2.85*b)}L${sx(2.85*a)} ${sy(2.85*b)}`} stroke={color} strokeWidth="3"/><text x={sx(2.85*a)+13} y={sy(2.85*b)-8} fill={color}>PC{j+1}</text></g>;};
 return <svg className="sam-chart sam-geometry" viewBox="0 0 1100 560" role="img" aria-label={`九点二维PCA概念图：${mode}，两轴等比例`}>
  {[-2,-1,0,1,2].map(v=><g key={v}><path d={`M${sx(v)} ${sy(-3)}V${sy(3)}M${sx(-3)} ${sy(v)}H${sx(3)}`} stroke={ink} opacity=".08"/><text x={sx(v)} y="518" textAnchor="middle">{original?v+10:v}</text><text x="121" y={sy(v)+8} textAnchor="end">{original?v+8:v}</text></g>)}
  <path d={`M${sx(-3)} ${sy(0)}H${sx(3)}M${sx(0)} ${sy(-3)}V${sy(3)}`} stroke={muted} fill="none"/>
  <text x="73" y="55">{original?'y（原值）':'y（中心化）'}</text><text x="345" y="557" textAnchor="middle">{original?'x（原值）':'x（中心化）'}</text>
  {!['original','centered'].includes(mode)&&axis(0,amber)}{mode==='both'&&axis(1,teal)}
  {['projection','loss'].includes(mode)&&g.points.map((p,i)=>mode==='loss'||i===selected?<g key={i}><path d={`M${sx(p[0]!)} ${sy(p[1]!)}L${sx(g.projection[i]![0]!)} ${sy(g.projection[i]![1]!)}`} stroke={teal} strokeWidth="2.5" strokeDasharray="6 5"/><circle cx={sx(g.projection[i]![0]!)} cy={sy(g.projection[i]![1]!)} r="5" fill={amber}/></g>:null)}
  {g.points.map((p,i)=><circle key={i} cx={sx(p[0]!)} cy={sy(p[1]!)} r={i===selected&&mode==='projection'?8:6} fill={i===selected&&mode==='projection'?teal:ink}/>)}
  <text x="687" y="102" className="sam-geo-kicker">{original?'同一组九个点':mode==='centered'?'中心移到(0,0)':mode==='both'?'两个正交方向':mode==='loss'?'舍弃的第二方向':mode==='projection'?'G09的第一得分':'第一方向系数'}</text>
  <text x="687" y="174" className="sam-geo-number">{original?'中心 (10,8)':mode==='centered'?'距离保留':mode==='both'?'w₁ᵀw₂ = 0':mode==='loss'?'压缩 ≠ 无损':mode==='projection'?g.model.scores[selected]![0]!.toFixed(3):`(${w[0]![0]!.toFixed(3)}, ${w[1]![0]!.toFixed(3)})`}</text>
  <text x="687" y="246">{mode==='projection'?'观测点：(2.000, 1.800)':mode==='both'?'得分是新坐标。':mode==='loss'?'虚线：观测点到投影点。':original?'位置与方向先分开看。':mode==='centered'?'中心化不改变两点距离。':'方向单位长度为1。'}</text>
  <text x="687" y="302">{mode==='projection'?`投影：(${g.projection[selected]![0]!.toFixed(3)}, ${g.projection[selected]![1]!.toFixed(3)})`:mode==='both'?'保留两维，可还原二维点。':mode==='loss'?'被舍弃的变化仍然存在。':'两轴使用同一单位。'}</text>
  <text x="687" y="358">{mode==='projection'?'得分：沿第一轴的有符号长度。':'横纵比例一致，不拉伸方向。'}</text>
 </svg>;
}
function Screening(){return <div className="sam-screening"><div><span>01</span><h2>过去30天，是否完成购买？</h2><p>没有 → 不进入本例调查范围</p></div><div><span>02</span><h2>定位最近一次购买</h2><p>保留同一个事件，避免跨次回忆</p></div><div><span>03</span><h2>本次是否咨询或求助？</h2><p>有经历 → 回答；未经历 → 跳转或不适用</p></div></div>;}
function Anchors(){return <div className="sam-anchors"><div className="sam-anchor-line">{['很不同意','不同意','既不同意\n也不反对','同意','很同意'].map((t,i)=><div key={t}><b>{i+1}</b><p>{t}</p></div>)}</div><p className="sam-anchor-note">无法回忆 / 不适用：分别记录，计分时保留NA。</p></div>;}
function Form(){return <div className="sam-complete-form"><aside><span>筛选与共同选项</span><p>过去30天有购买？<br/>最近一次有咨询或求助？</p><small>任一为否 → 结束本例问卷</small><ol>{['很不同意','不同意','既不同意也不反对','同意','很同意'].map(t=><li key={t}>{t}</li>)}</ol><small>无法回忆 / 不适用 / 未作答：<br/>分别记录，计分保留NA。</small></aside><div className="sam-form-items"><span>请回想最近一次购买中的咨询或求助经历，逐题选择回答。</span>{D.survey.items.map(item=><div key={item[0]}><b>{item[0]}</b><p>{item[2]}</p><span>1　2　3　4　5</span></div>)}</div></div>;}
function Receipt(){return <div className="sam-receipt"><section><span>一次购买的记录</span><h2>180 <small>元</small></h2><p>付款金额 · 小票记录</p><h2>8 <small>分钟</small></h2><p>等待时间 · 时间记录</p></section><aside><span>顾客的回答</span><blockquote>“钱已经付了，<br/>我还是不清楚<br/>哪些费用包含在内。”</blockquote><p>费用理解，需要另外了解。</p></aside></div>;}
function FirstQuestion(){return <div className="sam-first-question"><blockquote>本次结账前，<br/>您是否清楚要支付哪些费用？</blockquote><div>{['清楚','不清楚','无法回忆','没有这项经历'].map(t=><span key={t}>{t}</span>)}</div><p>每个回答都保留它自己的含义。</p></div>;}
function RandomDraw(){return <svg className="sam-chart" viewBox="0 0 1100 560" role="img" aria-label="八人名单简单随机不放回抽三人，每人入样概率3/8；02、05、07仅是一个可能结果">
 <text x="28" y="58" className="sam-axis-title">名单内8人 · 简单随机 · 不放回</text>
 {Array.from({length:8},(_,i)=>{const selected=[1,4,6].includes(i),x=78+i*133;return <g key={i}><circle cx={x} cy="188" r="38" fill={selected?teal:'none'} stroke={selected?teal:muted} strokeWidth="2"/><text x={x} y="198" textAnchor="middle" fill={selected?'#fff':ink}>{String(i+1).padStart(2,'0')}</text><text x={x} y="264" textAnchor="middle">3/8</text></g>;})}
 <path d="M28 314H1070" stroke={ink} opacity=".25"/>
 <text x="28" y="389" className="sam-geo-number">一种可能结果：02、05、07</text><text x="28" y="471">每人的入样概率相同；一次结果不必长得均匀。</text>
 </svg>;}
function FieldFlow(){return <div className="sam-field-flow"><p>抽样框：过去30天去重购买者联系名单；最近一次咨询资格待筛选。</p><div className="sam-flow"><div><span>简单随机邀请</span><b>400</b><p>名单内的顾客</p></div><i>→</i><div><span>回收</span><b>252</b><p>邀请回收比例63%</p></div><i>→</i><div><span>符合经历筛选</span><b>240</b><p>12份不符合资格</p></div></div><p>148人未回应，资格未知；此流程不是后续模拟答卷的真实来源。</p></div>;}
function ScorePractice({transfer=false}:{transfer?:boolean}){return <div className="sam-score-practice"><span>{transfer?'S031 · 原始答卷':'S017 · 响应领域原始回答'}</span>{transfer?<><p><b>R</b>4　2　1</p><p><b>T</b>5　5　NA</p><small>T3方向相反；NA保持缺失。</small></>:<><p>3　NA　2</p><small>先数有效题，再决定是否计分与使用哪个分母。</small></>}</div>;}
function DesignCase(){return <div className="sam-design-case"><span>一份待检查的调查提案</span><blockquote>公开发二维码，谁都可以填。<br/>采用工作投入量表，评价费用理解。<br/>再问：“员工及时且清楚地解释了费用。”</blockquote><p>目标顾客、选择程序、测量工具与题意，彼此相符吗？</p></div>;}
function Reliability(){return <svg className="sam-chart" viewBox="0 0 1100 560" role="img" aria-label="目标10，三个重复读数12.9、13、13.1，集中却偏离目标的示意">
 {[8,9,10,11,12,13,14].map(v=><g key={v}><path d={`M${140+(v-8)*130} 278v14`} stroke={muted}/><text x={140+(v-8)*130} y="332" textAnchor="middle">{v}</text></g>)}
 <path d="M140 278H920" stroke={muted}/><path d="M400 145V278" stroke={teal} strokeWidth="3" strokeDasharray="6 5"/><text x="400" y="112" textAnchor="middle" fill={teal}>目标 10</text>
 {[12.9,13,13.1].map((v,i)=><g key={v}><circle cx={140+(v-8)*130} cy={175+i*42} r="9" fill={amber}/><text x={140+(v-8)*130+26} y={183+i*42} fill={amber}>{v.toFixed(1)}</text></g>)}
 <text x="450" y="444">读数很集中，仍然偏离目标。</text><text x="450" y="502">可靠与有效，需要不同的证据。</text>
 </svg>;}
function Evidence({id,focusRows,focusColumns,compact=false}:{id:string;focusRows?:number[];focusColumns?:number[];compact?:boolean}):ReactNode{
 if(tables[id])return <DataTable id={id} focusRows={focusRows} focusColumns={focusColumns}/>;
 if(hasFactorEvidence(id))return <FactorEvidence id={id}/>;
 if(plots[id])return <ChartView chart={plots[id]} compact={compact}/>;
 if(measurementWording[id])return <Comparison id={id}/>;
 if(id.startsWith('geometry-'))return <Geometry mode={id.slice(9)}/>;
 switch(id){
  case 'survey-profiles':return <Profiles/>;
  case 'survey-correlation':return <Correlation survey/>;
  case 'wholesale-correlation':return <Correlation/>;
  case 'survey-distribution':return <Distribution/>;
  case 'survey-screening':return <Screening/>;
  case 'survey-anchors':return <Anchors/>;
  case 'survey-form':return <Form/>;
  case 'survey-receipt':return <Receipt/>;
  case 'survey-first-question':return <FirstQuestion/>;
  case 'survey-random-draw':return <RandomDraw/>;
  case 'survey-field-flow':return <FieldFlow/>;
  case 'survey-score-practice':return <ScorePractice/>;
  case 'survey-score-transfer':return <ScorePractice transfer/>;
  case 'survey-design-case':return <DesignCase/>;
  case 'survey-reflective':return <div className="sam-two-ideas"><div><span>共同表现</span><h2>候选构念 → 题项</h2><p>响应体验 → 回应、解决、可获得</p><small>题项关系是测量模型的线索。</small></div><div><span>共同组成</span><h2>指标 → 汇总指数</h2><p>库存、资金、物流 → 能力指数</p><small>不同组成部分不必高度相关。</small></div></div>;
  case 'survey-order':return <Rows rows={[["顺序A","先回忆具体投诉 → 再评价总体满意"],["顺序B","先评价总体满意 → 再询问具体经历"],["核查","两种顺序是否改变了回答时想到的情境？"]]}/>;
  case 'survey-cognitive':return <div className="sam-dialogue"><span>认知访谈对话示意</span><p><b>问</b>你想到哪次购买？</p><p><b>答</b>上周那次。</p><p><b>问</b>“很快”指什么？</p><p><b>答</b>马上有人回应，但过了很久才解决。</p><strong>回应，与解决，不能含混在同一判断中。</strong></div>;
  case 'survey-flow':return <div className="sam-flow"><div><span>邀请</span><b>400</b><p>目标联系对象</p></div><i>→</i><div><span>回收</span><b>252</b><p>回收比例63%</p></div><i>→</i><div><span>符合筛选</span><b>240</b><p>进入分析范围</p></div></div>;
  case 'survey-quality':return <div className="sam-quality"><div><span>S009 · 六个原始回答</span><p>3　3　3　3　3　3</p><strong>13 <small>秒</small></strong></div><aside><h2>线索，不是结论</h2><p>快速作答，或连续同一选项。</p><p>也可能表达一致的中立判断。</p><p>本例保留，核查过程须记录。</p></aside></div>;
  case 'survey-reliability-validity':return <Reliability/>;
  case 'survey-analysis-map':return <Rows rows={[["测量","原始题项 → 反向与NA规则 → 两个候选领域分数"],["结果","复购意向，与之后交易中的复购，分别记录"],["解释","观察性关系要核查时点、测量误差与共同来源"]]}/>;
  case 'survey-check':return <div className="sam-check"><span>待核查题项</span><blockquote>“你一直很满意我们的<br/>高效优质服务吗？”</blockquote><p>这道题的对象、范围与回答方向清楚吗？</p></div>;
  case 'survey-feedback':return <div className="sam-feedback"><span>一种修订</span><blockquote>就最近一次购买而言，<br/>我提出问题后，<br/>很快得到了回应。</blockquote><p>固定事件 · 去掉预设评价 · 只问一个方面</p></div>;
  case 'wholesale-score-example':return <div className="sam-score-example"><ChartView chart={plots['wholesale-scores']!} selected/><aside><span>原文件第1行</span><h2>W001</h2><p>PC1　{D.wholesale.model.scores[0]![0]!.toFixed(3)}</p><p>PC2　{D.wholesale.model.scores[0]![1]!.toFixed(3)}</p><small>使用全部六列计算；<br/>位置不代表价值等级。</small></aside></div>;
  case 'wholesale-regions':return <div className="sam-regions">{[1,2,3].map(n=><ChartView key={n} chart={plots[`wholesale-region-${n}`]!} compact/>)}</div>;
  case 'wholesale-feedback':return <Rows rows={[["方差","71.3%属于标准化对数采购；没有利润列参与"],["业务","PC1是采购组合的位置；客户价值需业务目标与成本证据"],["测量","PCA不验证构念；内容与因子结构仍需相应证据"]]}/>;
  default:throw new Error(`Missing measurement evidence: ${id}`);
 }
}
function Formula({value}:{value:string}){return <div className="sam-formula" dangerouslySetInnerHTML={{__html:katex.renderToString(value,{displayMode:true,throwOnError:true})}}/>;}
export function measurementPageSpec(lesson:number,page:number):MeasurementPage|undefined{return measurementLessons[lesson-6]?.[page-1];}
export function MeasurementPageView({lesson,page}:{lesson:number;page:number}){
 const p=measurementPageSpec(lesson,page)!;
 const image=p.image?`/course-assets/statistical-analysis/images/${p.image}.png`:undefined;
 if(page===1)return <><img className="sa-art sa-art--bleed" src={image} alt="AI生成教学情境配图"/><div className="sa-cover-shade"/><div className="sa-cover-copy"><span>STATISTICAL ANALYSIS METHODS</span><h1>{p.title}</h1><p>{p.lead}</p><div>{String(lesson).padStart(2,'0')}<i/>{p.caption}</div></div></>;
 return <div className={`sam-page ${lesson===6?'sam-page--survey':''} ${lesson>=8?'sam-page--factors':''} ${p.visual?'sam-page--evidence':'sam-page--concept'} ${p.formula?'sam-page--formula':''} ${image?'sam-page--art':''}`}>
  {image&&<img className={`sam-art ${p.visual?'sam-art--accent':''}`} src={image} alt="AI生成教学情境配图"/>}
  <div className="sam-content">
   {p.formula&&<Formula value={p.formula}/>}
   {p.second?<div className="sam-pair"><Evidence id={p.visual!} compact/><Evidence id={p.second} compact/></div>:p.visual?<div className={p.text.length?'sam-with-aside':'sam-figure'}><Evidence id={p.visual} focusRows={p.focusRows} focusColumns={p.focusColumns}/>{p.text.length>0&&<aside className="sam-aside">{p.text.map(t=><p key={t}>{t}</p>)}</aside>}</div>:<div className="sam-statements">{p.text.map((t,i)=><p key={t}><span>{String(i+1).padStart(2,'0')}</span>{t}</p>)}</div>}
  </div><p className="sa-caption">{p.caption}</p>
 </div>;
}
