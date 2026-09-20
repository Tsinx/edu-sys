import {PortLessonSixFilm} from './PortLessonSixFilm';
import {getLessonSixGeography,places,gateways} from './lesson-six-geography';
import {PortLessonSixGlobe} from './PortLessonSixGlobe';
import type { ReactNode } from 'react';
import { PORT_LESSON_SIX_SOURCES, lessonSixVisiblePoints, gateSchedule, LESSON_SIX_ROUTES, type LessonSixPresentation, type PortLessonSixPage } from '@edu/course-content';

const teal='#278b98',gold='#a5793e',lightTeal='#80c7ce';
function Lines({text,x,y,width=18,size=28,color='currentColor',line=42}:{text:string;x:number;y:number;width?:number;size?:number;color?:string;line?:number}){
  const chars=Array.from(text),lines:string[]=[];for(let i=0;i<chars.length;i+=width)lines.push(chars.slice(i,i+width).join(''));
  return <text x={x} y={y} fill={color} fontSize={size}>{lines.map((s,i)=><tspan key={i} x={x} dy={i?line:0}>{s}</tspan>)}</text>;
}
function Notes({points,x=1000,y=55,gap=138,size=28}:{points:readonly string[];x?:number;y?:number;gap?:number;size?:number}){return <>{points.map((t,i)=><g key={t}><text x={x} y={y+i*gap} fill={gold} fontSize="19">0{i+1}</text><Lines text={t} x={x} y={y+40+i*gap} width={Math.floor((1430-x)/size)} size={size} line={size*1.5}/></g>)}</>;}
function Box({x,y,name,color=teal,w=145}:{x:number;y:number;name?:string;color?:string;w?:number}){return <g><rect x={x} y={y} width={w} height="76" rx="3" fill={color}/>{[1,2,3,4].map(i=><path key={i} d={`M${x+i*w/5} ${y+10}v56`} stroke="white" opacity=".18" strokeWidth="2"/>)}{name&&<text x={x+w/2} y={y+49} textAnchor="middle" fill="#fff" fontSize="25">{name}</text>}</g>;}
function Arrow({x1,y1,x2,y2,color=teal}:{x1:number;y1:number;x2:number;y2:number;color?:string}){const a=Math.atan2(y2-y1,x2-x1);return <g fill="none" stroke={color} strokeWidth="5"><path d={`M${x1} ${y1}L${x2} ${y2}`}/><path d={`M${x2-17*Math.cos(a-.45)} ${y2-17*Math.sin(a-.45)}L${x2} ${y2}L${x2-17*Math.cos(a+.45)} ${y2-17*Math.sin(a+.45)}`}/></g>;}
function Diagram({label,children}:{label:string;children:ReactNode}){return <svg viewBox="0 0 1440 535" role="img" aria-label={label}>{children}</svg>;}
function FlatGeoMap({page,state,points}:{page:PortLessonSixPage;state:LessonSixPresentation;points:readonly string[]}){
  const n=page.localPage;
  const {ids,links,bounds}=getLessonSixGeography(n,state.option);
  const [west,east,south,north]=bounds as [number,number,number,number],sx=940/(east-west),sy=515/(north-south);
  const mx=(lon:number)=>(lon-west)*sx,my=(lat:number)=>(north-lat)*sy;
  const regional=n>=31&&n<=37;
  const activeIds=state.progress>=.5?ids:state.progress>=.25?ids.filter(id=>gateways.has(id)):[],showLinks=state.progress>=.75;
  const water=[25,27,31,35].includes(n)||(n===33&&state.option===0);
  return <Diagram label="地理底图上的港口、内陆节点和运输联系示意">
    <defs><clipPath id="l6-map-clip"><rect width="940" height="515" rx="3"/></clipPath></defs>
    <g clipPath="url(#l6-map-clip)"><rect width="940" height="515" fill="#102d3b"/>
      <image href="/globe-assets/earth-bmng-200412-8192.webp" x={mx(-180)} y={my(90)} width={360*sx} height={180*sy} preserveAspectRatio="none" opacity=".58"/>
      {[100,110,120].filter(lon=>lon>west&&lon<east).map(lon=><g key={lon}><path d={`M${mx(lon)} 0V515`} stroke="#cfdfda" opacity=".1"/><text x={mx(lon)+7} y="28" fill="#b8ccc9" fontSize="16">{lon}°E</text></g>)}
      {showLinks&&links.map((ids,i)=>{const waterLink=water||n===34&&i===0;return <polyline key={i} points={ids.map(id=>`${mx(places[id]!.lon)},${my(places[id]!.lat)}`).join(' ')} stroke={waterLink?lightTeal:'#edc482'} strokeWidth="4" strokeDasharray={waterLink?'':'10 6'} fill="none"/>;})}
      {activeIds.map((id,i)=>{const a=places[id]!;const quiz=n===38&&!state.revealed;const dx=a.dx??15,dy=a.dy??-16;return <g key={id} transform={`translate(${mx(a.lon)},${my(a.lat)})`}><circle r="8" fill={id==='chongqing'?'#edc482':'#89d1d8'} stroke="#0c2531" strokeWidth="2"/><text x={dx} y={dy} fill="#f9f5e8" stroke="#102332" strokeWidth="5" paintOrder="stroke" fontSize={regional?27:24}>{quiz?(i===0?'①':i===1?'②':'③'):a.name}</text></g>;})}
      <text x="22" y="487" fill="#e0dfce" fontSize="18">{n===34?'青线：水运联系 · 金线：陆向联系 · 路线示意':'节点位置为近似定位 · 连线为联系示意'}</text>
    </g>
    <Notes points={points} gap={n===26?92:141} size={n===26?24:27}/>
  </Diagram>;
}
function Stack({n,count,option,points}:{n:number;count:number;option:number;points:readonly string[]}){
  const moved=n===8&&count>=2,lowerGone=n===8&&option===0&&count>=3;
  return <Diagram label="堆场箱位与遮挡箱搬移示意">
    <path d="M35 415H930M40 495H930" stroke="#849f9e" strokeWidth="3"/><text x="65" y="476" fill={gold} fontSize="27">取箱通道</text>
    {[0,1,2,3].map(i=><g key={i}><rect x={60+i*216} y="315" width="165" height="92" fill="none" stroke="#9baea8" strokeDasharray="5 6"/><text x={105+i*216} y="296" fill="currentColor" fontSize="22">位{i+1}</text></g>)}
    {count>0&&<><Box x={70} y={323} name="I-03"/><Box x={502} y={323} name="E-01" color={gold}/>{!lowerGone&&<Box x={286} y={323} name="I-01"/>}</>}
    {count>0&&!(moved&&option===1)&&<Box x={moved?718:286} y={moved?323:241} name="I-02" color={gold}/>}
    {moved&&option===0&&<Arrow x1={365} y1={211} x2={789} y2={211} color={gold}/>}
    {n===8&&count>=3&&<text x="286" y="170" fill={teal} fontSize="32">{option===0?'I-01已提取 · 额外搬移1次':'I-02已提取 · 无需额外搬移'}</text>}
    {n===8&&<text x="50" y="72" fill={gold} fontSize="30">{option===0?'先提下层I-01':'先提上层I-02'}</text>}
    <Notes points={points}/>
  </Diagram>;
}
function Queue({count,option,points}:{count:number;option:number;points:readonly string[]}){
  const rows=gateSchedule(option===0?[0,2,4,6,8,10]:[0,0,0,0,0,0]);
  return <Diagram label="六辆车的到达等待与服务时间带">
    {[0,2,4,6,8,10,12].map(t=><g key={t}><text x={110+t*61} y="52" fontSize="22" fill="currentColor">{t}</text><path d={`M${120+t*61} 75V458`} stroke="#c1cdc4"/></g>)}
    <text x="795" y="490" fontSize="22" fill="currentColor">分钟 →</text>
    {rows.slice(0,count*2).map((r,i)=><g key={i}><text x="20" y={116+i*59} fontSize="24" fill="currentColor">车{i+1}</text><rect x={120+r.arrival*61} y={91+i*59} width={r.wait*61} height="31" fill={gold} opacity=".36"/><rect x={120+r.start*61} y={91+i*59} width="122" height="31" fill={teal}/><circle cx={120+r.arrival*61} cy={106+i*59} r="5" fill={gold}/></g>)}
    <rect x="150" y="495" width="28" height="15" fill={gold} opacity=".4"/><text x="195" y="510" fontSize="23" fill="currentColor">等待</text><rect x="315" y="495" width="28" height="15" fill={teal}/><text x="360" y="510" fontSize="23" fill="currentColor">服务</text>
    <Notes points={points}/>
  </Diagram>;
}
function DiagramContent({page,state,points}:{page:PortLessonSixPage;state:LessonSixPresentation;points:readonly string[]}){
  const n=page.localPage,c=points.length,option=state.option;
  if(page.visual==='map')return <PortLessonSixGlobe page={page} state={state} fallback={<FlatGeoMap page={page} state={state} points={points}/>}><Diagram label="港口与腹地观察"><Notes points={points} gap={n===26?92:141} size={n===26?24:27}/></Diagram></PortLessonSixGlobe>;
  if(page.visual==='stack')return <Stack n={n} count={c} option={option} points={points}/>;
  if(page.visual==='queue')return <Queue count={c} option={option} points={points}/>;
  if(page.visual==='scene')return <div className="l6-points">{points.map((point,i)=><p key={point}><span>0{i+1}</span>{point}</p>)}</div>;
  if(n===6)return <Diagram label="场内运输与外集卡在堆场交接">
    <path d="M30 350H435" stroke="#88bcc2" strokeWidth="5"/><path d="M65 263H340L301 327H105Z" fill={teal}/><text x="137" y="243" fill="currentColor" fontSize="30">船岸作业</text>
    <path d="M510 365H935" stroke="#9aacaa" strokeWidth="4"/><text x="612" y="412" fill="currentColor" fontSize="30">堆场交接</text><Box x={558} y={279} name="I-01"/><Box x={728} y={279} name="E-01" color={gold}/>
    <path d="M1100 351V218H1335V351ZM1100 218l75-60v60l75-60v60" fill="none" stroke={gold} strokeWidth="5"/><text x="1125" y="412" fill="currentColor" fontSize="30">收发货地</text>
    {c>0&&<><Arrow x1={350} y1={245} x2={518} y2={245}/><text x="350" y="185" fill={teal} fontSize="27">场内运输</text></>}
    {c>1&&<><Arrow x1={890} y1={245} x2={1070} y2={245} color={gold}/><text x="896" y="185" fill={gold} fontSize="27">外集卡</text></>}
    {c>2&&<text x="715" y="499" textAnchor="middle" fill="currentColor" fontSize="30">交接时核对箱号、任务与接收条件</text>}
  </Diagram>;
  if(n===17||n===19||n===22)return <Diagram label="多项条件共同支持货物接续">
    <circle cx="1110" cy="259" r="118" fill="none" stroke={teal} strokeWidth="5"/><text x="1110" y="252" textAnchor="middle" fill={teal} fontSize="33">{n===17?'缩短等待':n===19?'货物交接':'协调接续'}</text><text x="1110" y="301" textAnchor="middle" fill="currentColor" fontSize="25">核查当前条件</text>
    {points.map((point,i)=><g key={point}><circle cx="33" cy={85+i*155} r="16" fill={i===1?gold:teal}/><Lines text={point} x={78} y={92+i*155} size={30} width={23}/><Arrow x1={825} y1={90+i*155} x2={980} y2={200+i*62} color={i===1?gold:teal}/></g>)}
  </Diagram>;
  if(page.visual==='journey'||page.visual==='handoff'||page.visual==='gate'||page.visual==='summary')return <Diagram label="货物交接与接续环节">
    {points.map((point,i)=><g key={point}><circle cx={120+i*470} cy="95" r="40" fill={i===1?gold:teal}/><text x={120+i*470} y="105" fontSize="30" textAnchor="middle" fill="#fff">0{i+1}</text>{i>0&&<Arrow x1={190+(i-1)*470} y1={95} x2={520+(i-1)*470} y2={95}/>}
      <Lines text={point} x={25+i*470} y={224} width={12} size={32} line={52}/></g>)}
    {n===2&&c>1&&<Box x={535} y={374} name="I-01"/>}
  </Diagram>;
  if(page.visual==='flows')return <Diagram label="进口出口中转的三条箱流">{points.map((point,i)=><g key={point}><text x="20" y={78+i*166} fill="currentColor" fontSize="35">{point}</text><Arrow x1={650} y1={65+i*166} x2={1360} y2={65+i*166} color={i===1?gold:teal}/><Box x={730+i*125} y={96+i*146} name={['进口','出口','中转'][i]} color={i===1?gold:teal}/></g>)}</Diagram>;
  if(page.visual==='balance'){
    if(n===16)return <Diagram label="从零刻度比较逐日在场箱量"><text x="30" y="30" fill="currentColor" fontSize="23">在场箱量 / 箱</text>{[0,1000,2000,3000].map(v=><g key={v}><path d={`M72 ${435-v/10}H948`} stroke="#b8c8bf" strokeDasharray="4 6"/><text x="0" y={442-v/10} fill="currentColor" fontSize="20">{v}</text></g>)}{[3000,3200,3400,3600].slice(0,c+1).map((value,i)=><g key={value}><rect x={105+i*213} y={435-value/10} width="130" height={value/10} fill={i===0?gold:teal}/><text x={170+i*213} y={415-value/10} textAnchor="middle" fontSize="35" fill="currentColor">{value}</text><text x={170+i*213} y="482" textAnchor="middle" fontSize="25" fill="currentColor">{i===0?'期初':`第${i}天`}</text></g>)}<Notes points={points}/></Diagram>;
    return <Diagram label="堆场边界内的箱量收支"><rect x="345" y="132" width="550" height="260" fill="none" stroke={teal} strokeWidth="4"/>
      <text x="620" y="205" fontSize="31" textAnchor="middle" fill="currentColor">{n===12?'期初3,000箱':'在场箱量'}</text>
      {c>0&&<><Arrow x1={45} y1={265} x2={315} y2={265}/><text x="54" y="208" fontSize="28" fill={teal}>{n===12?'进入1,000箱':'进入：箱/天'}</text></>}
      {c>1&&<><Arrow x1={925} y1={265} x2={1360} y2={265} color={gold}/><text x="1020" y="208" fontSize="28" fill={gold}>{n===12?'离开800箱':'离开：箱/天'}</text></>}
      {c>2&&<text x="620" y="316" fontSize="42" textAnchor="middle" fill={teal}>{n===12?'期末＝期初＋进入－离开':'存量单位：箱'}</text>}
      <text x="620" y="478" textAnchor="middle" fontSize="28" fill="currentColor">同一个场界 · 同一统计时段</text>
    </Diagram>;
  }
  if(page.visual==='inventory')return <Diagram label="稳定情境中的平均在场箱量">
    {(n===14?[0,1,2]:Array.from({length:option===0?3:5},(_,i)=>i)).map(i=><g key={i}><rect x={35+i*177} y="174" width="143" height="210" fill={c>=2?teal:'none'} opacity={c>=2?.7:1} stroke={teal} strokeWidth="2"/>{c>=2&&<text x={107+i*177} y="292" textAnchor="middle" fill="#fff" fontSize="32">1,000</text>}</g>)}
    {c>0&&<text x="42" y="88" fontSize="31" fill="currentColor">日均进入1,000箱/天</text>}
    {c>=3&&n===14&&<text x="42" y="470" fontSize="42" fill={teal}>1,000 × 3 ＝ 3,000箱</text>}
    {n===15&&<text x="42" y="470" fontSize="29" fill={gold}>两个稳定情境 · 平均停留{option===0?3:5}天</text>}
    <Notes points={points}/>
  </Diagram>;
  if(page.visual==='timeline')return <Diagram label="移动等待和运输接续的时间链">
    {n!==44&&<path d="M30 194H1390" stroke="#95ada9" strokeWidth="3"/>}
    {points.map((point,i)=><g key={point}><rect x={40+i*463} y="157" width="408" height="74" fill={i===1?gold:teal} opacity=".88"/><text x={244+i*463} y="203" textAnchor="middle" fontSize="28" fill="#fff">{n===13?['入场时刻','在场停留','离开边界'][i]:n===44?['时间口径','接续备选','波动容忍'][i]:n===3?['堆场等待','交接等待','班次等待'][i]:['起点记录','中间接续','终点记录'][i]}</text><Lines text={point} x={40+i*463} y={316} width={n===44?14:12} size={30}/></g>)}
  </Diagram>;
  if(page.visual==='routes')return <Diagram label="同口径两方案运输费用与全程时间">
    {LESSON_SIX_ROUTES.map((route,i)=><g key={route.id}><text x="20" y={76+i*220} fill={i?gold:teal} fontSize="51">{route.id}</text>
      {c>i&&<><rect x="115" y={40+i*220} width={route.days*93} height="45" fill={i?gold:teal}/><text x="115" y={135+i*220} fontSize="36" fill="currentColor">{route.fee.toLocaleString('en-US')}元/箱　·　{route.days}天</text>
      {n!==39&&<text x="115" y={188+i*220} fontSize="31" fill={i?gold:teal}>{route.fee} ＋ {route.days} × {n===41?100:300} ＝ ？</text>}</>}
    </g>)}<Notes points={points}/>
  </Diagram>;
  if(page.visual==='formula')return <Diagram label="运输方案广义成本的分步演算">
    {points.map((point,i)=><text key={point} x="25" y={70+i*132} fill={i===2?teal:'currentColor'} fontSize="39">{point}</text>)}
    {n===40&&<text x="25" y="493" fontSize="31" fill={gold}>本次每天价值：{option===0?100:300}元/箱·天</text>}
  </Diagram>;
  if(page.visual==='comparison')return <Diagram label="三种运输方式的连接条件">{points.map((point,i)=><g key={point}><text x="30" y={65+i*165} fontSize="52" fill={i===1?gold:teal}>{['公路','铁路','内河'][i]}</text><Lines text={point.slice(3)} x={285} y={57+i*165} width={30} size={32}/><path d={`M285 ${120+i*165}H1380`} stroke="#bdc9bf"/></g>)}</Diagram>;
  return <div className="l6-points">{points.map((point,i)=><p key={point}><span>0{i+1}</span>{point}</p>)}</div>;
}
export function PortLessonSixComposition({page,state}:{page:PortLessonSixPage;state:LessonSixPresentation}){
  if(page.visual==='map')return <PortLessonSixFilm page={page} state={state}/>;
  const dark=page.visual==='scene',points=lessonSixVisiblePoints(page,state.progress),source=PORT_LESSON_SIX_SOURCES[page.source];
  const mapQuiz=page.localPage===38;
  return <article className={`port-l6-slide${dark?' l6-dark':''}`} aria-label={`第6讲第${page.localPage}页`}>
    {dark&&<><img className="l6-bg" src="/course-assets/port-management/l4/yard-aerial-v1.png" alt=""/><div className="l6-shade"/></>}
    <header className="l6-heading"><div className="l6-folio">{String(page.localPage).padStart(2,'0')} / HINTERLAND & DELIVERY</div><h1 data-l6-bounds="title">{page.title}</h1><p data-l6-bounds="lead">{page.lead}</p></header>
    <div className="l6-body" data-l6-bounds="body">{state.revealed&&page.reveal&&!mapQuiz?<div className="l6-answer">{page.reveal}</div>:<DiagramContent page={page} state={state} points={points}/>}</div>
    <footer data-l6-bounds="footer"><span className="l6-source">{dark?'AI生成背景 · ':''}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>{page.localPage===33&&<> / <a href={PORT_LESSON_SIX_SOURCES['l6-ningbo'].url} target="_blank" rel="noreferrer">宁波舟山港（2024）</a></>}</span><span>港口管理概论 · 第6讲 <b>{String(page.localPage).padStart(2,'0')}/48</b></span></footer>
  </article>;
}
