import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,statSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PORT_LESSON_THIRTEEN_SLIDES as thirteen,PORT_LESSON_FOURTEEN_SLIDES as fourteen,PORT_TRADE_FILMS,PORT_TRADE_SOURCES,bondedComparison,tradeReadiness,expansionStateValid,expansionDiagramSummary} from '@edu/course-content';
import {PortExpansionComposition} from '../src/features/port-expansion/PortExpansionComposition';

test('trade readiness compares parallel conditions without summing their waiting times',()=>{
 assert.deepEqual([0,1,2].map(i=>tradeReadiness(i).gateOut),[14.5,12.5,12.5]);
 assert.equal(tradeReadiness(0).factory,17.5);
 for(const option of [-1,3,.5,NaN])assert.throws(()=>tradeReadiness(option));
});
test('bonded comparisons include daily incremental cost and a rate change can reverse the decision',()=>{
 const expected=[-2424.66,1150.68,4726.03,-2136.99];
 expected.forEach((n,i)=>assert.ok(Math.abs(bondedComparison(i).net-n)<.005));
 assert.ok(Math.abs(bondedComparison(1).breakEven!-50.344827586)<1e-6);
 assert.equal(bondedComparison(2).cost,15000);assert.equal(bondedComparison(3).cost,12000);
 for(const option of [-1,4,.5,NaN])assert.throws(()=>bondedComparison(option));
});
test('72 authored pages retain sources, distinct seven Chongqing areas and public evidence boundaries',()=>{
 assert.equal(thirteen.length,32);assert.equal(fourteen.length,40);
 const visible=fourteen.map(p=>[p.title,p.lead,...p.points,...(p.rows??[]).flat(),...(p.labels??[])].join(' ')).join('\n');
 for(const area of ['两路果园港','西永','江津','涪陵','万州','永川','国际铁路港'])assert.ok(visible.includes(area));
 for(const p of [...thirteen,...fourteen]){
  assert.ok(PORT_TRADE_SOURCES[p.source as keyof typeof PORT_TRADE_SOURCES]);
  assert.doesNotMatch([p.title,p.lead,...p.points,...(p.rows??[]).flat(),...(p.labels??[])].join(' '),/让学生|告诉学生|teachingCue|assistantCue/);
  const hidden={progress:0,option:0,revealed:false};assert.match(expansionDiagramSummary(p,hidden),/尚未展开/);
  const markup=renderToStaticMarkup(<PortExpansionComposition page={p} state={{progress:1,option:0,revealed:false}}/>);
  assert.ok(!markup.includes(p.teachingCue));assert.ok(!markup.includes(p.assistantCue));if(p.reveal)assert.ok(!markup.includes(p.reveal));
 }
});
test('four brief news edits have local video, native poster, observation captions and source edit records',()=>{
 const base=new URL('../public/course-assets/port-management/trade-media/',import.meta.url),edl=JSON.parse(readFileSync(new URL('edl.json',base),'utf8'));
 assert.equal(edl.length,4);
 for(const p of [...thirteen,...fourteen].filter(p=>p.mediaId)){
  const f=PORT_TRADE_FILMS[p.mediaId!],record=edl.find((e:{id:string})=>f.src.endsWith('/'+e.id+'.mp4'));
  assert.equal(record.duration*1000,f.durationMs);assert.ok(record.seconds<60);assert.match(record.sourcePage,/^https:\/\/tv.cctv.com\//);
  for(const suffix of ['.mp4','.jpg','.vtt'])assert.ok(statSync(new URL(record.id+suffix,base)).size>100);
  assert.equal(expansionStateValid(p,{progress:0,option:0,revealed:false,cinematic:{clipId:f.id,status:'paused',elapsedMs:f.durationMs,startedAt:null}}),true);
  assert.equal(expansionStateValid(p,{progress:0,option:0,revealed:false,cinematic:{clipId:f.id,status:'paused',elapsedMs:f.durationMs+1,startedAt:null}}),false);
 }
});
