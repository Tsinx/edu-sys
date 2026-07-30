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
    assert.equal(initialSnapshot.slide.total, 118);
    assert.equal(
      initialSnapshot.slide.title,
      "1700：如果只能押一个国家"
    );
    assert.equal(initialSnapshot.slide.slideId, "l1-1700-wager");
    assert.equal(
      initialSnapshot.slide.versionId,
      "release-port-management-voyage-v6"
    );
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
    assert.equal(capabilitiesResponse.json().allowedActions.length, 5);
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
    assert.equal(lessonGoToResponse.json().snapshot.slide.index, 47);
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
    assert.equal(duplicateLessonResponse.json().snapshot.slide.index, 47);

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
    assert.equal(sameLessonResponse.json().snapshot.slide.index, 47);

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
    assert.equal(plannedLessonResponse.json().snapshot.slide.index, 47);
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
