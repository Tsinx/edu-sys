import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyPortClassLabCommand as act, createPortClassLab, type PortClassLab } from '@edu/port-simulation-core';
import { currentTrialSaved, decodeNotebook, freshNotebook, packedNotebook, reportReady, restartLabRun, submitLabRun, trialNumber, type Notebook } from '../src/features/port-simulation/port-class-notebook';
import { labCoachPhase, labCoachState, recordLabCoachEvent } from '../src/features/port-simulation/port-lab-coach';
import { newPortAnalysisChart } from '../src/features/port-simulation/port-analysis-config';
import { PortLabCoach } from '../src/features/port-simulation/PortLabCoach';

let baseline:PortClassLab,trial:PortClassLab;
const finished=(book:Notebook):Notebook=>({...book,run:book.run.kind==='baseline'?(baseline??=act(createPortClassLab(11),{kind:'advance',minutes:360})):(trial??=act(createPortClassLab(11,'trial'),{kind:'advance',minutes:360}))});
const finding=(book:Notebook,text:string):Notebook=>({...book,learning:{...book.learning!,current:{...book.learning!.current,finding:text}}});
function afterBaseline(){return submitLabRun(finding(finished(freshNotebook(11)),'基准发现：车辆接续等待，先验证增加司机的影响。'),true);}

test('new lesson 11 starts empty with a hands-on baseline guide; lesson 12 retains its four diagnostic templates',()=>{
  const book=freshNotebook(11);assert.deepEqual(book.analysis.charts,[]);assert.equal(labCoachPhase(book),'baseline');assert.equal(labCoachState(book,false).current?.id,'intro');
  const twelve=freshNotebook(12);assert.equal(twelve.analysis.charts.length,4);assert.equal(twelve.learning,undefined);assert.equal(labCoachPhase(twelve),null);
  const restored=decodeNotebook(packedNotebook(book,11),11);assert.deepEqual(restored.analysis.charts,[]);assert.equal(restored.learning!.current.id,book.learning!.current.id);
  const html=renderToStaticMarkup(<PortLabCoach book={book} playing={false} root={{current:null}} onEvent={()=>{throw Error('render must not operate the simulator');}} onHide={()=>{}}/>);
  assert.match(html,/data-lab-coach-step="intro"/);assert.match(html,/已了解，开始操作/);assert.match(html,/暂时关闭实验引导/);assert.doesNotMatch(html,/自动完成|teachingCue|assistantCue/);
});

test('baseline, every trial submission and an unfinished restart require that run’s brief finding',()=>{
  const empty=finished(freshNotebook(11));assert.throws(()=>submitLabRun(empty,true),/本次实验的发现/);assert.throws(()=>submitLabRun(finding(empty,' \n '),true),/本次实验的发现/);
  let book=afterBaseline();assert.equal(book.learning!.current.finding,'');assert.equal(book.learning!.baseline!.finding,'基准发现：车辆接续等待，先验证增加司机的影响。');
  assert.throws(()=>restartLabRun(book),/本次实验的发现/);
  book=finished(book);assert.throws(()=>submitLabRun(book),/本次实验的发现/);assert.throws(()=>submitLabRun(book,true),/本次实验的发现/);assert.throws(()=>restartLabRun(book),/本次实验的发现/);
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

test('restarting an unfinished trial retains its reason; restarting a complete unsaved trial first saves its result and finding',()=>{
  let book=afterBaseline();book={...book,run:act(book.run,{kind:'advance',minutes:5})};
  const retry=restartLabRun(finding(book,'刚才想观察另一台设备，暂停后重新设计。'));
  assert.equal(retry.archive.length,1);assert.equal(retry.archive[0]!.finding,'刚才想观察另一台设备，暂停后重新设计。');assert.equal(retry.archive[0]!.run.terminal.minute,125);assert.equal(retry.trials.length,0);assert.equal(labCoachPhase(retry),'trial');
  const next=restartLabRun(finding(finished(retry),'第一次完整试验：等待仍在下游，准备调整闸口。'));
  assert.equal(next.trials.length,1);assert.equal(next.learning!.trials[0]!.finding,'第一次完整试验：等待仍在下游，准备调整闸口。');assert.equal(labCoachPhase(next),null);assert.equal(next.learning!.current.finding,'');
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

test('guided actions persist through refresh; comparison needs a supported chart, and only baseline and trial one are guided',()=>{
  let book=freshNotebook(11);book=recordLabCoachEvent(book,{kind:'intro'});book=recordLabCoachEvent(book,{kind:'camera'});assert.equal(labCoachState(book,false).current?.id,'resource');
  book.learning!.guide.hidden=true;const restored=decodeNotebook(packedNotebook(book,11),11);assert.deepEqual(restored.learning!.guide,book.learning!.guide);
  book=submitLabRun(finding(finished(book),'基准等待主要出现在接车环节。'),true);assert.equal(labCoachPhase(book),'trial');assert.deepEqual(book.learning!.guide,{completed:[],hidden:false});
  const originalCommands=JSON.stringify(book.run.commands),config=newPortAnalysisChart(book.run,'first-comparison',['vehicle-0']);
  book=recordLabCoachEvent(book,{kind:'chart',chart:config});assert.ok(!book.learning!.guide.completed.includes('compare'));
  book=recordLabCoachEvent(book,{kind:'chart',chart:{...config,metric:'occupancy',chart:'bar',baseline:true,window:'recent30'}});assert.ok(book.learning!.guide.completed.includes('compare'));assert.ok(book.learning!.guide.completed.includes('window'));assert.equal(JSON.stringify(book.run.commands),originalCommands,'guidance never operates the simulation');
  book=submitLabRun(finding(finished(book),'已完成第一次试验，后续独立验证。'),true);assert.equal(labCoachPhase(book),null);assert.equal(labCoachState(book,false).steps.length,0);assert.equal(recordLabCoachEvent(book,{kind:'camera'}),book);
});

test('an early finish moves the coach to findings, and a saved first trial never points at locked staffing controls',()=>{
  assert.equal(labCoachState(finished(freshNotebook(11)),false).current?.id,'finding');
  const first=finished(afterBaseline());assert.equal(labCoachState(first,false).current?.id,'finding');
  const saved=submitLabRun(finding(first,'提前运行到终点后，仍先记录结果，再决定下一项验证。'));
  assert.equal(labCoachPhase(saved),null);assert.equal(labCoachState(saved,false).current,null);
});
