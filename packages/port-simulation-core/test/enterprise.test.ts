import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnterprise, executeEnterprise, assertEnterprise, enterpriseRecord, restoreEnterprise, enterpriseHash, enterpriseView, makeEnterprisePackage, verifyEnterprisePackage, enterpriseScore, nextQuarterHour, type EnterpriseState } from '../src/enterprise.js';
import { assetSpec } from '../src/enterprise-catalogue.js';
import { leaseDeliveryHour } from '../src/enterprise-support.js';
const act = (s: EnterpriseState, c: Parameters<typeof executeEnterprise>[1]) => { const next = executeEnterprise(s, c); assert.equal(next.journal.at(-1)?.ok, true, next.journal.at(-1)?.message ?? 'missing result'); return next; };
test('calendar, single-player initial state, and public view hide actual future arrivals', () => {
  const s = createEnterprise(); assert.equal(s.horizon, 1096 * 24); assert.equal(nextQuarterHour(0), 90 * 24);
  const v = enterpriseView(s); assert.equal(v.terminals.length, 7); assert.equal(new Set(s.assets.map(a => a.model)).size > 20, true);
  assert.ok(v.calls.every(c => !Object.hasOwn(c, 'arrival') && !Object.hasOwn(c, 'issue')));
  assert.equal(Object.hasOwn(s, 'teamId'), false);
});
test('hourly cargo, cash, capacity and replay remain consistent across batching', () => {
  let a = act(createEnterprise(), { kind: 'policy', patch: { verifiedExceptions: true } });
  let b = structuredClone(a); a = act(a, { kind: 'advance', hours: 72 });
  for (let n = 0; n < 3; n++) b = act(b, { kind: 'advance', hours: 24 });
  assert.equal(enterpriseHash(a), enterpriseHash(b)); assertEnterprise(a);
  assert.ok(a.stats.delivered > 0); assert.ok(a.stats.departed > 0);
  const restored = restoreEnterprise(enterpriseRecord(a)); assert.equal(enterpriseHash(restored), enterpriseHash(a));
});
test('asset orders consume capital once, respect delivery and interface dependencies', () => {
  let s = createEnterprise(), cash = s.cash;
  s = act(s, { kind: 'order-asset', model: 'agv', terminalId: 'T1', ownership: 'owned' });
  assert.equal(s.cash, cash - 1900000); const id = s.assets.at(-1)!.id;
  s = act(s, { kind: 'advance', hours: 61 * 24 }); assert.equal(s.assets.find(a => a.id === id)!.status, 'commissioning');
  s = act(s, { kind: 'project', type: 'automation', terminalId: 'T1' });
  assert.equal(s.projects.at(-1)!.status, 'building');
  assertEnterprise(s);
});
test('rejected commands preserve business state and retain the rejected input', () => {
  const s = createEnterprise(), before = enterpriseHash(s);
  const rejected = executeEnterprise(s, { kind: 'order-asset', model: 'liquid-arm', terminalId: 'T1', ownership: 'owned' });
  assert.equal(rejected.journal.at(-1)!.ok, false); assert.equal(enterpriseHash(rejected), before); assert.equal(s.journal.length, 0);
  assert.throws(() => restoreEnterprise({ ...enterpriseRecord(s), rules: { engine: 'newest' } }), /版本/);
  assert.throws(() => executeEnterprise(s, { kind: 'policy', patch: { tariff: NaN } }), /指令/);
});
test('training, berth incompatibility and inspection enforce actual prerequisites', () => {
  let s = act(createEnterprise(), { kind: 'train', crewId: 'crew-driver-0' });
  assert.ok(s.crews.find(c => c.id === 'crew-driver-0')!.trainingUntil > 0);
  const assigned = executeEnterprise(s, { kind: 'staff', crewId: 'crew-driver-0', shift: 2 }); assert.equal(assigned.journal.at(-1)!.ok, false);
  const call = s.calls.find(c => c.goods === 'container')!;
  s = executeEnterprise(s, { kind: 'berth', callId: call.id, terminalId: 'T4' }); assert.equal(s.journal.at(-1)!.ok, false);
});
test('lease prepayment is consumed once and offsets the actual exit settlement', () => {
  let s = createEnterprise();
  const spec = assetSpec('diesel-tractor'), cash = s.cash;
  s = act(s, { kind: 'order-asset', model: spec.id, terminalId: 'T1', ownership: 'leased' });
  const id = s.assets.at(-1)!.id, prepaid = 30 * spec.leaseDaily;
  assert.equal(s.cash, cash - prepaid);
  assert.equal(s.months[0]!.operating, 0);
  assert.equal(enterpriseScore(s).prepaidLease, prepaid);
  s = act(s, { kind: 'advance', hours: spec.leadDays * 24 + 12 });
  const a = s.assets.find(a => a.id === id)!;
  assert.ok(a.leaseCredit < prepaid && a.leaseCredit > 0);
  assert.equal(s.ledger.filter(e => e.category === 'lease').reduce((n, e) => n + e.cash, 0), 0);
  // Use a second not-yet-delivered lease to isolate the settlement from production.
  s = act(s, { kind: 'order-asset', model: spec.id, terminalId: 'T1', ownership: 'leased' });
  const second = s.assets.at(-1)!.id, beforeExit = s.cash;
  s = act(s, { kind: 'dispose', assetId: second });
  assert.equal(s.cash, beforeExit - spec.leaseDaily * 90 + prepaid);
  assert.equal(s.assets.find(a => a.id === second)!.leaseCredit, 0);
  assert.equal(executeEnterprise(s, { kind: 'dispose', assetId: second }).journal.at(-1)!.ok, false);
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))), enterpriseHash(s));
});
test('asset relocation preserves the original depreciation clock', () => {
  let s = createEnterprise();
  const a = s.assets.find(a => a.terminalId === 'T1' && a.model === 'rtg')!;
  const commissioned = a.commissionedHour;
  s = act(s, { kind: 'assign-asset', assetId: a.id, terminalId: 'T2' });
  s = act(s, { kind: 'advance', hours: 10 });
  assert.equal(s.assets.find(x => x.id === a.id)!.commissionedHour, commissioned);
  assert.ok(enterpriseView(s).assetBooks[a.id]! < a.bookAtStart);
});
test('shift decisions change actual deliveries and preserve finite physical buffers', () => {
  let baseline = act(createEnterprise(), { kind: 'policy', patch: { verifiedExceptions: true } });
  let shortage = structuredClone(baseline);
  for (const crew of shortage.crews.filter(c => c.role === 'driver')) shortage = act(shortage, { kind: 'staff', crewId: crew.id, shift: 'reserve' });
  baseline = act(baseline, { kind: 'advance', hours: 120 });
  shortage = act(shortage, { kind: 'advance', hours: 120 });
  const delivery = (s: EnterpriseState) => enterpriseView(s).goods.find(g => g.kind === 'container')!.delivered;
  assert.ok(delivery(baseline) > 0);
  assert.equal(delivery(shortage), 0);
  assert.ok(shortage.lots.some(l => l.apron > 0 || l.ship > 0));
  assertEnterprise(shortage);
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(shortage))), enterpriseHash(shortage));
});
test('lease transfer keeps billing through reacceptance and preserves the original responsibility period', () => {
  let s = act(createEnterprise(), { kind: 'order-asset', model: 'agv', terminalId: 'T1', ownership: 'leased' });
  const id = s.assets.at(-1)!.id;
  s = act(s, { kind: 'project', type: 'automation', terminalId: 'T1' });
  s = act(s, { kind: 'advance', hours: 90 * 24 });
  s = act(s, { kind: 'advance', hours: 61 * 24 });
  // Reserve the digital staff for one hour so the delivered AGV is idle.
  for (const crew of s.crews.filter(c => c.role === 'digital')) s = act(s, { kind: 'staff', crewId: crew.id, shift: 'reserve' });
  s = act(s, { kind: 'advance', hours: 1 });
  const delivery = leaseDeliveryHour(s.assets.find(a => a.id === id)!);
  s = act(s, { kind: 'assign-asset', assetId: id, terminalId: 'T2' });
  const before = s.ledger.filter(e => e.category === 'lease').reduce((n, e) => n + e.amount, 0);
  s = act(s, { kind: 'advance', hours: 4 });
  const after = s.ledger.filter(e => e.category === 'lease').reduce((n, e) => n + e.amount, 0);
  assert.equal(after - before, Math.round(assetSpec('agv').leaseDaily / 24) * 4);
  assert.equal(leaseDeliveryHour(s.assets.find(a => a.id === id)!), delivery);
});
test('sealed records verify independently and forged claims fail', () => {
  let s = act(createEnterprise(), { kind: 'advance', hours: 48 });
  s = act(s, { kind: 'note', topic: '经营决策', text: '根据本次库存、回执和现金状况调整后续计划，并继续观察是否形成新的资源瓶颈。' });
  s = act(s, { kind: 'seal' }); const pkg = makeEnterprisePackage(s);
  const verified = verifyEnterprisePackage(pkg); assert.equal(verified.stateHash, enterpriseHash(s));
  assert.throws(() => verifyEnterprisePackage({ ...pkg, expected: { ...pkg.expected, score: 100 } }), /重放/);
  assert.equal(verified.complete, false);
});
test('all six cargo systems survive a full year with inventory and finances conserved', { timeout: 120000 }, () => {
  let s = createEnterprise({ seed: 82027, years: 1, scenario: 'balanced', mode: 'practice' });
  s = act(s, { kind: 'policy', patch: { verifiedExceptions: true } });
  while (s.hour < s.horizon) {
    for (const i of s.incidents.filter(i => i.status !== 'resolved')) {
      if (!i.evidence) s = act(s, { kind: 'respond', incidentId: i.id, action: 'audit' });
      if (i.status === 'active') s = act(s, { kind: 'respond', incidentId: i.id, action: 'isolate' });
      const current = s.incidents.find(x => x.id === i.id)!;
      if (current.response !== 'repair') s = act(s, { kind: 'respond', incidentId: i.id, action: 'repair' });
      else if (current.resolves === null) s = act(s, { kind: 'respond', incidentId: i.id, action: 'recover' });
    }
    s = act(s, { kind: 'advance', hours: Math.min(7 * 24, s.horizon - s.hour), stopOnIncident: true });
    assertEnterprise(s);
  }
  const v = enterpriseView(s); assert.ok(v.goods.every(g => g.delivered > 0), JSON.stringify(v.goods));
  assert.equal(enterpriseScore(s).complete, true); assert.equal(s.months.length, 12);
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))), enterpriseHash(s));
});
