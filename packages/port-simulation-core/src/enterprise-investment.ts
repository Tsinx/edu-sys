import {assetSpec,projectSpec} from './enterprise-catalogue.js';
import type {EnterpriseState} from './enterprise-model.js';

/** Public catalogue quote. Parallel construction uses max(delivery, interface), never their sum. */
export function enterpriseInvestmentQuote(s:Pick<EnterpriseState,'hour'|'cash'|'terminals'|'projects'>,model:string,terminalId:string,ownership:'owned'|'leased',deposits=0){
  const asset=assetSpec(model),terminal=s.terminals.find(t=>t.id===terminalId);
  if(!terminal)throw Error('接收作业区不存在。');
  const ready=asset.required==='none'||asset.required==='grid'&&terminal.gridLevel>0||asset.required==='rail'&&terminal.rail||asset.required==='automation'&&terminal.automation>0;
  const projectId=({none:null,grid:'grid-upgrade',rail:'rail-link',automation:'automation'} as const)[asset.required];
  const prerequisite=!ready&&projectId?projectSpec(projectId):undefined;
  const building=prerequisite?s.projects.find(p=>p.type===projectId&&p.terminalId===terminalId&&p.status==='building'):undefined;
  const equipmentCash=ownership==='leased'?asset.leaseDaily*30:asset.price,interfaceCash=prerequisite&&!building?prerequisite.price:0;
  const interfaceHour=ready?s.hour:building?.completes??s.hour+(prerequisite?.days??0)*24;
  const earliestHour=Math.max(s.hour+asset.leadDays*24,interfaceHour),totalCash=equipmentCash+interfaceCash;
  return {equipmentCash,interfaceCash,totalCash,earliestHour,ready,prerequisite,building,cashGap:Math.max(0,totalCash-s.cash),liquidGap:Math.max(0,totalCash-s.cash-deposits),deposits};
}
