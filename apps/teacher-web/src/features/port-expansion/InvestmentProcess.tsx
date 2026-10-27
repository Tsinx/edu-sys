import {useId} from 'react';
import {INVESTMENT_CASE,INVESTMENT_PLAN_LABELS,type InvestmentInitial,type InvestmentDecision} from '@edu/course-content';

type Props={initial:InvestmentInitial|null;decision?:InvestmentDecision|null;year:number;progress?:number;q?:number;retention?:number;className?:string};
const C=INVESTMENT_CASE,ink='#1c4b58',teal='#287a80',amber='#bc8548',pale='#d6dfd1';
function Ship({x,y,grey=false}:{x:number;y:number;grey?:boolean}){return <g transform={`translate(${x} ${y})`} opacity={grey?.45:1}><path d="M0 38H158L138 65H28Z" fill={grey?'#78918e':ink}/><rect x="12" y="4" width="32" height="34" fill="#eef0e5" stroke={ink} strokeWidth="2"/><path d="M20 12H36V22H20Z" fill="#75a8ab"/>{[0,1,2].map(i=><g key={i}><rect x={50+i*30} y="12" width="27" height="25" fill={i%2?'#b99d66':'#568d85'}/><path d={`M${57+i*30} 16V33M${66+i*30} 16V33`} stroke="#f1e5ca" strokeWidth="1"/></g>)}</g>;}
export function investmentModuleStatus(initial:InvestmentInitial|null,decision:InvestmentDecision|null|undefined,year:number,block:number){
 const planned=initial==='full'||initial==='phase'&&(block===0||decision==='expand')||initial==='wait'&&decision==='build';
 if(!planned)return {kind:'empty' as const,label:'尚未建设'};
 const start=initial==='wait'||initial==='phase'&&block===1?2:1,ready=start+1;
 return year>=ready?{kind:'ready' as const,label:'可服务 15万TEU/年'}:year===start?{kind:'building' as const,label:'施工中 · 尚无新增能力'}:{kind:'ordered' as const,label:'已安排 · 等待施工'};
}
export function InvestmentProcess({initial,decision,year,progress=1,q,retention=.8,className=''}:Props){
 const pattern='pi-build-'+useId().replace(/[^a-zA-Z0-9-]/g,''),st=[0,1].map(i=>investmentModuleStatus(initial,decision,year,i)),capacity=st.filter(s=>s.kind==='ready').length*C.phaseCapacity;
 const demand=q===undefined?undefined:q*(initial==='wait'?retention:1),served=demand===undefined?undefined:Math.min(demand,capacity),p=Math.max(0,Math.min(1,progress));
 return <svg className={'pi-process '+className} viewBox="0 0 900 460" role="img" aria-label={`新增港区过程示意，第${year}年；${initial?INVESTMENT_PLAN_LABELS[initial]:'尚未选择方案'}；新增可用能力${capacity}万TEU每年；${served===undefined?'货源尚未公布':`本年可处理${served.toLocaleString('zh-CN',{maximumFractionDigits:4})}万TEU`}。船箱位移为示意，不另计作业时间。`}>
  <defs><pattern id={pattern} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="12" fill="#d2b57c" opacity=".6"/></pattern></defs>
  <path d="M15 75H885V271H15Z" fill="#e4e8db"/><path d="M15 273H885V444H15Z" fill="#d1e3e4"/>{[304,353,400].map((y,i)=><path key={y} d={`M30 ${y}Q180 ${y-9} 330 ${y}T640 ${y}T875 ${y}`} fill="none" stroke="#91b4b7" strokeWidth="1" opacity={.5-i*.1}/>)}
  <text x="30" y="28" className="pi-process-kicker">第{year}年 · 新增项目过程示意</text><text x="871" y="28" textAnchor="end" className="pi-process-kicker">施工一年，下一年才投产</text>
  <g opacity=".55"><text x="110" y="67" textAnchor="middle">既有港区</text><rect x="30" y="94" width="155" height="164" fill="#cbd7cc" stroke="#9db1a6"/><path d="M57 231V119H169M57 119L155 94M57 119L167 149M74 125V231" fill="none" stroke="#839f97" strokeWidth="5"/><Ship x={28} y={315} grey/><text x="110" y="427" textAnchor="middle" fontSize="17">现金流基线保持不变</text></g>
  {st.map((s,i)=>{const x=239+i*326,ready=s.kind==='ready',building=s.kind==='building';return <g key={i} data-investment-block={i+1} data-status={s.kind}>
   <text x={x+144} y="67" textAnchor="middle" className="pi-process-title">新增单元 {i?'B':'A'}</text>
   <rect x={x} y="86" width="286" height="172" fill={ready?'#d1e2d9':building?'#efdfbe':'#edf0e6'} stroke={ready?teal:building?amber:'#aabcb1'} strokeWidth="2.5" strokeDasharray={ready?undefined:'7 6'}/>
   {building&&<><rect x={x+2} y="88" width={282*p} height="168" fill={`url(#${pattern})`}/><path d={`M${x+40} 215H${x+246}M${x+77} 213V140M${x+77} 142L${x+207} 110M${x+77} 142L${x+210} 167M${x+207} 110V190`} fill="none" stroke={amber} strokeWidth="5"/><rect x={x+198} y="185" width="26" height="18" fill={amber}/><text x={x+143} y="242" textAnchor="middle" fontSize="18" fill="#8a602e">施工进度示意 {Math.round(p*100)}%</text></>}
   {ready&&<><path d={`M${x+52} 233V111H${x+246}M${x+52} 111L${x+222} 91M${x+52} 111L${x+243} 145M${x+72} 119V233M${x+204} 112V182`} fill="none" stroke={teal} strokeWidth="5"/><rect x={x+196} y="179" width="28" height="12" fill={teal}/>{[0,1,2].map(j=><g key={j}><rect x={x+91+j*43} y="198" width="40" height="29" fill={j%2?'#b8955e':'#6e9c8c'}/><path d={`M${x+101+j*43} 204V221M${x+115+j*43} 204V221`} stroke="#f2edda" strokeWidth="1.3"/></g>)}<path d={`M${x+16} 257H${x+270}`} stroke={ink} strokeWidth="6"/></>}
   {!building&&!ready&&<><path d={`M${x+25} 229H${x+262}M${x+42} 214V237M${x+100} 214V237M${x+160} 214V237M${x+220} 214V237`} stroke="#b4c5b9" strokeWidth="3"/><text x={x+143} y="172" textAnchor="middle" fontSize="27" fill="#8da79b">{s.kind==='empty'?'预留空间':'待施工项目'}</text></>}
   <text x={x+143} y="294" textAnchor="middle" fontSize="19" fill={ready?teal:building?'#8d632f':'#6b837a'}>{s.label}</text>
   {ready&&served!==undefined&&served>0&&<Ship x={x+17+Math.min(1,p)*66} y={326}/>}<text x={x+143} y="427" textAnchor="middle" fontSize="18">{ready?'已投产能力才承接新增货流':building?'已支出资金，服务能力尚未增加':'保留空间与选择，不预记收益'}</text>
  </g>;})}
  <text x="30" y="457" className="pi-process-foot">位置、船箱与施工比例均为示意；计算只读取同一份年度现金与吞吐记录。</text>
 </svg>;
}
