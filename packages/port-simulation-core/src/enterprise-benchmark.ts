import {createEnterprise,executeEnterprise} from './enterprise-engine.js';
import {advanceEnterpriseHour} from './enterprise-operations.js';
import {incidentBudget} from './enterprise-strategy.js';
import {GUIDED_FINANCE_PLAN} from './enterprise-finance.js';
import type {EnterpriseConfig,EnterpriseState} from './enterprise-model.js';

export interface EnterpriseOutcomeMetrics {equity:number;profit:number;deliveryRate:number;waitingHours:number;emissionsPerUnit:number;work:number;}
type Reference={state:EnterpriseState;snapshots:Map<number,EnterpriseOutcomeMetrics>};
const contexts=new Map<string,Reference>();
function initial(config:EnterpriseConfig){const s=createEnterprise(config);return config.tutorial?executeEnterprise(s,{kind:'finance-plan',patch:{...GUIDED_FINANCE_PLAN}},undefined,true):s;}
/** Same published scenario, seed and elapsed hour. Default rules; required incidents get repair only.
 * Caches affect speed, never business state or the deterministic result. At most two ports and 128 scalar snapshots each. */
export function enterpriseDefaultReference(config:EnterpriseConfig,hour:number,measure:(state:EnterpriseState)=>EnterpriseOutcomeMetrics):EnterpriseOutcomeMetrics{
  const key=JSON.stringify(config);let context=contexts.get(key);
  if(!context){context={state:initial(config),snapshots:new Map()};contexts.set(key,context);}
  contexts.delete(key);contexts.set(key,context);while(contexts.size>2)contexts.delete(contexts.keys().next().value!);
  const cached=context.snapshots.get(hour);if(cached)return {...cached};
  if(context.state.hour>hour)context.state=initial(config);
  let s=context.state;
  while(s.hour<hour&&s.finance.status!=='bankrupt'&&!s.finance.tutorialPaused){
    for(const incident of s.incidents.filter(i=>i.status!=='resolved'&&(!i.authorization||i.authorizationPaused)))
      s=executeEnterprise(s,{kind:'incident-plan',incidentId:incident.id,plan:'repair',budget:incidentBudget(s,incident,'repair')},undefined,true);
    advanceEnterpriseHour(s);
  }
  context.state=s;const result=measure(s);context.snapshots.set(hour,result);
  while(context.snapshots.size>128)context.snapshots.delete(context.snapshots.keys().next().value!);
  return {...result};
}
/** Useful for independent replay verification and bounded-memory acceptance tests. */
export function clearEnterpriseReferenceCache(){contexts.clear();}
