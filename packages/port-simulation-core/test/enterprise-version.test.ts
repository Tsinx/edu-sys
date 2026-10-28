import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnterprise,enterpriseRecord,enterpriseHash,restoreEnterprise} from '../src/enterprise.js';

test('equivalent version and configuration objects restore identically regardless of JSON property order',()=>{
  const state=createEnterprise(),record=enterpriseRecord(state),entries=Object.entries(record.rules);
  for(let shift=0;shift<entries.length;shift++){
    const rules=Object.fromEntries([...entries.slice(shift),...entries.slice(0,shift)].reverse());
    const config=Object.fromEntries(Object.entries(record.config).reverse());
    const reordered={commands:record.commands,config,rules,schema:record.schema};
    assert.equal(enterpriseHash(restoreEnterprise(JSON.parse(JSON.stringify(reordered)))),enterpriseHash(state));
  }
});
test('version admission still rejects missing, extra, changed, malformed and future rules',()=>{
  const record=enterpriseRecord(createEnterprise());
  const missing={...record.rules} as Record<string,unknown>;delete missing.engine;
  for(const rules of [missing,{...record.rules,unknown:'1'},{...record.rules,engine:'port-enterprise/3.0'},{...record.rules,finance:2},[],null,'latest']){
    assert.throws(()=>restoreEnterprise({...record,rules}),/版本/);
  }
});
