import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {PORT_ELEVEN_FILM,PORT_TWELVE_FILM,PORT_LESSON_ELEVEN_SLIDES,PORT_LESSON_TWELVE_SLIDES,expansionStateValid,expansionDiagramSummary} from '@edu/course-content';

for(const [lesson,metadata,pages]of [[11,PORT_ELEVEN_FILM,PORT_LESSON_ELEVEN_SLIDES],[12,PORT_TWELVE_FILM,PORT_LESSON_TWELVE_SLIDES]] as const){
 test(`lecture ${lesson} delivers a real-footage edit with complete source coverage and an intact legacy comparison`,()=>{
  assert.match(metadata.src,/documentary-v2\/opening\.mp4$/);const base=resolve('public'+dirname(metadata.src));
  const film=JSON.parse(readFileSync(resolve(base,'storyboard.json'),'utf8')),qa=JSON.parse(readFileSync(resolve(base,'media-qa.json'),'utf8'));
  assert.equal(film.id,metadata.id);assert.equal(film.duration,180);assert.equal(qa.fullDecode,'pass');assert.equal(qa.frames,5400);assert.equal(qa.width,1920);assert.equal(qa.height,1200);
  assert.equal(createHash('sha256').update(readFileSync(resolve(base,'opening.mp4'))).digest('hex'),qa.sha256);
  assert.ok(film.cuts.length>=24);assert.ok(film.footage.length>=8);let end=0;
  for(const cut of film.cuts){assert.equal(cut.from,end);assert.ok(cut.to-cut.from>0&&cut.to-cut.from<=12);const s=film.footage.find((s:any)=>s.id===cut.source);assert.ok(s);assert.ok(cut.in>=0&&cut.in+cut.to-cut.from<=s.duration+.02);assert.equal(s.license,'Pexels License');assert.match(s.url,/^https:\/\/www\.pexels\.com\/video\//);assert.ok(s.author);assert.ok(s.sha256);end=cut.to;}
  assert.equal(end,180);assert.ok(qa.archiveSeconds<=20);assert.ok(qa.noNarrationSeconds>=30);
  const captions=JSON.parse(readFileSync(resolve(base,'caption-timing.json'),'utf8'));let previous=0;
  for(const c of captions){assert.ok(c.from>=previous);assert.ok(c.to>c.from&&c.to<=180);assert.ok(c.text.length<=25);previous=c.to;}
  assert.equal(captions.map((c:any)=>c.text).join(''),film.shots.map((s:any)=>s.narration).join(''));
  for(const name of ['index.html','captions.srt','captions.vtt','poster.jpg','cover.jpg'])assert.ok(existsSync(resolve(base,name)),name);
  assert.ok(existsSync(resolve(base,'../legacy-index.html')));assert.ok(existsSync(resolve(base,'../opening.mp4')));
  const player=readFileSync(resolve(base,'index.html'),'utf8');assert.match(player,/片中人物与案件无关/);assert.match(player,/Pexels License/);assert.match(player,/对照旧版/);assert.doesNotMatch(player,/AI教学示意/);
  const state={progress:.5,option:0,revealed:false,cinematic:{clipId:metadata.id,status:'paused' as const,elapsedMs:90000,startedAt:null}};
  assert.ok(expansionStateValid(pages[0]!,state));assert.equal(expansionStateValid(pages[0]!,{...state,cinematic:{...state.cinematic,clipId:`l${lesson}-opening-v1`}}),false);
  const context=expansionDiagramSummary(pages[0]!,state);assert.match(context,/许可实拍素材与官方档案/);assert.match(context,/不证明学生已观看/);assert.doesNotMatch(context,/场景为AI/);
 });
}
