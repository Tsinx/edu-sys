import type { EconomicMathematicsCurveModel } from "./types.js";

/** These model functions are the single source for static figures and live labs. */
export const economicModels = {
  demand: (p: number, segment = 0) => segment === 0 ? 1200 - 10 * p : 900 - 6 * p,
  profit: (p: number, segment = 0) => (p - 20) * (segment === 0 ? 1200 - 10 * p : 900 - 6 * p) - 2000,
  sequence: (n: number) => 120 - 60 / n,
  sinc: (x: number) => x === 0 ? 1 : Math.sin(x) / x,
  threshold: (s: number) => s < 99 ? s + 8 : s,
  rate: (t: number) => 120 + 24 * t - 3 * t * t,
  accumulated: (t: number) => 120 * t + 12 * t * t - t * t * t,
  response: (p: number, a: number) => 1200 - 8 * p + 24 * Math.sqrt(a),
  responsePlane: (p: number, a: number, p0: number, a0: number) => 1200 - 8 * p0 + 24 * Math.sqrt(a0) - 8 * (p - p0) + 12 / Math.sqrt(a0) * (a - a0),
  twoInputProfit: (x: number, y: number) => 40 * x + 30 * y - x * x - y * y - 100,
  budgetResponse: (x: number, budget: number) => 40 * Math.sqrt(x) + 30 * Math.sqrt(Math.max(0, budget - x)),
  budgetOptimum: (budget: number) => ({ x: .64 * budget, y: .36 * budget, value: 50 * Math.sqrt(budget) }),
  exhibitionUtility: (x: number, y: number) => 12*x+10*y-x*x-y*y,
  consumerSurplus: (p: number) => .5 * (120 - p) * (1200 - 10 * p),
  elasticity: (p: number, segment = 0) => (segment === 0 ? 10 : 6) * p / (segment === 0 ? 1200 - 10 * p : 900 - 6 * p)
};

export function economicCurve(model: EconomicMathematicsCurveModel, x: number, p: Readonly<Record<string,number>> = {}): number {
  switch(model) {
    case "demand": return economicModels.demand(x,p.segment);
    case "profit": case "secant": case "linear-error": return economicModels.profit(x,p.segment);
    case "sequence": return economicModels.sequence(x);
    case "hole": return x === 1 ? NaN : x + 1;
    case "sinc": return economicModels.sinc(x);
    case "threshold": return economicModels.threshold(x);
    case "elasticity": return economicModels.elasticity(x,p.segment);
    case "power": return Math.pow(x,p.exponent ?? 2);
    case "log": return Math.log(x);
    case "exponential": return Math.exp(x);
    case "cubic": return x*x*x - 3*x*x + 4*x;
    case "riemann": return economicModels.rate(x);
    case "accumulation": return economicModels.accumulated(x);
    case "surplus": return 120 - .1*x;
    case "budget": return economicModels.budgetResponse(x,p.budget ?? 100);
    case "exhibition-budget": return economicModels.exhibitionUtility(x,(p.budget??12)-2*x);
    case "surface": case "plane": return p.section === 2 ? economicModels.response(p.price ?? 60,x) : economicModels.response(x,p.advertising ?? 25);
    case "profit-contours": return economicModels.twoInputProfit(x,p.y ?? 15);
    case "unit-circle": return Math.sqrt(Math.max(0,1-x*x));
  }
}

export const economicDomains: Record<EconomicMathematicsCurveModel, readonly [number,number]> = {
  demand:[20,110],profit:[20,110],sequence:[1,40],hole:[0,4],sinc:[-3,3],threshold:[90,108],secant:[30,100],"linear-error":[30,100],elasticity:[20,110],power:[0,4],log:[.1,4],exponential:[-2,2],cubic:[-2,2],riemann:[0,8],accumulation:[0,8],surplus:[0,1200],surface:[20,110],plane:[20,110],"profit-contours":[0,35],budget:[0,100],"unit-circle":[0,1],"exhibition-budget":[0,6]
};
