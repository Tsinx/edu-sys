import { merchantOutcome, MERCHANT_MAPPING_EXAMPLES, type EconomicMathematicsSlideSpec } from '@edu/course-content/economic-mathematics';
import type { SlideInteractionValues } from '@edu/contracts';

export function MerchantFigure({ kind, values = {} }: { kind: NonNullable<EconomicMathematicsSlideSpec['merchantFigure']>; values?: SlideInteractionValues }) {
  const ink = '#202c2d', teal = '#466d6e', rust = '#a64e35';
  if (kind === 'mapping-types') return <svg className="em-merchant-figure" viewBox="0 0 1410 270" role="img" aria-label="三个有限映射：左图不同输入有不同像，但B中1000没有原像；中图B中400有三个原像；右图B中每个元素恰有一个原像。箭头来自同一商家模型。">
    <defs><marker id="merchant-types-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke={teal}/></marker></defs>
    {MERCHANT_MAPPING_EXAMPLES.map((example, i) => <g key={i} transform={`translate(${i * 470} 0)`}>
      <text x="235" y="27" textAnchor="middle">{['需求 D：单射、非满射','销量 S：满射、非单射','需求 D：双射'][i]}</text>
      <ellipse cx="75" cy="135" rx="57" ry="98" fill="#e3e9e0"/>
      <ellipse cx="358" cy={example.codomain.length === 1 ? 130 : 160} rx="78" ry={example.codomain.length === 1 ? 47 : 107} fill="#e9dccb"/>
      <text x="75" y="62" textAnchor="middle">A</text><text x="358" y="62" textAnchor="middle">B</text>
      {example.domain.map((p, j) => {
        const inputY = 95 + j * 50, outputY = example.codomain.length === 1 ? 130 : 95 + example.codomain.indexOf(example.images[j]!) * 50;
        return <g key={p}><text x="75" y={inputY + 9} textAnchor="middle">{p}</text><path d={`M116 ${inputY} Q220 ${inputY} 290 ${outputY}`} stroke={teal} strokeWidth="3" fill="none" markerEnd="url(#merchant-types-arrow)"/></g>;
      })}
      {example.codomain.map((q, j) => <text key={q} x="358" y={(example.codomain.length === 1 ? 130 : 95 + j * 50) + 9} textAnchor="middle" fill={example.images.includes(q) ? rust : teal}>{q}</text>)}
    </g>)}
  </svg>;
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
  if (kind === 'inverse') {
    const x = (q: number) => 85 + (q - 200) / 700 * 490;
    const y = (p: number) => 380 - (p - 30) / 70 * 280;
    return <svg className="em-merchant-figure" viewBox="0 0 620 480" role="img" aria-label="需求的反函数：横轴需求200至900件每日，纵轴价格30至100元每件；300件对应90元">
      <text x="85" y="40">价格（元/件）</text>
      {[30,50,80,100].map(p => <g key={p}><line x1="85" x2="575" y1={y(p)} y2={y(p)} stroke="#d1d4ca"/><text x="76" y={y(p)+8} textAnchor="end" className="em-chart-tick">{p}</text></g>)}
      <path d="M85 85V380H585" stroke={ink} fill="none" strokeWidth="2"/>
      {[200,400,700,900].map(q => <text key={q} x={x(q)} y="416" textAnchor="middle" className="em-chart-tick">{q}</text>)}
      <path d={`M${x(200)} ${y(100)}L${x(900)} ${y(30)}`} stroke={teal} strokeWidth="4" fill="none"/>
      <circle cx={x(300)} cy={y(90)} r="7" fill={rust}/><text x={x(300)+18} y={y(90)-14}>300件 → 90元</text>
      <text x="575" y="463" textAnchor="end">需求（件/日）</text>
    </svg>;
  }
  if (kind === 'expansion') {
    const prices = Array.from({length:141},(_,i) => 30+i*.5);
    const x = (p: number) => 85+(p-30)/70*490, y = (v: number) => 380-v/20000*280;
    const curve = (capacity: number) => prices.map((p,i) => `${i?'L':'M'}${x(p).toFixed(2)} ${y(merchantOutcome(p,{capacity}).profit).toFixed(2)}`).join(' ');
    return <svg className="em-merchant-figure" viewBox="0 0 620 480" role="img" aria-label="固定成本暂保持2000元每日，比较能力400与500件的利润曲线，分界从80元变为70元">
      <text x="85" y="40">日利润（元）</text>
      {[0,10000,20000].map(v => <g key={v}><line x1="85" x2="575" y1={y(v)} y2={y(v)} stroke="#d1d4ca"/><text x="76" y={y(v)+8} textAnchor="end" className="em-chart-tick">{v}</text></g>)}
      <path d="M85 85V380H585" stroke={ink} fill="none" strokeWidth="2"/>
      {[30,50,70,80,100].map(p => <text key={p} x={x(p)} y="416" textAnchor="middle" className="em-chart-tick">{p}</text>)}
      <path d={curve(400)} stroke={teal} strokeWidth="4" strokeDasharray="8 6" fill="none"/><path d={curve(500)} stroke={rust} strokeWidth="4" fill="none"/>
      <text x="100" y="75" fill={teal}>虚线：能力400</text><text x="360" y="75" fill={rust}>实线：能力500</text>
      <text x="575" y="463" textAnchor="end">价格（元/件）</text>
    </svg>;
  }
  const profit = kind === 'profit', W = 620, H = 480;
  const params = { capacity: Number(values.capacity ?? 400), commission: Number(values.commission ?? .1), fixedCost: Number(values.fixedCost ?? 2000) };
  const samples = Array.from({length: 141}, (_,i)=>merchantOutcome(30+i*.5, params));
  const ymin = profit ? Math.floor(Math.min(0,...samples.map(v=>v.profit))/5000)*5000 : 0;
  const ymax = profit ? Math.max(5000,Math.ceil(Math.max(...samples.map(v=>v.profit))/5000)*5000) : 1000;
  const x=(p:number)=>85+(p-30)/70*490, y=(q:number)=>380-(q-ymin)/(ymax-ymin)*280;
  const curve=(key:'demand'|'sales'|'profit')=>samples.map((v,i)=>(i?'L':'M')+x(v.price).toFixed(2)+' '+y(v[key]).toFixed(2)).join(' ');
  const ticks = profit ? [ymin,(ymin+ymax)/2,ymax] : [0,200,400,600,800,1000];
  const current=merchantOutcome(Number(values.price??80), params);
  return <svg className="em-merchant-figure" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={profit?'给定履约与抽成条件下的分段利润曲线':'价格上升时需求下降；实际销量受到交付能力限制'}>
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
