import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortClassLab, portStudentView, physicalPhaseProgress } from '@edu/port-simulation-core';
import { PortLabPlaybackControls } from '../src/features/port-simulation/PortLabPlaybackControls';
import { PortLabLiveOperations } from '../src/features/port-simulation/PortLabLiveOperations';
import type { usePortLabPlayback } from '../src/features/port-simulation/usePortLabPlayback';

test('each laboratory exposes continuous targets, six speeds, pause and a separate fast calculation panel',()=>{
  for(const lesson of [11,12] as const){
    const run=createPortClassLab(lesson);
    const playback={playing:true,targetSecond:run.simulation!.second+300,fromSecond:run.simulation!.second,reason:'idle',generation:1,speed:30,setSpeed:()=>{},start:()=>{},resume:()=>{},pause:()=>{},reset:()=>{}} satisfies ReturnType<typeof usePortLabPlayback>;
    const html=renderToStaticMarkup(<PortLabPlaybackControls playback={playback} run={run} finished={false} pendingDispatch={false} onAdvance={()=>{}} onQuickCalculate={()=>{}}/>);
    assert.match(html,/暂停推进/);assert.match(html,/到第\d+分00秒自动暂停/);
    assert.equal((html.match(/<option /g)??[]).length,6);
    assert.match(html,/<details[^>]*><summary>快算 · 跳过过程画面<\/summary>/);
    assert.doesNotMatch(html,/<details[^>]*\bopen/);
    assert.match(html,/<button[^>]*disabled=""[^>]*>快算 5 分钟/);
    assert.doesNotMatch(html,/teachingCue|assistantCue/);
  }
});

test('live equipment progress is the actual kernel phase fraction, including empty and loaded vehicle poses',()=>{
  for(const lesson of [11,12] as const){
    const view=portStudentView(createPortClassLab(lesson).simulation!);
    const html=renderToStaticMarkup(<PortLabLiveOperations view={view} onFocus={()=>{}}/>);
    for(const kind of ['quay','truck','yard','gate']){
      const jobs=view.jobs.filter(job=>job.kind===kind),job=jobs.find(job=>job.rate>0)??jobs[0];
      if(job){assert.ok(html.includes(job.boxId));assert.ok(html.includes(`${Math.round(physicalPhaseProgress(job,view.second)*100)}%`));}
    }
    assert.doesNotMatch(html,/NaN|Infinity|undefined|teachingCue|assistantCue/);
  }
});
