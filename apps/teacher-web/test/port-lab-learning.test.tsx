import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyPortClassLabCommand as act, createPortClassLab, type PortClassLab } from '@edu/port-simulation-core';
import { currentTrialSaved, decodeNotebook, freshNotebook, packedNotebook, reportReady, restartLabRun, submitLabRun, trialNumber, type Notebook } from '../src/features/port-simulation/port-class-notebook';
import { labCoachPhase, labCoachState, labGuideVisible, resolveLabCoachStep, recordLabCoachEvent, type LabCoachUI } from '../src/features/port-simulation/port-lab-coach';
import { newPortAnalysisChart } from '../src/features/port-simulation/port-analysis-config';
import { PortLabCoach } from '../src/features/port-simulation/PortLabCoach';
import {PortLabEntry,PortLabLearning} from '../src/features/port-simulation/PortLabLearning';

let baseline:PortClassLab,trial:PortClassLab;
const finished=(book:Notebook):Notebook=>({...book,run:book.run.kind==='baseline'?(baseline??=act(createPortClassLab(11),{kind:'advance',minutes:360})):(trial??=act(createPortClassLab(11,'trial'),{kind:'advance',minutes:360}))});
const finding=(book:Notebook,text:string):Notebook=>({...book,learning:{...book.learning!,current:{...book.learning!.current,finding:text}}});
function afterBaseline(){return submitLabRun(finding(finished(freshNotebook(11)),'基准发现：车辆接续等待，先验证增加司机的影响。'),true);}

test('new lesson 11 starts empty with a hands-on baseline guide; lesson 12 retains its four diagnostic templates',()=>{
  const book=freshNotebook(11);assert.deepEqual(book.analysis.charts,[]);assert.equal(labCoachPhase(book),'baseline');assert.equal(labCoachState(book,false).current?.id,'run');
  const twelve=freshNotebook(12);assert.equal(twelve.analysis.charts.length,4);assert.equal(twelve.learning,undefined);assert.equal(labCoachPhase(twelve),null);
  const restored=decodeNotebook(packedNotebook(book,11),11);assert.deepEqual(restored.analysis.charts,[]);assert.equal(restored.learning!.current.id,book.learning!.current.id);
  const html=renderToStaticMarkup(<PortLabCoach book={book} playing={false} root={{current:null}} onEvent={()=>{throw Error('render must not operate the simulator');}} onHide={()=>{}}/>);
  assert.match(html,/data-lab-coach-step="run"/);assert.match(html,/先运行原配置/);assert.match(html,/演示鼠标位置/);assert.match(html,/暂时关闭实验引导/);assert.doesNotMatch(html,/自动完成|teachingCue|assistantCue/);
});

test('saving or moving on requires a finding, while resetting is always available',()=>{
  const empty=finished(freshNotebook(11));assert.throws(()=>submitLabRun(empty,true),/本次实验的发现/);assert.throws(()=>submitLabRun(finding(empty,' \n '),true),/本次实验的发现/);
  let book=afterBaseline();assert.equal(book.learning!.current.finding,'');assert.equal(book.learning!.baseline!.finding,'基准发现：车辆接续等待，先验证增加司机的影响。');
  const early=restartLabRun(book);assert.equal(early.run.terminal.minute,120);assert.equal(early.trials.length,0);assert.equal(early.learning!.current.finding,'');
  book=finished(book);assert.throws(()=>submitLabRun(book),/本次实验的发现/);assert.throws(()=>submitLabRun(book,true),/本次实验的发现/);
  const reset=restartLabRun(book);assert.equal(reset.run.terminal.minute,120);assert.equal(reset.trials.length,0);assert.equal(reset.archive.at(-1)!.run.terminal.minute,360);
  const saved=submitLabRun(finding(book,'没有改善。'));assert.equal(saved.trials.length,1);assert.equal(saved.learning!.trials[0]!.finding,'没有改善。');assert.ok(currentTrialSaved(saved));
  const next=submitLabRun(saved,true);assert.equal(next.trials.length,1,'moving on after saving never saves a second copy');assert.equal(next.learning!.current.finding,'');assert.equal(trialNumber(next),2);
});

test('four or more identical-command trials remain independent, survive replay and never inherit the previous finding',()=>{
  let book=afterBaseline();const chart=newPortAnalysisChart(book.run,'retained-chart',['vehicle-0']);book.analysis.charts=[chart];
  for(let i=1;i<=4;i++){
    book=finished(book);assert.equal(currentTrialSaved(book),false,`trial ${i} is new even with identical commands`);assert.equal(book.learning!.current.finding,'');
    book=submitLabRun(finding(book,`第${i}次发现：保持同一配置复核结果。`),i<4);
    assert.equal(book.trials.length,i);
  }
  assert.equal(trialNumber(book),4);assert.equal(new Set(book.learning!.trials.map(t=>t.id)).size,4);assert.equal(new Set(book.trials.map(t=>JSON.stringify(t.commands))).size,1);
  const restored=decodeNotebook(JSON.parse(JSON.stringify(packedNotebook(book,11))),11);assert.deepEqual(restored.learning,book.learning);assert.equal(restored.trials.length,4);assert.ok(currentTrialSaved(restored));
  assert.notEqual(restored.run,restored.trials[3]);assert.notEqual(restored.trials[1]!.simulation,restored.trials[2]!.simulation,'replay reuse must not share mutable trial snapshots');
  const fifth=restartLabRun(restored);assert.equal(trialNumber(fifth),5);assert.equal(fifth.trials.length,4);assert.equal(fifth.run.terminal.minute,120);assert.deepEqual(fifth.analysis.charts,[chart]);assert.equal(labCoachPhase(fifth),null);
  assert.deepEqual(fifth.learning!.trials.map(t=>t.finding),book.learning!.trials.map(t=>t.finding));
  const sameButUnsaved=finished(fifth);sameButUnsaved.notes=Object.fromEntries(['hypothesis','changes','conclusion','limits'].map(k=>[k,'这是一项有充分长度的整场复盘，不能代替本次独立发现和保存。']));
  assert.equal(reportReady(sameButUnsaved),false,'matching command histories cannot make a new trial report-ready');
});

test('resetting keeps unfinished and complete unsaved runs as drafts without promoting them to saved results',()=>{
  let book=afterBaseline();book={...book,run:act(book.run,{kind:'advance',minutes:5})};
  const retry=restartLabRun(finding(book,'刚才想观察另一台设备，暂停后重新设计。'));
  assert.equal(retry.archive.length,1);assert.equal(retry.archive[0]!.finding,'刚才想观察另一台设备，暂停后重新设计。');assert.equal(retry.archive[0]!.run.terminal.minute,125);assert.equal(retry.trials.length,0);assert.equal(labCoachPhase(retry),'trial');
  const next=restartLabRun(finding(finished(retry),'第一次完整试验：等待仍在下游，准备调整闸口。'));
  assert.equal(next.trials.length,0);assert.equal(next.archive.at(-1)!.finding,'第一次完整试验：等待仍在下游，准备调整闸口。');assert.equal(next.archive.at(-1)!.run.terminal.minute,360);assert.equal(labCoachPhase(next),'trial');assert.equal(next.learning!.current.finding,'');
  const saved=submitLabRun(finding(finished(next),'完成后明确保存，才计入对照结果。'));
  const afterSaved=restartLabRun(saved);assert.equal(afterSaved.trials.length,1);assert.equal(labCoachPhase(afterSaved),null);
});

test('a baseline can be reset before any trials, preserving its physical record and chart through export and reload',()=>{
  let book=freshNotebook(11);book.run=act(book.run,{kind:'advance',minutes:5});book.notes.hypothesis='保留整场复盘草稿。';book.attempts=[{minute:125,command:'configure-dispatch',message:'基准保持原配置。'}];
  const chart=newPortAnalysisChart(book.run,'reset-retained-chart',['vehicle-0']);book.analysis.charts=[chart];
  const originalId=book.learning!.current.id,commands=JSON.stringify(book.run.commands),retry=restartLabRun(book);
  assert.equal(retry.run.kind,'baseline');assert.equal(retry.run.terminal.minute,120);assert.equal(retry.baseline,null);assert.equal(retry.trials.length,0);assert.equal(retry.sealedAt,null);assert.deepEqual(retry.attempts,[]);assert.notEqual(retry.learning!.current.id,originalId);assert.equal(retry.notes.hypothesis,book.notes.hypothesis);
  const restored=decodeNotebook(JSON.parse(JSON.stringify(packedNotebook(retry,11))),11);
  assert.deepEqual(restored.analysis.charts,[chart]);assert.equal(restored.archive[0]!.run.terminal.minute,125);assert.equal(restored.archive[0]!.runId,originalId);assert.equal(restored.archive[0]!.finding,'');assert.equal(restored.archive[0]!.attempts[0]!.message,'基准保持原配置。');assert.equal(JSON.stringify(restored.archive[0]!.run.commands),commands);
  assert.equal(book.run.terminal.minute,125);assert.equal(book.archive.length,0);
  const again=restartLabRun(restored);assert.equal(again.run.terminal.minute,120);assert.equal(again.trials.length,0);assert.equal(again.archive.length,2);
});

test('legacy files keep templates, completed results and completion claims without inventing historical findings',()=>{
  let book=afterBaseline();for(let i=0;i<3;i++)book=submitLabRun(finding(finished(book),`旧试验${i}`),i<2);
  book.notes=Object.fromEntries(['hypothesis','changes','conclusion','limits'].map(k=>[k,'这是一份已完成的整场复盘，原有试验记录与结论应保持可读取。']));book.sealedAt='2026-10-18T12:00:00.000Z';
  const old={...packedNotebook(book,11)};delete old.learning;delete (old as Partial<typeof old>).analysis;
  const migrated=decodeNotebook(old,11);assert.equal(migrated.analysis.charts.length,4);assert.equal(migrated.learning!.guide.hidden,true);assert.ok(migrated.learning!.trials.every(t=>t.legacy&&t.finding===''));assert.equal(migrated.sealedAt,book.sealedAt);
  const fourth=restartLabRun(migrated);assert.equal(trialNumber(fourth),4);assert.equal(fourth.learning!.current.legacy,undefined);assert.equal(fourth.trials.length,3);
  assert.throws(()=>submitLabRun(finished(fourth)),/本次实验的发现/);
});

test('findings are tied to their saved run and invalid or forged note claims are rejected',()=>{
  const saved=submitLabRun(finding(finished(afterBaseline()),'本次增加司机，但下游交付仍需验证。'));
  const payload=packedNotebook(saved,11);
  assert.throws(()=>decodeNotebook({...payload,learning:{...payload.learning,trials:[]}},11),/不完整/);
  assert.throws(()=>decodeNotebook({...payload,learning:{...payload.learning,current:{...payload.learning!.current,finding:'被替换的发现'}}},11),/不匹配/);
  assert.throws(()=>decodeNotebook({...payload,learning:{...payload.learning,trials:[{...payload.learning!.trials[0],finding:''}]}},11),/缺少独立/);
  const active=restartLabRun(saved),forged={...packedNotebook(finished(active),11),learning:{...active.learning!,current:saved.learning!.current}};
  // Identical replayed commands can identify the old saved run only if its explicit ID is retained;
  // ordinary creation always receives a fresh ID, as tested above. An impossible ID/command pairing is rejected.
  forged.run={...forged.run,commands:[{kind:'configure-dispatch',value:{...active.run.terminal.setup.dispatch,drivers:3}},{kind:'advance',minutes:360}]} as typeof forged.run;
  assert.throws(()=>decodeNotebook(forged,11),/不匹配/);
});

test('baseline observes first, adds a chart only with records, then pauses for evidence before the final run',()=>{
  let book=freshNotebook(11);
  const commands=JSON.stringify(book.run.commands);
  for(const kind of ['intro','camera','resource','layout'] as const)book=recordLabCoachEvent(book,{kind});
  assert.equal(labCoachState(book,false).current?.id,'run');assert.equal(JSON.stringify(book.run.commands),commands);
  book.run=act(book.run,{kind:'advance',minutes:5});assert.equal(labCoachState(book,false).current?.id,'chart');
  book.analysis.charts=[newPortAnalysisChart(book.run,'first-evidence',['vehicle-0'])];assert.equal(labCoachState(book,false).current?.id,'inspect');
  book=recordLabCoachEvent(book,{kind:'inspect'});assert.equal(labCoachState(book,false).current?.id,'evidence');
  book=recordLabCoachEvent(book,{kind:'evidence'});assert.equal(labCoachState(book,false).current?.id,'finish');
  assert.equal(labCoachState(book,true).completed,3,'finishing observation does not restart tutorial progress');
  book.learning!.guide.hidden=true;const restored=decodeNotebook(packedNotebook(book,11),11);assert.deepEqual(restored.learning!.guide,book.learning!.guide);
  assert.equal(labCoachState(finished(book),false).current?.id,'finding');
});

test('first trial chooses a field, finishes the draft, applies actual staffing, then runs and creates a genuine comparison',()=>{
  let book=afterBaseline();assert.equal(labCoachState(book,false).current?.id,'plan');
  assert.deepEqual(book.learning!.guide,{completed:[],hidden:false,revision:2,topic:'core'});
  book=recordLabCoachEvent(book,{kind:'choose-dispatch',field:'drivers'});assert.equal(labCoachState(book,false).current?.id,'dispatch');
  const draft={...book.run.terminal.setup.dispatch,drivers:3};
  assert.equal(labCoachState(book,false,{draftDispatch:draft,editingDispatch:true}).current?.id,'dispatch-edit');
  assert.equal(labCoachState(book,false,{draftDispatch:draft,editingDispatch:false}).current?.id,'apply');
  assert.equal(labCoachState(book,false,{draftDispatch:{...draft,drivers:NaN}}).current?.id,'invalid-dispatch');
  book.run=act(book.run,{kind:'configure-dispatch',value:draft});assert.equal(labCoachState(book,false).current?.id,'run');
  book.run=act(book.run,{kind:'advance',minutes:5});assert.equal(labCoachState(book,false).current?.id,'chart');
  const chart=newPortAnalysisChart(book.run,'compare-after-observing',['vehicle-0']);book.analysis.charts=[chart];assert.equal(labCoachState(book,false).current?.id,'compare');
  const before=JSON.stringify(book.run.commands);book=recordLabCoachEvent(book,{kind:'chart',chart:{...chart,metric:'occupancy',chart:'line',baseline:true}});
  assert.equal(labCoachState(book,false).current?.id,'compare','event tokens never substitute for an actual saved chart');assert.equal(JSON.stringify(book.run.commands),before);
  book.analysis.charts=[{...chart,metric:'occupancy',chart:'line',baseline:true}];assert.equal(labCoachState(book,false).current?.id,'inspect');
  book=recordLabCoachEvent(recordLabCoachEvent(book,{kind:'inspect'}),{kind:'evidence'});assert.equal(labCoachState(book,false).current?.id,'finish');
  book={...book,run:act(book.run,{kind:'advance',minutes:360})};assert.equal(labCoachState(book,false).current?.id,'review');
  book=recordLabCoachEvent(book,{kind:'review'});assert.equal(labCoachState(book,false).current?.id,'finding');
  book=submitLabRun(finding(book,'司机增加后，交付与等待还需一起比较。'),true);
  assert.equal(labCoachPhase(book),null);assert.equal(labCoachState(book,false).current,null);assert.equal(labGuideVisible(book),false);
  book=recordLabCoachEvent(book,{kind:'help',topic:'window'});assert.equal(labGuideVisible(book),true);assert.equal(labCoachState(book,false).current?.id,'help-window');
  book=recordLabCoachEvent(book,{kind:'help',topic:'core'});assert.equal(labGuideVisible(book),false);
});

const ui:LabCoachUI={editorOpen:false,editorMetric:'state',editorChart:'timeline',editorBaseline:false,pointAvailable:true,seriesHidden:false,inspectionVisible:true,settingsAvailable:true,chartAvailable:true};
test('skipping staffing recovers from the actual locked state and allows an explicit unchanged repeat',()=>{
  let book=afterBaseline();book.run=act(book.run,{kind:'advance',minutes:5});
  const step=labCoachState(book,false).current;assert.equal(step?.id,'recover-dispatch');assert.deepEqual(step?.targets,['lab:reset']);
  book=recordLabCoachEvent(book,{kind:'unchanged'});assert.equal(labCoachState(book,false).current?.id,'chart');
  const retry=restartLabRun(book);assert.equal(labCoachState(retry,false).current?.id,'plan');assert.equal(retry.archive.at(-1)!.run.terminal.minute,125);
  const saved=submitLabRun(finding(finished(book),'同配置重复验证，未发生岗位变化。'));assert.equal(labCoachState(saved,false).current,null);
});

test('hidden or absent points, closed settings and refreshed evidence always have reachable recovery targets',()=>{
  let book=freshNotebook(11);book.run=act(book.run,{kind:'advance',minutes:5});book.analysis.charts=[newPortAnalysisChart(book.run,'recovery',['vehicle-0'])];
  const inspect=labCoachState(book,false).current;
  assert.equal(resolveLabCoachStep(inspect,{...ui,pointAvailable:false,seriesHidden:true})?.id,'restore-series');
  assert.deepEqual(resolveLabCoachStep(inspect,{...ui,pointAvailable:false,seriesHidden:true})?.targets,['lab:legend-restore']);
  assert.equal(resolveLabCoachStep(inspect,{...ui,pointAvailable:false})?.id,'inspect-numbers');
  book=recordLabCoachEvent(book,{kind:'inspect'});assert.equal(resolveLabCoachStep(labCoachState(book,false).current,{...ui,inspectionVisible:false})?.id,'evidence-reopen');
  book=recordLabCoachEvent(book,{kind:'help',topic:'window'});assert.deepEqual(resolveLabCoachStep(labCoachState(book,false).current,{...ui,editorOpen:true,advancedOpen:false})?.targets,['lab:chart-advanced']);
  assert.deepEqual(resolveLabCoachStep(labCoachState(book,false).current,{...ui,editorOpen:true,advancedOpen:true})?.targets,['lab:chart-window','lab:chart-bin']);
  const trial=afterBaseline();trial.run=act(trial.run,{kind:'configure-dispatch',value:{...trial.run.terminal.setup.dispatch,drivers:3}});trial.run=act(trial.run,{kind:'advance',minutes:5});trial.analysis.charts=[newPortAnalysisChart(trial.run,'comparison',['vehicle-0'])];
  const full={...trial,analysis:{...trial.analysis,charts:Array.from({length:12},(_,i)=>({...trial.analysis.charts[0]!,id:`chart-${i}`}))}};
  assert.deepEqual(labCoachState(full,false).current?.targets,['lab:chart-settings'],'a full analysis desk edits an existing chart instead of requesting an impossible addition');
  const fullHelp=recordLabCoachEvent(full,{kind:'help',topic:'charts'});assert.deepEqual(labCoachState(fullHelp,false).current?.targets,['lab:chart-settings']);
  const compare=labCoachState(trial,false).current;assert.equal(resolveLabCoachStep(compare,{...ui,editorOpen:true})?.id,'compare-metric');
  assert.equal(resolveLabCoachStep(compare,{...ui,editorOpen:true,editorMetric:'occupancy'})?.id,'compare-baseline');
  assert.equal(resolveLabCoachStep(compare,{...ui,editorOpen:true,editorMetric:'occupancy',editorBaseline:true})?.id,'compare-save');
});

test('legacy click counters cannot precomplete the new evidence steps and entry states clearly distinguish new and resumed practice',()=>{
  const book=freshNotebook(11),old=packedNotebook(book,11);old.learning!.guide={completed:['intro','camera','dispatch','inspect'],hidden:false};
  const restored=decodeNotebook(old,11);assert.deepEqual(restored.learning!.guide.completed,[]);assert.equal(labCoachState(restored,false).current?.id,'run');
  const start=renderToStaticMarkup(<PortLabEntry book={book} hasSaved={false} onFresh={()=>{}} onResume={()=>{}}/>);assert.match(start,/从基准开始新练习/);assert.doesNotMatch(start,/继续本机场次/);
  const resume=renderToStaticMarkup(<PortLabEntry book={afterBaseline()} hasSaved onFresh={()=>{}} onResume={()=>{}}/>);assert.match(resume,/继续本机场次/);assert.match(resume,/试验 1/);assert.match(resume,/已保存基准/);
  const stages=renderToStaticMarkup(<PortLabLearning book={afterBaseline()} onGuide={()=>{}} onHide={()=>{}} onFresh={()=>{}}/>);assert.match(stages,/首次验证/);assert.match(stages,/按需学习更多功能/);assert.doesNotMatch(stages,/teachingCue|assistantCue/);
});
