import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnterprise,executeEnterprise,enterpriseRecord,enterpriseView,restoreEnterprise} from '@edu/port-simulation-core';
import {parseEnterpriseImport,parseEnterpriseBackup,enterpriseBackup,restoreEnterpriseTeaching} from '../src/features/port-simulation/enterprise/enterprise-import';
import {newEnterpriseTeaching} from '../src/features/port-simulation/enterprise/enterprise-teaching';
test('malformed files fail with a student-facing explanation before they can activate a new port',()=>{
  for(const text of ['', '{broken'])assert.throws(()=>parseEnterpriseImport(text),/有效的JSON/);
  for(const text of ['null','[]','"text"','123'])assert.throws(()=>parseEnterpriseImport(text),/经营记录对象/);
  for(const record of [null,[],undefined])assert.throws(()=>parseEnterpriseImport(JSON.stringify({schema:'port-enterprise-submission/1',record})),/缺少完整经营记录/);
});
test('complete backup restores exact teaching receipts and pauses at the confirmed hour; invalid receipts cannot award commands',()=>{
  let s=createEnterprise({...createEnterprise().config,tutorial:true});s=executeEnterprise(s,{kind:'management-plan',patch:{goal:'balanced'}});
  const p=newEnterpriseTeaching();p.selected='director-calendar';p.receipts.strategy={hour:0,position:1,evidence:['已发布稳健经营']};p.starts.strategy={hour:0,position:0};
  const parsed=parseEnterpriseBackup(JSON.stringify(enterpriseBackup(enterpriseRecord(s),p))),view=enterpriseView(restoreEnterprise(parsed.record));
  const restored=restoreEnterpriseTeaching(parsed.teaching,parsed.record,view)!;
  assert.deepEqual(restored.receipts,p.receipts);assert.equal(restored.selected,'director-calendar');assert.equal(restored.active,false);assert.equal(restored.pausedAt,view.hour);
  for(const corrupt of [{...p,schema:'port-enterprise-teaching/0'},{...p,receipts:{strategy:{hour:9999,position:1,evidence:[]}}},{...p,receipts:{'electric-order':{hour:0,position:1,evidence:[]}}},{...p,starts:{strategy:{hour:0,position:-1}}}])assert.throws(()=>restoreEnterpriseTeaching(corrupt,parsed.record,view),/带教进度/);
  const sealed=executeEnterprise(executeEnterprise(s,{kind:'advance',hours:24}),{kind:'seal'});
  assert.equal(enterpriseView(sealed).sealed,true);
  assert.equal(restoreEnterpriseTeaching(p,enterpriseRecord(sealed),enterpriseView(sealed))!.active,false,'sealed practice backups retain read-only teaching history');
});
test('a backup and a sealed wrapper both expose only the replayable record and retain version rejection',()=>{
  const record=enterpriseRecord(createEnterprise());
  assert.deepEqual(parseEnterpriseImport(JSON.stringify(record)),record);
  assert.deepEqual(parseEnterpriseImport(JSON.stringify({schema:'port-enterprise-submission/1',record,expected:{score:999}})),record);
  assert.throws(()=>restoreEnterprise(parseEnterpriseImport(JSON.stringify({...record,schema:'port-enterprise/0'}))),/版本/);
});
