import {
  ECONOMIC_MATHEMATICS_INTERACTIONS,
  getEconomicMathematicsInteractionDefinition,
  type EconomicMathematicsInteractionDefinition,
  type EconomicMathematicsInteractionRule,
  type EconomicMathematicsSlideSpec,
  type EconomicMathematicsVisual
} from "@edu/course-content/economic-mathematics";
import type {
  SlideInteractionScalar,
  SlideInteractionState,
  SlideInteractionValues
} from "@edu/contracts";
import katex from "katex";
import { cloneElement, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Lesson01ArtSlides } from "./art-directed/Lesson01ArtSlides";
import { Lesson02ArtSlides } from "./art-directed/Lesson02ArtSlides";
import { Lesson03ArtSlides } from "./art-directed/Lesson03ArtSlides";
import { Lesson04ArtSlides } from "./art-directed/Lesson04ArtSlides";

const UNIT_HEROES: Readonly<Record<number, string>> = {
  1: "/course-assets/economic-mathematics/unit-01-functions-hero.webp",
  2: "/course-assets/economic-mathematics/unit-02-limits-hero.webp",
  3: "/course-assets/economic-mathematics/unit-03-derivatives-hero.webp",
  4: "/course-assets/economic-mathematics/unit-04-applications-hero.webp",
  5: "/course-assets/economic-mathematics/unit-05-antiderivatives-hero.webp",
  6: "/course-assets/economic-mathematics/unit-06-integrals-hero.webp",
  7: "/course-assets/economic-mathematics/unit-07-multivariable-hero.webp",
  8: "/course-assets/economic-mathematics/unit-08-optimization-hero.webp"
};

interface EconomicMathematicsTeachingSlidesProps {
  spec: EconomicMathematicsSlideSpec;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}

function MathFormula({ value, label }: { value: string; label?: string }) {
  const containsCjkCopy = /[\u3400-\u9fff]/u.test(value);
  const containsUnsupportedUnicodeMath = /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹√]/u.test(value);
  const requiresPlainFormula = containsUnsupportedUnicodeMath || (containsCjkCopy && !value.includes("\\text{"));
  const katexValue = value
    .replaceAll("′", "'")
    .replaceAll("；", String.raw`\quad;\quad`)
    .replaceAll("，", String.raw`,\quad`);
  const html = useMemo(
    () => requiresPlainFormula
      ? ""
      : katex.renderToString(katexValue, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
        trust: false,
        output: "htmlAndMathml"
      }),
    [katexValue, requiresPlainFormula]
  );
  if (requiresPlainFormula) {
    return <div className="econmath-formula econmath-formula--plain" aria-label={label ?? value}>{value}</div>;
  }
  return (
    <div
      className="econmath-formula"
      aria-label={label ?? value}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SlideHeader({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <header className="econmath-slide__header">
      <div className="econmath-slide__eyebrow">
        <span>ECONOMIC MATHEMATICS</span>
        <b>第 {spec.lesson} 讲 · {spec.section}</b>
      </div>
      <div className="econmath-slide__counter">
        {String(spec.localIndex).padStart(2, "0")} / {spec.localTotal}
      </div>
    </header>
  );
}

function SourceFooter({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <footer className="econmath-slide__footer">
      <span className="econmath-slide__source-label">{spec.sourceLabel}</span>
      <span>{spec.sourceNote ?? "山城新饮课程教学模型 · 数值与图形为课堂自制"}</span>
      <span>第 {spec.unit} 单元 · 第 {String(spec.lesson).padStart(2, "0")} 讲 · 第 {spec.localIndex} 页</span>
    </footer>
  );
}

function CoreCopy({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-copy">
      <p className="econmath-copy__kicker">{spec.kicker}</p>
      <h1>{spec.title}</h1>
      {spec.lead && <p className="econmath-copy__lead">{spec.lead}</p>}
      {spec.body && spec.body.length > 0 && (
        <ul className="econmath-copy__body">
          {spec.body.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      {spec.formula && (
        <MathFormula value={spec.formula} label={spec.formulaLabel} />
      )}
      {spec.data && spec.data.length > 0 && (
        <div className="econmath-copy__data">
          {spec.data.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
      {spec.prompt && <div className="econmath-copy__prompt">{spec.prompt}</div>}
    </div>
  );
}

function CoordinateSketch({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  const copy = `${spec.section} ${spec.title} ${spec.kicker}`;
  const sketchKind = spec.visual === "surface-studio"
    ? "surface"
    : spec.visual === "optimization-studio"
      ? "optimization"
      : spec.visual === "area-studio" || spec.unit === 6
        ? "area"
        : spec.unit === 1
          ? "function-model"
          : spec.unit === 2
            ? /门槛|跳变|间断|不连续|左右/u.test(copy) ? "jump-limit" : "limit"
            : spec.unit === 3
              ? "derivative"
              : spec.unit === 4
                ? "profit-shape"
                : spec.unit === 5
                  ? "antiderivative-family"
                  : spec.unit === 7
                    ? "surface"
                    : "optimization";
  const fillId = `econmath-sketch-fill-u${spec.unit}-${spec.visual}`;
  let sketch: ReactElement;
  switch (sketchKind) {
    case "function-model":
      sketch = (
        <g>
          <path className="econmath-sketch__demand" d="M105 105L610 410" />
          <path className="econmath-sketch__curve" d="M105 420Q350 62 610 420" />
          <circle className="econmath-sketch__point" cx="350" cy="241" r="12" />
          <text x="500" y="360">需求</text><text x="360" y="94">利润</text>
        </g>
      );
      break;
    case "limit":
      sketch = (
        <g>
          <path className="econmath-sketch__asymptote" d="M360 45V450M85 250H640" />
          <path className="econmath-sketch__curve" d="M95 405C205 390 285 330 345 272M375 228C445 150 520 112 625 94" />
          <circle className="econmath-sketch__open-point" cx="360" cy="250" r="13" />
          <path className="econmath-sketch__approach" d="M250 300L330 266M470 174L390 226" />
        </g>
      );
      break;
    case "jump-limit":
      sketch = (
        <g>
          <path className="econmath-sketch__curve" d="M95 385L350 175M365 345L625 125" />
          <path className="econmath-sketch__asymptote" d="M358 55V445" />
          <circle className="econmath-sketch__open-point" cx="358" cy="168" r="13" />
          <circle className="econmath-sketch__point" cx="358" cy="351" r="12" />
          <text x="382" y="174">左趋势</text><text x="382" y="354">点值 / 右趋势</text>
        </g>
      );
      break;
    case "derivative":
      sketch = (
        <g>
          <path className="econmath-sketch__curve" d="M95 408C205 390 260 322 330 260S490 135 625 95" />
          <path className="econmath-sketch__secant" d="M210 360L520 138" />
          <path className="econmath-sketch__tangent" d="M250 333L495 163" />
          <circle className="econmath-sketch__point" cx="340" cy="250" r="12" />
          <text x="485" y="122">割线</text><text x="470" y="190">切线</text>
        </g>
      );
      break;
    case "profit-shape":
      sketch = (
        <g>
          <path className="econmath-sketch__curve" d="M95 420Q350 55 625 420" />
          <path className="econmath-sketch__tangent" d="M232 270L470 158" />
          <path className="econmath-sketch__asymptote" d="M350 92V450" />
          <circle className="econmath-sketch__point" cx="350" cy="238" r="12" />
          <text x="368" y="92">边际为0的候选点</text>
        </g>
      );
      break;
    case "antiderivative-family":
      sketch = (
        <g>
          <path className="econmath-sketch__curve" d="M95 390C220 390 240 285 350 260S505 140 625 112" />
          <path className="econmath-sketch__family" d="M95 438C220 438 240 333 350 308S505 188 625 160" />
          <path className="econmath-sketch__family" d="M95 342C220 342 240 237 350 212S505 92 625 64" />
          <text x="590" y="67">+C</text><text x="590" y="164">−C</text>
        </g>
      );
      break;
    case "area":
      sketch = (
        <g>
          <path className="econmath-sketch__area" fill={`url(#${fillId})`} d="M95 430C190 410 235 310 320 265S465 180 625 80V430Z" />
          <path className="econmath-sketch__curve" d="M95 430C190 410 235 310 320 265S465 180 625 80" />
          <path className="econmath-sketch__bound" d="M215 430V332M525 430V137" />
          <text x="350" y="390">累计面积</text>
        </g>
      );
      break;
    case "surface":
      sketch = (
        <g>
          <path className="econmath-sketch__contour" d="M130 360C205 260 287 225 390 232S555 175 610 100" />
          <path className="econmath-sketch__contour econmath-sketch__contour--soft" d="M125 410C212 310 300 275 400 282S565 222 620 150" />
          <path className="econmath-sketch__contour econmath-sketch__contour--soft" d="M120 300C195 205 277 175 378 180S535 126 590 62" />
          <path className="econmath-sketch__cross-section" d="M395 55V445M95 232H625" />
          <circle className="econmath-sketch__point" cx="395" cy="232" r="13" />
          <text x="420" y="220">当前输入组合</text>
        </g>
      );
      break;
    case "optimization":
      sketch = (
        <g>
          <ellipse className="econmath-sketch__ring" cx="375" cy="245" rx="210" ry="145" />
          <ellipse className="econmath-sketch__ring" cx="375" cy="245" rx="145" ry="98" />
          <ellipse className="econmath-sketch__ring" cx="375" cy="245" rx="76" ry="50" />
          <path className="econmath-sketch__constraint" d="M140 405L590 92" />
          <circle className="econmath-sketch__point" cx="392" cy="229" r="13" />
          <text x="435" y="205">等高线与约束</text>
        </g>
      );
      break;
    default:
      throw new Error(`ECONOMIC_MATHEMATICS_STATIC_SKETCH_NOT_READY:${String(sketchKind)}`);
  }
  return (
    <svg
      className="econmath-sketch"
      viewBox="0 0 680 520"
      role="img"
      aria-label={`${spec.title}的原生数学图形示意`}
    >
      <title>{`${spec.title}的数学图形`}</title>
      <desc>{`${spec.title}对应的坐标、曲线与关键几何关系。`}</desc>
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2d9bb3" stopOpacity="0.52" />
          <stop offset="1" stopColor="#2d9bb3" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path className="econmath-sketch__grid" d="M70 30V460H650M70 390H650M70 320H650M70 250H650M70 180H650M70 110H650M150 30V460M230 30V460M310 30V460M390 30V460M470 30V460M550 30V460M630 30V460" />
      <path className="econmath-sketch__axes" d="M70 30V460H650" />
      {sketch}
      <text x="642" y="490">输入</text>
      <text x="28" y="42">结果</text>
    </svg>
  );
}

function EditorialScene({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-scene">
      <img src={UNIT_HEROES[spec.unit]} alt="重庆消费品牌教学情境插画" />
      <div className="econmath-scene__veil" />
      <CoreCopy spec={spec} />
    </div>
  );
}

function DecisionSplit({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  const items = spec.data ?? spec.body ?? ["先判断", "再计算"];
  return (
    <div className="econmath-decision">
      <CoreCopy spec={spec} />
      <div className="econmath-decision__choices">
        {items.slice(0, 4).map((item, index) => (
          <div key={item}><span>{String.fromCharCode(65 + index)}</span><p>{item}</p></div>
        ))}
      </div>
    </div>
  );
}

function DataLedger({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-ledger">
      <CoreCopy spec={spec} />
      <div className="econmath-ledger__sheet">
        <div><b>字段</b><b>观察值 / 关系</b></div>
        {(spec.data ?? spec.body ?? []).slice(0, 7).map((item, index) => (
          <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>
        ))}
      </div>
    </div>
  );
}

function VariableMap({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  const items = spec.data ?? spec.body ?? [];
  return (
    <div className="econmath-variable-map">
      <CoreCopy spec={spec} />
      <div className="econmath-variable-map__stage">
        {items.slice(0, 5).map((item, index) => (
          <div key={item} className={`econmath-variable-map__node econmath-variable-map__node--${index + 1}`}>
            <span>{index === 0 ? "输入" : index === items.length - 1 ? "结果" : "关系"}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormulaBoard({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-board">
      <CoreCopy spec={spec} />
      <div className="econmath-board__notation" aria-hidden="true">
        <span>Δ</span><span>∫</span><span>lim</span><span>∂</span>
      </div>
    </div>
  );
}

function GraphComposition({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-graph-composition">
      <CoreCopy spec={spec} />
      <CoordinateSketch spec={spec} />
    </div>
  );
}

function ComparisonBoard({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  const items = spec.data ?? spec.body ?? [];
  const midpoint = Math.max(1, Math.ceil(items.length / 2));
  return (
    <div className="econmath-comparison">
      <CoreCopy spec={spec} />
      <div className="econmath-comparison__columns">
        <section><span>路径 A</span>{items.slice(0, midpoint).map((item) => <p key={item}>{item}</p>)}</section>
        <section><span>路径 B</span>{items.slice(midpoint).map((item) => <p key={item}>{item}</p>)}</section>
      </div>
    </div>
  );
}

function WorkedGrid({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-worked">
      <CoreCopy spec={spec} />
      <div className="econmath-worked__steps">
        {(spec.data ?? spec.body ?? []).slice(0, 6).map((item, index) => (
          <div key={item}><span>{index + 1}</span><p>{item}</p></div>
        ))}
      </div>
    </div>
  );
}

function ExerciseDesk({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-exercise">
      <div className="econmath-exercise__paper"><CoreCopy spec={spec} /></div>
      <aside>
        <span>独立完成</span>
        <strong>{spec.kind === "solution" ? "核对每一步" : "先写式，再计算"}</strong>
        <p>{spec.kind === "solution" ? "答案只在本页出现；返回题目页时不显示。" : "保留推导、单位与定义域，不只写最终数值。"}</p>
      </aside>
    </div>
  );
}

function ErrorLens({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-error-lens">
      <div className="econmath-error-lens__mark">?</div>
      <CoreCopy spec={spec} />
      <div className="econmath-error-lens__rule">找出第一处失效的等号</div>
    </div>
  );
}

function ModelBoundary({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-boundary">
      <CoreCopy spec={spec} />
      <div className="econmath-boundary__rings">
        <span>模型内</span><span>可检验</span><span>不可外推</span>
      </div>
    </div>
  );
}

function ManagerMemo({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-memo">
      <div className="econmath-memo__clip" />
      <CoreCopy spec={spec} />
      <aside><b>管理摘要</b><span>结论</span><span>依据</span><span>边界</span></aside>
    </div>
  );
}

function ChapterBridge({ spec }: { spec: EconomicMathematicsSlideSpec }) {
  return (
    <div className="econmath-bridge">
      <span className="econmath-bridge__unit">UNIT {spec.unit}</span>
      <CoreCopy spec={spec} />
      <div className="econmath-bridge__line"><i /><i /><i /><i /></div>
    </div>
  );
}

export const ECONOMIC_MATHEMATICS_REGISTERED_VISUALS = [
  "editorial-scene",
  "decision-split",
  "data-ledger",
  "variable-map",
  "formula-board",
  "coordinate-plot",
  "comparison-board",
  "worked-grid",
  "exercise-desk",
  "error-lens",
  "model-boundary",
  "manager-memo",
  "chapter-bridge",
  "area-studio",
  "surface-studio",
  "optimization-studio"
] as const satisfies readonly EconomicMathematicsVisual[];

function renderComposition(spec: EconomicMathematicsSlideSpec) {
  const renderers: Record<EconomicMathematicsVisual, () => ReactElement> = {
    "editorial-scene": () => <EditorialScene spec={spec} />,
    "decision-split": () => <DecisionSplit spec={spec} />,
    "data-ledger": () => <DataLedger spec={spec} />,
    "variable-map": () => <VariableMap spec={spec} />,
    "formula-board": () => <FormulaBoard spec={spec} />,
    "coordinate-plot": () => <GraphComposition spec={spec} />,
    "comparison-board": () => <ComparisonBoard spec={spec} />,
    "worked-grid": () => <WorkedGrid spec={spec} />,
    "exercise-desk": () => <ExerciseDesk spec={spec} />,
    "error-lens": () => <ErrorLens spec={spec} />,
    "model-boundary": () => <ModelBoundary spec={spec} />,
    "manager-memo": () => <ManagerMemo spec={spec} />,
    "chapter-bridge": () => <ChapterBridge spec={spec} />,
    "area-studio": () => <GraphComposition spec={spec} />,
    "surface-studio": () => <GraphComposition spec={spec} />,
    "optimization-studio": () => <GraphComposition spec={spec} />
  };
  const renderer = renderers[spec.visual] as (() => ReactElement) | undefined;
  if (!renderer) {
    throw new Error(`ECONOMIC_MATHEMATICS_VISUAL_NOT_REGISTERED:${String(spec.visual)}`);
  }
  return cloneElement(renderer(), { key: spec.compositionId });
}

function ruleValue(
  values: Readonly<Record<string, SlideInteractionScalar>>,
  defaults: Readonly<Record<string, string | number | boolean>>,
  key: string
) {
  return values[key] ?? defaults[key]!;
}

function InteractionControl({
  name,
  rule,
  value,
  disabled,
  onChange
}: {
  name: string;
  rule: EconomicMathematicsInteractionRule;
  value: SlideInteractionScalar;
  disabled: boolean;
  onChange: (value: SlideInteractionScalar) => void;
}) {
  const label = {
    price: "价格",
    segment: "客群",
    revealOptimum: "揭示最优点",
    n: "序号 n",
    epsilon: "容忍带 ε",
    orderAmount: "订单金额",
    approach: "逼近方向",
    basePrice: "基准价格",
    h: "间距 h",
    deltaPrice: "价格改变量",
    partitions: "分割数",
    sample: "采样点",
    upperBound: "累计上限",
    advertising: "广告投入",
    lockedAxis: "固定变量",
    baseAdvertising: "基准广告",
    deltaAdvertising: "广告改变量",
    x: "渠道 x",
    y: "渠道 y",
    revealClassification: "揭示分类",
    revealStep: "分步揭示结论",
    budget: "总预算",
    channelX: "渠道 x 投入"
  }[name] ?? name;

  if (rule.type === "boolean") {
    return (
      <label className="econmath-control econmath-control--toggle">
        <input
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>{label}</span>
      </label>
    );
  }
  if (rule.type === "enum") {
    return (
      <label className="econmath-control">
        <span>{label}</span>
        <select
          disabled={disabled}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {rule.values.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="econmath-control">
      <span>{label}<b>{Number(value).toFixed(rule.step && rule.step < 1 ? 2 : 0)}</b></span>
      <input
        disabled={disabled}
        max={rule.max}
        min={rule.min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={rule.step ?? 1}
        type="range"
        value={Number(value)}
      />
    </label>
  );
}

export function buildEconomicMathematicsComparisonPreset(
  definition: EconomicMathematicsInteractionDefinition
): SlideInteractionValues {
  const preset: SlideInteractionValues = {};
  for (const [name, rule] of Object.entries(definition.rules)) {
    if (rule.type === "boolean") continue;
    if (rule.type === "enum") {
      const current = String(definition.defaults[name]);
      const index = Math.max(0, rule.values.indexOf(current));
      preset[name] = rule.values[(index + 1) % rule.values.length]!;
      continue;
    }
    const step = rule.step ?? 1;
    const raw = rule.min + (rule.max - rule.min) * 0.72;
    const snapped = rule.min + Math.round((raw - rule.min) / step) * step;
    preset[name] = Math.min(rule.max, Math.max(rule.min, snapped));
  }
  if (definition.id === "budget-constraint-lab") {
    const nextBudget = Number(preset.budget ?? definition.defaults.budget);
    const nextChannelX = Number(preset.channelX ?? definition.defaults.channelX);
    preset.channelX = Math.min(nextBudget, nextChannelX);
  }
  return preset;
}

function LabTeacherTools({
  definition,
  spec,
  onPatch,
  onReset
}: {
  definition: EconomicMathematicsInteractionDefinition;
  spec: EconomicMathematicsSlideSpec;
  onPatch?: (patch: SlideInteractionValues) => void;
  onReset?: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(
      () => setElapsedSeconds((value) => value + 1),
      1_000
    );
    return () => window.clearInterval(timer);
  }, [running]);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const modelPresets: readonly { label: string; patch: SlideInteractionValues }[] =
    definition.id === "marketing-surface-lab" &&
      (spec.slideKey === "em-l26-23-lab-compensation" ||
        spec.slideKey === "em-l27-19-lab-ad-levels")
      ? [4, 25, 100].map((advertising) => ({ label: `a=${advertising}`, patch: { advertising } }))
      : definition.id === "continuity-threshold-lab"
        ? [
          { label: "98.99 左", patch: { orderAmount: 98.99, approach: "left" } },
          { label: "99.00 点", patch: { orderAmount: 99, approach: "free" } },
          { label: "99.01 右", patch: { orderAmount: 99.01, approach: "right" } }
        ]
        : definition.id === "secant-tangent-lab"
          ? [
            { label: "h=-0.1", patch: { h: -0.1 } },
            { label: "h=0 极限", patch: { h: 0 } },
            { label: "h=0.1", patch: { h: 0.1 } }
          ]
          : [];
  return (
    <div className="econmath-lab__teacher-tools" aria-label="教师实验工具">
      <div className="econmath-lab__presets">
        <button onClick={onReset} type="button">基准预设</button>
        <button onClick={() => onPatch?.(buildEconomicMathematicsComparisonPreset(definition))} type="button">对比预设</button>
      </div>
      {modelPresets.length > 0 && (
        <div className="econmath-lab__presets econmath-lab__presets--model" aria-label="模型关键预设">
          {modelPresets.map((preset) => (
            <button key={preset.label} onClick={() => onPatch?.(preset.patch)} type="button">{preset.label}</button>
          ))}
        </div>
      )}
      <div className="econmath-lab__timer">
        <output aria-label="课堂计时">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </output>
        <button onClick={() => setRunning((value) => !value)} type="button">
          {running ? "暂停" : "计时"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setElapsedSeconds(0);
          }}
          type="button"
        >
          清零
        </button>
      </div>
      <button className="econmath-lab__reset" onClick={onReset} type="button">重置本页实验</button>
    </div>
  );
}

export function calculateLabMetrics(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, SlideInteractionScalar>>,
  spec?: Pick<EconomicMathematicsSlideSpec, "slideKey">
) {
  const value = (key: string) => Number(ruleValue(values, definition.defaults, key));
  const text = (key: string) => String(ruleValue(values, definition.defaults, key));
  const yes = (key: string) => Boolean(ruleValue(values, definition.defaults, key));
  const id = definition.id;
  if (id === "price-profit-lab" || id === "elasticity-profit-lab") {
    const p = value("price");
    const segment = text("segment");
    const intercept = segment === "B" ? 900 : 1200;
    const slope = segment === "B" ? 6 : 10;
    const q = Math.max(0, intercept - slope * p);
    const revenue = p * q;
    const cost = 2000 + 20 * q;
    const profit = revenue - cost;
    const elasticity = q === 0 ? 0 : (slope * p) / q;
    return {
      headline: `客群 ${segment} · 价格 ${p.toFixed(0)} 元/杯`,
      metrics: id === "price-profit-lab"
        ? [`销量 ${q.toFixed(0)} 杯/日`, `收入 ${revenue.toFixed(0)} 元/日`, `成本 ${cost.toFixed(0)} 元/日`, `利润 ${profit.toFixed(0)} 元/日`]
        : [`销量 ${q.toFixed(0)} 杯/日`, `收入 ${revenue.toFixed(0)} 元/日`, `利润 ${profit.toFixed(0)} 元/日`, `正值弹性 ${elasticity.toFixed(2)}`],
      reveal: id === "price-profit-lab"
        ? "价格变化会同时改写销量、收入、成本与利润，四项必须合账判断。"
        : yes("revealOptimum") ? `模型内利润峰价格：${segment === "B" ? 85 : 70} 元/杯` : "先比较收入曲线与利润曲线的峰位是否重合。"
    };
  }
  if (id === "sequence-limit-lab") {
    const n = value("n");
    const a = 80 - 20 * Math.pow(0.6, n);
    const epsilon = Number(text("epsilon"));
    return { headline: `a_${n.toFixed(0)} = ${a.toFixed(2)}%`, metrics: [`距80%还有 ${(80 - a).toFixed(2)} 个百分点`, `容忍带 ±${epsilon} 个百分点`, Math.abs(80 - a) < epsilon ? "已进入容忍带" : "尚未进入容忍带"], reveal: "进入之后还要保持在带内" };
  }
  if (id === "continuity-threshold-lab") {
    const x = value("orderAmount");
    const payment = x < 99 ? x + 10 : x;
    return { headline: `订单 ${x.toFixed(2)} 元`, metrics: [`实际支付 ${payment.toFixed(2)} 元`, `逼近：${text("approach")}`, `左极限 109 元`, `右极限 99 元`], reveal: "门槛处左右趋势不同，因此不连续" };
  }
  if (id === "secant-tangent-lab") {
    const p = value("basePrice");
    const h = value("h");
    const profit = (x: number) => -10 * x * x + 1400 * x - 26000;
    const tangentSlope = 1400 - 20 * p;
    const slope = h === 0 ? tangentSlope : (profit(p + h) - profit(p)) / h;
    const derivativeUnit = "（元/日）/（元/杯）";
    return { headline: h === 0 ? "h = 0 · 差商未定义，当前仅显示极限切线" : `h = ${h.toFixed(2)}`, metrics: [h === 0 ? "割线差商在 h=0 未定义" : `平均变化率 ${slope.toFixed(2)} ${derivativeUnit}`, `切线斜率 ${tangentSlope.toFixed(2)} ${derivativeUnit}`, `基准价格 ${p.toFixed(0)} 元/杯`], reveal: "h 从正、负两侧趋近0时，割线斜率都趋向利润导数" };
  }
  if (id === "linearization-error-lab") {
    const p = value("basePrice");
    const d = value("deltaPrice");
    const revenue = (x: number) => 1200 * x - 10 * x * x;
    const exact = revenue(p + d) - revenue(p);
    const approx = (1200 - 20 * p) * d;
    return { headline: `Δp = ${d.toFixed(2)} 元`, metrics: [`精确变化 ${exact.toFixed(2)} 元`, `微分估计 ${approx.toFixed(2)} 元`, `误差 ${(exact - approx).toFixed(2)} 元`], reveal: "改变量越小，局部线性近似通常越可靠" };
  }
  if (id === "riemann-sum-lab") {
    const n = Number(text("partitions"));
    const method = text("sample");
    const width = 8 / n;
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      const t = method === "right" ? (i + 1) * width : method === "midpoint" ? (i + 0.5) * width : i * width;
      sum += (120 + 24 * t - 3 * t * t) * width;
    }
    return { headline: `8 小时分成 ${n} 个小区间 · ${method}`, metrics: [`近似累计 ${sum.toFixed(1)} 杯`, `精确累计 1216.0 杯`, `误差 ${(sum - 1216).toFixed(1)} 杯`], reveal: "分割变细时，近似值趋向定积分" };
  }
  if (id === "accumulation-limit-lab") {
    const b = value("upperBound");
    const total = 120 * b + 12 * b * b - b * b * b;
    const rate = 120 + 24 * b - 3 * b * b;
    return { headline: `累计到第 b=${b.toFixed(2)} 日`, metrics: [`累计 ${total.toFixed(1)} 件`, `当期速率 ${rate.toFixed(1)} 件/日`, `F′(b) = v(b)`], reveal: "移动上限的一点新增量由当前速率控制" };
  }
  if (id === "consumer-surplus-lab") {
    const p = value("price");
    const q = Math.max(0, 1200 - 10 * p);
    const revenue = p * q;
    const surplus = 0.5 * (120 - p) * q;
    return { headline: `市场价格 ${p.toFixed(0)} 元`, metrics: [`销量 ${q.toFixed(0)} 件`, `企业收入 ${revenue.toFixed(0)} 元`, `消费者剩余 ${surplus.toFixed(0)} 元`], reveal: "收入矩形与消费者剩余三角形不是同一个目标" };
  }
  if (id === "marketing-surface-lab") {
    const p = value("price");
    const a = value("advertising");
    const q = 1200 - 8 * p + 24 * Math.sqrt(a);
    return { headline: `Q(${p.toFixed(0)}, ${a.toFixed(0)}) = ${q.toFixed(1)} 件`, metrics: [`价格 ${p.toFixed(0)} 元`, `广告 ${a.toFixed(0)} 千元`, `∂Q/∂p = -8 件/元`, yes("revealStep") ? `∂Q/∂a = ${(12 / Math.sqrt(a)).toFixed(2)} 件/千元` : "∂Q/∂a 待揭示"], reveal: "偏导数只改变一个变量，其余变量保持不变" };
  }
  if (id === "tangent-plane-lab") {
    const p = value("basePrice");
    const a = value("baseAdvertising");
    const dp = value("deltaPrice");
    const da = value("deltaAdvertising");
    const exact = -8 * dp + 24 * (Math.sqrt(a + da) - Math.sqrt(a));
    const approx = -8 * dp + (12 / Math.sqrt(a)) * da;
    return { headline: `ΔQ 精确 ${exact.toFixed(2)} 件 · 近似 ${approx.toFixed(2)} 件`, metrics: [`价格贡献 ${(-8 * dp).toFixed(2)} 件`, `广告贡献 ${((12 / Math.sqrt(a)) * da).toFixed(2)} 件`, `误差 ${(exact - approx).toFixed(2)} 件`], reveal: "全微分把多因素的小变化拆成可解释的分项贡献" };
  }
  if (id === "unconstrained-optimum-lab") {
    const x = value("x");
    const y = value("y");
    const profit = 40 * x + 30 * y - x * x - y * y - 100;
    const classification = spec?.slideKey === "em-l30-23-lab-optimum"
      ? "公开峰顶状态：∇Π=(0,0)"
      : yes("revealClassification") ? "Hessian：负定，驻点为极大值" : "先找到驻点，再决定类型";
    return { headline: `Π(${x.toFixed(1)}, ${y.toFixed(1)}) = ${profit.toFixed(1)} 万元`, metrics: [`Πx = ${(40 - 2 * x).toFixed(1)} 万元/单位`, `Πy = ${(30 - 2 * y).toFixed(1)} 万元/单位`, classification], reveal: "一阶条件只找候选点，二阶条件负责分类" };
  }
  const budget = Number(text("budget"));
  const x = value("channelX");
  const y = budget - x;
  const response = 40 * Math.sqrt(x) + 30 * Math.sqrt(y);
  const optimumX = budget * 0.64;
  const allocation = (amount: number) => Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  return { headline: `预算 ${budget} 千元 · x=${allocation(x)} · y=${allocation(y)}`, metrics: [`总响应 ${response.toFixed(3)} 响应单位`, `渠道x边际 ${x > 0 ? (20 / Math.sqrt(x)).toFixed(3) : "∞"} 响应单位/千元`, `渠道y边际 ${y > 0 ? (15 / Math.sqrt(y)).toFixed(3) : "∞"} 响应单位/千元`], reveal: yes("revealOptimum") ? `模型内最优分配：${allocation(optimumX)} / ${allocation(budget - optimumX)} 千元` : "沿预算线移动，先寻找两边边际响应相等的位置" };
}

const LAB_PLOT = {
  left: 76,
  right: 630,
  top: 42,
  bottom: 414
} as const;

function projectionScale(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function projectionPath(points: readonly (readonly [number, number])[]) {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
}

function projectionNumber(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, SlideInteractionScalar>>,
  key: string
) {
  return Number(ruleValue(values, definition.defaults, key));
}

function projectionText(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, SlideInteractionScalar>>,
  key: string
) {
  return String(ruleValue(values, definition.defaults, key));
}

function projectionBoolean(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, SlideInteractionScalar>>,
  key: string
) {
  return Boolean(ruleValue(values, definition.defaults, key));
}

function ProjectionFrame({
  id,
  label,
  description,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  children
}: {
  id: string;
  label: string;
  description: string;
  xLabel: string;
  yLabel: string;
  xDomain: readonly [string, string];
  yDomain: readonly [string, string];
  children: ReactNode;
}) {
  const titleId = `${id}-projection-title`;
  const descriptionId = `${id}-projection-description`;
  const clipId = `${id}-projection-clip`;
  const verticalGrid = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const horizontalGrid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg
      aria-labelledby={`${titleId} ${descriptionId}`}
      data-projection={id}
      role="img"
      viewBox="0 0 680 500"
    >
      <title id={titleId}>{`${label}的当前权威投影`}</title>
      <desc id={descriptionId}>{description}</desc>
      <defs>
        <clipPath id={clipId}>
          <rect
            height={LAB_PLOT.bottom - LAB_PLOT.top}
            width={LAB_PLOT.right - LAB_PLOT.left}
            x={LAB_PLOT.left}
            y={LAB_PLOT.top}
          />
        </clipPath>
      </defs>
      <g aria-hidden="true" className="econmath-projection__grid">
        {verticalGrid.map((fraction) => {
          const x = projectionScale(fraction, 0, 1, LAB_PLOT.left, LAB_PLOT.right);
          return <line key={`x-${fraction}`} x1={x} x2={x} y1={LAB_PLOT.top} y2={LAB_PLOT.bottom} />;
        })}
        {horizontalGrid.map((fraction) => {
          const y = projectionScale(fraction, 0, 1, LAB_PLOT.bottom, LAB_PLOT.top);
          return <line key={`y-${fraction}`} x1={LAB_PLOT.left} x2={LAB_PLOT.right} y1={y} y2={y} />;
        })}
      </g>
      <path
        aria-hidden="true"
        className="econmath-projection__axes"
        d={`M${LAB_PLOT.left} ${LAB_PLOT.top}V${LAB_PLOT.bottom}H${LAB_PLOT.right}`}
      />
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <g aria-hidden="true" className="econmath-projection__axis-copy">
        <text x={LAB_PLOT.left} y={LAB_PLOT.bottom + 22}>{xDomain[0]}</text>
        <text textAnchor="end" x={LAB_PLOT.right} y={LAB_PLOT.bottom + 22}>{xDomain[1]}</text>
        <text textAnchor="end" x={LAB_PLOT.left - 12} y={LAB_PLOT.bottom + 5}>{yDomain[0]}</text>
        <text textAnchor="end" x={LAB_PLOT.left - 12} y={LAB_PLOT.top + 5}>{yDomain[1]}</text>
        <text className="econmath-projection__axis-label" textAnchor="middle" x={(LAB_PLOT.left + LAB_PLOT.right) / 2} y="475">{xLabel}</text>
        <text
          className="econmath-projection__axis-label"
          textAnchor="middle"
          transform="rotate(-90 18 228)"
          x="18"
          y="228"
        >
          {yLabel}
        </text>
      </g>
    </svg>
  );
}

function PriceProfitProjection({
  definition,
  values,
  showElasticity
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
  showElasticity: boolean;
}) {
  const price = projectionNumber(definition, values, "price");
  const segment = projectionText(definition, values, "segment");
  const intercept = segment === "B" ? 900 : 1200;
  const demandSlope = segment === "B" ? 6 : 10;
  const profit = (currentPrice: number) =>
    (currentPrice - 20) * (intercept - demandSlope * currentPrice) - 2000;
  const revenue = (currentPrice: number) => currentPrice * (intercept - demandSlope * currentPrice);
  const x = (currentPrice: number) => projectionScale(currentPrice, 20, 110, LAB_PLOT.left, LAB_PLOT.right);
  const yMaximum = showElasticity ? 38000 : 26000;
  const y = (currentProfit: number) => projectionScale(currentProfit, -4000, yMaximum, LAB_PLOT.bottom, LAB_PLOT.top);
  const curve = projectionPath(Array.from({ length: 91 }, (_, index) => {
    const currentPrice = 20 + index;
    return [x(currentPrice), y(profit(currentPrice))] as const;
  }));
  const revenueCurve = projectionPath(Array.from({ length: 91 }, (_, index) => {
    const currentPrice = 20 + index;
    return [x(currentPrice), y(revenue(currentPrice))] as const;
  }));
  const currentX = x(price);
  const currentY = y(profit(price));
  const optimumPrice = segment === "B" ? 85 : 70;
  const revenueOptimumPrice = intercept / (2 * demandSlope);
  const revealOptimum = definition.id === "elasticity-profit-lab" && projectionBoolean(definition, values, "revealOptimum");
  const quantity = Math.max(0, intercept - demandSlope * price);
  const elasticity = quantity === 0 ? 0 : demandSlope * price / quantity;
  return (
    <ProjectionFrame
      description={showElasticity
        ? `客群${segment}的收入与利润曲线同时投影；红点为当前利润，方点为当前收入，峰位只在教师揭示后标记。`
        : `客群${segment}的利润函数由需求、单位成本20元和固定成本2000元共同确定；红点为当前价格。`}
      id={definition.id}
      label={definition.label}
      xDomain={["20", "110"]}
      xLabel="价格 p / 元·杯⁻¹"
      yDomain={["-4000", String(yMaximum)]}
      yLabel={showElasticity ? "收入 R、利润 Π / 元·日⁻¹" : "利润 Π / 元·日⁻¹"}
    >
      <line className="econmath-projection__zero" x1={LAB_PLOT.left} x2={LAB_PLOT.right} y1={y(0)} y2={y(0)} />
      <path className="econmath-projection__curve" d={curve} data-layer="profit-parabola" />
      {showElasticity && <path className="econmath-projection__revenue-curve" d={revenueCurve} data-layer="revenue-parabola" />}
      <line className="econmath-projection__guide" x1={currentX} x2={currentX} y1={currentY} y2={LAB_PLOT.bottom} />
      <circle className="econmath-projection__point" cx={currentX} cy={currentY} data-layer="current-state" r="10" />
      {showElasticity && <rect className="econmath-projection__estimate-point" height="13" width="13" x={currentX - 6.5} y={y(revenue(price)) - 6.5} />}
      <text className="econmath-projection__annotation" x={Math.min(currentX + 14, 548)} y={Math.max(currentY - 15, 62)}>
        p={price.toFixed(0)}
      </text>
      {showElasticity && (
        <>
          <text className="econmath-projection__annotation econmath-projection__annotation--cyan" x="94" y="70">
            青线：收入 · 正值弹性 E={elasticity.toFixed(2)}
          </text>
          <text className="econmath-projection__annotation" x="94" y="94">红点：利润</text>
        </>
      )}
      {revealOptimum && (
        <g data-layer="profit-optimum">
          <line className="econmath-projection__optimum-guide" x1={x(optimumPrice)} x2={x(optimumPrice)} y1={y(profit(optimumPrice))} y2={LAB_PLOT.bottom} />
          <circle className="econmath-projection__optimum" cx={x(optimumPrice)} cy={y(profit(optimumPrice))} r="9" />
          <text className="econmath-projection__annotation" textAnchor="middle" x={x(optimumPrice)} y={y(profit(optimumPrice)) - 16}>
            利润峰 p={optimumPrice}
          </text>
          {showElasticity && (
            <>
              <circle className="econmath-projection__revenue-optimum" cx={x(revenueOptimumPrice)} cy={y(revenue(revenueOptimumPrice))} r="8" />
              <text className="econmath-projection__annotation econmath-projection__annotation--cyan" textAnchor="middle" x={x(revenueOptimumPrice)} y={y(revenue(revenueOptimumPrice)) - 15}>
                收入峰 p={revenueOptimumPrice.toFixed(0)}
              </text>
            </>
          )}
        </g>
      )}
    </ProjectionFrame>
  );
}

function SequenceLimitProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const currentN = projectionNumber(definition, values, "n");
  const epsilon = Number(projectionText(definition, values, "epsilon"));
  const sequence = (n: number) => 80 - 20 * Math.pow(0.6, n);
  const x = (n: number) => projectionScale(n, 0, 24, LAB_PLOT.left, LAB_PLOT.right);
  const y = (a: number) => projectionScale(a, 55, 86, LAB_PLOT.bottom, LAB_PLOT.top);
  const points = Array.from({ length: 25 }, (_, index) => {
    const n = index;
    return { n, a: sequence(n), x: x(n), y: y(sequence(n)) };
  });
  const bandTop = y(80 + epsilon);
  const bandBottom = y(80 - epsilon);
  return (
    <ProjectionFrame
      description="点列按 a_n=80-20×0.6^n 生成；青色区域是围绕极限80的当前容忍带。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", "24"]}
      xLabel="序号 n"
      yDomain={["55", "86"]}
      yLabel="指标 aₙ / %"
    >
      <rect
        className="econmath-projection__band"
        data-layer="tolerance-band"
        height={Math.abs(bandBottom - bandTop)}
        width={LAB_PLOT.right - LAB_PLOT.left}
        x={LAB_PLOT.left}
        y={Math.min(bandTop, bandBottom)}
      />
      <line className="econmath-projection__limit" x1={LAB_PLOT.left} x2={LAB_PLOT.right} y1={y(80)} y2={y(80)} />
      <path className="econmath-projection__curve" d={projectionPath(points.map((point) => [point.x, point.y] as const))} />
      {points.map((point) => (
        <circle
          className={point.n === currentN ? "econmath-projection__point" : "econmath-projection__sample-point"}
          cx={point.x}
          cy={point.y}
          data-layer={point.n === currentN ? "current-term" : undefined}
          key={point.n}
          r={point.n === currentN ? 9 : 3.5}
        />
      ))}
      <text className="econmath-projection__annotation" x="94" y={Math.max(62, bandTop - 10)}>80 ± {epsilon}</text>
    </ProjectionFrame>
  );
}

function ContinuityThresholdProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const amount = projectionNumber(definition, values, "orderAmount");
  const payment = amount < 99 ? amount + 10 : amount;
  const x = (orderAmount: number) => projectionScale(orderAmount, 94, 104, LAB_PLOT.left, LAB_PLOT.right);
  const y = (actualPayment: number) => projectionScale(actualPayment, 94, 111, LAB_PLOT.bottom, LAB_PLOT.top);
  return (
    <ProjectionFrame
      description="订单金额低于99元时实付为x+10，达到99元后实付为x；空心点与实心点显示门槛处的跳变。"
      id={definition.id}
      label={definition.label}
      xDomain={["94", "104"]}
      xLabel="订单金额 x / 元"
      yDomain={["94", "111"]}
      yLabel="实际支付 P(x) / 元"
    >
      <g data-layer="threshold-jump">
        <path className="econmath-projection__curve" d={projectionPath([[x(94), y(104)], [x(99), y(109)]])} />
        <path className="econmath-projection__curve" d={projectionPath([[x(99), y(99)], [x(104), y(104)]])} />
        <line className="econmath-projection__threshold" x1={x(99)} x2={x(99)} y1={LAB_PLOT.top} y2={LAB_PLOT.bottom} />
        <circle className="econmath-projection__open-point" cx={x(99)} cy={y(109)} r="9" />
        <circle className="econmath-projection__closed-point" cx={x(99)} cy={y(99)} r="9" />
      </g>
      <circle className="econmath-projection__point" cx={x(amount)} cy={y(payment)} data-layer="current-state" r="8" />
      <text className="econmath-projection__annotation" textAnchor="middle" x={x(99)} y="66">门槛 99</text>
    </ProjectionFrame>
  );
}

function SecantTangentProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const basePrice = projectionNumber(definition, values, "basePrice");
  const h = projectionNumber(definition, values, "h");
  const secondPrice = basePrice + h;
  const profit = (price: number) => -10 * price * price + 1400 * price - 26000;
  const derivative = 1400 - 20 * basePrice;
  const x = (price: number) => projectionScale(price, 5, 120, LAB_PLOT.left, LAB_PLOT.right);
  const y = (currentProfit: number) => projectionScale(currentProfit, -22000, 26000, LAB_PLOT.bottom, LAB_PLOT.top);
  const curve = projectionPath(Array.from({ length: 116 }, (_, index) => {
    const price = index + 5;
    return [x(price), y(profit(price))] as const;
  }));
  const tangentStart = Math.max(5, basePrice - 14);
  const tangentEnd = Math.min(120, basePrice + 14);
  const tangent = (price: number) => profit(basePrice) + derivative * (price - basePrice);
  return (
    <ProjectionFrame
      description="利润抛物线上两个价格点确定割线；基准点处的红色直线是利润导数给出的切线。"
      id={definition.id}
      label={definition.label}
      xDomain={["5", "120"]}
      xLabel="价格 p / 元·杯⁻¹"
      yDomain={["-22000", "26000"]}
      yLabel="利润 Π / 元·日⁻¹"
    >
      <path className="econmath-projection__curve" d={curve} data-layer="profit-curve" />
      {Math.abs(h) > 1e-9 && (
        <line
          className="econmath-projection__secant"
          data-layer="secant"
          x1={x(basePrice)}
          x2={x(secondPrice)}
          y1={y(profit(basePrice))}
          y2={y(profit(secondPrice))}
        />
      )}
      <line
        className="econmath-projection__tangent"
        data-layer="tangent"
        x1={x(tangentStart)}
        x2={x(tangentEnd)}
        y1={y(tangent(tangentStart))}
        y2={y(tangent(tangentEnd))}
      />
      <circle className="econmath-projection__point" cx={x(basePrice)} cy={y(profit(basePrice))} r="9" />
      {Math.abs(h) > 1e-9 && <circle className="econmath-projection__second-point" cx={x(secondPrice)} cy={y(profit(secondPrice))} r="8" />}
      <text className="econmath-projection__annotation" x={Math.min(x(basePrice) + 12, 560)} y={Math.max(y(profit(basePrice)) - 14, 62)}>p</text>
      {Math.abs(h) > 1e-9 && <text className="econmath-projection__annotation econmath-projection__annotation--cyan" x={Math.min(x(secondPrice) + 10, 570)} y={Math.max(y(profit(secondPrice)) - 12, 62)}>p+h</text>}
    </ProjectionFrame>
  );
}

function LinearizationErrorProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const basePrice = projectionNumber(definition, values, "basePrice");
  const deltaPrice = projectionNumber(definition, values, "deltaPrice");
  const newPrice = basePrice + deltaPrice;
  const revenue = (price: number) => 1200 * price - 10 * price * price;
  const derivative = 1200 - 20 * basePrice;
  const linearRevenue = (price: number) => revenue(basePrice) + derivative * (price - basePrice);
  const x = (price: number) => projectionScale(price, 25, 85, LAB_PLOT.left, LAB_PLOT.right);
  const y = (amount: number) => projectionScale(amount, 22000, 37000, LAB_PLOT.bottom, LAB_PLOT.top);
  const curve = projectionPath(Array.from({ length: 121 }, (_, index) => {
    const price = 25 + index * 0.5;
    return [x(price), y(revenue(price))] as const;
  }));
  const tangentStart = Math.max(25, basePrice - 18);
  const tangentEnd = Math.min(85, basePrice + 18);
  const exactY = y(revenue(newPrice));
  const estimateY = y(linearRevenue(newPrice));
  return (
    <ProjectionFrame
      description="收入曲线与基准点切线共同投影；新价格处红点为精确收入，青色方点为局部线性估计，两者间距就是误差。"
      id={definition.id}
      label={definition.label}
      xDomain={["25", "85"]}
      xLabel="价格 p / 元"
      yDomain={["22000", "37000"]}
      yLabel="收入 R / 元"
    >
      <path className="econmath-projection__curve" d={curve} data-layer="revenue-curve" />
      <line
        className="econmath-projection__tangent"
        data-layer="linear-estimate"
        x1={x(tangentStart)}
        x2={x(tangentEnd)}
        y1={y(linearRevenue(tangentStart))}
        y2={y(linearRevenue(tangentEnd))}
      />
      <circle className="econmath-projection__base-point" cx={x(basePrice)} cy={y(revenue(basePrice))} r="7" />
      <circle className="econmath-projection__point" cx={x(newPrice)} cy={exactY} data-layer="exact-value" r="9" />
      <rect className="econmath-projection__estimate-point" height="13" width="13" x={x(newPrice) - 6.5} y={estimateY - 6.5} />
      <line className="econmath-projection__error" data-layer="linearization-error" x1={x(newPrice) + 13} x2={x(newPrice) + 13} y1={exactY} y2={estimateY} />
    </ProjectionFrame>
  );
}

function RiemannSumProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const partitions = Number(projectionText(definition, values, "partitions"));
  const sample = projectionText(definition, values, "sample");
  const velocity = (time: number) => 120 + 24 * time - 3 * time * time;
  const x = (time: number) => projectionScale(time, 0, 8, LAB_PLOT.left, LAB_PLOT.right);
  const y = (rate: number) => projectionScale(rate, 0, 180, LAB_PLOT.bottom, LAB_PLOT.top);
  const width = 8 / partitions;
  const curve = projectionPath(Array.from({ length: 81 }, (_, index) => {
    const time = index / 10;
    return [x(time), y(velocity(time))] as const;
  }));
  return (
    <ProjectionFrame
      description="把8小时营业时段分割后，每个矩形使用当前左端、右端或中点采样销量率；矩形总面积近似累计杯数。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", "8"]}
      xLabel="营业时间 t / 小时"
      yDomain={["0", "180"]}
      yLabel="销量率 v(t) / 杯·小时⁻¹"
    >
      <g data-layer="riemann-rectangles">
        {Array.from({ length: partitions }, (_, index) => {
          const left = index * width;
          const sampleTime = sample === "right" ? left + width : sample === "midpoint" ? left + width / 2 : left;
          const top = y(velocity(sampleTime));
          return (
            <rect
              className="econmath-projection__riemann-rect"
              height={LAB_PLOT.bottom - top}
              key={index}
              width={Math.max(0.8, x(left + width) - x(left))}
              x={x(left)}
              y={top}
            />
          );
        })}
      </g>
      <path className="econmath-projection__curve" d={curve} data-layer="rate-curve" />
      <text className="econmath-projection__annotation" x="94" y="70">{partitions} 段 · {sample}</text>
    </ProjectionFrame>
  );
}

function AccumulationLimitProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const upperBound = projectionNumber(definition, values, "upperBound");
  const velocity = (time: number) => 120 + 24 * time - 3 * time * time;
  const x = (time: number) => projectionScale(time, 0, 8, LAB_PLOT.left, LAB_PLOT.right);
  const y = (rate: number) => projectionScale(rate, 0, 180, LAB_PLOT.bottom, LAB_PLOT.top);
  const curve = projectionPath(Array.from({ length: 81 }, (_, index) => {
    const time = index / 10;
    return [x(time), y(velocity(time))] as const;
  }));
  const areaPoints = upperBound === 0
    ? [[x(0), LAB_PLOT.bottom], [x(0), y(velocity(0))], [x(0), LAB_PLOT.bottom]] as const
    : [
      [x(0), LAB_PLOT.bottom] as const,
      ...Array.from({ length: 41 }, (_, index) => {
        const time = upperBound * index / 40;
        return [x(time), y(velocity(time))] as const;
      }),
      [x(upperBound), LAB_PLOT.bottom] as const
    ];
  return (
    <ProjectionFrame
      description="青色填充是从第0日到当前上限b日的销量率曲线下面积；红色竖线标出移动端点。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", "8"]}
      xLabel="时间 t / 日"
      yDomain={["0", "180"]}
      yLabel="销量率 v(t) / 件·日⁻¹"
    >
      <path className="econmath-projection__area" d={`${projectionPath(areaPoints)} Z`} data-layer="accumulated-area" />
      <path className="econmath-projection__curve" d={curve} data-layer="rate-curve" />
      <line className="econmath-projection__guide" x1={x(upperBound)} x2={x(upperBound)} y1={y(velocity(upperBound))} y2={LAB_PLOT.bottom} />
      <circle className="econmath-projection__point" cx={x(upperBound)} cy={y(velocity(upperBound))} r="9" />
      <text className="econmath-projection__annotation" textAnchor="middle" x={x(upperBound)} y={Math.max(62, y(velocity(upperBound)) - 14)}>b={upperBound.toFixed(2)}</text>
    </ProjectionFrame>
  );
}

function ConsumerSurplusProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const price = projectionNumber(definition, values, "price");
  const quantity = Math.max(0, 1200 - 10 * price);
  const x = (q: number) => projectionScale(q, 0, 1200, LAB_PLOT.left, LAB_PLOT.right);
  const y = (p: number) => projectionScale(p, 0, 125, LAB_PLOT.bottom, LAB_PLOT.top);
  const marketY = y(price);
  return (
    <ProjectionFrame
      description="需求线 p=120-0.1q 与市场价格线相交确定销量；绿色矩形表示收入，青色三角形表示消费者剩余。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", "1200"]}
      xLabel="销量 q / 件"
      yDomain={["0", "125"]}
      yLabel="单位价格 / 元"
    >
      <rect
        className="econmath-projection__revenue-area"
        data-layer="revenue-rectangle"
        height={LAB_PLOT.bottom - marketY}
        width={x(quantity) - x(0)}
        x={x(0)}
        y={marketY}
      />
      <polygon
        className="econmath-projection__surplus-area"
        data-layer="consumer-surplus-triangle"
        points={`${x(0)},${marketY} ${x(0)},${y(120)} ${x(quantity)},${marketY}`}
      />
      <line className="econmath-projection__price-line" x1={x(0)} x2={x(quantity)} y1={marketY} y2={marketY} />
      <path className="econmath-projection__curve" d={projectionPath([[x(0), y(120)], [x(1200), y(0)]])} data-layer="inverse-demand" />
      <circle className="econmath-projection__point" cx={x(quantity)} cy={marketY} r="9" />
      <text className="econmath-projection__annotation" x="94" y={marketY - 10}>p={price.toFixed(0)}</text>
      <text className="econmath-projection__area-label" x={x(quantity) * 0.55 + x(0) * 0.45} y={(marketY + y(120)) / 2}>消费者剩余</text>
      <text className="econmath-projection__area-label" x={x(quantity) * 0.55 + x(0) * 0.45} y={(marketY + LAB_PLOT.bottom) / 2}>收入</text>
    </ProjectionFrame>
  );
}

function MarketingSurfaceProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const price = projectionNumber(definition, values, "price");
  const advertising = projectionNumber(definition, values, "advertising");
  const lockedAxis = projectionText(definition, values, "lockedAxis");
  const x = (p: number) => projectionScale(p, 20, 110, LAB_PLOT.left, LAB_PLOT.right);
  const y = (a: number) => projectionScale(a, 4, 100, LAB_PLOT.bottom, LAB_PLOT.top);
  const levels = [500, 700, 900, 1100];
  const contours = levels.map((level) => {
    const points = Array.from({ length: 181 }, (_, index) => {
      const p = 20 + index * 0.5;
      const numerator = level - 1200 + 8 * p;
      const a = Math.pow(numerator / 24, 2);
      return numerator >= 0 && a >= 4 && a <= 100 ? [x(p), y(a)] as const : null;
    }).filter((point): point is readonly [number, number] => point !== null);
    return { level, points };
  });
  return (
    <ProjectionFrame
      description="输入平面的每条等高线表示相同销量Q；红点是当前价格与广告组合，锁轴时虚线标出保持不变的输入。"
      id={definition.id}
      label={definition.label}
      xDomain={["20", "110"]}
      xLabel="价格 p / 元"
      yDomain={["4", "100"]}
      yLabel="广告投入 a / 千元"
    >
      <g data-layer="response-contours">
        {contours.map(({ level, points }) => (
          <path className="econmath-projection__contour" d={projectionPath(points)} key={level} />
        ))}
      </g>
      {lockedAxis === "price" && <line className="econmath-projection__locked-axis" data-layer="locked-price" x1={x(price)} x2={x(price)} y1={LAB_PLOT.top} y2={LAB_PLOT.bottom} />}
      {lockedAxis === "advertising" && <line className="econmath-projection__locked-axis" data-layer="locked-advertising" x1={LAB_PLOT.left} x2={LAB_PLOT.right} y1={y(advertising)} y2={y(advertising)} />}
      <circle className="econmath-projection__point" cx={x(price)} cy={y(advertising)} data-layer="current-state" r="10" />
      <text className="econmath-projection__annotation" x={Math.min(x(price) + 13, 530)} y={Math.max(y(advertising) - 14, 62)}>({price.toFixed(0)}, {advertising.toFixed(0)})</text>
      <text className="econmath-projection__annotation econmath-projection__annotation--cyan" x="94" y="70">Q=1200−8p+24√a</text>
    </ProjectionFrame>
  );
}

function TangentPlaneErrorProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const basePrice = projectionNumber(definition, values, "basePrice");
  const baseAdvertising = projectionNumber(definition, values, "baseAdvertising");
  const deltaPrice = projectionNumber(definition, values, "deltaPrice");
  const deltaAdvertising = projectionNumber(definition, values, "deltaAdvertising");
  const response = (price: number, advertising: number) => 1200 - 8 * price + 24 * Math.sqrt(advertising);
  const baseResponse = response(basePrice, baseAdvertising);
  const exactAt = (fraction: number) => response(
    basePrice + fraction * deltaPrice,
    baseAdvertising + fraction * deltaAdvertising
  );
  const linearAt = (fraction: number) => baseResponse + fraction * (
    -8 * deltaPrice + (12 / Math.sqrt(baseAdvertising)) * deltaAdvertising
  );
  const exactResponse = exactAt(1);
  const approximateResponse = linearAt(1);
  const spread = Math.max(12, Math.abs(exactResponse - baseResponse), Math.abs(approximateResponse - baseResponse));
  const yMin = Math.min(baseResponse, exactResponse, approximateResponse) - spread * 0.35;
  const yMax = Math.max(baseResponse, exactResponse, approximateResponse) + spread * 0.35;
  const x = (fraction: number) => projectionScale(fraction, 0, 1, LAB_PLOT.left, LAB_PLOT.right);
  const y = (q: number) => projectionScale(q, yMin, yMax, LAB_PLOT.bottom, LAB_PLOT.top);
  const exactCurve = projectionPath(Array.from({ length: 41 }, (_, index) => {
    const fraction = index / 40;
    return [x(fraction), y(exactAt(fraction))] as const;
  }));
  return (
    <ProjectionFrame
      description="从基准方案走向新方案时，青色曲线是原响应模型，红色直线是切平面预测；终点竖向间距为近似误差。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", "1"]}
      xLabel="从基准到新方案的路径比例 λ"
      yDomain={[yMin.toFixed(0), yMax.toFixed(0)]}
      yLabel="预测销量 Q / 件"
    >
      <path className="econmath-projection__curve" d={exactCurve} data-layer="exact-response-path" />
      <line className="econmath-projection__tangent" data-layer="tangent-plane-prediction" x1={x(0)} x2={x(1)} y1={y(baseResponse)} y2={y(approximateResponse)} />
      <circle className="econmath-projection__base-point" cx={x(0)} cy={y(baseResponse)} r="8" />
      <circle className="econmath-projection__point" cx={x(1)} cy={y(exactResponse)} data-layer="exact-value" r="9" />
      <rect className="econmath-projection__estimate-point" height="13" width="13" x={x(1) - 6.5} y={y(approximateResponse) - 6.5} />
      <line className="econmath-projection__error" data-layer="tangent-plane-error" x1={x(1) - 16} x2={x(1) - 16} y1={y(exactResponse)} y2={y(approximateResponse)} />
      <text className="econmath-projection__annotation" textAnchor="end" x={x(1) - 22} y={(y(exactResponse) + y(approximateResponse)) / 2 - 8}>误差</text>
    </ProjectionFrame>
  );
}

function UnconstrainedOptimumProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const currentX = projectionNumber(definition, values, "x");
  const currentY = projectionNumber(definition, values, "y");
  const x = (channelX: number) => projectionScale(channelX, 0, 35, LAB_PLOT.left, LAB_PLOT.right);
  const y = (channelY: number) => projectionScale(channelY, 0, 30, LAB_PLOT.bottom, LAB_PLOT.top);
  const clipId = `${definition.id}-plot-clip`;
  const arrowId = `${definition.id}-gradient-arrow`;
  const gradientMagnitude = Math.hypot(20 - currentX, 15 - currentY);
  const arrowEndX = gradientMagnitude === 0 ? currentX : currentX + (20 - currentX) * Math.min(0.55, 7 / gradientMagnitude);
  const arrowEndY = gradientMagnitude === 0 ? currentY : currentY + (15 - currentY) * Math.min(0.55, 7 / gradientMagnitude);
  return (
    <ProjectionFrame
      description="同心等利润线围绕驻点(20,15)；红点是当前方案，箭头由利润梯度确定并指向更高等利润线。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", "35"]}
      xLabel="渠道强度 x"
      yDomain={["0", "30"]}
      yLabel="渠道强度 y"
    >
      <defs>
        <clipPath id={clipId}><rect height={LAB_PLOT.bottom - LAB_PLOT.top} width={LAB_PLOT.right - LAB_PLOT.left} x={LAB_PLOT.left} y={LAB_PLOT.top} /></clipPath>
        <marker id={arrowId} markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4"><path d="M0 0L8 4L0 8Z" /></marker>
      </defs>
      <g clipPath={`url(#${clipId})`} data-layer="profit-contours">
        {[5, 10, 15, 20].map((radius) => (
          <ellipse
            className="econmath-projection__contour"
            cx={x(20)}
            cy={y(15)}
            key={radius}
            rx={radius / 35 * (LAB_PLOT.right - LAB_PLOT.left)}
            ry={radius / 30 * (LAB_PLOT.bottom - LAB_PLOT.top)}
          />
        ))}
      </g>
      <circle className="econmath-projection__optimum" cx={x(20)} cy={y(15)} data-layer="stationary-point" r="9" />
      {gradientMagnitude > 0.01 && (
        <line
          className="econmath-projection__gradient"
          data-layer="gradient-vector"
          markerEnd={`url(#${arrowId})`}
          x1={x(currentX)}
          x2={x(arrowEndX)}
          y1={y(currentY)}
          y2={y(arrowEndY)}
        />
      )}
      <circle className="econmath-projection__point" cx={x(currentX)} cy={y(currentY)} data-layer="current-state" r="10" />
      <text className="econmath-projection__annotation" x={Math.min(x(currentX) + 13, 535)} y={Math.max(y(currentY) - 14, 62)}>({currentX.toFixed(1)}, {currentY.toFixed(1)})</text>
    </ProjectionFrame>
  );
}

function BudgetConstraintProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const budget = Number(projectionText(definition, values, "budget"));
  const channelX = projectionNumber(definition, values, "channelX");
  const channelY = budget - channelX;
  const x = (amount: number) => projectionScale(amount, 0, budget, LAB_PLOT.left, LAB_PLOT.right);
  const y = (amount: number) => projectionScale(amount, 0, budget, LAB_PLOT.bottom, LAB_PLOT.top);
  const optimumX = budget * 0.64;
  const optimumY = budget * 0.36;
  const maximumResponse = 50 * Math.sqrt(budget);
  const levels = [0.72, 0.86, 1].map((fraction) => fraction * maximumResponse);
  const contours = levels.map((level) => {
    const points = Array.from({ length: 121 }, (_, index) => {
      const amountX = budget * index / 120;
      const remainder = level - 40 * Math.sqrt(amountX);
      const amountY = Math.pow(remainder / 30, 2);
      return remainder >= 0 && amountY >= 0 && amountY <= budget ? [x(amountX), y(amountY)] as const : null;
    }).filter((point): point is readonly [number, number] => point !== null);
    return { level, points };
  });
  const revealOptimum = projectionBoolean(definition, values, "revealOptimum");
  const allocation = (amount: number) => Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  const feasible = channelX >= 0 && channelY >= 0;
  return (
    <ProjectionFrame
      description="直线x+y=B是可行预算线；响应等高线由40√x+30√y给出，红点为当前分配。"
      id={definition.id}
      label={definition.label}
      xDomain={["0", allocation(budget)]}
      xLabel="渠道 x 投入 / 千元"
      yDomain={["0", allocation(budget)]}
      yLabel="渠道 y 投入 / 千元"
    >
      <g data-layer="budget-response-contours">
        {contours.map(({ level, points }) => <path className="econmath-projection__contour" d={projectionPath(points)} key={level} />)}
      </g>
      <line className="econmath-projection__budget-line" data-layer="budget-line" x1={x(0)} x2={x(budget)} y1={y(budget)} y2={y(0)} />
      {feasible ? (
        <>
          <circle className="econmath-projection__point" cx={x(channelX)} cy={y(channelY)} data-layer="current-allocation" r="10" />
          <text className="econmath-projection__annotation" x={Math.min(x(channelX) + 13, 520)} y={Math.max(y(channelY) - 14, 62)}>({allocation(channelX)}, {allocation(channelY)})</text>
        </>
      ) : (
        <text className="econmath-projection__warning" textAnchor="middle" x={(LAB_PLOT.left + LAB_PLOT.right) / 2} y="78">当前分配超出预算线</text>
      )}
      {revealOptimum && (
        <g data-layer="budget-optimum">
          <circle className="econmath-projection__optimum" cx={x(optimumX)} cy={y(optimumY)} r="9" />
          <text className="econmath-projection__annotation" textAnchor="middle" x={x(optimumX)} y={y(optimumY) - 16}>{allocation(optimumX)} / {allocation(optimumY)}</text>
        </g>
      )}
    </ProjectionFrame>
  );
}

function MarketingSectionProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const price = projectionNumber(definition, values, "price");
  const advertising = projectionNumber(definition, values, "advertising");
  const lockedAxis = projectionText(definition, values, "lockedAxis");
  const advertisingSection = lockedAxis === "price";
  const domainMin = advertisingSection ? 4 : 20;
  const domainMax = advertisingSection ? 100 : 110;
  const currentInput = advertisingSection ? advertising : price;
  const responseAt = (input: number) => advertisingSection
    ? 1200 - 8 * price + 24 * Math.sqrt(input)
    : 1200 - 8 * input + 24 * Math.sqrt(advertising);
  const derivative = advertisingSection ? 12 / Math.sqrt(advertising) : -8;
  const endpointValues = [responseAt(domainMin), responseAt(domainMax), responseAt(currentInput)];
  const responseMin = Math.min(...endpointValues) - 35;
  const responseMax = Math.max(...endpointValues) + 35;
  const x = (input: number) => projectionScale(input, domainMin, domainMax, LAB_PLOT.left, LAB_PLOT.right);
  const y = (response: number) => projectionScale(response, responseMin, responseMax, LAB_PLOT.bottom, LAB_PLOT.top);
  const exactPath = projectionPath(Array.from({ length: 121 }, (_, index) => {
    const input = domainMin + (domainMax - domainMin) * index / 120;
    return [x(input), y(responseAt(input))] as const;
  }));
  const tangentAt = (input: number) => responseAt(currentInput) + derivative * (input - currentInput);
  const tangentHalfWidth = (domainMax - domainMin) * 0.2;
  const tangentStart = Math.max(domainMin, currentInput - tangentHalfWidth);
  const tangentEnd = Math.min(domainMax, currentInput + tangentHalfWidth);
  return (
    <ProjectionFrame
      description={advertisingSection
        ? `价格固定在${price.toFixed(0)}元，广告截面按平方根曲线变化；红色切线只在当前投入附近近似。`
        : `广告固定在${advertising.toFixed(0)}千元，价格截面是一条斜率恒为-8的直线；红色切线与截面重合。`}
      id={definition.id}
      label={`${definition.label} · ${advertisingSection ? "广告截面" : "价格截面"}`}
      xDomain={[String(domainMin), String(domainMax)]}
      xLabel={advertisingSection ? "广告投入 a / 千元" : "价格 p / 元"}
      yDomain={[responseMin.toFixed(0), responseMax.toFixed(0)]}
      yLabel="销量响应 Q / 件"
    >
      <path
        className="econmath-projection__curve"
        d={exactPath}
        data-layer={advertisingSection ? "advertising-section" : "price-section"}
      />
      <line
        className="econmath-projection__tangent"
        data-layer="section-tangent"
        x1={x(tangentStart)}
        x2={x(tangentEnd)}
        y1={y(tangentAt(tangentStart))}
        y2={y(tangentAt(tangentEnd))}
      />
      <line className="econmath-projection__guide" x1={x(currentInput)} x2={x(currentInput)} y1={y(responseAt(currentInput))} y2={LAB_PLOT.bottom} />
      <circle className="econmath-projection__point" cx={x(currentInput)} cy={y(responseAt(currentInput))} data-layer="current-state" r="10" />
      <text className="econmath-projection__annotation" x="94" y="70">
        {advertisingSection ? `p=${price.toFixed(0)} 元固定` : `a=${advertising.toFixed(0)} 千元固定`}
      </text>
    </ProjectionFrame>
  );
}

function PriceSectionFamilyProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const currentPrice = projectionNumber(definition, values, "price");
  const currentAdvertising = projectionNumber(definition, values, "advertising");
  const advertisingLevels = [4, 25, 100] as const;
  const response = (price: number, advertising: number) =>
    1200 - 8 * price + 24 * Math.sqrt(advertising);
  const x = (price: number) =>
    projectionScale(price, 20, 110, LAB_PLOT.left, LAB_PLOT.right);
  const y = (quantity: number) =>
    projectionScale(quantity, 360, 1_300, LAB_PLOT.bottom, LAB_PLOT.top);
  return (
    <ProjectionFrame
      description="广告投入分别固定为4、25与100千元时，三条价格截面互相平行，斜率都为负8件每元；这反映当前可加模型没有价格—广告交互项。"
      id={definition.id}
      label={`${definition.label} · 三条平行价格截面`}
      xDomain={["20", "110"]}
      xLabel="价格 p / 元"
      yDomain={["360", "1300"]}
      yLabel="销量响应 Q / 件"
    >
      <g data-layer="price-section-family">
        {advertisingLevels.map((advertising, index) => {
          const path = projectionPath([
            [x(20), y(response(20, advertising))],
            [x(110), y(response(110, advertising))]
          ]);
          return (
            <g key={advertising}>
              <path
                className={index === 1 ? "econmath-projection__curve" : "econmath-projection__contour"}
                d={path}
                data-layer="price-section"
              />
              <text
                className="econmath-projection__annotation"
                x={x(24)}
                y={y(response(24, advertising)) - 9}
              >
                a={advertising}
              </text>
            </g>
          );
        })}
      </g>
      <line
        className="econmath-projection__tangent"
        data-layer="section-tangent"
        x1={x(Math.max(20, currentPrice - 12))}
        x2={x(Math.min(110, currentPrice + 12))}
        y1={y(response(Math.max(20, currentPrice - 12), currentAdvertising))}
        y2={y(response(Math.min(110, currentPrice + 12), currentAdvertising))}
      />
      <circle
        className="econmath-projection__point"
        cx={x(currentPrice)}
        cy={y(response(currentPrice, currentAdvertising))}
        data-layer="current-state"
        r="10"
      />
      <text className="econmath-projection__annotation econmath-projection__annotation--cyan" x="420" y="72">
        三条斜率均为 −8 件/元
      </text>
    </ProjectionFrame>
  );
}

function ShadowPriceProjection({
  definition,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  const budget = Number(projectionText(definition, values, "budget"));
  const shadowValue = (currentBudget: number) => 25 / Math.sqrt(currentBudget);
  const x = (currentBudget: number) => projectionScale(currentBudget, 25, 120, LAB_PLOT.left, LAB_PLOT.right);
  const y = (value: number) => projectionScale(value, 2, 5.5, LAB_PLOT.bottom, LAB_PLOT.top);
  const curve = projectionPath(Array.from({ length: 96 }, (_, index) => {
    const currentBudget = 25 + index;
    return [x(currentBudget), y(shadowValue(currentBudget))] as const;
  }));
  return (
    <ProjectionFrame
      description="预算B增加时，最优总响应的边际值λ(B)=25/√B单调下降；红点为当前预算档位。"
      id={definition.id}
      label="预算影子价值曲线"
      xDomain={["25", "120"]}
      xLabel="总预算 B / 千元"
      yDomain={["2.0", "5.5"]}
      yLabel="λ / 响应单位·千元⁻¹"
    >
      <path className="econmath-projection__curve" d={curve} data-layer="shadow-price-curve" />
      <line className="econmath-projection__guide" x1={x(budget)} x2={x(budget)} y1={y(shadowValue(budget))} y2={LAB_PLOT.bottom} />
      <circle className="econmath-projection__point" cx={x(budget)} cy={y(shadowValue(budget))} data-layer="current-budget" r="10" />
      <text className="econmath-projection__annotation" x={Math.min(x(budget) + 13, 520)} y={Math.max(y(shadowValue(budget)) - 14, 62)}>
        B={budget}，λ={shadowValue(budget).toFixed(3)}
      </text>
    </ProjectionFrame>
  );
}

function AuthoritativeInteractionProjection({
  definition,
  spec,
  values
}: {
  definition: EconomicMathematicsInteractionDefinition;
  spec: EconomicMathematicsSlideSpec;
  values: Readonly<Record<string, SlideInteractionScalar>>;
}) {
  switch (definition.id) {
    case "price-profit-lab":
      return <PriceProfitProjection definition={definition} showElasticity={false} values={values} />;
    case "elasticity-profit-lab":
      return <PriceProfitProjection definition={definition} showElasticity values={values} />;
    case "sequence-limit-lab":
      return <SequenceLimitProjection definition={definition} values={values} />;
    case "continuity-threshold-lab":
      return <ContinuityThresholdProjection definition={definition} values={values} />;
    case "secant-tangent-lab":
      return <SecantTangentProjection definition={definition} values={values} />;
    case "linearization-error-lab":
      return <LinearizationErrorProjection definition={definition} values={values} />;
    case "riemann-sum-lab":
      return <RiemannSumProjection definition={definition} values={values} />;
    case "accumulation-limit-lab":
      return <AccumulationLimitProjection definition={definition} values={values} />;
    case "consumer-surplus-lab":
      return <ConsumerSurplusProjection definition={definition} values={values} />;
    case "marketing-surface-lab": {
      const lockedAxis = projectionText(definition, values, "lockedAxis");
      if (spec.slideKey === "em-l27-20-lab-same-price") {
        return <PriceSectionFamilyProjection definition={definition} values={values} />;
      }
      return spec.lesson === 27 && lockedAxis !== "none"
        ? <MarketingSectionProjection definition={definition} values={values} />
        : <MarketingSurfaceProjection definition={definition} values={values} />;
    }
    case "tangent-plane-lab":
      return <TangentPlaneErrorProjection definition={definition} values={values} />;
    case "unconstrained-optimum-lab":
      return <UnconstrainedOptimumProjection definition={definition} values={values} />;
    case "budget-constraint-lab":
      return spec.slideKey === "em-l32-31-lab-shadow-curve"
        ? <ShadowPriceProjection definition={definition} values={values} />
        : <BudgetConstraintProjection definition={definition} values={values} />;
  }
}

export function isEconomicMathematicsControlDisabled(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, SlideInteractionScalar>>,
  name: string
) {
  if (definition.id !== "marketing-surface-lab") return false;
  const lockedAxis = projectionText(definition, values, "lockedAxis");
  return (name === "price" && lockedAxis === "price") ||
    (name === "advertising" && lockedAxis === "advertising");
}

export function buildEconomicMathematicsControlPatch(
  definition: EconomicMathematicsInteractionDefinition,
  name: string,
  nextValue: SlideInteractionScalar
): SlideInteractionValues {
  if (definition.id !== "continuity-threshold-lab") return { [name]: nextValue };
  if (name === "orderAmount") {
    const orderAmount = Number(nextValue);
    return {
      orderAmount,
      approach: orderAmount < 99 ? "left" : orderAmount > 99 ? "right" : "free"
    };
  }
  if (name === "approach") {
    const approach = String(nextValue);
    return {
      approach,
      orderAmount: approach === "left" ? 98.99 : approach === "right" ? 99.01 : 99
    };
  }
  return { [name]: nextValue };
}

function InteractionLab({
  spec,
  interaction,
  readOnly,
  onPatch,
  onReset
}: {
  spec: EconomicMathematicsSlideSpec;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onPatch?: (patch: SlideInteractionValues) => void;
  onReset?: () => void;
}) {
  const definition = getEconomicMathematicsInteractionDefinition(spec);
  if (!definition) return renderComposition(spec);
  const values = interaction?.values ?? definition.defaults;
  const metrics = calculateLabMetrics(definition, values, spec);
  const revealStep = Boolean(ruleValue(values, definition.defaults, "revealStep"));

  return (
    <div className="econmath-lab">
      <div className="econmath-lab__copy"><CoreCopy spec={spec} /></div>
      <section className="econmath-lab__projection" aria-label={definition.label}>
        <AuthoritativeInteractionProjection definition={definition} spec={spec} values={values} />
        <div className="econmath-lab__headline">{metrics.headline}</div>
        <div className="econmath-lab__metrics">{metrics.metrics.map((metric) => <span key={metric}>{metric}</span>)}</div>
        <p>{revealStep ? metrics.reveal : "结论暂不显示：先记录观察，再由教师分步揭示。"}</p>
      </section>
      <aside className="econmath-lab__controls" aria-label={`${definition.label}控制器`}>
        <div><b>{definition.label}</b><span>{readOnly ? "教师端同步状态" : `revision ${interaction?.revision ?? 1}`}</span></div>
        {readOnly ? (
          <div className="econmath-lab__readonly" aria-label="教师同步参数">
            {Object.keys(definition.rules)
              .filter((name) => !name.startsWith("reveal"))
              .map((name) => <span key={name}>{name} = {String(ruleValue(values, definition.defaults, name))}</span>)}
          </div>
        ) : (
          <>
            {Object.entries(definition.rules)
              .filter(([name]) => !(definition.id === "price-profit-lab" && name === "revealOptimum"))
              .map(([name, rule]) => (
              <InteractionControl
                disabled={isEconomicMathematicsControlDisabled(definition, values, name)}
                key={name}
                name={name}
                onChange={(value) => onPatch?.(buildEconomicMathematicsControlPatch(definition, name, value))}
                rule={rule}
                value={ruleValue(values, definition.defaults, name)}
              />
            ))}
            <LabTeacherTools definition={definition} spec={spec} onPatch={onPatch} onReset={onReset} />
          </>
        )}
      </aside>
    </div>
  );
}

export function EconomicMathematicsTeachingSlides({
  spec,
  interaction,
  readOnly,
  onInteractionPatch,
  onInteractionReset
}: EconomicMathematicsTeachingSlidesProps) {
  if (spec.lesson === 1) {
    return (
      <Lesson01ArtSlides
        interaction={interaction}
        onInteractionPatch={onInteractionPatch}
        onInteractionReset={onInteractionReset}
        readOnly={readOnly}
        spec={spec}
      />
    );
  }
  if (spec.lesson === 2) {
    return (
      <Lesson02ArtSlides
        interaction={interaction}
        onInteractionPatch={onInteractionPatch}
        onInteractionReset={onInteractionReset}
        readOnly={readOnly}
        spec={spec}
      />
    );
  }
  if (spec.lesson === 3) {
    return (
      <Lesson03ArtSlides
        interaction={interaction}
        onInteractionPatch={onInteractionPatch}
        onInteractionReset={onInteractionReset}
        readOnly={readOnly}
        spec={spec}
      />
    );
  }
  if (spec.lesson === 4) {
    return (
      <Lesson04ArtSlides
        interaction={interaction}
        onInteractionPatch={onInteractionPatch}
        onInteractionReset={onInteractionReset}
        readOnly={readOnly}
        spec={spec}
      />
    );
  }
  return (
    <article className={`econmath-slide econmath-slide--${spec.accent}`}>
      <SlideHeader spec={spec} />
      <main className="econmath-slide__stage">
        {spec.interactionId ? (
          <InteractionLab
            interaction={interaction}
            onPatch={onInteractionPatch}
            onReset={onInteractionReset}
            readOnly={readOnly}
            spec={spec}
          />
        ) : renderComposition(spec)}
      </main>
      <SourceFooter spec={spec} />
    </article>
  );
}

export { ECONOMIC_MATHEMATICS_INTERACTIONS };
