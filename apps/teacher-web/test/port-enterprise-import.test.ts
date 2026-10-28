import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnterprise,enterpriseRecord,restoreEnterprise} from '@edu/port-simulation-core';
import {parseEnterpriseImport} from '../src/features/port-simulation/enterprise/enterprise-import';
test('malformed files fail with a student-facing explanation before they can activate a new port',()=>{
  for(const text of ['', '{broken'])assert.throws(()=>parseEnterpriseImport(text),/有效的JSON/);
  for(const text of ['null','[]','"text"','123'])assert.throws(()=>parseEnterpriseImport(text),/经营记录对象/);
  for(const record of [null,[],undefined])assert.throws(()=>parseEnterpriseImport(JSON.stringify({schema:'port-enterprise-submission/1',record})),/缺少完整经营记录/);
});
test('a backup and a sealed wrapper both expose only the replayable record and retain version rejection',()=>{
  const record=enterpriseRecord(createEnterprise());
  assert.deepEqual(parseEnterpriseImport(JSON.stringify(record)),record);
  assert.deepEqual(parseEnterpriseImport(JSON.stringify({schema:'port-enterprise-submission/1',record,expected:{score:999}})),record);
  assert.throws(()=>restoreEnterprise(parseEnterpriseImport(JSON.stringify({...record,schema:'port-enterprise/0'}))),/版本/);
});
