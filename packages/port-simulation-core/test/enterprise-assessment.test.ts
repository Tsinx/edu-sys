import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnterprise,executeEnterprise,enterpriseScore,enterpriseRecord,restoreEnterprise,enterpriseHash,clearEnterpriseReferenceCache,enterpriseInvestmentQuote,GUIDED_FINANCE_PLAN} from '../src/enterprise.js';

function operate(solar=false){let s=createEnterprise({seed:20261101,years:1,scenario:'balanced',mode:'practice'});if(solar)s=executeEnterprise(s,{kind:'project',type:'solar-storage',terminalId:'T1'},undefined,true);while(s.hour<s.horizon&&s.finance.status!=='bankrupt'){
  for(const i of s.incidents.filter(i=>i.status!=='resolved'&&(!i.authorization||i.authorizationPaused)))s=executeEnterprise(s,{kind:'incident-plan',incidentId:i.id,plan:'repair',budget:120000},undefined,true);
  s=executeEnterprise(s,{kind:'advance',hours:Math.min(168,s.horizon-s.hour),stopOnIncident:true},undefined,true);
}return s;}
test('a default port earns foundation marks; real economic improvement and cold replay use the same benchmark',{timeout:120000},()=>{
  const baseline=operate(),score=enterpriseScore(baseline);
  assert.ok(score.total>=50&&score.total<=65,JSON.stringify(score));
  assert.ok(score.components.filter(c=>c.id.startsWith('improvement')).every(c=>c.score===0));
  const note=executeEnterprise(baseline,{kind:'note',topic:'经营决策',text:'只增加一段足够长的说明文字，不应该提高任何自动评分项目。'});
  assert.equal(enterpriseScore(note).total,score.total);
  const improved=operate(true),better=enterpriseScore(improved);
  assert.ok(better.comparison.eligible);assert.ok(better.comparison.equityGain>0);assert.ok(better.total>score.total+5);
  clearEnterpriseReferenceCache();const replay=restoreEnterprise(enterpriseRecord(improved));
  assert.equal(enterpriseHash(replay),enterpriseHash(improved));assert.deepEqual(enterpriseScore(replay),better);
  const stopped=structuredClone(improved);for(const l of stopped.lots)l.completed=0;
  assert.equal(enterpriseScore(stopped).comparison.eligible,false);
});

test('tutorial reference includes the mandatory finance plan rather than crediting its confirmation as an improvement',()=>{
  let s=createEnterprise({seed:20261025,years:10,scenario:'balanced',mode:'practice',tutorial:true});
  s=executeEnterprise(s,{kind:'finance-plan',patch:{...GUIDED_FINANCE_PLAN}},undefined,true);s=executeEnterprise(s,{kind:'advance',hours:24},undefined,true);
  const score=enterpriseScore(s);assert.equal(score.comparison.equityGain,0);assert.equal(score.comparison.waitingReduction,0);assert.equal(score.comparison.emissionsReduction,0);
});

test('quotes include missing interfaces, parallel lead time, deposits, leases and already funded construction',()=>{
  let s=createEnterprise();const q=enterpriseInvestmentQuote(s,'smart-gate','T1','owned',1000000);
  assert.equal(q.equipmentCash,2200000);assert.equal(q.interfaceCash,14000000);assert.equal(q.totalCash,16200000);assert.equal(q.earliestHour,150*24);
  s=executeEnterprise(s,{kind:'project',type:'automation',terminalId:'T1'});
  const building=enterpriseInvestmentQuote(s,'smart-gate','T1','owned');assert.equal(building.interfaceCash,0);assert.equal(building.earliestHour,150*24);
  const lease=enterpriseInvestmentQuote(s,'electric-tractor','T1','leased');assert.ok(lease.equipmentCash<1050000);assert.equal(lease.interfaceCash,0);
  s.cash=100000;const gap=enterpriseInvestmentQuote(s,'smart-gate','T1','owned',1500000);assert.equal(gap.cashGap,2100000);assert.equal(gap.liquidGap,600000);
});
