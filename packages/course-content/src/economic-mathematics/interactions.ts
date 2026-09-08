import type {
  EconomicMathematicsInteractionId,
  EconomicMathematicsSlideSpec
} from "./types.js";

export type EconomicMathematicsInteractionScalar = number | boolean | string;

export type EconomicMathematicsInteractionRule =
  | {
      type: "number";
      min: number;
      max: number;
      step?: number;
      integer?: boolean;
    }
  | { type: "boolean" }
  | { type: "enum"; values: readonly string[] };

export interface EconomicMathematicsInteractionDefinition {
  id: EconomicMathematicsInteractionId;
  label: string;
  defaults: Readonly<Record<string, EconomicMathematicsInteractionScalar>>;
  rules: Readonly<Record<string, EconomicMathematicsInteractionRule>>;
}

const numberRule = (
  min: number,
  max: number,
  step?: number,
  integer = false
): EconomicMathematicsInteractionRule => ({
  type: "number",
  min,
  max,
  ...(step === undefined ? {} : { step }),
  ...(integer ? { integer: true } : {})
});

export const ECONOMIC_MATHEMATICS_INTERACTIONS: Readonly<
  Record<EconomicMathematicsInteractionId, EconomicMathematicsInteractionDefinition>
> = {
  "price-profit-lab": {
    id: "price-profit-lab",
    label: "价格—销量—收益—利润联动台",
    defaults: { price: 50, segment: "A", revealStep: false },
    rules: {
      price: numberRule(20, 110, 1),
      segment: { type: "enum", values: ["A", "B"] },
      revealStep: { type: "boolean" }
    }
  },
  "sequence-limit-lab": {
    id: "sequence-limit-lab",
    label: "数列趋近与容忍带",
    defaults: { n: 1, epsilon: "2", revealStep: false },
    rules: {
      n: numberRule(0, 24, 1, true),
      epsilon: { type: "enum", values: ["5", "2", "1", "0.5", "0.2"] },
      revealStep: { type: "boolean" }
    }
  },
  "continuity-threshold-lab": {
    id: "continuity-threshold-lab",
    label: "优惠门槛左右逼近",
    defaults: { orderAmount: 97, approach: "left", revealStep: false },
    rules: {
      orderAmount: numberRule(94, 104, 0.01),
      approach: { type: "enum", values: ["left", "right", "free"] },
      revealStep: { type: "boolean" }
    }
  },
  "secant-tangent-lab": {
    id: "secant-tangent-lab",
    label: "割线收缩为切线",
    defaults: { basePrice: 50, h: 12, revealStep: false },
    rules: {
      basePrice: numberRule(25, 95, 1),
      h: numberRule(-20, 20, 0.1),
      revealStep: { type: "boolean" }
    }
  },
  "linearization-error-lab": {
    id: "linearization-error-lab",
    label: "局部线性近似误差",
    defaults: { basePrice: 50, deltaPrice: 1, revealStep: false },
    rules: {
      basePrice: numberRule(30, 80, 1),
      deltaPrice: numberRule(-5, 5, 0.25),
      revealStep: { type: "boolean" }
    }
  },
  "elasticity-profit-lab": {
    id: "elasticity-profit-lab",
    label: "客群弹性与利润",
    defaults: { price: 50, segment: "A", revealOptimum: false, revealStep: false },
    rules: {
      price: numberRule(20, 110, 1),
      segment: { type: "enum", values: ["A", "B"] },
      revealOptimum: { type: "boolean" },
      revealStep: { type: "boolean" }
    }
  },
  "riemann-sum-lab": {
    id: "riemann-sum-lab",
    label: "黎曼和累计销量",
    defaults: { partitions: "4", sample: "left", revealStep: false },
    rules: {
      partitions: { type: "enum", values: ["2", "4", "8", "16", "32", "64"] },
      sample: { type: "enum", values: ["left", "right", "midpoint"] },
      revealStep: { type: "boolean" }
    }
  },
  "accumulation-limit-lab": {
    id: "accumulation-limit-lab",
    label: "移动上限与累计函数",
    defaults: { upperBound: 2, revealStep: false },
    rules: {
      upperBound: numberRule(0, 8, 0.25),
      revealStep: { type: "boolean" }
    }
  },
  "consumer-surplus-lab": {
    id: "consumer-surplus-lab",
    label: "价格、收入与消费者剩余",
    defaults: { price: 60, revealStep: false },
    rules: {
      price: numberRule(20, 110, 1),
      revealStep: { type: "boolean" }
    }
  },
  "marketing-surface-lab": {
    id: "marketing-surface-lab",
    label: "价格—广告响应曲面",
    defaults: { price: 50, advertising: 25, lockedAxis: "none", revealStep: false },
    rules: {
      price: numberRule(20, 110, 1),
      advertising: numberRule(4, 100, 1),
      lockedAxis: { type: "enum", values: ["none", "price", "advertising"] },
      revealStep: { type: "boolean" }
    }
  },
  "tangent-plane-lab": {
    id: "tangent-plane-lab",
    label: "全微分与切平面近似",
    defaults: { basePrice: 50, baseAdvertising: 25, deltaPrice: 1, deltaAdvertising: 2, revealStep: false },
    rules: {
      basePrice: numberRule(30, 100, 1),
      baseAdvertising: numberRule(25, 100, 1),
      deltaPrice: numberRule(-10, 10, 0.5),
      deltaAdvertising: numberRule(-24, 25, 0.5),
      revealStep: { type: "boolean" }
    }
  },
  "unconstrained-optimum-lab": {
    id: "unconstrained-optimum-lab",
    label: "二元利润等高线寻优",
    defaults: { x: 8, y: 8, revealClassification: false, revealStep: false },
    rules: {
      x: numberRule(0, 35, 0.5),
      y: numberRule(0, 30, 0.5),
      revealClassification: { type: "boolean" },
      revealStep: { type: "boolean" }
    }
  },
  "budget-constraint-lab": {
    id: "budget-constraint-lab",
    label: "预算线上的渠道分配",
    defaults: { budget: "100", channelX: 50, revealOptimum: false, revealStep: false },
    rules: {
      budget: { type: "enum", values: ["25", "80", "100", "120"] },
      channelX: numberRule(0, 120, 0.1),
      revealOptimum: { type: "boolean" },
      revealStep: { type: "boolean" }
    }
  }
};

export const ECONOMIC_MATHEMATICS_SLIDE_INTERACTION_DEFAULTS: Readonly<
  Record<string, Readonly<Record<string, EconomicMathematicsInteractionScalar>>>
> = {
  "em-l02-s26": { price: 30, segment: "A", revealStep: false },
  "em-l03-s20": { n: 1, epsilon: "2", revealStep: false },
  "em-l06-s09": { orderAmount: 98.99, approach: "left", revealStep: false },
  "em-l07-s23": { basePrice: 50, h: 10, revealStep: false },
  "econ-math-l11-26": { basePrice: 50, deltaPrice: 0, revealStep: false },
  "econ-math-l16-26": { price: 50, segment: "A", revealOptimum: false, revealStep: false },
  "econ-math-l21-31": { partitions: "4", sample: "left", revealStep: false },
  "em-l22-20-interaction-brief": { upperBound: 0, revealStep: false },
  "em-l22-21-interaction-early": { upperBound: 2, revealStep: true },
  "em-l22-22-interaction-peak-rate": { upperBound: 4, revealStep: true },
  "em-l22-23-interaction-late": { upperBound: 8, revealStep: true },
  "em-l22-24-slope-identity": { upperBound: 4, revealStep: true },
  "em-l25-16-lab-intro": { price: 60, revealStep: false },
  "em-l25-17-lab-baseline": { price: 60, revealStep: true },
  "em-l25-18-lab-lower-price": { price: 50, revealStep: true },
  "em-l25-19-lab-difference": { price: 50, revealStep: true },
  "em-l25-20-lab-higher-price": { price: 70, revealStep: true },
  "em-l25-23-lab-predict-revenue": { price: 50, revealStep: false },
  "em-l25-24-lab-revenue-peak": { price: 60, revealStep: true },
  "em-l26-19-lab-intro": { price: 60, advertising: 25, lockedAxis: "none", revealStep: false },
  "em-l26-20-lab-baseline": { price: 60, advertising: 25, lockedAxis: "none", revealStep: true },
  "em-l26-21-lab-price-move": { price: 55, advertising: 25, lockedAxis: "advertising", revealStep: true },
  "em-l26-22-lab-ad-move": { price: 60, advertising: 36, lockedAxis: "price", revealStep: true },
  "em-l26-23-lab-compensation": { price: 51, advertising: 4, lockedAxis: "none", revealStep: true },
  "em-l26-24-lab-paths": { price: 55, advertising: 36, lockedAxis: "none", revealStep: true },
  "em-l27-15-lab-intro": { price: 60, advertising: 25, lockedAxis: "none", revealStep: false },
  "em-l27-16-lab-baseline": { price: 60, advertising: 25, lockedAxis: "none", revealStep: true },
  "em-l27-17-lab-price-nudge": { price: 61, advertising: 25, lockedAxis: "advertising", revealStep: true },
  "em-l27-18-lab-ad-nudge": { price: 60, advertising: 26, lockedAxis: "price", revealStep: true },
  "em-l27-19-lab-ad-levels": { price: 60, advertising: 4, lockedAxis: "price", revealStep: true },
  "em-l27-20-lab-same-price": { price: 60, advertising: 4, lockedAxis: "price", revealStep: true },
  "em-l27-21-lab-predict": { price: 60, advertising: 64, lockedAxis: "price", revealStep: false },
  "em-l27-22-lab-verify": { price: 60, advertising: 64, lockedAxis: "price", revealStep: true },
  "em-l28-17-lab-intro": { basePrice: 60, baseAdvertising: 25, deltaPrice: 0, deltaAdvertising: 0, revealStep: false },
  "em-l28-18-lab-touch-point": { basePrice: 60, baseAdvertising: 25, deltaPrice: 0, deltaAdvertising: 0, revealStep: true },
  "em-l28-19-lab-price-only": { basePrice: 60, baseAdvertising: 25, deltaPrice: 5, deltaAdvertising: 0, revealStep: true },
  "em-l28-20-lab-ad-only": { basePrice: 60, baseAdvertising: 25, deltaPrice: 0, deltaAdvertising: 4, revealStep: true },
  "em-l28-21-lab-both": { basePrice: 60, baseAdvertising: 25, deltaPrice: 2, deltaAdvertising: 4, revealStep: true },
  "em-l28-22-lab-error-surface": { basePrice: 60, baseAdvertising: 25, deltaPrice: 2, deltaAdvertising: 4, revealStep: true },
  "em-l28-23-lab-small-step": { basePrice: 60, baseAdvertising: 25, deltaPrice: 0.5, deltaAdvertising: 1, revealStep: true },
  "em-l28-24-lab-large-step": { basePrice: 60, baseAdvertising: 25, deltaPrice: 10, deltaAdvertising: 25, revealStep: true },
  "em-l28-25-lab-rule": { basePrice: 60, baseAdvertising: 25, deltaPrice: 2, deltaAdvertising: 4, revealStep: true },
  "em-l30-20-lab-intro": { x: 10, y: 10, revealClassification: false, revealStep: false },
  "em-l30-21-lab-start": { x: 10, y: 10, revealClassification: false, revealStep: true },
  "em-l30-22-lab-gradient-step": { x: 15, y: 12.5, revealClassification: false, revealStep: false },
  "em-l30-23-lab-optimum": { x: 20, y: 15, revealClassification: true, revealStep: true },
  "em-l30-24-lab-flatness": { x: 20, y: 15, revealClassification: true, revealStep: true },
  "em-l30-25-lab-overshoot": { x: 30, y: 20, revealClassification: true, revealStep: true },
  "em-l30-26-lab-loss-radius": { x: 30, y: 15, revealClassification: true, revealStep: true },
  "em-l30-27-lab-boundary": { x: 35, y: 30, revealClassification: true, revealStep: true },
  "em-l31-21-lab-intro": { budget: "100", channelX: 50, revealOptimum: false, revealStep: false },
  "em-l31-22-lab-equal-split": { budget: "100", channelX: 50, revealOptimum: false, revealStep: true },
  "em-l31-23-lab-transfer": { budget: "100", channelX: 58, revealOptimum: false, revealStep: false },
  "em-l31-24-lab-optimum": { budget: "100", channelX: 64, revealOptimum: true, revealStep: true },
  "em-l31-25-lab-tangency": { budget: "100", channelX: 64, revealOptimum: true, revealStep: true },
  "em-l31-26-lab-endpoints": { budget: "100", channelX: 100, revealOptimum: false, revealStep: true },
  "em-l31-27-lab-budget-eighty": { budget: "80", channelX: 51.2, revealOptimum: true, revealStep: true },
  "em-l31-28-lab-budget-one-twenty": { budget: "120", channelX: 76.8, revealOptimum: true, revealStep: true },
  "em-l32-25-lab-intro": { budget: "80", channelX: 40, revealOptimum: false, revealStep: false },
  "em-l32-26-lab-eighty": { budget: "80", channelX: 51.2, revealOptimum: true, revealStep: true },
  "em-l32-27-lab-hundred": { budget: "100", channelX: 64, revealOptimum: true, revealStep: true },
  "em-l32-28-lab-one-twenty": { budget: "120", channelX: 76.8, revealOptimum: true, revealStep: true },
  "em-l32-29-lab-scenario-table": { budget: "100", channelX: 64, revealOptimum: true, revealStep: true },
  "em-l32-30-lab-share": { budget: "100", channelX: 64, revealOptimum: true, revealStep: true },
  "em-l32-31-lab-shadow-curve": { budget: "80", channelX: 51.2, revealOptimum: true, revealStep: true },
  "em-l32-32-lab-small-budget": { budget: "25", channelX: 16, revealOptimum: true, revealStep: true }
};

export function getEconomicMathematicsInteractionDefinition(
  slide: Pick<EconomicMathematicsSlideSpec, "interactionId" | "slideKey">
): EconomicMathematicsInteractionDefinition | null {
  if (!slide.interactionId) return null;
  const definition = ECONOMIC_MATHEMATICS_INTERACTIONS[slide.interactionId];
  const defaults = ECONOMIC_MATHEMATICS_SLIDE_INTERACTION_DEFAULTS[slide.slideKey];
  if (!defaults) {
    throw new Error(`ECONOMIC_MATHEMATICS_INTERACTION_DEFAULTS_MISSING:${slide.slideKey}`);
  }
  return { ...definition, defaults };
}

export function validateEconomicMathematicsInteractionValues(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, EconomicMathematicsInteractionScalar>>
): boolean {
  const entries = Object.entries(values);
  if (
    entries.some(
      ([key]) => !Object.prototype.hasOwnProperty.call(definition.rules, key)
    )
  ) return false;

  return entries.every(([key, value]) => {
    const rule = definition.rules[key];
    if (!rule) return false;
    if (rule.type === "boolean") return typeof value === "boolean";
    if (rule.type === "enum") {
      return typeof value === "string" && rule.values.includes(value);
    }
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < rule.min ||
      value > rule.max ||
      (rule.integer && !Number.isInteger(value))
    ) {
      return false;
    }
    if (rule.step === undefined) return true;
    const offset = (value - rule.min) / rule.step;
    return Math.abs(offset - Math.round(offset)) < 1e-8;
  });
}

export function validateEconomicMathematicsInteractionState(
  definition: EconomicMathematicsInteractionDefinition,
  values: Readonly<Record<string, EconomicMathematicsInteractionScalar>>
): boolean {
  if (
    Object.keys(definition.rules).some(
      (key) => !Object.prototype.hasOwnProperty.call(values, key)
    ) ||
    !validateEconomicMathematicsInteractionValues(definition, values)
  ) {
    return false;
  }

  if (definition.id === "tangent-plane-lab") {
    const baseAdvertising = values.baseAdvertising;
    const deltaAdvertising = values.deltaAdvertising;
    return (
      typeof baseAdvertising === "number" &&
      typeof deltaAdvertising === "number" &&
      baseAdvertising + deltaAdvertising > 0
    );
  }

  if (definition.id === "continuity-threshold-lab") {
    const orderAmount = values.orderAmount;
    const approach = values.approach;
    return (
      typeof orderAmount === "number" &&
      typeof approach === "string" &&
      (approach === "free" ||
        (approach === "left" && orderAmount < 99) ||
        (approach === "right" && orderAmount > 99))
    );
  }

  if (definition.id === "budget-constraint-lab") {
    const budget = Number(values.budget);
    const channelX = values.channelX;
    return (
      Number.isFinite(budget) &&
      typeof channelX === "number" &&
      channelX <= budget
    );
  }

  return true;
}
