export type EconomicMathematicsUnitNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type EconomicMathematicsSlideKind =
  | "scene"
  | "evidence"
  | "question"
  | "definition"
  | "derivation"
  | "worked-example"
  | "exercise"
  | "solution"
  | "error-audit"
  | "interaction"
  | "manager-brief"
  | "transition";

export type EconomicMathematicsVisual =
  | "editorial-scene"
  | "decision-split"
  | "data-ledger"
  | "variable-map"
  | "formula-board"
  | "coordinate-plot"
  | "comparison-board"
  | "worked-grid"
  | "exercise-desk"
  | "error-lens"
  | "model-boundary"
  | "manager-memo"
  | "chapter-bridge"
  | "area-studio"
  | "surface-studio"
  | "optimization-studio";

export type EconomicMathematicsPublicLabel =
  | "教学情境"
  | "概念模型"
  | "自制图形"
  | "公开资料"
  | "教材框架";

export type EconomicMathematicsAccent =
  | "vermilion"
  | "cyan"
  | "green"
  | "amber"
  | "ink";

export type EconomicMathematicsInteractionId =
  | "price-profit-lab"
  | "sequence-limit-lab"
  | "continuity-threshold-lab"
  | "secant-tangent-lab"
  | "linearization-error-lab"
  | "elasticity-profit-lab"
  | "riemann-sum-lab"
  | "accumulation-limit-lab"
  | "consumer-surplus-lab"
  | "marketing-surface-lab"
  | "tangent-plane-lab"
  | "unconstrained-optimum-lab"
  | "budget-constraint-lab";

export interface EconomicMathematicsAuthoredSlide {
  slideKey: string;
  compositionId: string;
  section: string;
  title: string;
  kicker: string;
  kind: EconomicMathematicsSlideKind;
  visual: EconomicMathematicsVisual;
  lead?: string;
  body?: readonly string[];
  formula?: string;
  formulaLabel?: string;
  data?: readonly string[];
  prompt?: string;
  sourceLabel: EconomicMathematicsPublicLabel;
  sourceNote?: string;
  accent: EconomicMathematicsAccent;
  interactionId?: EconomicMathematicsInteractionId;
  teachingCue: string;
  assistantCue: string;
  layout?: "cover" | "story" | "essay" | "split" | "proof" | "plot" | "table" | "exercise" | "lab" | "compare";
  style?: "editorial" | "constructivist" | "cover";
  image?: string;
  imageAlt?: string;
  steps?: readonly EconomicMathematicsRevealStep[];
  plot?: EconomicMathematicsPlot;
  table?: { columns: readonly string[]; rows: readonly (readonly string[])[] };
  interactionDefaults?: Readonly<Record<string, number | string | boolean>>;
  /** Teacher-only pacing metadata; never project or attach to student DOM. */
  classHour?: 1 | 2;
  routeRole?: "core" | "optional";
  teachingSeconds?: number;
  moduleId?: string;
}

export interface EconomicMathematicsRevealStep {
  title: string;
  text?: string;
  formula?: string;
  plot?: EconomicMathematicsPlot;
  highlightRows?: readonly number[];
}

export type EconomicMathematicsCurveModel = "demand" | "profit" | "sequence" | "hole" | "sinc" | "threshold" | "secant" | "linear-error" | "elasticity" | "power" | "log" | "exponential" | "cubic" | "riemann" | "accumulation" | "surplus" | "surface" | "plane" | "profit-contours" | "budget" | "unit-circle" | "exhibition-budget";

export interface EconomicMathematicsPlot {
  model: EconomicMathematicsCurveModel;
  xLabel: string;
  yLabel: string;
  domain?: readonly [number, number];
  params?: Readonly<Record<string, number>>;
}

export interface EconomicMathematicsSlideSpec
  extends EconomicMathematicsAuthoredSlide {
  index: number;
  lesson: number;
  lessonTitle: string;
  unit: EconomicMathematicsUnitNumber;
  unitTitle: string;
  localIndex: number;
  localTotal: number;
}

export interface EconomicMathematicsLessonDefinition {
  number: number;
  unit: EconomicMathematicsUnitNumber;
  unitTitle: string;
  title: string;
  hours: 2;
  expectedSlides: number;
  coreQuestion: string;
  exerciseCapability: string;
  slides: readonly EconomicMathematicsAuthoredSlide[];
  prerequisites?: readonly string[];
  outcomes?: readonly string[];
  route?: readonly { minutes: number; activity: string }[];
  classHours?: readonly { hour: 1 | 2; minutes: 45; slideStart: number; slideEnd: number; activity: string }[];
}

export interface EconomicMathematicsLessonSpec
  extends Omit<EconomicMathematicsLessonDefinition, "slides"> {
  slideStart: number;
  slideEnd: number;
  slideTotal: number;
}

export interface EconomicMathematicsSlidePosition {
  globalIndex: number;
  lessonNumber: number;
  lessonStart: number;
  lessonEnd: number;
  localIndex: number;
  localTotal: number;
}

export function defineEconomicMathematicsLesson(
  lesson: EconomicMathematicsLessonDefinition
): EconomicMathematicsLessonDefinition {
  return lesson;
}
