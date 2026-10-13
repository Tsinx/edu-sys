/** Hypothetical one-day, uniform-price merchant model. Costs follow fulfilled units. */
export interface MerchantParameters { intercept: number; slope: number; capacity: number; commission: number; unitCost: number; fixedCost: number }
export const MERCHANT_BASE: Readonly<MerchantParameters> = { intercept: 1200, slope: 10, capacity: 400, commission: .1, unitCost: 20, fixedCost: 2000 };
export const MERCHANT_TRANSFER: Readonly<MerchantParameters> = { intercept: 1000, slope: 8, capacity: 320, commission: .15, unitCost: 30, fixedCost: 1500 };
export function merchantOutcome(price: number, parameters: Partial<MerchantParameters> = {}) {
  const p = { ...MERCHANT_BASE, ...parameters };
  const demand = p.intercept - p.slope * price;
  const sales = Math.min(demand, p.capacity);
  const revenue = price * sales, fee = p.commission * revenue, cost = p.fixedCost + p.unitCost * sales;
  return { price, demand, sales, revenue, fee, cost, profit: revenue - fee - cost };
}
export function merchantGridOptimum(parameters: Partial<MerchantParameters> = {}, min = 30, max = 100) {
  let best = merchantOutcome(min, parameters);
  for (let price = min + .5; price <= max; price += .5) { const candidate = merchantOutcome(price, parameters); if (candidate.profit > best.profit) best = candidate; }
  return best;
}
/** Three finite restrictions of the same demand/sales model; the codomain is explicit. */
const examplePrices = [50, 60, 80];
const exampleDemand = examplePrices.map(p => merchantOutcome(p).demand);
export const MERCHANT_MAPPING_EXAMPLES = [
  { label: '价格 → 需求 D', domain: examplePrices, codomain: [...exampleDemand, 1000], images: exampleDemand },
  { label: '价格 → 销量 S', domain: examplePrices, codomain: [400] as readonly number[], images: examplePrices.map(p => merchantOutcome(p).sales) },
  { label: '价格 → 需求 D', domain: examplePrices, codomain: exampleDemand, images: exampleDemand }
] as const;
export function classifyFiniteMapping(domain: readonly number[], codomain: readonly number[], images: readonly number[]) {
  const mapping = domain.length > 0 && codomain.length > 0 && new Set(domain).size === domain.length
    && new Set(codomain).size === codomain.length && images.length === domain.length && images.every(y => codomain.includes(y));
  const injective = mapping && new Set(images).size === domain.length;
  const surjective = mapping && codomain.every(y => images.includes(y));
  return { mapping, injective, surjective, bijective: injective && surjective };
}
export function merchantReadout(values: Readonly<Record<string, number | string | boolean>>): readonly [string, string][] {
  const r = merchantOutcome(Number(values.price ?? 80), { capacity: Number(values.capacity ?? 400), commission: Number(values.commission ?? .1), fixedCost: Number(values.fixedCost ?? 2000), unitCost: 20 });
  const f = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  return [['单价', f(r.price) + '元/件'], ['需求', f(r.demand) + '件/日'], ['实销量', f(r.sales) + '件/日'], ['收入', f(r.revenue) + '元/日'], ['平台抽成', f(r.fee) + '元/日'], ['经营成本', f(r.cost) + '元/日'], ['利润', f(r.profit) + '元/日']];
}
