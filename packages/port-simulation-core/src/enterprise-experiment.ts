import {executeEnterprise,assertEnterprise} from './enterprise-engine.js';
import {enterpriseRecord,restoreEnterprise} from './enterprise-review.js';
import type {EnterpriseState} from './enterprise-model.js';

/** Re-run an already observed week, changing one yard rule only. Never changes the live record. */
export function compareEnterpriseYards(state:EnterpriseState){
  if(state.config.mode==='exam')throw Error('考核场次不提供策略参考对照。');
  const record=enterpriseRecord(state),first=record.commands.findIndex(c=>c.kind==='advance');
  if(first<0)throw Error('先实际经营一周，再用已观察的时段做同条件对照。');
  const baseline=restoreEnterprise(record,first),hours=168;
  if(baseline.hour+hours>state.hour)throw Error('对照只使用已经观察过的完整一周。');
  const run=(allocation:'fixed'|'dynamic')=>{
    let s=structuredClone(baseline);
    s=executeEnterprise(s,{kind:'yard-plan',terminalId:'T1',patch:{allocation}});
    s=executeEnterprise(s,{kind:'advance',hours},undefined,true);assertEnterprise(s);
    const lots=s.lots.filter(l=>l.terminalId==='T1'),metrics=s.management.metrics;
    return {allocation,delivered:lots.reduce((n,l)=>n+l.completed,0),backlog:lots.reduce((n,l)=>n+l.quantity-l.completed-l.lost,0),rehandles:metrics.yardRehandles-baseline.management.metrics.yardRehandles,travelWork:metrics.travelWork-baseline.management.metrics.travelWork,cashChange:s.cash-baseline.cash};
  };
  return {startHour:baseline.hour,endHour:baseline.hour+hours,seed:state.config.seed,classification:baseline.management.yardPlans.T1!.classification,variants:[run('fixed'),run('dynamic')],boundary:'同一起点、需求、天气、人员与设施，只改T1货位分配。全港现金含其他业务；结果不代表所有情境中的最优策略。'};
}
export type EnterpriseYardExperiment=ReturnType<typeof compareEnterpriseYards>;
