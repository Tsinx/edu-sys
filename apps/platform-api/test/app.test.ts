import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { buildApp } from "../src/app.js";
import { planPortSimulationTeamCapacities } from "../src/store.js";

test("4-72 student grouping stays within 4-6 and handles seven explicitly", () => {
  for (let students = 4; students <= 72; students += 1) {
    const plan = planPortSimulationTeamCapacities(students);
    assert.ok(plan.capacities.length >= 1 && plan.capacities.length <= 15);
    assert.ok(plan.capacities.every((capacity) => capacity >= 4 && capacity <= 6));
    assert.equal(
      plan.capacities.reduce((sum, capacity) => sum + capacity, 0),
      students === 7 ? 6 : students
    );
    assert.equal(plan.classroomObserverCount, students === 7 ? 1 : 0);
    for (let index = 1; index < plan.capacities.length; index += 1) {
      assert.ok(plan.capacities[index - 1]! >= plan.capacities[index]!);
    }
  }
});

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

test("manual port simulation isolates teams and serializes role commands", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-port-simulation-api-"));
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    openAvatarBaseUrl: "http://127.0.0.1:1",
    portSimulationTickMs: 0
  });

  try {
    const dashboardResponse = await app.inject({
      method: "GET",
      url: "/api/dashboard"
    });
    const courseId = dashboardResponse.json().featuredCourse.id as string;
    const classResponse = await app.inject({
      method: "POST",
      url: `/api/courses/${courseId}/class-sessions`
    });
    assert.equal(classResponse.statusCode, 201);
    const sessionId = classResponse.json().id as string;

    const setupResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      payload: {
        teamCount: 2,
        teamNames: ["潮汐组", "灯塔组"]
      }
    });
    assert.equal(setupResponse.statusCode, 201);
    const setupSnapshot = setupResponse.json();
    assert.equal(setupSnapshot.simulation.teams.length, 2);
    assert.equal(setupSnapshot.simulation.teams[0].teamName, "潮汐组");
    const teamOneId = setupSnapshot.simulation.teams[0].teamId as string;
    const teamTwoId = setupSnapshot.simulation.teams[1].teamId as string;

    const blockedStartResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      payload: { type: "start", allowIncompleteTeams: false }
    });
    assert.equal(blockedStartResponse.statusCode, 409);
    assert.equal(blockedStartResponse.json().error, "TEAMS_NOT_READY");

    const claimResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamOneId}/roles/yard_gate/claim`,
      payload: { participantId: "student-yard-01" }
    });
    assert.equal(claimResponse.statusCode, 201);
    const roleSeatToken = claimResponse.json().roleSeatToken as string;

    const crossTeamClaimResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamTwoId}/roles/marine_control/claim`,
      payload: { participantId: "student-yard-01" }
    });
    assert.equal(crossTeamClaimResponse.statusCode, 409);
    assert.equal(
      crossTeamClaimResponse.json().error,
      "PARTICIPANT_ALREADY_ASSIGNED"
    );

    const observerJoinResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamTwoId}/join`,
      payload: { participantId: "student-observer-02" }
    });
    assert.equal(observerJoinResponse.statusCode, 201);

    const startResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      payload: { type: "start", allowIncompleteTeams: true }
    });
    assert.equal(startResponse.statusCode, 200);
    assert.equal(startResponse.json().simulation.teams[0].status, "running");
    assert.equal(startResponse.json().simulation.teams[1].status, "running");

    const lockedJoinResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamTwoId}/join`,
      payload: { participantId: "student-too-late" }
    });
    assert.equal(lockedJoinResponse.statusCode, 409);
    assert.equal(lockedJoinResponse.json().error, "TEAM_SELECTION_LOCKED");

    const observerClaimResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamTwoId}/roles/marine_control/claim`,
      payload: { participantId: "student-observer-02" }
    });
    assert.equal(observerClaimResponse.statusCode, 201);

    const teamOneBeforeResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamOneId}/snapshot`
    });
    const teamTwoBeforeResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamTwoId}/snapshot`
    });
    const teamOneBefore = teamOneBeforeResponse.json();
    const teamTwoBefore = teamTwoBeforeResponse.json();
    assert.match(
      teamOneBefore.recentEvents.at(-1).message,
      /带缺岗开局/u
    );
    const teamTwoGateBefore = teamTwoBefore.resources.find(
      (resource: { id: string }) => resource.id === "gate-lane-1"
    );

    const commandPayload = {
      requestId: "yard-close-lane-1",
      participantId: "student-yard-01",
      roleSeatToken,
      expectedRevision: teamOneBefore.revision,
      command: {
        type: "gate.set_lane",
        laneId: "gate-lane-1",
        open: false
      }
    };
    const commandResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamOneId}/commands`,
      payload: commandPayload
    });
    assert.equal(commandResponse.statusCode, 200);
    assert.equal(commandResponse.json().result.status, "applied");
    assert.equal(
      commandResponse
        .json()
        .snapshot.resources.find(
          (resource: { id: string }) => resource.id === "gate-lane-1"
        ).status,
      "closed"
    );

    const duplicateResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamOneId}/commands`,
      payload: commandPayload
    });
    assert.equal(duplicateResponse.statusCode, 200);
    assert.equal(duplicateResponse.json().result.status, "duplicate");

    const staleResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamOneId}/commands`,
      payload: {
        ...commandPayload,
        requestId: "yard-open-stale",
        command: {
          type: "gate.set_lane",
          laneId: "gate-lane-1",
          open: true
        }
      }
    });
    assert.equal(staleResponse.statusCode, 200);
    assert.equal(staleResponse.json().result.status, "conflict");
    assert.equal(staleResponse.json().result.reasonCode, "STALE_REVISION");

    const unauthorizedResponse = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamOneId}/commands`,
      payload: {
        requestId: "yard-tries-marine-command",
        participantId: "student-yard-01",
        roleSeatToken,
        expectedRevision: commandResponse.json().snapshot.revision,
        command: {
          type: "marine.authorize_transit",
          vesselId: "vessel-haiyun",
          direction: "inbound"
        }
      }
    });
    assert.equal(unauthorizedResponse.statusCode, 200);
    assert.equal(unauthorizedResponse.json().result.status, "rejected");
    assert.equal(
      unauthorizedResponse.json().result.reasonCode,
      "ROLE_NOT_ALLOWED"
    );

    const teamTwoAfterResponse = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/${teamTwoId}/snapshot`
    });
    const teamTwoAfter = teamTwoAfterResponse.json();
    assert.equal(teamTwoAfter.revision, teamTwoBefore.revision);
    assert.deepEqual(
      teamTwoAfter.resources.find(
        (resource: { id: string }) => resource.id === "gate-lane-1"
      ),
      teamTwoGateBefore
    );
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("V0.03 capacity, support seats and collaboration revisions stay isolated from business state", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-port-collaboration-api-"));
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    openAvatarBaseUrl: "http://127.0.0.1:1",
    portSimulationTickMs: 0
  });
  try {
    const dashboard = await app.inject({ method: "GET", url: "/api/dashboard" });
    const courseId = dashboard.json().featuredCourse.id as string;
    const classroom = await app.inject({
      method: "POST",
      url: `/api/courses/${courseId}/class-sessions`
    });
    const sessionId = classroom.json().id as string;
    const setup = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      payload: { expectedStudentCount: 11, teamNames: ["六码组", "五码组"] }
    });
    assert.equal(setup.statusCode, 201);
    assert.deepEqual(
      setup.json().simulation.teams.map((team: { memberCapacity: number }) => team.memberCapacity),
      [6, 5]
    );
    assert.equal(setup.json().simulation.scenarioVersion, "0.0.3");

    const coreRoles = [
      "marine_control",
      "berth_operations",
      "horizontal_transport",
      "yard_gate"
    ];
    const coreClaims = new Map<string, string>();
    for (const [index, role] of coreRoles.entries()) {
      const claim = await app.inject({
        method: "POST",
        url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/${role}/claim`,
        payload: { participantId: `core-${index + 1}` }
      });
      assert.equal(claim.statusCode, 201);
      coreClaims.set(role, claim.json().roleSeatToken as string);
    }
    const coordinator = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/support-roles/operations_coordinator/claim`,
      payload: { participantId: "coordinator-5" }
    });
    assert.equal(coordinator.statusCode, 201);
    const reviewer = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/support-roles/safety_reviewer/claim`,
      payload: { participantId: "reviewer-6" }
    });
    assert.equal(reviewer.statusCode, 201);
    const full = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/join`,
      payload: { participantId: "student-7" }
    });
    assert.equal(full.statusCode, 409);
    assert.equal(full.json().error, "TEAM_FULL");

    const supportSnapshot = reviewer.json().snapshot;
    const businessRevision = supportSnapshot.revision as number;
    const collaborationRevision = supportSnapshot.collaborationRevision as number;
    const proposal = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/collaboration-items`,
      payload: {
        requestId: "proposal-1",
        participantId: "coordinator-5",
        supportSeatToken: coordinator.json().supportSeatToken,
        expectedCollaborationRevision: collaborationRevision,
        item: {
          kind: "command_proposal",
          targetRole: "berth_operations",
          entityIds: ["quay-crane-1", "berth-03"],
          reasonCode: "sequence_dependency",
          commandDraft: {
            type: "quay.move_crane",
            craneId: "quay-crane-1",
            targetSlotId: "berth-03-slot-1"
          }
        }
      }
    });
    assert.equal(proposal.statusCode, 201);
    assert.equal(proposal.json().result.status, "applied");
    assert.equal(proposal.json().snapshot.revision, businessRevision);
    assert.equal(
      proposal.json().snapshot.collaborationRevision,
      collaborationRevision + 1
    );
    const proposalItem = proposal.json().snapshot.collaborationItems.at(-1);

    const supportCannotCommand = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/commands`,
      payload: {
        requestId: "support-command-1",
        participantId: "coordinator-5",
        roleSeatToken: coordinator.json().supportSeatToken,
        expectedRevision: businessRevision,
        command: {
          type: "quay.move_crane",
          craneId: "quay-crane-1",
          targetSlotId: "berth-03-slot-1"
        }
      }
    });
    assert.equal(supportCannotCommand.statusCode, 403);
    assert.equal(supportCannotCommand.json().error, "ROLE_TOKEN_INVALID");

    const responsePayload = {
      requestId: "proposal-response-1",
      participantId: "core-2",
      roleSeatToken: coreClaims.get("berth_operations"),
      expectedCollaborationRevision:
        proposal.json().snapshot.collaborationRevision,
      action: "accept"
    };
    const accepted = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/collaboration-items/${proposalItem.id}/respond`,
      payload: responsePayload
    });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.json().result.status, "applied");
    assert.equal(accepted.json().snapshot.revision, businessRevision);
    assert.equal(
      accepted.json().snapshot.resources.find(
        (resource: { id: string }) => resource.id === "quay-crane-1"
      ).status,
      "available"
    );
    const duplicate = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/collaboration-items/${proposalItem.id}/respond`,
      payload: responsePayload
    });
    assert.equal(duplicate.json().result.status, "duplicate");

    const teamTwo = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-2/snapshot`
    });
    assert.equal(teamTwo.json().collaborationRevision, 1);
    assert.equal(teamTwo.json().collaborationItems.length, 0);

    const blockedCapacityChange = await app.inject({
      method: "PATCH",
      url: `/api/class-sessions/${sessionId}/simulation/configuration`,
      payload: {
        expectedStudentCount: 11,
        teamNames: ["六码组", "五码组"],
        teamCapacities: [5, 6]
      }
    });
    assert.equal(blockedCapacityChange.statusCode, 409);
    assert.equal(blockedCapacityChange.json().error, "TEAM_CAPACITY_OCCUPIED");
  } finally {
    await app.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("running port simulations restart in a teacher-resumable paused state", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-port-restart-api-"));
  const dataFile = join(tempDirectory, "state.json");
  const firstApp = await buildApp({
    dataFile,
    openAvatarBaseUrl: "http://127.0.0.1:1",
    portSimulationTickMs: 0
  });
  let firstClosed = false;
  let restartedApp: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    const dashboardResponse = await firstApp.inject({
      method: "GET",
      url: "/api/dashboard"
    });
    const courseId = dashboardResponse.json().featuredCourse.id as string;
    const classResponse = await firstApp.inject({
      method: "POST",
      url: `/api/courses/${courseId}/class-sessions`
    });
    const sessionId = classResponse.json().id as string;

    await firstApp.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      payload: { teamCount: 1, teamNames: ["重启验证组"] }
    });
    const startResponse = await firstApp.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/control`,
      payload: { type: "start", allowIncompleteTeams: true }
    });
    assert.equal(startResponse.statusCode, 200);
    assert.equal(startResponse.json().simulation.teams[0].status, "running");

    await firstApp.close();
    firstClosed = true;
    restartedApp = await buildApp({
      dataFile,
      openAvatarBaseUrl: "http://127.0.0.1:1",
      portSimulationTickMs: 0
    });

    const restoredResponse = await restartedApp.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`
    });
    assert.equal(restoredResponse.statusCode, 200);
    const restored = restoredResponse.json();
    assert.equal(restored.status, "paused");
    assert.equal(restored.clock.wallClockAnchor, null);
    assert.match(restored.clock.pausedReason, /服务已重新启动/u);
    assert.match(restored.recentEvents.at(-1).message, /等待教师恢复/u);
  } finally {
    if (!firstClosed) await firstApp.close();
    if (restartedApp) await restartedApp.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

test("port role leases reconnect within the grace period and reopen after expiry", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "edu-port-role-lease-"));
  const app = await buildApp({
    dataFile: join(tempDirectory, "state.json"),
    openAvatarBaseUrl: "http://127.0.0.1:1",
    presenceTtlMs: 500,
    portSimulationTickMs: 0
  });

  try {
    const dashboardResponse = await app.inject({ method: "GET", url: "/api/dashboard" });
    const courseId = dashboardResponse.json().featuredCourse.id as string;
    const classResponse = await app.inject({
      method: "POST",
      url: `/api/courses/${courseId}/class-sessions`,
      payload: {}
    });
    const sessionId = classResponse.json().id as string;
    await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/setup`,
      payload: { teamCount: 1 }
    });
    for (const participantId of ["lease-student-1", "lease-student-2"]) {
      const joinResponse = await app.inject({
        method: "POST",
        url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/join`,
        payload: { participantId }
      });
      assert.equal(joinResponse.statusCode, 201);
    }

    const firstClaim = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/marine_control/claim`,
      payload: { participantId: "lease-student-1" }
    });
    assert.equal(firstClaim.statusCode, 201);
    const firstToken = firstClaim.json().roleSeatToken as string;

    await wait(20);
    const reconnectClaim = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/marine_control/claim`,
      payload: { participantId: "lease-student-1" }
    });
    assert.equal(reconnectClaim.statusCode, 201);
    assert.equal(reconnectClaim.json().roleSeatToken, firstToken);

    await wait(550);
    const expiredSnapshot = await app.inject({
      method: "GET",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/snapshot`
    });
    assert.equal(
      expiredSnapshot
        .json()
        .roleSeats.find(
          (seat: { role: string }) => seat.role === "marine_control"
        ).connected,
      false
    );

    const replacementClaim = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/marine_control/claim`,
      payload: { participantId: "lease-student-2" }
    });
    assert.equal(replacementClaim.statusCode, 201);
    assert.notEqual(replacementClaim.json().roleSeatToken, firstToken);

    const staleRelease = await app.inject({
      method: "POST",
      url: `/api/class-sessions/${sessionId}/simulation/teams/team-1/roles/marine_control/release`,
      payload: {
        participantId: "lease-student-1",
        roleSeatToken: firstToken
      }
    });
    assert.equal(staleRelease.statusCode, 403);
    assert.equal(staleRelease.json().error, "ROLE_TOKEN_INVALID");
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
