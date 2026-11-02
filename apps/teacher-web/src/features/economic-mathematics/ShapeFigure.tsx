import {shapeModels as M,chordEvidence,familyExtrema,type EconomicMathematicsSlideSpec} from '@edu/course-content/economic-mathematics';
type Config=NonNullable<EconomicMathematicsSlideSpec['shapeFigure']>;
const ink='#202c2d',teal='#466d6e',rust='#a64e35',axis='#a9b6b0';
const num=(x:number)=>Math.abs(x)<1e-8?'0':Number(x.toFixed(2)).toString();
export function ShapeFigure({config:c,step}:{config:Config;step:number}){
 if(c.kind==='stationary')return <svg viewBox="0 0 760 430" role="img" aria-label="四次方、负四次方与三次方在0处具有不同的极值类型" style={{width:'100%',fontSize:30}}>{[{f:M.quartic,label:'x⁴',type:'局部极小'},{f:(x:number)=>-M.quartic(x),label:'−x⁴',type:'局部极大'},{f:M.cubic,label:'x³',type:'非极值'}].map((m,j)=>{const X=(x:number)=>40+j*245+(x+1)*100,Y=(y:number)=>220-y*95;return <g key={m.label}><path d={`M${X(-1)},220H${X(1)} M${X(0)},110V330`} stroke={axis} fill="none"/><path d={Array.from({length:121},(_,i)=>{const x=-1+2*i/120;return `${i?'L':'M'}${X(x)},${Y(m.f(x))}`;}).join(' ')} stroke={j===1?teal:rust} strokeWidth="4" fill="none"/><circle cx={X(0)} cy={Y(0)} r="6" fill={ink}/><text x={X(0)} y="65" textAnchor="middle" fill={ink}>{m.label}</text><text x={X(0)} y="385" textAnchor="middle" fill={teal}>{m.type}</text></g>;})}</svg>;
 const chord=c.kind.startsWith('chord-'),negative=c.kind==='chord-concave',family=c.kind==='family',tangent=c.kind==='tangent';
 const a=c.a??1,x1=c.x1??-1,x2=c.x2??2,lambda=c.lambda??.5,showChord=step>=(c.chordAt??0);
 const f=family?(x:number)=>M.family(x,a):c.kind==='inflection-cubic'?M.cubic:c.kind==='inflection-absolute'?M.absoluteProduct:negative?M.concave:M.convex;
 const loX=family?-2.1:chord?Math.min(x1,x2)-.4:-2.1,hiX=family?2.1:chord?Math.max(x1,x2)+.4:2.1;
 const samples=Array.from({length:241},(_,i)=>family?-2+4*i/240:loX+(hiX-loX)*i/240),ys=samples.map(f);
 const min=Math.min(0,...ys),max=Math.max(0,...ys),pad=(max-min||1)*.12;
 const loY=min-pad,hiY=max+pad,X=(x:number)=>95+(x-loX)/(hiX-loX)*555,Y=(y:number)=>345-(y-loY)/(hiY-loY)*285;
 const curve=(g:(x:number)=>number)=>samples.map((x,i)=>`${i?'L':'M'}${X(x).toFixed(2)},${Y(g(x)).toFixed(2)}`).join(' ');
 const e=chordEvidence(negative?-1:1,x1,x2,lambda);
 const label=family?'参数四次函数的真实曲线与候选位置':chord?(showChord?'同一横坐标处的弦线与曲线高度比较':'平方曲线上的两个端点'):tangent?'平方函数与位于其下方的切线':'曲线在0两侧的弯曲方向转换';
 return <svg viewBox="0 0 760 430" role="img" aria-label={label} style={{width:'100%',fontFamily:'inherit',fontSize:30}}>
  <defs><clipPath id="shape-plot-area"><rect x="90" y="40" width="570" height="315"/></clipPath></defs>
  <path d={`M90,${Y(0)}H670 M${X(0)},355V40`} fill="none" stroke={axis} strokeWidth="2"/>
  <text x="686" y={Math.min(365,Y(0)+8)} fill={ink}>x</text><text x={X(0)+14} y="34" fill={ink}>y</text>
  <g clipPath="url(#shape-plot-area)"><path d={curve(f)} fill="none" stroke={rust} strokeWidth="4"/>
  {chord&&showChord&&<><path d={`M${X(x1)},${Y(f(x1))}L${X(x2)},${Y(f(x2))}`} fill="none" stroke={teal} strokeWidth="4"/><path d={`M${X(e.x)},${Y(e.curve)}V${Y(e.chord)}`} stroke={teal} strokeWidth="3" strokeDasharray="6 5"/></>}
  {tangent&&<path d={curve(x=>x-.25)} stroke={teal} strokeWidth="3" strokeDasharray="8 6" fill="none"/>}
  </g>
  {chord&&<>{[x1,x2].map((x,i)=><g key={x}><circle cx={X(x)} cy={Y(f(x))} r="6" fill={ink}/><text x={X(x)+(i?-10:10)} y={Y(f(x))-15} textAnchor={i?'end':'start'} fill={ink}>{`(${num(x)},${num(f(x))})`}</text></g>)}{showChord&&<><circle cx={X(e.x)} cy={Y(e.curve)} r="7" fill={rust}/><circle cx={X(e.x)} cy={Y(e.chord)} r="7" fill={teal}/><text x="110" y="390" fill={rust}>{`曲线 ${num(e.curve)}`}</text><text x="335" y="390" fill={teal}>{`弦线 ${num(e.chord)}`}</text><text x="555" y="390" fill={ink}>{c.showWeight===false?`x=${num(e.x)}`:`λ=${lambda}`}</text></>}</>}
  {family&&<>{[...new Set([-2,0,2,...familyExtrema(a).stationary,...(c.inflections?familyExtrema(a).inflections:[])])].map(x=><circle key={x} cx={X(x)} cy={Y(f(x))} r="6" fill={ink}/>)}<text x="105" y="390" fill={ink}>{`a=${a}；定义域 [−2,2]`}</text></>}
  {tangent&&<><circle cx={X(.5)} cy={Y(.25)} r="7" fill={ink}/><text x="110" y="390" fill={teal}>切线 y=x−1/4</text></>}
  {!chord&&!family&&!tangent&&<><circle cx={X(0)} cy={Y(0)} r="7" fill={ink}/><text x="110" y="390" fill={teal}>左：concave</text><text x="410" y="390" fill={rust}>右：convex</text></>}
 </svg>;
}
