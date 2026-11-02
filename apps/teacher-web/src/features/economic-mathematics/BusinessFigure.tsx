import {businessModel as M,capacityValue,type EconomicMathematicsSlideSpec} from '@edu/course-content/economic-mathematics';
type Config=NonNullable<EconomicMathematicsSlideSpec['businessFigure']>;
type Curve={label:string;f:(x:number)=>number;color:string};
const rust='#a64e35',teal='#466d6e',ink='#202c2d',axis='#9cacaa';
const fmt=(v:number)=>Number(v.toFixed(2)).toLocaleString('zh-CN');
export function BusinessFigure({config:c,values={},lab}:{config:Config;values?:Readonly<Record<string,unknown>>;lab?:EconomicMathematicsSlideSpec['businessLab']}){
 let lo=0,hi=800,low=-5000,high=21000,xUnit='销量q（件/周）',yUnit='利润（元/周）';
 let curves:Curve[]=[{label:'利润 Π',f:q=>M.profit(q,c.fixed??2000),color:rust}];
 let point:number|undefined=c.quantity,capacity=c.capacity;
 switch(c.kind){
  case'inverse-demand':hi=1200;low=0;high=130;yUnit='价格p（元/件）';curves=[{label:'反需求 p(q)',f:M.price,color:rust}];point=400;break;
  case'marginal-lines':hi=1200;low=-140;high=Math.max(140,M.marginalCost(1200,lab?Number(values.businessTax??0):0)+20);yUnit='边际量（元/件）';curves=[{label:'MR',f:M.marginalRevenue,color:rust},{label:'MC',f:q=>M.marginalCost(q,lab?Number(values.businessTax??0):0),color:teal}];if(lab){point=Number(values.businessQuantity??400);capacity=Number(values.businessCapacity??500);}break;
  case'revenue-profit':low=-5000;high=39000;yUnit='金额（元/周）';curves=[{label:'收入 R',f:M.revenue,color:teal},...curves];break;
  case'capacity-value':xUnit='产能K（件/周）';curves=[{label:'最大利润 V',f:capacityValue,color:rust}];point=300;break;
  case'average-cost':lo=50;low=20;high=75;yUnit='成本（元/件）';curves=[{label:'平均 AC',f:q=>M.averageCost(q)!,color:rust},{label:'边际 MC',f:q=>M.marginalCost(q),color:teal}];point=Math.sqrt(100000);break;
  case'elasticity':hi=110;low=0;high=12;xUnit='价格p（元/件）';yUnit='弹性E（无量纲）';curves=[{label:'E=p/(120−p)',f:p=>M.elasticity(p)??0,color:rust}];point=80;break;
  case'price-revenue':hi=120;low=0;high=39000;xUnit='价格p（元/件）';yUnit='收入（元/周）';curves=[{label:'收入 R',f:M.revenuePrice,color:rust}];point=60;break;
  case'price-objectives':lo=5;hi=115;low=-60000;high=39000;xUnit='价格p（元/件）';yUnit='金额（元/周）';curves=[{label:'收入 R',f:M.revenuePrice,color:teal},{label:'利润 Π',f:p=>M.profit(M.quantity(p)),color:rust}];if(lab)point=Number(values.businessPrice??80);break;
  case'unit-elastic-minimum':lo=.8;hi=1.2;low=99;high=105;xUnit='价格p（元/件）';yUnit='收入（元/周）';curves=[{label:'R=100[1+(p−1)²]',f:p=>p*M.revenueMinimumQuantity(p),color:rust}];point=1;break;
  case'constant-elasticity':lo=30;hi=120;low=0;high=430;xUnit='价格p（元/件）';yUnit='需求量（件/周）';curves=[{label:'q=360000/p²',f:p=>M.powerQuantity(p),color:rust}];point=60;break;
  case'power-profit':lo=30;hi=120;low=-1200;high=2300;xUnit='价格p（元/件）';curves=[{label:'等弹性模型利润',f:p=>M.powerProfit(p),color:rust}];point=60;break;
  case'same-local-elasticity':lo=50;hi=110;low=0;high=1100;xUnit='价格p（元/件）';yUnit='需求量（件/周）';curves=[{label:'线性需求',f:M.quantity,color:rust},{label:'等弹性需求',f:p=>2560000/p**2,color:teal}];point=80;break;
 }
 const X=(x:number)=>105+(x-lo)/(hi-lo)*530,Y=(y:number)=>322-(y-low)/(high-low)*255;
 const path=(f:(x:number)=>number)=>Array.from({length:301},(_,i)=>{const x=lo+(hi-lo)*i/300;return`${i?'L':'M'}${X(x).toFixed(2)},${Y(f(x)).toFixed(2)}`;}).join(' ');
 const clip='business-'+c.kind;
 return <svg viewBox="0 0 760 460" role="img" aria-label={`${yUnit}随${xUnit}变化，显示范围${lo}至${hi}`} style={{width:'100%',fontSize:30,fontFamily:'inherit'}}>
  <defs><clipPath id={clip}><rect x="104" y="65" width="533" height="258"/></clipPath></defs>
  <text x="105" y="35" fill={ink}>{yUnit}</text>
  <path d="M105,65V322H640" fill="none" stroke={axis} strokeWidth="2"/>
  {low<0&&high>0&&<path d={`M105,${Y(0)}H635`} stroke={axis} strokeDasharray="5 5" fill="none"/>}
  {[lo,(lo+hi)/2,hi].map(x=><g key={x}><path d={`M${X(x)},322v6`} stroke={axis}/><text x={X(x)} y="360" fill={ink} textAnchor="middle">{fmt(x)}</text></g>)}
  {(low<0&&high>0?[low,0,high]:[low,(low+high)/2,high]).map(y=><text key={y} x="95" y={Y(y)+8} fill={teal} textAnchor="end" fontSize="26">{fmt(y)}</text>)}
  <g clipPath={`url(#${clip})`}>{capacity!==undefined&&capacity<hi&&<rect x={X(Math.max(lo,capacity))} y="65" width={Math.max(0,635-X(Math.max(lo,capacity)))} height="257" fill="#9cacaa" opacity=".13"/>}{curves.map(curve=><path key={curve.label} d={path(curve.f)} fill="none" stroke={curve.color} strokeWidth="4"/>)}
   {point!==undefined&&curves.map(curve=><circle key={curve.label} cx={X(point!)} cy={Y(curve.f(point!))} r="6" fill={curve.color}/>)}
   {capacity!==undefined&&capacity>=lo&&capacity<=hi&&<path d={`M${X(capacity)},65V322`} stroke={ink} strokeWidth="2" strokeDasharray="7 5"/>}
  </g>
  {capacity!==undefined&&<text x="415" y="35" fill={teal} fontSize="26">{'产能 K='+capacity}</text>}
  {curves.map((curve,i)=><text key={curve.label} x={105+i*275} y="402" fill={curve.color} fontSize="28">{curve.label}</text>)}
  <text x="635" y="445" textAnchor="end" fill={ink} fontSize="26">{xUnit}</text>
 </svg>;
}
