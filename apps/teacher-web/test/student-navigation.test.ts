import assert from "node:assert/strict";
import test from "node:test";
import {getCourseDeckByCourseId} from "@edu/course-content/deck-registry";
import type {ClassroomSnapshot} from "@edu/contracts";
import {restoreStudentNavigation,studentFrame,teacherLocation} from "../src/features/classroom/student-navigation";

test("independent slide frames use each registered course and never carry teacher metadata",()=>{
  for(const id of ["course-port-management-intro","course-economic-mathematics","statistical-analysis","management-principles"]) {
    const deck=getCourseDeckByCourseId(id)!;
    for(const lesson of deck.lessons.filter(l=>l.status==="ready")) {
      const frame=studentFrame(deck,lesson.slideStart!);
      assert.equal(frame.lessonNumber,lesson.number);assert.equal(frame.deckId,deck.deckId);assert.equal(frame.logicalWidth,1600);assert.equal(frame.logicalHeight,1000);
      assert.doesNotMatch(JSON.stringify(frame),/teachingCue|assistantCue|storyBeat/);
    }
  }
});
test("old classroom snapshots retain their navigation and external simulation overrides the slide activity",()=>{
  const snapshot={activeActivity:"slides",slide:{index:163},simulation:null} as ClassroomSnapshot;
  assert.deepEqual(teacherLocation(snapshot),{activity:"slides",index:163});
  assert.deepEqual(teacherLocation({...snapshot,simulationNavigation:{unit:"cargo",originSlideKey:"l4-port-10"}}),{activity:"simulation",index:163,unit:"cargo"});
  assert.equal(teacherLocation({...snapshot,activeActivity:"simulation"}).unit,undefined);
  const published={...snapshot,activeActivity:"simulation",simulation:{challengeId:"joint-watch",learningStage:"full",trainingMode:"battle"}} as ClassroomSnapshot;
  assert.deepEqual(teacherLocation(published),{activity:"simulation",index:163,unit:"full",challenge:{id:"joint-watch",trainingMode:"battle"}});
});
test("session restore rejects corrupt, stale or cross-course locations without changing the server",()=>{
  const deck=getCourseDeckByCourseId("course-port-management-intro")!;
  const saved={following:false,location:{activity:"simulation",index:163,unit:"yard"}};
  assert.deepEqual(restoreStudentNavigation(JSON.stringify(saved),deck),saved);
  for(const value of [null,"broken",JSON.stringify({following:true,location:{index:999999,activity:"slides"}}),JSON.stringify({following:true,location:{index:1,activity:"simulation",unit:"invalid"}})])assert.equal(restoreStudentNavigation(value,deck),null);
});
