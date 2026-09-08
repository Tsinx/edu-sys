import type { EconomicMathematicsSlideSpec } from "@edu/course-content/economic-mathematics";
import type { SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import katex from "katex";
import type { ReactNode } from "react";

export interface Lesson01ArtSlidesProps {
  spec: EconomicMathematicsSlideSpec;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}

interface PageProps {
  spec: EconomicMathematicsSlideSpec;
}

function MathTeX({ value, display = false, className = "" }: {
  value: string;
  display?: boolean;
  className?: string;
}) {
  const html = katex.renderToString(value, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    trust: false,
    output: "htmlAndMathml"
  });
  const Element = display ? "div" : "span";
  return (
    <Element
      className={`l1-math ${display ? "l1-math--display" : "l1-math--inline"} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ArtShell({ spec, page, kicker, title, children, dark = false }: {
  spec: EconomicMathematicsSlideSpec;
  page: string;
  kicker: ReactNode;
  title: ReactNode;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <article className={`l1-art l1-art--${spec.accent} l1-art--${page}${dark ? " l1-art--dark" : ""}`}>
      <div className="l1-art__grain" aria-hidden="true" />
      <header className="l1-art__header">
        <div className="l1-art__course">经济数学</div>
        <div className="l1-art__section">第1讲 · {spec.section}</div>
        <div className="l1-art__counter">{String(spec.localIndex).padStart(2, "0")} / 44</div>
      </header>
      <main className="l1-art__main">
        <div className="l1-art__heading">
          <div className="l1-art__kicker">{kicker}</div>
          <h1>{title}</h1>
        </div>
        <div className="l1-art__stage">{children}</div>
      </main>
      <footer className="l1-art__footer">
        <b>{spec.sourceLabel}</b>
        <span>{spec.sourceNote ?? "山城新饮课堂自制情境与概念模型"}</span>
        <span>重庆交通大学 · 商科一年级</span>
      </footer>
    </article>
  );
}

function Prompt({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <div className={`l1-prompt${light ? " l1-prompt--light" : ""}`}><span>现在判断</span>{children}</div>;
}

function Arrow({ className = "" }: { className?: string }) {
  return <span className={`l1-arrow ${className}`} aria-hidden="true"><i /></span>;
}

function Slide01({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s01" kicker="山城新饮 · 观音桥快闪店" title={<>一杯饮料，<br />留下四串数字</>} dark>
      <img className="l1-s01__photo" src="/course-assets/economic-mathematics/art/l01-market-observation.webp" alt="山城饮品快闪店的教学情境插画" />
      <div className="l1-s01__mask" />
      <div className="l1-s01__numbers" aria-label="当日促销记录">
        <div><strong>22</strong><span>元 / 杯</span></div>
        <div><strong>860</strong><span>次曝光</span></div>
        <div><strong>73</strong><span>笔订单</span></div>
        <div><strong>1640</strong><span>元成本</span></div>
      </div>
      <Prompt light>哪一个量可以由门店先调整？</Prompt>
    </ArtShell>
  );
}

function Slide02({ spec }: PageProps) {
  const rows = [
    ["售价 / 元", "26", "24", "22", "20", "18"],
    ["曝光 / 次", "620", "710", "860", "980", "1120"],
    ["订单 / 笔", "51", "60", "73", "82", "91"],
    ["成本 / 元", "1420", "1510", "1640", "1750", "1870"]
  ];
  return (
    <ArtShell spec={spec} page="s02" kicker="同一门店 · 同一规格 · 五个工作日" title="先读记录，不急着算">
      <div className="l1-s02__wash" aria-hidden="true" />
      <div className="l1-s02__ledger">
        <div className="l1-s02__days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
        {rows.map((row) => (
          <div className="l1-s02__row" key={row[0]}>
            {row.map((cell, index) => index === 0 ? <b key={cell}>{cell}</b> : <span key={`${row[0]}-${cell}`}>{cell}</span>)}
          </div>
        ))}
      </div>
      <div className="l1-s02__annotation">同一天的一列<br />才是一组观察</div>
      <Prompt>先用手指竖着读一列：哪些量可能互相变化？</Prompt>
    </ArtShell>
  );
}

function Slide03({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s03" kicker="价格 · 曝光 · 订单 · 成本" title="先画哪一支箭头？">
      <div className="l1-s03__routes">
        <div className="l1-s03__route l1-s03__route--price"><span>售价</span><Arrow /><span>订单</span></div>
        <div className="l1-s03__route l1-s03__route--reach"><span>曝光</span><Arrow /><span>订单</span></div>
        <div className="l1-s03__route l1-s03__route--cost"><span>订单</span><Arrow /><span>成本</span></div>
      </div>
      <div className="l1-s03__question">每组选一支，并把箭头读成一句“谁随谁变化”。</div>
    </ArtShell>
  );
}

function Slide04({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s04" kicker="从日常语言到数学语言" title="把关系方向写准确">
      <img className="l1-s04__photo" src="/course-assets/economic-mathematics/art/l01-variable-flow.webp" alt="价格标签与订单小票之间的变量流教学插画" />
      <div className="l1-s04__veil" />
      <div className="l1-s04__equation">
        <div><span>先给定</span><MathTeX value="p" /></div>
        <Arrow />
        <div><span>再观察</span><MathTeX value="q" /></div>
      </div>
      <div className="l1-s04__sentence">在这个模型问题里：订单量随售价变化。</div>
      <div className="l1-s04__boundary">这是建模方向，不是由表格自动证明的因果。</div>
    </ArtShell>
  );
}

function Slide05({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s05" kicker="名字 + 对象 + 单位" title="变量先要有一张身份证">
      <div className="l1-s05__symbol l1-s05__symbol--p"><MathTeX value="p" /><span>单杯售价</span><b>元 / 杯</b></div>
      <div className="l1-s05__symbol l1-s05__symbol--q"><MathTeX value="q" /><span>当日订单量</span><b>杯 / 日</b></div>
      <svg className="l1-s05__thread" viewBox="0 0 900 300" role="img" aria-label="价格变量与订单变量之间的关系线">
        <title>变量身份之间的关系线</title>
        <path d="M90 160 C310 40 560 280 810 130" />
        <circle cx="90" cy="160" r="9" /><circle cx="810" cy="130" r="9" />
      </svg>
      <Prompt>曝光量若记作 <MathTeX value="e" />，它的单位是什么？</Prompt>
    </ArtShell>
  );
}

function Slide06({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s06" kicker="自变量与因变量" title="谁先给定，谁由规则确定？">
      <div className="l1-s06__machine">
        <div className="l1-s06__input"><small>输入</small><MathTeX value="p" /><span>售价</span></div>
        <Arrow />
        <div className="l1-s06__gear"><MathTeX value="f" /><i /><i /><i /></div>
        <Arrow />
        <div className="l1-s06__output"><small>输出</small><MathTeX value="q" /><span>订单量</span></div>
      </div>
      <MathTeX value="q=f(p)" display className="l1-s06__formula" />
      <div className="l1-s06__roles"><span>先给定 → 自变量</span><span>由规则得到 → 因变量</span></div>
    </ArtShell>
  );
}

function Slide07({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s07" kicker="模型问题一变，角色就会换" title="同一个量，不只有一种角色">
      <div className="l1-s07__flow">
        <div className="l1-s07__node l1-s07__node--p"><MathTeX value="p" /><span>售价</span><em>输入</em></div>
        <Arrow className="l1-s07__arrow--one" />
        <div className="l1-s07__node l1-s07__node--q"><MathTeX value="q" /><span>订单量</span><em><b>输出</b> / 输入</em></div>
        <Arrow className="l1-s07__arrow--two" />
        <div className="l1-s07__node l1-s07__node--c"><MathTeX value="C" /><span>总成本</span><em>输出</em></div>
      </div>
      <div className="l1-s07__captions"><span>研究售价如何影响订单</span><span>研究订单如何影响成本</span></div>
      <div className="l1-s07__thesis">变量的角色属于“当前问题”，不属于字母本身。</div>
    </ArtShell>
  );
}

function Slide08({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s08" kicker="纸面练习 · 2分钟" title="三条关系，逐条标出输入与输出">
      <div className="l1-s08__strips">
        <div><b>A</b><span>曝光次数</span><Arrow /><span>订单量</span></div>
        <div><b>B</b><span>订单量</span><Arrow /><span>总成本</span></div>
        <div><b>C</b><span>页面加载时间</span><Arrow /><span>转化率</span></div>
      </div>
      <div className="l1-s08__write">在纸上为每条关系补：<strong>自变量</strong>、<strong>因变量</strong>、<strong>单位</strong></div>
    </ArtShell>
  );
}

function Slide09({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s09" kicker="练习核对" title="方向、单位、期间要一起成立">
      <div className="l1-s09__answers">
        <div><span>曝光</span><b>次 / 日</b><Arrow /><span>订单</span><b>杯 / 日</b></div>
        <div><span>订单</span><b>杯 / 日</b><Arrow /><span>成本</span><b>元 / 日</b></div>
        <div><span>加载时间</span><b>秒</b><Arrow /><span>转化率</span><b>%</b></div>
      </div>
      <div className="l1-s09__seal">变量名写对了，单位不完整，模型仍不可复核。</div>
    </ArtShell>
  );
}

function Slide10({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s10" kicker="一个输入，出现两个观察结果" title="“有关系”就一定是函数吗？">
      <div className="l1-s10__key"><MathTeX value="p=22" /><span>同一个售价</span></div>
      <div className="l1-s10__fork"><Arrow /><Arrow /></div>
      <div className="l1-s10__outcomes"><div><MathTeX value="q=73" /><span>星期二</span></div><div><MathTeX value="q=79" /><span>星期五</span></div></div>
      <Prompt>这是函数模型失败了，还是输入条件写得不够完整？</Prompt>
    </ArtShell>
  );
}

function Slide11({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s11" kicker="函数定义里最重要的两个词" title="每一个输入，都必须唯一确定输出" dark>
      <img className="l1-s11__photo" src="/course-assets/economic-mathematics/art/l01-variable-flow.webp" alt="输入沿着规则流向唯一输出的教学情境插画" />
      <div className="l1-s11__veil" />
      <div className="l1-s11__words"><strong>每一个</strong><span>允许的输入</span><MathTeX value={String.raw`\times`} /><strong>唯一</strong><span>一个输出</span></div>
      <MathTeX value="y=f(x)" display className="l1-s11__formula" />
    </ArtShell>
  );
}

function Slide12({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s12" kicker="唯一输出 ≠ 不同输出" title="两个输入，可以抵达同一个结果">
      <div className="l1-s12__map">
        <div className="l1-s12__inputs"><MathTeX value="-2" /><MathTeX value="2" /></div>
        <svg viewBox="0 0 620 330" role="img" aria-label="负二和正二都映射到四">
          <title>多对一函数映射</title>
          <path d="M40 65 C250 65 330 120 545 165" />
          <path d="M40 265 C250 265 330 210 545 165" />
          <path d="M515 145 L555 165 L515 185" />
        </svg>
        <div className="l1-s12__output"><MathTeX value="4" /></div>
      </div>
      <MathTeX value={String.raw`f(x)=x^2,\qquad f(-2)=f(2)=4`} display />
      <div className="l1-s12__note">函数要求“一入一出”，并不要求“不同输入必须不同输出”。</div>
    </ArtShell>
  );
}

function Slide13({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s13" kicker="非函数关系" title="一个输入分成两个结果：规则断裂">
      <div className="l1-s13__rupture">
        <MathTeX value="p=22" />
        <svg viewBox="0 0 760 340" role="img" aria-label="同一个输入分叉到两个不同输出的错误关系">
          <title>一对多关系使函数规则失效</title>
          <path className="path-one" d="M50 170 C300 170 400 55 690 55" />
          <path className="path-two" d="M50 170 C300 170 400 285 690 285" />
          <path className="slash" d="M350 45L455 300" />
        </svg>
        <div className="l1-s13__results"><MathTeX value="q=73" /><MathTeX value="q=79" /></div>
      </div>
      <div className="l1-s13__repair">修复方法：补入日期、门店等条件，或改写成多元模型。</div>
    </ArtShell>
  );
}

function Slide14({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s14" kicker="先限定对象，再讨论对应规则" title="函数关系需要一个清楚的取景框">
      <div className="l1-s14__scene">
        <div className="l1-s14__outside"><span>周末客流</span><span>其他城市</span><span>其他规格</span><span>竞品活动</span></div>
        <div className="l1-s14__frame">
          <b>观音桥快闪店</b>
          <strong>500 mL 山城新饮</strong>
          <span>某周工作日</span>
          <em>其他条件视为相近</em>
        </div>
      </div>
      <div className="l1-s14__caption">取景框外的因素并未消失，只是暂时不进入这个模型。</div>
    </ArtShell>
  );
}

function Slide15({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s15" kicker="定义域" title="只有允许的输入，才能穿过规则之门">
      <div className="l1-s15__door">
        <div className="l1-s15__outside"><MathTeX value="x" /><span>候选输入</span></div>
        <div className="l1-s15__portal"><span>数学可行</span><span>情境可行</span></div>
        <div className="l1-s15__inside"><MathTeX value="D_f" /><span>允许输入的全集</span></div>
      </div>
      <MathTeX value={String.raw`D_f=\{x\mid f(x)\ \text{有意义且符合情境}\}`} display />
    </ArtShell>
  );
}

function Slide16({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s16" kicker="根式与分母要同时过关" title="数学定义域：把条件求交集">
      <MathTeX value={String.raw`g(x)=\frac{\sqrt{x-10}}{x-20}`} display className="l1-s16__hero-formula" />
      <div className="l1-s16__conditions">
        <div className="l1-s16__root"><span>根号允许</span><MathTeX value={String.raw`x-10\ge 0`} /><b><MathTeX value={String.raw`x\ge 10`} /></b></div>
        <div className="l1-s16__denominator"><span>分母不为零</span><MathTeX value={String.raw`x-20\ne 0`} /><b><MathTeX value={String.raw`x\ne 20`} /></b></div>
      </div>
      <div className="l1-s16__number-line">
        <span className="l1-s16__ten">10</span><span className="l1-s16__twenty">20</span>
        <i className="l1-s16__ray" /><i className="l1-s16__hole" />
      </div>
      <MathTeX value={String.raw`D_g=[10,20)\cup(20,+\infty)`} display />
    </ArtShell>
  );
}

function Slide17({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s17" kicker="从代数可算，到业务可解释" title="销量不能为负：价格线只保留一段">
      <div className="l1-s17__chart">
        <svg viewBox="0 0 940 520" role="img" aria-label="需求直线从零元一千二百杯下降到一百二十元零杯，定义域外用虚线表示">
          <title>需求函数的情境定义域</title>
          <path className="axis" d="M90 35V450H885" />
          <path className="outside" d="M665 430L855 530" />
          <path className="valid" d="M90 70L665 430" />
          <circle cx="90" cy="70" r="10" /><circle cx="665" cy="430" r="10" />
          <text x="52" y="62">1200</text><text x="646" y="477">120</text>
          <text x="18" y="28">订单量（杯/日）</text><text x="710" y="502">售价（元/杯）</text>
        </svg>
        <div className="l1-s17__formula"><MathTeX value="q=1200-10p" /></div>
        <div className="l1-s17__valid-label">可解释区间</div>
        <div className="l1-s17__invalid-label">代数仍可算<br />业务不再解释</div>
      </div>
      <MathTeX value={String.raw`0\le p\le120`} display className="l1-s17__domain" />
    </ArtShell>
  );
}

function Slide18({ spec }: PageProps) {
  const dots = Array.from({ length: 15 }, (_, index) => index);
  return (
    <ArtShell spec={spec} page="s18" kicker="连续模型与离散现实" title="订单是一颗颗数，曲线是一种近似">
      <div className="l1-s18__reality">
        <span>现实计数</span>
        <div className="l1-s18__dots">{dots.map((dot) => <i key={dot} />)}</div>
        <MathTeX value={String.raw`q\in\{0,1,2,\ldots\}`} />
      </div>
      <div className="l1-s18__model">
        <span>连续化模型</span>
        <svg viewBox="0 0 650 220" role="img" aria-label="平滑连续曲线近似离散订单点">
          <title>连续模型曲线</title>
          <path d="M18 182C175 170 235 50 380 76S550 150 630 32" />
        </svg>
        <MathTeX value={String.raw`q\in\mathbb{R}`} />
      </div>
      <div className="l1-s18__question"><MathTeX value="q=2.6" /> 笔订单，应该怎样回到现实解释？</div>
    </ArtShell>
  );
}

function Slide19({ spec }: PageProps) {
  const points = [["20", "1000"], ["30", "900"], ["40", "800"], ["50", "700"]];
  return (
    <ArtShell spec={spec} page="s19" kicker="表示法一 · 表" title="表格是一组离散对应">
      <div className="l1-s19__matrix">
        <div className="l1-s19__labels"><MathTeX value="p" /><span>售价 / 元</span><MathTeX value="q" /><span>订单 / 杯</span></div>
        {points.map(([price, quantity], index) => (
          <div className="l1-s19__pair" key={price} style={{ transform: `translateY(${index % 2 === 0 ? -12 : 12}px)` }}>
            <strong>{price}</strong><i /><strong>{quantity}</strong>
          </div>
        ))}
      </div>
      <div className="l1-s19__difference"><span>售价每增加</span><b>10元</b><Arrow /><span>订单量改变</span><b>？</b></div>
    </ArtShell>
  );
}

function Slide20({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s20" kicker="表示法二 · 式" title="一行公式，压缩了整张对应表" dark>
      <div className="l1-s20__stream" aria-hidden="true">
        {["20→1000", "30→900", "40→800", "50→700", "60→600", "70→500"].map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="l1-s20__compress"><Arrow /><MathTeX value="q=1200-10p" display /><Arrow /></div>
      <div className="l1-s20__readings">
        <div><MathTeX value="1200" /><span>模型中的基准量</span></div>
        <div><MathTeX value="-10" /><span>售价每增1元，订单量减10杯</span></div>
      </div>
    </ArtShell>
  );
}

function Slide21({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s21" kicker="表示法三 · 图" title="坐标平面把整体趋势展开">
      <div className="l1-s21__plot">
        <svg viewBox="0 0 1120 610" role="img" aria-label="价格订单量需求直线图">
          <title>售价与订单量的线性函数图像</title>
          <g className="grid"><path d="M110 90H1050M110 190H1050M110 290H1050M110 390H1050M110 490H1050" /><path d="M270 45V540M430 45V540M590 45V540M750 45V540M910 45V540" /></g>
          <path className="axes" d="M110 35V540H1060" />
          <path className="line" d="M110 70L1030 520" />
          <g className="points"><circle cx="110" cy="70" r="10" /><circle cx="1030" cy="520" r="10" /><circle cx="375" cy="200" r="10" /></g>
          <text x="34" y="80">1200</text><text x="985" y="574">120</text><text x="100" y="574">0</text>
          <text x="16" y="28">订单量（杯/日）</text><text x="815" y="598">售价（元/杯）</text>
        </svg>
        <div className="l1-s21__equation"><MathTeX value="q=1200-10p" /></div>
        <div className="l1-s21__point"><MathTeX value="(p,q)" /></div>
      </div>
      <div className="l1-s21__rule">标轴 → 写单位 → 标关键点 → 再连线</div>
    </ArtShell>
  );
}

function Slide22({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s22" kicker="纸面练习 · 2分钟" title="从四组对应，猜出一条规则">
      <div className="l1-s22__table">
        <div><MathTeX value="e" /><span>百次曝光</span><b>0</b><b>1</b><b>2</b><b>3</b></div>
        <div><MathTeX value="v" /><span>访问 / 次</span><b>20</b><b>32</b><b>44</b><b>56</b></div>
      </div>
      <div className="l1-s22__scribble"><span>每走一步，增加多少？</span><i /><span>从哪里开始？</span></div>
      <Prompt>写出 <MathTeX value="v" /> 关于 <MathTeX value="e" /> 的一次函数，并解释系数的单位。</Prompt>
    </ArtShell>
  );
}

function Slide23({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s23" kicker="练习解答" title="先找增量，再找初值">
      <div className="l1-s23__stair">
        <div><span>20</span></div><i>+12</i><div><span>32</span></div><i>+12</i><div><span>44</span></div><i>+12</i><div><span>56</span></div>
      </div>
      <div className="l1-s23__derive">
        <div><b>初值</b><MathTeX value="v(0)=20" /></div>
        <div><b>每步增量</b><MathTeX value={String.raw`\Delta v=12`} /></div>
        <div><b>对应规则</b><MathTeX value="v=20+12e" /></div>
      </div>
      <div className="l1-s23__unit"><MathTeX value="12" /> 的单位：访问次数 / 百次曝光</div>
    </ArtShell>
  );
}

function Slide24({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s24" kicker="坐标解释" title="一个点，不只是两个数字">
      <div className="l1-s24__crosshair">
        <svg viewBox="0 0 1000 560" role="img" aria-label="价格三十五元与订单八百五十杯的坐标点">
          <title>坐标点的横纵含义</title>
          <path className="axes" d="M95 40V495H930" />
          <path className="guide" d="M440 420V160H95M95 160H440" />
          <circle cx="440" cy="160" r="18" />
          <text x="410" y="535">35元/杯</text><text x="5" y="170">850杯/日</text>
        </svg>
        <MathTeX value="(p,q)=(35,850)" display />
      </div>
      <Prompt>把对象、期间、横坐标和纵坐标连成一句完整的话。</Prompt>
    </ArtShell>
  );
}

function Slide25({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s25" kicker="完整解释" title="让坐标重新落回门店现场">
      <div className="l1-s25__sentence">
        <span>在</span><b>该门店 · 该商品 · 该活动日</b><span>的教学模型中，</span>
        <strong>单杯售价为 35 元</strong><span>时，模型</span><strong>预测当日订单量为 850 杯</strong><span>。</span>
      </div>
      <div className="l1-s25__tags"><i>对象</i><i>期间</i><i>输入与单位</i><i>“预测”边界</i><i>输出与单位</i></div>
      <div className="l1-s25__warning">只说“35对应850”，信息还不够。</div>
    </ArtShell>
  );
}

function Slide26({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s26" kicker="分段函数 · 满额优惠" title="同一张券，两道不同的结账路径" dark>
      <img className="l1-s26__photo" src="/course-assets/economic-mathematics/art/l01-function-receipt.webp" alt="饮品订单与优惠小票的教学情境插画" />
      <div className="l1-s26__veil" />
      <div className="l1-s26__paths">
        <div><span>券前不足50元</span><strong>原价结账</strong></div>
        <div><span>券前满50元</span><strong>立减8元</strong></div>
      </div>
      <Prompt light>一条不分条件的公式，能把两种结账规则写清吗？</Prompt>
    </ArtShell>
  );
}

function Slide27({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s27" kicker="条件决定走哪条规则" title="分段，不等于一个输入有两个输出">
      <div className="l1-s27__gate">
        <div className="l1-s27__input"><MathTeX value="x" /><span>券前金额</span></div>
        <div className="l1-s27__split">
          <div><MathTeX value={String.raw`0\le x<50`} /><Arrow /><span>原价结算</span></div>
          <div><MathTeX value={String.raw`x\ge50`} /><Arrow /><span>减8元结算</span></div>
        </div>
      </div>
      <MathTeX value={String.raw`P(x)=\begin{cases}x,&0\le x<50\\x-8,&x\ge50\end{cases}`} display className="l1-s27__piecewise" />
      <div className="l1-s27__boundary">边界 <MathTeX value="x=50" /> 只进入第二段。</div>
    </ArtShell>
  );
}

function Slide28({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s28" kicker="纸面练习 · 90秒" title="三张小票，各自从哪一道门通过？">
      <div className="l1-s28__receipts">
        {["49", "50", "68"].map((amount) => <div key={amount}><span>券前金额</span><strong>{amount}</strong><b>元</b><i>实付 ______ 元</i></div>)}
      </div>
      <div className="l1-s28__conditions"><span><MathTeX value={String.raw`0\le x<50`} /> → 原价</span><span><MathTeX value={String.raw`x\ge50`} /> → 减8元</span></div>
    </ArtShell>
  );
}

function Slide29({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s29" kicker="练习解答" title="边界点属于第二段">
      <div className="l1-s29__answers">
        <div><MathTeX value="P(49)" /><Arrow /><strong>49元</strong><span>第一段</span></div>
        <div className="l1-s29__boundary"><MathTeX value="P(50)" /><Arrow /><strong>42元</strong><span>第二段 · 边界</span></div>
        <div><MathTeX value="P(68)" /><Arrow /><strong>60元</strong><span>第二段</span></div>
      </div>
      <div className="l1-s29__inequalities"><MathTeX value="<" /><span>不含边界</span><MathTeX value={String.raw`\ge`} /><span>包含边界</span></div>
    </ArtShell>
  );
}

function Slide30({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s30" kicker="错误审计 · 模型不等于事实" title="价格只是聚光灯下的一个因素">
      <div className="l1-s30__spotlight">
        <div className="l1-s30__center"><span>当前模型</span><MathTeX value={String.raw`p\longmapsto q`} /></div>
        <div className="l1-s30__orbit l1-s30__orbit--weather">天气</div>
        <div className="l1-s30__orbit l1-s30__orbit--location">门店位置</div>
        <div className="l1-s30__orbit l1-s30__orbit--rival">竞品活动</div>
        <div className="l1-s30__orbit l1-s30__orbit--stock">库存容量</div>
      </div>
      <Prompt>函数模型省略了什么？省略，不等于不存在。</Prompt>
    </ArtShell>
  );
}

function Slide31({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s31" kicker="逐项判断 · 必须说明理由" title="它们都满足“唯一输出”吗？">
      <div className="l1-s31__tests">
        <div><b>A</b><span>每个订单号</span><Arrow /><span>该订单实付金额</span><em>是 / 否？</em></div>
        <div><b>B</b><span>每位顾客</span><Arrow /><span>本月每次到店金额</span><em>是 / 否？</em></div>
        <div><b>C</b><span>每个售价</span><Arrow /><span>同一模型预测订单量</span><em>是 / 否？</em></div>
      </div>
      <div className="l1-s31__criterion">判断句式：对<strong>每一个输入</strong>，能否得到<strong>唯一一个输出</strong>？</div>
    </ArtShell>
  );
}

function Slide32({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s32" kicker="练习解答" title="输入信息是否足够，是判断关键">
      <div className="l1-s32__verdicts">
        <div className="yes"><b>是</b><span>订单号</span><Arrow /><span>一个实付金额</span></div>
        <div className="no"><b>否</b><span>顾客</span><span className="l1-s32__fork"><Arrow /><Arrow /></span><span>多次不同金额</span></div>
        <div className="yes"><b>是</b><span>售价</span><Arrow /><span>唯一预测值</span></div>
      </div>
      <div className="l1-s32__repair">把B修成函数：输入中再加入<strong>日期与订单序号</strong>。</div>
    </ArtShell>
  );
}

function Slide33({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s33" kicker="新情境 · 社交媒体投放" title="曝光怎样转成落地页访问？" dark>
      <img className="l1-s33__photo" src="/course-assets/economic-mathematics/art/l01-market-observation.webp" alt="手机投放数据与门店访问的教学情境插画" />
      <div className="l1-s33__veil" />
      <div className="l1-s33__flow">
        <div><MathTeX value="e" /><span>投放曝光</span><b>百次</b></div>
        <Arrow />
        <div><MathTeX value="v" /><span>落地页访问</span><b>次</b></div>
      </div>
      <div className="l1-s33__range"><span>测试范围</span><MathTeX value={String.raw`0\le e\le50`} /></div>
    </ArtShell>
  );
}

function Slide34({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s34" kicker="线性教学模型" title="基础访问 + 每百次曝光的贡献">
      <div className="l1-s34__equation">
        <MathTeX value="v(e)" />
        <MathTeX value="=" />
        <div><MathTeX value="20" /><small>基础访问</small></div>
        <MathTeX value="+" />
        <div><MathTeX value="12" /><small>每百次贡献</small></div>
        <MathTeX value={String.raw`\times`} />
        <MathTeX value="e" />
      </div>
      <div className="l1-s34__slope">
        <svg viewBox="0 0 1000 340" role="img" aria-label="曝光每增加一百次，预测访问增加十二次的阶梯图">
          <title>线性模型的初值与增量</title>
          <path className="axis" d="M65 25V290H940" />
          <path className="line" d="M65 250L885 55" />
          <path className="step" d="M280 200H480V152" />
          <circle cx="65" cy="250" r="10" />
          <text x="20" y="245">20</text><text x="310" y="238">增加1百次曝光</text><text x="495" y="185">增加12次访问</text>
        </svg>
      </div>
      <MathTeX value={String.raw`0\le e\le50`} display className="l1-s34__domain" />
    </ArtShell>
  );
}

function Slide35({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s35" kicker="纸面练习 · 3分钟" title="独立完成一张曝光—访问模型卡">
      <div className="l1-s35__constellation">
        <div className="l1-s35__center">你的模型</div>
        <span className="object">对象</span><span className="variables">变量与单位</span><span className="domain">定义域</span><span className="rule">对应规则</span><span className="calculation"><MathTeX value="e=18" /> 时的预测</span>
        <svg viewBox="0 0 1200 520" aria-hidden="true"><path d="M600 265L190 95M600 265L980 85M600 265L1060 355M600 265L225 430M600 265L600 485" /></svg>
      </div>
      <div className="l1-s35__instruction">不要套句子：先确认每一个字段在当前情境里是什么意思。</div>
    </ArtShell>
  );
}

function Slide36({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s36" kicker="练习解答 · 可复核模型卡" title="五个字段接成一条证据链">
      <div className="l1-s36__blueprint">
        <div className="object"><span>对象</span><strong>该测试期山城新饮投放</strong></div>
        <div className="input"><span>输入</span><MathTeX value="e" /><b>曝光 / 百次</b></div>
        <Arrow />
        <div className="rule"><span>规则</span><MathTeX value="v=20+12e" /></div>
        <Arrow />
        <div className="output"><span>输出</span><MathTeX value="v" /><b>访问 / 次</b></div>
        <div className="domain"><span>定义域</span><MathTeX value={String.raw`0\le e\le50`} /></div>
      </div>
      <div className="l1-s36__calculation"><MathTeX value={String.raw`v(18)=20+12\times18=236`} display /><span>预测访问 236 次</span></div>
    </ArtShell>
  );
}

function Slide37({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s37" kicker="模型边界" title="公式站得住，要靠假设托底">
      <MathTeX value="v=20+12e" display className="l1-s37__formula" />
      <div className="l1-s37__layers">
        <div><b>01</b><span>投放质量</span><strong>测试期内近似稳定</strong></div>
        <div><b>02</b><span>统计口径</span><strong>前后保持一致</strong></div>
        <div><b>03</b><span>使用范围</span><strong><MathTeX value={String.raw`0\le e\le50`} /> 内才采用线性关系</strong></div>
      </div>
      <div className="l1-s37__edge">假设不是事实；它们是模型成立时需要接受的条件。</div>
    </ArtShell>
  );
}

function Slide38({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s38" kicker="错误审计 · 外推风险" title={<>把模型推到 <MathTeX value="e=500" />，发生了什么？</>}>
      <div className="l1-s38__ruler">
        <div className="l1-s38__tested"><span>测试定义域</span><MathTeX value={String.raw`0\le e\le50`} /></div>
        <div className="l1-s38__break">//</div>
        <div className="l1-s38__outside"><MathTeX value="e=500" /><span>远离证据范围</span></div>
      </div>
      <div className="l1-s38__calculation"><span>代数运算</span><MathTeX value="v(500)=6020" display /><b>算得出</b></div>
      <div className="l1-s38__verdict"><MathTeX value={String.raw`\ne`} /><span>当前模型有依据的业务预测</span><b>解释不通</b></div>
    </ArtShell>
  );
}

function Slide39({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s39" kicker="技术结果 → 管理语言" title="把公式翻译成一句可行动、可追问的话">
      <div className="l1-s39__formula-side">
        <MathTeX value="v=20+12e" display />
        <Arrow />
      </div>
      <blockquote className="l1-s39__speech">
        <span>“</span>
        在本次测试的<strong>0—5000次曝光范围内</strong>，模型<strong>预测</strong>每增加100次曝光，访问量增加12次；<strong>超出范围需要重新验证</strong>。
      </blockquote>
      <div className="l1-s39__anchors"><i>范围</i><i>预测</i><i>单位</i><i>验证边界</i></div>
    </ArtShell>
  );
}

function Slide40({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s40" kicker="独立检验 · 4分钟" title="把积分抵扣写成函数">
      <div className="l1-s40__tokens">
        {[100, 200, 300, 400, 500].map((score, index) => <div key={score} style={{ left: `${index * 155}px` }}><span>{score}</span><b>积分</b><i>{index + 1}元</i></div>)}
        <div className="l1-s40__cap"><strong>20元</strong><span>抵扣上限</span></div>
      </div>
      <div className="l1-s40__given"><span>输入：会员积分 <MathTeX value="m" /></span><span>输出：抵扣金额 <MathTeX value="d" /></span></div>
      <Prompt>写规则、定义域、单位；为什么“每满100分”需要取整？</Prompt>
    </ArtShell>
  );
}

function Slide41({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s41" kicker="一种可复核写法" title="“每满100分”是一道向下取整的台阶">
      <div className="l1-s41__staircase">
        <svg viewBox="0 0 980 480" role="img" aria-label="积分抵扣函数呈向上阶梯并在二十元封顶">
          <title>积分抵扣的阶梯函数</title>
          <path className="axes" d="M70 35V420H925" />
          <path className="stairs" d="M70 390H160V370H250V350H340V330H430V310H520V290H610V270H700V250H790V230H900" />
          <path className="cap" d="M70 90H915" />
          <text x="15" y="98">20元上限</text><text x="720" y="455">会员积分</text>
        </svg>
      </div>
      <MathTeX value={String.raw`d(m)=\min\!\left(\left\lfloor\frac{m}{100}\right\rfloor,20\right)`} display className="l1-s41__formula" />
      <div className="l1-s41__notes"><span><MathTeX value={String.raw`m\in\{0,1,2,\ldots\}`} /> 积分</span><span><MathTeX value="d" /> 的单位是元</span></div>
    </ArtShell>
  );
}

function Slide42({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s42" kicker="函数模型卡 · 六个必检项" title="公式只占六分之一">
      <div className="l1-s42__orbit">
        <div className="l1-s42__core"><span>可复核</span><strong>函数模型</strong></div>
        <div className="l1-s42__item object"><b>01</b><span>对象与期间</span></div>
        <div className="l1-s42__item variables"><b>02</b><span>输入与输出</span></div>
        <div className="l1-s42__item units"><b>03</b><span>单位</span></div>
        <div className="l1-s42__item domain"><b>04</b><span>定义域</span></div>
        <div className="l1-s42__item rule"><b>05</b><span>对应规则</span></div>
        <div className="l1-s42__item boundary"><b>06</b><span>假设与边界</span></div>
        <svg viewBox="0 0 1200 540" aria-hidden="true"><ellipse cx="600" cy="270" rx="455" ry="215" /><ellipse cx="600" cy="270" rx="300" ry="150" /></svg>
      </div>
    </ArtShell>
  );
}

function Slide43({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s43" kicker="下一讲的冲突" title="订单更多，钱就一定更多吗？">
      <div className="l1-s43__tug">
        <div className="l1-s43__price"><span>售价下降</span><MathTeX value={String.raw`p\downarrow`} /></div>
        <div className="l1-s43__rope"><i /><strong>销售收入</strong><i /></div>
        <div className="l1-s43__quantity"><span>销量上升</span><MathTeX value={String.raw`q\uparrow`} /></div>
      </div>
      <MathTeX value={String.raw`R=p\times q`} display className="l1-s43__formula" />
      <div className="l1-s43__choices"><span>上升？</span><span>下降？</span><span>先升后降？</span></div>
    </ArtShell>
  );
}

function Slide44({ spec }: PageProps) {
  return (
    <ArtShell spec={spec} page="s44" kicker="下一讲 · 把四张模型卡接成一张账" title="从“谁由谁确定”走向“最后留下多少”" dark>
      <div className="l1-s44__pipeline">
        <div><MathTeX value="q(p)" /><span>需求</span></div><Arrow />
        <div><MathTeX value="R(p)" /><span>收入</span></div><Arrow />
        <div><MathTeX value="C(p)" /><span>成本</span></div><Arrow />
        <div className="l1-s44__profit"><MathTeX value={String.raw`\Pi(p)`} /><span>利润</span></div>
      </div>
      <div className="l1-s44__question">同一个售价方案，如何一路算到账本底部？</div>
      <div className="l1-s44__next"><span>NEXT</span><strong>降价一定多赚钱吗？</strong></div>
    </ArtShell>
  );
}

function renderLesson01Page(spec: EconomicMathematicsSlideSpec): ReactNode {
  switch (spec.slideKey) {
    case "em-l01-s01": return <Slide01 spec={spec} />;
    case "em-l01-s02": return <Slide02 spec={spec} />;
    case "em-l01-s03": return <Slide03 spec={spec} />;
    case "em-l01-s04": return <Slide04 spec={spec} />;
    case "em-l01-s05": return <Slide05 spec={spec} />;
    case "em-l01-s06": return <Slide06 spec={spec} />;
    case "em-l01-s07": return <Slide07 spec={spec} />;
    case "em-l01-s08": return <Slide08 spec={spec} />;
    case "em-l01-s09": return <Slide09 spec={spec} />;
    case "em-l01-s10": return <Slide10 spec={spec} />;
    case "em-l01-s11": return <Slide11 spec={spec} />;
    case "em-l01-s12": return <Slide12 spec={spec} />;
    case "em-l01-s13": return <Slide13 spec={spec} />;
    case "em-l01-s14": return <Slide14 spec={spec} />;
    case "em-l01-s15": return <Slide15 spec={spec} />;
    case "em-l01-s16": return <Slide16 spec={spec} />;
    case "em-l01-s17": return <Slide17 spec={spec} />;
    case "em-l01-s18": return <Slide18 spec={spec} />;
    case "em-l01-s19": return <Slide19 spec={spec} />;
    case "em-l01-s20": return <Slide20 spec={spec} />;
    case "em-l01-s21": return <Slide21 spec={spec} />;
    case "em-l01-s22": return <Slide22 spec={spec} />;
    case "em-l01-s23": return <Slide23 spec={spec} />;
    case "em-l01-s24": return <Slide24 spec={spec} />;
    case "em-l01-s25": return <Slide25 spec={spec} />;
    case "em-l01-s26": return <Slide26 spec={spec} />;
    case "em-l01-s27": return <Slide27 spec={spec} />;
    case "em-l01-s28": return <Slide28 spec={spec} />;
    case "em-l01-s29": return <Slide29 spec={spec} />;
    case "em-l01-s30": return <Slide30 spec={spec} />;
    case "em-l01-s31": return <Slide31 spec={spec} />;
    case "em-l01-s32": return <Slide32 spec={spec} />;
    case "em-l01-s33": return <Slide33 spec={spec} />;
    case "em-l01-s34": return <Slide34 spec={spec} />;
    case "em-l01-s35": return <Slide35 spec={spec} />;
    case "em-l01-s36": return <Slide36 spec={spec} />;
    case "em-l01-s37": return <Slide37 spec={spec} />;
    case "em-l01-s38": return <Slide38 spec={spec} />;
    case "em-l01-s39": return <Slide39 spec={spec} />;
    case "em-l01-s40": return <Slide40 spec={spec} />;
    case "em-l01-s41": return <Slide41 spec={spec} />;
    case "em-l01-s42": return <Slide42 spec={spec} />;
    case "em-l01-s43": return <Slide43 spec={spec} />;
    case "em-l01-s44": return <Slide44 spec={spec} />;
    default: throw new Error(`LESSON_01_ART_SLIDE_NOT_REGISTERED:${spec.slideKey}`);
  }
}

export function Lesson01ArtSlides({ spec }: Lesson01ArtSlidesProps) {
  if (spec.lesson !== 1) {
    throw new Error(`LESSON_01_ART_WRONG_LESSON:${spec.lesson}`);
  }
  return renderLesson01Page(spec);
}
