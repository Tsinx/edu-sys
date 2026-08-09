/// <reference lib="webworker" />

import type {
  PortSimulationCanonicalEvent,
  PortSimulationCheckpoint,
  PortSimulationTimeSync
} from "@edu/contracts";
import {
  advancePortSimulation,
  getPortSimulationScenarioForChallenge,
  hashPortSimulationState,
  replayPortSimulationCanonicalEvent,
  type PortSimulationReplayState
} from "@edu/port-simulation-core";

type WorkerInput =
  | { type: "initialize"; checkpoint: PortSimulationCheckpoint }
  | { type: "event"; event: PortSimulationCanonicalEvent }
  | { type: "time_sync"; timeSync: PortSimulationTimeSync };

type WorkerOutput =
  | {
      type: "ready" | "state";
      runId: string;
      state: PortSimulationReplayState;
      stateHash: string;
      expectedStateHash: string;
      consistent: boolean;
    }
  | {
      type: "resync_required";
      runId: string | null;
      reason: string;
    };

let runId: string | null = null;
let replayState: PortSimulationReplayState | null = null;
let scenarioVersion: string | null = null;
let challengeId: PortSimulationCheckpoint["challengeId"] | null = null;

async function publishState(
  type: "ready" | "state",
  expectedStateHash: string
) {
  if (!runId || !replayState) return;
  const stateHash = await hashPortSimulationState(replayState.engine);
  self.postMessage({
    type,
    runId,
    state: replayState,
    stateHash,
    expectedStateHash,
    consistent: stateHash === expectedStateHash
  } satisfies WorkerOutput);
}

async function handleMessage(message: WorkerInput) {
  if (message.type === "initialize") {
    runId = message.checkpoint.runId;
    scenarioVersion = message.checkpoint.scenarioVersion;
    challengeId = message.checkpoint.challengeId;
    replayState = {
      engine: structuredClone(message.checkpoint.state.engine),
      collaborationRevision:
        message.checkpoint.state.collaborationRevision,
      collaborationItems: structuredClone(
        message.checkpoint.state.collaborationItems
      ),
      lastAppliedSequence: message.checkpoint.sequence
    };
    await publishState("ready", message.checkpoint.stateHash);
    return;
  }
  if (!runId || !replayState || !scenarioVersion || !challengeId) {
    self.postMessage({
      type: "resync_required",
      runId,
      reason: "WORKER_NOT_INITIALIZED"
    } satisfies WorkerOutput);
    return;
  }
  if (
    (message.type === "event" && message.event.runId !== runId) ||
    (message.type === "time_sync" && message.timeSync.runId !== runId)
  ) {
    self.postMessage({
      type: "resync_required",
      runId,
      reason: "RUN_ID_MISMATCH"
    } satisfies WorkerOutput);
    return;
  }

  const scenario = getPortSimulationScenarioForChallenge(
    challengeId,
    scenarioVersion
  );
  if (message.type === "event") {
    try {
      replayState = replayPortSimulationCanonicalEvent(
        replayState,
        scenario,
        message.event
      );
    } catch (error) {
      self.postMessage({
        type: "resync_required",
        runId,
        reason: error instanceof Error ? error.message : "EVENT_REPLAY_FAILED"
      } satisfies WorkerOutput);
      return;
    }
    await publishState("state", message.event.stateHash);
    return;
  }

  if (message.timeSync.sequence < replayState.lastAppliedSequence) return;
  if (message.timeSync.sequence > replayState.lastAppliedSequence) {
    self.postMessage({
      type: "resync_required",
      runId,
      reason: "EVENTS_MISSING_BEFORE_TIME_SYNC"
    } satisfies WorkerOutput);
    return;
  }
  replayState = {
    ...replayState,
    engine: advancePortSimulation(
      replayState.engine,
      scenario,
      message.timeSync.simMinute
    )
  };
  await publishState("state", message.timeSync.stateHash);
}

let queue = Promise.resolve();
self.addEventListener("message", (event: MessageEvent<WorkerInput>) => {
  queue = queue
    .then(() => handleMessage(event.data))
    .catch((error) => {
      self.postMessage({
        type: "resync_required",
        runId,
        reason: error instanceof Error ? error.message : "WORKER_FAILURE"
      } satisfies WorkerOutput);
    });
});

export {};
