import { merchantOutcome } from './merchant-model.js';

export const LIMIT_PRICE_DOMAIN = [30, 100] as const;
export function profitAt(price: number): number { return merchantOutcome(price).profit; }
/** Exact quotient on a single branch. Excludes zero, so no numerical cancellation. */
export function profitQuotient(base: 80 | 90, h: number): number {
  if (!Number.isFinite(h) || h === 0 || base + h < 30 || base + h > 100) return NaN;
  if (base === 80 && Math.abs(h) < 1) return h < 0 ? 360 : -160 - 9 * h;
  if (base === 90 && Math.abs(h) < 10) return -340 - 9 * h;
  return (profitAt(base + h) - profitAt(base)) / h;
}
export function squareQuotient(h: number): number { return h === 0 ? NaN : 2 + h; }
export function capacityAt(n: number): number {
  return Number.isInteger(n) && n >= 0 ? 500 - 100 * .8 ** n : NaN;
}
export function capacityGap(n: number): number { return Number.isInteger(n) && n >= 0 ? 100 * .8 ** n : NaN; }
export function earliestCapacityWeek(tolerance: number): number | null {
  if (!(tolerance > 0)) return null;
  for (let n = 0; n < 10000; n++) if (capacityGap(n) < tolerance) return n;
  return null;
}
export function supplierCost(supplier: 'A' | 'B', q: number): number {
  if (!(q > 0 && q <= 10000) || (supplier === 'B' && q < 500)) return NaN;
  return supplier === 'A' ? 5000 + (q < 500 ? 20 : 18) * q : 7000 + 17 * q;
}
/** New unbounded teaching functions, never the actual bounded contract at infinity. */
export function idealAverage(supplier: 'A' | 'B', q: number): number {
  if (!(q >= 500)) return NaN;
  return supplier === 'A' ? 18 + 5000 / q : 17 + 7000 / q;
}
export function exactOscillationSample(family: 0 | 1, n: number): { h: number; value: number } {
  if (!Number.isInteger(n) || n < 1) return { h: NaN, value: NaN };
  return { h: family === 0 ? 1 / n : 1 / (2 * n + .5), value: family };
}
/** Plot residuals directly: adding 1/n to 2 can round to 2 at large n. */
export function reciprocalSequenceError(n: number, candidate: 2 | 2.001 = 2): number {
  if (!Number.isSafeInteger(n) || n < 1) return NaN;
  return 1 / n - (candidate === 2 ? 0 : .001);
}
export function sequenceComparisonValue(family: number, n: number): number {
  if (!Number.isSafeInteger(n) || n < 1) return NaN;
  switch (family) {
    case 1: return 2 + (-1) ** n / n;
    case 2: return (-1) ** n;
    case 3: return n;
    case 4: return -n;
    case 5: return (-1) ** n * n;
    default: return 2 + 1 / n;
  }
}
export function sequenceZoomState(values: Readonly<Record<string, number | string | boolean>>) {
  const precision = Number(values.precision ?? 2), factor = values.epsilonFactor === '5' ? 5 : 1;
  const epsilon = factor * 10 ** -precision;
  const after = 10 ** Number(values.tailPower ?? 2);
  const candidate: 2 | 2.001 = values.candidate === '2.001' ? 2.001 : 2;
  const offset = candidate === 2 ? 0 : .001;
  // For the entire tail, the upper endpoint is attained at after+1 and
  // the lower endpoint -offset is approached but never attained.
  const guaranteed = epsilon >= offset && 1 / (after + 1) < epsilon + offset;
  const requiredN = Math.max(1, Math.ceil(1 / (epsilon + offset)));
  const witness = epsilon < offset
    ? Math.max(after + 1, Math.ceil(2 / (offset - epsilon)))
    : after + 1;
  return { precision, factor, epsilon, after, candidate, guaranteed, requiredN, witness };
}
/** Small nonzero values retain an exponent instead of being formatted as 0. */
export function limitPrecisionLabel(n: number): string {
  if (n === 0) return '0';
  return Math.abs(n) < .0001 || Math.abs(n) >= 1e7
    ? n.toExponential(2).replace('e-', '×10^−').replace('e+', '×10^')
    : n.toLocaleString('zh-CN', { maximumSignificantDigits: 5 });
}
export function limitLabReadout(kind: 'error-band' | 'capacity' | 'sequence-zoom', values: Readonly<Record<string, number | string | boolean>>): readonly [string, string][] {
  const fmt = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  if (kind === 'capacity') {
    const n = Number(values.n ?? 8), epsilon = Number(values.epsilon ?? 10);
    return [['已实施周数', String(n)], ['日能力', fmt(capacityAt(n)) + '件/日'], ['距500的差', fmt(capacityGap(n)) + '件/日'], ['允许差距', fmt(epsilon) + '件/日']];
  }
  if (kind === 'sequence-zoom') {
    const s = sequenceZoomState(values);
    const tail = 'n > ' + s.after.toLocaleString('zh-CN');
    const conclusion = s.guaranteed ? '全尾通过（解析保证）'
      : s.epsilon < (s.candidate === 2 ? 0 : .001) ? '任意晚仍有越界项'
      : '当前尾部未全部通过';
    return [['允许误差ε', limitPrecisionLabel(s.epsilon)], ['编号门槛', tail], ['被检验目标A', String(s.candidate)], ['当前结论', conclusion]];
  }
  const scale = 10 ** -Number(values.zoom ?? 0);
  const epsilon = Number(values.epsilon ?? .2) * scale, delta = Number(values.delta ?? .2) * scale;
  return [['输出允许误差ε', limitPrecisionLabel(epsilon)], ['输入距离范围δ', limitPrecisionLabel(delta)], ['全部非零输入保证', delta <= epsilon ? '成立：δ ≤ ε' : '不成立：δ > ε']];
}
