import type { EconomicMathematicsSlideSpec } from "@edu/course-content/economic-mathematics";
import type { SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import katex from "katex";
import type { ReactNode } from "react";

export interface Lesson04ArtSlidesProps {
  spec: EconomicMathematicsSlideSpec;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}

interface PageProps { spec: EconomicMathematicsSlideSpec; }

function K({ value, display = false, className = "" }: { value: string; display?: boolean; className?: string }) {
  const html = katex.renderToString(value, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    trust: false,
    output: "htmlAndMathml"
  });
  const Tag = display ? "div" : "span";
  return <Tag className={`l4-katex ${display ? "l4-katex--display" : "l4-katex--inline"} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Shell({ spec, page, kicker, title, children, dark = false }: {
  spec: EconomicMathematicsSlideSpec;
  page: string;
  kicker: ReactNode;
  title: ReactNode;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <article className={`l4-art l4-art--${spec.accent} l4-art--${page}${dark ? " l4-art--dark" : ""}`}>
      <div className="l4-art__texture" aria-hidden="true" />
      <header className="l4-art__header">
        <b>经济数学</b><span>第4讲 · {spec.section}</span><em>{String(spec.localIndex).padStart(2, "0")} / 45</em>
      </header>
      <main className="l4-art__main">
        <div className="l4-art__heading"><p>{kicker}</p><h1>{title}</h1></div>
        <div className="l4-art__stage">{children}</div>
      </main>
      <footer className="l4-art__footer"><b>{spec.sourceLabel}</b><span>{spec.sourceNote ?? "课堂自制情境、图形与概念模型"}</span><span>函数极限与运算法则</span></footer>
    </article>
  );
}

function Prompt({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <div className={`l4-prompt${light ? " l4-prompt--light" : ""}`}><b>判断</b><span>{children}</span></div>;
}

function Arrow({ className = "" }: { className?: string }) {
  return <span className={`l4-arrow ${className}`} aria-hidden="true"><i /></span>;
}

function Slide01({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s01" kicker="山城新饮 · 价格测试" title="50元那一天，记录恰好缺了一格" dark>
      <img className="l4-s01__photo" src="/course-assets/economic-mathematics/art/l04-missing-point.webp" alt="价格测试记录在五十元处缺失的教学情境插画" />
      <div className="l4-s01__veil" />
      <div className="l4-s01__strip"><span>49.9元</span><strong>34979.9元</strong><i /><span>50.1元</span><strong>35019.9元</strong></div>
      <div className="l4-s01__missing"><b>50.0</b><span>记录缺失</span></div>
      <Prompt light>没有点上的记录，还能描述点旁的趋势吗？</Prompt>
    </Shell>
  );
}

function Slide02({ spec }: PageProps) {
  const rows = [["49.0","34790.0"],["49.9","34979.9"],["50.0","—"],["50.1","35019.9"],["51.0","35190.0"]];
  return (
    <Shell spec={spec} page="s02" kicker={<>收入模型 <K value={String.raw`R(p)=1200p-10p^2`} /></>} title="数值从两侧逼近50">
      <div className="l4-s02__ribbon">
        {rows.map(([p,r]) => <div className={p === "50.0" ? "is-hole" : ""} key={p}><span>售价 {p}</span><strong>{r === "—" ? "缺" : r}</strong><b>收入 / 元</b></div>)}
      </div>
      <div className="l4-s02__arrows"><Arrow /><span>靠近</span><Arrow /></div>
      <div className="l4-s02__note">只描述公式给出的附近趋势，不补造真实营业记录。</div>
    </Shell>
  );
}

function Slide03({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s03" kicker="两个不同的问题" title="我们问的是“到达”，还是“靠近”？">
      <div className="l4-s03__arrive"><span>正好到达</span><K value="R(50)" /><i className="solid" /><b>点上的函数值</b></div>
      <div className="l4-s03__near"><span>不断靠近</span><K value={String.raw`\lim_{p\to50}R(p)`} /><i className="hollow" /><b>点旁的变化趋势</b></div>
      <svg className="l4-s03__track" viewBox="0 0 1380 210" aria-hidden="true"><path d="M50 110H1330" /><circle cx="430" cy="110" r="13" /><circle cx="960" cy="110" r="18" /></svg>
      <Prompt>哪一个问题不需要知道50元处是否有记录？</Prompt>
    </Shell>
  );
}

function Slide04({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s04" kicker={<>当 <K value="x" /> 靠近 <K value="x_0" /></>} title="函数极限研究附近，不只盯住一点">
      <img className="l4-s04__photo" src="/course-assets/economic-mathematics/art/l04-two-sided-approach.webp" alt="函数曲线从左右两侧趋向同一空心点的教学插画" />
      <div className="l4-s04__mask" />
      <div className="l4-s04__definition">当自变量从左右两侧充分靠近 <K value="x_0" /> 时，函数值能够任意接近同一个数 <K value="A" />。</div>
      <div className="l4-s04__three"><span>附近</span><span>不必等于</span><span>同一个目的地</span></div>
    </Shell>
  );
}

function Slide05({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s05" kicker="点值与极限彼此独立" title="同一处坐标，可能出现三种关系">
      <div className="l4-s05__triptych">
        <figure><svg viewBox="0 0 330 220"><path d="M20 185C130 155 190 65 310 35"/><circle className="solid" cx="168" cy="104" r="12"/></svg><figcaption>点值存在，且接上趋势</figcaption></figure>
        <figure><svg viewBox="0 0 330 220"><path d="M20 185C130 155 190 65 310 35"/><circle className="hole" cx="168" cy="104" r="13"/></svg><figcaption>点值缺失，趋势仍存在</figcaption></figure>
        <figure><svg viewBox="0 0 330 220"><path d="M20 185C130 155 190 65 310 35"/><circle className="hole" cx="168" cy="104" r="13"/><circle className="solid" cx="168" cy="42" r="12"/></svg><figcaption>点值存在，却不等于趋势</figcaption></figure>
      </div>
      <div className="l4-s05__thesis">极限看“点旁”；函数值看“点上”。</div>
    </Shell>
  );
}

function Slide06({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s06" kicker="把靠近写进记号" title="箭头不是等号" dark>
      <div className="l4-s06__formula"><K value={String.raw`\lim_{x\to x_0}f(x)=A`} display /></div>
      <div className="l4-s06__anatomy"><span><K value={String.raw`x\to x_0`} />：自变量靠近</span><span><K value="f(x)" />：附近的函数值</span><span><K value="A" />：共同趋向</span></div>
      <div className="l4-s06__not-equal"><K value={String.raw`x\to x_0`} /><strong><K value={String.raw`\ne`} /></strong><K value={String.raw`x=x_0`} /></div>
    </Shell>
  );
}

function Slide07({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s07" kicker="左边靠近 + 右边靠近" title="双侧极限要求两条路抵达同一高度">
      <div className="l4-s07__plot">
        <svg viewBox="0 0 1160 500" role="img" aria-label="函数曲线从左右两侧逼近同一个空心点">
          <title>双侧函数极限</title><path className="axes" d="M80 25V440H1090"/><path className="curve" d="M100 390C260 350 390 175 565 140M595 140C760 175 865 340 1060 390"/><circle className="hole" cx="580" cy="140" r="17"/><path className="left-arrow" d="M250 320L475 175"/><path className="right-arrow" d="M910 320L690 175"/>
        </svg>
        <div className="l4-s07__x0"><K value="x_0" /></div><div className="l4-s07__a"><K value="A" /></div>
      </div>
      <div className="l4-s07__criterion"><span>左侧目的地</span><K value="=" /><span>右侧目的地</span><K value="=" /><K value="A" /></div>
    </Shell>
  );
}

function Slide08({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s08" kicker="左极限" title="始终在左边，但越来越近">
      <div className="l4-s08__line"><span>远</span><i /><i /><i /><i /><b className="hole" /><strong><K value="x_0" /></strong></div>
      <Arrow className="l4-s08__arrow" />
      <K value={String.raw`\lim_{x\to x_0^-}f(x)=A`} display className="l4-s08__formula" />
      <div className="l4-s08__reading">上标 <K value="-" /> 读作“从左侧”，不是负数。</div>
    </Shell>
  );
}

function Slide09({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s09" kicker="右极限" title="始终在右边，但越来越近">
      <div className="l4-s09__line"><strong><K value="x_0" /></strong><b className="hole" /><i /><i /><i /><i /><span>远</span></div>
      <Arrow className="l4-s09__arrow" />
      <K value={String.raw`\lim_{x\to x_0^+}f(x)=A`} display className="l4-s09__formula" />
      <div className="l4-s09__reading">上标 <K value="+" /> 读作“从右侧”。</div>
    </Shell>
  );
}

function Slide10({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s10" kicker="双侧极限的存在准则" title="左右相等，才有共同目的地">
      <div className="l4-s10__balance">
        <div><span>左侧</span><K value={String.raw`\lim_{x\to x_0^-}f(x)`} /></div>
        <strong><K value="=" /></strong>
        <div><span>右侧</span><K value={String.raw`\lim_{x\to x_0^+}f(x)`} /></div>
        <strong><K value="=" /></strong>
        <div className="destination"><span>共同结果</span><K value="A" /></div>
      </div>
      <K value={String.raw`\lim_{x\to x_0}f(x)=A`} display className="l4-s10__result" />
      <div className="l4-s10__warning">任一侧不存在，或两侧不相等：双侧极限不存在。</div>
    </Shell>
  );
}

function Slide11({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s11" kicker="一个空心点，不妨碍趋近" title="曲线缺一点，仍指向同一高度">
      <div className="l4-s11__graph">
        <svg viewBox="0 0 920 560" role="img" aria-label="直线y等于x加五在五十处有一个空心点">
          <title>可约函数的空心点图像</title><path className="grid" d="M80 100H870M80 200H870M80 300H870M80 400H870M220 35V500M360 35V500M500 35V500M640 35V500M780 35V500"/><path className="axes" d="M80 30V500H880"/><path className="line" d="M100 450L820 70"/><circle className="hole" cx="500" cy="239" r="18"/><text x="455" y="535">5</text><text x="25" y="245">10</text>
        </svg>
        <div className="l4-s11__label"><K value="(5,10)" /><span>空心点</span></div>
      </div>
      <div className="l4-s11__formula"><K value={String.raw`f(x)=\frac{x^2-25}{x-5},\quad x\ne5`} display /><span>附近图像与 <K value="y=x+5" /> 重合</span></div>
    </Shell>
  );
}

function Slide12({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s12" kicker="完整例题" title="在附近约分，不是在缺点处硬算">
      <div className="l4-s12__steps">
        <div><b>01</b><K value={String.raw`x^2-25=(x-5)(x+5)`} /></div>
        <div><b>02</b><K value={String.raw`\frac{(x-5)(x+5)}{x-5}=x+5\quad(x\ne5)`} /></div>
        <div><b>03</b><K value={String.raw`x\to5\quad\Rightarrow\quad x+5\to10`} /></div>
      </div>
      <K value={String.raw`\lim_{x\to5}\frac{x^2-25}{x-5}=10`} display className="l4-s12__answer" />
      <div className="l4-s12__boundary">极限是10，不代表原函数在 <K value="x=5" /> 有定义。</div>
    </Shell>
  );
}

function Slide13({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s13" kicker="纸面演算 · 2分钟" title="先因式分解，再靠近">
      <K value={String.raw`\lim_{x\to3}\frac{x^2-9}{x-3}`} display className="l4-s13__problem" />
      <div className="l4-s13__workspace"><span>识别结构</span><i /><span>保留条件</span><i /><span>再求趋势</span></div>
      <Prompt><K value={String.raw`0/0`} /> 为什么不能直接作为答案？</Prompt>
    </Shell>
  );
}

function Slide14({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s14" kicker="练习解答" title="附近规则化成一条直线">
      <div className="l4-s14__cancel">
        <K value={String.raw`\frac{(x-3)(x+3)}{x-3}`} /><Arrow /><K value="x+3" />
        <span className="l4-s14__slash l4-s14__slash--one" /><span className="l4-s14__slash l4-s14__slash--two" />
      </div>
      <div className="l4-s14__condition"><K value={String.raw`x\ne3`} /> 时才可约分</div>
      <K value={String.raw`\lim_{x\to3}\frac{x^2-9}{x-3}=6`} display className="l4-s14__answer" />
    </Shell>
  );
}

function Slide15({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s15" kicker="方法选择" title="第一步永远是试代入">
      <div className="l4-s15__compass">
        <div className="center">试代入</div>
        <div className="finite"><b>有限数</b><span>直接完成</span></div>
        <div className="indeterminate"><b><K value={String.raw`0/0`} /></b><span>先化简结构</span></div>
        <div className="sided"><b>左右不同</b><span>分侧研究</span></div>
        <div className="unbounded"><b>量值无界</b><span>判断符号方向</span></div>
        <svg viewBox="0 0 1180 500" aria-hidden="true"><path d="M590 250L165 90M590 250L1010 90M590 250L170 420M590 250L1010 420" /></svg>
      </div>
      <div className="l4-s15__rule"><K value={String.raw`0/0`} /> 是“需要换方法”的信号，不是极限值。</div>
    </Shell>
  );
}

function Slide16({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s16" kicker="第一类 · 代入得到有限值" title="多项式在有限点，直接代入">
      <div className="l4-s16__substitute"><K value={String.raw`3x^2-5x+1`} /><Arrow /><K value={String.raw`3(2)^2-5(2)+1`} /></div>
      <div className="l4-s16__arithmetic"><span><K value="12" /></span><i><K value="-" /></i><span><K value="10" /></span><i><K value="+" /></i><span><K value="1" /></span><i><K value="=" /></i><strong><K value="3" /></strong></div>
      <K value={String.raw`\lim_{x\to2}(3x^2-5x+1)=3`} display className="l4-s16__answer" />
    </Shell>
  );
}

function Slide17({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s17" kicker="分式先检查分母" title="分母趋向非零，才能直接使用商法则">
      <div className="l4-s17__fraction"><span><K value={String.raw`x^2+2\to3`} /></span><i /><span><K value={String.raw`x+3\to4`} /></span></div>
      <div className="l4-s17__gate"><K value={String.raw`4\ne0`} /><span>商法则通行</span></div>
      <K value={String.raw`\lim_{x\to1}\frac{x^2+2}{x+3}=\frac34`} display className="l4-s17__answer" />
    </Shell>
  );
}

function Slide18({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s18" kicker="纸面演算 · 先分类，再计算" title="三道题，只有一题不能直接代入">
      <div className="l4-s18__problems">
        <div><b>A</b><K value={String.raw`\lim_{x\to-1}(2x^3+x-4)`} /></div>
        <div><b>B</b><K value={String.raw`\lim_{x\to2}\frac{x+5}{x^2+1}`} /></div>
        <div><b>C</b><K value={String.raw`\lim_{x\to4}\frac{x-4}{\sqrt{x}-2}`} /></div>
      </div>
      <Prompt>标出两题“直接代入”，一题“先化简”。</Prompt>
    </Shell>
  );
}

function Slide19({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s19" kicker="方法先于运算" title="前两题有限，第三题发出0/0信号">
      <div className="l4-s19__answers">
        <div><b>A</b><span>直接代入</span><K value="-7" /></div>
        <div><b>B</b><span>直接代入</span><K value={String.raw`\frac75`} /></div>
        <div className="needs-work"><b>C</b><span><K value={String.raw`0/0`} /> → 利用根式结构</span><K value="4" /></div>
      </div>
      <K value={String.raw`x-4=(\sqrt{x}-2)(\sqrt{x}+2)`} display className="l4-s19__identity" />
    </Shell>
  );
}

function Slide20({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s20" kicker="未定式 · 错误审计" title="0/0只说明：直接代入失去信息" dark>
      <div className="l4-s20__zero"><K value={String.raw`\frac00`} /></div>
      <div className="l4-s20__cross" aria-hidden="true" />
      <div className="l4-s20__examples">
        <div><K value={String.raw`\frac{x-1}{x-1}`} /><Arrow /><K value="1" /></div>
        <div><K value={String.raw`\frac{2(x-1)}{x-1}`} /><Arrow /><K value="2" /></div>
      </div>
      <div className="l4-s20__verdict"><K value={String.raw`0/0`} /> 不是0，不是无穷，也不是答案。</div>
    </Shell>
  );
}

function Slide21({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s21" kicker="化简工具箱" title="目标不是“变复杂”，而是暴露附近规则">
      <img className="l4-s21__photo" src="/course-assets/economic-mathematics/art/l04-limit-algebra.webp" alt="代数结构被拆解和重新组合的教学插画" />
      <div className="l4-s21__veil" />
      <div className="l4-s21__tools"><div><b>因式分解</b><span>多项式的差</span></div><div><b>通分</b><span>多个分式相减</span></div><div><b>有理化</b><span>根式之差</span></div></div>
      <div className="l4-s21__aim">化简之后，附近规则应当可以直接读出趋势。</div>
    </Shell>
  );
}

function Slide22({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s22" kicker="有理化示范" title="根式相减：用共轭式恢复信息">
      <K value={String.raw`\lim_{x\to5}\frac{\sqrt{x+4}-3}{x-5}`} display className="l4-s22__problem" />
      <div className="l4-s22__conjugate"><span>乘以1</span><K value={String.raw`\frac{\sqrt{x+4}+3}{\sqrt{x+4}+3}`} /></div>
      <div className="l4-s22__transform"><K value={String.raw`(\sqrt{x+4}-3)(\sqrt{x+4}+3)=x-5`} /><Arrow /><K value={String.raw`\frac1{\sqrt{x+4}+3}`} /></div>
      <K value={String.raw`\lim_{x\to5}\frac{\sqrt{x+4}-3}{x-5}=\frac16`} display className="l4-s22__answer" />
    </Shell>
  );
}

function Slide23({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s23" kicker="纸面演算 · 3分钟" title="让根式差不再停在0/0">
      <K value={String.raw`\lim_{x\to0}\frac{\sqrt{1+2x}-1}{x}`} display className="l4-s23__problem" />
      <div className="l4-s23__mirror"><span>原式</span><i /><span>共轭式</span></div>
      <div className="l4-s23__condition">约分时，别忘了保留 <K value={String.raw`x\ne0`} />。</div>
      <Prompt>自己写出共轭式，不直接猜答案。</Prompt>
    </Shell>
  );
}

function Slide24({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s24" kicker="练习解答" title="有理化后，分子中的2x显现出来">
      <div className="l4-s24__sequence">
        <K value={String.raw`\frac{\sqrt{1+2x}-1}{x}`} />
        <Arrow />
        <K value={String.raw`\frac{2x}{x(\sqrt{1+2x}+1)}`} />
        <Arrow />
        <K value={String.raw`\frac2{\sqrt{1+2x}+1}`} />
      </div>
      <div className="l4-s24__condition"><K value={String.raw`x\ne0`} /> 的附近约分</div>
      <K value={String.raw`\lim_{x\to0}\frac{\sqrt{1+2x}-1}{x}=1`} display className="l4-s24__answer" />
    </Shell>
  );
}

function Slide25({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s25" kicker="教学情境 · 配送费门槛" title="满99元，配送费突然消失" dark>
      <img className="l4-s25__photo" src="/course-assets/economic-mathematics/art/l04-two-sided-approach.webp" alt="订单从配送门槛左右两侧靠近的教学插画" />
      <div className="l4-s25__veil" />
      <div className="l4-s25__threshold"><span>98.9元</span><strong>+10元配送费</strong><i>99元门槛</i><span>99.1元</span><strong>免配送费</strong></div>
      <Prompt light>从两侧靠近99，实付金额会到同一个数吗？</Prompt>
    </Shell>
  );
}

function Slide26({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s26" kicker="同一门槛，左右两条规则" title="分段函数把门槛写清楚">
      <div className="l4-s26__gate">
        <div><K value={String.raw`x<99`} /><Arrow /><K value="P(x)=x+10" /></div>
        <div><K value={String.raw`x\ge99`} /><Arrow /><K value="P(x)=x" /></div>
      </div>
      <K value={String.raw`P(x)=\begin{cases}x+10,&x<99\\x,&x\ge99\end{cases}`} display className="l4-s26__formula" />
      <div className="l4-s26__boundary"><K value="x=99" /> 只属于第二段。</div>
    </Shell>
  );
}

function Slide27({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s27" kicker="两个单侧极限" title="左边走向109，右边走向99">
      <div className="l4-s27__destinations">
        <div className="left"><span>从左靠近</span><K value={String.raw`x+10\to109`} /><b>109</b></div>
        <div className="threshold">99</div>
        <div className="right"><span>从右靠近</span><K value={String.raw`x\to99`} /><b>99</b></div>
      </div>
      <K value={String.raw`\lim_{x\to99^-}P(x)=109,\qquad\lim_{x\to99^+}P(x)=99`} display className="l4-s27__formula" />
    </Shell>
  );
}

function Slide28({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s28" kicker="存在准则应用" title="左右目的地不同，双侧极限不存在" dark>
      <div className="l4-s28__split"><div><b>109</b><span>左极限</span></div><strong><K value={String.raw`\ne`} /></strong><div><b>99</b><span>右极限</span></div></div>
      <K value={String.raw`\lim_{x\to99}P(x)\ \text{不存在}`} display className="l4-s28__result" />
      <div className="l4-s28__point-value"><K value="P(99)=99" /><span>点值不能改变左侧趋向109</span></div>
    </Shell>
  );
}

function Slide29({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s29" kicker="纸面演算 · 2分钟" title="逐侧读取分段规则">
      <K value={String.raw`f(x)=\begin{cases}2x+1,&x<2\\x^2-1,&x\ge2\end{cases}`} display className="l4-s29__function" />
      <div className="l4-s29__questions"><span>左极限</span><span>右极限</span><span>函数值 <K value="f(2)" /></span><span>双侧极限？</span></div>
      <Prompt>四项分开写，不要把点值塞进极限判断。</Prompt>
    </Shell>
  );
}

function Slide30({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s30" kicker="练习解答" title="左侧趋向5，右侧趋向3">
      <div className="l4-s30__three">
        <div><span>左极限</span><K value={String.raw`2\times2+1=5`} /></div>
        <div><span>右极限</span><K value="2^2-1=3" /></div>
        <div><span>点值</span><K value="f(2)=3" /></div>
      </div>
      <div className="l4-s30__conclusion"><K value={String.raw`5\ne3`} /><Arrow /><span>双侧极限不存在</span></div>
    </Shell>
  );
}

function Slide31({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s31" kicker="无穷极限" title="越靠近2，曲线越向上冲">
      <div className="l4-s31__plot">
        <svg viewBox="0 0 1040 560" role="img" aria-label="函数一除以x减二的平方在二附近两侧都向正无穷增长">
          <title>平方分母产生的双侧正无穷趋势</title><path className="grid" d="M80 100H980M80 200H980M80 300H980M80 400H980M240 40V500M400 40V500M560 40V500M720 40V500M880 40V500"/><path className="axes" d="M80 30V500H990"/><path className="asymptote" d="M520 35V500"/><path className="curve" d="M100 470C270 465 410 420 480 70M560 70C630 420 770 465 970 470"/>
        </svg>
        <div className="l4-s31__two">2</div><div className="l4-s31__up">函数值无界增大</div>
      </div>
      <K value={String.raw`g(x)=\frac1{(x-2)^2}`} display className="l4-s31__formula" />
      <div className="l4-s31__distances"><span><K value={String.raw`|x-2|=0.1`} /> → 100</span><span><K value={String.raw`|x-2|=0.01`} /> → 10000</span></div>
    </Shell>
  );
}

function Slide32({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s32" kicker="趋于正无穷" title="无界增长，是趋势，不是一个点值" dark>
      <K value={String.raw`\lim_{x\to2}\frac1{(x-2)^2}=+\infty`} display className="l4-s32__formula" />
      <div className="l4-s32__sky"><span>超过100</span><span>超过10000</span><span>超过任意给定正数</span><Arrow /></div>
      <div className="l4-s32__not-number"><K value={String.raw`+\infty`} /><strong>不是有限实数，也不是把 <K value={String.raw`\infty`} /> 代入函数。</strong></div>
    </Shell>
  );
}

function Slide33({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s33" kicker="纸面判断 · 2分钟" title="一次方分母：两侧符号会不会相同？">
      <K value={String.raw`h(x)=\frac1{x-2}`} display className="l4-s33__function" />
      <div className="l4-s33__tests"><div><K value="x=1.9" /><span>分母符号：____</span><span>函数值方向：____</span></div><div><K value="x=2.1" /><span>分母符号：____</span><span>函数值方向：____</span></div></div>
      <Prompt>分别判断左极限、右极限，再决定双侧极限。</Prompt>
    </Shell>
  );
}

function Slide34({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s34" kicker="符号决定方向" title="左负无穷，右正无穷">
      <div className="l4-s34__plot">
        <svg viewBox="0 0 1180 500" role="img" aria-label="双曲线在二的左侧趋向负无穷，右侧趋向正无穷">
          <title>一次方分母的单侧无穷趋势</title><path className="axes" d="M70 250H1110M590 25V475"/><path className="asymptote" d="M590 20V480"/><path className="left" d="M90 190C320 180 480 130 560 455"/><path className="right" d="M620 45C700 370 860 320 1090 310"/>
        </svg>
        <div className="l4-s34__negative"><K value={String.raw`-\infty`} /></div><div className="l4-s34__positive"><K value={String.raw`+\infty`} /></div>
      </div>
      <K value={String.raw`\lim_{x\to2^-}\frac1{x-2}=-\infty,\qquad\lim_{x\to2^+}\frac1{x-2}=+\infty`} display className="l4-s34__formula" />
      <div className="l4-s34__result">两侧方向相反 → 双侧极限不存在</div>
    </Shell>
  );
}

function Slide35({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s35" kicker="有限极限的运算法则" title="先确认部件，再做四则运算">
      <div className="l4-s35__laws">
        <div><span>和 / 差</span><K value={String.raw`\lim(f\pm g)=A\pm B`} /></div>
        <div><span>乘积</span><K value={String.raw`\lim(fg)=AB`} /></div>
        <div className="quotient"><span>商</span><K value={String.raw`\lim\frac fg=\frac AB`} /><b><K value={String.raw`B\ne0`} /></b></div>
        <div><span>常数倍</span><K value={String.raw`\lim(cf)=cA`} /></div>
      </div>
      <div className="l4-s35__source"><K value={String.raw`\lim f=A,\quad\lim g=B`} /> 是每条法则的起点。</div>
    </Shell>
  );
}

function Slide36({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s36" kicker="完整例题 · 先部件，再整体" title="分子趋向13，分母趋向6">
      <div className="l4-s36__parts"><div><span>分子</span><K value={String.raw`3x^2+1\to13`} /></div><div><span>分母</span><K value={String.raw`x+4\to6\ne0`} /></div></div>
      <div className="l4-s36__merge"><Arrow /><span>商法则</span><Arrow /></div>
      <K value={String.raw`\lim_{x\to2}\frac{3x^2+1}{x+4}=\frac{13}{6}`} display className="l4-s36__answer" />
    </Shell>
  );
}

function Slide37({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s37" kicker="纸面演算 · 3分钟" title="把整体拆成三个熟悉部件">
      <K value={String.raw`\lim_{x\to1}\frac{(x^2+2x)(4-x)}{2x+3}`} display className="l4-s37__problem" />
      <div className="l4-s37__braces"><div><span>第一因子</span></div><div><span>第二因子</span></div><div><span>分母</span><b>先检查是否趋向0</b></div></div>
      <Prompt>逐项写极限，不只写最后一个数。</Prompt>
    </Shell>
  );
}

function Slide38({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s38" kicker="练习解答" title="三个部件合成9/5">
      <div className="l4-s38__pieces"><div><K value={String.raw`x^2+2x\to3`} /></div><strong><K value={String.raw`\times`} /></strong><div><K value={String.raw`4-x\to3`} /></div><strong><K value={String.raw`\div`} /></strong><div><K value={String.raw`2x+3\to5\ne0`} /></div></div>
      <K value={String.raw`\frac{3\times3}{5}=\frac95`} display className="l4-s38__answer" />
      <div className="l4-s38__audit">乘法法则 + 商法则；分母条件已核验。</div>
    </Shell>
  );
}

function Slide39({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s39" kicker="错误审计 · 约分改变了什么" title="附近规则相同，不代表两个函数完全相同">
      <div className="l4-s39__functions">
        <div><span>原式</span><K value={String.raw`\frac{x^2-25}{x-5}`} /><b><K value="x=5" /> 无定义</b></div>
        <div><span>约分式</span><K value="x+5" /><b><K value="x=5" /> 时等于10</b></div>
      </div>
      <div className="l4-s39__overlap"><span><K value={String.raw`x\ne5`} /> 的附近</span><i /><strong>规则重合，极限相同</strong></div>
      <div className="l4-s39__verdict">不能写“原式对所有 <K value="x" /> 都等于 <K value="x+5" />”。</div>
    </Shell>
  );
}

function Slide40({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s40" kicker="错误审计 · 点值不是趋势证据" title={<>知道 <K value="f(2)=3" />，还不能宣布极限为3</>}>
      <div className="l4-s40__point"><span>点上</span><K value="f(2)=3" /><i /></div>
      <div className="l4-s40__sides"><div><span>还要检查</span><K value={String.raw`\lim_{x\to2^-}f(x)`} /></div><div><span>还要检查</span><K value={String.raw`\lim_{x\to2^+}f(x)`} /></div></div>
      <Prompt>左极限与右极限都存在且相等，才有双侧极限。</Prompt>
    </Shell>
  );
}

function Slide41({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s41" kicker="回到50元缺失记录" title="模型趋势可以研究，真实数据不能补造">
      <div className="l4-s41__evidence">
        <div className="model"><span>数学模型证据</span><strong>研究50元附近的收入趋势</strong><K value={String.raw`\lim_{p\to50}R(p)`} /></div>
        <div className="data"><span>真实营业数据</span><strong>50元当天记录仍然缺失</strong><b>不得用极限冒充观测</b></div>
      </div>
      <div className="l4-s41__boundary">只有在价格—收入模型于50元附近适用时，趋势解释才成立。</div>
    </Shell>
  );
}

function Slide42({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s42" kicker="课堂检验 · 5分钟 · 四问" title="一个点被重新赋值，会改变极限吗？">
      <K value={String.raw`F(x)=\begin{cases}\dfrac{x^2-16}{x-4},&x\ne4\\k,&x=4\end{cases}`} display className="l4-s42__function" />
      <div className="l4-s42__questions"><span>左极限？</span><span>右极限？</span><span><K value="k" /> 影响极限吗？</span><span>怎样让点值接上趋势？</span></div>
    </Shell>
  );
}

function Slide43({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s43" kicker="课堂检验核对" title="极限为8，k只改变点上的值">
      <div className="l4-s43__rule"><K value={String.raw`x\ne4:\quad F(x)=x+4`} /></div>
      <div className="l4-s43__approach"><span>左侧</span><Arrow /><b>8</b><Arrow /><span>右侧</span></div>
      <div className="l4-s43__k"><K value="k" /><span>可以改变 <K value="F(4)" /></span><strong>不能改变附近规则</strong></div>
      <div className="l4-s43__join">若希望点值接上趋势：<K value="k=8" /></div>
    </Shell>
  );
}

function Slide44({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s44" kicker="函数极限的四步诊断" title="代入 → 化简 → 分侧 → 解释">
      <div className="l4-s44__path">
        <div><b>01</b><strong>试代入</strong><span>先读出信号</span></div><Arrow />
        <div><b>02</b><strong>化结构</strong><span><K value={String.raw`0/0`} /> 时修复</span></div><Arrow />
        <div><b>03</b><strong>求两侧</strong><span>门槛或符号变化</span></div><Arrow />
        <div><b>04</b><strong>作解释</strong><span>区分极限、点值与边界</span></div>
      </div>
      <div className="l4-s44__memory">先选方法，再做运算；最后回到证据边界。</div>
    </Shell>
  );
}

function Slide45({ spec }: PageProps) {
  return (
    <Shell spec={spec} page="s45" kicker="下一讲 · 两个基础趋近结构" title="有些0/0，因式分解也打不开" dark>
      <div className="l4-s45__structures"><K value={String.raw`\frac{\sin x}{x}`} /><strong>?</strong><K value={String.raw`\left(1+\frac1n\right)^n`} /></div>
      <div className="l4-s45__trial"><span>先试代入</span><K value={String.raw`\frac00`} /><span>需要新的极限工具</span></div>
      <div className="l4-s45__next">下一讲：重要极限与无穷小替换</div>
    </Shell>
  );
}

function renderLesson04Page(spec: EconomicMathematicsSlideSpec): ReactNode {
  switch (spec.slideKey) {
    case "em-l04-s01": return <Slide01 spec={spec} />;
    case "em-l04-s02": return <Slide02 spec={spec} />;
    case "em-l04-s03": return <Slide03 spec={spec} />;
    case "em-l04-s04": return <Slide04 spec={spec} />;
    case "em-l04-s05": return <Slide05 spec={spec} />;
    case "em-l04-s06": return <Slide06 spec={spec} />;
    case "em-l04-s07": return <Slide07 spec={spec} />;
    case "em-l04-s08": return <Slide08 spec={spec} />;
    case "em-l04-s09": return <Slide09 spec={spec} />;
    case "em-l04-s10": return <Slide10 spec={spec} />;
    case "em-l04-s11": return <Slide11 spec={spec} />;
    case "em-l04-s12": return <Slide12 spec={spec} />;
    case "em-l04-s13": return <Slide13 spec={spec} />;
    case "em-l04-s14": return <Slide14 spec={spec} />;
    case "em-l04-s15": return <Slide15 spec={spec} />;
    case "em-l04-s16": return <Slide16 spec={spec} />;
    case "em-l04-s17": return <Slide17 spec={spec} />;
    case "em-l04-s18": return <Slide18 spec={spec} />;
    case "em-l04-s19": return <Slide19 spec={spec} />;
    case "em-l04-s20": return <Slide20 spec={spec} />;
    case "em-l04-s21": return <Slide21 spec={spec} />;
    case "em-l04-s22": return <Slide22 spec={spec} />;
    case "em-l04-s23": return <Slide23 spec={spec} />;
    case "em-l04-s24": return <Slide24 spec={spec} />;
    case "em-l04-s25": return <Slide25 spec={spec} />;
    case "em-l04-s26": return <Slide26 spec={spec} />;
    case "em-l04-s27": return <Slide27 spec={spec} />;
    case "em-l04-s28": return <Slide28 spec={spec} />;
    case "em-l04-s29": return <Slide29 spec={spec} />;
    case "em-l04-s30": return <Slide30 spec={spec} />;
    case "em-l04-s31": return <Slide31 spec={spec} />;
    case "em-l04-s32": return <Slide32 spec={spec} />;
    case "em-l04-s33": return <Slide33 spec={spec} />;
    case "em-l04-s34": return <Slide34 spec={spec} />;
    case "em-l04-s35": return <Slide35 spec={spec} />;
    case "em-l04-s36": return <Slide36 spec={spec} />;
    case "em-l04-s37": return <Slide37 spec={spec} />;
    case "em-l04-s38": return <Slide38 spec={spec} />;
    case "em-l04-s39": return <Slide39 spec={spec} />;
    case "em-l04-s40": return <Slide40 spec={spec} />;
    case "em-l04-s41": return <Slide41 spec={spec} />;
    case "em-l04-s42": return <Slide42 spec={spec} />;
    case "em-l04-s43": return <Slide43 spec={spec} />;
    case "em-l04-s44": return <Slide44 spec={spec} />;
    case "em-l04-s45": return <Slide45 spec={spec} />;
    default: throw new Error(`LESSON_04_ART_SLIDE_NOT_REGISTERED:${spec.slideKey}`);
  }
}

export function Lesson04ArtSlides({ spec }: Lesson04ArtSlidesProps) {
  if (spec.lesson !== 4) throw new Error(`LESSON_04_ART_WRONG_LESSON:${spec.lesson}`);
  return renderLesson04Page(spec);
}
