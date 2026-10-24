import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PORT_LESSON_SEVENTEEN_SLIDES as pages,PORT_QUEUE_FILMS,queueStartConditions,queueJobs,runQueue,expansionStateValid,expansionDiagramSummary} from '@edu/course-content';
import {portExpansionPresentationSchema} from '@edu/contracts';
import {PortQueueComposition} from '../src/features/port-expansion/PortQueueComposition';
import {PortTradeFilm} from '../src/features/port-expansion/PortTradeFilm';

test('the opening-condition cases explain resource waiting and vehicle waiting with gated public conclusions',()=>{
 const page=pages[4]!;
 assert.equal(page.visual,'queue-gates');assert.equal(page.options?.length,2);
 assert.deepEqual(queueStartConditions(0),{arrival:1,available:4,start:4,wait:3,idle:0});
 assert.deepEqual(queueStartConditions(1),{arrival:5,available:3,start:5,wait:0,idle:2});
 for(const option of [0,1]){
  const before=renderToStaticMarkup(<PortQueueComposition page={page} state={{option,progress:0,revealed:false}}/>);
  const during=renderToStaticMarkup(<PortQueueComposition page={page} state={{option,progress:2/3,revealed:false}}/>);
  const after=renderToStaticMarkup(<PortQueueComposition page={page} state={{option,progress:1,revealed:false}}/>);
  assert.doesNotMatch(before,/class="katex"|两项条件都满足/);assert.match(during,/两项条件都满足/);assert.doesNotMatch(during,/class="katex"/);assert.match(after,/class="katex"/);
  assert.match(expansionDiagramSummary(page,{option,progress:0,revealed:false}),/尚未展开/);
  assert.match(expansionDiagramSummary(page,{option,progress:2/3,revealed:false}),option===0?/4分钟开工；本车等待3分钟/:/5分钟开工；本车等待0分钟/);
  assert.doesNotMatch(after,/teachingCue|assistantCue|storyBeat|让学生|告诉学生/);
 }
});
test('the authored film has accurate scene records, chapters, captions and registered playback boundaries',()=>{
 const base=new URL('../public/course-assets/port-management/queue-media/',import.meta.url),edl=JSON.parse(readFileSync(new URL('queue-explainer-edl.json',base),'utf8'));
 const film=PORT_QUEUE_FILMS['l17-queue-explainer'],page=pages[3]!;
 assert.equal(page.mediaId,film.id);assert.equal(page.visual,'queue-film');assert.equal(edl.shots.length,10);assert.equal(edl.duration*1000,film.durationMs);assert.deepEqual(edl.size,[1600,1000]);
 assert.equal(createHash('sha256').update(readFileSync(new URL('queue-explainer.mp4',base))).digest('hex'),edl.videoSha256);
 const jobs=queueJobs([0,1,1,4,10]),baseRows=runQueue(jobs),slow=runQueue(jobs.map((r,i)=>({...r,service:i===1?3:2})));
 assert.deepEqual(edl.base,baseRows);assert.deepEqual(edl.slow,slow);
 assert.deepEqual(slow.map((r,i)=>r.wait-baseRows[i]!.wait),[0,0,1,1,0]);
 assert.equal(slow[4]!.start,10);assert.equal(slow[4]!.start,baseRows[4]!.start);
 for(const c of film.chapters)assert.ok(edl.shots.some((s:{from:number})=>Math.round(s.from*1000)===c.startMs));
 for(const s of edl.shots){assert.ok(s.spokenSeconds<s.duration);assert.ok(s.cues.every((c:{from:number;to:number})=>c.from>=0&&c.to>c.from&&c.to<=s.duration));}
 const vtt=readFileSync(new URL('queue-explainer.vtt',base),'utf8');assert.match(vtt,/第三辆/);assert.match(vtt,/空闲间隙截断了延误/);
 const state={progress:.5,option:0,revealed:false,cinematic:{clipId:film.id,status:'paused' as const,elapsedMs:film.durationMs/2,startedAt:null}};
 assert.ok(expansionStateValid(page,state));assert.ok(portExpansionPresentationSchema.safeParse({slideKey:page.slideKey,...state}).success);
 assert.equal(expansionStateValid(page,{...state,cinematic:{...state.cinematic,elapsedMs:film.durationMs+1}}),false);
 const summary=expansionDiagramSummary(page,state);assert.match(summary,/原创教学动画/);assert.match(summary,/154.92秒/);assert.doesNotMatch(summary,/青岛港历史作业画面|总长46秒/);
});
test('the new teaching film uses the existing controller and identifies its authored sources',()=>{
 const page=pages[3]!,film=PORT_QUEUE_FILMS['l17-queue-explainer'];
 const teacher=renderToStaticMarkup(<PortTradeFilm page={page} readOnly={false} scope="test"/>);
 const student=renderToStaticMarkup(<PortTradeFilm page={page} readOnly={true} scope="test"/>);
 assert.match(teacher,/教学动画进度/);assert.match(teacher,/延误传播 · 01:44/);assert.match(teacher,/动画脚本与模型记录/);assert.doesNotMatch(teacher,/原报道与日期|正在加载新闻/);
 assert.doesNotMatch(teacher,/<track[^>]*default/);assert.match(teacher,/画面已含/);
 const range=teacher.match(/<input[^>]*aria-label="教学动画进度"[^>]*>/)?.[0]??'';
 assert.match(range,/step="40"/);assert.equal(film.durationMs%40,0);
 assert.doesNotMatch(student,/教学动画进度|延误传播 · 01:44|teachingCue|assistantCue|storyBeat/);
 assert.match(student,/观看动画／按章节回看/);assert.match(student,new RegExp(film.src));
});
