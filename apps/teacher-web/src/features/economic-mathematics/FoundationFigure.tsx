import { useId, type ReactNode } from 'react';
import { foundationBisection, foundationModels as M, calculusValue, calculusEvidence, type CalculusCurve, type EconomicMathematicsFoundationFigure } from '@edu/course-content/economic-mathematics';
import type { SlideInteractionValues } from '@edu/contracts';
import {DifferentiationFigure} from './DifferentiationFigure';

const ink='#202c2d',teal='#466d6e',rust='#a64e35';
const path=(f:(x:number)=>number,a:number,b:number,X:(n:number)=>number,Y:(n:number)=>number,n=400)=>Array.from({length:n+1},(_,i)=>{const x=a+(b-a)*i/n;return `${i?'L':'M'}${X(x).toFixed(2)},${Y(f(x)).toFixed(2)}`;}).join(' ');
function Chart({domain,range,children,label,xLabel='x',yLabel='函数值'}:{domain:readonly[number,number];range:readonly[number,number];children:(X:(n:number)=>number,Y:(n:number)=>number)=>ReactNode;label:string;xLabel?:string;yLabel?:string}) {
  const id=useId(),X=(n:number)=>95+530*(n-domain[0])/(domain[1]-domain[0]),Y=(n:number)=>370-285*(n-range[0])/(range[1]-range[0]);
  const axisX=Math.max(domain[0],Math.min(domain[1],0)),axisY=Math.max(range[0],Math.min(range[1],0));
  return <svg className="em-limit-figure" viewBox="0 0 700 470" role="img" aria-label={label}>
    <defs><clipPath id={id}><rect x="94" y="84" width="532" height="287"/></clipPath></defs>
    <text x="95" y="42">{yLabel}</text>
    <path d={`M95,${Y(axisY)} H625 M${X(axisX)},85 V370`} fill="none" stroke={ink} strokeWidth="2"/>
    {[0,.5,1].map(t=><g key={t}><text className="em-chart-tick" x={95+530*t} y="405" textAnchor="middle">{Number((domain[0]+t*(domain[1]-domain[0])).toFixed(2))}</text><text className="em-chart-tick" x="78" y={370-285*t+8} textAnchor="end">{Number((range[0]+t*(range[1]-range[0])).toFixed(2))}</text></g>)}
    <g clipPath={`url(#${id})`}>{children(X,Y)}</g><text x="625" y="448" textAnchor="end">{xLabel}</text>
  </svg>;
}
const Dot=({x,y,open=false}:{x:number;y:number;open?:boolean})=><circle cx={x} cy={y} r="7" fill={open?'#f6f3e9':rust} stroke={rust} strokeWidth="3"/>;
export function FoundationFigure({config,values}:{config:EconomicMathematicsFoundationFigure;values:SlideInteractionValues}) {
  if(['product-increment','marginal-average','chain','inverse-derivative','implicit-circle','higher-rate','higher-corner','differential-error'].includes(config.kind))return <DifferentiationFigure config={config} values={values}/>;
  const p=config.params??{};
  switch(config.kind){
    case 'derivative': {
      const model:CalculusCurve=(['square','absolute','cube','cube-root'] as const)[p.mode??0]??'square',a=p.base??1,h=Number(values.increment??p.h??.5),m=calculusEvidence(model,a,h);
      const square=model==='square',domain:readonly[number,number]=square?[-.5,2.5]:[-1.5,1.5],range:readonly[number,number]=square?[-.5,6.5]:model==='absolute'?[-.3,1.8]:model==='cube'?[-2,2]:[-1.5,1.5];
      return <Chart domain={domain} range={range} label={square?(p.namedTangent===1?'平方函数基点1附近的切线':'平方函数基点1附近的割线与参考直线'):model==='absolute'?'绝对值函数零处连续而有尖角':model==='cube'?'立方函数零处切线穿过曲线':'立方根零处连续，差商没有有限极限'}>
        {(X,Y)=><><path d={path(x=>calculusValue(model,x),domain[0],domain[1],X,Y,600)} stroke={teal} strokeWidth="4" fill="none"/>
          {square&&h!==0&&m.quotient!==null&&<path d={`M${X(domain[0])},${Y(m.y+m.quotient*(domain[0]-a))} L${X(domain[1])},${Y(m.y+m.quotient*(domain[1]-a))}`} stroke={rust} strokeWidth="3" fill="none"/>}
          {p.tangent===1&&m.derivative!==null&&<path d={`M${X(domain[0])},${Y(m.y+m.derivative*(domain[0]-a))} L${X(domain[1])},${Y(m.y+m.derivative*(domain[1]-a))}`} stroke={ink} strokeDasharray="8 7" strokeWidth="2" fill="none"/>}
          {model==='cube-root'&&<line x1={X(0)} x2={X(0)} y1="85" y2="370" stroke={rust} strokeDasharray="8 7" strokeWidth="3"/>}
          <Dot x={X(a)} y={Y(m.y)}/>{square&&h!==0&&<Dot x={X(a+h)} y={Y(m.next)}/>}
          <text x="115" y="115">{square?(h===0?'h=0：差商没有定义':p.namedTangent===1?'虚线：切线，斜率2':'赭红：割线；虚线：参考斜率2'):model==='absolute'?'零处接上，两边方向不同':model==='cube'?'f′(0)=0；切线为y=0':'连续；没有有限实数导数'}</text>
        </>}
      </Chart>;
    }
    case 'sided': {
      const jump=p.jump??0,center=p.center??3;
      return <Chart domain={[-1,1]} range={[-.2,3.5]} label={jump?'两侧分别趋于1与2的分段函数':'两段直线共同趋于1，零处函数值另行规定'}>
        {(X,Y)=><><path d={path(x=>1+x,-1,-.002,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><path d={path(x=>1+jump+2*x,.002,1,X,Y)} fill="none" stroke={rust} strokeWidth="4"/>
          <line x1={X(-1)} x2={X(1)} y1={Y(1)} y2={Y(1)} stroke={teal} strokeDasharray="6 7"/>
          <Dot x={X(0)} y={Y(1)} open/>{jump!==0&&<Dot x={X(0)} y={Y(1+jump)} open/>}<Dot x={X(0)} y={Y(center)}/>
          <text x={X(0)+16} y={Y(center)-12}>f(0)={center}</text><text x={X(-.85)} y={Y(.35)}>1+x</text><text x={X(.25)} y={Y(1+jump+.65)}>{jump?'2+2x':'1+2x'}</text></>}
      </Chart>;
    }
    case 'far': return <Chart domain={[-8,8]} range={[.5,3.5]} label="函数2加x的倒数在正负远端均靠近水平线2">
      {(X,Y)=><><line x1={X(-8)} x2={X(8)} y1={Y(2)} y2={Y(2)} stroke={ink} strokeDasharray="6 7"/>
        <path d={path(x=>2+1/x,-8,-.7,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><path d={path(x=>2+1/x,.7,8,X,Y)} fill="none" stroke={rust} strokeWidth="4"/>
        <text x={X(3)} y={Y(2)-18}>目标：2</text></>}
    </Chart>;
    case 'angle': {
      const a=Number(values.angle??p.angle??.6),stage=p.stage??3,cx=100,cy=385,r=270;
      const bx=cx+r*Math.cos(a),by=cy-r*Math.sin(a),ax=cx+r,ty=cy-r*Math.tan(a);
      return <svg className="em-limit-figure" viewBox="0 0 700 470" role="img" aria-label="单位圆中内侧三角形OAB包含于扇形OAB，扇形包含于外侧三角形OAT">
        {stage>=2&&<><path d={`M${cx},${cy} L${ax},${cy} L${ax},${ty} Z`} fill={rust} fillOpacity=".08" stroke={rust} strokeWidth="2"/><path d={`M${cx},${cy} L${ax},${cy} A${r},${r} 0 0 0 ${bx},${by} Z`} fill={teal} fillOpacity=".18"/><path d={`M${cx},${cy} L${ax},${cy} L${bx},${by} Z`} fill={teal} fillOpacity=".24" stroke={teal} strokeWidth="2"/></>}
        <path d={`M${cx},80 V${cy} H440 M${ax},65 V${cy}`} fill="none" stroke={ink} strokeWidth="2"/>
        <path d={`M${ax},${cy} A${r},${r} 0 0 0 ${cx},${cy-r}`} fill="none" stroke={teal} strokeWidth="3"/>
        <path d={`M${cx},${cy} L${bx},${by}${stage>=1?' L'+ax+','+ty:''}`} fill="none" stroke={rust} strokeWidth="3"/>
        <path d={`M${ax},${cy} A${r},${r} 0 0 0 ${bx},${by}`} fill="none" stroke={rust} strokeWidth="6"/>
        {stage>=1&&<line x1={bx} y1={by} x2={bx} y2={cy} stroke={teal} strokeWidth="3"/>}
        <text x={cx-32} y={cy+34}>O</text><text x={ax+12} y={cy+34}>A</text><text x={bx-27} y={by-18}>B</text>{stage>=1&&<text x={ax+15} y={ty-12}>T</text>}
        <path d={`M${cx+60},${cy} A60,60 0 0 0 ${cx+60*Math.cos(a)},${cy-60*Math.sin(a)}`} stroke={rust} strokeWidth="2" fill="none"/>
        <text x="175" y="366">x</text><text x="465" y="145">半径 1</text><text x="465" y="195">弧长 x</text>
        {stage>=1&&<><text x="465" y="245">竖直长 sin x</text><text x="465" y="295">切线长 tan x</text></>}
        <text x="100" y="450">0 &lt; x &lt; π/2；角度以弧度计</text>
      </svg>;
    }
    case 'sinc': return <Chart domain={[-3,3]} range={[0,1.4]} label="正弦除以x在零处的极限为1，原函数在零处空心" yLabel="sin x / x">{(X,Y)=><><path d={path(x=>Math.sin(x)/x,-3,-.002,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><path d={path(x=>Math.sin(x)/x,.002,3,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(0)} y={Y(1)} open/><text x={X(.3)} y={Y(1)+36}>极限1；零处未定义</text></>}</Chart>;
    case 'equivalence': return <Chart domain={[0,.5]} range={[0,.55]} label="x与sin x在小角度时相对接近，但不恒等">{(X,Y)=><><path d={path(x=>x,0,.5,X,Y)} fill="none" stroke={rust} strokeWidth="3" strokeDasharray="8 6"/><path d={path(Math.sin,0,.5,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><text x="135" y="115">虚线：x</text><text x="135" y="150">实线：sin x</text></>}</Chart>;
    case 'compound': {
      const rate=Number(values.nominalRate??.12),current=Number(values.compoundCount??12),max=Math.exp(rate),ns=[1,2,4,12,365,10000];
      return <Chart domain={[0,4]} range={[1,Math.max(1.02,max*1.015)]} label="同一名义利率下各计息次数的增长因子，横轴为计息次数的十进对数" xLabel="log₁₀ n（n为年计息次数）" yLabel="一年增长因子">{(X,Y)=><><line x1={X(0)} x2={X(4)} y1={Y(max)} y2={Y(max)} stroke={rust} strokeDasharray="8 6" strokeWidth="2"/>{ns.map(n=><circle key={n} cx={X(Math.log10(n))} cy={Y(M.compound(rate,n))} r={n===current?9:5} fill={n===current?rust:teal}/>)}<text x="125" y="120">虚线：eʳ</text></>}</Chart>;
    }
    case 'continuity': {
      const mode=p.mode??0,b=Number(values.pointValue??p.point??3);
      if(mode===0)return <Chart domain={[-1,3]} range={[-.5,4.5]} label="直线x加1在x等于1处留洞，另绘指定点值">{(X,Y)=><><path d={path(x=>x+1,-1,3,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(1)} y={Y(2)} open/>{p.hole!==1&&<Dot x={X(1)} y={Y(b)}/>}<text x="120" y="120">空心点：附近极限2</text><text x="120" y="157">{p.hole===1?'原式在1处未定义':'实心点：f(1)='+b}</text></>}</Chart>;
      if(mode===1)return <Chart domain={[-1,1]} range={[-1.5,1.5]} label="零点左侧负1右侧正1的跳跃间断">{(X,Y)=><><path d={`M${X(-1)},${Y(-1)} H${X(0)} M${X(0)},${Y(1)} H${X(1)}`} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(0)} y={Y(-1)} open/><Dot x={X(0)} y={Y(1)}/></>}</Chart>;
      if(mode===2)return <Chart domain={[-1,1]} range={[0,10]} label="一除以x平方在零两侧趋于正无穷，曲线超出纵轴显示范围">{(X,Y)=><><path d={path(x=>1/(x*x),-1,-.03,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><path d={path(x=>1/(x*x),.03,1,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><text x="140" y="120">零附近曲线超出显示范围</text></>}</Chart>;
      return <Chart domain={[-2,2]} range={[-.3,2.3]} label="绝对值函数零处连续而有折角">{(X,Y)=><><path d={path(Math.abs,-2,2,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(0)} y={Y(0)}/><text x="130" y="120">左右接上，方向不同</text></>}</Chart>;
    }
    case 'contract':{
      const mode=p.mode??0,f=mode===0?M.contractA:M.contractB;
      return <Chart domain={[85,115]} range={[800,1500]} label={mode===0?'全量折扣总货款在100千克跳跃':'增量折扣总货款在100千克连续但有折角'} xLabel="采购重量 q（千克）" yLabel="总货款（元）">{(X,Y)=><><path d={path(x=>f(x)!,85,99.999,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><path d={path(x=>f(x)!,100,115,X,Y)} fill="none" stroke={rust} strokeWidth="4"/>{mode===0&&<Dot x={X(100)} y={Y(1200)} open/>}<Dot x={X(100)} y={Y(mode===0?1000:1200)}/><line x1={X(100)} x2={X(100)} y1="85" y2="370" stroke={ink} strokeDasharray="5 6"/><text x="120" y="120">门槛：100千克</text></>}</Chart>;
    }
    case 'queue':return <Chart domain={[0,120]} range={[0,65]} label="平均逗留时间60除以120减q，在q接近120时趋于正无穷" xLabel="到达率 q（单/小时）" yLabel="平均逗留时间（分钟）">{(X,Y)=><><path d={path(x=>M.queue(x)!,0,119.5,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><line x1={X(120)} x2={X(120)} y1="85" y2="370" stroke={rust} strokeWidth="3" strokeDasharray="8 6"/><text x="130" y="120">q &lt; 120；不跨过容量边界</text></>}</Chart>;
    case 'ivt':{
      const jump=p.jump===1;
      return <Chart domain={[0,1]} range={[-1.3,1.3]} label={jump?'端点异号但跳跃的函数不取零值':'连续三次函数从负到正经过零'}>{(X,Y)=>jump?<><path d={`M${X(0)},${Y(-1)} H${X(.5)} M${X(.5)},${Y(1)} H${X(1)}`} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(.5)} y={Y(-1)} open/><Dot x={X(.5)} y={Y(1)}/></>:<><path d={path(M.rootFunction,0,1,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(.6823278038)} y={Y(0)}/></>}</Chart>;
    }
    case 'bisection':{
      const b=foundationBisection(Number(values.bisectionSteps??0));
      return <Chart domain={[0,1]} range={[-1.2,1.2]} label="二分保留区间的两端函数值异号，宽度逐次减半">{(X,Y)=><><rect x={X(b.a)} y="85" width={X(b.b)-X(b.a)} height="285" fill={teal} fillOpacity=".12"/><path d={path(M.rootFunction,0,1,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(b.a)} y={Y(b.left)}/><Dot x={X(b.b)} y={Y(b.right)}/><text x="125" y="120">阴影：保留区间</text></>}</Chart>;
    }
    case 'extreme':{
      const open=p.mode===1;
      return <Chart domain={[0,open?1:2]} range={[-.2,1.2]} label={open?'开区间上的恒等函数取不到两端上界和下界':'闭区间连续函数取得最大值和最小值'}>{(X,Y)=><><path d={path(open?x=>x:x=>x*(2-x),0,open?1:2,X,Y)} fill="none" stroke={teal} strokeWidth="4"/><Dot x={X(0)} y={Y(0)} open={open}/><Dot x={X(open?1:2)} y={Y(open?1:0)} open={open}/>{!open&&<Dot x={X(1)} y={Y(1)}/>}</>}</Chart>;
    }
    case 'oscillation':{
      const damped=p.damped===1,f=(x:number)=>M.oscillation(x,damped)!;
      return <Chart domain={[-.5,.5]} range={[-1.2,1.2]} label={damped?'振荡幅度被正负绝对值x夹住，中心细节省略':'正弦倒数在零附近持续振荡，中心细节省略'}>{(X,Y)=><>{damped&&<><path d={path(x=>Math.abs(x),-.5,.5,X,Y)} stroke={rust} strokeDasharray="6 5" fill="none"/><path d={path(x=>-Math.abs(x),-.5,.5,X,Y)} stroke={rust} strokeDasharray="6 5" fill="none"/><Dot x={X(0)} y={Y(0)}/></>}<path d={path(f,-.5,-.008,X,Y,1800)} stroke={teal} strokeWidth="2" fill="none"/><path d={path(f,.008,.5,X,Y,1800)} stroke={teal} strokeWidth="2" fill="none"/><text x="110" y="110">|x| &lt; 0.008 的细节省略</text></>}</Chart>;
    }
  }
}
