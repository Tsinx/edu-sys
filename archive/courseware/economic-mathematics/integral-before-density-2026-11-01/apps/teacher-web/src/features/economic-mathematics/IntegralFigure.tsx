import {integralModel as M,type EconomicMathematicsIntegralFigure} from '@edu/course-content/economic-mathematics';
import type {SlideInteractionValues} from '@edu/contracts';

/** Curves are explicit mathematical models, shared with readouts and verification. */
export function IntegralFigure({config,values={},step=0,pageKey}:{config:EconomicMathematicsIntegralFigure;values?:SlideInteractionValues;step?:number;pageKey:string}){
 const kind=config.kind,c=Number(values.primitiveC??config.constant??0),x0=Number(values.primitiveX??1);
 const teal='#466d6e',rust='#a64e35',gray='#9ca6a0',ink='#202c2d';
 const range:readonly[number,number,number,number]=kind==='domain-gap'?[-2,2,-2,3]:kind==='gap-family'?[-2,2,-2,7]:kind==='same-family'?[-3.3,3.3,-1.5,1.5]:kind==='point-match'?[-1,1.6,-2,8]:kind==='absolute-integrand'?[-2,2,-.6,2.8]:kind==='absolute-primitive'?[-2,2,-2.7+c,3+c]:kind==='positive-derivative'?[-.15,1.15,-2.5,1.5]:[-2.2,2.2,-4,8];
 const [xmin,xmax,ymin,ymax]=range,L=78,R=710,T=82,B=418;
 const X=(x:number)=>L+(x-xmin)/(xmax-xmin)*(R-L),Y=(y:number)=>B-(y-ymin)/(ymax-ymin)*(B-T);
 const clip='integral-clip-'+pageKey;
 const curve=(f:(x:number)=>number,a=xmin,b=xmax,color=rust,dash=false)=>{
  const points=Array.from({length:241},(_,i)=>{const x=a+(b-a)*i/240;return `${i?'L':'M'}${X(x).toFixed(3)},${Y(f(x)).toFixed(3)}`;}).join(' ');
  return <path d={points} fill="none" stroke={color} strokeWidth={4} strokeDasharray={dash?'9 8':undefined} clipPath={`url(#${clip})`}/>;
 };
 const dot=(x:number,y:number,open=false,color=rust)=><circle cx={X(x)} cy={Y(y)} r={7} fill={open?'#f6f3e9':color} stroke={color} strokeWidth={3}/>;
 const xticks=kind==='positive-derivative'?[0,.5,1]:kind==='same-family'?[-3,-1.5,0,1.5,3]:[-2,-1,0,1,2].filter(n=>n>=xmin&&n<=xmax);
 const yticks=kind==='same-family'?[-1,0,1]:kind==='positive-derivative'?[-2,-1,0,1]:kind==='domain-gap'?[-1,0,1,2]:kind==='absolute-integrand'?[0,1,2]:kind==='absolute-primitive'?[-2+c,c,2+c]:[-2,0,2,4,6].filter(n=>n>=ymin&&n<=ymax);
 let title='',legend='',art;
 if(kind==='family'||kind==='fixed-point'){
  title=kind==='family'?'同一横坐标，切线斜率相同':'曲线必须经过给定点';
  const references=[-2,0,3].filter(k=>k!==c).join('、').replaceAll('-','−');
  legend=kind==='family'?`灰：C=${references}　赭红：当前 C=${c}`:step>=2?'所选曲线：F(x)=x²+3':'灰色曲线：三个候选原函数';
  art=<>{[-2,0,3].map(k=><g key={k}>{curve(x=>M.family(x,k),xmin,xmax,gray)}{kind==='family'&&<>{curve(x=>M.family(x0,k)+M.derivative(x0)*(x-x0),x0-.4,x0+.4,teal)}{dot(x0,M.family(x0,k),false,teal)}</>}</g>)}
   {kind==='family'&&<>{curve(x=>M.family(x,c))}{curve(x=>M.family(x0,c)+M.derivative(x0)*(x-x0),x0-.4,x0+.4,rust)}{dot(x0,M.family(x0,c))}<line x1={X(x0)} x2={X(x0)} y1={T} y2={B} stroke={gray} strokeDasharray="5 8"/></>}
   {kind==='fixed-point'&&<>{step>=2&&curve(x=>M.family(x,3))}{dot(1,4)}<text x={X(1)+14} y={Y(4)-18}>(1,4)</text></>}
  </>;
 }else if(kind==='point-match'){
  title='一点相等，其他点可以不同';legend='青灰：f(x)=2x    赭红：G′(x)=3x²';
  art=<>{curve(x=>2*x,xmin,xmax,teal)}{curve(x=>3*x*x)}{dot(0,0)}{dot(1,2,false,teal)}{dot(1,3)}<line x1={X(1)} x2={X(1)} y1={Y(2)} y2={Y(3)} stroke={gray} strokeDasharray="6 6"/></>;
 }else if(kind==='domain-gap'||kind==='gap-family'){
  const gap=kind==='domain-gap';title=gap?'每段导数为零，常数可以不同':'每段导数相同，常数可以独立';legend='空心点：x=0 不属于定义域';
  art=<>{curve(x=>gap?M.gapConstant(x)!:M.family(x,-1),-2,-.001,teal)}{curve(x=>gap?M.gapConstant(x)!:M.family(x,2),.001,2)}{dot(0,-1,true,teal)}{dot(0,2,true)}<line x1={X(0)} x2={X(0)} y1={T} y2={B} stroke={gray} strokeDasharray="5 8"/></>;
 }else if(kind==='same-family'){
  title='两条原函数曲线相差固定高度';legend='青灰：sin²x    赭红：−cos²x';
  art=<>{curve(x=>Math.sin(x)**2,xmin,xmax,teal)}{curve(x=>-(Math.cos(x)**2))}<line x1={X(.7)} x2={X(.7)} y1={Y(Math.sin(.7)**2)} y2={Y(-(Math.cos(.7)**2))} stroke={ink} strokeDasharray="5 5"/><text x={X(.7)+12} y={Y(0)}>相差1</text></>;
 }else if(kind==='absolute-integrand'){
  title='给定的导函数 f(x)=|x|';legend='零点有尖角，f在此不可导';
  art=<>{curve(M.absoluteIntegrand,xmin,xmax,teal)}{dot(0,0,false,teal)}</>;
 }else if(kind==='absolute-primitive'){
  title='原函数在零点仍有导数';legend=`F(x)=x|x|/2${c>=0?'+':''}${c}，零点切线水平`;
  art=<>{curve(x=>M.absolutePrimitive(x,c))}{curve(()=>c,-.65,.65,teal,true)}{dot(0,c)}</>;
 }else{
  title='导数为正，原函数仍可全为负';legend='青灰：f(x)=1    赭红：F(x)=x−2';
  art=<>{curve(()=>1,0,1,teal)}{curve(x=>x-2,0,1)}{dot(0,1,true,teal)}{dot(1,1,true,teal)}{dot(0,-2,true)}{dot(1,-1,true)}</>;
 }
 return <svg className="em-integral-figure" viewBox="0 0 760 510" role="img" aria-label={title+'。'+legend}>
  <defs><clipPath id={clip}><rect x={L} y={T} width={R-L} height={B-T}/></clipPath></defs>
  <text x={L} y={35} fontWeight={600}>{title}</text>
  {xticks.map(x=><g key={'x'+x}><line x1={X(x)} x2={X(x)} y1={T} y2={B} stroke="#dfe0d6"/><text className="em-integral-tick" x={X(x)} y={B+32} textAnchor="middle">{x}</text></g>)}
  {yticks.map(y=><g key={'y'+y}><line x1={L} x2={R} y1={Y(y)} y2={Y(y)} stroke="#dfe0d6"/><text className="em-integral-tick" x={L-14} y={Y(y)+8} textAnchor="end">{y}</text></g>)}
  {ymin<=0&&ymax>=0&&<line x1={L} x2={R} y1={Y(0)} y2={Y(0)} stroke={gray} strokeWidth={2}/>}
  {xmin<=0&&xmax>=0&&<line x1={X(0)} x2={X(0)} y1={T} y2={B} stroke={gray} strokeWidth={2}/>}
  <text x={R+15} y={B+32}>x</text><text x={L-12} y={T-15}>y</text>
  {art}<text x={L} y={493}>{legend}</text>
 </svg>;
}
