import type { CSSProperties } from 'react';
import { PORT_EXPANSION_SOURCES, PORT_ADVANCED_ILLUSTRATIONS, portOpeningFilm, expansionTotal, expansionVisiblePoints, type PortElevenIllustration, type ExpansionPresentation, type PortExpansionPage } from '@edu/course-content';

const teal='#266f78',gold='#bb7b41',muted='#71887c';
function Label({x,y,w=240,text,color='#234d57',size=27}:{x:number;y:number;w?:number;text:string;color?:string;size?:number}){
  return <foreignObject x={x} y={y} width={w} height={100}><div style={{fontSize:size,color,lineHeight:1.45,textAlign:'center',fontFamily:'Microsoft YaHei, sans-serif'}}>{text}</div></foreignObject>;
}
function Rows({page,progress}:{page:PortExpansionPage;progress:number}){
  const rows=page.rows??[], shown=Math.floor(progress*Math.max(1,rows.length-1)+1e-6);
  return <div className="ps-records"><table><thead><tr>{rows[0]?.map((s,i)=><th key={i}>{s}</th>)}</tr></thead><tbody>{rows.slice(1,shown+1).map((row,i)=><tr key={i}>{row.map((s,j)=><td key={j}>{s}</td>)}</tr>)}</tbody></table></div>;
}
function Timeline({page,progress}:{page:PortExpansionPage;progress:number}){
  const values=page.values??[], labels=page.labels??[], min=Math.min(...values),max=Math.max(...values),shown=Math.ceil(progress*values.length);
  return <svg viewBox="0 0 1440 510" className="ps-graphic" role="img" aria-label="事件时间轴"><path d="M70 245H1370" stroke="#aec2b4" strokeWidth="8"/>{values.slice(0,shown).map((v,i)=>{const x=70+(v-min)/(max-min||1)*1290,above=i%2===0;return <g key={i}><path d={`M${x} 245V${above?165:308}`} stroke={i===values.length-1?gold:teal} strokeWidth="3"/><circle cx={x} cy="245" r="12" fill={i===values.length-1?gold:teal}/><Label x={Math.min(1190,Math.max(0,x-115))} y={above?55:325} w={230} text={labels[i]??''}/><text x={x} y={above?205:290} textAnchor="middle" fontSize="31" fill={teal}>{Number(v.toFixed(1))}</text></g>;})}<text x="70" y="475" fontSize="23" fill={muted}>{page.unit??'模拟分钟'} · 事件定义与观察端点分别核对</text></svg>;
}
function Bars({page,progress,unfinished=false}:{page:PortExpansionPage;progress:number;unfinished?:boolean}){
  const values=page.values??[],labels=page.labels??[],max=(page.unit??'').includes('%')?100:Math.max(1,...values)*1.12;
  const h=Math.min(78,360/Math.max(1,values.length)),shown=Math.ceil(progress*values.length);
  return <svg viewBox="0 0 1440 510" className="ps-graphic" role="img" aria-label={unfinished?'完成与未完成挂靠记录':'同口径数量比较'}><text x="330" y="35" fontSize="23" fill={muted}>单位：{page.unit}</text>{values.slice(0,shown).map((v,i)=>{const y=70+i*h,open=unfinished&&i>=(page.focus??values.length),w=v/max*940;return <g key={i}><text x="300" y={y+34} textAnchor="end" fontSize="27" fill="#254f57">{labels[i]}</text><rect x="330" y={y} width="940" height="46" fill="#e2e9db"/><rect x="330" y={y} width={Math.max(0,w)} height="46" fill={open?'none':i%2?gold:teal} stroke={open?gold:'none'} strokeWidth="3" strokeDasharray={open?'9 6':undefined}/><text x={Math.min(1300,345+w)} y={y+34} fontSize="28" fill={open?gold:teal}>{Number(v.toFixed(1))}{open?' +':''}</text></g>;})}<path d="M330 450H1270" stroke="#94ad9c" strokeWidth="2"/>{[0,.25,.5,.75,1].map(t=><text key={t} x={330+t*940} y="486" fontSize="21" textAnchor="middle" fill={muted}>{Number((max*t).toFixed(1))}</text>)}{unfinished&&<text x="80" y="435" fontSize="23" fill={gold}>空心柱：仍未完成，当前值为已历时间下界</text>}</svg>;
}
function Chain({page,progress}:{page:PortExpansionPage;progress:number}){
  const labels=page.labels??[],n=labels.length,shown=Math.ceil(progress*n);
  return <div className="ps-chain"><svg viewBox="0 0 1440 320" className="ps-graphic" role="img" aria-label="资源和业务接续关系">{labels.slice(0,shown).map((s,i)=>{const x=40+i*(1380/n),w=1280/n;return <g key={i}>{i>0&&<path d={`M${x-75} 150H${x-15}l-12-10m12 10-12 10`} stroke={gold} strokeWidth="4" fill="none"/>}<rect x={x} y="65" width={w} height="190" rx="5" fill={i%2?'#e8dec6':'#dce9e1'}/><text x={x+24} y="117" fontSize="38" fill={i%2?gold:teal}>{String(i+1).padStart(2,'0')}</text><Label x={x+12} y={158} w={w-24} text={s}/></g>;})}</svg>{progress>.5&&<div className="ps-facts">{page.rows?.map((r,i)=><p key={i}><strong>{r[0]}</strong>{r.slice(1).join(' · ')}</p>)}</div>}</div>;
}
function Bowtie({page,progress}:{page:PortExpansionPage;progress:number}){
  const l=page.labels??[],shown=Math.ceil(progress*5);
  return <div className="ps-bowtie"><svg viewBox="0 0 1440 350" className="ps-graphic" role="img" aria-label="威胁、顶事件、后果与屏障">{[0,1].map(i=><g key={i}><path d={`M310 ${75+i*185}L720 165L1135 ${75+i*185}`} stroke="#9db6a7" strokeWidth="5" fill="none"/>{shown>i&&<><rect x="15" y={20+i*185} width="295" height="110" rx="8" fill="#e3eade"/><Label x={28} y={43+i*185} w={268} text={l[i]??''}/></>}{shown>i+3&&<><rect x="1135" y={20+i*185} width="290" height="110" rx="8" fill="#eee1c7"/><Label x={1146} y={43+i*185} w={268} text={l[i+3]??''}/></>}</g>)}{shown>2&&<><rect x="578" y="103" width="285" height="133" rx="13" fill="#255966"/><Label x={595} y={143} w={250} text={l[2]??''} color="#fff6df"/></>}{progress>.4&&<><path d="M467 65V135M467 210V280" stroke={teal} strokeWidth="13"/><path d="M974 65V135M974 210V280" stroke={gold} strokeWidth="13"/></>}<text x="430" y="326" fontSize="23" fill={teal}>预防屏障</text><text x="937" y="326" fontSize="23" fill={gold}>减缓屏障</text></svg>{progress>.5&&<div className="ps-facts">{page.rows?.map((row,i)=><p key={i}><strong>{row[0]}</strong>{row.slice(1).join(' · ')}</p>)}</div>}</div>;
}
function Dependency({page,progress}:{page:PortExpansionPage;progress:number}){
  const l=page.labels??[],shown=Math.ceil(progress*5);
  return <svg viewBox="0 0 1440 510" className="ps-graphic" role="img" aria-label="共同来源和下游依赖"><text x="110" y="60" fontSize="24" fill={muted}>共享来源</text><text x="620" y="60" fontSize="24" fill={muted}>下游确认</text><text x="1170" y="60" fontSize="24" fill={muted}>传播后果</text>{[0,1,2].map(i=><g key={i}><path d={`M330 250L585 ${115+i*135}M875 ${115+i*135}L1125 250`} stroke="#a4baaa" strokeWidth="4" fill="none"/>{shown>i+1&&<><rect x="585" y={75+i*135} width="290" height="85" fill="#dfE9dc" rx="5"/><Label x={605} y={96+i*135} w={250} text={l[i+1]??''}/></>}</g>)}{shown>0&&<><rect x="20" y="180" width="310" height="145" rx="7" fill="#265966"/><Label x={45} y={225} w={260} text={l[0]??''} color="#fff5dc"/></>}{shown>4&&<><rect x="1125" y="180" width="295" height="145" rx="7" fill="#e6cfac"/><Label x={1140} y={225} w={265} text={l[4]??''}/></>}<text x="250" y="490" fontSize="25" fill={gold}>增加确认数量，并不会自动产生新的独立证据</text></svg>;
}
function Hero({page,progress}:{page:PortExpansionPage;progress:number}){
  return <div className="ps-case-board"><div className="ps-case-number">{page.lesson===11?'2024 / SG':'2015 / TJ'}</div><svg viewBox="0 0 1000 320" aria-label="港口机制示意" role="img"><path d="M0 250H1000V320H0" fill="#c5dcd5"/><path d="M90 255H490l-60 60H150Z" fill="#225967"/>{[130,220,310].map(x=><g key={x}><rect x={x} y="190" width="82" height="55" fill="#bd955a"/><path d={`M${x+110} 240V50H${x+240}M${x+110} 50L${x+35} 85M${x+35} 85V170`} stroke="#5c8b88" strokeWidth="7" fill="none"/></g>)}<path d="M550 250H960" stroke="#8ba99b" strokeWidth="16"/>{[580,700,820].map(x=><rect key={x} x={x} y="185" width="105" height="50" fill="#729383"/>)}</svg><div className="ps-case-tags">{page.labels?.slice(0,Math.ceil(progress*(page.labels?.length??0))).map((s,i)=><span key={i}>{s}</span>)}</div><p>机制示意 · 不按现场比例 · 历史材料见来源</p></div>;
}
function Lab({page,progress}:{page:PortExpansionPage;progress:number}){
  return <div className="ps-lab-board"><div className="ps-lab-id">{page.lesson}<span>CLASSROOM<br/>EXPERIMENT</span></div><div className="ps-lab-brief">{page.rows?.slice(0,Math.ceil(progress*(page.rows?.length??0))).map((row,i)=><p key={i}><b>{row[0]}</b><span>{row.slice(1).join(' · ')}</span></p>)}<a href={`/port-class-lab.html?lesson=${page.lesson}`} target="_blank" rel="noreferrer">打开第{page.lesson}讲专用实验 ↗</a></div></div>;
}
export function PortAdvancedComposition({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
  const source=PORT_EXPANSION_SOURCES[page.source],points=expansionVisiblePoints(page,state.progress);
  const shared={page,progress:state.progress};
  let figure;
  if(page.visual==='hero')figure=<Hero {...shared}/>;
  else if(page.visual==='timeline'||page.visual==='recovery')figure=<Timeline {...shared}/>;
  else if(page.visual==='bars'||page.visual==='distribution')figure=<Bars {...shared} unfinished={page.visual==='distribution'}/>;
  else if(page.visual==='bowtie')figure=<Bowtie {...shared}/>;
  else if(page.visual==='dependency')figure=<Dependency {...shared}/>;
  else if(page.visual==='lab')figure=<Lab {...shared}/>;
  else if(page.visual==='chain'||page.visual==='incident')figure=<Chain {...shared}/>;
  else figure=<Rows {...shared}/>;
  const illustration=PORT_ADVANCED_ILLUSTRATIONS[page.slideKey];
  const film=portOpeningFilm(page.slideKey);
  if(film)return <article className="port-expansion-slide ps-advanced ps-film-cover" aria-label={`第${page.lesson}讲第1页`}>
    <img className="ps-cover-image" src={illustration!.src} alt={illustration!.alt}/><div className="ps-cover-shade"/>
    <header className="ps-heading"><div className="ps-eyebrow"><span>PORT STUDIES / {page.lesson}</span><span>{page.lessonTitle}</span></div><p className="ps-film-duration">开场短片 · 03:00{page.lesson===12?' · 安全发展与职业责任':''}</p><h1>{page.title}</h1><p>{page.lead}</p></header>
    <div className="ps-cover-bottom"><strong>{film.title}</strong><p>{page.lesson===12?'进度与核验冲突时，哪项证据能改变你的决定？':'带着一个主假设观看：你会先核查哪个环节？'}</p><div className="ps-cover-tags">{page.labels?.slice(0,Math.ceil(state.progress*(page.labels?.length??0))).map(s=><span key={s}>{s}</span>)}</div></div>
    <footer><span>{illustration!.caption} · {page.lesson===12?'价值依据：':'历史材料：'}<a href={source.url} target="_blank" rel="noreferrer">{page.lesson===12?'安全生产法第三条（2021年修正文本）':'MPA · 2024年5月30日'}</a></span><span>港口管理概论　01 / 32</span></footer>
  </article>;
  if(illustration?.mode==='panorama')figure=<div className="ps-annotated-scene"><Scene illustration={illustration} progress={state.progress}/><div className="ps-scene-chain">{page.labels?.slice(0,Math.ceil(state.progress*(page.labels?.length??0))).map((s,i)=><span key={s}><b>{String(i+1).padStart(2,'0')}</b>{s}</span>)}</div>{state.progress>.5&&<div className="ps-scene-facts">{page.rows?.map((r,i)=><p key={i}><b>{r[0]}</b>{r.slice(1).join(' · ')}</p>)}</div>}</div>;
  else if(illustration)figure=<div className={`ps-illustrated ps-illustrated--${illustration.mode}`}><Scene illustration={illustration} progress={state.progress}/><div className="ps-illustrated-data">{figure}</div></div>;
  return <article className={`port-expansion-slide ps-advanced${state.revealed?' ps-answered':''}${illustration?' ps-has-illustration':''}`} aria-label={`第${page.lesson}讲第${page.localPage}页`} style={{'--ps-accent':page.lesson===11?teal:gold} as CSSProperties}>
    <header className="ps-heading"><div className="ps-eyebrow"><span>PORT STUDIES / {page.lesson}</span><span>{page.section}</span></div><h1>{page.title}</h1><p>{page.lead}</p></header>
    <div className="ps-body">{figure}</div>
    {!state.revealed&&<div className="ps-observations">{points.map((point,i)=><p key={point}><b>{String(i+1).padStart(2,'0')}</b>{point}</p>)}</div>}
    {state.revealed&&page.reveal&&<div className="ps-answer"><strong>参考解析</strong><p>{page.reveal}</p></div>}
    <footer><span>{page.narrative.publicLabel} · <a href={page.source==='ps-lab'?`/port-class-lab.html?lesson=${page.lesson}`:source.url} target="_blank" rel="noreferrer">{source.label}</a></span><span>港口管理概论　{String(page.localPage).padStart(2,'0')} / {expansionTotal(page.lesson)}</span></footer>
  </article>;
}
function Scene({illustration,progress}:{illustration:PortElevenIllustration;progress:number}){
 return <figure className="ps-scene"><img src={illustration.src} alt={illustration.alt}/>{illustration.callouts?.slice(0,Math.ceil(progress*illustration.callouts.length)).map((c,i)=><span className="ps-scene-callout" key={c.text} style={{left:c.x+'%',top:c.y+'%'}}><b>{i+1}</b>{c.text}</span>)}<figcaption>{illustration.caption}</figcaption></figure>;
}
