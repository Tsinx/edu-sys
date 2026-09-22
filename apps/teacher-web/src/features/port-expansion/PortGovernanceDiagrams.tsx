import {concessionScenario,portChoiceScenario,storageScenario,type PortExpansionPage,type ExpansionPresentation} from '@edu/course-content';
const ink='#214c59',teal='#267c86',gold='#b97543',muted='#6d8277';
const text=(x:number,y:number,value:string|number,size=28,color=ink,anchor:'start'|'middle'|'end'='start')=><text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor}>{value}</text>;
export function PortGovernanceDiagram({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const p=state.progress,visible=(i:number,n:number)=>p>=(i+1)/n?1:.15;
 if(page.visual==='rights'){
  const mode=page.options?state.option:page.focus??0,names=['服务港','工具港','地主港','私人资产与经营'],layers=['土地与场地','码头基础设施','作业设备','货物装卸服务'],privateAt=[4,3,2,0][mode]??4;
  return <>{text(35,35,'典型职能组合 · 实际配置需逐项核查',23,muted)}{text(1375,35,names[mode]!,26,teal,'end')}
   {layers.map((label,i)=>{const y=74+i*90,priv=i>=privateAt;return <g key={label} opacity={visible(i,4)}><path d={`M40 ${y+70}L250 ${y+70}L285 ${y+35}L75 ${y+35}Z`} fill={priv?'#d5b493':'#9bbdb7'}/><path d={`M40 ${y+70}V${y+84}H250V${y+70}`} fill={priv?gold:teal}/>{text(325,y+65,label,31)}<path d={`M685 ${y+56}H935`} stroke={priv?gold:teal} strokeWidth="4"/>{text(980,y+66,priv?'私人主体配置':'公共主体配置',30,priv?gold:teal)}</g>;})}
   <path d="M35 485H1400" stroke={ink} strokeWidth="3"/>{text(40,532,'公共监管与适用规则：独立核查，不由上方资产颜色决定',29,ink)}
  </>;
 }
 if(page.visual==='contract')return <>{text(25,40,page.lesson===9?'从约定，到履行与核查':'从客户任务，到可以核查的承诺',28,muted)}{(page.labels??[]).map((label,i)=>{const x=25+i*480;return <g key={i} opacity={visible(i,3)}><path d={`M${x} 95H${x+385}L${x+420} 130V428H${x}Z`} fill={i%2?'#e0e6d8':'#ece4cf'} stroke="#96aea1" strokeWidth="2"/><path d={`M${x+385} 95V130H${x+420}`} fill="none" stroke="#96aea1" strokeWidth="2"/>{text(x+30,180,String(i+1).padStart(2,'0'),58,[teal,gold,ink][i])}{text(x+30,249,label,28)}{[300,332,364].map(y=><path key={y} d={`M${x+30} ${y}H${x+382}`} stroke="#a2b6a6" strokeWidth="2"/>)}{text(x+30,470,['对象与边界','履行与记录','复核与调整'][i]!,25,muted)}</g>;})}{text(25,543,'关系图解 · 不表示真实合同文本或已实现的服务结果',22,muted)}</>;
 if(page.visual==='cashflow'){
  const v=concessionScenario(state.option),max=v.revenue,scale=930/max;
  return <>{text(30,33,`教学年收入 ${v.revenue}万元；运营支出 ${v.operating}万元`,29)}{['固定支付','组合支付'].map((name,i)=>{const fee=i?v.sharedFee:60,rest=v.revenue-v.operating-fee,y=106+i*174;return <g key={name}>{text(30,y+38,name,30)}{[v.operating,fee,rest].map((value,j)=>{const before=j===0?0:j===1?v.operating:v.operating+fee;return <g key={j}><rect x={250+before*scale} y={y} width={Math.max(0,value*scale*p)} height="62" fill={[ink,gold,teal][j]}/>{text(265+j*360,y+108,`${['运营','支付','余项'][j]} ${value}万元`,27)}</g>;})}</g>;})}{text(32,487,'棕色：向授予方支付　蓝绿：简化余项',27)}{text(32,536,'余项不是净利润 · 未计建设融资、税费、更新与贴现',25,muted)}</>;
 }
 if(page.visual==='choice'){
  const v=portChoiceScenario(state.option),scale=1040/3200;
  return <>{text(30,35,`同一40英尺箱 · 时间折算 ${v.daily}元/箱日`,28)}{['A','B','C'].map((name,i)=>{const port=[500,650,450][i]!,land=[700,450,600][i]!,time=v.daily*v.days[i]!,y=94+i*121;return <g key={name}>{text(32,y+36,`路径${name}`,32)}{[port,land,time].map((value,j)=><rect key={j} x={230+(j===0?0:j===1?port:port+land)*scale} y={y} width={value*scale*p} height="52" fill={[ink,teal,gold][j]}/>)}{text(1350,y+37,v.totals[i]!,31,ink,'end')}{text(235,y+84,`${port}＋${land}＋${v.days[i]}×${v.daily}`,24,muted)}</g>;})}
   {text(28,490,'深蓝：港内　蓝绿：陆运　棕色：时间折算',27)}{text(28,539,'总额单位：元/箱 · 不含尾部风险与转换费 · 不预测真实选港行为',23,muted)}
  </>;
 }
 if(page.visual==='invoice'){
  const v=storageScenario(state.option);return <>{text(30,38,`停留 ${v.days}日 · 前3日免费堆存`,31)}{Array.from({length:8},(_,i)=><g key={i} opacity={i<v.days?1:.15}><rect x={35+i*173} y="90" width="143" height={140*p} fill={i<3?'#a4c5bb':gold}/>{text(106+i*173,269,`第${i+1}日`,27,ink,'middle')}{text(106+i*173,307,i<3?'免费':'40元',24,muted,'middle')}</g>)}<path d="M35 350H1405" stroke="#8ca79a" strokeWidth="2"/>{text(35,406,`装卸 360元 ＋ 超期 ${v.chargeDays}日 × 40元`,34)}{text(35,483,`本情境合计 ${v.total}元/箱`,45,teal)}{text(35,541,'教学规则 · 实际需另核计费起讫、取整及其他费用',23,muted)}</>;
 }
 if(page.visual==='service')return <>{text(30,35,'5次教学记录 · 两组平均均为3天',30)}{[[2,2,2,2,7],[3,3,3,3,3]].map((days,i)=><g key={i}>{text(30,145+i*218,`记录${i?'B':'A'}`,31)}<path d={`M210 ${180+i*218}H1370`} stroke="#9cb2a3" strokeWidth="3"/>{days.map((d,j)=><g key={j} opacity={visible(j,5)}><circle cx={225+d*140} cy={152+i*218-j*22} r="10" fill={i?teal:gold}/>{text(245+d*140,158+i*218-j*22,String(j+1),18,muted)}</g>)}{[0,2,4,6,8].map(d=><g key={d}><path d={`M${225+d*140} ${180+i*218}V${188+i*218}`} stroke={muted}/>{text(225+d*140,218+i*218,`${d}天`,23,muted,'middle')}</g>)}{page.focus===1&&<path d={`M785 ${62+i*218}V${184+i*218}`} stroke="#b25b46" strokeWidth="3" strokeDasharray="8 8"/>}</g>)}{text(30,505,page.focus===1?'虚线：4天交付期限 · 逐次检查是否超期':'横向位置：交付天数 · 点的上下错开仅为防止重叠',26,muted)}{text(30,550,'人为设定的小样本 · 不表示真实港口的未来延误概率',22,muted)}</>;
 return null;
}
