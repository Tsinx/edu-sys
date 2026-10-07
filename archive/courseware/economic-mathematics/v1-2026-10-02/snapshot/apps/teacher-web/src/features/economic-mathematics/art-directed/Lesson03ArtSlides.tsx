import type { EconomicMathematicsSlideSpec } from "@edu/course-content/economic-mathematics";
import type { SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import katex from "katex";
import type { CSSProperties, ReactNode } from "react";

export interface Lesson03ArtSlidesProps {
  spec: EconomicMathematicsSlideSpec;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}

function K({ tex, display = false, label }: { tex: string; display?: boolean; label?: string }) {
  return (
    <span
      aria-label={label ?? tex}
      className={display ? "l03-katex l03-katex--display" : "l03-katex l03-katex--inline"}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          displayMode: display,
          output: "htmlAndMathml",
          strict: "ignore",
          throwOnError: false,
          trust: false
        })
      }}
    />
  );
}

function ArtPage({
  spec,
  className,
  eyebrow,
  title,
  children,
  image,
  imageAlt
}: {
  spec: EconomicMathematicsSlideSpec;
  className: string;
  eyebrow: ReactNode;
  title: ReactNode;
  children: ReactNode;
  image?: string;
  imageAlt?: string;
}) {
  return (
    <article className={`l03-art ${className}`} aria-label={`第3讲第${spec.localIndex}页：${spec.title}`}>
      {image && <img alt={imageAlt ?? "教学情境插画"} className="l03-art__scene" src={image} onError={(event) => { event.currentTarget.hidden = true; }} />}
      <div className="l03-art__wash" />
      <header className="l03-art__topline">
        <span>ECONOMIC MATHEMATICS</span>
        <span>第 3 讲 · {spec.section}</span>
        <b>{String(spec.localIndex).padStart(2, "0")} / {spec.localTotal}</b>
      </header>
      <main className="l03-art__main">
        <p className="l03-art__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </main>
      <footer className="l03-art__footer">
        <b>{spec.sourceLabel}</b>
        <span>{spec.sourceNote ?? "山城新饮课程教学模型 · 数值与图形为课堂自制"}</span>
      </footer>
    </article>
  );
}

const awareness = (n: number) => 80 - 20 * Math.pow(0.6, n);

function SequencePlot({
  current = 12,
  epsilon,
  descending = false,
  compact = false,
  id
}: {
  current?: number;
  epsilon?: number;
  descending?: boolean;
  compact?: boolean;
  id: string;
}) {
  const maxN = compact ? 12 : 24;
  const points = Array.from({ length: maxN + 1 }, (_, n) => {
    const value = descending ? 120 + 30 * Math.pow(0.5, n) : awareness(n);
    const minY = descending ? 118 : 56;
    const maxY = descending ? 152 : 82;
    const x = 82 + (n / maxN) * 1240;
    const y = 420 - ((value - minY) / (maxY - minY)) * 340;
    return { n, value, x, y };
  });
  const target = descending ? 120 : 80;
  const minY = descending ? 118 : 56;
  const maxY = descending ? 152 : 82;
  const yFor = (value: number) => 420 - ((value - minY) / (maxY - minY)) * 340;
  return (
    <svg className={`l03-sequence-plot${compact ? " l03-sequence-plot--compact" : ""}`} role="img" viewBox="0 0 1400 500" aria-label="数列离散点与长期参照线">
      <defs>
        <linearGradient id={`band-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#009ea8" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#009ea8" stopOpacity="0.32" />
          <stop offset="1" stopColor="#009ea8" stopOpacity="0.04" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {epsilon !== undefined && (
        <rect data-layer="tolerance-band" x="70" y={yFor(target + epsilon)} width="1270" height={Math.max(3, yFor(target - epsilon) - yFor(target + epsilon))} fill={`url(#band-${id})`} />
      )}
      <path className="l03-axis" d="M70 420H1345M70 60V420" />
      <path className="l03-target-line" d={`M70 ${yFor(target)}H1340`} />
      <text className="l03-svg-label l03-svg-label--target" x="1180" y={yFor(target) - 18}>{target}% 长期参照</text>
      <text className="l03-svg-label" x="1290" y="460">轮次</text>
      {epsilon !== undefined && <text className="l03-svg-label l03-svg-label--band" x="90" y={yFor(target + epsilon) - 12}>容忍带宽 {epsilon}</text>}
      <polyline className="l03-sequence-thread" points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
      {points.map((point) => (
        <g key={point.n} opacity={point.n <= current ? 1 : 0.18}>
          <circle className={point.n === current ? "l03-dot l03-dot--current" : "l03-dot"} cx={point.x} cy={point.y} r={point.n === current ? 12 : 7} filter={point.n === current ? `url(#glow-${id})` : undefined} />
          {(point.n === 0 || point.n === current || point.n === maxN) && <text className="l03-svg-label" x={point.x - 8} y="455">{point.n}</text>}
        </g>
      ))}
    </svg>
  );
}

function GapGauge({ n, epsilon }: { n: number; epsilon?: number }) {
  const gap = 20 * Math.pow(0.6, n);
  return (
    <div className="l03-gap-gauge">
      <div className="l03-gap-gauge__scale"><span style={{ width: `${Math.max(0.6, (gap / 20) * 100)}%` }} /></div>
      <div className="l03-gap-gauge__labels">
        <K tex={`|a_{${n}}-80|=${gap.toFixed(3)}`} />
        {epsilon !== undefined && <strong>{gap < epsilon ? "已经进入" : "还在带外"}</strong>}
      </div>
    </div>
  );
}

function SequenceLimitLab({ props }: { props: Lesson03ArtSlidesProps }) {
  const values = props.interaction?.values ?? { n: 1, epsilon: "2", revealStep: false };
  const n = Math.max(0, Math.min(24, Number(values.n ?? 1)));
  const epsilon = Number(values.epsilon ?? "2");
  const gap = 20 * Math.pow(0.6, n);
  const item = awareness(n);
  const reveal = Boolean(values.revealStep);
  const threshold = Math.max(0, Math.floor(Math.log(epsilon / 20) / Math.log(0.6)) + 1);
  return (
    <ArtPage spec={props.spec} className="l03-s20 l03-art--lab" eyebrow="趋近实验 · 权威同步状态" title={<>进入以后，<em>会不会再跑出去？</em></>}>
      <section className="l03-lab-stage" data-projection="sequence-limit-lab">
        <SequencePlot current={n} epsilon={epsilon} id="lab" />
        <div className="l03-lab-readout">
          <div><small>当前项</small><K tex={`a_{${n}}=${item.toFixed(3)}\\%`} /></div>
          <div><small>离参照线</small><K tex={`${gap.toFixed(3)}\\text{ 个百分点}`} /></div>
          <strong className={gap < epsilon ? "is-inside" : "is-outside"}>{gap < epsilon ? "带内" : "带外"}</strong>
        </div>
        {reveal && <p className="l03-lab-conclusion">从 <K tex={`N=${threshold}`} /> 起，所有后续项都留在这条容忍带内。</p>}
      </section>
      {!props.readOnly && (
        <aside className="l03-lab-controls" aria-label="教师实验控制器">
          <label><span>轮次 <K tex={`n=${n}`} /></span><input aria-label="轮次 n" min="0" max="24" step="1" type="range" value={n} onChange={(event) => props.onInteractionPatch?.({ n: Number(event.target.value) })} /></label>
          <div className="l03-lab-controls__bands" aria-label="容忍带预设">
            {[5, 2, 1, 0.5, 0.2].map((value) => <button className={value === epsilon ? "is-active" : ""} key={value} type="button" onClick={() => props.onInteractionPatch?.({ epsilon: String(value) })}><K tex={`\\varepsilon=${value}`} /></button>)}
          </div>
          <button className="l03-lab-controls__reveal" type="button" onClick={() => props.onInteractionPatch?.({ revealStep: !reveal })}>{reveal ? "收起结论" : "揭示结论"}</button>
          <button className="l03-lab-controls__reset" type="button" onClick={props.onInteractionReset}>重置</button>
        </aside>
      )}
    </ArtPage>
  );
}

function MiniSequence({ kind, label }: { kind: "constant" | "decay" | "oscillate" | "shrinking" | "growth"; label: ReactNode }) {
  const values = Array.from({ length: 9 }, (_, n) => {
    if (kind === "constant") return 0.5;
    if (kind === "decay") return 0.5 - 0.42 * (1 - Math.exp(-n / 2));
    if (kind === "oscillate") return n % 2 === 0 ? 0.15 : 0.85;
    if (kind === "shrinking") return 0.5 + (n % 2 === 0 ? 1 : -1) * 0.38 / (n + 1);
    return Math.min(0.9, 0.12 + n * 0.1);
  });
  return (
    <div className={`l03-mini-sequence l03-mini-sequence--${kind}`}>
      <svg viewBox="0 0 390 190" role="img" aria-label="数列前若干项示意">
        <path d="M22 160H370M22 25V160" />
        <polyline points={values.map((value, n) => `${38 + n * 39},${155 - value * 130}`).join(" ")} />
        {values.map((value, n) => <circle key={n} cx={38 + n * 39} cy={155 - value * 130} r="7" />)}
      </svg>
      <strong>{label}</strong>
    </div>
  );
}

function EquationTrail({ children }: { children: ReactNode }) {
  return <div className="l03-equation-trail">{children}</div>;
}

type Lesson03Renderer = (props: Lesson03ArtSlidesProps) => ReactNode;

const LESSON_03_ART_REGISTRY = {
  "em-l03-s01": (props) => (
    <ArtPage spec={props.spec} className="l03-s01 l03-art--image" eyebrow="山城新饮 · 会员唤醒活动" title={<>第 10 轮以后，<br /><em>还会同样快地上升吗？</em></>} image="/course-assets/economic-mathematics/art/l03-exposure-rhythm.webp" imageAlt="山城新饮会员触达节奏教学情境插画">
      <div className="l03-opening-question"><span>每一轮仍在上升</span><i>但新增幅度越来越小</i><p>请先画出你心中的后续走势。</p></div>
      <svg className="l03-opening-stroke" viewBox="0 0 680 230" aria-hidden="true"><path d="M12 210C92 158 125 96 218 70S388 38 665 26" /><path d="M18 20H665" /></svg>
    </ArtPage>
  ),
  "em-l03-s02": (props) => (
    <ArtPage spec={props.spec} className="l03-s02" eyebrow="轮次有顺序 · 前六轮记录" title={<>知晓率一步步抬高，<em>步幅却在收窄</em></>}>
      <div className="l03-number-rhythm">
        {[[0, "60.000"], [1, "68.000"], [2, "72.800"], [3, "75.680"], [4, "77.408"], [5, "78.445"]].map(([n, value], index) => <div key={n}><small>第 {n} 轮</small><K tex={`${value}\\%`} /><i style={{ height: `${54 + index * 34}px` }} /></div>)}
      </div>
      <p className="l03-floor-prompt">圈出相邻两轮的增量：它们正在按什么节奏缩小？</p>
    </ArtPage>
  ),
  "em-l03-s03": (props) => (
    <ArtPage spec={props.spec} className="l03-s03" eyebrow="先判断，再找证据" title={<>第 100 轮，最可能靠近哪里？</>}>
      <div className="l03-forecast-scale">
        <span style={{ left: "12%" }}><K tex="60\%" /><small>停在起点</small></span>
        <span className="is-candidate" style={{ left: "50%" }}><K tex="80\%" /><small>靠近平台</small></span>
        <span style={{ left: "88%" }}><K tex="100\%" /><small>持续涨满</small></span>
        <i />
      </div>
      <p className="l03-big-prompt">独立写下一个选择，再引用前六项给出一条理由。</p>
    </ArtPage>
  ),
  "em-l03-s04": (props) => (
    <ArtPage spec={props.spec} className="l03-s04" eyebrow="先看清“数列”" title={<>一串数，沿着<em>正整数顺序</em>展开</>}>
      <div className="l03-bead-line"><K tex="a_0" /><i /><K tex="a_1" /><i /><K tex="a_2" /><i /><K tex="a_3" /><i /><span className="l03-bead-line__ellipsis">···</span><K tex="a_n" /><i /><span className="l03-bead-line__ellipsis">···</span></div>
      <div className="l03-two-notes"><p><K tex="n" /> 回答：这是第几轮？</p><p><K tex="a_n" /> 回答：这一轮的指标是多少？</p></div>
    </ArtPage>
  ),
  "em-l03-s05": (props) => (
    <ArtPage spec={props.spec} className="l03-s05" eyebrow="下标不是系数" title={<>把位置与数值，<em>拆开读</em></>}>
      <div className="l03-subscript-anatomy"><K tex="a_3=75.68\%" display /><svg viewBox="0 0 850 240" aria-hidden="true"><path d="M275 42C230 115 175 120 95 176" /><path d="M540 50C590 122 654 128 765 182" /></svg><span className="at-index">第 3 轮后的序号</span><span className="at-value">这一项的数值</span></div>
      <p className="l03-warning-line"><K tex="a_3" /> 读作“数列的第 3 项”，不是 <K tex="a\times3" />。</p>
    </ArtPage>
  ),
  "em-l03-s06": (props) => (
    <ArtPage spec={props.spec} className="l03-s06" eyebrow="一个规则 · 生成所有轮次" title={<>用通项公式，<em>压缩整串记录</em></>}>
      <div className="l03-hero-formula"><K tex="a_n=80-20(0.6)^n" display /></div>
      <div className="l03-formula-roles"><span><K tex="a_n" /><small>第 <K tex="n" /> 轮后的知晓率</small></span><span><K tex="80" /><small>长期参照水平</small></span><span><K tex="20(0.6)^n" /><small>尚未补上的差距</small></span></div>
      <p className="l03-floor-prompt">先代入 <K tex="n=0" />：它能否还原第一条记录？</p>
    </ArtPage>
  ),
  "em-l03-s07": (props) => (
    <ArtPage spec={props.spec} className="l03-s07" eyebrow="逐项代入 · 同一条生成规则" title={<>底数每乘一次，<em>差距只剩六成</em></>}>
      <div className="l03-step-ribbon">
        <div><small>第 0 轮</small><K tex="a_0=80-20=60" /><i>下一步：差距 <K tex="\times 0.6" label="乘以零点六" /> →</i></div>
        <div><small>第 1 轮</small><K tex="a_1=80-12=68" /><i>下一步：差距 <K tex="\times 0.6" label="乘以零点六" /> ↓</i></div>
        <div><small>第 2 轮</small><K tex="a_2=80-7.2=72.8" /><i>下一步：差距 <K tex="\times 0.6" label="乘以零点六" /> →</i></div>
        <div><small>第 3 轮</small><K tex="a_3=80-4.32=75.68" /><i>同一规律继续</i></div>
      </div>
      <div className="l03-gap-whisper"><K tex="20\rightarrow12\rightarrow7.2\rightarrow4.32" /><span>在缩小的是“离 80 还有多远”</span></div>
    </ArtPage>
  ),
  "em-l03-s08": (props) => (
    <ArtPage spec={props.spec} className="l03-s08 l03-art--notebook" eyebrow="个人练习 · 先写式，再按计算器" title={<>算第 6 轮与第 10 轮</>} image="/course-assets/economic-mathematics/art/l03-sequence-notebook.webp" imageAlt="数列计算草稿本教学情境插画">
      <div className="l03-exercise-lines"><p>① 写出 <K tex="20(0.6)^6" /> 与 <K tex="20(0.6)^{10}" /></p><p>② 计算 <K tex="a_6" /> 与 <K tex="a_{10}" />，保留三位小数</p><p>③ 分别写出它们与 <K tex="80" /> 的距离</p></div>
      <div className="l03-timer-mark">03:00</div>
    </ArtPage>
  ),
  "em-l03-s09": (props) => (
    <ArtPage spec={props.spec} className="l03-s09" eyebrow="数值核对 · 关注差距" title={<>轮次只增加 4，<em>差距缩小约八倍</em></>}>
      <div className="l03-distance-rulers"><div><K tex="a_6\approx79.067" /><span className="l03-distance-rulers__track" style={{ width: "72%" }} /><small>距 <K tex="80" />：<K tex="0.933" /> 个百分点</small></div><div><K tex="a_{10}\approx79.879" /><span className="l03-distance-rulers__track" style={{ width: "22%" }} /><small>距 <K tex="80" />：<K tex="0.121" /> 个百分点</small></div></div>
      <div className="l03-right-anchor"><K tex="80\%" /><small>参照线</small></div>
    </ArtPage>
  ),
  "em-l03-s10": (props) => (
    <ArtPage spec={props.spec} className="l03-s10" eyebrow="横轴只取轮次" title={<>数列的图像，是<em>一串离散点</em></>}>
      <SequencePlot current={12} compact id="discrete" />
      <p className="l03-plot-note">点与点之间没有“半轮触达”；细线只帮助眼睛追踪次序。</p>
    </ArtPage>
  ),
  "em-l03-s11": (props) => (
    <ArtPage spec={props.spec} className="l03-s11" eyebrow="每一项都低于 80" title={<>为什么我们仍然<em>盯住 80？</em></>}>
      <div className="l03-gap-question"><K tex="80-a_n=20(0.6)^n>0" display /><div className="l03-fading-gaps">{[20, 12, 7.2, 4.32, 2.592, 1.555].map((value) => <span key={value} style={{ height: `${16 + value * 8}px` }}><K tex={String(value)} /></span>)}</div></div>
      <p className="l03-big-prompt">这个始终为正的差距，能小到什么程度？</p>
    </ArtPage>
  ),
  "em-l03-s12": (props) => (
    <ArtPage spec={props.spec} className="l03-s12" eyebrow={<>达到 <K tex="\ne" /> 趋近</>} title={<>可以永远不到，<em>却任意接近</em></>}>
      <div className="l03-approach-river"><div className="l03-arrive"><strong>达到</strong><K tex="\exists n,\ a_n=80" /><span>某一项真的落在目标上</span></div><svg viewBox="0 0 520 300" aria-hidden="true"><path d="M15 270C160 250 185 122 305 95S438 70 505 67" /><path d="M15 44H505" /></svg><div className="l03-approach"><strong>趋近</strong><K tex="a_n\to80" /><span>任意窄的邻域都能进入并保持</span></div></div>
    </ArtPage>
  ),
  "em-l03-s13": (props) => (
    <ArtPage spec={props.spec} className="l03-s13" eyebrow="舍入会隐藏差距" title={<>屏幕显示 80.000，<em>不代表精确相等</em></>}>
      <div className="l03-digital-microscope"><div className="l03-digital"><span>80.000</span><small>格式化显示</small></div><div className="l03-magnifier"><K tex="a_{25}=80-20(0.6)^{25}<80" display /><p>镜头继续放大，仍能看见一条极小的正差距。</p></div></div>
    </ArtPage>
  ),
  "em-l03-s14": (props) => (
    <ArtPage spec={props.spec} className="l03-s14" eyebrow="用一个记号写下长期趋向" title={<>不是代入无穷，而是描述过程</>}>
      <div className="l03-symbol-focus"><K tex="\lim_{n\to\infty}a_n=80" display /></div>
      <div className="l03-reading-line"><span>当轮次</span><K tex="n" /><b>无界增加</b><span>时，数列</span><K tex="a_n" /><b>趋近</b><K tex="80" /></div>
    </ArtPage>
  ),
  "em-l03-s15": (props) => (
    <ArtPage spec={props.spec} className="l03-s15" eyebrow="研究数列，也可以研究距离" title={<>把“靠近”变成<em>可测量的差距</em></>}>
      <div className="l03-distance-equation"><K tex="|a_n-80|" display /><span className="l03-distance-equation__operator"><K tex="=" label="等于" /></span><K tex="20(0.6)^n" display /></div>
      <div className="l03-three-properties"><span>始终为正</span><span>持续缩小</span><span>可小于任意给定正数</span></div>
      <GapGauge n={8} />
    </ArtPage>
  ),
  "em-l03-s16": (props) => (
    <ArtPage spec={props.spec} className="l03-s16" eyebrow={<>先画一条 <K tex="\pm1" /> 个百分点的容忍带</>} title={<>从哪一轮起，<em>后面再也不出去？</em></>}>
      <SequencePlot current={12} epsilon={1} compact id="band-one" />
      <p className="l03-big-prompt"><K tex="79<a_n<81" /> · 先从图上猜，再用不等式核验。</p>
    </ArtPage>
  ),
  "em-l03-s17": (props) => (
    <ArtPage spec={props.spec} className="l03-s17" eyebrow={<>完整求解 · <K tex="\pm1" /> 容忍带</>} title={<>从“看起来进入”到<em>严格找到门槛</em></>}>
      <EquationTrail>
        <div><K tex="|a_n-80|<1" /></div><b>代入差距</b><div><K tex="20(0.6)^n<1" /></div><b>取对数</b><div><K tex="n>\frac{\ln0.05}{\ln0.6}\approx5.864" /></div><b>取最小整数</b><div className="is-answer"><K tex="N=6" /></div>
      </EquationTrail>
      <p className="l03-sign-warning">注意：<K tex="\ln0.6<0" />，相除时不等号方向改变。</p>
    </ArtPage>
  ),
  "em-l03-s18": (props) => (
    <ArtPage spec={props.spec} className="l03-s18 l03-art--exercise" eyebrow="独立练习 · 3 分钟" title={<>把容忍带收窄到 <K tex="\pm0.2" /></>}>
      <div className="l03-exercise-core"><K tex="|a_n-80|<0.2" display /><p>求最小整数 <K tex="N" />，使得 <K tex="n\ge N" /> 时，所有项都在带内。</p></div>
      <div className="l03-answer-skeleton"><span><K tex="20(0.6)^n<\square" /></span><span><K tex="n>\frac{\ln(\square)}{\ln(0.6)}" /></span><span><K tex="N=\square" /></span></div>
    </ArtPage>
  ),
  "em-l03-s19": (props) => (
    <ArtPage spec={props.spec} className="l03-s19" eyebrow="带越窄 · 等待越久" title={<>最小等待轮次：<em><K tex="N=10" /></em></>}>
      <div className="l03-threshold-gate"><span className="before"><K tex="n=9" /><small><K tex="20(0.6)^9\approx0.202>0.2" /></small></span><i /><span className="after"><K tex="n=10" /><small><K tex="20(0.6)^{10}\approx0.121<0.2" /></small></span></div>
      <p className="l03-verdict-line">第 9 轮还在门外；第 10 轮起进入并保持。</p>
    </ArtPage>
  ),
  "em-l03-s20": (props) => <SequenceLimitLab props={props} />,
  "em-l03-s21": (props) => (
    <ArtPage spec={props.spec} className="l03-s21" eyebrow="实验记录 · 三条容忍带" title={<>要求越严，<em>等待轮次越大</em></>}>
      <div className="l03-band-timeline"><div style={{ "--stop": "18%" } as CSSProperties}><K tex="\varepsilon=5" /><span /><b><K tex="N=3" /></b></div><div style={{ "--stop": "42%" } as CSSProperties}><K tex="\varepsilon=1" /><span /><b><K tex="N=6" /></b></div><div style={{ "--stop": "74%" } as CSSProperties}><K tex="\varepsilon=0.2" /><span /><b><K tex="N=10" /></b></div></div>
      <p className="l03-floor-prompt">带宽 <K tex="\varepsilon" /> 变小，等待轮次 <K tex="N" /> 朝哪个方向变化？</p>
    </ArtPage>
  ),
  "em-l03-s22": (props) => (
    <ArtPage spec={props.spec} className="l03-s22" eyebrow="“从某项以后”是关键" title={<>偶然进入一次，<em>还不能叫趋近</em></>}>
      <div className="l03-enter-stay"><div><strong>只进入一次</strong><svg viewBox="0 0 560 240"><path className="band" d="M20 105H540M20 145H540" /><polyline points="25,35 100,190 175,125 250,25 325,180 400,118 475,30 535,190" /></svg><span>后续还会跑出去</span></div><div><strong>进入并保持</strong><svg viewBox="0 0 560 240"><path className="band" d="M20 105H540M20 145H540" /><polyline points="25,25 100,205 175,160 250,132 325,120 400,126 475,123 535,124" /></svg><span><K tex="\exists N,\ \forall n\ge N" /></span></div></div>
    </ArtPage>
  ),
  "em-l03-s23": (props) => (
    <ArtPage spec={props.spec} className="l03-s23" eyebrow={<><K tex="\varepsilon\text{—}N" /> 语言</>} title={<>任意窄的带，<em>总能找到等待轮次</em></>}>
      <div className="l03-quantifier-flow"><span><K tex="\forall\varepsilon>0" /><small>任给正误差</small></span><i>→</i><span><K tex="\exists N" /><small>总能找到门槛</small></span><i>→</i><span><K tex="n\ge N" /><small>从门槛以后</small></span><i>→</i><span><K tex="|a_n-A|<\varepsilon" /><small>全部留在带内</small></span></div>
    </ArtPage>
  ),
  "em-l03-s24": (props) => (
    <ArtPage spec={props.spec} className="l03-s24" eyebrow="把符号翻译成一句可检验的话" title={<>极限不是“看起来差不多”</>}>
      <blockquote className="l03-definition-quote">任给一个正的容许误差 <K tex="\varepsilon" />，总能找到某个轮次 <K tex="N" />，使从该轮起所有项 <K tex="a_n" /> 与 <K tex="A" /> 的距离都小于 <K tex="\varepsilon" />。</blockquote>
      <p className="l03-big-prompt">现在把 <K tex="A" /> 换成 <K tex="80" />，完整重说一遍。</p>
    </ArtPage>
  ),
  "em-l03-s25": (props) => (
    <ArtPage spec={props.spec} className="l03-s25" eyebrow="收敛与发散" title={<>有没有一个<em>有限的长期落点？</em></>}>
      <div className="l03-converge-diverge"><div className="converge"><svg viewBox="0 0 620 270"><path d="M20 30C190 35 220 115 390 132S520 136 600 136" /><path d="M20 240C185 230 250 157 400 142S530 137 600 136" /></svg><strong>收敛</strong><K tex="a_n\to A\in\mathbb{R}" /></div><div className="diverge"><svg viewBox="0 0 620 270"><path d="M20 130C120 15 180 250 280 130S445 15 600 230" /></svg><strong>发散</strong><span>没有这样的有限落点</span></div></div>
    </ArtPage>
  ),
  "em-l03-s26": (props) => (
    <ArtPage spec={props.spec} className="l03-s26" eyebrow="三串数 · 三种长期表现" title={<>先画前六项，再给它们分类</>}>
      <div className="l03-three-mini"><MiniSequence kind="constant" label={<K tex="u_n=5" />} /><MiniSequence kind="decay" label={<K tex="v_n=\frac1n" />} /><MiniSequence kind="oscillate" label={<K tex="w_n=(-1)^n" />} /></div>
      <p className="l03-floor-prompt">“上下波动”一定发散吗？下一页会出现一个反例。</p>
    </ArtPage>
  ),
  "em-l03-s27": (props) => (
    <ArtPage spec={props.spec} className="l03-s27 l03-art--exercise" eyebrow="独立判断 · 写理由而非只写结论" title={<>四个数列，谁收敛？</>}>
      <div className="l03-four-lanes"><span><b>a</b><K tex="b_n=3+\frac2n" /></span><span><b>b</b><K tex="c_n=\frac{n}{n+1}" /></span><span><b>c</b><K tex="d_n=\frac{(-1)^n}{n}" /></span><span><b>d</b><K tex="e_n=n" /></span></div>
      <p className="l03-big-prompt">每个数列：算代表项 → 判断趋势 → 写出可能极限。</p>
    </ArtPage>
  ),
  "em-l03-s28": (props) => (
    <ArtPage spec={props.spec} className="l03-s28" eyebrow="答案核对 · 重点看振荡幅度" title={<>正负摆动，<em>也可能收敛</em></>}>
      <div className="l03-answer-plots"><MiniSequence kind="decay" label={<><K tex="b_n\to3" /> · 收敛</>} /><MiniSequence kind="decay" label={<><K tex="c_n\to1" /> · 收敛</>} /><MiniSequence kind="shrinking" label={<><K tex="d_n\to0" /> · 收敛</>} /><MiniSequence kind="growth" label={<><K tex="e_n" /> · 无界发散</>} /></div>
      <div className="l03-key-bound"><K tex="|d_n|=\frac1n\to0" /><span>摆动仍在，但振幅被压向 0</span></div>
    </ArtPage>
  ),
  "em-l03-s29": (props) => (
    <ArtPage spec={props.spec} className="l03-s29" eyebrow="极限的四则运算" title={<>熟悉的极限，可以<em>组合成新极限</em></>}>
      <div className="l03-law-orbit"><span><K tex="a_n\to A" /></span><span><K tex="b_n\to B" /></span><div><K tex="\lim(a_n\pm b_n)=A\pm B" /><K tex="\lim(a_nb_n)=AB" /><K tex="\lim\frac{a_n}{b_n}=\frac AB,\quad B\ne0" /></div></div>
      <p className="l03-sign-warning">商法则启用前，先检查分母极限 <K tex="B\ne0" />。</p>
    </ArtPage>
  ),
  "em-l03-s30": (props) => (
    <ArtPage spec={props.spec} className="l03-s30" eyebrow="运算法则示范" title={<>复杂项，拆成熟悉的两股趋势</>}>
      <div className="l03-decomposition"><div className="l03-decomposition__source"><K tex="x_n=2a_n+\frac3n" display /></div><svg viewBox="0 0 760 170" aria-hidden="true"><path d="M255 10C250 85 190 105 130 150" /><path d="M505 10C510 85 585 105 650 150" /></svg><span className="l03-decomposition__branch l03-decomposition__branch--left"><K tex="a_n\to80" /></span><span className="l03-decomposition__branch l03-decomposition__branch--right"><K tex="\frac3n\to0" /></span></div>
      <div className="l03-final-equation"><K tex="\lim x_n=2\times80+0=160" display /></div>
    </ArtPage>
  ),
  "em-l03-s31": (props) => (
    <ArtPage spec={props.spec} className="l03-s31 l03-art--exercise" eyebrow="独立练习 · 2 分钟" title={<>商法则能否使用，<em>先看分母</em></>}>
      <div className="l03-exercise-core"><K tex="y_n=\frac{a_n+20}{2-1/n}" display /><p>求 <K tex="\lim_{n\to\infty}y_n" />，并写明商法则为什么可用。</p></div>
      <div className="l03-check-circle"><span>必须检查</span><K tex="\lim_{n\to\infty}\left(2-\frac1n\right)\ne0" /></div>
    </ArtPage>
  ),
  "em-l03-s32": (props) => (
    <ArtPage spec={props.spec} className="l03-s32" eyebrow="解答 · 条件与运算一起写" title={<>分母趋近 2，<em>商法则通行</em></>}>
      <div className="l03-fraction-gate"><div><small>分子</small><K tex="a_n+20\to100" /></div><div><small>分母</small><K tex="2-\frac1n\to2\ne0" /></div><span className="l03-fraction-gate__operator"><K tex="\div" label="除以" /></span><strong><K tex="\lim y_n=\frac{100}{2}=50" /></strong></div>
    </ArtPage>
  ),
  "em-l03-s33": (props) => (
    <ArtPage spec={props.spec} className="l03-s33" eyebrow="趋势 + 边界" title={<>它一直上升，<em>又始终越不过 80</em></>}>
      <SequencePlot current={12} compact id="monotone" />
      <div className="l03-dual-proof"><span><K tex="a_{n+1}-a_n>0" /> · 每一步向上</span><span><K tex="a_n<80" /> · 每一步受压</span></div>
    </ArtPage>
  ),
  "em-l03-s34": (props) => (
    <ArtPage spec={props.spec} className="l03-s34" eyebrow="验证单调递增" title={<>相邻两项相减，<em>结果始终为正</em></>}>
      <EquationTrail><div><K tex="a_{n+1}=80-12(0.6)^n" /></div><b>减去</b><div><K tex="a_n=80-20(0.6)^n" /></div><b>整理</b><div className="is-answer"><K tex="a_{n+1}-a_n=8(0.6)^n>0" /></div></EquationTrail>
      <p className="l03-verdict-line">所以 <K tex="a_{n+1}>a_n" />：数列严格递增。</p>
    </ArtPage>
  ),
  "em-l03-s35": (props) => (
    <ArtPage spec={props.spec} className="l03-s35" eyebrow="验证上界" title={<>80 像一块透明天花板</>}>
      <div className="l03-ceiling"><span><K tex="80" /></span><div><K tex="80-a_n=20(0.6)^n>0" display /><i>因此</i><K tex="a_n<80" display /></div></div>
      <p className="l03-sign-warning">有上界不等于极限就是上界；还要确认差距趋近 0。</p>
    </ArtPage>
  ),
  "em-l03-s36": (props) => (
    <ArtPage spec={props.spec} className="l03-s36" eyebrow="结构性核对" title={<>三项证据，指向同一结论</>}>
      <div className="l03-evidence-triangle"><svg aria-hidden="true" viewBox="0 0 1000 470"><path d="M500 62L120 398H880Z" /><circle cx="500" cy="248" r="116" /></svg><span className="trend">趋势<K tex="a_{n+1}>a_n" /></span><span className="bound">边界<K tex="a_n<80" /></span><span className="gap">差距<K tex="20(0.6)^n\to0" /></span><strong><K tex="a_n\to80" /></strong></div>
    </ArtPage>
  ),
  "em-l03-s37": (props) => (
    <ArtPage spec={props.spec} className="l03-s37" eyebrow="错误审计 · 数据与模型不是同一种证据" title={<>前六项，<em>看不到无限远</em></>}>
      <div className="l03-horizon"><div className="observed">{Array.from({ length: 6 }, (_, n) => <i key={n} />)}<strong>有限观察</strong><span>只支持这六轮发生过什么</span></div><div className="model"><span className="ray" /><strong>模型外推</strong><span>长期趋向来自给定通项公式</span></div></div>
      <p className="l03-verdict-line">新数据仍要持续检验模型；不能把虚构记录写成真实承诺。</p>
    </ArtPage>
  ),
  "em-l03-s38": (props) => (
    <ArtPage spec={props.spec} className="l03-s38 l03-art--image" eyebrow="经济语言 · 保留模型边界" title={<>趋近长期水平，<br /><em>不承诺某轮达到</em></>} image="/course-assets/economic-mathematics/art/l03-plateau-citylights.webp" imageAlt="重庆夜景中逐渐趋稳的触达曲线教学情境插画">
      <div className="l03-marketing-statement"><p>随着触达轮次增加，知晓率趋近 <K tex="80\%" />。</p><p>边际提升不断缩小；任一有限轮次仍满足 <K tex="a_n<80" />。</p></div>
    </ArtPage>
  ),
  "em-l03-s39": (props) => (
    <ArtPage spec={props.spec} className="l03-s39" eyebrow="容忍带 → 行动阈值" title={<>“还差多远”，比“做了几轮”更可决策</>}>
      <div className="l03-waiting-scale"><div><K tex="\varepsilon=1" /><span style={{ width: "54%" }} /><b>至少 6 轮</b></div><div><K tex="\varepsilon=0.2" /><span style={{ width: "88%" }} /><b>至少 10 轮</b></div></div>
      <div className="l03-cost-question">目标更严 → 等待更久 → 投入更多<p>但每轮成本、疲劳与退订尚未进入这个模型。</p></div>
    </ArtPage>
  ),
  "em-l03-s40": (props) => (
    <ArtPage spec={props.spec} className="l03-s40 l03-art--exercise" eyebrow="课堂检验 · 5 分钟 · 完整表述" title={<>一个从上方靠近的指标</>}>
      <div className="l03-capstone"><K tex="b_n=120+30(0.5)^n" display /><ol><li>计算 <K tex="b_0,b_1,b_4" /></li><li>判断单调方向与极限</li><li>求满足 <K tex="|b_n-120|<1" /> 的最小 <K tex="N" /></li></ol></div>
      <p className="l03-floor-prompt">先独立完成，不调用实验台。</p>
    </ArtPage>
  ),
  "em-l03-s41": (props) => (
    <ArtPage spec={props.spec} className="l03-s41" eyebrow="课堂检验核对" title={<>从上方递减，<em>趋近 120</em></>}>
      <SequencePlot current={10} descending compact id="descending" />
      <div className="l03-solution-strip"><K tex="b_0=150,\ b_1=135,\ b_4=121.875" /><K tex="b_{n+1}-b_n=-15(0.5)^n<0" /><K tex="N=5" /></div>
    </ArtPage>
  ),
  "em-l03-s42": (props) => (
    <ArtPage spec={props.spec} className="l03-s42" eyebrow="错误审计 · 无穷不是轮次" title={<>不能把 <K tex="\infty" /> 当作一个数字代入</>}>
      <div className="l03-infinity-error"><span className="is-wrong"><K tex="a_{\infty}=80" display /></span><div className="l03-infinity-error__operator"><K tex="\times" label="错误" /></div><span className="is-right"><K tex="\lim_{n\to\infty}a_n=80" display /></span></div>
      <p className="l03-verdict-line"><K tex="n\to\infty" /> 描述轮次无界增加的过程，不创建一项叫 <K tex="a_{\infty}" /> 的数。</p>
    </ArtPage>
  ),
  "em-l03-s43": (props) => (
    <ArtPage spec={props.spec} className="l03-s43" eyebrow="模型边界 · 描述不等于优化" title={<>它回答“趋向哪里”，<em>没有回答“值不值得”</em></>}>
      <div className="l03-boundary-rings"><div className="known"><strong>本模型内</strong><span>轮次</span><span>知晓率</span><span>长期趋向</span></div><div className="unknown"><strong>仍在模型外</strong><span>触达成本</span><span>用户疲劳</span><span>退订与竞品</span><span>最优轮次</span></div></div>
    </ArtPage>
  ),
  "em-l03-s44": (props) => (
    <ArtPage spec={props.spec} className="l03-s44" eyebrow="判断数列极限 · 四个动作" title={<>让每一次判断，都能被复核</>}>
      <div className="l03-four-actions"><span><b>01</b>算代表项<small>先看数值节奏</small></span><i>→</i><span><b>02</b>画离散点<small>观察长期趋势</small></span><i>→</i><span><b>03</b>研究差距<small><K tex="|a_n-A|" /></small></span><i>→</i><span><b>04</b>写清边界<small>进入并保持</small></span></div>
    </ArtPage>
  ),
  "em-l03-s45": (props) => (
    <ArtPage spec={props.spec} className="l03-s45" eyebrow="下一讲 · 从数列极限到函数极限" title={<>轮次只能取整数，<em>价格却能连续靠近</em></>}>
      <div className="l03-discrete-continuous"><div><span>离散</span><svg viewBox="0 0 560 280"><path d="M30 230H530M30 40V230" />{[0, 1, 2, 3, 4, 5].map((n) => <circle key={n} cx={60 + n * 86} cy={215 - n * 28} r="10" />)}</svg><K tex="n\to\infty" /></div><i>→</i><div><span>连续逼近</span><svg viewBox="0 0 560 280"><path d="M30 230H530M30 40V230" /><path d="M45 205C170 180 238 125 475 60" /><circle className="hole" cx="310" cy="112" r="13" /></svg><K tex="x\to5" /></div></div>
      <div className="l03-next-formula"><K tex="\frac{x^2-25}{x-5}" /><span>代入 <K tex="x=5" /> 会发生什么？</span></div>
    </ArtPage>
  )
} satisfies Record<string, Lesson03Renderer>;

export function Lesson03ArtSlides(props: Lesson03ArtSlidesProps) {
  const renderer = LESSON_03_ART_REGISTRY[props.spec.slideKey as keyof typeof LESSON_03_ART_REGISTRY];
  if (!renderer) {
    throw new Error(`LESSON_03_ART_SLIDE_NOT_REGISTERED:${props.spec.slideKey}`);
  }
  return renderer(props);
}

export const LESSON_03_ART_SLIDE_KEYS = Object.freeze(Object.keys(LESSON_03_ART_REGISTRY));
