import {useId,type ReactNode} from 'react';
import {differentiationModels as M,differentialCostEvidence,type EconomicMathematicsFoundationFigure} from '@edu/course-content/economic-mathematics';
import type {SlideInteractionValues} from '@edu/contracts';
const ink='#202c2d',teal='#466d6e',rust='#a64e35';
const curve=(f:(x:number)=>number,a:number,b:number,X:(x:number)=>number,Y:(y:number)=>number,n=240)=>Array.from({length:n+1},(_,i)=>{const x=a+(b-a)*i/n;return `${i?'L':'M'}${X(x).toFixed(3)},${Y(f(x)).toFixed(3)}`;}).join(' ');
function Graph({domain,range,label,xLabel='x',yLabel='y',square=false,children}:{domain:readonly[number,number];range:readonly[number,number];label:string;xLabel?:string;yLabel?:string;square?:boolean;children:(X:(x:number)=>number,Y:(y:number)=>number)=>ReactNode}){
 const left=square?200:100,width=square?275:510,id=useId(),X=(x:number)=>left+width*(x-domain[0])/(domain[1]-domain[0]),Y=(y:number)=>360-275*(y-range[0])/(range[1]-range[0]);
 const zeroX=Math.max(domain[0],Math.min(domain[1],0)),zeroY=Math.max(range[0],Math.min(range[1],0));
 return <svg className="em-limit-figure" viewBox="0 0 700 470" role="img" aria-label={label}>
 <defs><clipPath id={id}><rect x={left} y="85" width={width} height="275"/></clipPath></defs>
 <text x={left} y="42">{yLabel}</text><path d={`M${left},${Y(zeroY)} H${left+width} M${X(zeroX)},85 V360`} stroke={ink} strokeWidth="2" fill="none"/>
 {[0,.5,1].map(t=><g key={t}><text x={left+width*t} y="402" textAnchor="middle">{Number((domain[0]+t*(domain[1]-domain[0])).toFixed(2))}</text><text x={left-20} y={360-275*t+8} textAnchor="end">{Number((range[0]+t*(range[1]-range[0])).toFixed(2))}</text></g>)}
 <g clipPath={`url(#${id})`}>{children(X,Y)}</g><text x="610" y="448" textAnchor="end">{xLabel}</text></svg>;
}
export function DifferentiationFigure({config,values}:{config:EconomicMathematicsFoundationFigure;values:SlideInteractionValues}){
 const p=config.params??{};
 switch(config.kind){
 case 'product-increment':return <svg className="em-limit-figure" viewBox="0 0 700 470" role="img" aria-label="宽为1高为2的矩形，正增量h等于0.3，两条边带面积2h与h，角落面积h平方">
 <text x="80" y="40">两边同时增加h（示意h=0.3）</text>
 <rect x="190" y="139" width="130" height="260" fill={teal} fillOpacity=".17" stroke={ink} strokeWidth="2"/>
 <rect x="320" y="139" width="39" height="260" fill={rust} fillOpacity=".25" stroke={ink} strokeWidth="2"/>
 <rect x="190" y="100" width="130" height="39" fill={rust} fillOpacity=".25" stroke={ink} strokeWidth="2"/>
 <rect x="320" y="100" width="39" height="39" fill={rust} stroke={ink} strokeWidth="2"/>
 <text x="255" y="280" textAnchor="middle">原面积2</text><text x="405" y="280">2h</text><path d="M359,270 H395" stroke={ink}/><text x="410" y="120">h²</text><path d="M359,118 H395" stroke={ink}/>
 <text x="255" y="88" textAnchor="middle">上方边带面积h</text><text x="275" y="444" textAnchor="middle">原宽1，新增宽h</text><text x="105" y="280">高2</text></svg>;
 case 'chain':return <svg className="em-limit-figure" viewBox="0 0 700 470" role="img" aria-label="复合函数x先变成3x加1，再平方；x等于1对应u等于4、y等于16，局部斜率依次3和8">
 <text x="65" y="65">x=1</text><text x="285" y="65">u=4</text><text x="510" y="65">y=16</text>
 <path d="M90,110 V320 M315,110 V320 M540,110 V320 M105,200 H300 M330,200 H525" stroke={ink} strokeWidth="3" fill="none"/>
 <path d="M287,189 L300,200 L287,211 M512,189 L525,200 L512,211" fill="none" stroke={ink} strokeWidth="3"/>
 <text x="200" y="163" textAnchor="middle">3x+1</text><text x="430" y="163" textAnchor="middle">u²</text><text x="200" y="250" textAnchor="middle">局部斜率3</text><text x="430" y="250" textAnchor="middle">局部斜率8</text><text x="350" y="391" textAnchor="middle">总斜率 3×8=24</text></svg>;
 case 'marginal-average':return <Graph domain={[50,150]} range={[15,65]} label="同一成本模型的平均成本和边际成本，100件处平均成本42，边际成本24" xLabel="产量q（件）" yLabel="元/件">{(X,Y)=><>
 <path d={curve(x=>M.averageCost(x)!,50,150,X,Y)} stroke={teal} strokeWidth="4" fill="none"/><path d={curve(x=>M.marginalCost(x)!,50,150,X,Y)} stroke={rust} strokeWidth="4" fill="none"/>
 <circle cx={X(100)} cy={Y(42)} r="6" fill={teal}/><circle cx={X(100)} cy={Y(24)} r="6" fill={rust}/><text x="390" y="125" fill={teal}>平均成本A</text><text x="390" y="310" fill={rust}>边际成本C′</text></>}</Graph>;
 case 'inverse-derivative':return <Graph square domain={[0,5]} range={[0,5]} label="正半轴平方函数与其反函数关于y等于x对称，原函数点2和4对应反向点4和2，切线斜率4与四分之一">{(X,Y)=><>
 <path d={curve(x=>x*x,0,Math.sqrt(5),X,Y)} stroke={teal} strokeWidth="4" fill="none"/><path d={curve(Math.sqrt,0,5,X,Y)} stroke={rust} strokeWidth="4" fill="none"/>
 <path d={`M${X(0)},${Y(0)} L${X(5)},${Y(5)}`} stroke={ink} strokeDasharray="6 6" fill="none"/>
 <path d={curve(x=>4+4*(x-2),1.4,2.2,X,Y)} stroke={teal} strokeWidth="2" fill="none"/><path d={curve(x=>2+(x-4)/4,2,5,X,Y)} stroke={rust} strokeWidth="2" fill="none"/>
 <circle cx={X(2)} cy={Y(4)} r="6" fill={teal}/><circle cx={X(4)} cy={Y(2)} r="6" fill={rust}/><text x={X(2)+12} y={Y(4)-10}>(2,4)</text><text x={X(4)-15} y={Y(2)+35} textAnchor="end">(4,2)</text></>}</Graph>;
 case 'implicit-circle':return <Graph square domain={[-5.5,5.5]} range={[-5.5,5.5]} label="半径5圆的上下分支，同一横坐标3对应纵坐标正负4">{(X,Y)=><>
 <path d={curve(x=>M.circle(x,1)!,-5,5,X,Y,1000)} stroke={teal} strokeWidth="4" fill="none"/><path d={curve(x=>M.circle(x,-1)!,-5,5,X,Y,1000)} stroke={rust} strokeWidth="4" fill="none"/>
 <line x1={X(3)} x2={X(3)} y1={Y(-4)} y2={Y(4)} stroke={ink} strokeDasharray="7 7"/>
 <circle cx={X(3)} cy={Y(4)} r="6" fill={teal}/><circle cx={X(3)} cy={Y(-4)} r="6" fill={rust}/><text x={X(3)+10} y={Y(4)+5}>(3,4)</text><text x={X(3)+10} y={Y(-4)+5}>(3,−4)</text>
 </>}</Graph>;
 case 'higher-rate':return <Graph domain={[0,8]} range={[110,180]} label="销售速率120加24t减3t平方，在0到8小时保持正值，4小时处168件每小时，6小时156" xLabel="t（小时）" yLabel="销售速率（件/小时）">{(X,Y)=><>
 <path d={curve(x=>M.salesRate(x)!,0,8,X,Y)} stroke={teal} strokeWidth="4" fill="none"/><circle cx={X(4)} cy={Y(168)} r="6" fill={rust}/><circle cx={X(6)} cy={Y(156)} r="6" fill={rust}/><text x={X(4)-10} y={Y(168)-14} textAnchor="end">(4,168)</text><text x={X(6)+8} y={Y(156)-10}>(6,156)</text></>}</Graph>;
 case 'higher-corner':return <Graph domain={[-1,1]} range={[-.2,2.3]} label="一阶导函数2倍绝对值在零处连续但有尖角，左右斜率为负2与2" yLabel="f′(x)=2|x|">{(X,Y)=><><path d={curve(x=>2*Math.abs(x),-1,1,X,Y)} stroke={teal} strokeWidth="4" fill="none"/><circle cx={X(0)} cy={Y(0)} r="6" fill={rust}/></>}</Graph>;
 case 'differential-error':{
  if(p.mode===1){const h=p.h??.3;return <Graph domain={[.5,1.5]} range={[0,2.5]} label="平方函数和基点1处切线，真实值与切线估值的纵向差为h平方">{(X,Y)=><>
   <path d={curve(x=>x*x,.5,1.5,X,Y)} stroke={teal} strokeWidth="4" fill="none"/><path d={curve(x=>1+2*(x-1),.5,1.5,X,Y)} stroke={ink} strokeDasharray="7 6" strokeWidth="3" fill="none"/>
   <line x1={X(1+h)} x2={X(1+h)} y1={Y((1+h)**2)} y2={Y(1+2*h)} stroke={rust} strokeWidth="6"/><circle cx={X(1)} cy={Y(1)} r="6" fill={ink}/><text x="135" y="120">实线：曲线；虚线：切线</text></>}</Graph>;}
  const h=Number(values.increment??p.h??10),m=differentialCostEvidence(100,h);if(!m)return null;
  return <Graph domain={[-20,20]} range={[-1,9]} label="成本真实增量减去微分的残差0.02h平方，输入增量正负两侧均非负，在零处为零" xLabel="输入增量h（件）" yLabel="残差 ΔC−dC（元）">{(X,Y)=><>
   <path d={curve(k=>differentialCostEvidence(100,k)!.absoluteError,-20,20,X,Y)} stroke={teal} strokeWidth="4" fill="none"/>
   <line x1={X(h)} x2={X(h)} y1={Y(0)} y2={Y(m.absoluteError)} stroke={rust} strokeWidth="4"/><circle cx={X(h)} cy={Y(m.absoluteError)} r="7" fill={rust}/>
   <text x="280" y="125">残差=0.02h²</text>
  </>}</Graph>;
 }
 default:return null;
 }
}
