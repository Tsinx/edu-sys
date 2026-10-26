import {useId,type ReactNode} from 'react';
import {analysisModels as M,meanValueEvidence,costBoundEvidence,cauchyEvidence as C,type EconomicMathematicsAnalysisFigure as Figure} from '@edu/course-content/economic-mathematics';
import type {SlideInteractionValues as Values} from '@edu/contracts';
const ink='#202c2d',teal='#466d6e',rust='#a64e35',paper='#f6f3e9';
const num=(n:number)=>Math.abs(n)<1e-10?'0':Number(n.toPrecision(5)).toString();
function path(f:(x:number)=>number,a:number,b:number,X:(n:number)=>number,Y:(n:number)=>number,n=320){
 return Array.from({length:n+1},(_,i)=>{const x=a+(b-a)*i/n;return `${i?'L':'M'}${X(x).toFixed(3)},${Y(f(x)).toFixed(3)}`;}).join(' ');
}
function Graph({a,b,lo,hi,title,label,xLabel='x',children}:{a:number;b:number;lo:number;hi:number;title:string;label:string;xLabel?:string;children:(X:(n:number)=>number,Y:(n:number)=>number)=>ReactNode}){
 const id=useId(),X=(x:number)=>130+470*(x-a)/(b-a),Y=(y:number)=>350-265*(y-lo)/(hi-lo),zero=Math.max(lo,Math.min(hi,0));
 return <svg className="em-limit-figure em-analysis-figure" viewBox="0 0 700 450" role="img" aria-label={label}>
 <defs><clipPath id={id}><rect x="120" y="75" width="490" height="285"/></clipPath></defs>
 <text x="70" y="42">{title}</text><path d={`M130,${Y(zero)} H600 M130,85 V350`} stroke={ink} strokeWidth="2" fill="none"/>
 {[0,.5,1].map(t=><g key={t} className="em-analysis-tick"><text x={X(a+(b-a)*t)} y="390" textAnchor="middle">{num(a+(b-a)*t)}</text><text x="112" y={Y(lo+(hi-lo)*t)+8} textAnchor="end">{num(lo+(hi-lo)*t)}</text></g>)}
 <g clipPath={`url(#${id})`}>{children(X,Y)}</g><text x="600" y="433" textAnchor="end">{xLabel}</text></svg>;
}
export function AnalysisFigure({config,values}:{config:Figure;values:Values}){
 if(config.kind==='mvt'){
  const m=meanValueEvidence(config,values),{a,b}=m,fa=m.f(a),fb=m.f(b),cut=m.point,fc=m.f(cut);
  return <Graph a={a} b={b} lo={m.range[0]} hi={m.range[1]} title={m.label} label={`${m.label}，割线斜率${num(m.average)}，当前切点${num(cut)}，${m.slope===null?'当前无有限导数':'切线斜率'+num(m.slope)}`}>{(X,Y)=><>
   <path d={path(x=>fa+m.average*(x-a),a,b,X,Y)} stroke={ink} strokeWidth="3" strokeDasharray="10 8" fill="none"/>
   <path d={path(m.f,a,m.key==='endpoint-jump'?b-1e-8:b,X,Y)} stroke={teal} strokeWidth="5" fill="none"/>
   {m.slope!==null&&<path d={path(x=>fc+m.slope!*(x-cut),a,b,X,Y)} stroke={rust} strokeWidth="3" fill="none"/>}
   <circle cx={X(a)} cy={Y(fa)} r="6" fill={ink}/><circle cx={X(b)} cy={Y(fb)} r="6" fill={ink}/>
   {m.key==='endpoint-jump'&&<circle cx={X(b)} cy={Y(1)} r="7" fill={paper} stroke={teal} strokeWidth="3"/>}
   <circle cx={X(cut)} cy={Y(fc)} r="7" fill={rust}/>
   {!!config.params?.roots&&Array.isArray(m.roots)&&m.roots.map(x=><circle key={x} cx={X(x)} cy={Y(m.f(x))} r="11" fill="none" stroke={rust} strokeWidth="3"/>)}
  </>}</Graph>;
 }
 if(config.kind==='auxiliary')return <Graph a={1} b={3} lo={-1.5} hi={.5} title="H(x)=x²−4x+3" label="平方函数减去割线所得辅助函数，1和3处均为0，2处为负1">{(X,Y)=><>
  <path d={path(M.auxiliary,1,3,X,Y)} stroke={teal} strokeWidth="5" fill="none"/>{[1,3].map(x=><circle key={x} cx={X(x)} cy={Y(0)} r="7" fill={ink}/>)}<text x="280" y="138">两端均为0</text>
 </>}</Graph>;
 if(config.kind==='cost-bound'){
  const h=Number(values.boundIncrement??config.params?.h??10),e=costBoundEvidence(h);if(!e)return null;
  return <Graph a={0} b={20} lo={0} hi={510} title="成本增量与保证范围" label={`增产${h}件，下界${num(e.lower)}元，实际${num(e.actual)}元，上界${num(e.upper)}元`} xLabel="增产量h（件）">{(X,Y)=><>
   <path d={path(k=>costBoundEvidence(k)!.lower,0,20,X,Y)+path(k=>costBoundEvidence(k)!.upper,20,0,X,Y).replace(/^M/,'L')+' Z'} fill={teal} fillOpacity=".12"/>
   <path d={path(k=>costBoundEvidence(k)!.lower,0,20,X,Y)} stroke={teal} strokeWidth="3" strokeDasharray="7 7" fill="none"/>
   <path d={path(k=>costBoundEvidence(k)!.upper,0,20,X,Y)} stroke={teal} strokeWidth="3" strokeDasharray="7 7" fill="none"/>
   <path d={path(k=>costBoundEvidence(k)!.actual,0,20,X,Y)} stroke={rust} strokeWidth="4" fill="none"/>
   <line x1={X(h)} x2={X(h)} y1={Y(0)} y2={Y(e.upper)} stroke={ink} strokeWidth="2"/>
   <circle cx={X(h)} cy={Y(e.actual)} r="7" fill={rust}/><text x="120" y="120">虚线：上下界</text><text x="120" y="162" fill={rust}>实线：实际增量</text>
  </>}</Graph>;
 }
 if(config.kind==='domain-gap')return <Graph a={-2} b={2} lo={-.5} hi={1.5} title="0不在定义域中" label="负半轴函数值为0，正半轴函数值为1，零处两端均为空心点">{(X,Y)=><>
  <path d={`M${X(-2)},${Y(0)} H${X(0)} M${X(0)},${Y(1)} H${X(2)}`} stroke={teal} strokeWidth="5" fill="none"/>
  {[0,1].map(y=><circle key={y} cx={X(0)} cy={Y(y)} r="8" fill={paper} stroke={teal} strokeWidth="3"/>)}<text x="130" y="142">左右分别恒定</text>
 </>}</Graph>;
 if(config.kind==='cauchy'){
  const X=(x:number)=>90+510*(x-1.45)/.15,common=Boolean(config.params?.common),current=Number(values.commonPoint??C.common);
  const points:[string,number,string][]=[['g单独的中值点',C.individualG,teal],['f单独的中值点',C.individualF,ink],...(common?[['共同位置14/9',C.common,rust] as [string,number,string]]:[])];
  return <svg className="em-limit-figure em-analysis-figure" viewBox="0 0 700 450" role="img" aria-label={`f=x³、g=x²在1到2，分别的中值点是根号括号七除以三，与三除以二${common?'，共同导数比位置为十四除以九':''}`}>
   <text x="70" y="44">f=x³，g=x²；区间[1,2]</text><text x="70" y="92">下方放大1.45—1.60的横坐标</text>
   {points.map(([name,x,color],i)=><g key={name}><line x1="90" x2="600" y1={155+i*85} y2={155+i*85} stroke="#c6c8be" strokeWidth="2"/><circle cx={X(x)} cy={155+i*85} r="8" fill={color}/><text x="90" y={190+i*85} fill={color}>{name}：{num(x)}</text></g>)}
   {common&&<path d={`M${X(current)},135 V335`} stroke={rust} strokeDasharray="6 6" strokeWidth="2"/>}
   {[1.45,1.5,1.55,1.6].map(x=><text key={x} x={X(x)} y="420" textAnchor="middle">{x}</text>)}
  </svg>;
 }
 if(config.kind==='quotient-oscillation'){
  const witness=Boolean(config.params?.witness),n=Math.max(1,Math.min(100,Math.round(Number(values.witnessN??4))));
  if(witness)return <svg className="em-limit-figure em-analysis-figure" viewBox="0 0 700 450" role="img" aria-label={`两列正输入的序号n=${n}，原商均为1，导数商精确地分别为0与2`}>
   <text x="65" y="45">两列都趋0，比较同一表达式</text><text x="65" y="101">n={n}</text>
   <line x1="315" x2="315" y1="128" y2="410" stroke="#c6c8be" strokeWidth="2"/>
   <text x="65" y="165">xₙ=1/(2πn)</text><text x="350" y="165">yₙ=1/((2n+1)π)</text>
   <text x="65" y="230">原商：1</text><text x="350" y="230">原商：1</text>
   <circle cx="140" cy="320" r="44" fill={teal} fillOpacity=".15"/><circle cx="430" cy="320" r="44" fill={rust} fillOpacity=".15"/>
   <text x="140" y="330" textAnchor="middle">0</text><text x="430" y="330" textAnchor="middle">2</text><text x="65" y="407">导数商的精确值不同</text>
  </svg>;
  const scale=Math.max(1,Math.min(1000,Number(values.oscillationScale??1))),upper=.4/scale;
  return <Graph a={0} b={upper} lo={1-upper*1.2} hi={1+upper*1.2} title="原商始终在1±|x|的带内" label={`正侧0到${num(upper)}，原商1+x sin(1/x)在理论误差带内，采样折线仅作观察`}>{(X,Y)=><>
   <path d={`M${X(0)},${Y(1)} L${X(upper)},${Y(1+upper)} L${X(upper)},${Y(1-upper)} Z`} fill={teal} fillOpacity=".14"/>
   <path d={path(x=>M.quotient(x)!,upper/500,upper,X,Y,500)} stroke={rust} strokeWidth="3" fill="none"/>
   <line x1={X(0)} x2={X(upper)} y1={Y(1)} y2={Y(1)} stroke={ink} strokeDasharray="6 6"/>
  </>}</Graph>;
 }
 if(config.kind==='tail-bound')return <Graph a={2} b={50} lo={0} hi={.5} title="ln x/x：比例减小" label="输入从2增至50时，对数除以x的比值在e之后下降，图形只提供观察，尾部界给出证明">{(X,Y)=><path d={path(x=>M.logRatio(x)!,2,50,X,Y)} stroke={teal} strokeWidth="5" fill="none"/>}</Graph>;
 return null;
}
