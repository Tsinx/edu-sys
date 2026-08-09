import type {
  PortSimulationResourceStatus,
  PortSimulationVesselStage
} from "@edu/contracts";
import type { PortSimulationEngineState } from "./engine.js";

export interface PortSimulationEntityProjection {
  entityId: string;
  x?: number;
  y?: number;
  rotation?: number;
  operationalState:
    | "idle"
    | "assigned"
    | "busy"
    | "moving"
    | "waiting"
    | "fault"
    | "closed"
    | "completed";
  statusLabel: string;
}

function resourceProjectionState(status: PortSimulationResourceStatus) {
  if (status === "busy") return "busy" as const;
  if (status === "moving") return "moving" as const;
  if (status === "assigned") return "assigned" as const;
  if (status === "fault" || status === "charging") return "fault" as const;
  if (status === "closed") return "closed" as const;
  return "idle" as const;
}

const RESOURCE_STATUS_LABELS: Record<PortSimulationResourceStatus, string> = {
  available: "可用",
  assigned: "已分配",
  busy: "执行中",
  moving: "移位中",
  charging: "充电中",
  fault: "故障",
  closed: "关闭"
};

const VESSEL_STAGE_LABELS: Record<PortSimulationVesselStage, string> = {
  scheduled: "计划到港",
  anchorage: "锚地等待",
  inbound: "进港航行",
  berthed: "已靠妥",
  working: "装卸作业",
  ready_departure: "待离港",
  outbound: "离港航行",
  departed: "已离港"
};

function berthPosition(berthId: string | null, vesselIndex: number) {
  const berthNumber = Number(berthId?.split("-").at(-1) ?? 3);
  const centreX = 56 + (Math.max(1, berthNumber) - 1) * 335 + 155;
  return {
    x: centreX - (vesselIndex === 0 ? 260 : 135),
    y: vesselIndex === 0 ? 222 : 252
  };
}

export function projectPortSimulationEntities(
  state: Pick<PortSimulationEngineState, "clock" | "resources" | "vessels">
): PortSimulationEntityProjection[] {
  const projections: PortSimulationEntityProjection[] = state.resources
    .filter((resource) =>
      ["berth", "quay_crane"].includes(resource.kind)
    )
    .map((resource) => {
      const crane = resource.quayCrane;
      let trackPosition = crane?.trackPosition;
      if (
        crane?.movementStartPosition !== null &&
        crane?.movementStartPosition !== undefined &&
        crane.targetTrackPosition !== null &&
        crane.movementStartedAtSimMinute !== null &&
        crane.movementEndsAtSimMinute !== null
      ) {
        const duration =
          crane.movementEndsAtSimMinute - crane.movementStartedAtSimMinute;
        const progress = duration <= 0
          ? 1
          : Math.max(
              0,
              Math.min(
                1,
                (state.clock.simMinute - crane.movementStartedAtSimMinute) /
                  duration
              )
            );
        trackPosition =
          crane.movementStartPosition +
          (crane.targetTrackPosition - crane.movementStartPosition) * progress;
      }
      const outreachLabel = crane
        ? crane.outreachClass === "deep_reach"
          ? "大伸距"
          : "标准伸距"
        : null;
      return {
        entityId: resource.id,
        ...(trackPosition !== undefined
          ? { x: 43.5 + trackPosition * 3.35, y: 434 }
          : {}),
        operationalState: resourceProjectionState(resource.status),
        statusLabel: `${resource.label} · ${RESOURCE_STATUS_LABELS[resource.status]}${outreachLabel ? ` · ${outreachLabel}` : ""}`
      };
    });

  const gateLanes = state.resources.filter(
    (resource) => resource.kind === "gate_lane"
  );
  if (gateLanes.length > 0) {
    const gateStatus: PortSimulationResourceStatus = gateLanes.some(
      (lane) => lane.status === "busy"
    )
      ? "busy"
      : gateLanes.some((lane) => lane.status === "available")
        ? "available"
        : "closed";
    projections.push({
      entityId: "truck-gate",
      operationalState: resourceProjectionState(gateStatus),
      statusLabel: `智能闸口 · ${gateLanes.filter((lane) => lane.status !== "closed").length} 条通道开放`
    });
  }

  for (const zone of ["A", "B", "C", "D"] as const) {
    const blocks = state.resources.filter(
      (resource) =>
        resource.kind === "yard_block" && resource.metadata.zone === zone
    );
    if (blocks.length === 0) continue;
    const zoneStatus: PortSimulationResourceStatus = blocks.some(
      (block) => block.status === "busy"
    )
      ? "busy"
      : blocks.some((block) => block.status === "assigned")
        ? "assigned"
        : "available";
    projections.push({
      entityId: `yard-zone-${zone.toLowerCase()}`,
      operationalState: resourceProjectionState(zoneStatus),
      statusLabel: `自动化堆场 ${zone} 区 · ${RESOURCE_STATUS_LABELS[zoneStatus]}`
    });
  }

  state.vessels.forEach((vessel, index) => {
    let position = index === 0 ? { x: 2060, y: 100 } : { x: 2200, y: 132 };
    let operationalState: PortSimulationEntityProjection["operationalState"] =
      "waiting";
    if (["berthed", "working", "ready_departure"].includes(vessel.stage)) {
      position = berthPosition(vessel.berthId, index);
      operationalState = vessel.stage === "working" ? "busy" : "assigned";
    } else if (vessel.stage === "inbound" || vessel.stage === "outbound") {
      const end = vessel.stageEndsAtSimMinute ?? state.clock.simMinute + 45;
      const start = end - 45;
      const progress = Math.max(
        0,
        Math.min(1, (state.clock.simMinute - start) / 45)
      );
      const berth = berthPosition(vessel.berthId, index);
      const offshore = index === 0 ? { x: 2060, y: 100 } : { x: 2200, y: 132 };
      const from = vessel.stage === "inbound" ? offshore : berth;
      const to = vessel.stage === "inbound" ? berth : offshore;
      position = {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress
      };
      operationalState = "busy";
    } else if (vessel.stage === "departed") {
      position = index === 0 ? { x: 2280, y: 36 } : { x: 2310, y: 95 };
      operationalState = "completed";
    }
    projections.push({
      entityId: index === 0 ? "vessel-alongside" : "vessel-approach",
      x: position.x,
      y: position.y,
      operationalState,
      statusLabel: `${vessel.label} · ${VESSEL_STAGE_LABELS[vessel.stage]}`
    });
  });

  state.resources
    .filter((resource) => resource.kind === "agv")
    .forEach((resource, index) => {
      const owner = state.vessels.find(
        (vessel) => vessel.id === resource.assignedTo
      );
      const berthNumber = Number(owner?.berthId?.split("-").at(-1) ?? 6);
      projections.push({
        entityId: resource.id,
        x: owner ? 150 + (berthNumber - 1) * 280 : 2020 + index * 70,
        y: owner ? 510 + index * 14 : 590,
        operationalState: resourceProjectionState(resource.status),
        statusLabel: `${resource.label} · ${RESOURCE_STATUS_LABELS[resource.status]}`
      });
    });

  return projections;
}
