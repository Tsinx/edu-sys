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
  id: EconomicMathematicsInteractionId | "presentation";
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
      n: numberRule(1, 400, 1, true),
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
      deltaPrice: numberRule(-15, 15, 0.25),
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

export function getEconomicMathematicsInteractionDefinition(
  slide: Pick<EconomicMathematicsSlideSpec, "interactionId" | "slideKey" | "steps" | "interactionDefaults" | "merchantLab">
): EconomicMathematicsInteractionDefinition | null {
  if (!slide.interactionId && !slide.steps?.length) return null;
  const definition: EconomicMathematicsInteractionDefinition = slide.merchantLab ? {
    id: 'price-profit-lab', label: '有限履约能力下的定价实验',
    defaults: { price: 80, capacity: 400, commission: .1, fixedCost: 2000 },
    rules: { price: numberRule(30,100,.5), capacity: numberRule(200,600,10), commission: numberRule(0,.6,.05), fixedCost: numberRule(0,24000,500) }
  } : slide.interactionId ? ECONOMIC_MATHEMATICS_INTERACTIONS[slide.interactionId] : {id: "presentation" as const, label: "分步展示", defaults: {}, rules: {}};
  return {...definition, defaults: {...definition.defaults, ...slide.interactionDefaults, presentationStep: 0}, rules: {...definition.rules, presentationStep: numberRule(0, slide.steps?.length ?? 0, 1, true)}};
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
