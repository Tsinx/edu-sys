import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createEnterprise,enterpriseRecord} from '@edu/port-simulation-core';
import {listEnterpriseSaves,saveEnterprise,type EnterpriseSave} from '../src/features/port-simulation/enterprise/enterprise-storage';

const fresh=()=>{globalThis.indexedDB=new IDBFactory();};
const save=(id='run-a',scope='student:a'):EnterpriseSave=>({id,scope,title:'个人练习',savedAt:new Date().toISOString(),schema:'port-enterprise/2.0',record:enterpriseRecord(createEnterprise()),checkpoints:[]});
test('autosaves use atomic revisions and never let an older window overwrite a newer port',async()=>{
  fresh();const original=save();await saveEnterprise(original);const first=(await listEnterpriseSaves(original.scope))[0]!;
  await saveEnterprise({...first,title:'窗口一的新进度'});
  await assert.rejects(saveEnterprise({...first,title:'窗口二的过期进度'}),/其他窗口|较新|冲突/);
  const stored=(await listEnterpriseSaves(original.scope))[0]!;
  assert.equal(stored.title,'窗口一的新进度');assert.equal(first.revision,1);assert.equal(stored.revision,2);assert.equal(original.revision,undefined,'do not mutate queued snapshots');
});
test('simultaneous writers have exactly one winner and keep separate practice records independent',async()=>{
  fresh();await saveEnterprise(save());const initial=(await listEnterpriseSaves('student:a'))[0]!;
  const outcomes=await Promise.allSettled([saveEnterprise({...initial,title:'A'}),saveEnterprise({...initial,title:'B'})]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
  await saveEnterprise(save('run-b'));assert.equal((await listEnterpriseSaves(initial.scope)).length,2);
});
test('a colliding record id cannot overwrite another personal scope',async()=>{
  fresh();await saveEnterprise(save());const initial=(await listEnterpriseSaves('student:a'))[0]!;
  await assert.rejects(saveEnterprise({...initial,scope:'student:b'}),/身份|其他窗口|冲突/);
  assert.equal((await listEnterpriseSaves('student:b')).length,0);
  assert.equal((await listEnterpriseSaves('student:a')).length,1);
});
test('an uncloneable snapshot aborts its transaction and does not prevent a later valid save',async()=>{
  fresh();const initial=save();
  await assert.rejects(saveEnterprise({...initial,record:{...initial.record,commands:[(()=>{}) as never]}}));
  assert.equal((await listEnterpriseSaves(initial.scope)).length,0);
  const stored=await saveEnterprise(initial);assert.equal(stored.revision,1);
});
test('the database upgrade preserves legacy records and blocks old clients from bypassing revision checks',async()=>{
  fresh();const original=save();
  const legacy=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('edu-port-enterprise-local',1);r.onupgradeneeded=()=>r.result.createObjectStore('personal-runs',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  await new Promise<void>((resolve,reject)=>{const tx=legacy.transaction('personal-runs','readwrite');tx.objectStore('personal-runs').put(original);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});legacy.close();
  const migrated=(await listEnterpriseSaves(original.scope))[0]!;assert.deepEqual(migrated.record,original.record);
  assert.equal((await saveEnterprise(migrated)).revision,1);
  await assert.rejects(new Promise<void>((resolve,reject)=>{const r=indexedDB.open('edu-port-enterprise-local',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{r.result.close();resolve();};}),{name:'VersionError'});
  assert.deepEqual((await listEnterpriseSaves(original.scope))[0]!.record,original.record);
});
