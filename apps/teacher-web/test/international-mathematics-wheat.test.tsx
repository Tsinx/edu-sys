import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {
 INTERNATIONAL_MATHEMATICS_DEFINITIONS,getInternationalMathematicsInteractionDefaults,
 validateInternationalMathematicsInteractionPatch,wheatCounts,wheatSquareAt,wheatTimeForSquare,
 WHEAT_STORY_DURATION_MS,WHEAT_STORY_MARKS
} from '@edu/course-content/international-mathematics';
import {WheatChessboardStory} from '../src/features/international-mathematics/WheatChessboardStory';

test('all 64 exact grain totals equal the sum of the earlier squares, including beyond safe Number precision',()=>{
 let sum=0n;
 for(let n=1;n<=64;n++){
  const counts=wheatCounts(n);sum+=counts.onSquare;
  assert.equal(counts.total,sum);
  if(n>1)assert.equal(counts.onSquare,wheatCounts(n-1).onSquare*2n);
 }
 assert.equal(wheatCounts(64).onSquareText,'9,223,372,036,854,775,808');
 assert.equal(wheatCounts(64).totalText,'18,446,744,073,709,551,615');
 for(const n of [0,65,1.5,NaN])assert.throws(()=>wheatCounts(n),RangeError);
});

test('chapter jumps, square stepping and timeline scrubbing refer to the same deterministic square',()=>{
 assert.equal(WHEAT_STORY_DURATION_MS,90_000);
 for(let n=1;n<=64;n++)assert.equal(wheatSquareAt(wheatTimeForSquare(n)),n);
 let last=1;
 for(let t=0;t<=90_000;t+=100){const n=wheatSquareAt(t);assert.ok(n>=last&&n<=64);last=n;}
 assert.equal(wheatSquareAt(-1),1);assert.equal(wheatSquareAt(NaN),1);assert.equal(wheatSquareAt(1e9),64);
 assert.equal(wheatSquareAt(WHEAT_STORY_MARKS.find(m=>m.label==='Half the board')!.atMs),32);
 assert.equal(wheatSquareAt(76_000),64);
});

test('Lecture 4 keeps its keys and page count and reuses the validated classroom playback contract',()=>{
 const lesson=INTERNATIONAL_MATHEMATICS_DEFINITIONS[3]!,story=lesson.slides[1]!;
 assert.equal(lesson.slides.length,76);
 assert.equal(story.slideKey,'im-l04-02-a');
 assert.equal(story.storyAnimation,'wheat-chessboard');
 const defaults=getInternationalMathematicsInteractionDefaults(story.slideKey)!;
 assert.equal(defaults.playing,false);assert.equal(defaults.positionMs,0);
 assert.ok(validateInternationalMathematicsInteractionPatch(story.slideKey,{playing:true,positionMs:56_000,anchorMs:100_000,runId:'story-test'}));
 for(const positionMs of [-1,90_001,NaN,Infinity])assert.equal(validateInternationalMathematicsInteractionPatch(story.slideKey,{positionMs}),false);
 assert.equal(validateInternationalMathematicsInteractionPatch(story.slideKey,{anchorMs:-1}),false);
 assert.equal(validateInternationalMathematicsInteractionPatch(story.slideKey,{answer:'private'}),false);
 assert.equal(lesson.slides.filter(s=>s.openingFilm).length,1);
});

test('the public story renders all squares and exact counts without teacher controls or author metadata',()=>{
 for(const positionMs of [0,18_500,54_875,76_000,90_000]){
  const markup=renderToStaticMarkup(<WheatChessboardStory positionMs={positionMs}/>);
  const n=wheatSquareAt(positionMs),counts=wheatCounts(n);
  assert.ok(markup.includes(`${counts.onSquareText} grains on square ${n}`));
  assert.ok(markup.includes(`${counts.totalText} grains in total`));
  assert.ok(markup.includes('A TRADITIONAL LEGEND'));
  assert.ok(markup.includes('Piles are symbolic. Counts are exact.'));
  assert.doesNotMatch(markup,/<button|<input|<select|teachingCue|assistantCue|pedagogy|data-teach|[\u4e00-\u9fff]/);
 }
});
