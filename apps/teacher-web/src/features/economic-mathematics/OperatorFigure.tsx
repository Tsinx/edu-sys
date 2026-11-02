import {operatorEvidence as M,type EconomicMathematicsSlideSpec} from '@edu/course-content/economic-mathematics';
type Kind=NonNullable<EconomicMathematicsSlideSpec['operatorFigure']>;
const ink='#202c2d',teal='#466d6e',rust='#a64e35',muted='#a9b6b0';
export function OperatorFigure({kind}:{kind:Kind}){
 if(kind==='zero-chain')return <svg viewBox="0 0 760 430" role="img" aria-label="x等于0，内层微分系数为0，外层指数函数的微分系数为1，合成系数为0" style={{width:'100%',fontSize:32,fontFamily:'inherit'}}>
  <defs><marker id="operator-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill={teal}/></marker></defs>
  <text x="380" y="45" textAnchor="middle" fill={ink}>基点 x=0，对应 u=0</text>
  {[{x:65,label:'输入变化',value:'dx = h'},{x:305,label:'中间一次响应',value:'du = 0'},{x:545,label:'输出一次响应',value:'dy = 0'}].map(n=><g key={n.x}><rect x={n.x} y="175" width="150" height="100" rx="0" fill="none" stroke={teal} strokeWidth="2"/><text x={n.x+75} y="140" fontSize="30" textAnchor="middle" fill={ink}>{n.label}</text><text x={n.x+75} y="235" textAnchor="middle" fill={rust}>{n.value}</text></g>)}
  {[[220,295],[460,535]].map(([start,end])=><path key={start} d={`M${start},225H${end}`} fill="none" stroke={teal} strokeWidth="3" markerEnd="url(#operator-arrow)"/>)}
  <text x="258" y="320" textAnchor="middle" fill={teal}>× 0</text><text x="498" y="320" textAnchor="middle" fill={teal}>× 1</text><text x="380" y="390" textAnchor="middle" fontSize="30" fill={ink}>两层系数相乘：1 × 0 = 0</text>
 </svg>;
 const differential=kind==='differential',abs=kind==='absolute';
 const domain=differential?[.96,1.16]:[-3.5,3.5],range=differential?[.9,1.38]:abs?[-2.8,4.8]:[-4.8,4.8];
 const x=(v:number)=>75+(v-domain[0]!)/(domain[1]!-domain[0]!)*600,y=(v:number)=>355-(v-range[0]!)/(range[1]!-range[0]!)*300;
 const curve=(f:(x:number)=>number)=>Array.from({length:161},(_,i)=>{const v=domain[0]!+(domain[1]!-domain[0]!)*i/160;return `${i?'L':'M'}${x(v).toFixed(2)},${y(f(v)).toFixed(2)}`;}).join(' ');
 const yAxis=differential?domain[0]!:0,xAxis=differential?range[0]!:0;
 return <svg viewBox="0 0 760 430" role="img" aria-label={differential?'平方曲线与基点一的切线，输入增量零点一时实际增量零点二一，微分零点二':abs?'绝对值函数，负三映到三，零映到零，二映到二':'函数x减一与逐点取绝对值后的曲线，共用零点一，负值部分翻到横轴上方'} style={{width:'100%',fontFamily:'inherit',fontSize:32}}>
  <path d={`M75,${y(xAxis)}H700 M${x(yAxis)},375V40`} fill="none" stroke={muted} strokeWidth="2"/>
  <text x="714" y={y(xAxis)+8} fill={ink}>x</text><text x={x(yAxis)+14} y="34" fill={ink}>y</text>
  {differential?<>
   <path d={curve(M.tangentAtOne)} fill="none" stroke={teal} strokeWidth="3" strokeDasharray="9 7"/><path d={curve(M.square)} fill="none" stroke={rust} strokeWidth="4"/>
   <circle cx={x(1)} cy={y(1)} r="7" fill={ink}/><circle cx={x(1.1)} cy={y(1.21)} r="7" fill={rust}/><circle cx={x(1.1)} cy={y(1.2)} r="6" fill={teal}/>
   <path d={`M${x(1)},${y(1)}H${x(1.1)}V${y(1.2)}`} stroke={teal} fill="none" strokeWidth="2"/>
   <text x={x(1)-14} y={y(1)+35} fill={ink}>a=1</text><text x={x(1.1)+18} y={y(1.21)-14} fill={rust}>Δy=0.21</text><text x={x(1.1)+18} y={y(1.2)+34} fill={teal}>dy=0.20</text><text x={x(1.04)} y={y(1)+36} fill={teal}>h=0.1</text>
   <text x="110" y="55" fill={rust}>曲线 y=x²</text><text x="110" y="92" fill={teal}>切线 y=1+2(x−1)</text>
  </>:<>
   {!abs&&<path d={curve(M.source)} fill="none" stroke={teal} strokeWidth="3" strokeDasharray="9 7"/>}
   <path d={curve(abs?M.absolute:M.transformed)} fill="none" stroke={rust} strokeWidth="4"/>
   {(abs?[-3,0,2]:[0,1,2]).map(v=><g key={v}><circle cx={x(v)} cy={y(abs?M.absolute(v):M.transformed(v))} r="6" fill={rust}/><text x={x(v)+10} y={y(abs?M.absolute(v):M.transformed(v))-15} fill={ink}>{`(${v},${abs?M.absolute(v):M.transformed(v)})`}</text></g>)}
   <text x="85" y="45" fill={rust}>{abs?'y=|x|':'y=|x−1|'}</text>{!abs&&<text x="85" y="85" fill={teal}>f(x)=x−1（虚线）</text>}
  </>}
 </svg>;
}
