import type { ReactNode } from 'react';
import { capacityAt, exactOscillationSample, idealAverage, profitAt, profitQuotient, supplierCost, type EconomicMathematicsLimitFigure } from '@edu/course-content/economic-mathematics';
import type { SlideInteractionValues } from '@edu/contracts';

const ink = '#202c2d', teal = '#466d6e', rust = '#a64e35', pale = '#dce6df', paper = '#f6f3e9';
const fmt = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 3 });
type Range = readonly [number, number];
function Plot({ xRange, yRange, xLabel, yLabel, xTicks, yTicks, children }: { xRange: Range; yRange: Range; xLabel: string; yLabel: string; xTicks: readonly number[]; yTicks: readonly number[]; children: (x: (n: number) => number, y: (n: number) => number) => ReactNode }) {
  const x = (n: number) => 88 + 548 * (n - xRange[0]) / (xRange[1] - xRange[0]);
  const y = (n: number) => 356 - 282 * (n - yRange[0]) / (yRange[1] - yRange[0]);
  return <svg className="em-limit-figure" viewBox="0 0 700 460" role="img" aria-label={xLabel+'与'+yLabel+'的数学图形'}>
    <text x="88" y="30">{yLabel}</text>
    {yTicks.map(t => <g key={t}><line x1="88" x2="636" y1={y(t)} y2={y(t)} stroke="#c6c8be" strokeDasharray="4 8"/><text className="em-chart-tick" x="75" y={y(t)+8} textAnchor="end">{fmt(t)}</text></g>)}
    <line x1="88" x2="636" y1="356" y2="356" stroke={ink} strokeWidth="2"/>
    <line x1="88" x2="88" y1="60" y2="356" stroke={ink} strokeWidth="2"/>
    {xTicks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="356" y2="365" stroke={ink}/><text className="em-chart-tick" x={x(t)} y="396" textAnchor="middle">{fmt(t)}</text></g>)}
    {children(x,y)}
    <text x="636" y="444" textAnchor="end">{xLabel}</text>
  </svg>;
}
function curve(f: (n: number) => number, from: number, to: number, x: (n: number)=>number, y: (n: number)=>number, samples=160) {
  return Array.from({length:samples+1},(_,i)=>{const t=from+(to-from)*i/samples;return (i?'L':'M')+x(t).toFixed(3)+','+y(f(t)).toFixed(3);}).join(' ');
}
function Dot({ x, y, open=false, color=rust }: { x:number;y:number;open?:boolean;color?:string }) { return <circle cx={x} cy={y} r="7" fill={open?paper:color} stroke={color} strokeWidth="3"/>; }

export function LimitFigure({ config, values }: { config: EconomicMathematicsLimitFigure; values: SlideInteractionValues }) {
  const p = config.params ?? {};
  switch (config.kind) {
    case 'profit': {
      const min=p.min??75,max=p.max??85,low=Math.floor(Math.min(profitAt(min),profitAt(max))/1000)*1000;
      return <Plot xRange={[min,max]} yRange={[low,19200]} xLabel="售价（元/件）" yLabel="日利润（元）" xTicks={[min,80,max]} yTicks={[low,18800]}>
        {(x,y)=><><path d={curve(profitAt,min,80,x,y)} fill="none" stroke={teal} strokeWidth="5"/><path d={curve(profitAt,80,max,x,y)} fill="none" stroke={rust} strokeWidth="5"/><Dot x={x(80)} y={y(18800)}/><text x={x(80)+16} y={y(18800)-14}>80元</text></>}
      </Plot>;
    }
    case 'quotient': {
      const base = p.base === 90 ? 90 : 80, range:Range=base===80?[-220,410]:[-360,-320];
      return <Plot xRange={[-1,1]} yRange={range} xLabel="价格增量h（元/件）" yLabel="差商：（元/日）/（元/件）" xTicks={[-1,0,1]} yTicks={base===80?[-160,0,360]:[-350,-340,-330]}>
        {(x,y)=><><path d={curve(h=>profitQuotient(base,h),-.99,-.001,x,y)} stroke={teal} strokeWidth="5" fill="none"/><path d={curve(h=>profitQuotient(base,h),.001,.99,x,y)} stroke={rust} strokeWidth="5" fill="none"/><Dot x={x(0)} y={y(base===80?360:-340)} open color={teal}/><Dot x={x(0)} y={y(base===80?-160:-340)} open/></>}
      </Plot>;
    }
    case 'square-area': {
      const h=p.h??.25,b=280,hpx=b*h,x=100,y=110;
      return <svg className="em-limit-figure" viewBox="0 0 700 460" role="img" aria-label="正增量h的正方形面积分解：1、h、h、h平方">
        <rect x={x} y={y} width={b} height={b} fill={pale} stroke={teal} strokeWidth="3"/>
        <rect x={x+b} y={y} width={hpx} height={b} fill="#e4c1a2" stroke={rust} strokeWidth="3"/>
        <rect x={x} y={y-hpx} width={b} height={hpx} fill="#e4c1a2" stroke={rust} strokeWidth="3"/>
        <rect x={x+b} y={y-hpx} width={hpx} height={hpx} fill={rust}/>
        <text x={x+b/2} y={y+b/2} textAnchor="middle">1</text><text x={x+b+hpx/2} y={y+b/2} textAnchor="middle">h</text>
        <text x={x+b/2} y={y-hpx/2+9} textAnchor="middle">h</text><text x={x+b+hpx/2} y={y-hpx/2+9} textAnchor="middle" style={{fill:'white'}}>h²</text>
        <text x={x+b/2} y={y+b+48} textAnchor="middle">边长1</text><text x="530" y="280">h &gt; 0</text>
      </svg>;
    }
    case 'hole': return <Plot xRange={[-1,1]} yRange={[.8,3.6]} xLabel="输入增量h" yLabel="输出" xTicks={[-1,0,1]} yTicks={[1,2,3]}>
      {(x,y)=><><path d={curve(h=>2+h,-1,1,x,y)} fill="none" stroke={teal} strokeWidth="5"/><Dot x={x(0)} y={y(2)} open/>
        {p.fill===1&&<><Dot x={x(0)} y={60}/><path d={'M'+(x(0)-12)+',95 l24,-12 m-24,24 l24,-12'} stroke={ink} strokeWidth="3"/><text x={x(0)+20} y="59">另补值99（非比例位置）</text></>}
        <text x={x(0)+20} y={y(2)+36}>h=0不参与极限检验</text></>}
    </Plot>;
    case 'error-band': {
      const eps=Number(values.epsilon??p.epsilon??.2),delta=Number(values.delta??p.delta??.2),r=Math.max(.5,eps*1.4,delta*1.4);
      const compactX=delta/r<.24,compactY=eps/r<.2;
      return <Plot xRange={[-r,r]} yRange={[2-r,2+r]} xLabel="非零输入h" yLabel="Q(h)=2+h；目标2" xTicks={compactX?[]:[-delta,0,delta]} yTicks={compactY?[2]:[2-eps,2,2+eps]}>
        {(x,y)=><><rect x="88" y={y(2+eps)} width="548" height={y(2-eps)-y(2+eps)} fill={pale}/>
          <rect x={x(-delta)} y="74" width={x(delta)-x(-delta)} height="282" fill="#e4c1a2" opacity=".45"/>
          <line x1="88" x2="636" y1={y(2+eps)} y2={y(2+eps)} stroke={teal} strokeDasharray="6 7"/><line x1="88" x2="636" y1={y(2-eps)} y2={y(2-eps)} stroke={teal} strokeDasharray="6 7"/>
          <path d={curve(h=>2+h,-r,r,x,y)} fill="none" stroke={ink} strokeWidth="4"/>
          <Dot x={x(0)} y={y(2)} open/><text x="100" y="58">横带：输出误差　竖带：输入范围</text>
          {compactX&&<>
            {[-delta,0,delta].map(t=><line key={t} x1={x(t)} x2={x(t)} y1="356" y2="365" stroke={ink}/>)}
            <text className="em-chart-tick" x={x(-delta)-8} y="396" textAnchor="end">{fmt(-delta)}</text>
            <text className="em-chart-tick" x={x(0)} y="419" textAnchor="middle">0</text>
            <text className="em-chart-tick" x={x(delta)+8} y="396" textAnchor="start">{fmt(delta)}</text>
          </>}
          {compactY&&<><text className="em-chart-tick" x="100" y={y(2+eps)-12}>{'2+ε = '+fmt(2+eps)}</text><text className="em-chart-tick" x="100" y={y(2-eps)+30}>{'2−ε = '+fmt(2-eps)}</text></>}
        </>}
      </Plot>;
    }
    case 'sign': return <Plot xRange={[-1,1]} yRange={[-1.5,1.5]} xLabel="非零输入h" yLabel="|h|/h" xTicks={[-1,0,1]} yTicks={[-1,0,1]}>
      {(x,y)=><><line x1={x(-1)} x2={x(0)} y1={y(-1)} y2={y(-1)} stroke={teal} strokeWidth="5"/><line x1={x(0)} x2={x(1)} y1={y(1)} y2={y(1)} stroke={rust} strokeWidth="5"/><Dot x={x(0)} y={y(-1)} open color={teal}/><Dot x={x(0)} y={y(1)} open/></>}
    </Plot>;
    case 'oscillation-samples': {
      const family=p.family===1?1:0;
      return <Plot xRange={[0,1]} yRange={[-.15,1.3]} xLabel="正输入h；两组均靠近0" yLabel="精确采样值（不连线）" xTicks={[0,.5,1]} yTicks={[0,1]}>
        {(x,y)=><>{[0,...(family===1?[1]:[])].map(f=>Array.from({length:32},(_,i)=>{const s=exactOscillationSample(f as 0|1,i+1);return <Dot key={f+'-'+i} x={x(s.h)} y={y(s.value)} color={f?rust:teal}/>;}))}<text x="110" y="58">{family===0?'h=1/n：输出恒0':'h=1/(2n+1/2)：输出恒1'}</text></>}
      </Plot>;
    }
    case 'sequence': {
      const min=p.minN??1,max=p.maxN??20,eps=p.epsilon;
      return <Plot xRange={[min,max]} yRange={min>1?[1.97,2.04]:[1.9,3.1]} xLabel="正整数编号n" yLabel="aₙ=2+1/n（离散点）" xTicks={min>1?[40,50,60]:[1,10,20]} yTicks={min>1?[2,2.02,2.04]:[2,2.5,3]}>
        {(x,y)=><>{eps&&<rect x="88" y={y(2+eps)} width="548" height={y(2-eps)-y(2+eps)} fill={pale}/>}<line x1="88" x2="636" y1={y(2)} y2={y(2)} stroke={teal} strokeDasharray="6 7"/>{Array.from({length:max-min+1},(_,i)=><Dot key={i} x={x(i+min)} y={y(2+1/(i+min))}/>)}</>}
      </Plot>;
    }
    case 'capacity': {
      const selected=Number(values.n??p.n??8),eps=Number(values.epsilon??10);
      return <Plot xRange={[0,30]} yRange={[390,510]} xLabel="已实施周数n（整数）" yLabel="日能力Kₙ（件/日）" xTicks={[0,10,20,30]} yTicks={[400,450,500]}>
        {(x,y)=><><rect x="88" y={y(500+Math.min(eps,10))} width="548" height={y(500-eps)-y(500+Math.min(eps,10))} fill={pale}/><line x1="88" x2="636" y1={y(500)} y2={y(500)} stroke={teal} strokeDasharray="6 7"/>
          {Array.from({length:31},(_,n)=><Dot key={n} x={x(n)} y={y(capacityAt(n))} color={n===selected?rust:teal}/>)}
          <text x="250" y="53">目标500：每一有限周仍在其下</text></>}
      </Plot>;
    }
    case 'counter-sequences': return <Plot xRange={[1,10]} yRange={[-2,11]} xLabel="整数编号n" yLabel="两组不同数列（不连线）" xTicks={[1,5,10]} yTicks={[-1,1,10]}>
      {(x,y)=><>{Array.from({length:10},(_,i)=><g key={i}><Dot x={x(i+1)} y={y((-1)**(i+1))} color={teal}/><Dot x={x(i+1)} y={y(i+1)}/></g>)}<text x="350" y="52">青：(-1)ⁿ　赭：n</text></>}
    </Plot>;
    case 'contract': {
      const combined=p.view===1,range:Range=combined?[500,3500]:[470,530],yr:Range=combined?[13000,70000]:[13200,15800];
      return <Plot xRange={range} yRange={yr} xLabel="批量q（件/批）" yLabel="总成本（元/批）" xTicks={combined?[500,1500,2500,3500]:[470,500,530]} yTicks={combined?[14000,40000,65000]:[14000,15000]}>
        {(x,y)=><>{combined?<><path d={curve(q=>supplierCost('A',q),500,3500,x,y)} stroke={teal} strokeWidth="5" fill="none"/><path d={curve(q=>supplierCost('B',q),500,3500,x,y)} stroke={rust} strokeWidth="5" strokeDasharray="10 8" fill="none"/><text x="350" y="52">实线A　虚线B</text></>:<><path d={curve(q=>5000+20*q,470,500,x,y)} stroke={teal} strokeWidth="5" fill="none"/><path d={curve(q=>supplierCost('A',q),500,530,x,y)} stroke={rust} strokeWidth="5" fill="none"/><Dot x={x(500)} y={y(15000)} open color={teal}/><Dot x={x(500)} y={y(14000)}/></>}</>}
      </Plot>;
    }
    case 'average-cost': {
      const extended=p.view===1,max=extended?50000:10000;
      return <Plot xRange={[500,max]} yRange={[17.5,29]} xLabel="批量q（件/批）" yLabel="平均成本（元/件）" xTicks={extended?[500,10000,50000]:[500,5000,10000]} yTicks={[18,23,28]}>
        {(x,y)=><><path d={curve(q=>idealAverage('A',q),500,10000,x,y,260)} stroke={teal} strokeWidth="5" fill="none"/>{extended&&<path d={curve(q=>idealAverage('A',q),10000,max,x,y)} stroke={rust} strokeWidth="5" strokeDasharray="10 8" fill="none"/>}<line x1="88" x2="636" y1={y(18)} y2={y(18)} stroke={ink} strokeDasharray="4 8"/><text x="260" y="52">{extended?'实线：实际　虚线：另设延伸':'实际范围至10000件'}</text></>}
      </Plot>;
    }
    case 'reciprocal': return <Plot xRange={[-1,1]} yRange={[-10,10]} xLabel="非零输入x" yLabel="实线1/x²；虚线1/x" xTicks={[-1,0,1]} yTicks={[-10,0,10]}>
      {(x,y)=><>{[-1,1].map(s=><g key={s}><path d={curve(t=>1/t**2,s<0?-1:1/Math.sqrt(10),s<0?-1/Math.sqrt(10):1,x,y)} stroke={teal} strokeWidth="4" fill="none"/><path d={curve(t=>1/t,s<0?-1:.1,s<0?-.1:1,x,y)} stroke={rust} strokeWidth="4" strokeDasharray="8 7" fill="none"/><path d={s<0?'M358,348 l8,12 l8,-12':'M382,84 l8,-12 l8,12'} fill="none" stroke={rust} strokeWidth="3"/></g>)}<text x="240" y="52">只显示有限高度，向外继续</text></>}
    </Plot>;
    case 'squeeze': {
      // Unresolved central oscillations are not rendered as an aliased fake curve.
      return <Plot xRange={[-.6,.6]} yRange={[-.4,.4]} xLabel="非零输入x" yLabel="r(x)与解析上下界" xTicks={[-.6,0,.6]} yTicks={[-.36,0,.36]}>
        {(x,y)=><><path d={curve(t=>t*t,-.6,.6,x,y)} stroke={teal} strokeWidth="3" fill="none"/><path d={curve(t=>-t*t,-.6,.6,x,y)} stroke={teal} strokeWidth="3" fill="none"/>
          <path d={curve(t=>t*t*Math.sin(Math.PI/t),-.6,-.035,x,y,1400)} stroke={rust} strokeWidth="2" fill="none"/><path d={curve(t=>t*t*Math.sin(Math.PI/t),.035,.6,x,y,1400)} stroke={rust} strokeWidth="2" fill="none"/>
          <text x="205" y="52">中心细振荡省略；全部点由±x²约束</text><Dot x={x(0)} y={y(0)} open/></>}
      </Plot>;
    }
    case 'unit-circle': {
      const a=p.angle??.6,cx=150,cy=340,r=245,px=cx+r*Math.cos(a),py=cy-r*Math.sin(a);
      return <svg className="em-limit-figure" viewBox="0 0 700 460" role="img" aria-label="第一象限单位圆、弧度角h、弧长h与纵向正弦长度">
        <path d={'M'+(cx+r)+','+cy+' A'+r+','+r+' 0 0 0 '+cx+','+(cy-r)} fill="none" stroke={teal} strokeWidth="4"/>
        <path d={'M'+cx+','+(cy-r-20)+' V'+cy+' H'+(cx+r+70)} stroke={ink} strokeWidth="2" fill="none"/>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={rust} strokeWidth="4"/><line x1={px} y1={py} x2={px} y2={cy} stroke={teal} strokeWidth="3"/>
        <path d={'M'+(cx+60)+','+cy+' A60,60 0 0 0 '+(cx+60*Math.cos(a))+','+(cy-60*Math.sin(a))} stroke={rust} strokeWidth="3" fill="none"/>
        <text x={cx+68} y={cy-17}>h</text><text x={px+18} y={py+65}>sin h</text><text x={px-140} y={py+38}>半径1</text>
        <path d={'M'+(cx+r)+','+cy+' A'+r+','+r+' 0 0 0 '+px+','+py} fill="none" stroke={rust} strokeWidth="7"/>
        <text x="460" y="180">弧长h</text><text x="150" y="420">0 &lt; h &lt; π/2，h以弧度计</text>
      </svg>;
    }
  }
}
