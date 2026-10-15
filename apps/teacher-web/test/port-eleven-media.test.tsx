import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PORT_ELEVEN_FILM,PORT_ELEVEN_ILLUSTRATIONS,PORT_LESSON_ELEVEN_SLIDES,PORT_LESSON_TWELVE_SLIDES,expansionStateValid,expansionDiagramSummary,expansionTiming} from '@edu/course-content';
import {PortAdvancedComposition} from '../src/features/port-expansion/PortAdvancedComposition';
test('lecture 11 illustrations keep scene and historic evidence distinct, with intact authored content',()=>{
 assert.equal(Object.keys(PORT_ELEVEN_ILLUSTRATIONS).length,14);
 for(const [key,asset]of Object.entries(PORT_ELEVEN_ILLUSTRATIONS)){
  const page=PORT_LESSON_ELEVEN_SLIDES.find(p=>p.slideKey===key)!;assert.ok(page,key);assert.ok(existsSync(resolve('public'+asset.src)),asset.src);
  const html=renderToStaticMarkup(<PortAdvancedComposition page={page} state={{progress:1,option:0,revealed:false}}/>);
  assert.ok(html.includes(asset.alt));assert.match(html,/AI教学示意|AI场景|许可实拍/);assert.ok(html.includes(page.title));
  assert.doesNotMatch(html,/teachingCue|assistantCue|storyBeat|voyageStage|data-slide-composition/);
  if(page.rows)for(const row of page.rows)for(const cell of row)assert.ok(html.includes(cell),key+': '+cell);
  const hidden=renderToStaticMarkup(<PortAdvancedComposition page={page} state={{progress:0,option:0,revealed:false}}/>);
  assert.doesNotMatch(hidden,/class="ps-scene-callout"/,key+': hidden annotation');
 }
 assert.equal(expansionTiming(11).reduce((s,b)=>s+b.minutes,0),90);
 assert.equal(expansionTiming(11)[0]!.minutes,8);
});
test('opening film is exactly 3 minutes, fully scripted and confined to its first page',()=>{
 const film=JSON.parse(readFileSync(resolve('public/course-assets/port-management/l11-media/storyboard.json'),'utf8'));
 assert.equal(PORT_ELEVEN_FILM.durationMs,180000);assert.equal(film.duration,180);assert.equal(film.shots.length,18);
 let end=0;for(const shot of film.shots){assert.equal(shot.from,end);assert.ok(shot.to>shot.from);assert.ok(shot.narration.length>20);end=shot.to;}assert.equal(end,180);
 const page=PORT_LESSON_ELEVEN_SLIDES[0]!,state={progress:.5,option:0,revealed:false,cinematic:{clipId:'l11-opening-v2' as const,status:'playing' as const,elapsedMs:90000,startedAt:Date.now()}};
 assert.ok(expansionStateValid(page,state));assert.match(expansionDiagramSummary(page,state),/90秒/);assert.match(expansionDiagramSummary(page,state),/不证明学生已观看/);
 for(const other of [...PORT_LESSON_ELEVEN_SLIDES.slice(1),...PORT_LESSON_TWELVE_SLIDES])assert.equal(expansionStateValid(other,state),false);
 for(const elapsedMs of [-1,180001,NaN])assert.equal(expansionStateValid(page,{...state,cinematic:{...state.cinematic,elapsedMs}}),false);
 assert.equal(expansionStateValid(page,{...state,cinematic:{...state.cinematic,status:'paused',startedAt:Date.now()}}),false);
});
