import type {
  PortSimulationCraneOutreachClass,
  PortSimulationResourceKind,
  PortSimulationRole
} from "@edu/contracts";

export interface PortSimulationVesselDefinition {
  id: string;
  label: string;
  etaSimMinute: number;
  requiredOutreachClass: PortSimulationCraneOutreachClass;
  compatibleBerthIds: readonly string[];
  dischargeBatchCount: number;
  loadBatchCount: number;
}

export interface PortSimulationResourceDefinition {
  id: string;
  label: string;
  kind: PortSimulationResourceKind;
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface PortSimulationCargoBatchDefinition {
  id: string;
  vesselId: string;
  direction: "discharge" | "load";
  label: string;
  workUnits: number;
}

export interface PortSimulationIncidentDefinition {
  id: string;
  label: string;
  scheduledAtSimMinute: number;
  durationSimMinutes?: number;
  resourceId?: string;
  queueAmount?: number;
}

export interface PortSimulationQuayServiceSlot {
  id: string;
  berthId: string;
  position: number;
}

export interface PortSimulationQuayTrackDefinition {
  id: string;
  minPosition: number;
  maxPosition: number;
  minimumSeparation: number;
  minutesPerUnit: number;
  serviceSlots: readonly PortSimulationQuayServiceSlot[];
}

export interface PortSimulationScenarioDefinition {
  id: string;
  version: string;
  title: string;
  sceneId: string;
  durationSimMinutes: number;
  baseTimeScale: number;
  roles: readonly PortSimulationRole[];
  vessels: readonly PortSimulationVesselDefinition[];
  resources: readonly PortSimulationResourceDefinition[];
  cargoBatches: readonly PortSimulationCargoBatchDefinition[];
  incidents: readonly PortSimulationIncidentDefinition[];
  quayTrack?: PortSimulationQuayTrackDefinition;
  attribution: string;
}

const roles: readonly PortSimulationRole[] = [
  "marine_control",
  "berth_operations",
  "horizontal_transport",
  "yard_gate"
];

const berths: PortSimulationResourceDefinition[] = Array.from(
  { length: 7 },
  (_, index) => ({
    id: `berth-${String(index + 1).padStart(2, "0")}`,
    label: `泊位 ${String(index + 1).padStart(2, "0")}`,
    kind: "berth",
    metadata: { order: index + 1 }
  })
);

const craneInitialPositions = [40, 140, 240, 340, 540, 640] as const;
const cranes: PortSimulationResourceDefinition[] = craneInitialPositions.map(
  (initialTrackPosition, index) => ({
    id: `quay-crane-${index + 1}`,
    label: `岸桥 QC-${String(index + 1).padStart(2, "0")}`,
    kind: "quay_crane",
    metadata: {
      initialTrackPosition,
      outreachClass: index < 4 ? "standard" : "deep_reach"
    }
  })
);

const quayTrack: PortSimulationQuayTrackDefinition = {
  id: "quay-track-1",
  minPosition: 0,
  maxPosition: 700,
  minimumSeparation: 15,
  minutesPerUnit: 0.2,
  serviceSlots: Array.from({ length: 7 }, (_, berthIndex) => {
    const berthId = `berth-${String(berthIndex + 1).padStart(2, "0")}`;
    const centre = 50 + berthIndex * 100;
    return [-30, -10, 10, 30].map((offset, slotIndex) => ({
      id: `${berthId}-slot-${slotIndex + 1}`,
      berthId,
      position: centre + offset
    }));
  }).flat()
};

const agvs: PortSimulationResourceDefinition[] = Array.from(
  { length: 4 },
  (_, index) => ({
    id: `agv-${index + 1}`,
    label: `AGV-${String(index + 1).padStart(2, "0")}`,
    kind: "agv"
  })
);

const yardBlocks: PortSimulationResourceDefinition[] = Array.from(
  { length: 24 },
  (_, index) => {
    const zone = Math.floor(index / 6);
    return {
      id: `yard-block-${String(index + 1).padStart(2, "0")}`,
      label: `堆场块 ${String(index + 1).padStart(2, "0")}`,
      kind: "yard_block",
      metadata: {
        zone: ["A", "B", "C", "D"][zone] ?? "D",
        distanceBand: zone + 1,
        capacity: 2
      }
    };
  }
);

const vessels: readonly PortSimulationVesselDefinition[] = [
  {
    id: "vessel-a",
    label: "教学船 A · 海岚",
    etaSimMinute: 0,
    requiredOutreachClass: "standard",
    compatibleBerthIds: ["berth-02", "berth-03", "berth-04"],
    dischargeBatchCount: 4,
    loadBatchCount: 4
  },
  {
    id: "vessel-b",
    label: "教学船 B · 江澄",
    etaSimMinute: 60,
    requiredOutreachClass: "deep_reach",
    compatibleBerthIds: ["berth-03", "berth-04", "berth-05"],
    dischargeBatchCount: 4,
    loadBatchCount: 4
  }
];

const cargoBatches: readonly PortSimulationCargoBatchDefinition[] =
  vessels.flatMap((vessel) => [
    ...Array.from({ length: vessel.dischargeBatchCount }, (_, index) => ({
      id: `${vessel.id}-discharge-${index + 1}`,
      vesselId: vessel.id,
      direction: "discharge" as const,
      label: `${vessel.label} · 卸船批次 ${index + 1}`,
      workUnits: 70
    })),
    ...Array.from({ length: vessel.loadBatchCount }, (_, index) => ({
      id: `${vessel.id}-load-${index + 1}`,
      vesselId: vessel.id,
      direction: "load" as const,
      label: `${vessel.label} · 装船批次 ${index + 1}`,
      workUnits: 70
    }))
  ]);

const scenarioResources: readonly PortSimulationResourceDefinition[] = [
  { id: "pilot-1", label: "引航组 01", kind: "pilot" },
  { id: "tug-1", label: "拖轮 01", kind: "tug" },
  { id: "tug-2", label: "拖轮 02", kind: "tug" },
  { id: "channel-1", label: "进出港主航道", kind: "channel" },
  ...berths,
  ...cranes,
  ...agvs,
  ...yardBlocks,
  { id: "gate-lane-1", label: "闸口通道 01", kind: "gate_lane" },
  { id: "gate-lane-2", label: "闸口通道 02", kind: "gate_lane" }
];

const scenarioIncidents: readonly PortSimulationIncidentDefinition[] = [
  {
    id: "agv-03-fault",
    label: "AGV-03 临时故障",
    scheduledAtSimMinute: 270,
    durationSimMinutes: 60,
    resourceId: "agv-3"
  },
  {
    id: "truck-arrival-wave",
    label: "外集卡集中到达",
    scheduledAtSimMinute: 360,
    queueAmount: 18
  }
];

const scenarioBase = {
  id: "teaching-port-dual-vessel-manual",
  sceneId: "yangshan-phase-four-functional-reference",
  durationSimMinutes: 720,
  baseTimeScale: 60,
  roles,
  vessels,
  resources: scenarioResources,
  cargoBatches,
  incidents: scenarioIncidents,
  attribution:
    "功能结构参考上海洋山四期自动化码头；教学示意，非工程图、非导航图。所有船名、任务、时刻和资源配置均为虚构教学场景。"
};

export const PORT_MANUAL_DUAL_VESSEL_SCENARIO_V002: PortSimulationScenarioDefinition = {
  ...scenarioBase,
  version: "0.0.2",
  title: "双船全流程纯手动协同"
};

export const PORT_MANUAL_DUAL_VESSEL_SCENARIO: PortSimulationScenarioDefinition = {
  ...scenarioBase,
  version: "0.0.3",
  title: "双船全流程纯手动协同与岸桥轨位调度",
  quayTrack
};

export function getPortSimulationScenario(
  scenarioVersion: string
): PortSimulationScenarioDefinition {
  return scenarioVersion === PORT_MANUAL_DUAL_VESSEL_SCENARIO_V002.version
    ? PORT_MANUAL_DUAL_VESSEL_SCENARIO_V002
    : PORT_MANUAL_DUAL_VESSEL_SCENARIO;
}

export const PORT_SIMULATION_ROLE_LABELS: Record<PortSimulationRole, string> = {
  marine_control: "港调 / VTS",
  berth_operations: "泊位与岸桥",
  horizontal_transport: "水平运输",
  yard_gate: "堆场与闸口"
};

export const PORT_SIMULATION_SUPPORT_ROLE_LABELS = {
  operations_coordinator: "计划协调员",
  safety_reviewer: "安全与复盘员"
} as const;
