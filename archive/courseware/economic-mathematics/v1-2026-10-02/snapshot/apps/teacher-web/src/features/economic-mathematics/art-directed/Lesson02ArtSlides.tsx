import type { EconomicMathematicsSlideSpec } from "@edu/course-content/economic-mathematics";
import type { SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import katex from "katex";
import { useMemo, type CSSProperties, type ReactNode } from "react";

export interface Lesson02ArtSlidesProps {
  spec: EconomicMathematicsSlideSpec;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}

type Tone = "red" | "cyan" | "green" | "amber" | "ink";

function MathText({
  tex,
  block = false,
  className = "",
  label
}: {
  tex: string;
  block?: boolean;
  className?: string;
  label?: string;
}) {
  const html = useMemo(
    () => katex.renderToString(tex, {
      displayMode: block,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml"
    }),
    [block, tex]
  );
  const Tag = block ? "div" : "span";
  return (
    <Tag
      aria-label={label ?? tex}
      className={`l02-math ${block ? "l02-math--block" : "l02-math--inline"} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SlideFrame({
  spec,
  tone = "ink",
  mode = "paper",
  children
}: {
  spec: EconomicMathematicsSlideSpec;
  tone?: Tone;
  mode?: "paper" | "night" | "linen" | "mint";
  children: ReactNode;
}) {
  return (
    <article className={`l02-slide l02-slide--${mode} l02-slide--${tone} l02-slide--s${String(spec.localIndex).padStart(2, "0")}`}>
      <header className="l02-header">
        <div className="l02-header__lesson"><b>经济数学</b><span>02</span><em>{spec.section}</em></div>
        <div className="l02-header__progress"><i style={{ "--progress": `${(spec.localIndex / 47) * 100}%` } as CSSProperties} /><span>{String(spec.localIndex).padStart(2, "0")} / 47</span></div>
      </header>
      <main className="l02-stage">{children}</main>
      <footer className="l02-footer"><span>{spec.sourceLabel}</span><b>山城新饮 · 定价模型工作坊</b></footer>
    </article>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="l02-kicker">{children}</p>;
}

function BigTitle({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <h1 className={narrow ? "l02-title l02-title--narrow" : "l02-title"}>{children}</h1>;
}

function Prompt({ children, number }: { children: ReactNode; number?: string }) {
  return <div className="l02-prompt">{number && <span>{number}</span>}<p>{children}</p></div>;
}

function PriceTag({ price, color = "red", caption }: { price: number; color?: Tone; caption?: string }) {
  return (
    <div className={`l02-price-tag l02-price-tag--${color}`}>
      <span>{caption ?? "售价"}</span>
      <strong>¥{price}</strong>
      <i>元 / 杯</i>
      <b aria-hidden="true" />
    </div>
  );
}

function Receipt({ title, rows, total, tone = "ink" }: {
  title: string;
  rows: readonly [string, ReactNode][];
  total?: readonly [string, ReactNode];
  tone?: Tone;
}) {
  return (
    <section className={`l02-receipt l02-receipt--${tone}`}>
      <div className="l02-receipt__holes" aria-hidden="true" />
      <h2>{title}</h2>
      <div className="l02-receipt__rule" />
      {rows.map(([label, value]) => <div className="l02-receipt__row" key={label}><span>{label}</span><b>{value}</b></div>)}
      {total && <div className="l02-receipt__total"><span>{total[0]}</span><strong>{total[1]}</strong></div>}
    </section>
  );
}

function DemandPlot({ prices = [], showLine = true, segment = "A" }: { prices?: readonly number[]; showLine?: boolean; segment?: "A" | "B" }) {
  const a = segment === "A" ? 1200 : 900;
  const b = segment === "A" ? 10 : 6;
  const maxP = segment === "A" ? 120 : 150;
  return (
    <figure className="l02-plot l02-demand-plot">
      <svg viewBox="0 0 760 510" role="img" aria-label={`客群${segment}价格与预测销量关系图`}>
        <defs>
          <linearGradient id={`l02-demand-fill-${segment}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#1fa7a2" stopOpacity=".28"/><stop offset="1" stopColor="#1fa7a2" stopOpacity="0"/></linearGradient>
          <filter id={`l02-demand-glow-${segment}`}><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path className="l02-axis" d="M92 40V430H710" />
        {[0, 300, 600, 900, 1200].map((q) => {
          const y = 430 - q / 1200 * 360;
          return <g key={q}><path className="l02-grid" d={`M92 ${y}H710`} /><text className="l02-svg-label" x="74" y={y + 8} textAnchor="end">{q}</text></g>;
        })}
        {[0, 20, 40, 60, 80, 100, 120].map((p) => {
          const x = 92 + p / 120 * 600;
          return <g key={p}><path className="l02-grid" d={`M${x} 70V430`} /><text className="l02-svg-label" x={x} y="468" textAnchor="middle">{p}</text></g>;
        })}
        {showLine && <>
          <path className="l02-demand-fill" fill={`url(#l02-demand-fill-${segment})`} d={`M92 70L${92 + Math.min(maxP, 120) / 120 * 600} ${430 - Math.max(0, a - b * Math.min(maxP, 120)) / 1200 * 360}V430H92Z`} />
          <path className="l02-curve l02-curve--cyan" d={`M92 70L${92 + Math.min(maxP, 120) / 120 * 600} ${430 - Math.max(0, a - b * Math.min(maxP, 120)) / 1200 * 360}`} />
        </>}
        {prices.map((p) => {
          const q = Math.max(0, a - b * p);
          const x = 92 + p / 120 * 600;
          const y = 430 - q / 1200 * 360;
          return <g key={p} filter={`url(#l02-demand-glow-${segment})`}><path className="l02-guide" d={`M${x} 430V${y}H92`} /><circle className="l02-dot" cx={x} cy={y} r="11"/><text className="l02-svg-value" x={x + 18} y={y - 18}>{p}元 · {q}杯</text></g>;
        })}
        <text className="l02-axis-title" x="400" y="505" textAnchor="middle">价格（元 / 杯）</text>
        <text className="l02-axis-title" x="22" y="244" transform="rotate(-90 22 244)" textAnchor="middle">预测销量（杯 / 日）</text>
      </svg>
    </figure>
  );
}

function RevenuePlot({ prices = [] }: { prices?: readonly number[] }) {
  const point = (p: number) => ({ x: 90 + p / 120 * 610, y: 430 - (1200 * p - 10 * p * p) / 36000 * 340 });
  const path = Array.from({ length: 61 }, (_, i) => i * 2).map((p, i) => `${i ? "L" : "M"}${point(p).x} ${point(p).y}`).join(" ");
  return (
    <figure className="l02-plot l02-revenue-plot"><svg viewBox="0 0 760 510" role="img" aria-label="价格与销售收入曲线">
      <defs><linearGradient id="l02-revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d94435" stopOpacity=".3"/><stop offset="1" stopColor="#d94435" stopOpacity="0"/></linearGradient></defs>
      <path className="l02-axis" d="M90 50V430H710" />
      {[0, 10000, 20000, 30000, 36000].map((r) => { const y = 430 - r / 36000 * 340; return <g key={r}><path className="l02-grid" d={`M90 ${y}H710`}/><text className="l02-svg-label" x="74" y={y+8} textAnchor="end">{r/1000}k</text></g>; })}
      {[0,20,40,60,80,100,120].map((p) => { const x=90+p/120*610; return <text className="l02-svg-label" x={x} y="468" textAnchor="middle" key={p}>{p}</text>; })}
      <path className="l02-revenue-fill" d={`${path} L700 430L90 430Z`} fill="url(#l02-revenue-fill)"/>
      <path className="l02-curve l02-curve--red" d={path}/>
      {prices.map((p) => { const pt=point(p); const r=1200*p-10*p*p; return <g key={p}><path className="l02-guide" d={`M${pt.x} 430V${pt.y}H90`}/><circle className="l02-dot l02-dot--red" cx={pt.x} cy={pt.y} r="11"/><text className="l02-svg-value" x={pt.x+14} y={pt.y-16}>{p}元 · ¥{r.toLocaleString()}</text></g>; })}
      <text className="l02-axis-title" x="400" y="505" textAnchor="middle">价格（元 / 杯）</text><text className="l02-axis-title" x="23" y="240" transform="rotate(-90 23 240)" textAnchor="middle">销售收入（元 / 日）</text>
    </svg></figure>
  );
}

function ProfitPlot({ price, segment = "A", showBreakEven = false, showMarker = true }: { price?: number; segment?: "A" | "B"; showBreakEven?: boolean; showMarker?: boolean }) {
  const demandA = segment === "A" ? 1200 : 900;
  const slope = segment === "A" ? 10 : 6;
  const profit = (p: number) => (p - 20) * (demandA - slope * p) - 2000;
  const x = (p: number) => 88 + p / 120 * 620;
  const y = (pi: number) => 415 - (pi + 4000) / 30000 * 330;
  const path = Array.from({ length: 61 }, (_, i) => i * 2).map((p, i) => `${i ? "L" : "M"}${x(p)} ${y(profit(p))}`).join(" ");
  const zeroY = y(0);
  const current = price ?? 50;
  return (
    <figure className="l02-plot l02-profit-plot"><svg viewBox="0 0 760 510" role="img" aria-label={`客群${segment}价格利润曲线`}>
      <defs><linearGradient id={`l02-profit-positive-${segment}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#138568" stopOpacity=".36"/><stop offset="1" stopColor="#138568" stopOpacity=".03"/></linearGradient><linearGradient id={`l02-profit-negative-${segment}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d94435" stopOpacity=".08"/><stop offset="1" stopColor="#d94435" stopOpacity=".38"/></linearGradient></defs>
      <rect x="88" y="62" width="620" height={zeroY-62} fill={`url(#l02-profit-positive-${segment})`}/><rect x="88" y={zeroY} width="620" height={415-zeroY} fill={`url(#l02-profit-negative-${segment})`}/>
      <path className="l02-axis" d="M88 45V415H718"/><path className="l02-zero" d={`M88 ${zeroY}H718`}/>
      {[0,20,40,60,80,100,120].map((p)=><text className="l02-svg-label" x={x(p)} y="454" textAnchor="middle" key={p}>{p}</text>)}
      <text className="l02-zone-label l02-zone-label--profit" x="116" y="95">盈利区</text><text className="l02-zone-label l02-zone-label--loss" x="116" y="401">亏损区</text>
      <path className="l02-curve l02-curve--green" data-layer="profit-parabola" d={path}/>
      {showBreakEven && segment === "A" && <><circle className="l02-break-dot" cx={x(22.04)} cy={zeroY} r="10"/><circle className="l02-break-dot" cx={x(117.96)} cy={zeroY} r="10"/><text className="l02-svg-value" x={x(22.04)+12} y={zeroY-18}>22.04</text><text className="l02-svg-value" x={x(117.96)-12} y={zeroY-18} textAnchor="end">117.96</text></>}
      {showMarker && <g><path className="l02-guide" d={`M${x(current)} 415V${y(profit(current))}`}/><circle className="l02-dot l02-dot--green" cx={x(current)} cy={y(profit(current))} r="12"/><text className="l02-svg-value" x={x(current)+16} y={y(profit(current))-18}>{current}元 · ¥{profit(current).toLocaleString()}</text></g>}
      <text className="l02-axis-title" x="400" y="498" textAnchor="middle">价格（元 / 杯）</text><text className="l02-axis-title" x="22" y="235" transform="rotate(-90 22 235)" textAnchor="middle">利润（元 / 日）</text>
    </svg></figure>
  );
}

function NumberRail({ values, active }: { values: readonly number[]; active?: number }) {
  return <div className="l02-number-rail">{values.map((value) => <div className={active === value ? "is-active" : ""} key={value}><span>{value}</span><i /></div>)}</div>;
}

function EquationFlow({ children }: { children: ReactNode }) {
  return <div className="l02-equation-flow">{children}</div>;
}

function Note({ label, children, tone = "amber" }: { label: string; children: ReactNode; tone?: Tone }) {
  return <div className={`l02-note l02-note--${tone}`}><span>{label}</span><p>{children}</p></div>;
}

function HeroImage({ src, alt, position = "center" }: { src: string; alt: string; position?: string }) {
  return <figure className="l02-hero-image"><img src={src} alt={alt} style={{ objectPosition: position }} /><span>教学情境插画</span></figure>;
}

function PriceProfitLab({
  interaction,
  readOnly,
  onPatch,
  onReset
}: {
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onPatch?: (patch: SlideInteractionValues) => void;
  onReset?: () => void;
}) {
  const values = interaction?.values ?? { price: 50, segment: "A", revealStep: false };
  const price = Math.max(20, Math.min(110, Number(values.price ?? 50)));
  const segment = values.segment === "B" ? "B" : "A";
  const q = segment === "A" ? 1200 - 10 * price : 900 - 6 * price;
  const revenue = price * q;
  const cost = 2000 + 20 * q;
  const profit = revenue - cost;
  return (
    <div className={`l02-lab ${readOnly ? "l02-lab--readonly" : ""}`} data-projection="price-profit-lab">
      <div className="l02-lab__headline">
        <Kicker>拖动价格 · 五个量同步变化</Kicker>
        <BigTitle>价格—利润联动台</BigTitle>
        <div className="l02-lab__parameter"><span>{readOnly ? "教师同步参数 · " : ""}客群 {segment}</span><strong>¥{price}</strong><i>元 / 杯</i></div>
      </div>
      <div className="l02-lab__plot"><ProfitPlot price={price} segment={segment}/></div>
      <div className="l02-lab__metrics" aria-label="当前参数和计算结果">
        <div><span>预测销量</span><strong>{q}</strong><i>杯 / 日</i></div>
        <div><span>销售收入</span><strong>¥{revenue.toLocaleString()}</strong><i>元 / 日</i></div>
        <div><span>总成本</span><strong>¥{cost.toLocaleString()}</strong><i>元 / 日</i></div>
        <div className={profit >= 0 ? "is-profit" : "is-loss"}><span>利润</span><strong>{profit < 0 ? "−" : "+"}¥{Math.abs(profit).toLocaleString()}</strong><i>元 / 日</i></div>
      </div>
      {!readOnly && <div className="l02-lab__console" aria-label="教师参数控制">
        <div className="l02-lab__segments"><button className={segment === "A" ? "is-active" : ""} onClick={() => onPatch?.({ segment: "A" })} type="button">客群 A</button><button className={segment === "B" ? "is-active" : ""} onClick={() => onPatch?.({ segment: "B" })} type="button">客群 B</button></div>
        <label><span>价格</span><input aria-label="价格" max="110" min="20" onChange={(event) => onPatch?.({ price: Number(event.target.value) })} step="1" type="range" value={price}/><output>¥{price}</output></label>
        <button className="l02-lab__reset" onClick={onReset} type="button">重置</button>
      </div>}
    </div>
  );
}

function Bars({ items, max = 36000 }: { items: readonly { label: string; value: number; tone: Tone; note?: string }[]; max?: number }) {
  return <div className="l02-bars">{items.map((item) => <div className={`l02-bar l02-bar--${item.tone}`} key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(2, item.value / max * 100)}%` }}/><b>{item.value.toLocaleString()}</b></div>{item.note && <em>{item.note}</em>}</div>)}</div>;
}

export function Lesson02ArtSlides({
  spec,
  interaction,
  readOnly,
  onInteractionPatch,
  onInteractionReset
}: Lesson02ArtSlidesProps) {
  switch (spec.slideKey) {
    case "em-l02-s01":
      return <SlideFrame mode="linen" spec={spec} tone="red">
        <div className="l02-opening">
          <HeroImage alt="山城新饮门店的周末定价讨论" position="center 58%" src="/course-assets/economic-mathematics/art/l02-pricing-counter.webp" />
          <div className="l02-opening__veil" />
          <div className="l02-opening__copy"><Kicker>山城新饮 · 周末定价会</Kicker><BigTitle>卖得多，<br/>就一定赚得多？</BigTitle><p>同一杯饮品，两张价格签。先别急着选。</p></div>
          <div className="l02-opening__tags"><PriceTag caption="方案甲" price={22}/><span>VS</span><PriceTag caption="方案乙" color="cyan" price={30}/></div>
          <div className="l02-opening__cost"><span>每卖一杯</span><strong>成本 ¥20</strong><i>每天先付 ¥2,000</i></div>
        </div>
      </SlideFrame>;
    case "em-l02-s02":
      return <SlideFrame spec={spec} tone="amber">
        <div className="l02-decision-scale">
          <div className="l02-decision-scale__copy"><Kicker>先预测，再算账</Kicker><BigTitle>只看售价，<br/>信息够吗？</BigTitle><Prompt number="01">写下你的选择，再圈出还缺少的那个量。</Prompt></div>
          <div className="l02-balance" aria-label="降价与提价的权衡天平">
            <div className="l02-balance__beam"><i/><b/></div><div className="l02-balance__stand" />
            <div className="l02-balance__left"><PriceTag color="red" price={22}/><p>每杯赚得少<br/><strong>可能卖得多</strong></p></div>
            <div className="l02-balance__right"><PriceTag color="cyan" price={30}/><p>每杯赚得多<br/><strong>可能卖得少</strong></p></div>
            <div className="l02-balance__missing">?</div>
          </div>
        </div>
      </SlideFrame>;
    case "em-l02-s03":
      return <SlideFrame mode="mint" spec={spec} tone="cyan">
        <div className="l02-formula-landscape">
          <div className="l02-formula-landscape__copy"><Kicker>客群 A · 同一门店 · 同一活动期</Kicker><BigTitle>价格每升 1 元，<br/>预测少卖 10 杯</BigTitle><MathText block className="l02-formula-hero" tex="q_A(p)=1200-10p"/><div className="l02-unit-line"><span>价格：元 / 杯</span><span>销量：杯 / 日</span></div></div>
          <DemandPlot prices={[20, 60, 100]}/>
        </div>
      </SlideFrame>;
    case "em-l02-s04":
      return <SlideFrame spec={spec} tone="ink">
        <div className="l02-boundary-stage">
          <Kicker>模型不能产生负销量</Kicker><BigTitle>价格的解释范围，到这里为止</BigTitle>
          <MathText block className="l02-formula-hero" tex={String.raw`1200-10p\geq 0\quad\Longrightarrow\quad 0\leq p\leq120`}/>
          <div className="l02-domain-rail"><span className="l02-domain-rail__zero">¥0</span><i/><b/><em/><span className="l02-domain-rail__end">¥120</span><div className="l02-domain-rail__valid">预测销量非负：可以解释</div><div className="l02-domain-rail__invalid">负销量：停止解释</div></div>
          <Note label="边界检查" tone="red">代数式还能继续计算，并不代表结果仍有经济意义。</Note>
        </div>
      </SlideFrame>;
    case "em-l02-s05":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-two-point-story"><div><Kicker>代入需求函数</Kicker><BigTitle>相差 8 元，<br/>预测销量相差 80 杯</BigTitle><div className="l02-point-equations"><MathText block tex={String.raw`q_A(22)=1200-10\times22=980`}/><MathText block tex={String.raw`q_A(30)=1200-10\times30=900`}/></div><Note label="读图" tone="cyan">沿需求线向右移动，价格上升；对应点向下，销量下降。</Note></div><DemandPlot prices={[22,30]}/></div>
      </SlideFrame>;
    case "em-l02-s06":
      return <SlideFrame mode="night" spec={spec} tone="amber">
        <div className="l02-practice-wall"><div className="l02-practice-wall__head"><Kicker>纸面计算 · 90 秒</Kicker><BigTitle>补齐四个预测值</BigTitle><MathText block tex="q_A(p)=1200-10p"/></div><div className="l02-practice-grid" aria-label="待完成的需求表"><div className="l02-practice-grid__axis"><span>价格（元）</span><span>20</span><span>40</span><span>70</span><span>110</span></div><div className="l02-practice-grid__answers"><span>销量（杯）</span>{[1,2,3,4].map((n)=><span key={n}>?</span>)}</div></div><Prompt number="90″">哪一个价格最接近模型边界？</Prompt></div>
      </SlideFrame>;
    case "em-l02-s07":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-stepdown"><Kicker>需求表核对</Kicker><BigTitle>每升 1 元，沿直线少 10 杯</BigTitle><div className="l02-stepdown__stairs">{[{p:20,q:1000},{p:40,q:800},{p:70,q:500},{p:110,q:100}].map(({p,q},index)=><div style={{"--step":index} as CSSProperties} key={p}><PriceTag color={index===3?"red":"cyan"} price={p}/><span aria-hidden="true">↘</span><strong>{q}</strong><i>杯 / 日</i></div>)}</div><div className="l02-stepdown__edge"><b>离零销量边界</b><strong>只剩 ¥10</strong></div></div>
      </SlideFrame>;
    case "em-l02-s08":
      return <SlideFrame mode="linen" spec={spec} tone="cyan">
        <div className="l02-multiply-stage"><Kicker>销量 <MathText tex={String.raw`\ne`}/> 销售收入</Kicker><BigTitle>销售收入来自两项相乘</BigTitle><div className="l02-multiply-stage__equation"><div><PriceTag color="red" price={30}/><span>售价</span></div><MathText className="l02-multiply-operator" tex={String.raw`\times`}/><div className="l02-cup-stack"><i/><i/><i/><strong>900</strong><span>杯 / 日</span></div><MathText className="l02-multiply-operator" tex="="/><div className="l02-money-total"><span>¥</span><strong>27,000</strong><i>元 / 日</i></div></div><MathText block className="l02-formula-signature" tex="R=pq"/></div>
      </SlideFrame>;
    case "em-l02-s09":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-pipeline-stage"><Kicker>复合出价格函数</Kicker><BigTitle>一张价格签，穿过两道计算门</BigTitle><EquationFlow><div className="l02-flow-node l02-flow-node--price"><span>输入</span><MathText block tex="p"/></div><i className="l02-flow-arrow">→</i><div className="l02-flow-node l02-flow-node--demand"><span>需求门</span><MathText block tex="q_A(p)=1200-10p"/></div><i className="l02-flow-arrow">→</i><div className="l02-flow-node l02-flow-node--revenue"><span>收入门</span><MathText block tex="R_A(p)=p(1200-10p)"/></div></EquationFlow><p className="l02-pipeline-stage__caption">中间量是销量；最终输出是每天的销售收入。</p></div>
      </SlideFrame>;
    case "em-l02-s10":
      return <SlideFrame spec={spec} tone="red">
        <div className="l02-curve-focus"><div className="l02-curve-focus__copy"><Kicker>展开式揭示形状</Kicker><BigTitle>收入不是一条直线</BigTitle><MathText block className="l02-formula-hero" tex="R_A(p)=1200p-10p^2"/><div className="l02-shape-cue"><span>二次项为负</span><strong>开口向下</strong></div><p>先观察端点与弯曲方向，暂不寻找最高点。</p></div><RevenuePlot prices={[0,120]}/></div>
      </SlideFrame>;
    case "em-l02-s11":
      return <SlideFrame mode="mint" spec={spec} tone="cyan">
        <div className="l02-ledger-ribbon"><div><Kicker>四个价格快照</Kicker><BigTitle>销量一直下降，<br/>收入却不是</BigTitle><p>找出收入相同、价格不同的两笔记录。</p></div><div className="l02-ledger-ribbon__sheet">{[{p:20,q:1000,r:20000},{p:40,q:800,r:32000},{p:80,q:400,r:32000},{p:110,q:100,r:11000}].map(({p,q,r})=><div className={r===32000?"is-match":""} key={p}><span>¥{p}</span><i>{q} 杯</i><strong>¥{r.toLocaleString()}</strong></div>)}<b className="l02-ledger-ribbon__brace">同收入</b></div></div>
      </SlideFrame>;
    case "em-l02-s12":
      return <SlideFrame spec={spec} tone="amber">
        <div className="l02-revenue-forces"><div className="l02-revenue-forces__copy"><Kicker>两个相反力量的合成</Kicker><BigTitle>收入曲线<br/>先升，后降</BigTitle><div className="l02-force-notes"><Note label="低价区" tone="green">提价带来的单价增加，可能占优。</Note><Note label="高价区" tone="red">销量损失，可能压过提价收益。</Note></div></div><div className="l02-revenue-forces__visual"><RevenuePlot/><div className="l02-force-arrow l02-force-arrow--up">提价力量 ↗</div><div className="l02-force-arrow l02-force-arrow--down">销量损失 ↘</div></div></div>
      </SlideFrame>;
    case "em-l02-s13":
      return <SlideFrame mode="night" spec={spec} tone="red">
        <div className="l02-duel-exercise"><div className="l02-duel-exercise__head"><Kicker>先写式，再代数</Kicker><BigTitle>哪张价格签<br/>带来更高收入？</BigTitle></div><div className="l02-duel-exercise__arena"><div><PriceTag price={22}/><MathText block tex={String.raw`R_A(22)=\;?`}/></div><span>VS</span><div><PriceTag color="cyan" price={30}/><MathText block tex={String.raw`R_A(30)=\;?`}/></div></div><Prompt number="02′">写出两条完整算式，并标明差额与单位。</Prompt></div>
      </SlideFrame>;
    case "em-l02-s14":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-receipt-pair"><div className="l02-receipt-pair__copy"><Kicker>销售收入比较</Kicker><BigTitle>30 元方案<br/>收入更高</BigTitle><div className="l02-delta-badge"><span>每日收入差</span><strong>+ ¥5,440</strong></div></div><Receipt title="方案甲 · ¥22" rows={[["预测销量","980 杯"],["售价 × 销量",<MathText key="a" tex={String.raw`22\times980`}/>]]} total={["销售收入","¥21,560"]} tone="red"/><Receipt title="方案乙 · ¥30" rows={[["预测销量","900 杯"],["售价 × 销量",<MathText key="b" tex={String.raw`30\times900`}/>]]} total={["销售收入","¥27,000"]} tone="cyan"/></div>
      </SlideFrame>;
    case "em-l02-s15":
      return <SlideFrame mode="linen" spec={spec} tone="red">
        <div className="l02-error-stamp"><div className="l02-error-stamp__quote">“卖了 ¥27,000，<br/>所以赚了 ¥27,000。”</div><div className="l02-error-stamp__mark">错</div><div className="l02-error-stamp__audit"><Kicker>错误审计</Kicker><BigTitle>收入还没扣成本</BigTitle><MathText block className="l02-formula-hero" tex={String.raw`\text{利润}=\text{收入}-\text{成本}`}/><div className="l02-cost-tear"><span>变动成本</span><span>固定成本</span></div></div></div>
      </SlideFrame>;
    case "em-l02-s16":
      return <SlideFrame spec={spec} tone="amber">
        <div className="l02-cost-opening"><HeroImage alt="门店每日成本账本与设备" src="/course-assets/economic-mathematics/art/l02-profit-ledger.webp"/><div className="l02-cost-opening__scrim"/><div className="l02-cost-opening__copy"><Kicker>租位、设备与基础人工</Kicker><BigTitle>一杯没卖，<br/>也要先付 ¥2,000</BigTitle><div className="l02-cost-opening__numbers"><div><span>每天固定</span><strong>¥2,000</strong></div><div><span>每卖一杯</span><strong>+ ¥20</strong></div></div><Prompt>卖出任意数量时，总成本怎样写？</Prompt></div></div>
      </SlideFrame>;
    case "em-l02-s17":
      return <SlideFrame mode="mint" spec={spec} tone="cyan">
        <div className="l02-cost-stack"><div className="l02-cost-stack__copy"><Kicker>以销量为输入</Kicker><BigTitle>两层成本，叠成总账</BigTitle><MathText block className="l02-formula-hero" tex="C(q)=2000+20q"/><p>把销量设为零，截距就是不开单也要支付的成本。</p></div><div className="l02-cost-stack__visual"><div className="l02-cost-layer l02-cost-layer--fixed"><span>固定成本</span><strong>¥2,000</strong><i>不随本模型销量改变</i></div><div className="l02-cost-layer l02-cost-layer--variable"><span>变动成本</span><strong><MathText tex="20q"/></strong><i>每杯再增加 ¥20</i></div><div className="l02-cost-stack__total">总成本</div></div></div>
      </SlideFrame>;
    case "em-l02-s18":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-function-chain"><Kicker>函数链</Kicker><BigTitle>价格先遇到顾客，<br/>销量再进入账本</BigTitle><div className="l02-function-chain__line"><div className="l02-chain-object l02-chain-object--tag"><PriceTag color="red" price={50}/><MathText block tex="p"/></div><span className="l02-chain-motion">决定预测</span><i>→</i><div className="l02-chain-object l02-chain-object--cups"><div className="l02-cup-stack"><i/><i/><i/></div><MathText block tex="q_A(p)"/></div><span className="l02-chain-motion">进入核算</span><i>→</i><div className="l02-chain-object l02-chain-object--ledger"><b>成本账</b><MathText block tex="C(q_A(p))"/></div></div><MathText block className="l02-formula-signature" tex={String.raw`p\longmapsto q_A(p)\longmapsto C\!\left(q_A(p)\right)`}/></div>
      </SlideFrame>;
    case "em-l02-s19":
      return <SlideFrame spec={spec} tone="cyan">
        <div className="l02-algebra-fold"><div className="l02-algebra-fold__copy"><Kicker>代入并化简</Kicker><BigTitle>把成本也写成<br/>价格的函数</BigTitle><p>价格上升时，模型销量下降，因此变动成本随之下降。</p></div><div className="l02-algebra-fold__paper"><div><span>总成本</span><MathText block tex="C_A(p)=2000+20q_A(p)"/></div><i>代入需求</i><div><span>替换中间量</span><MathText block tex="=2000+20(1200-10p)"/></div><i>展开合并</i><div className="is-final"><span>价格函数</span><MathText block tex="=26000-200p"/></div></div></div>
      </SlideFrame>;
    case "em-l02-s20":
      return <SlideFrame mode="night" spec={spec} tone="amber">
        <div className="l02-two-route-exercise"><div className="l02-two-route-exercise__copy"><Kicker>纸面计算 · 2 分钟</Kicker><BigTitle>两条路径，<br/>核对同一笔成本</BigTitle><div className="l02-two-route-exercise__prices"><PriceTag price={22}/><PriceTag color="cyan" price={30}/></div></div><div className="l02-route-map"><div><span>路径 A · 先求销量</span><MathText block tex={String.raw`p\rightarrow q_A(p)\rightarrow C(q)`}/></div><b>结果应当一致</b><div><span>路径 B · 直接代入</span><MathText block tex={String.raw`p\rightarrow C_A(p)`}/></div><div className="l02-route-map__answer">?</div></div></div>
      </SlideFrame>;
    case "em-l02-s21":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-route-solution"><Kicker>成本核对</Kicker><BigTitle>两条计算路，<br/>在同一结果会合</BigTitle><div className="l02-route-solution__diagram"><div className="l02-route-solution__case"><PriceTag price={22}/><div><MathText block tex="q=980"/><MathText block tex={String.raw`2000+20\times980`}/></div><span>→</span><strong>¥21,600</strong></div><div className="l02-route-solution__merge">✓</div><div className="l02-route-solution__case"><PriceTag color="cyan" price={30}/><div><MathText block tex="q=900"/><MathText block tex={String.raw`26000-200\times30`}/></div><span>→</span><strong>¥20,000</strong></div></div><p className="l02-route-solution__foot">直接函数与逐步代入相互复核：单位、括号、数值都应一致。</p></div>
      </SlideFrame>;
    case "em-l02-s22":
      return <SlideFrame mode="linen" spec={spec} tone="cyan">
        <div className="l02-profit-balance"><div className="l02-profit-balance__copy"><Kicker>口径必须一致</Kicker><BigTitle>同一天的收入，<br/>减去同一天的成本</BigTitle><MathText block className="l02-formula-hero" tex={String.raw`\Pi=R-C`}/><div className="l02-period-seal">对象一致 · 期间一致 · 币种一致</div></div><div className="l02-profit-balance__visual"><div className="l02-balance-disc l02-balance-disc--revenue"><span>销售收入</span><strong>¥</strong><i>元 / 日</i></div><MathText className="l02-balance-operator" tex="-"/><div className="l02-balance-disc l02-balance-disc--cost"><span>总成本</span><strong>¥</strong><i>元 / 日</i></div><MathText className="l02-balance-operator" tex="="/><div className="l02-balance-disc l02-balance-disc--profit"><span>利润</span><MathText block tex={String.raw`\Pi`}/><i>元 / 日</i></div></div></div>
      </SlideFrame>;
    case "em-l02-s23":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-subtraction-stage"><Kicker>收入减成本</Kicker><BigTitle>整条成本式，必须一起减</BigTitle><div className="l02-subtraction-stage__layers"><div className="l02-subtraction-layer l02-subtraction-layer--revenue"><span>收入</span><MathText block tex="p(1200-10p)"/></div><MathText className="l02-subtraction-stage__minus" tex="-"/><div className="l02-subtraction-layer l02-subtraction-layer--cost"><span>成本 · 整体加括号</span><MathText block tex={String.raw`\left[2000+20(1200-10p)\right]`}/></div></div><MathText block className="l02-formula-signature" tex={String.raw`\Pi_A(p)=p(1200-10p)-\left[2000+20(1200-10p)\right]`}/><Note label="易错点" tone="red">减号作用于整项成本，不只减去固定成本。</Note></div>
      </SlideFrame>;
    case "em-l02-s24":
      return <SlideFrame spec={spec} tone="red">
        <div className="l02-equation-cascade"><div className="l02-equation-cascade__copy"><Kicker>先展开，再合并</Kicker><BigTitle>一条利润曲线，<br/>从两本账里长出来</BigTitle><ProfitPlot price={50}/></div><div className="l02-equation-cascade__steps"><div><span>收入</span><MathText block tex="1200p-10p^2"/></div><div><span>减去成本</span><MathText block tex={String.raw`-\left(26000-200p\right)`}/></div><i/><div className="is-final"><span>利润函数</span><MathText block tex={String.raw`\Pi_A(p)=-10p^2+1400p-26000`}/></div></div></div>
      </SlideFrame>;
    case "em-l02-s25":
      return <SlideFrame spec={spec} tone="ink">
        <div className="l02-scope-window"><div className="l02-scope-window__copy"><Kicker>算得出 <MathText tex={String.raw`\ne`}/> 解释得通</Kicker><BigTitle>利润函数也有<br/>一道解释窗口</BigTitle><MathText block className="l02-formula-hero" tex={String.raw`0\leq p\leq120`}/><p>窗口外的代数结果仍存在，但价格或销量已经失去本情境的意义。</p></div><div className="l02-scope-window__lens"><ProfitPlot price={50}/><div className="l02-scope-window__shade l02-scope-window__shade--left">不解释</div><div className="l02-scope-window__shade l02-scope-window__shade--right">不解释</div><div className="l02-scope-window__frame">模型解释窗口</div></div></div>
      </SlideFrame>;
    case "em-l02-s26":
      return <SlideFrame mode="mint" spec={spec} tone="red">
        <PriceProfitLab interaction={interaction} onPatch={onInteractionPatch} onReset={onInteractionReset} readOnly={readOnly}/>
      </SlideFrame>;
    case "em-l02-s27":
      return <SlideFrame spec={spec} tone="cyan">
        <div className="l02-keyframes"><div className="l02-keyframes__copy"><Kicker>从联动台抄下证据</Kicker><BigTitle>三次停驻，<br/>看见利润转向</BigTitle><p>销量单向下降，利润却经历亏损、上升、回落。</p></div><div className="l02-keyframes__journey"><svg aria-hidden="true" viewBox="0 0 980 680"><path d="M86 60C210 180 132 300 260 358S544 436 882 606"/><circle cx="86" cy="60" r="14"/><circle cx="260" cy="358" r="14"/><circle cx="882" cy="606" r="14"/></svg>{[{p:20,q:1000,r:20000,c:22000,pi:-2000,beat:"低价亏损"},{p:50,q:700,r:35000,c:16000,pi:19000,beat:"利润跃升"},{p:100,q:200,r:20000,c:6000,pi:14000,beat:"回落仍盈利"}].map((item,index)=><section className={`l02-keyframe-row l02-keyframe-row--${index+1}`} key={item.p}><div className="l02-keyframe-row__stop"><span>停驻 0{index+1}</span><strong>¥{item.p}</strong><i>元 / 杯</i></div><div className="l02-keyframe-row__evidence"><div><span>预测销量</span><strong>{item.q.toLocaleString()} 杯</strong></div><div><span>销售收入</span><strong>¥{item.r.toLocaleString()}</strong></div><div><span>总成本</span><strong>¥{item.c.toLocaleString()}</strong></div></div><div className={`l02-keyframe-row__profit ${item.pi<0?"is-loss":"is-profit"}`}><span>日利润</span><strong>{item.pi<0?"−":"+"}¥{Math.abs(item.pi).toLocaleString()}</strong><i>{item.beat}</i></div></section>)}</div></div>
      </SlideFrame>;
    case "em-l02-s28":
      return <SlideFrame mode="linen" spec={spec} tone="amber">
        <div className="l02-three-forces"><Kicker>不能只盯销量</Kicker><BigTitle>降价，一次推动三根箭头</BigTitle><div className="l02-three-forces__hub"><div className="l02-three-forces__center"><span>价格</span><strong>下降</strong></div><div className="l02-force-spoke l02-force-spoke--one"><i>↙</i><span>单杯收入</span><strong>下降</strong></div><div className="l02-force-spoke l02-force-spoke--two"><i>→</i><span>预测销量</span><strong>上升</strong></div><div className="l02-force-spoke l02-force-spoke--three"><i>↘</i><span>变动成本</span><strong>上升</strong></div></div><div className="l02-three-forces__conclusion">利润，是三股变化合成后的净结果。</div></div>
      </SlideFrame>;
    case "em-l02-s29":
      return <SlideFrame mode="night" spec={spec} tone="red">
        <div className="l02-debate-return"><div className="l02-debate-return__copy"><Kicker>回到开场争论</Kicker><BigTitle>现在，完成<br/>最后一行账</BigTitle><p>收入已经算出；成本也已经算出。利润会推翻最初的直觉吗？</p></div><div className="l02-debate-return__sheets"><Receipt title="方案甲 · ¥22" rows={[["收入","¥21,560"],["成本","¥21,600"]]} total={["利润","?"]} tone="red"/><Receipt title="方案乙 · ¥30" rows={[["收入","¥27,000"],["成本","¥20,000"]]} total={["利润","?"]} tone="cyan"/></div><Prompt number="01′">独立完成两笔减法，再作选择。</Prompt></div>
      </SlideFrame>;
    case "em-l02-s30":
      return <SlideFrame spec={spec} tone="amber">
        <div className="l02-full-account l02-full-account--loss"><div className="l02-full-account__copy"><Kicker>完整核算示范</Kicker><BigTitle>卖得更多，<br/>却差 ¥40 才不亏</BigTitle><PriceTag price={22}/><div className="l02-result-orbit"><span>利润</span><strong>− ¥40</strong><i>元 / 日</i></div></div><Receipt title="方案甲 · 每日经营账" rows={[["预测销量",<MathText key="q" tex={String.raw`q_A(22)=980\ \text{杯}`}/>],["销售收入",<MathText key="r" tex={String.raw`22\times980=21560`}/>],["总成本",<MathText key="c" tex={String.raw`2000+20\times980=21600`}/>]]} total={["利润",<MathText key="pi" tex="21560-21600=-40"/>]} tone="red"/></div>
      </SlideFrame>;
    case "em-l02-s31":
      return <SlideFrame mode="mint" spec={spec} tone="green">
        <div className="l02-full-account l02-full-account--profit"><div className="l02-full-account__copy"><Kicker>完整核算</Kicker><BigTitle>少卖 80 杯，<br/>利润反而多 ¥7,040</BigTitle><PriceTag color="cyan" price={30}/><div className="l02-result-orbit"><span>利润</span><strong>+ ¥7,000</strong><i>元 / 日</i></div></div><Receipt title="方案乙 · 每日经营账" rows={[["预测销量",<MathText key="q" tex={String.raw`q_A(30)=900\ \text{杯}`}/>],["销售收入",<MathText key="r" tex={String.raw`30\times900=27000`}/>],["总成本",<MathText key="c" tex={String.raw`2000+20\times900=20000`}/>]]} total={["与方案甲之差",<MathText key="d" tex="7000-(-40)=7040"/>]} tone="green"/></div>
      </SlideFrame>;
    case "em-l02-s32":
      return <SlideFrame mode="night" spec={spec} tone="red">
        <div className="l02-account-race"><div className="l02-account-race__head"><Kicker>完整函数链 · 4 分钟</Kicker><BigTitle>收入可能相同，<br/>利润也会相同吗？</BigTitle></div><div className="l02-account-race__lanes"><div><PriceTag color="cyan" price={40}/><span>销量</span><b>?</b><span>收入</span><b>?</b><span>成本</span><b>?</b><span>利润</span><b>?</b></div><div><PriceTag color="red" price={80}/><span>销量</span><b>?</b><span>收入</span><b>?</b><span>成本</span><b>?</b><span>利润</span><b>?</b></div></div><Prompt number="04′">完成两行账，再用一句管理语言陈述。</Prompt></div>
      </SlideFrame>;
    case "em-l02-s33":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-same-revenue"><div className="l02-same-revenue__copy"><Kicker>固定收入下的成本差</Kicker><BigTitle>同样收入 ¥32,000，<br/>利润相差 ¥8,000</BigTitle><div className="l02-same-revenue__equation"><MathText tex="R_A(40)=R_A(80)"/><span>但</span><MathText tex={String.raw`\Pi_A(40)\ne\Pi_A(80)`}/></div></div><div className="l02-same-revenue__bars"><Bars max={32000} items={[{label:"40元 · 收入",value:32000,tone:"cyan"},{label:"40元 · 成本",value:18000,tone:"red",note:"利润 ¥14,000"},{label:"80元 · 收入",value:32000,tone:"cyan"},{label:"80元 · 成本",value:10000,tone:"green",note:"利润 ¥22,000"}]}/><div className="l02-profit-gap">利润差 <strong>¥8,000</strong> / 日</div></div></div>
      </SlideFrame>;
    case "em-l02-s34":
      return <SlideFrame mode="linen" spec={spec} tone="cyan">
        <div className="l02-segments-arrive"><HeroImage alt="山城新饮两个消费客群在同一价格下做选择" src="/course-assets/economic-mathematics/art/l02-two-segments.webp"/><div className="l02-segments-arrive__veil"/><div className="l02-segments-arrive__copy"><Kicker>同一价格 · 两种客群</Kicker><BigTitle>两条需求线，<br/>下降速度不同</BigTitle><div className="l02-segment-formulas"><div><span>客群 A</span><MathText block tex="q_A=1200-10p"/><i>每升 1 元，少 10 杯</i></div><div><span>客群 B</span><MathText block tex="q_B=900-6p"/><i>每升 1 元，少 6 杯</i></div></div><p>此处只比较绝对变化，不提前讨论百分比弹性。</p></div></div>
      </SlideFrame>;
    case "em-l02-s35":
      return <SlideFrame spec={spec} tone="green">
        <div className="l02-segment-profit-build"><div className="l02-segment-profit-build__copy"><Kicker>同一成本假设</Kicker><BigTitle>客群 B，<br/>也要单独建账</BigTitle><p>因式形式把“每杯贡献”和“预测销量”并排保留下来。</p></div><div className="l02-segment-profit-build__machine"><div className="l02-factor l02-factor--margin"><span>每杯贡献</span><MathText block tex="p-20"/></div><MathText className="l02-build-operator" tex={String.raw`\times`}/><div className="l02-factor l02-factor--demand"><span>客群 B 销量</span><MathText block tex="900-6p"/></div><MathText className="l02-build-operator" tex="-"/><div className="l02-factor l02-factor--fixed"><span>固定成本</span><strong>2,000</strong></div><MathText className="l02-build-operator" tex="="/><div className="l02-factor l02-factor--result"><span>利润函数</span><MathText block tex={String.raw`\Pi_B(p)`}/></div></div><MathText block className="l02-formula-signature" tex={String.raw`\Pi_B(p)=(p-20)(900-6p)-2000`}/></div>
      </SlideFrame>;
    case "em-l02-s36":
      return <SlideFrame mode="night" spec={spec} tone="amber">
        <div className="l02-segment-exercise"><div className="l02-segment-exercise__head"><Kicker>两张账并排</Kicker><BigTitle>同价 60 元，<br/>哪一个客群利润更高？</BigTitle><PriceTag color="green" price={60}/></div><div className="l02-segment-exercise__silhouettes"><div><span>A</span><strong>客群 A</strong><MathText block tex={String.raw`q_A(60)=\;?`}/><MathText block tex={String.raw`\Pi_A(60)=\;?`}/></div><div><span>B</span><strong>客群 B</strong><MathText block tex={String.raw`q_B(60)=\;?`}/><MathText block tex={String.raw`\Pi_B(60)=\;?`}/></div></div><Prompt number="03′">不要只凭斜率判断；先完成两张账。</Prompt></div>
      </SlideFrame>;
    case "em-l02-s37":
      return <SlideFrame mode="mint" spec={spec} tone="green">
        <div className="l02-segment-solution"><div className="l02-segment-solution__copy"><Kicker>客群比较 · 价格 60 元</Kicker><BigTitle>同价下，客群 A<br/>规模更大</BigTitle><div className="l02-delta-badge"><span>模型利润差</span><strong>+ ¥2,400</strong></div><p>这只是一个价格点；不能据此断言所有价格下排序相同。</p></div><div className="l02-segment-solution__rings"><div className="l02-segment-ring l02-segment-ring--a"><span>客群 A</span><strong>600</strong><i>杯 / 日</i><b>利润 ¥22,000</b></div><div className="l02-segment-ring l02-segment-ring--b"><span>客群 B</span><strong>540</strong><i>杯 / 日</i><b>利润 ¥19,600</b></div></div></div>
      </SlideFrame>;
    case "em-l02-s38":
      return <SlideFrame spec={spec} tone="amber">
        <div className="l02-zero-gate-prompt"><div className="l02-zero-gate-prompt__copy"><Kicker>盈亏平衡</Kicker><BigTitle>利润为零，<br/>为什么有两道门？</BigTitle><MathText block className="l02-formula-hero" tex="-10p^2+1400p-26000=0"/><Prompt>先估计两个交点分别落在哪个价格区间。</Prompt></div><div className="l02-zero-gate-prompt__plot"><ProfitPlot showMarker={false}/><div className="l02-zero-gate-prompt__door l02-zero-gate-prompt__door--one">?</div><div className="l02-zero-gate-prompt__door l02-zero-gate-prompt__door--two">?</div></div></div>
      </SlideFrame>;
    case "em-l02-s39":
      return <SlideFrame spec={spec} tone="cyan">
        <div className="l02-zero-gate-answer"><div className="l02-zero-gate-answer__plot"><ProfitPlot showBreakEven showMarker={false}/></div><div className="l02-zero-gate-answer__copy"><Kicker>二次方程求根</Kicker><BigTitle>穿过零线的<br/>两处价格</BigTitle><MathText block className="l02-formula-hero" tex={String.raw`p=70\pm10\sqrt{23}`}/><div className="l02-root-pair"><div><span>低价门</span><strong>¥22.04</strong></div><div><span>高价门</span><strong>¥117.96</strong></div></div><Note label="符号判断" tone="green">抛物线开口向下：两根之间利润为正。</Note></div></div>
      </SlideFrame>;
    case "em-l02-s40":
      return <SlideFrame mode="night" spec={spec} tone="red">
        <div className="l02-near-boundary"><div className="l02-near-boundary__copy"><Kicker>数值与边界</Kicker><BigTitle>只差 4 分钱，<br/>为何出现小额亏损？</BigTitle><MathText block tex="22<22.04"/><p>把三项证据连成一句完整解释。</p></div><div className="l02-near-boundary__scale"><div className="l02-price-magnifier"><NumberRail active={22} values={[21.96,22,22.04,22.08]}/><span className="l02-price-magnifier__loss">亏损侧</span><span className="l02-price-magnifier__profit">盈利侧</span><i className="l02-price-magnifier__gate"/></div><div className="l02-near-boundary__evidence"><span>原方案</span><strong>¥22.00</strong><span>模型利润</span><strong>− ¥40</strong></div></div><Prompt number="30″">必须说出“略低于盈亏平衡价”。</Prompt></div>
      </SlideFrame>;
    case "em-l02-s41":
      return <SlideFrame mode="mint" spec={spec} tone="green">
        <div className="l02-triple-check"><div className="l02-triple-check__copy"><Kicker>相邻证据一致</Kicker><BigTitle>22 元，落在<br/>低价亏损区</BigTitle><p>三种表达指向同一个判断。</p></div><div className="l02-triple-check__triangle"><div><span>代数</span><MathText block tex={String.raw`\Pi_A(22)=-40`}/></div><div><span>图形</span><strong>零线下方</strong></div><div><span>情境</span><strong>略低于 ¥22.04</strong></div><svg aria-hidden="true" viewBox="0 0 600 430"><path d="M300 55L75 360H525Z"/></svg><b>一致</b></div></div>
      </SlideFrame>;
    case "em-l02-s42":
      return <SlideFrame spec={spec} tone="ink">
        <div className="l02-term-boundaries"><div className="l02-term-boundaries__copy"><Kicker>错误审计</Kicker><BigTitle>三个“需求”，<br/>尺度完全不同</BigTitle><p>把“客群 A 每升 1 元少 10 杯”误写成“总需求下降 10 杯”，跨越了概念边界。</p></div><div className="l02-term-boundaries__scope"><div className="l02-scope-circle l02-scope-circle--course"><span>本课模型</span><strong>某客群<br/>某商品<br/>预测购买量</strong></div><div className="l02-scope-circle l02-scope-circle--market"><span>市场需求</span><strong>多个消费者<br/>需求汇总</strong></div><div className="l02-scope-circle l02-scope-circle--macro"><span>宏观总需求</span><strong>经济体<br/>计划支出</strong></div><i>不可混用</i></div></div>
      </SlideFrame>;
    case "em-l02-s43":
      return <SlideFrame mode="linen" spec={spec} tone="cyan">
        <div className="l02-manager-compass"><div className="l02-manager-compass__copy"><Kicker>给门店经理的一页账</Kicker><BigTitle>一个价格建议，<br/>至少带四项证据</BigTitle><p>结论不是一个数字，而是一条可以复核的推理链。</p></div><div className="l02-manager-compass__dial"><div className="l02-manager-compass__center">可复核<br/>建议</div><div className="l02-compass-point l02-compass-point--n"><span>01</span><strong><MathText tex={String.raw`\text{价格}\times\text{客群}`}/></strong></div><div className="l02-compass-point l02-compass-point--e"><span>02</span><strong>预测销量</strong></div><div className="l02-compass-point l02-compass-point--s"><span>03</span><strong>收入 · 成本 · 利润</strong></div><div className="l02-compass-point l02-compass-point--w"><span>04</span><strong>边界 · 假设 · 风险</strong></div></div></div>
      </SlideFrame>;
    case "em-l02-s44":
      return <SlideFrame mode="night" spec={spec} tone="red">
        <div className="l02-capstone"><div className="l02-capstone__head"><Kicker>课堂检验 · 5 分钟</Kicker><BigTitle>45 元，还是 55 元？</BigTitle><p>客群 A · 完整模型卡</p></div><div className="l02-capstone__choices"><div><PriceTag color="amber" price={45}/><ol><li>预测销量</li><li>销售收入</li><li>总成本</li><li>利润</li></ol></div><span>比较</span><div><PriceTag color="cyan" price={55}/><ol><li>预测销量</li><li>销售收入</li><li>总成本</li><li>利润</li></ol></div></div><Prompt>选择一个方案，并写出一条模型局限。</Prompt></div>
      </SlideFrame>;
    case "em-l02-s45":
      return <SlideFrame mode="mint" spec={spec} tone="green">
        <div className="l02-plan-verdict"><div className="l02-plan-verdict__copy"><Kicker>课堂检验核对</Kicker><BigTitle>55 元方案，<br/>模型利润高 ¥4,000</BigTitle><Note label="但还不能直接执行" tone="amber">真实需求、竞品反应与门店容量仍需验证。</Note></div><div className="l02-plan-verdict__lanes">{[{price:45,q:750,r:33750,c:17000,pi:16750,tone:"amber"},{price:55,q:650,r:35750,c:15000,pi:20750,tone:"cyan"}].map((item,index)=><section className={`l02-verdict-lane l02-verdict-lane--${item.tone}`} key={item.price}><div className="l02-verdict-lane__price"><span>方案 {index===0?"甲":"乙"}</span><strong>¥{item.price}</strong><i>元 / 杯</i></div><div className="l02-verdict-lane__evidence"><div><span>预测销量</span><strong>{item.q} 杯</strong></div><div><span>销售收入</span><strong>¥{item.r.toLocaleString()}</strong></div><div><span>总成本</span><strong>¥{item.c.toLocaleString()}</strong></div></div><div className="l02-verdict-lane__profit"><span>模型利润</span><strong>¥{item.pi.toLocaleString()}</strong><i>元 / 日</i></div></section>)}<div className="l02-plan-verdict__delta"><span>55 元方案</span><strong>利润 + ¥4,000</strong><i>同时少卖 100 杯 / 日</i></div></div></div>
      </SlideFrame>;
    case "em-l02-s46":
      return <SlideFrame spec={spec} tone="ink">
        <div className="l02-boundary-peel"><div className="l02-boundary-peel__copy"><Kicker>本单元边界</Kicker><BigTitle>模型负责比较，<br/>现实试验负责验证</BigTitle><p>每揭开一层，都是本模型尚未覆盖的经营变量。</p></div><div className="l02-boundary-peel__layers"><div className="l02-peel l02-peel--model"><span>当前模型</span><strong>价格 · 需求 · 成本 · 利润</strong></div><div className="l02-peel l02-peel--capacity"><span>尚未计入</span><strong>容量 · 库存</strong></div><div className="l02-peel l02-peel--competition"><span>尚未计入</span><strong>竞品反应</strong></div><div className="l02-peel l02-peel--brand"><span>尚未计入</span><strong>长期品牌影响</strong></div><div className="l02-peel l02-peel--test"><span>下一步</span><strong>小规模试验</strong></div></div></div>
      </SlideFrame>;
    case "em-l02-s47":
      return <SlideFrame mode="night" spec={spec} tone="red">
        <div className="l02-limit-bridge"><div className="l02-limit-bridge__copy"><Kicker>函数描述关系之后，研究“趋近”</Kicker><BigTitle>一次次追加触达，<br/>指标会靠近哪里？</BigTitle><MathText block className="l02-formula-hero" tex="a_n=80-20(0.6)^n"/><p>下一讲，不再只比较两个点；我们跟随一串结果向远处走。</p></div><div className="l02-limit-bridge__visual"><div className="l02-limit-bridge__target">80</div><svg viewBox="0 0 720 420" role="img" aria-label="数列逐步逼近80的点列"><defs><linearGradient id="l02-limit-trail" x1="0" x2="1"><stop stopColor="#ff675d"/><stop offset="1" stopColor="#f2bc4d" stopOpacity=".15"/></linearGradient></defs><path d="M72 346C180 267 264 207 350 164S530 92 662 74"/><line x1="54" x2="686" y1="66" y2="66"/>{[1,2,3,4,5,6,7,8].map((n)=>{const v=80-20*(.6**n); const px=72+(n-1)*84; const py=346-(v-68)/12*280; return <g key={n}><circle cx={px} cy={py} r={18-n}/><text x={px} y={py+44} textAnchor="middle">{n}</text></g>;})}</svg><span className="l02-limit-bridge__question">越走越近，但会不会“到达”？</span></div></div>
      </SlideFrame>;
  }
  throw new Error("Lesson02ArtSlides received an unregistered slideKey: " + spec.slideKey);
}
