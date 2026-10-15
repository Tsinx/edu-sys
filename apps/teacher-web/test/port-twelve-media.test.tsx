import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PORT_TWELVE_FILM,PORT_TWELVE_ILLUSTRATIONS,PORT_LESSON_ELEVEN_SLIDES,PORT_LESSON_TWELVE_SLIDES,expansionStateValid,expansionTiming,expansionDiagramSummary,portOpeningFilm} from '@edu/course-content';
import {PortAdvancedComposition} from '../src/features/port-expansion/PortAdvancedComposition';
test('lecture 12 civic learning uses accountable work and honestly labelled scenes without hiding case evidence',()=>{
 assert.equal(Object.keys(PORT_TWELVE_ILLUSTRATIONS).length,15);
 for(const [key,asset]of Object.entries(PORT_TWELVE_ILLUSTRATIONS)){
  const page=PORT_LESSON_TWELVE_SLIDES.find(p=>p.slideKey===key)!;assert.ok(page);assert.ok(existsSync(resolve('public'+asset.src)));
  const html=renderToStaticMarkup(<PortAdvancedComposition page={page} state={{progress:1,option:0,revealed:false}}/>);
  assert.ok(html.includes(asset.alt));assert.ok(html.includes(page.title));assert.match(html,/AI教学示意|AI场景|许可实拍/);assert.doesNotMatch(html,/teachingCue|assistantCue|storyBeat|voyageStage|data-slide-composition/);
  for(const row of page.rows??[])for(const cell of row)assert.ok(html.includes(cell),key+': '+cell);
  assert.doesNotMatch(renderToStaticMarkup(<PortAdvancedComposition page={page} state={{progress:0,option:0,revealed:false}}/>),/class="ps-scene-callout"/);
 }
 assert.match(PORT_LESSON_TWELVE_SLIDES[0]!.teachingCue,/0—3分钟/);assert.match(PORT_LESSON_TWELVE_SLIDES[0]!.teachingCue,/不以复述口号/);
 assert.equal(expansionTiming(12).reduce((n,t)=>n+t.minutes,0),90);assert.equal(expansionTiming(12)[0]!.minutes,8);
});
test('independent lecture 12 film has a full 180-second original script and cannot control other pages or lecture 11',()=>{
 const film=JSON.parse(readFileSync(resolve('public/course-assets/port-management/l12-media/storyboard.json'),'utf8'));
 assert.equal(PORT_TWELVE_FILM.durationMs,180000);assert.equal(film.duration,180);assert.equal(film.shots.length,18);let end=0;
 for(const shot of film.shots){assert.equal(shot.from,end);assert.ok(shot.narration.length>20);assert.ok(shot.to>shot.from);end=shot.to;}assert.equal(end,180);
 const page=PORT_LESSON_TWELVE_SLIDES[0]!,state={progress:.5,option:0,revealed:false,cinematic:{clipId:'l12-opening-v2' as const,status:'playing' as const,elapsedMs:90000,startedAt:Date.now()}};
 assert.equal(portOpeningFilm(page.slideKey),PORT_TWELVE_FILM);assert.ok(expansionStateValid(page,state));assert.match(expansionDiagramSummary(page,state),/放行之前/);
 for(const p of [...PORT_LESSON_TWELVE_SLIDES.slice(1),...PORT_LESSON_ELEVEN_SLIDES])assert.equal(expansionStateValid(p,state),false);
 assert.equal(expansionStateValid(page,{...state,cinematic:{...state.cinematic,clipId:'l11-opening-v2'}}),false);
 for(const elapsedMs of [-1,180001,NaN])assert.equal(expansionStateValid(page,{...state,cinematic:{...state.cinematic,elapsedMs}}),false);
 assert.doesNotMatch(film.shots.map(s=>s.narration).join(''),/隔离R3|隔离R4|保证.*安全|允许.*现场复工/);
});
