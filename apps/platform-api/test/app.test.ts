import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { buildApp } from "../src/app.js";

test("seeded teacher portal supports course creation, classroom start and avatar modes", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-platform-api-"));
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    openAvatarBaseUrl: "http://127.0.0.1:1",
    presenceTtlMs: 30
  });

  try {
    const dashboardResponse = await app.inject({ method: "GET", url: "/api/dashboard" });
    assert.equal(dashboardResponse.statusCode, 200);
    const dashboard = dashboardResponse.json();
    assert.equal(dashboard.teacher.name, "李行之");
    assert.equal(dashboard.teacher.institution, "重庆交通大学");
    assert.equal(dashboard.featuredCourse.title, "港口管理概论");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/courses",
      payload: {
        title: "港口物流专题",
        code: "PORT-LOG-01",
        category: "本科课程",
        discipline: "管理学",
        totalHours: 16
      }
    });
    assert.equal(createResponse.statusCode, 201);
    const createdCourse = createResponse.json();
    assert.equal(createdCourse.status, "draft");

    const classResponse = await app.inject({
      method: "POST",
      url: `/api/courses/${createdCourse.id}/class-sessions`
    });
    assert.equal(classResponse.statusCode, 201);
    const liveSession = classResponse.json();
    assert.equal(liveSession.status, "live");

    const snapshotResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${liveSession.id}/snapshot`
    });
    assert.equal(snapshotResponse.statusCode, 200);
    const initialSnapshot = snapshotResponse.json();
    assert.equal(initialSnapshot.slide.logicalWidth, 1600);
    assert.equal(initialSnapshot.slide.logicalHeight, 1000);
    assert.equal(initialSnapshot.slide.aspectRatio, "16:10");
    assert.equal(initialSnapshot.slide.index, 1);
    assert.equal(initialSnapshot.slide.total, 119);
    assert.equal(
      initialSnapshot.slide.title,
      "港口管理概论"
    );
    assert.equal(initialSnapshot.slide.slideId, "l1-course-cover");
    assert.equal(
      initialSnapshot.slide.versionId,
      "release-port-management-voyage-v7"
    );
    assert.equal(initialSnapshot.globePlayback.status, "idle");
    assert.equal(initialSnapshot.participantsOnline, 0);

    const firstPresenceResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/presence/heartbeat`,
      payload: { participantId: "student-001" }
    });
    assert.equal(firstPresenceResponse.statusCode, 200);
    assert.equal(firstPresenceResponse.json().participantsOnline, 1);

    const secondPresenceResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/presence/heartbeat`,
      payload: { participantId: "student-002" }
    });
    assert.equal(secondPresenceResponse.statusCode, 200);
    assert.equal(secondPresenceResponse.json().participantsOnline, 2);

    const presenceSnapshotResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${liveSession.id}/snapshot`
    });
    assert.equal(presenceSnapshotResponse.json().participantsOnline, 2);

    const leavePresenceResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/presence/leave`,
      payload: { participantId: "student-001" }
    });
    assert.equal(leavePresenceResponse.statusCode, 204);

    const afterLeaveSnapshotResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${liveSession.id}/snapshot`
    });
    assert.equal(afterLeaveSnapshotResponse.json().participantsOnline, 1);
    await wait(40);
    const afterExpirySnapshotResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${liveSession.id}/snapshot`
    });
    assert.equal(afterExpirySnapshotResponse.json().participantsOnline, 0);

    const lamStatusResponse = await app.inject({
      method: "GET",
      url: "/api/avatar/runtime/status"
    });
    assert.equal(lamStatusResponse.statusCode, 200);
    assert.equal(lamStatusResponse.json().renderer, "lam");
    assert.equal(lamStatusResponse.json().status, "offline");

    const nextSlideResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/events`,
      payload: { type: "next_slide" }
    });
    assert.equal(nextSlideResponse.statusCode, 201);
    assert.equal(nextSlideResponse.json().slide.index, 2);
    assert.equal(nextSlideResponse.json().runtimeVersion, 2);

    const capabilitiesResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${liveSession.id}/avatar/control/capabilities`
    });
    assert.equal(capabilitiesResponse.statusCode, 200);
    assert.equal(
      capabilitiesResponse.json().protocol,
      "edu.classroom.control"
    );
    assert.equal(capabilitiesResponse.json().allowedActions.length, 9);
    const lessonCapability = capabilitiesResponse
      .json()
      .allowedActions.find(
        (action: { type: string }) => action.type === "lesson.go_to"
      );
    assert.match(
      lessonCapability.parameters.readyLessons,
      /1:英国如何把贸易变成影响力？@1/
    );
    assert.doesNotMatch(
      lessonCapability.parameters.readyLessons,
      /4:/
    );

    const switchActivityResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-simulation",
        reason: "教师要求进入模拟实验",
        actions: [
          { type: "activity.switch", activity: "simulation" }
        ]
      }
    });
    assert.equal(switchActivityResponse.statusCode, 200);
    assert.equal(
      switchActivityResponse.json().snapshot.activeActivity,
      "simulation"
    );
    assert.equal(switchActivityResponse.json().duplicate, false);

    const nextByAvatarResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-next",
        actions: [{ type: "slides.next" }]
      }
    });
    assert.equal(nextByAvatarResponse.statusCode, 200);
    assert.equal(nextByAvatarResponse.json().snapshot.activeActivity, "slides");
    assert.equal(nextByAvatarResponse.json().snapshot.slide.index, 3);

    const duplicateControlResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-next",
        actions: [{ type: "slides.next" }]
      }
    });
    assert.equal(duplicateControlResponse.statusCode, 200);
    assert.equal(duplicateControlResponse.json().duplicate, true);
    assert.equal(
      duplicateControlResponse.json().snapshot.slide.index,
      3
    );

    const switchBeforeLessonResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-simulation-before-lesson",
        actions: [
          { type: "activity.switch", activity: "simulation" }
        ]
      }
    });
    assert.equal(
      switchBeforeLessonResponse.json().snapshot.activeActivity,
      "simulation"
    );

    const lessonGoToResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-lesson-2",
        actions: [{ type: "lesson.go_to", lesson: 2 }]
      }
    });
    assert.equal(lessonGoToResponse.statusCode, 200);
    assert.equal(lessonGoToResponse.json().status, "applied");
    assert.equal(
      lessonGoToResponse.json().snapshot.activeActivity,
      "slides"
    );
    assert.equal(lessonGoToResponse.json().snapshot.slide.index, 48);
    assert.equal(
      lessonGoToResponse.json().snapshot.slide.slideId,
      "l2-cover"
    );
    assert.equal(
      lessonGoToResponse.json().snapshot.slide.lessonNumber,
      2
    );

    const duplicateLessonResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-lesson-2",
        actions: [{ type: "lesson.go_to", lesson: 2 }]
      }
    });
    assert.equal(duplicateLessonResponse.statusCode, 200);
    assert.equal(duplicateLessonResponse.json().duplicate, true);
    assert.equal(duplicateLessonResponse.json().snapshot.slide.index, 48);

    const sameLessonResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-lesson-2-same",
        actions: [{ type: "lesson.go_to", lesson: 2 }]
      }
    });
    assert.equal(sameLessonResponse.statusCode, 200);
    assert.equal(sameLessonResponse.json().status, "noop");
    assert.equal(sameLessonResponse.json().snapshot.slide.index, 48);

    const plannedLessonResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-lesson-4",
        actions: [{ type: "lesson.go_to", lesson: 4 }]
      }
    });
    assert.equal(plannedLessonResponse.statusCode, 200);
    assert.equal(plannedLessonResponse.json().status, "noop");
    assert.equal(plannedLessonResponse.json().snapshot.slide.index, 48);
    assert.match(
      plannedLessonResponse.json().results[0].message,
      /第4讲内容待建设/
    );

    const rejectedControlResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/control`,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "lam-control-invalid",
        actions: [{ type: "slides.next", arbitraryCode: "alert(1)" }]
      }
    });
    assert.equal(rejectedControlResponse.statusCode, 400);

    const textCommandResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/commands`,
      payload: {
        inputMode: "text",
        text: "请概括当前页"
      }
    });
    assert.equal(textCommandResponse.statusCode, 202);
    assert.equal(textCommandResponse.json().inputMode, "text");
    assert.equal(textCommandResponse.json().state, "queued");

    const voiceCommandResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/avatar/commands`,
      payload: {
        inputMode: "voice",
        audioBase64: "dGVzdA==",
        mimeType: "audio/webm",
        durationMs: 400
      }
    });
    assert.equal(voiceCommandResponse.statusCode, 202);
    assert.equal(voiceCommandResponse.json().inputMode, "voice");

    const assistantResponse = await app.inject({
      method: "POST",
      url: "/api/avatar/presentations",
      payload: {
        courseId: "course-port-management-intro",
        scene: "selfstudy"
      }
    });
    assert.equal(assistantResponse.statusCode, 201);
    assert.equal(assistantResponse.json().requiresGpu, false);
    assert.equal(assistantResponse.json().mode, "selfstudy_prerecorded");

    const endResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${liveSession.id}/end`
    });
    assert.equal(endResponse.statusCode, 200);
    assert.equal(endResponse.json().status, "completed");
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("registered globe cue supports control, replay and authoritative completion", async () => {
  const tempDirectory = await mkdtemp(
    join(tmpdir(), "edu-platform-globe-")
  );
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    openAvatarBaseUrl: "http://127.0.0.1:1"
  });

  try {
    const classResponse = await app.inject({
      method: "POST",
      url: "/api/courses/course-port-management-intro/class-sessions"
    });
    const sessionId = classResponse.json().id as string;
    const controlUrl = `/api/class-sessions/${sessionId}/avatar/control`;

    const invalidCue = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "invalid-globe-cue",
        actions: [{ type: "globe.play_cue", cueId: "raw-camera-track" }]
      }
    });
    assert.equal(invalidCue.json().status, "noop");
    assert.equal(invalidCue.json().snapshot.activeActivity, "slides");

    const blockedBeforeWager = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "play-before-wager",
        actions: [
          { type: "globe.play_cue", cueId: "l1-opening-trade-influence" }
        ]
      }
    });
    assert.equal(blockedBeforeWager.json().status, "noop");
    assert.equal(
      blockedBeforeWager.json().snapshot.slide.slideId,
      "l1-course-cover"
    );
    assert.match(blockedBeforeWager.json().results[0].message, /l1-1700-wager/u);

    const wager = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/events`,
      payload: { type: "set_slide", index: 2 }
    });
    assert.equal(wager.statusCode, 201);
    assert.equal(wager.json().slide.slideId, "l1-1700-wager");

    const play = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "play-opening",
        actions: [
          { type: "globe.play_cue", cueId: "l1-opening-trade-influence" }
        ]
      }
    });
    const started = play.json().snapshot;
    assert.equal(started.activeActivity, "globe");
    assert.equal(started.globePlayback.status, "playing");
    assert.equal(started.globePlayback.stepIndex, 0);
    assert.ok(started.globePlayback.runId);

    const duplicate = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "play-opening",
        actions: [
          { type: "globe.play_cue", cueId: "l1-opening-trade-influence" }
        ]
      }
    });
    assert.equal(duplicate.json().duplicate, true);
    assert.equal(
      duplicate.json().snapshot.globePlayback.runId,
      started.globePlayback.runId
    );

    const pause = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "pause-opening",
        actions: [{ type: "globe.pause" }]
      }
    });
    assert.equal(pause.json().snapshot.globePlayback.status, "paused");
    assert.equal(pause.json().snapshot.globePlayback.stepStartedAt, null);

    const resume = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "resume-opening",
        actions: [{ type: "globe.resume" }]
      }
    });
    assert.equal(resume.json().snapshot.globePlayback.status, "playing");

    const restart = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "restart-opening",
        actions: [{ type: "globe.restart" }]
      }
    });
    let playback = restart.json().snapshot.globePlayback;
    assert.notEqual(playback.runId, started.globePlayback.runId);
    assert.equal(playback.stepIndex, 0);

    for (let stepIndex = 0; stepIndex < 7; stepIndex += 1) {
      const advance = await app.inject({
        method: "POST",
        url: `/api/class-sessions/${sessionId}/events`,
        payload: {
          type: "globe_advance",
          runId: playback.runId,
          fromStepIndex: stepIndex
        }
      });
      assert.equal(advance.statusCode, 201);
      playback = advance.json().globePlayback;
      if (stepIndex < 6) {
        assert.equal(playback.stepIndex, stepIndex + 1);
        assert.equal(advance.json().activeActivity, "globe");
      } else {
        assert.equal(playback.status, "completed");
        assert.equal(advance.json().activeActivity, "slides");
        assert.equal(advance.json().slide.slideId, "l1-france-england-scale");
        assert.equal(advance.json().slide.index, 4);
      }
    }

    const forbiddenCamera = await app.inject({
      method: "POST",
      url: controlUrl,
      payload: {
        protocol: "edu.classroom.control",
        version: "1.0",
        requestId: "forbidden-camera",
        actions: [
          {
            type: "globe.play_cue",
            cueId: "l1-opening-trade-influence",
            latitude: 22.65
          }
        ]
      }
    });
    assert.equal(forbiddenCamera.statusCode, 400);
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
