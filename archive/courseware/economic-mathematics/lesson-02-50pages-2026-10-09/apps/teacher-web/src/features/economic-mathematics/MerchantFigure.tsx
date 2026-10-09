import { merchantOutcome, type EconomicMathematicsSlideSpec } from '@edu/course-content/economic-mathematics';
import type { SlideInteractionValues } from '@edu/contracts';

export function MerchantFigure({ kind, values = {} }: { kind: NonNullable<EconomicMathematicsSlideSpec['merchantFigure']>; values?: SlideInteractionValues }) {
  const ink = '#202c2d', teal = '#466d6e', rust = '#a64e35';
  if (kind === 'mapping' || kind === 'many-one') {
    const many = kind === 'many-one';
    return <svg className="em-merchant-figure" viewBox="0 0 620 480" role="img" aria-label={many ? '三个不同价格均对应400件实际销量，符合函数定义' : 'A中每个元素对应B中唯一元素，B可以有未被达到的元素'}>
      <defs><marker id={many ? 'merchant-many-arrow' : 'merchant-map-arrow'} markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke={teal}/></marker></defs>
      <ellipse cx="120" cy="260" rx="82" ry="166" fill="#e3e9e0"/><ellipse cx="478" cy="260" rx="102" ry="166" fill="#e9dccb"/>
      <text x="120" y="50" textAnchor="middle">{many ? '价格' : 'A'}</text><text x="478" y="50" textAnchor="middle">{many ? '销量' : 'B'}</text>
      {[160, 260, 360].map((y, i) => <g key={i}><text x="120" y={y + 10} textAnchor="middle">{many ? [50,60,80][i] : ['a','b','c'][i]}</text><path d={`M160 ${y} Q300 ${y} 405 ${many ? 260 : y}`} stroke={teal} fill="none" strokeWidth="3" markerEnd={`url(#${many ? 'merchant-many-arrow' : 'merchant-map-arrow'})`}/></g>)}
      {(many ? [260] : [160,260,360,405]).map((y,i) => <text key={y} x="478" y={y+10} textAnchor="middle" fill={rust}>{many ? '400' : ['α','β','γ','δ'][i]}</text>)}
    </svg>;
  }
  if (kind === 'composition') return <svg className="em-merchant-figure" viewBox="0 0 620 480" role="img" aria-label="价格经过销量函数得到实际履约量，再经过成本函数得到经营成本">
    {['价格 p','销量 S(p)','成本 C₀(S(p))'].map((t,i) => <g key={t}><rect x="75" y={30+i*145} width="470" height="95" fill={i===1?'#e9dccb':'#e3e9e0'}/><text x="310" y={88+i*145} textAnchor="middle">{t}</text>{i<2&&<path d={`M310 ${130+i*145}v35m-9-9l9 9 9-9`} fill="none" stroke={teal} strokeWidth="3"/>}</g>)}
  </svg>;
  if (kind === 'grid') return <svg className="em-merchant-figure" viewBox="0 0 620 480" role="img" aria-label="连续价格与间隔0.5元的实际报价点；局部展示70至72元">
    <text x="30" y="110">连续分析区间</text><line x1="50" x2="570" y1="175" y2="175" stroke={teal} strokeWidth="10"/>
    <text x="30" y="285">实际报价网格（局部）</text><line x1="50" x2="570" y1="350" y2="350" stroke="#a8afa7"/>
    {[70,70.5,71,71.5,72].map((v,i)=><g key={v}><circle cx={60+i*125} cy="350" r="8" fill={rust}/><text x={60+i*125} y="402" textAnchor="middle">{v}</text></g>)}
  </svg>;
  const profit = kind === 'profit', W = 620, H = 480;
  const params = { capacity: Number(values.capacity ?? 400), commission: Number(values.commission ?? .1), fixedCost: Number(values.fixedCost ?? 2000) };
  const samples = Array.from({length: 141}, (_,i)=>merchantOutcome(30+i*.5, params));
  const ymin = profit ? Math.floor(Math.min(0,...samples.map(v=>v.profit))/5000)*5000 : 0;
  const ymax = profit ? Math.max(5000,Math.ceil(Math.max(...samples.map(v=>v.profit))/5000)*5000) : 1000;
  const x=(p:number)=>85+(p-30)/70*490, y=(q:number)=>380-(q-ymin)/(ymax-ymin)*280;
  const curve=(key:'demand'|'sales'|'profit')=>samples.map((v,i)=>(i?'L':'M')+x(v.price).toFixed(2)+' '+y(v[key]).toFixed(2)).join(' ');
  const ticks = profit ? [ymin,(ymin+ymax)/2,ymax] : [0,200,400,600,800,1000];
  const current=merchantOutcome(Number(values.price??80), params);
  return <svg className="em-merchant-figure" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={profit?'给定履约与抽成条件下的分段利润曲线':'潜在需求随价格下降；实际销量受到履约能力限制'}>
    <text x="85" y="40">{profit?'日利润（元）':'数量（件/日）'}</text>
    {ticks.map(t=><g key={t}><line x1="85" x2="575" y1={y(t)} y2={y(t)} stroke="#d1d4ca"/><text x="76" y={y(t)+8} textAnchor="end" className="em-chart-tick">{t}</text></g>)}
    <path d="M85 85V380H585" stroke={ink} fill="none" strokeWidth="2"/>
    {[30,50,80,100].map(t=><text key={t} x={x(t)} y="416" textAnchor="middle" className="em-chart-tick">{t}</text>)}
    <text x="575" y="463" textAnchor="end">价格（元/件）</text>
    {!profit && <path d={curve('demand')} stroke={teal} strokeWidth="4" fill="none" strokeDasharray={kind==='demand'?undefined:'8 6'}/>}
    {kind!=='demand'&&<path d={curve(profit?'profit':'sales')} stroke={rust} strokeWidth="5" fill="none"/>}
    {profit?<><circle cx={x(current.price)} cy={y(current.profit)} r="7" fill={rust}/><line x1={x(current.price)} x2={x(current.price)} y1={y(current.profit)} y2="380" stroke={rust} strokeDasharray="5 5"/></>:<><text x="345" y="75" fill={teal}>虚线：需求</text>{kind!=='demand'&&<text x="95" y={y(params.capacity)-16} fill={rust}>实线：销量</text>}</>}
  </svg>;
}
