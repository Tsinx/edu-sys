import {integralMethodModel as M} from '@edu/course-content/economic-mathematics';
export function SubstitutionFigure({kind,pageKey}:{kind:'substitution-fold'|'substitution-branch';pageKey:string}){
 const branch=kind==='substitution-branch',rust='#a64e35',teal='#466d6e',gray='#9ca6a0';
 const L=88,R=710,T=96,B=420,X=(x:number)=>L+(x+2.2)/4.4*(R-L),Y=(y:number)=>B-y/4.8*(B-T),clip='method-square-'+pageKey;
 const curve=(a:number,b:number,color:string,dash=false)=><path d={Array.from({length:181},(_,i)=>{const x=a+(b-a)*i/180;return`${i?'L':'M'}${X(x)},${Y(M.square(x))}`;}).join(' ')} fill="none" stroke={color} strokeWidth={4} strokeDasharray={dash?'9 7':undefined} clipPath={`url(#${clip})`}/>;
 const title=branch?'x=t²：正支给出唯一反解':'u=x²：两个输入可有同一个值';
 return <svg className="em-integral-figure" viewBox="0 0 760 530" role="img" aria-label={title+(branch?'。t>0，x>0，t=√x；0不在所选区间。':'。x=−1与x=1都映到u=1；零点导数为0。')}>
  <defs><clipPath id={clip}><rect x={L} y={T} width={R-L} height={B-T}/></clipPath></defs>
  <text x={L} y={36} fontWeight={600}>{title}</text>
  {[-2,-1,0,1,2].map(x=><g key={'x'+x}><line x1={X(x)} x2={X(x)} y1={T} y2={B} stroke="#dfe0d6"/><text x={X(x)} y={B+31} textAnchor="middle">{x}</text></g>)}
  {[0,1,4].map(y=><g key={'y'+y}><line x1={L} x2={R} y1={Y(y)} y2={Y(y)} stroke="#dfe0d6"/><text x={L-14} y={Y(y)+8} textAnchor="end">{y}</text></g>)}
  <line x1={X(0)} x2={X(0)} y1={T} y2={B} stroke={gray} strokeWidth={2}/><line x1={L} x2={R} y1={B} y2={B} stroke={gray} strokeWidth={2}/>
  <text x={R+17} y={B+31}>{branch?'t':'x'}</text><text x={L-10} y={T-19}>{branch?'x':'u'}</text>
  {branch?<>{curve(-2.1,-.001,gray,true)}{curve(.001,2.1,rust)}<circle cx={X(0)} cy={Y(0)} r={7} fill="#f6f3e9" stroke={rust} strokeWidth={3}/><circle cx={X(1)} cy={Y(M.square(1))} r={7} fill={rust}/></>:<>{curve(-2.1,2.1,rust)}<line x1={X(-1)} x2={X(1)} y1={Y(1)} y2={Y(1)} stroke={teal} strokeDasharray="7 6"/>{[-1,1].map(x=><circle key={x} cx={X(x)} cy={Y(M.square(x))} r={7} fill={teal}/>)}<circle cx={X(0)} cy={Y(0)} r={7} fill={rust}/></>}
  <text x={L} y={490}>{branch?'选t>0：t=√x，且所选区间不含0':'同一u值不妨碍第一类换元的链式求导'}</text>
 </svg>;
}
