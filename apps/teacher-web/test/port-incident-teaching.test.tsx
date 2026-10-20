import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {applyPortClassLabCommand as act,portLabBackupCapacity,type PortClassLab,type PortLabCommand} from '@edu/port-simulation-core';
import {freshNotebook} from '../src/features/port-simulation/port-class-notebook';
import {incidentCoach,incidentReportExamples} from '../src/features/port-simulation/port-incident-coach';
import {PortIncidentControls} from '../src/features/port-simulation/PortIncidentControls';
import {PortLabPlaybackControls} from '../src/features/port-simulation/PortLabPlaybackControls';
import {PortIncidentLearning} from '../src/features/port-simulation/PortIncidentLearning';

const playback=(run:PortClassLab,playing=false)=>({playing,targetSecond:run.simulation!.second+600,fromSecond:run.simulation!.second,reason:'idle' as const,generation:1,speed:30,setSpeed:()=>{},start:()=>{},resume:()=>{},pause:()=>{},reset:()=>{}});
function controls(run:PortClassLab,playing=false){
  const guidance=incidentCoach(run,{playing})!;
  return renderToStaticMarkup(<><PortLabPlaybackControls playback={playback(run,playing)} run={run} finished={false} pendingDispatch={false} onAdvance={()=>{}} onQuickCalculate={()=>{}} guidance={guidance}/><PortIncidentControls run={run} locked={playing||!!run.pendingTask} scope="gate" onScope={()=>{}} quarantine={[]} onQuarantine={()=>{}} onSend={()=>{}} onTimed={()=>{}} teaching guidance={guidance}/></>);
}

test('running early redirects to an enabled pause control and returns to the unfinished evidence step',()=>{
  for(const scenario of ['system','equipment'] as const){
    let run=freshNotebook(12,scenario).run;
    for(const recorded of [false,true]){
      if(recorded)run=act(run,{kind:'record'});
      const guide=incidentCoach(run,{playing:true})!;assert.equal(guide.target,'pause');assert.match(guide.body,/先点击高亮的“暂停推进”/);
      const tag=controls(run,true).match(/<button[^>]*data-incident-target="pause"[^>]*>/)?.[0];assert.ok(tag);assert.match(tag,/data-incident-current="true"/);assert.doesNotMatch(tag,/ disabled=/);
      assert.equal(incidentCoach(run,{playing:false})!.target,recorded?'scope':'record');
    }
  }
});

test('a student following guidance always has an enabled highlighted control through both complete scenarios',()=>{
  for(const scenario of ['system','equipment'] as const){
   for(const continuity of [false,true]){
    let run=freshNotebook(12,scenario).run;const visited=new Set<string>();
    for(let count=0;run.terminal.minute<240&&count<90;count++){
      const guide=incidentCoach(run)!;visited.add(guide.id);assert.ok(guide.reason.length>15);assert.ok(guide.check.length>8);
      const html=controls(run),tag=html.match(new RegExp(`<[^>]+data-incident-target="${guide.target}"[^>]*>`))?.[0];
      assert.ok(tag,`${scenario}/${guide.id}: missing target ${guide.target}`);assert.match(tag,/data-incident-current="true"/);assert.doesNotMatch(tag,/ disabled=/,`${scenario}/${guide.id}: target disabled`);
      let command:PortLabCommand;
      switch(guide.target){
        case 'record':command={kind:'record'};break;
        case 'scope':case 'logs':case 'backup':case 'mechanical':command={kind:'inspect',target:guide.target};break;
        case 'isolate':command={kind:'isolate',scope:'gate'};break;
        case 'repair':command={kind:'repair'};break;
        case 'audit':assert.match(guide.reason,/R2与R3/);assert.match(guide.body,/只勾R3、R4/);command={kind:'start-audit',quarantine:['R3','R4']};break;
        case 'check':command={kind:'start-reconcile'};break;
        case 'test':command={kind:'test'};break;
        case 'restore':command={kind:'restore'};break;
        case 'return':command={kind:'relief',enabled:false};break;
        case 'continue':case 'endpoint':command={kind:'advance',minutes:360};break;
        default:throw Error('Unexpected guidance target '+guide.target);
      }
      if(guide.id==='work'&&continuity){
        if(scenario==='equipment'&&!run.emergency!.reliefUsed)run=act(run,{kind:'relief',enabled:true});
        if(scenario==='system'&&!run.incident!.manual&&run.incident!.manualDelivered<portLabBackupCapacity(run))run=act(run,{kind:'manual'});
      }
      run=act(run,command);
      if(guide.id==='audit')assert.match(controls(run,true),/data-incident-target="pause" data-incident-current="true"/);
    }
    assert.equal(run.terminal.minute,240);assert.ok(run.incident!.restoredAt!==null);assert.equal(run.incident!.testDelivered,3);assert.ok(visited.has('work'));assert.ok(visited.has('observe'));
    if(scenario==='equipment'&&continuity){assert.ok(visited.has('return'));assert.ok(run.emergency!.reliefReturned);}
   }
  }
});

test('backup source documents and explained answers appear only after inspection and only teaching gives row solutions',()=>{
  let run=freshNotebook(12).run;
  assert.doesNotMatch(controls(run),/IND-T01|采用去重选择|R4版本17/);
  const finish=(command:PortLabCommand)=>{run=act(run,command);while(run.pendingTask)run=act(run,{kind:'advance',minutes:360});};
  finish({kind:'record'});finish({kind:'inspect',target:'scope'});finish({kind:'inspect',target:'logs'});finish({kind:'isolate',scope:'gate'});finish({kind:'repair'});finish({kind:'inspect',target:'backup'});
  const html=controls(run);assert.match(html,/IND-T01/);assert.match(html,/采用保守选择/);assert.match(html,/本轮示范隔离这一条/);
  const practical=renderToStaticMarkup(<PortIncidentControls run={run} locked={false} scope="gate" onScope={()=>{}} quarantine={[]} onQuarantine={()=>{}} onSend={()=>{}} onTimed={()=>{}}/>);
  assert.doesNotMatch(practical,/采用去重选择|本轮示范|参考答案与原因/);assert.match(practical,/IND-T01/);
  finish({kind:'start-audit',quarantine:['R2','R3','R4']});assert.equal(portLabBackupCapacity(run),20);
  assert.match(controls(run),/启用20箱双人复核备用交付/);assert.doesNotMatch(controls(run),/启用24箱双人复核备用交付/);
});

test('global suspension gets an explicit corrective step and failed outcomes receive honest guided report examples',()=>{
  let run=freshNotebook(12).run;run=act(run,{kind:'record'});run=act(run,{kind:'inspect',target:'scope'});while(run.pendingTask)run=act(run,{kind:'advance',minutes:360});
  run=act(run,{kind:'isolate',scope:'all'});run=act(run,{kind:'inspect',target:'logs'});while(run.pendingTask)run=act(run,{kind:'advance',minutes:360});
  assert.equal(incidentCoach(run)!.target,'resume-internal');run=act(run,{kind:'resume-internal'});
  while(run.terminal.minute<240)run=act(run,{kind:'advance',minutes:360});
  const examples=incidentReportExamples(run),notes:Record<string,string>={};
  assert.match(examples.conclusion.text,/尚无有效恢复耗时/);assert.match(examples.handover.text,/恢复审查尚未通过/);
  for(const id of ['scope','barriers','conclusion','handover']){const guide=incidentCoach(run,{notes})!;assert.equal(guide.target,`note-${id}`);notes[id]=examples[id].text;}
  assert.equal(incidentCoach(run,{notes})!.target,'save-review');assert.equal(incidentCoach(run,{notes,sealedAt:'2026-10-19T00:00:00Z'})!.target,'export-draft');
  const book={...freshNotebook(12),run,notes},guide=incidentCoach(run,{notes})!;
  const html=renderToStaticMarkup(<PortIncidentLearning book={book} playing={false} root={{current:null}} onMode={()=>{}} guide={guide}/>);
  assert.match(html,/持续教学提示/);assert.match(html,/为什么这样做/);assert.match(html,/看到什么才算完成/);
});
