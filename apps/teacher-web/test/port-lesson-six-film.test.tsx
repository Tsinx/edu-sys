import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LESSON_SIX_AUDIO,LESSON_SIX_FILM_SCRIPTS,getLessonSixFilm,lessonSixFilmDuration,lessonSixFilmElapsed,lessonSixFilmFrame,lessonSixFilmCamera,lessonSixStateValid,PORT_LESSON_SIX_SLIDES as pages} from '@edu/course-content';
import {PortLessonSixFilm} from '../src/features/port-lesson-six/PortLessonSixFilm';
import {places,LESSON_SIX_GLOBE_ROUTES} from '../src/features/port-lesson-six/lesson-six-geography';
test('12 authored films have real hashed audio and coherent timing',()=>{
 assert.deepEqual(Object.keys(LESSON_SIX_FILM_SCRIPTS).map(Number),[25,26,27,29,31,32,33,34,35,36,37,38]);
 for(const [id,a] of Object.entries(LESSON_SIX_AUDIO)){const b=readFileSync(new URL('../public'+a.src,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256,id);assert.equal((b.length-44)/48,a.durationMs);}
 for(const n of Object.keys(LESSON_SIX_FILM_SCRIPTS).map(Number)){
  const f=getLessonSixFilm(n,n===33?2:n===29?1:0)!,d=lessonSixFilmDuration(f);assert.ok(d>=35000&&d<=(n===26?60000:55000),`${n}: ${d}`);
  for(const shot of f.shots){assert.equal(createHash('sha256').update(shot.narration).digest('hex'),LESSON_SIX_AUDIO[shot.id]!.textSha256);for(const id of shot.nodes)assert.ok(places[id],id);for(const id of shot.routes)assert.ok(LESSON_SIX_GLOBE_ROUTES.some(r=>r.id===id),id);}
  for(const t of [0,d*.33,d*.66,d]){const frame=lessonSixFilmFrame(f,t),camera=lessonSixFilmCamera(f,t);assert.ok(frame.localMs>=0&&frame.localMs<=frame.duration);assert.ok(Object.values(camera).every(Number.isFinite));}
 }
});
test('one clock determines seek, pause, late join and terminal hold',()=>{
 const f=getLessonSixFilm(31)!,d=lessonSixFilmDuration(f),state={clipId:f.id,status:'playing' as const,elapsedMs:1000,startedAt:100000,runId:'run-1'};
 assert.equal(lessonSixFilmElapsed(f,state,102500),3500);assert.equal(lessonSixFilmElapsed(f,{...state,status:'paused',startedAt:null},190000),1000);assert.equal(lessonSixFilmElapsed(f,state,100000+d),d);
 for(let ms=1;ms<d;ms+=33){const a=lessonSixFilmCamera(f,ms-1),b=lessonSixFilmCamera(f,ms);assert.ok(Math.abs(a.longitude-b.longitude)<.05);assert.ok(Math.abs(a.distance-b.distance)<.01);}
});
test('quiz answers have separate clips and never enter unrevealed canvas',()=>{
 const page=pages[37]!,f=getLessonSixFilm(38,0,false)!,answer=getLessonSixFilm(38,0,true)!;assert.notEqual(f.id,answer.id);
 const words=['重庆果园港','青岛港','上海港','宁波舟山港'];for(const s of f.shots)for(const word of words)assert.ok(!s.narration.includes(word));
 for(const progress of [0,.25,.5,.75,1]){const html=renderToStaticMarkup(<PortLessonSixFilm page={page} state={{progress,revealed:false,option:0}}/>);for(const word of words)assert.ok(!html.includes(word));assert.doesNotMatch(html,/38-answer|teachingCue|assistantCue|storyBeat|voyageStage/);}
 const base={progress:0,option:0,revealed:false,cinematic:{clipId:answer.id,status:'paused' as const,elapsedMs:0,startedAt:null,runId:'run'}};assert.equal(lessonSixStateValid(page,base),false);assert.equal(lessonSixStateValid(page,{...base,revealed:true}),true);
 assert.equal(lessonSixStateValid(pages[0]!,base),false);assert.equal(lessonSixStateValid(page,{...base,revealed:true,cinematic:{...base.cinematic,elapsedMs:1e9}}),false);
});
