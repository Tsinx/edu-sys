import { economicCurve, economicDomains, economicModels as M, type EconomicMathematicsPlot } from "@edu/course-content/economic-mathematics";
import type { SlideInteractionValues } from "@edu/contracts";
import { useId } from "react";
const fmt=(n:number)=>Number.isFinite(n)?n.toLocaleString("zh-CN",{maximumFractionDigits:2}):"—";
export function EconomicPlot({config,values={},lab}:{config:EconomicMathematicsPlot;values?:SlideInteractionValues;lab?:string}) {
 const clipId=useId();
 if(config.model==="unit-circle")return <UnitCircle angle={config.params?.angle??.65}/>;
 if((config.model==="surface"&&!config.params?.section)||config.model==="plane"||config.model==="profit-contours")return <Surface model={config.model} values={values}/>;
 const p={...config.params,segment:values.segment==="B"?1:0};
 const B=Number(values.budget??config.params?.budget??100);
 const domain=config.model==="budget"?[0,B]:lab==="secant-tangent-lab"?[5,115]:lab==="linearization-error-lab"?[15,100]:config.domain??economicDomains[config.model];
 const [lo,hi]=domain; const fn=(x:number)=>economicCurve(config.model,x,{...p,budget:B});
 const sample=Array.from({length:241},(_,i)=>({x:lo+(hi-lo)*i/240,y:fn(lo+(hi-lo)*i/240)}));
 const ys=sample.map(pt=>pt.y).filter(Number.isFinite);
 let ymin=Math.min(0,...ys), ymax=Math.max(0,...ys); const span=ymax-ymin||1;
 const power=10**Math.floor(Math.log10(span/4)),ratio=span/(4*power),tickStep=(ratio<=1?1:ratio<=2?2:ratio<=5?5:10)*power;
 ymin=Math.floor(ymin/tickStep)*tickStep;ymax=Math.ceil((ymax+span*.08)/tickStep)*tickStep;
 const ticks=Array.from({length:Math.round((ymax-ymin)/tickStep)+1},(_,i)=>ymin+i*tickStep);
 const X=(x:number)=>180+960*(x-lo)/(hi-lo),Y=(y:number)=>470-360*(y-ymin)/(ymax-ymin);
 let path="";let gap=true;for(const pt of sample){if(!Number.isFinite(pt.y)){gap=true;continue;}if(config.model==="threshold"&&pt.x>=99&&pt.x-(hi-lo)/240<99)gap=true;path+=(gap?"M":"L")+X(pt.x)+","+Y(pt.y)+" ";gap=false;}
 const pointX=typeof values.price==="number"?values.price:typeof values.orderAmount==="number"?values.orderAmount:typeof values.n==="number"?values.n:typeof values.channelX==="number"?values.channelX:typeof values.upperBound==="number"?values.upperBound:typeof values.basePrice==="number"?values.basePrice:undefined;
 const point=(x:number,y:number,color="#a64e35",key?:number)=><circle key={key} cx={X(x)} cy={Y(y)} r="8" fill={color}/>;
 const secant=lab==="secant-tangent-lab"||lab==="linearization-error-lab";
 const base=Number(values.basePrice??50),delta=Number(values.h??values.deltaPrice??0),slope=1400-20*base;
 const line=(f:(x:number)=>number,color:string,dash?:string)=><path d={"M"+X(lo)+","+Y(f(lo))+" L"+X(hi)+","+Y(f(hi))} stroke={color} strokeWidth="3" strokeDasharray={dash} fill="none"/>;
 const N=Number(values.partitions??4),dt=8/N,upper=Number(values.upperBound??0),q=1200-10*Number(values.price??60),price=Number(values.price??60);
 const area=Array.from({length:101},(_,i)=>{const x=upper*i/100;return X(x)+","+Y(M.rate(x));}).join(" ");
 return <svg className="em-figure" viewBox="0 0 1250 580" role="img" aria-label={config.xLabel+"与"+config.yLabel+"的模型图"}>
 {ticks.map(y=><g key={y}><line x1="180" x2="1140" y1={Y(y)} y2={Y(y)} stroke="#dcd8cc"/><text x="155" y={Y(y)+10} textAnchor="end">{fmt(y)}</text></g>)}
 <line x1="180" y1="470" x2="1140" y2="470" stroke="#242d2d" strokeWidth="2"/><line x1="180" y1="110" x2="180" y2="470" stroke="#242d2d" strokeWidth="2"/>
 {Array.from({length:5},(_,i)=>{const x=lo+(hi-lo)*i/4;return <text key={i} x={X(x)} y="507" textAnchor="middle">{fmt(x)}</text>;})}
 <text x="180" y="64">{config.yLabel}</text><text x="1140" y="556" textAnchor="end">{config.xLabel}</text>
 <defs><clipPath id={clipId}><rect x="172" y="102" width="976" height="376"/></clipPath></defs>
 <g clipPath={"url(#"+clipId+")"}>
 {lab==="riemann-sum-lab"&&Array.from({length:N},(_,i)=>{const x=i*dt,sx=values.sample==="right"?x+dt:values.sample==="midpoint"?x+dt/2:x;return <rect key={i} x={X(x)} y={Y(M.rate(sx))} width={X(dt)-X(0)} height={Y(0)-Y(M.rate(sx))} fill="#648785" fillOpacity=".24" stroke="#648785"/>;})}
 {lab==="accumulation-limit-lab"&&<polygon points={X(0)+","+Y(0)+" "+area+" "+X(upper)+","+Y(0)} fill="#648785" fillOpacity=".28"/>}
 {lab==="consumer-surplus-lab"&&<><polygon points={X(0)+","+Y(120)+" "+X(q)+","+Y(price)+" "+X(0)+","+Y(price)} fill="#a64e35" fillOpacity=".28"/><line x1={X(0)} x2={X(1200)} y1={Y(price)} y2={Y(price)} stroke="#a64e35" strokeWidth="3"/>{point(q,price)}</>}
 {config.model!=="sequence"&&<path d={path} fill="none" stroke="#466d6e" strokeWidth="5"/>}
 {config.model==="threshold"&&<><circle cx={X(99)} cy={Y(107)} r="8" fill="#f6f3e9" stroke="#466d6e" strokeWidth="3"/>{point(99,99,"#466d6e")}</>}
 {(config.model==="hole"||config.model==="sinc")&&<circle cx={X(config.model==="hole"?1:0)} cy={Y(config.model==="hole"?2:1)} r="9" fill="#f6f3e9" stroke="#466d6e" strokeWidth="3"/>}
 {config.model==="sequence"&&<><line x1={X(lo)} x2={X(hi)} y1={Y(120)} y2={Y(120)} stroke="#a64e35" strokeDasharray="8 6"/><rect x={X(lo)} y={Y(120+Number(values.epsilon??2))} width={X(hi)-X(lo)} height={Y(120-Number(values.epsilon??2))-Y(120+Number(values.epsilon??2))} fill="#a64e35" fillOpacity=".1"/>{Array.from({length:Math.min(100,hi)},(_,i)=>point(i+1,M.sequence(i+1),"#466d6e",i))}</>}
 {secant&&<>{line(x=>M.profit(base)+slope*(x-base),"#a64e35","8 5")}{delta!==0&&line(x=>M.profit(base)+(M.profit(base+delta)-M.profit(base))/delta*(x-base),"#69734c")}{point(base,M.profit(base))}{point(base+delta,M.profit(base+delta))}</>}
 {!secant&&pointX!==undefined&&config.model!=="surplus"&&point(pointX,fn(pointX))}
 {config.model==="budget"&&values.revealOptimum===true&&point(.64*B,M.budgetOptimum(B).value)}
 </g>
 </svg>;
}
function UnitCircle({angle:x}:{angle:number}){
 const R=280,O:[number,number]=[250,470],c=Math.cos(x),s=Math.sin(x),P:[number,number]=[O[0]+R*c,O[1]-R*s],A:[number,number]=[O[0]+R,O[1]],T:[number,number]=[A[0],O[1]-R*Math.tan(x)];
 return <svg className="em-figure" viewBox="0 0 1250 580" role="img" aria-label="单位圆内接三角形、扇形与外接三角形面积比较">
 <polygon points={O+" "+A+" "+T} fill="#a64e35" fillOpacity=".16"/>
 <path d={"M"+O+" L"+A+" A"+R+" "+R+" 0 0 0 "+P+" Z"} fill="#648785" fillOpacity=".28"/>
 <polygon points={O+" "+P+" "+P[0]+","+O[1]} fill="#68744c" fillOpacity=".48"/>
 <path d={"M"+O+" L"+A+" L"+T+" Z M"+O+" L"+P+" M"+P+" L"+P[0]+","+O[1]} fill="none" stroke="#242d2d" strokeWidth="3"/>
 <path d={"M"+A+" A"+R+" "+R+" 0 0 0 "+P} fill="none" stroke="#466d6e" strokeWidth="5"/>
 <path d={"M"+(O[0]+55)+","+O[1]+" A55 55 0 0 0 "+(O[0]+55*c)+","+(O[1]-55*s)} fill="none" stroke="#a64e35" strokeWidth="3"/>
 <text x="210" y="510">O</text><text x={A[0]+15} y="508">A</text><text x={P[0]-30} y={P[1]-20}>P</text><text x={T[0]+15} y={T[1]}>T</text><text x="325" y="450">x</text>
 <text x="260" y="552">半径 = 1；0 &lt; x &lt; π/2（弧度）</text>
 <text x="700" y="185" fill="#68744c">内接三角形：½ sin x cos x</text><text x="700" y="265" fill="#466d6e">扇形：½ x</text><text x="700" y="345" fill="#a64e35">外接三角形：½ tan x</text><text x="700" y="445">内接面积 &lt; 扇形面积 &lt; 外接面积</text>
 </svg>;
}
function Surface({model,values}:{model:string;values:SlideInteractionValues}){
 const clipId=useId();
 const profit=model==="profit-contours",plane=model==="plane",xMax=profit?35:110,xMin=profit?0:20,yMax=profit?30:plane?125:100;
 const X=(x:number)=>130+850*(x-xMin)/(xMax-xMin),Y=(y:number)=>470-350*y/yMax;
 const x=Number(values.x??values.price??values.basePrice??60)+(plane?Number(values.deltaPrice??0):0),y=Number(values.y??values.advertising??values.baseAdvertising??25)+(plane?Number(values.deltaAdvertising??0):0),f=profit?M.twoInputProfit:M.response;
 const grid=Array.from({length:450},(_,i)=>{const ix=i%30,iy=Math.floor(i/30),gx=xMin+(ix+.5)*(xMax-xMin)/30,gy=(iy+.5)*yMax/15,z=f(gx,gy),a=Math.max(.05,Math.min(.88,(z+(profit?500:0))/(profit?1100:1600)));return <rect key={i} x={X(xMin+ix*(xMax-xMin)/30)} y={Y((iy+1)*yMax/15)} width="29" height="24" fill="#466d6e" fillOpacity={a}/>;});
 return <svg className="em-figure" viewBox="0 0 1250 580" role="img" aria-label={profit?"双投入利润等值图":"价格与广告的销量等值图"}>
 {grid}<rect x="130" y="120" width="850" height="350" fill="none" stroke="#242d2d" strokeWidth="2"/>
 <defs><clipPath id={clipId}><rect x="130" y="120" width="850" height="350"/></clipPath></defs>
 <g clipPath={"url(#"+clipId+")"}>{profit?[100,225,400].map(r=><ellipse key={r} cx={X(20)} cy={Y(15)} rx={850*Math.sqrt(r)/35} ry={350*Math.sqrt(r)/30} fill="none" stroke="#faf7ec" strokeWidth="2"/>):[600,840,1080].map(q=>{let d="";for(let a=0;a<=yMax;a++){const p=150+3*Math.sqrt(a)-q/8;d+=(a===0?"M":"L")+X(p)+","+Y(a)+" ";}return <path key={q} d={d} fill="none" stroke="#faf7ec" strokeWidth="2"/>;})}</g>
 <text x="1020" y="90">{profit?"等利润线":"等销量线"}</text>
 <text x="1020" y="135">{profit?"425·300·125":"600·840·1080"}</text>
 {plane&&<g clipPath={"url(#"+clipId+")"}>{[600,840,1080].map(q=>{
  const p0=Number(values.basePrice??60),a0=Number(values.baseAdvertising??25);
  const at=(a:number)=>p0+(M.response(p0,a0)+12/Math.sqrt(a0)*(a-a0)-q)/8;
  return <path key={q} d={"M"+X(at(0))+","+Y(0)+" L"+X(at(yMax))+","+Y(yMax)} fill="none" stroke="#a64e35" strokeWidth="3" strokeDasharray="10 7"/>;
 })}</g>}
 {!profit&&!plane&&values.lockedAxis!=="none"&&<line x1={values.lockedAxis==="price"?X(x):130} x2={values.lockedAxis==="price"?X(x):980} y1={values.lockedAxis==="price"?120:Y(y)} y2={values.lockedAxis==="price"?470:Y(y)} stroke="#a64e35" strokeWidth="3" strokeDasharray="10 7"/>}
 <circle cx={X(x)} cy={Y(y)} r="10" fill="#a64e35" stroke="#fff" strokeWidth="3"/>
 {[0,1,2,3,4].map(i=><g key={i}><text x={X(xMin+(xMax-xMin)*i/4)} y="505" textAnchor="middle">{fmt(xMin+(xMax-xMin)*i/4)}</text><text x="110" y={Y(yMax*i/4)+8} textAnchor="end">{fmt(yMax*i/4)}</text></g>)}
 <text x="130" y="67">{profit?"投入 y（单位）":"广告 a（百元/日）"}</text><text x="980" y="555" textAnchor="end">{profit?"投入 x（单位）":"价格 p（元/件）"}</text>
 <text x="1020" y="190">{plane?"虚线：切平面":"深色：数值较高"}</text><text x="1020" y="270">当前点</text><text x="1020" y="320">{"("+fmt(x)+", "+fmt(y)+")"}</text><text x="1020" y="395">{profit?"利润指数":"销量（件/日）"}</text><text x="1020" y="445">{fmt(f(x,y))}</text>
 </svg>;
}
