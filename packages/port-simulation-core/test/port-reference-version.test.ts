import assert from 'node:assert/strict';
import test from 'node:test';
import { createPortSession, createPortCourse, defaultPortConfig, serializePortSession, restorePortSession, portReferenceCost, rememberPortReference, PortSubmissionReplay, portStateHash, calibratedPortPlan, cleanPortPlan, terminalBudget } from '../src/index.js';

test('new cost calibration is versioned through export and both replay paths', async () => {
  const s=createPortSession('battle');
  assert.equal(s.referenceVersion,2);
  const raw=serializePortSession(s), restored=restorePortSession(raw), verified=new PortSubmissionReplay(raw);
  assert.equal(restored.referenceVersion,2);
  assert.equal(verified.session.referenceVersion,2);
  assert.equal(await portStateHash(restored),await portStateHash(s));
  assert.equal(await portStateHash(verified.session),await portStateHash(s));
  const legacy=JSON.parse(raw);delete legacy.referenceVersion;
  const old=restorePortSession(JSON.stringify(legacy));
  assert.equal(Object.hasOwn(old,'referenceVersion'),false);
  assert.equal(Object.hasOwn(new PortSubmissionReplay(JSON.stringify(legacy)).session,'referenceVersion'),false);
  assert.equal(Object.hasOwn(createPortCourse('arrival').simulation,'referenceVersion'),false);
  legacy.referenceVersion=99;
  assert.throws(()=>restorePortSession(JSON.stringify(legacy)),/基准版本/);
  assert.throws(()=>new PortSubmissionReplay(JSON.stringify(legacy)),/基准版本/);
});

test('reference caches cannot substitute one calibration version for another', () => {
  const config={...defaultPortConfig(),seed:123456};
  rememberPortReference(config,{cost:200,completed:100,unitCost:2},'port-operations/3.1',1);
  rememberPortReference(config,{cost:100,completed:100,unitCost:1},'port-operations/3.1',2);
  assert.equal(portReferenceCost(config,'port-operations/3.1',1).unitCost,2);
  assert.equal(portReferenceCost(config,'port-operations/3.1',2).unitCost,1);
  const plan=calibratedPortPlan();
  assert.deepEqual(cleanPortPlan(plan),plan);
  assert.ok(terminalBudget(plan.equipment)<=1200);
});
