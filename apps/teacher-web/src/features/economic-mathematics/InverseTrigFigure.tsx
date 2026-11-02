import {integralModel as M} from '@edu/course-content/economic-mathematics';
import type {SlideInteractionValues} from '@edu/contracts';

export function InverseTrigFigure({kind,values,pageKey}:{kind:'tangent-branch'|'arctan'|'arcsin';values:SlideInteractionValues;pageKey:string}){
 const showTangent=Object.hasOwn(values,'arctanX'),tan=kind==='tangent-branch',asin=kind==='arcsin',rust='#a64e35',teal='#466d6e',gray='#899991';
 const [xmin,xmax,ymin,ymax]=tan?[-1.9,1.9,-4,4]:asin?[-1.3,1.3,-1.9,1.9]:[-4.4,4.4,-1.9,1.9];
 const L=88,R=704,T=88,B=412,X=(x:number)=>L+(x-xmin)/(xmax-xmin)*(R-L),Y=(y:number)=>B-(y-ymin)/(ymax-ymin)*(B-T),clip='inverse-trig-'+pageKey;
 const path=(f:(x:number)=>number,from:number,to:number,color=rust,dashed=false)=>{
  const d=Array.from({length:321},(_,i)=>{const x=from+(to-from)*i/320;return `${i?'L':'M'}${X(x).toFixed(3)},${Y(f(x)).toFixed(3)}`;}).join(' ');
  return <path d={d} fill="none" stroke={color} strokeWidth={4} strokeDasharray={dashed?'8 7':undefined} clipPath={`url(#${clip})`}/>;
 };
 const x=asin ? .5 : Number(values.arctanX??1),y=asin?M.arcsin(x)!:M.arctan(x),slope=asin?M.arcsinDerivative(x)!:M.arctanDerivative(x);
 const xticks:readonly(readonly[number,string])[]=tan?[[-Math.PI/2,'−π/2'],[-Math.PI/4,'−π/4'],[0,'0'],[Math.PI/4,'π/4'],[Math.PI/2,'π/2']]:asin?[[-1,'−1'],[0,'0'],[1,'1']]:[[-4,'−4'],[-2,'−2'],[0,'0'],[2,'2'],[4,'4']];
 const yticks:readonly(readonly[number,string])[]=tan?[[-3,'−3'],[-1,'−1'],[0,'0'],[1,'1'],[3,'3']]:[[-Math.PI/2,'−π/2'],[-Math.PI/4,'−π/4'],[0,'0'],[Math.PI/4,'π/4'],[Math.PI/2,'π/2']];
 const title=tan?'正切在选定区间严格递增':asin?'反正弦：端点有值，内部可导':showTangent?'反正切：主值角与局部斜率':'反正切的主值范围';
 const legend=tan?'仅取 −π/2<θ<π/2':asin?'实心端点：arcsin(±1)=±π/2':'定义域ℝ；主值角 −π/2<y<π/2';
 return <svg className="em-integral-figure" viewBox="0 0 760 510" role="img" aria-label={title+'。'+legend}>
  <defs><clipPath id={clip}><rect x={L} y={T} width={R-L} height={B-T}/></clipPath></defs>
  <text x={L} y={34} fontWeight={600}>{title}</text>
  {xticks.map(([v,label])=><g key={label}><line x1={X(v)} x2={X(v)} y1={T} y2={B} stroke="#dfe0d6"/><text className="em-integral-tick" x={X(v)} y={B+33} textAnchor="middle">{label}</text></g>)}
  {yticks.map(([v,label])=><g key={label}><line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="#dfe0d6"/><text className="em-integral-tick" x={L-12} y={Y(v)+9} textAnchor="end">{label}</text></g>)}
  <line x1={L} x2={R} y1={Y(0)} y2={Y(0)} stroke={gray} strokeWidth={2}/><line x1={X(0)} x2={X(0)} y1={T} y2={B} stroke={gray} strokeWidth={2}/>
  <text x={L} y={T-15}>{tan?'正切值 x':'y（弧度）'}</text><text x={R+12} y={B+33}>{tan?'θ':'x'}</text>
  {tan?<>
   {[-Math.PI/2,Math.PI/2].map(v=><line key={v} x1={X(v)} x2={X(v)} y1={T} y2={B} stroke={teal} strokeDasharray="7 7"/>)}
   {path(Math.tan,-Math.PI/2+.01,Math.PI/2-.01)}<circle cx={X(Math.PI/4)} cy={Y(1)} r={6} fill={rust}/>
  </>:<>
   {!asin&&[-Math.PI/2,Math.PI/2].map(v=><line key={v} x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke={teal} strokeDasharray="7 7"/>)}
   {path(asin?Math.asin:M.arctan,asin?-1:xmin,asin?1:xmax)}
   {!asin&&showTangent&&path(t=>y+slope*(t-x),x-.65,x+.65,teal,true)}
   <circle cx={X(x)} cy={Y(y)} r={7} fill={rust}/>
   {asin&&[-1,1].map(v=><circle key={v} cx={X(v)} cy={Y(Math.asin(v))} r={6} fill={rust}/>)}
  </>}
  <text x={L} y={492}>{legend}</text>
 </svg>;
}
