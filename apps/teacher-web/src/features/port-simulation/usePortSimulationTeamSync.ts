import type {
  PortSimulationCheckpoint,
  PortSimulationPresenceDelta,
  PortSimulationTeamSnapshot
} from "@edu/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../../api";

export type PortSimulationConnectionState =
  | "connecting"
  | "reconnecting"
  | "catching_up"
  | "synced"
  | "offline"
  | "resyncing"
  | "legacy";

interface WorkerReplayState {
  engine: PortSimulationCheckpoint["state"]["engine"];
  collaborationRevision: number;
  collaborationItems: PortSimulationCheckpoint["state"]["collaborationItems"];
  lastAppliedSequence: number;
}

interface WorkerOutput {
  type: "ready" | "state" | "resync_required";
  runId: string | null;
  state?: WorkerReplayState;
  stateHash?: string;
  expectedStateHash?: string;
  consistent?: boolean;
  reason?: string;
}

export function checkpointToTeamSnapshot(
  checkpoint: PortSimulationCheckpoint
): PortSimulationTeamSnapshot {
  const { state } = checkpoint;
  return {
    schemaVersion: "1.1",
    syncMode: "event_stream_v1",
    runId: checkpoint.runId,
    challengeId: checkpoint.challengeId,
    challengeVersion: checkpoint.challengeVersion,
    attemptNumber: checkpoint.attemptNumber,
    previousBestScore: checkpoint.previousBestScore,
    latestSequence: checkpoint.sequence,
    presenceRevision: state.presenceRevision,
    stateHash: checkpoint.stateHash,
    sessionId: checkpoint.sessionId,
    teamId: checkpoint.teamId,
    teamName: state.teamName,
    scenarioId: checkpoint.scenarioId,
    scenarioVersion: checkpoint.scenarioVersion,
    revision: state.engine.revision,
    collaborationRevision: state.collaborationRevision,
    memberCount: state.memberCount,
    memberCapacity: state.memberCapacity,
    classroomObserverCount: state.classroomObserverCount,
    status: state.engine.status,
    clock: structuredClone(state.engine.clock),
    roleSeats: structuredClone(state.roleSeats),
    supportSeats: structuredClone(state.supportSeats),
    collaborationItems: structuredClone(state.collaborationItems),
    vessels: structuredClone(state.engine.vessels),
    resources: structuredClone(state.engine.resources),
    tasks: structuredClone(state.engine.tasks),
    queues: structuredClone(state.engine.queues),
    incidents: structuredClone(state.engine.incidents),
    metrics: structuredClone(state.engine.metrics),
    recentEvents: structuredClone(state.engine.recentEvents)
  };
}

function mergeWorkerState(
  previous: PortSimulationTeamSnapshot,
  state: WorkerReplayState,
  stateHash: string
): PortSimulationTeamSnapshot {
  return {
    ...previous,
    latestSequence: state.lastAppliedSequence,
    stateHash,
    revision: state.engine.revision,
    collaborationRevision: state.collaborationRevision,
    status: state.engine.status,
    clock: structuredClone(state.engine.clock),
    collaborationItems: structuredClone(state.collaborationItems),
    vessels: structuredClone(state.engine.vessels),
    resources: structuredClone(state.engine.resources),
    tasks: structuredClone(state.engine.tasks),
    queues: structuredClone(state.engine.queues),
    incidents: structuredClone(state.engine.incidents),
    metrics: structuredClone(state.engine.metrics),
    recentEvents: structuredClone(state.engine.recentEvents)
  };
}

function mergePresence(
  previous: PortSimulationTeamSnapshot,
  presence: PortSimulationPresenceDelta
) {
  if (presence.runId !== previous.runId) return previous;
  return {
    ...previous,
    presenceRevision: presence.presenceRevision,
    memberCount: presence.memberCount,
    roleSeats: presence.roleSeats,
    supportSeats: presence.supportSeats
  };
}

export function usePortSimulationTeamSync(
  sessionId: string,
  teamId: string | undefined
) {
  const [snapshot, setSnapshot] = useState<PortSimulationTeamSnapshot>();
  const [connectionState, setConnectionState] =
    useState<PortSimulationConnectionState>("connecting");
  const [consistent, setConsistent] = useState(true);
  const [lastSyncLatencyMs, setLastSyncLatencyMs] = useState<number | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const restartRef = useRef<(() => void) | null>(null);

  const forceResync = useCallback(() => {
    setConnectionState("resyncing");
    restartRef.current?.();
  }, []);

  const acceptServerSnapshot = useCallback(
    (nextSnapshot: PortSimulationTeamSnapshot) => {
      setSnapshot((previous) => {
        if (!previous || nextSnapshot.syncMode === "snapshot_legacy") {
          return nextSnapshot;
        }
        if (previous.runId !== nextSnapshot.runId) return nextSnapshot;
        return {
          ...previous,
          teamName: nextSnapshot.teamName,
          challengeId: nextSnapshot.challengeId,
          challengeVersion: nextSnapshot.challengeVersion,
          attemptNumber: nextSnapshot.attemptNumber,
          previousBestScore: nextSnapshot.previousBestScore,
          memberCount: nextSnapshot.memberCount,
          memberCapacity: nextSnapshot.memberCapacity,
          presenceRevision: nextSnapshot.presenceRevision,
          roleSeats: nextSnapshot.roleSeats,
          supportSeats: nextSnapshot.supportSeats
        };
      });
    },
    []
  );

  useEffect(() => {
    if (!teamId) {
      setSnapshot(undefined);
      setConnectionState("connecting");
      return undefined;
    }

    let disposed = false;
    let generation = 0;
    let unsubscribe: (() => void) | undefined;
    let fallbackTimer: number | undefined;
    const worker = new Worker(
      new URL("./port-simulation-sync.worker.ts", import.meta.url),
      { type: "module" }
    );

    const clearConnections = () => {
      unsubscribe?.();
      unsubscribe = undefined;
      if (fallbackTimer !== undefined) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const start = async (resync = false) => {
      const currentGeneration = ++generation;
      clearConnections();
      setConnectionState(resync ? "resyncing" : "connecting");
      try {
        const checkpoint = await api.getPortSimulationCheckpoint(
          sessionId,
          teamId
        );
        if (disposed || currentGeneration !== generation) return;
        setSnapshot(checkpointToTeamSnapshot(checkpoint));
        setConsistent(true);
        worker.postMessage({ type: "initialize", checkpoint });

        const pollMissingEvents = async () => {
          const afterSequence =
            snapshot?.runId === checkpoint.runId
              ? snapshot.latestSequence
              : checkpoint.sequence;
          try {
            const batch = await api.getPortSimulationEventsAfter(
              sessionId,
              teamId,
              afterSequence
            );
            if (batch.resyncRequired) {
              void start(true);
              return;
            }
            for (const event of batch.events) {
              worker.postMessage({ type: "event", event });
            }
          } catch {
            setConnectionState("offline");
          }
        };

        unsubscribe = api.subscribePortSimulationEventStream(
          sessionId,
          teamId,
          checkpoint.sequence,
          (message) => {
            if (message.type === "event") {
              setConnectionState("catching_up");
              worker.postMessage({ type: "event", event: message.event });
            } else if (message.type === "time_sync") {
              setLastSyncLatencyMs(
                Math.max(0, Date.now() - new Date(message.timeSync.serverTime).getTime())
              );
              worker.postMessage({ type: "time_sync", timeSync: message.timeSync });
            } else if (message.type === "presence") {
              setSnapshot((previous) =>
                previous ? mergePresence(previous, message.presence) : previous
              );
            } else {
              void start(true);
            }
          },
          (connected) => {
            if (connected) {
              if (fallbackTimer !== undefined) {
                window.clearInterval(fallbackTimer);
                fallbackTimer = undefined;
              }
              setConnectionState((current) =>
                current === "catching_up" ? current : "synced"
              );
            } else if (!disposed) {
              setReconnectCount((count) => count + 1);
              setConnectionState(navigator.onLine ? "reconnecting" : "offline");
              fallbackTimer ??= window.setInterval(
                () => void pollMissingEvents(),
                5_000
              );
            }
          }
        );
      } catch (error) {
        if (disposed || currentGeneration !== generation) return;
        if (error instanceof ApiError && error.status === 409) {
          setConnectionState("legacy");
          const refreshLegacy = async () => {
            const nextSnapshot = await api.getPortSimulationTeamSnapshot(
              sessionId,
              teamId
            );
            if (!disposed) setSnapshot(nextSnapshot);
          };
          await refreshLegacy();
          unsubscribe = api.subscribePortSimulationTeamSnapshot(
            sessionId,
            teamId,
            setSnapshot,
            (connected) =>
              setConnectionState(connected ? "legacy" : "reconnecting")
          );
          fallbackTimer = window.setInterval(
            () => void refreshLegacy().catch(() => setConnectionState("offline")),
            5_000
          );
        } else {
          setConnectionState("offline");
        }
      }
    };

    worker.addEventListener("message", (event: MessageEvent<WorkerOutput>) => {
      const message = event.data;
      if (message.type === "resync_required") {
        setConsistent(false);
        void start(true);
        return;
      }
      if (!message.state || !message.stateHash) return;
      if (!message.consistent) {
        setConsistent(false);
        void start(true);
        return;
      }
      setConsistent(true);
      setSnapshot((previous) =>
        previous
          ? mergeWorkerState(previous, message.state!, message.stateHash!)
          : previous
      );
      setConnectionState("synced");
    });

    restartRef.current = () => void start(true);
    void start();
    return () => {
      disposed = true;
      generation += 1;
      restartRef.current = null;
      clearConnections();
      worker.terminate();
    };
  }, [sessionId, teamId]);

  return {
    snapshot,
    connectionState,
    consistent,
    lastSyncLatencyMs,
    reconnectCount,
    commandEnabled:
      consistent && ["synced", "legacy"].includes(connectionState),
    forceResync,
    acceptServerSnapshot
  };
}
