import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classroomSnapshotSchema, type ClassroomEventInput, type SlideInteractionValues } from "@edu/contracts";
import { getCourseDeckByCourseId, getCourseLessonLabel } from "@edu/course-content/deck-registry";
import {
  INTERNATIONAL_MATHEMATICS_COURSE_ID as id,
  INTERNATIONAL_MATHEMATICS_SLIDES as slides,
  getInternationalMathematicsInteractionDefaults
} from "@edu/course-content/international-mathematics";
import { buildApp } from "../src/app.js";
import { createSeedState } from "../src/seed.js";
import { buildPromptWorkspace } from "../src/assistant/prompts.js";
import { JsonStateStore } from "../src/store.js";
import { INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP as legacyMap } from "@edu/course-content/international-mathematics";

test("v1 classroom, study and reading records migrate by key first and preserve learning history", async()=>{
 const directory=await mkdtemp(join(tmpdir(),"edu-international-v2-migration-")),file=join(directory,"state.json");
 const actor={actorId:'v2-migration-student',displayName:'Student',roles:['student'] as ('student')[],identitySource:'development' as const};
 let store=new JsonStateStore(file);await store.initialize();
 const classroom=await store.startClass(id),study=await store.createOrResumeStudySession(id,actor);
 assert.ok(classroom&&study);store.close();
 const state=JSON.parse(await readFile(file,'utf8'));
 const keyTarget=legacyMap.find(p=>p.lesson===14&&p.slideKey.endsWith('-12'))!;
 const indexTarget=legacyMap.find(p=>p.lesson===5&&p.slideKey.endsWith('-09'))!;
 const runtime=state.classroomRuntimes[classroom.id];runtime.deckVersion='release-international-mathematics-jacques-v1';runtime.slideIndex=1;runtime.slideKey=keyTarget.slideKey;
 const savedStudy=state.studySessions.find((s:{id:string})=>s.id===study.id);savedStudy.deckVersion=runtime.deckVersion;savedStudy.globalIndex=indexTarget.v1Index;delete savedStudy.slideKey;savedStudy.slideTotal=legacyMap.length;
 state.portal??={preparations:{},readings:{},preferences:{},startRequests:{},deletedClassrooms:{}};
 state.portal.readings[JSON.stringify([actor.actorId,id])]={deckVersion:runtime.deckVersion,slideKey:keyTarget.slideKey,slideIndex:1,revision:7,updatedAt:'2026-09-01T00:00:00Z'};
 state.portal.readings[JSON.stringify(['legacy-index-student',id])]={deckVersion:runtime.deckVersion,slideIndex:indexTarget.v1Index,revision:3};
 const history=structuredClone(state.activities),courseProgress=state.courses.map((c:{id:string,progress:number})=>[c.id,c.progress]);
 await writeFile(file,JSON.stringify(state));
 store=new JsonStateStore(file);await store.initialize();
 try{
  assert.equal(store.getClassroomSnapshot(classroom.id)?.slide.index,keyTarget.v2Index);
  assert.equal(store.getStudySession(study.id,actor)?.globalIndex,indexTarget.v2Index);
  assert.equal(store.getStudySession(study.id,actor)?.slideTotal,slides.length);
  const migrated=JSON.parse(await readFile(file,'utf8'));
  const progress=migrated.portal.readings[JSON.stringify([actor.actorId,id])];assert.equal(progress.slideKey,keyTarget.slideKey);assert.equal(progress.revision,7);assert.equal(progress.updatedAt,'2026-09-01T00:00:00Z');
  assert.equal(migrated.portal.readings[JSON.stringify(['legacy-index-student',id])].slideKey,indexTarget.slideKey);
  assert.deepEqual(migrated.activities,history);assert.deepEqual(migrated.courses.map((c:{id:string,progress:number})=>[c.id,c.progress]),courseProgress);
 }finally{store.close();await rm(directory,{recursive:true,force:true});}
});

test("international mathematics registration is English with complete lecture ranges and public summaries", () => {
  const deck = getCourseDeckByCourseId(id)!;
  assert.equal(deck.locale, "en");
  assert.equal(deck.totalHours, 32);
  assert.equal(deck.lessons.length, 16);
  assert.equal(deck.slideTotal, slides.length);
  assert.deepEqual(deck.allowedActivities, ["slides"]);
  assert.equal(getCourseLessonLabel({number: 1}, deck.locale), "Lecture 1");
  assert.equal(getCourseLessonLabel({number: 1}), "第1讲");
  for (const lesson of deck.lessons) {
    assert.equal(lesson.status, "ready");
    assert.equal(lesson.completionStatus, "complete");
    assert.ok(lesson.sources?.length);
    assert.deepEqual(lesson.textbookSections, lesson.sources!.map(source=>source.section));
    assert.deepEqual(lesson.printedPages, lesson.sources!.map(source=>source.printedPages));
    assert.deepEqual(lesson.pdfPages, lesson.sources!.map(source=>source.pdfPages));
    assert.ok(lesson.outcomes?.length);
    assert.equal(lesson.slideTotal,lesson.coreSlideTotal!+lesson.optionalSlideTotal!);
    assert.equal(lesson.optionalSlideTotal,2);
    assert.equal(lesson.hourRanges?.length,2);
    assert.ok(lesson.hourRanges!.every(h=>h.coreSlides>=36&&h.coreSlides<=45));
    const start = lesson.slideStart!;
    assert.equal(deck.getGlobalIndex(lesson.number), start);
    assert.equal(deck.getGlobalIndex(lesson.number, lesson.slideTotal), lesson.slideEnd);
    assert.equal(deck.getLessonPosition(start)?.localIndex, 1);
    assert.equal(deck.getLessonPosition(lesson.slideEnd!)?.localIndex, lesson.slideTotal);
    assert.equal(deck.getGlobalIndex(lesson.number, 1.5), null);
    for (let index = start; index <= lesson.slideEnd!; index++) {
      const summary = deck.getSlide(index);
      assert.equal(deck.getSlideByKey(summary.slideKey)?.index, index);
      assert.doesNotMatch(JSON.stringify(summary), /teachingCue|assistantCue|teacherGuide|answerHidden/);
    }
  }
  assert.equal(getCourseDeckByCourseId("course-economic-mathematics")?.locale, undefined);
  assert.equal(deck.presentation.supportsStudy, true);
  assert.equal(getCourseDeckByCourseId("course-economic-mathematics")?.presentation.supportsStudy, false);
});

test("English independent study uses course navigation, sources, speech language and persistent progress", async()=>{
  const directory=await mkdtemp(join(tmpdir(),"edu-international-study-")),dataFile=join(directory,"state.json"),requests:string[]=[],asrContexts:string[]=[],speechOptions:unknown[]=[];
  const options={dataFile,logger:false,portSimulationTickMs:0,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true,assistantProvider:{name:"english-study-test",async *streamJson(request:import('../src/assistant/provider.js').AssistantJsonStreamRequest){requests.push(request.messages[0]!.content);yield JSON.stringify({dialogue:"A derivative measures a local rate of change. Its units are output units per input unit.",actions:[{type:"study.slides.go_to",lesson:5,slide:9}],schema:"edu.study.assistant.response",version:"1.0"});}},studySpeechProvider:{name:"english-speech-test",asrConfigured:true,ttsConfigured:true,canSynthesize:()=>true,async transcribe(request:import('../src/study/speech.js').StudyAsrRequest){asrContexts.push(request.context);return "Go to lesson five, page nine.";},async *synthesize(_text:string,_signal?:AbortSignal,_voice?:import('@edu/contracts').AvatarVoiceProfile,settings?:import('../src/study/speech.js').StudySpeechOptions){speechOptions.push(settings);yield {audioBase64:"AAE=",sampleRate:24000 as const,channels:1 as const,format:"pcm_s16le" as const};}}};
  let app=await buildApp(options);let sessionId="";
  try{
    const created=await app.inject({method:"POST",url:"/api/study-sessions",payload:{courseId:id}});assert.equal(created.statusCode,201);const session=created.json();sessionId=session.id;const deck=getCourseDeckByCourseId(id)!;assert.equal(session.deckVersion,deck.versionId);assert.equal(session.slideTotal,slides.length);assert.equal(session.slideKey,deck.getSlide(1).slideKey);
    const recognition=await app.inject({method:"POST",url:`/api/study-sessions/${sessionId}/asr`,payload:{audioBase64:"AAECAw==",mimeType:"audio/webm",durationMs:1200}});assert.equal(recognition.statusCode,200);assert.match(asrContexts[0]!,/English mathematics/);assert.doesNotMatch(asrContexts[0]!,/港口|OOCL/);
    const turn=await app.inject({method:"POST",url:`/api/study-sessions/${sessionId}/assistant/turns`,payload:{text:"Go to lesson five, page nine.",source:"text"}});assert.equal(turn.statusCode,200);const events=turn.body.split(/\r?\n\r?\n/).flatMap(block=>block.split(/\r?\n/).filter(line=>line.startsWith("data: ")).map(line=>JSON.parse(line.slice(6))));assert.equal(events.at(-1)?.type,"turn.completed");assert.equal(events.at(-1)?.navigation.session.globalIndex,deck.getGlobalIndex(5,9));assert.ok(speechOptions.length);assert.ok(speechOptions.every(value=>(value as {language:string}).language==="English"));assert.match(requests[0]!,/clear spoken English/);assert.match(requests[0]!,/Published lessons: 1:/);assert.match(requests[0]!,/Ian Jacques/);assert.doesNotMatch(requests[0]!,/OOCL|voyage_context/);
    const independent=await app.inject({method:"POST",url:"/api/study-sessions",payload:{courseId:"course-port-management-intro"}});assert.equal(independent.statusCode,201);assert.notEqual(independent.json().id,sessionId);
    const target=deck.getSlide(deck.getGlobalIndex(14,12)!);const saved=await app.inject({method:"PATCH",url:`/api/study-sessions/${sessionId}/progress`,payload:{deckVersion:deck.versionId,slideKey:target.slideKey,globalIndex:target.index}});assert.equal(saved.statusCode,200);assert.equal(saved.json().globalIndex,target.index);
    const invalid=await app.inject({method:"PATCH",url:`/api/study-sessions/${sessionId}/progress`,payload:{deckVersion:deck.versionId,slideKey:"missing",globalIndex:slides.length+1}});assert.equal(invalid.statusCode,400);
  }finally{await app.close();}
  app=await buildApp(options);try{const resumed=await app.inject({method:"POST",url:"/api/study-sessions",payload:{courseId:id}});assert.equal(resumed.statusCode,201);assert.equal(resumed.json().id,sessionId);assert.equal(resumed.json().globalIndex,getCourseDeckByCourseId(id)!.getGlobalIndex(14,12));assert.equal(resumed.json().deckVersion,getCourseDeckByCourseId(id)!.versionId);}finally{await app.close();await rm(directory,{recursive:true,force:true});}
});

test("English page prompts use authored sources and withhold unrevealed answers without port context", () => {
  for (const slide of slides) {
    const workspace = buildPromptWorkspace(id, "Higher Mathematics", undefined, slide.index);
    assert.match(workspace.compiled, /Respond in clear, concise English/);
    assert.match(workspace.compiled, /Required response language: English/);
    assert.match(workspace.compiled, /Ian Jacques/);
    assert.ok(workspace.compiled.includes(slide.title));
    assert.doesNotMatch(workspace.compiled, /OOCL|山城新饮|voyage_context|marketing-surface/);
    if (slide.answer) {
      assert.match(workspace.compiled, /answer has not been revealed/);
      assert.match(workspace.compiled, /不得复述作者答案/);
    }
  }
});

test("additive migration preserves edits and playback controls are authorized, revisioned and persisted", async () => {
  const directory = await mkdtemp(join(tmpdir(), "edu-international-"));
  const dataFile = join(directory, "state.json");
  const seed = createSeedState();
  seed.courses = seed.courses.filter(course => course.id !== id);
  seed.courses[0]!.title = "Teacher-edited port title";
  seed.courses[0]!.progress = 67;
  await writeFile(dataFile, JSON.stringify(seed), "utf8");
  const options = {dataFile, logger: false, portSimulationTickMs: 0, allowDevelopmentIdentity: true, allowLegacyDevelopmentIdentity: true};
  let app = await buildApp(options);
  let sessionId = "";
  const film = slides.find(slide => slide.openingFilm)!;
  assert.ok(film);
  try {
    const cookie = async (role: "teacher" | "student") => String((await app.inject({method: "POST", url: "/api/identity/development/session", payload: {role}})).headers["set-cookie"]).split(";")[0]!;
    const teacher = await cookie("teacher"), student = await cookie("student");
    const courses = (await app.inject("/api/courses")).json();
    assert.equal(courses.filter((course: {id: string}) => course.id === id).length, 1);
    assert.equal(courses.find((course: {id: string}) => course.id === "course-port-management-intro").title, "Teacher-edited port title");
    const start = await app.inject({method: "POST", url: `/api/courses/${id}/class-sessions`, headers: {cookie: teacher}});
    assert.equal(start.statusCode, 201);
    sessionId = start.json().id;
    const url = `/api/class-sessions/${sessionId}`;
    const send = (payload: ClassroomEventInput, actorCookie = teacher) => app.inject({method: "POST", url: `${url}/events`, headers: {cookie: actorCookie}, payload});
    const go = await send({type: "set_slide", index: film.index});
    const initial = classroomSnapshotSchema.parse(go.json());
    assert.equal(initial.slide.logicalWidth, 1600);
    assert.equal(initial.slide.logicalHeight, 1000);
    assert.ok(initial.serverNowMs);
    assert.deepEqual(initial.slideInteraction?.values, getInternationalMathematicsInteractionDefaults(film.slideKey));
    const before = Date.now();
    const patch = {playing: true, positionMs: 750, anchorMs: 17, runId: "synchronized-film"};
    assert.equal((await send({type: "set_slide_interaction", slideId: film.slideKey, expectedRevision: 1, patch}, student)).statusCode, 403);
    const updated = await send({type: "set_slide_interaction", slideId: film.slideKey, expectedRevision: 1, patch});
    assert.equal(updated.statusCode, 201);
    const snapshot = classroomSnapshotSchema.parse(updated.json());
    assert.equal(snapshot.slideInteraction?.revision, 2);
    assert.equal(snapshot.slideInteraction?.values.playing, true);
    assert.ok(Number(snapshot.slideInteraction?.values.anchorMs) >= before);
    assert.equal((await send({type: "set_slide_interaction", slideId: film.slideKey, expectedRevision: 1, patch})).statusCode, 409);
    for (const invalid of [{positionMs: 90001}, {playing: "yes"}, {unexpected: 1}] as SlideInteractionValues[]) {
      assert.equal((await send({type: "set_slide_interaction", slideId: film.slideKey, expectedRevision: 2, patch: invalid})).statusCode, 400);
    }
    const follow = classroomSnapshotSchema.parse((await app.inject({url: `${url}/snapshot`, headers: {cookie: student}})).json());
    assert.deepEqual(follow.slideInteraction, snapshot.slideInteraction);
    const pause = await send({type: "set_slide_interaction", slideId: film.slideKey, expectedRevision: 2, patch: {playing: false, positionMs: 1000, anchorMs: Date.now()}});
    assert.equal(pause.statusCode, 201);
  } finally {await app.close();}
  app = await buildApp(options);
  try {
    const resumed = classroomSnapshotSchema.parse((await app.inject(`/api/class-sessions/${sessionId}/snapshot`)).json());
    assert.equal(resumed.slideInteraction?.values.positionMs, 1000);
    assert.equal(resumed.slideInteraction?.values.playing, false);
    assert.equal(resumed.slideInteraction?.revision, 3);
    const state = JSON.parse(await readFile(dataFile, "utf8"));
    assert.equal(state.courses.filter((course: {id: string}) => course.id === id).length, 1);
    assert.equal(state.courses[0].progress, 67);
  } finally {await app.close(); await rm(directory, {recursive: true, force: true});}
});
