import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {performancePerspective,sampleDeliverySummary,safetyEvidenceGate,PERFORMANCE_CASE,PORT_LESSON_ELEVEN_SLIDES,PORT_LESSON_TWELVE_SLIDES,expansionDiagramSummary} from '@edu/course-content';
import {PortExpansionComposition} from '../src/features/port-expansion/PortExpansionComposition';
test('performance comparisons separate weighting, sample evidence and necessary safety conditions',()=>{
 assert.deepEqual([0,1,2].map(i=>[performancePerspective(i).A,performancePerspective(i).B]),[[77.5,65],[65,70],[52.5,75]]);
 const [a,b]=PERFORMANCE_CASE.samples.map(x=>sampleDeliverySummary(x,4));assert.equal(a!.mean,b!.mean);assert.equal(a!.late,1);assert.equal(b!.late,0);assert.equal(a!.max,8);
 for(const i of [0,2]){assert.equal(safetyEvidenceGate(i).readyForAuthorizedReview,false);assert.equal(safetyEvidenceGate(i).missing.length,1);}
 assert.equal(safetyEvidenceGate(1).readyForAuthorizedReview,true);
 for(const f of [performancePerspective,safetyEvidenceGate])for(const n of [-1,3,NaN,.5])assert.throws(()=>f(n));
 assert.throws(()=>sampleDeliverySummary([],4));assert.throws(()=>sampleDeliverySummary([2,NaN],4));
 assert.equal(PORT_LESSON_ELEVEN_SLIDES[0]!.index,486);assert.equal(PORT_LESSON_TWELVE_SLIDES.at(-1)!.index,549);
});
test('new evidence stays labelled and disclosed answers stay outside hidden contexts',()=>{
 for(const page of [...PORT_LESSON_ELEVEN_SLIDES,...PORT_LESSON_TWELVE_SLIDES]){
  assert.match(page.narrative.publicLabel,/教学情境|概念图解|公开资料/);
  const hidden={progress:0,option:0,revealed:false};assert.match(expansionDiagramSummary(page,hidden),/尚未展开/);
  if(page.options)for(let option=0;option<page.options.length;option++){const s={progress:1,option,revealed:false};const html=renderToStaticMarkup(<PortExpansionComposition page={page} state={s}/>);assert.ok(html.includes(page.options[option]!));assert.doesNotMatch(html,/teachingCue|assistantCue|storyBeat|voyageStage/);}
 }
});
