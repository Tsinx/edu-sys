import {mkdir, writeFile} from 'node:fs/promises';
import {
  createPortSession, applyPortCommand, advancePortSession, servicePortReference,
  calibratedPortPlan, defaultPortConfig, defaultPortPlan, portCargoDone,
  serializePortSession, type PortSession
} from '../packages/port-simulation-core/src/index.js';

const phase = process.env.PORT_AUDIT_PHASE ?? 'baseline';
const out = new URL(`../output/port-simulation-regression/${phase}/`, import.meta.url);
await mkdir(out, {recursive: true});
function snapshot(s: PortSession) {
  const boxes = Object.values(s.boxes);
  return {
    second: s.second, status: s.status,
    unloaded: boxes.filter(b => b.unloadedAt !== null).length,
    loaded: boxes.filter(b => b.loadedAt !== null).length,
    delivered: boxes.filter(b => b.deliveredAt !== null).length,
    calls: s.schedules.filter(v => s.calls[v.id]!.announced).map(v => ({
      id: v.id, large: v.large, stage: s.calls[v.id]!.stage, berth: s.calls[v.id]!.berth,
      cargoDone: portCargoDone(s, v.id), unload: v.unload, load: v.load,
      unloaded: boxes.filter(b => s.batches[b.batchId]!.callId === v.id && b.unloadedAt !== null).length,
      loaded: boxes.filter(b => s.batches[b.batchId]!.callId === v.id && b.loadedAt !== null).length
    })),
    jobs: s.jobs.map(j => ({id: j.id, box: j.boxId, kind: j.kind, resource: j.resource, from: j.from, to: j.to, rate: j.rate, end: j.end, physical: j.physical})),
    facilities: s.facilities
  };
}
const results = [];
const cases = phase === 'baseline' ? [
  ['legacy-default', 'port-operations/3.1', defaultPortPlan()],
  ['physical-default', 'port-operations/3.2', defaultPortPlan()],
  ['physical-calibrated', 'port-operations/3.2', calibratedPortPlan(true)]
] as const : [
  ['physical-default', 'port-operations/3.3', defaultPortPlan()],
  ['physical-calibrated', 'port-operations/3.3', calibratedPortPlan(true)]
] as const;
for (const [name, schema, plan] of cases) {
  const s = createPortSession('battle', defaultPortConfig(), plan, schema);
  applyPortCommand(s, {kind: 'start'});
  const hourly = [];
  const started = performance.now();
  while (s.second < 172800) {
    servicePortReference(s, 2);
    advancePortSession(s, Math.min(120, 172800 - s.second));
    if (s.second % 3600 === 0) hourly.push(snapshot(s));
    if (s.second % 21600 === 0) console.log(name, s.second / 3600, 'hours', snapshot(s).unloaded, snapshot(s).loaded, snapshot(s).delivered);
  }
  const final = snapshot(s);
  const result = {name, schema, elapsedMs: performance.now() - started, final};
  results.push(result);
  await writeFile(new URL(`${name}.json`, out), JSON.stringify({result, hourly, boxes: s.boxes}, null, 2));
  await writeFile(new URL(`${name}-session.json`, out), serializePortSession(s));
  console.log(JSON.stringify({...result, final: {...final, jobs: final.jobs.map(j => ({...j, physical: j.physical?.stage})), facilities: undefined}}));
}
await writeFile(new URL('summary.json', out), JSON.stringify(results, null, 2));
