import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createEnterprise,executeEnterprise,enterpriseDirector,enterpriseHash,enterpriseRecord,makeEnterprisePackage,verifyEnterprisePackage,enterpriseScore,assertEnterprise,incidentBudget,payableBalance,type EnterpriseState,type EnterpriseCommand,type EnterpriseConfig} from '../packages/port-simulation-core/src/enterprise.js';
import {enterpriseTeachingSteps,enterpriseIncidentLesson,newEnterpriseTeaching,teachingAllowsCommand} from '../apps/teacher-web/src/features/port-simulation/enterprise/enterprise-teaching.js';
import {enterpriseView} from '../packages/port-simulation-core/src/enterprise.js';
const output=resolve(process.argv[2]??'output/port-enterprise-director-20261101/audit');await mkdir(output,{recursive:true});const results:unknown[]=[];
const config:EnterpriseConfig={seed:20261101,years:1,scenario:'balanced',mode:'practice'};
function act(s:EnterpriseState,c:EnterpriseCommand){const next=executeEnterprise(s,c,undefined,true);assert.ok(next.journal.at(-1)?.ok,next.journal.at(-1)?.message);return next;}
function until(s:EnterpriseState,end:number,interactive=false){let year=-1;while(s.hour<end&&s.finance.status!=='bankrupt'&&!s.finance.tutorialPaused){
 for(const i of s.incidents.filter(i=>i.status!=='resolved'&&(!i.authorization||i.authorizationPaused))){const budget=Math.max(120000,incidentBudget(s,i,'repair'));s=act(s,{kind:'incident-plan',incidentId:i.id,plan:'repair',budget});}
 const hours=Math.min(interactive?(enterpriseDirector(s).mode==='briefing'?24:1):24*93,end-s.hour);s=act(s,{kind:'advance',hours,stopOnIncident:true,...(interactive?{stopAtVisit:true}:{})});
 if(Math.floor(s.hour/8760)!==year){year=Math.floor(s.hour/8760);console.log(JSON.stringify({progressYear:year,hour:s.hour,commands:s.journal.length,cash:s.cash}));}
}return s;}
async function save(name:string,s:EnterpriseState,started:number){assertEnterprise(s);const businessHash=enterpriseHash(s);s=act(s,{kind:'seal'});const pkg=makeEnterprisePackage(s),check=verifyEnterprisePackage(pkg);assert.equal(check.stateHash,enterpriseHash(s));const result={name,hour:s.hour,years:s.config.years,outcome:check.result.outcome,cash:s.cash,debt:s.debt,unpaid:payableBalance(s),days:s.telemetry.days.length,months:s.months.length,commands:s.journal.length,profit:check.result.profit,businessHash,hash:check.stateHash,milliseconds:Date.now()-started};results.push(result);await writeFile(resolve(output,name+'-package.json'),JSON.stringify(pkg));await writeFile(resolve(output,'results.json'),JSON.stringify({rules:s.rules,scope:'synthetic local simulations; no real student grades',results},null,2));console.log(JSON.stringify(result));return result;}
let started=Date.now(),year=until(createEnterprise(config),8760,true);await save('director-1y-daily',year,started);
started=Date.now();const batched=until(createEnterprise(config),8760,false);assert.equal(enterpriseHash(batched),enterpriseHash(year));await save('director-1y-batched',batched,started);
started=Date.now();let failed=act(createEnterprise(config),{kind:'project',type:'berth-extension',terminalId:'T1'});failed=act(failed,{kind:'project',type:'channel-depth',terminalId:'T1'});failed=until(failed,8760,true);assert.equal(failed.hour,336);assert.equal(failed.cash,0);await save('director-bankruptcy',failed,started);
for(const alternate of [false,true]){started=Date.now();let s=createEnterprise({seed:20261025,years:10,scenario:'balanced',mode:'practice',tutorial:true});const profile=newEnterpriseTeaching(),count=enterpriseTeachingSteps(enterpriseView(s),enterpriseRecord(s),profile).length;assert.equal(count,43);
 const doAct=(c:EnterpriseCommand)=>{assert.ok(teachingAllowsCommand(enterpriseView(s),enterpriseRecord(s),profile,c));s=act(s,c);};
 for(let n=0;n<count;n++){const step=enterpriseTeachingSteps(enterpriseView(s),enterpriseRecord(s),profile)[n]!;profile.selected=step.id;profile.starts[step.id]={hour:s.hour,position:s.journal.length};
  if(step.kind==='command')doAct(alternate?step.alternatives?.at(-1)??step.expected!:step.expected!);
  if(step.kind==='advance')while(s.hour<step.planHour!){const incident=enterpriseIncidentLesson(enterpriseView(s));if(incident)doAct(incident.expected);else doAct({kind:'advance',hours:Math.min(enterpriseDirector(s).mode==='briefing'?24:1,step.planHour!-s.hour,enterpriseDirector(s).boundary-s.hour),stopOnIncident:true,stopAtVisit:true});}
  profile.receipts[step.id]={hour:s.hour,position:s.journal.length,evidence:step.evidence};assert.ok(enterpriseTeachingSteps(enterpriseView(s),enterpriseRecord(s),profile)[n]!.complete,step.id);
 }
 assert.equal(s.hour,4344);assert.equal(s.finance.tutorialPaused,false);assert.equal(s.telemetry.days.length,181);await writeFile(resolve(output,'semester-'+(alternate?'alternative':'default')+'-record.json'),JSON.stringify(enterpriseRecord(s)));await save('semester-'+(alternate?'alternative':'default'),s,started);
}
started=Date.now();let long=until(createEnterprise({...config,years:10}),3653*24,true);assert.equal(long.hour,3653*24);assert.equal(long.telemetry.days.length,3653);assert.equal(long.months.length,120);await save('director-10y',long,started);
console.log(JSON.stringify({completed:results.length,output}));
