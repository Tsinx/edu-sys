import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PortSimulationTeamSnapshot } from "@edu/contracts";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  createInitialPortSimulationState
} from "@edu/port-simulation-core";
import {
  InteractivePortScene,
  portSceneEntityFitsDefinition
} from "../src/features/port-simulation/InteractivePortScene.js";
import { PortSimulationPreviewPage } from "../src/features/port-simulation/PortSimulationPreviewPage.js";
import { LocalPortSimulationRunner } from "../src/features/port-simulation/LocalPortSimulationStage.js";
import { PortSimulationWorkspace } from "../src/features/port-simulation/PortSimulationWorkspace.js";
import {
  PORT_SCENE_CLICK_THRESHOLD,
  PORT_SCENE_MAX_SCALE,
  PORT_SCENE_MIN_SCALE,
  clampView,
  createFitView,
  ensureBoundsVisible,
  pointerMovementIsClick,
  sampleMotionPath,
  zoomViewAt
} from "../src/features/port-simulation/port-scene-camera.js";
import type {
  PortSceneGeometry,
  PortScenePrimitiveGeometry
} from "../src/features/port-simulation/port-scene-types.js";
import { YANGSHAN_CONTAINER_SCENE } from "../src/features/port-simulation/yangshan-container-scene.js";

function primitiveTypes(geometry: PortSceneGeometry) {
  if (geometry.type !== "group") return [geometry.type];
  return geometry.parts.map((part) => part.geometry.type);
}

function countYardBlocks(geometry: PortSceneGeometry) {
  if (geometry.type !== "group") return 0;
  return geometry.parts.filter(
    (part) => part.tone === "cargo" || part.tone === "warning"
  ).length;
}

test("Yangshan functional scene carries V0.03 quay-track semantics", () => {
  const scene = YANGSHAN_CONTAINER_SCENE;
  const ids = scene.entities.map((entity) => entity.id);
  const geometryTypes = new Set(
    scene.entities.flatMap((entity) => primitiveTypes(entity.geometry))
  );

  assert.equal(scene.version, "0.0.3");
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    scene.entities.filter((entity) => entity.category === "berth").length,
    7
  );
  assert.equal(
    scene.entities
      .filter((entity) => entity.category === "yard-zone")
      .reduce(
        (total, entity) => total + countYardBlocks(entity.geometry),
        0
      ),
    24
  );
  assert.equal(
    scene.entities.filter((entity) => entity.category === "quay-crane")
      .length,
    6
  );
  assert.equal(
    scene.entities.filter(
      (entity) => entity.category === "quay-service-slot"
    ).length,
    28
  );
  assert.equal(
    scene.entities.filter((entity) => entity.category === "agv").length,
    4
  );
  assert.equal(
    scene.entities.filter((entity) => entity.category === "truck").length,
    3
  );
  assert.equal(
    scene.entities.filter((entity) => entity.category === "ship").length,
    2
  );
  for (const macroEntityId of [
    "port-boundary",
    "outer-sea-route-entry",
    "anchorage-area",
    "navigation-channel",
    "turning-basin",
    "hinterland-interface"
  ]) {
    assert.ok(ids.includes(macroEntityId), `${macroEntityId} should exist`);
  }
  assert.deepEqual(
    [...geometryTypes].sort(),
    ["circle", "polygon", "polyline", "rect"] satisfies PortScenePrimitiveGeometry["type"][]
  );
  assert.ok(
    scene.entities.every((entity) =>
      portSceneEntityFitsDefinition(scene, entity)
    )
  );
  assert.match(scene.attribution, /教学示意/u);
  assert.match(scene.attribution, /非工程图、非导航图/u);
});

test("camera zoom keeps its anchor stable and respects hard bounds", () => {
  const extent = { width: 2400, height: 1350 };
  const view = createFitView(extent);
  const anchor = { x: 930, y: 520 };
  const worldBefore = {
    x: (anchor.x - view.x) / view.scale,
    y: (anchor.y - view.y) / view.scale
  };
  const zoomed = zoomViewAt(view, 1.25, anchor, extent);
  const worldAfter = {
    x: (anchor.x - zoomed.x) / zoomed.scale,
    y: (anchor.y - zoomed.y) / zoomed.scale
  };

  assert.ok(Math.abs(worldBefore.x - worldAfter.x) < 0.000_001);
  assert.ok(Math.abs(worldBefore.y - worldAfter.y) < 0.000_001);
  assert.equal(
    clampView({ x: 0, y: 0, scale: 99 }, extent).scale,
    PORT_SCENE_MAX_SCALE
  );
  assert.equal(
    clampView({ x: 0, y: 0, scale: 0.01 }, extent).scale,
    PORT_SCENE_MIN_SCALE
  );
});

test("ensure-visible pans without changing the current zoom", () => {
  const extent = { width: 2400, height: 1350 };
  const view = { x: -1200, y: -500, scale: 2 };
  const next = ensureBoundsVisible(
    view,
    { minX: 50, minY: 400, maxX: 90, maxY: 500 },
    extent,
    0.1
  );
  assert.equal(next.scale, view.scale);
  assert.ok(next.x > view.x);
});

test("pointer threshold separates selection from viewport dragging", () => {
  const start = { x: 100, y: 100 };
  assert.equal(
    pointerMovementIsClick(start, {
      x: 100 + PORT_SCENE_CLICK_THRESHOLD,
      y: 100
    }),
    true
  );
  assert.equal(
    pointerMovementIsClick(start, {
      x: 100 + PORT_SCENE_CLICK_THRESHOLD + 0.1,
      y: 100
    }),
    false
  );
});

test("motion paths interpolate positions and heading without browser state", () => {
  const sample = sampleMotionPath(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ],
    0.75
  );
  assert.equal(sample.x, 100);
  assert.equal(sample.y, 50);
  assert.equal(sample.rotation, 90);
});

test("component renders an accessible, course-safe standalone scene", () => {
  const markup = renderToStaticMarkup(
    createElement(InteractivePortScene, {
      scene: YANGSHAN_CONTAINER_SCENE,
      defaultSelectedEntityId: "berth-03",
      entityHighlights: [
        { entityId: "quay-crane-1", kind: "planned" },
        { entityId: "berth-03-slot-1", kind: "related" }
      ],
      ariaLabel: "自动化集装箱码头交互式功能总图"
    })
  );

  assert.match(markup, /role="application"/u);
  assert.match(markup, /aria-label="自动化集装箱码头交互式功能总图"/u);
  assert.match(markup, /data-scene-version="0\.0\.3"/u);
  assert.match(markup, /data-highlight-kind="planned"/u);
  assert.match(markup, /data-highlight-kind="related"/u);
  assert.match(markup, /aria-label="泊位 03"/u);
  assert.match(markup, /教学示意，非工程图、非导航图/u);
  assert.doesNotMatch(
    markup,
    /teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生/u
  );
});

test("preview opens on the V1.0 local-solo runner", () => {
  const markup = renderToStaticMarkup(
    createElement(PortSimulationPreviewPage)
  );

  assert.match(markup, /PORT SIMULATION · V1\.0 LOCAL SOLO/u);
  assert.match(markup, /登录一次，在本机接管港口全流程/u);
  assert.match(markup, /正在读取本机存档/u);
  assert.doesNotMatch(markup, /课堂主舞台|教学中枢控制/u);
});

test("local-solo runner exposes all four roles without network seats", () => {
  const markup = renderToStaticMarkup(
    createElement(LocalPortSimulationRunner, {
      storage:null,
      actorId: "local-actor",
      actorDisplayName: "本地学生",
      storageScope: "ssr-local",
      initialChallengeId: "joint-watch"
    })
  );

  assert.match(markup, /港调 \/ VTS/u);
  assert.match(markup, /泊位与岸桥/u);
  assert.match(markup, /水平运输/u);
  assert.match(markup, /堆场与闸口/u);
  assert.match(markup, /本机确定性引擎 · 无实时网络依赖/u);
  assert.match(markup, /个人诊断成绩/u);
  assert.doesNotMatch(markup, /认领岗位|课堂实时榜|正在建立权威连接/u);
});

test("manual workspace renders shared state and only the selected role commands", () => {
  const state = createInitialPortSimulationState(
    PORT_MANUAL_DUAL_VESSEL_SCENARIO
  );
  const snapshot: PortSimulationTeamSnapshot = {
    schemaVersion: "1.1",
    syncMode: "event_stream_v1",
    runId: "ssr-run",
    challengeId: "compound-disruption",
    challengeVersion: "1.0.0",
    attemptNumber: 1,
    previousBestScore: null,
    latestSequence: 0,
    presenceRevision: 1,
    stateHash: "ssr-state",
    sessionId: "ssr-session",
    teamId: "ssr-team",
    teamName: "协同验证组",
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    revision: state.revision,
    collaborationRevision: 1,
    memberCount: 5,
    memberCapacity: 5,
    classroomObserverCount: 0,
    status: state.status,
    clock: state.clock,
    roleSeats: PORT_MANUAL_DUAL_VESSEL_SCENARIO.roles.map((role) => ({
      role,
      participantId: role === "yard_gate" ? "student-yard" : null,
      claimedAt: null,
      leaseExpiresAt: null,
      connected: role === "yard_gate"
    })),
    supportSeats: [
      {
        role: "operations_coordinator",
        participantId: "student-planner",
        claimedAt: null,
        leaseExpiresAt: null,
        connected: true
      }
    ],
    collaborationItems: [],
    vessels: state.vessels,
    resources: state.resources,
    tasks: state.tasks,
    queues: state.queues,
    incidents: state.incidents,
    metrics: state.metrics,
    recentEvents: state.recentEvents
  };
  const markup = renderToStaticMarkup(
    createElement(PortSimulationWorkspace, {
      snapshot,
      role: "yard_gate",
      commandBusy: true,
      onCommand: () => undefined
    })
  );

  assert.match(markup, /协同验证组/u);
  assert.match(markup, /堆场与闸口/u);
  assert.match(markup, /分配堆场块/u);
  assert.match(markup, /待我决策/u);
  assert.match(markup, /等待其他岗位/u);
  assert.match(markup, /实时暂定成绩/u);
  assert.match(markup, /安全规范/u);
  assert.match(markup, /故障与高峰叠加/u);
  assert.doesNotMatch(markup, /配置引航与拖轮|分配岸桥/u);
  assert.doesNotMatch(
    markup,
    /teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生/u
  );
});
