import {marketModel as M,type EconomicMathematicsSlideSpec} from '@edu/course-content/economic-mathematics';
type Config=NonNullable<EconomicMathematicsSlideSpec['marketFigure']>;
type Curve={name:string;f:(x:number)=>number;color:string;min?:number;max?:number};
const ink='#202c2d',red='#a64e35',teal='#466d6e',axis='#9cacaa';
const fmt=(x:number)=>Number(x.toFixed(2)).toLocaleString('zh-CN');
export function MarketFigure({config:c,values={}}:{config:Config;values?:Readonly<Record<string,unknown>>}){
 if(c.kind==='menu-choice'){
  const gap=Number(values.menuFastPrice??288)-Number(values.menuSlowPrice??99),upper=300-Number(values.menuUrgentSlowValue??110),X=(x:number)=>110+(x+60)/400*530;
  return <svg viewBox="0 0 760 410" role="img" aria-label={`自我选择要求价格差至少20元且至多${upper}元；当前${gap}元`}>
   <text x="70" y="45" fill={ink} fontSize="30">版本价格差与升级价值</text>
   <path d="M110 170H640" stroke={axis} strokeWidth="2"/>
   <path d={`M${X(20)} 170H${X(upper)}`} stroke={teal} strokeWidth="16"/>
   <path d={`M${X(gap)} 135V240`} stroke={red} strokeWidth="4"/>
   <text x={X(20)} y="115" textAnchor="middle" fill={teal} fontSize="26">普通用户20</text>
   <text x={X(upper)} y="85" textAnchor="middle" fill={teal} fontSize="26">急用用户{upper}</text>
   <text x={X(gap)} y="280" textAnchor="middle" fill={red} fontSize="28">当前价差{fmt(gap)}</text>
   <text x="110" y="335" fill={ink} fontSize="26">快机价−慢机价（元）</text>
   <text x="110" y="380" fill={teal} fontSize="24">绿色区间只表示版本比较，还须核对是否购买</text>
  </svg>;
 }
 let min=0,max=300,low=0,high=3200,xLabel='价格p（元/台）',yLabel='需求量（台/月）',point=c.price,shade:number|undefined;
 let curves:Curve[]=[{name:'办公市场',f:M.businessQuantity,color:red},{name:'普通市场',f:M.ordinaryQuantity,color:teal,max:120}];
 switch(c.kind){
  case'utility':max=6;high=2.1;xLabel='消费量q';yLabel='效用指数U';curves=[{name:'U=ln(1+q)',f:M.utility,color:red}];point=3;break;
  case'production-cost':max=20000;high=150;xLabel='批量q（台）';yLabel='未来总成本（万元）';curves=[{name:'平台限速',f:q=>M.platformCost(q)/10000,color:red},{name:'专门低配',f:q=>M.dedicatedCost(q)/10000,color:teal}];point=10000;break;
  case'market-revenue':high=240;yLabel='收入（千元/月）';curves=[{name:'办公收入R',f:p=>M.businessRevenue(p)/1000,color:red}];break;
  case'revenue-minimum':min=.8;max=1.2;low=99;high=105;xLabel='价格p（模型单位）';yLabel='收入R（模型单位）';curves=[{name:'R=100[1+(p−1)²]',f:p=>100*(1+(p-1)**2),color:red}];point=1;break;
  case'same-tangent':min=100;max=280;high=4200;curves=[{name:'线性需求q₁',f:M.businessQuantity,color:red},{name:'非线性需求q₂',f:p=>40000000/p**2,color:teal}];point=200;break;
  case'market-marginals':max=2400;low=-180;high=320;xLabel='销量q（台/月）';yLabel='边际金额（元/台）';curves=[{name:'价格p',f:q=>300-.1*q,color:ink},{name:'边际收入MR',f:M.businessMR,color:red},{name:'直接边际成本MC',f:()=>60,color:teal}];point=1200;break;
  case'market-profit':min=60;low=-30;high=240;yLabel='金额（千元/月）';curves=[{name:'收入R',f:p=>M.businessRevenue(p)/1000,color:teal},{name:'利润Π',f:p=>M.businessProfit(p)/1000,color:red}];point=Number(values.marketPrice??c.price??180);if(c.capacity!==undefined)shade=300-.1*c.capacity;break;
  case'uniform-price':max=330;low=-130;high=250;yLabel='销售利润（元）';curves=[{name:'统一价格利润',f:M.uniformProfit,color:red,min:0,max:120},{name:'',f:M.uniformProfit,color:red,min:120.0001,max:300},{name:'',f:M.uniformProfit,color:red,min:300.0001,max:330}];break;
 }
 const X=(x:number)=>112+(x-min)/(max-min)*530,Y=(y:number)=>318-(y-low)/(high-low)*250;
 const path=(c:Curve)=>Array.from({length:241},(_,i)=>{const x=(c.min??min)+((c.max??max)-(c.min??min))*i/240;return`${i?'L':'M'}${X(x).toFixed(2)},${Y(c.f(x)).toFixed(2)}`;}).join(' ');
 const id='market-'+c.kind;
 return <svg viewBox="0 0 760 460" role="img" aria-label={`${yLabel}随${xLabel}变化，横轴${min}至${max}，纵轴${low}至${high}`} style={{width:'100%',fontFamily:'inherit'}}>
  <defs><clipPath id={id}><rect x="110" y="66" width="534" height="254"/></clipPath></defs>
  <text x="112" y="36" fill={ink} fontSize="28">{yLabel}</text>
  {shade!==undefined&&<text x="425" y="36" fill={ink} fontSize="24">可行p≥{fmt(shade)}元</text>}
  <path d="M112 68V318H645" stroke={axis} fill="none" strokeWidth="2"/>
  {low<0&&<path d={`M112 ${Y(0)}H642`} stroke={axis} fill="none" strokeDasharray="5 5"/>}
  {[min,(min+max)/2,max].map(x=><g key={x}><path d={`M${X(x)} 318v6`} stroke={axis}/><text x={X(x)} y="354" fill={ink} fontSize="26" textAnchor="middle">{fmt(x)}</text></g>)}
  {(low<0?[low,0,high]:[low,(low+high)/2,high]).map(y=><text key={y} x="101" y={Y(y)+8} textAnchor="end" fontSize="26" fill={teal}>{fmt(y)}</text>)}
  <g clipPath={`url(#${id})`}>
   {shade!==undefined&&<rect x={X(min)} y="68" width={X(shade)-X(min)} height="250" fill={axis} opacity=".18"/>}
   {curves.map((v,i)=><path key={i} d={path(v)} stroke={v.color} strokeWidth="4" fill="none"/>)}
   {point!==undefined&&curves.filter(v=>point!>=(v.min??min)&&point!<=(v.max??max)).map((v,i)=><circle key={i} cx={X(point!)} cy={Y(v.f(point!))} r="6" fill={v.color}/>)}
   {shade!==undefined&&<path d={`M${X(shade)} 68V318`} stroke={ink} strokeDasharray="6 5"/>}
  </g>
  {curves.filter(v=>v.name).map((v,i)=><text key={v.name} x={112+i*205} y="398" fill={v.color} fontSize="25">{v.name}</text>)}
  <text x="642" y="443" textAnchor="end" fill={ink} fontSize="26">{xLabel}</text>
 </svg>;
}
