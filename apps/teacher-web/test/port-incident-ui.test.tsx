import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {applyPortClassLabCommand as act,createPortClassLab,portLabFinished,comparablePortIncident,type PortClassLab} from '@edu/port-simulation-core';
import {freshNotebook,packedNotebook,decodeNotebook,saveNotebook,loadNotebook} from '../src/features/port-simulation/port-class-notebook';
import {PortClassLabPage} from '../src/features/port-simulation/PortClassLabPage';
import {PortIncidentControls,PortIncidentEvidence,PortIncidentSummary,PORT_INCIDENT_TASKS} from '../src/features/port-simulation/PortIncidentControls';
import {PortLabAnalysis} from '../src/features/port-simulation/PortLabAnalysis';

test('two independent entries, 30-minute tasks and initial evidence never expose uncollected logs or ledger rows',()=>{
  const html=renderToStaticMarkup(<PortClassLabPage lesson={12}/>);
  assert.match(html,/scenario=system/);assert.match(html,/scenario=equipment/);assert.match(html,/port-lab-taskbook.html/);
  assert.doesNotMatch(html,/第75分钟|隔离R[1-5]|驱动控制保护异常|teachingCue|assistantCue/);
  for(const tasks of Object.values(PORT_INCIDENT_TASKS))assert.equal(tasks.reduce((n,t)=>n+t.minutes,0),30);
});
test('evidence and scene templates round-trip independently for both scenarios and corrupt claims do not pass',()=>{
  for(const scenario of ['system','equipment'] as const){
    const book=freshNotebook(12,scenario);book.run=act(book.run,{kind:'inspect',target:'scope'});book.run=act(book.run,{kind:'tick',seconds:120});
    book.comparison='none';book.analysis.charts[0]!.title='我的恢复比较';
    const restored=decodeNotebook(JSON.parse(JSON.stringify(packedNotebook(book,12))),12);
    assert.equal(restored.run.scenario,scenario);assert.equal(restored.run.pendingTask?.kind,'scope');assert.equal(restored.comparison,'none');
    assert.deepEqual(restored.run.simulation!.resourceStatistics,book.run.simulation!.resourceStatistics);
    assert.deepEqual(restored.analysis,book.analysis);assert.equal(restored.analysis.charts.length,4);
    assert.equal(restored.run.emergency!.evidence.scope,false);
    const html=renderToStaticMarkup(<><PortIncidentEvidence run={restored.run}/><PortIncidentSummary run={restored.run}/><PortIncidentControls run={restored.run} locked scope="gate" onScope={()=>{}} quarantine={[]} onQuarantine={()=>{}} onSend={()=>{}} onTimed={()=>{}}/></>);
    assert.doesNotMatch(html,/NaN|Infinity|隔离R[1-5]|teachingCue|assistantCue/);
    const bad=packedNotebook(book,12);(bad.run as any).scenarioVersion=99;assert.throws(()=>decodeNotebook(bad,12),/场景/);
  }
});
test('completed plans retain actual traces for overlays while another scenario remains ineligible',()=>{
  const book=freshNotebook(12,'equipment');let prior=book.run;
  while(!portLabFinished(prior))prior=act(prior,{kind:'advance',minutes:360});
  book.archive=[{run:prior,notes:{scope:'这是需要保留的第一种方案复盘与证据。'},attempts:[],sealedAt:null}];
  book.run=act(book.run,{kind:'advance',minutes:15});
  const restored=decodeNotebook(packedNotebook(book,12),12);
  assert.ok(comparablePortIncident(restored.run,restored.archive[0]!.run));
  assert.ok(!comparablePortIncident(restored.run,createPortClassLab(12,'incident','system')));
  const html=renderToStaticMarkup(<PortLabAnalysis run={restored.run} baseline={restored.archive[0]!.run} dashboard={restored.analysis} selected="yard-crane-0" onSelect={()=>{}} onChange={()=>{}} onFocus={()=>{}}/>);
  assert.match(html,/基准与当前使用相同区间/);assert.match(html,/设备故障/);assert.doesNotMatch(html,/NaN|Infinity|teachingCue|assistantCue/);
  assert.deepEqual(restored.archive[0]!.run.simulation!.resourceStatistics,prior.simulation!.resourceStatistics);
});
test('scenario launchers load their own latest source without overwriting the other scene',()=>{
  const map=new Map<string,string>();const storage={get length(){return map.size},getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),key:(i:number)=>[...map.keys()][i]??null};
  const previous={window:(globalThis as any).window,localStorage:(globalThis as any).localStorage,location:(globalThis as any).location};
  try{
    Object.assign(globalThis,{window:{},localStorage:storage,location:{search:'?lesson=12&scenario=system'}});
    saveNotebook(freshNotebook(12,'system'),12,'system-test-source');saveNotebook(freshNotebook(12,'equipment'),12,'equipment-test-source');
    assert.equal(loadNotebook(12).book.run.scenario,'system');(globalThis as any).location.search='?lesson=12&scenario=equipment';assert.equal(loadNotebook(12).book.run.scenario,'equipment');
  }finally{Object.assign(globalThis,previous);}
});
