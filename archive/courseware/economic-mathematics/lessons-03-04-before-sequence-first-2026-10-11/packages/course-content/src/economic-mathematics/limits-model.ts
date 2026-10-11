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
export function limitLabReadout(kind: 'error-band' | 'capacity', values: Readonly<Record<string, number | string | boolean>>): readonly [string, string][] {
  const fmt = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  if (kind === 'capacity') {
    const n = Number(values.n ?? 8), epsilon = Number(values.epsilon ?? 10);
    return [['已实施周数', String(n)], ['日能力', fmt(capacityAt(n)) + '件/日'], ['距500的差', fmt(capacityGap(n)) + '件/日'], ['允许差距', fmt(epsilon) + '件/日']];
  }
  const epsilon = Number(values.epsilon ?? .2), delta = Number(values.delta ?? .2);
  return [['输出允许误差', fmt(epsilon)], ['输入距离范围', fmt(delta)], ['全部非零输入保证', delta <= epsilon ? '成立：δ ≤ ε' : '不成立：δ > ε']];
}
