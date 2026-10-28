import assert from 'node:assert/strict';
import React from 'react';
globalThis.React=React;
import test from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {assertEnterprise,createEnterprise,executeEnterprise,enterpriseHash,enterpriseRecord,enterpriseView,restoreEnterprise,type EnterpriseCommand} from '@edu/port-simulation-core';
import {ENTERPRISE_TEACHING_END_HOUR,enterpriseIncidentLesson,enterpriseTeachingSteps,newEnterpriseTeaching,teachingAllowsCommand} from '../src/features/port-simulation/enterprise/enterprise-teaching';
import {resolveEnterpriseGuideAction} from '../src/features/port-simulation/enterprise/enterprise-guidance';
import {placeTourCard} from '../src/features/port-simulation/enterprise/enterprise-tour-lock';
import {EnterpriseTeachingCoach} from '../src/features/port-simulation/enterprise/EnterpriseTeachingCoach';
import type {useEnterprise} from '../src/features/port-simulation/enterprise/useEnterprise';

test('the semester route teaches six months through real actions and does not credit defaults or failures',()=>{
  let s=createEnterprise();const p=newEnterpriseTeaching(),steps=()=>enterpriseTeachingSteps(enterpriseView(s),enterpriseRecord(s),p);
  assert.equal(p.schema,'port-enterprise-teaching/4');assert.equal(p.selected,'strategy');assert.equal(ENTERPRISE_TEACHING_END_HOUR,4344);
  assert.equal(steps().length,28);assert.equal(steps()[0]!.complete,false);assert.ok(steps().every(x=>!Object.hasOwn(x,'quiz')));
  s=executeEnterprise(s,{kind:'management-plan',patch:{chargeTarget:99}});assert.equal(steps()[0]!.complete,false);
  s=executeEnterprise(s,{kind:'management-plan',patch:{goal:'balanced'}});assert.equal(steps()[0]!.complete,true);
  p.receipts['vehicle-accept']={hour:2000,position:999,evidence:['future']};assert.equal(steps().find(x=>x.id==='vehicle-accept')!.complete,false);
  assert.equal(steps().find(x=>x.id==='half-year')!.planHour,4344);
});

test('game guidance walks through real menus and fields, automatically passing already correct defaults',()=>{
  const v=enterpriseView(createEnterprise()),p=newEnterpriseTeaching(),step=enterpriseTeachingSteps(v,undefined,p).find(x=>x.id==='yard-zones')!;
  const values:Record<string,string>={importShare:'50',sharedShare:'10',maxTiers:'4'};
  const read=(selector:string)=>values[/data-enterprise-field="([^"]+)"/.exec(selector)?.[1]??''];
  assert.match(resolveEnterpriseGuideAction(step,'overview',v,read).selector,/hud-menu/);
  assert.match(resolveEnterpriseGuideAction(step,'menu',v,read).selector,/menu-yard/);
  assert.match(resolveEnterpriseGuideAction(step,'finance',v,read).selector,/window-close/);
  assert.equal(resolveEnterpriseGuideAction(step,'yard',v,read).value,'20');
  values.sharedShare='20';assert.equal(resolveEnterpriseGuideAction(step,'yard',v,read).value,'3');
  values.maxTiers='3';assert.equal(resolveEnterpriseGuideAction(step,'yard',v,read).kind,'submit');
});

test('guided command enforcement rejects unrelated or extra decisions and prevents repeated completed actions',()=>{
  let s=createEnterprise();const p=newEnterpriseTeaching();
  const allowed=(c:EnterpriseCommand)=>teachingAllowsCommand(enterpriseView(s),enterpriseRecord(s),p,c);
  assert.ok(allowed({kind:'management-plan',patch:{goal:'balanced'}}));
  assert.equal(allowed({kind:'management-plan',patch:{goal:'balanced',charging:'offpeak'}}),false);
  for(const c of [{kind:'loan',amount:500000},{kind:'seal'},{kind:'advance',hours:168,stopOnIncident:true}] as EnterpriseCommand[])assert.equal(allowed(c),false);
  s=executeEnterprise(s,{kind:'management-plan',patch:{goal:'balanced'}});assert.equal(allowed({kind:'management-plan',patch:{goal:'balanced'}}),false);
});

test('all 28 management tasks reach a real half-year handover and preserve deterministic enterprise replay',()=>{
  let s=createEnterprise();const p=newEnterpriseTeaching();
  const act=(c:EnterpriseCommand)=>{assert.ok(teachingAllowsCommand(enterpriseView(s),enterpriseRecord(s),p,c),JSON.stringify(c));s=executeEnterprise(s,c);assert.ok(s.journal.at(-1)!.ok,s.journal.at(-1)!.message);};
  for(let n=0;n<28;n++){
    const step=enterpriseTeachingSteps(enterpriseView(s),enterpriseRecord(s),p)[n]!;p.selected=step.id;p.starts[step.id]={hour:s.hour,position:s.journal.length};
    if(step.kind==='command')act(step.expected!);
    if(step.kind==='advance')while(s.hour<step.planHour!){const incident=enterpriseIncidentLesson(enterpriseView(s));if(incident)act(incident.expected);else act({kind:'advance',hours:Math.min(24*93,step.planHour!-s.hour),stopOnIncident:true});}
    if(step.id==='vehicle-accept')assert.equal(s.assets.at(-1)!.model,'electric-tractor');
    if(step.id==='digital-accept')assert.equal(s.digitalLevel,2);
    if(step.id==='road-accept')assert.ok(Math.abs(s.terminals[0]!.distance-1.28)<1e-8);
    p.receipts[step.id]={hour:s.hour,position:s.journal.length,evidence:step.evidence};
    assert.ok(enterpriseTeachingSteps(enterpriseView(s),enterpriseRecord(s),p)[n]!.complete,step.id);
  }
  assertEnterprise(s);assert.equal(s.hour,4344);assert.equal(s.months.length,6);assert.equal(s.sealed,false);assert.equal(s.config.years,3);
  assert.ok(s.horizon>s.hour);assert.ok(s.assets.filter(a=>a.model==='electric-tractor').length===2);assert.ok(s.contracts.some(c=>c.accepted&&c.shipped>0));
  assert.equal(s.notes.length,0,'the game tutorial does not require writing documents');
  assert.equal(enterpriseHash(restoreEnterprise(enterpriseRecord(s))),enterpriseHash(s));
});

test('spotlight cards remain on screen and leave the target clear on desktop and narrow layouts',()=>{
  for(const [width,height]of [[1280,720],[390,844],[390,600]])for(const target of [{left:15,top:15,width:100,height:42},{left:170,top:500,width:130,height:42},{left:30,top:300,width:320,height:44}]){
    const p=placeTourCard(target,width!,height!,320,210);assert.ok(p.left>=0&&p.top>=0);assert.ok(p.left+p.width<=width!);assert.ok(p.top+210<=height!);
    assert.ok(p.left+p.width<=target.left||p.left>=target.left+target.width||p.top+210<=target.top||p.top>=target.top+target.height);
  }
});

test('the entry is a game tour without reference-document panels, and exams start teaching only in a separate practice',()=>{
  const view=enterpriseView(createEnterprise({...createEnterprise().config,mode:'exam'}));
  const runtime={view,currentSave:{teaching:newEnterpriseTeaching(),attemptId:'formal'},busy:false} as unknown as ReturnType<typeof useEnterprise>;
  const html=renderToStaticMarkup(<EnterpriseTeachingCoach runtime={runtime} tab="learning" rootRef={{current:null}} navigate={()=>{}} pause={()=>{}}/>);
  assert.match(html,/开始前半年带教/);assert.match(html,/独立练习/);assert.doesNotMatch(html,/参考与原因|fieldset|章节可以回看/);
  assert.equal(renderToStaticMarkup(<EnterpriseTeachingCoach runtime={runtime} tab="overview" compact rootRef={{current:null}} navigate={()=>{}} pause={()=>{}}/>),'','the exam scene must not invite a student to leave for a new practice');
});
