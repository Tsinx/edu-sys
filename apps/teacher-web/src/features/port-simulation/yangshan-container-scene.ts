import { PORT_MANUAL_DUAL_VESSEL_SCENARIO } from "@edu/port-simulation-core";
import type {
  PortSceneDetail,
  PortSceneEntity,
  PortSceneGeometry,
  PortSceneGeometryPart,
  PortScenePoint,
  PortScenePrimitiveGeometry
} from "./port-scene-types";
import type { PortSceneDefinition } from "./port-scene-types";

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0
): PortScenePrimitiveGeometry => ({ type: "rect", x, y, width, height, rx });

const line = (
  points: readonly PortScenePoint[]
): PortScenePrimitiveGeometry => ({ type: "polyline", points });

const polygon = (
  points: readonly PortScenePoint[]
): PortScenePrimitiveGeometry => ({ type: "polygon", points });

const circle = (
  cx: number,
  cy: number,
  r: number
): PortScenePrimitiveGeometry => ({ type: "circle", cx, cy, r });

const group = (
  parts: readonly PortSceneGeometryPart[]
): PortSceneGeometry => ({ type: "group", parts });

const part = (
  geometry: PortScenePrimitiveGeometry,
  tone: PortSceneGeometryPart["tone"] = "base"
): PortSceneGeometryPart => ({ geometry, tone });

const details = (
  type: string,
  functionText: string,
  flow: string,
  status = "演示状态 · 可用"
): readonly PortSceneDetail[] => [
  { label: "类型", value: type },
  { label: "功能", value: functionText },
  { label: "关联流程", value: flow },
  { label: "演示状态", value: status }
];

function createShipGeometry(length: number, width: number): PortSceneGeometry {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const cargoWidth = length * 0.11;
  const cargoGap = length * 0.025;
  const cargoStart = -length * 0.27;
  const cargoParts = Array.from({ length: 4 }, (_, index) =>
    part(
      rect(
        cargoStart + index * (cargoWidth + cargoGap),
        -halfWidth * 0.58,
        cargoWidth,
        halfWidth * 1.16,
        3
      ),
      "cargo"
    )
  );
  return group([
    part(
      polygon([
        { x: -halfLength, y: -halfWidth * 0.72 },
        { x: halfLength * 0.78, y: -halfWidth },
        { x: halfLength, y: 0 },
        { x: halfLength * 0.78, y: halfWidth },
        { x: -halfLength, y: halfWidth * 0.72 }
      ])
    ),
    ...cargoParts,
    part(rect(-halfLength * 0.82, -halfWidth * 0.55, length * 0.13, width * 0.55, 4), "window"),
    part(line([
      { x: -halfLength * 0.55, y: 0 },
      { x: halfLength * 0.76, y: 0 }
    ]), "detail")
  ]);
}

function createCraneGeometry(): PortSceneGeometry {
  return group([
    part(rect(-32, -12, 64, 38, 5)),
    part(line([
      { x: -28, y: 14 },
      { x: -28, y: -105 },
      { x: 0, y: -148 },
      { x: 28, y: -105 },
      { x: 28, y: 14 }
    ]), "detail"),
    part(line([
      { x: -72, y: -104 },
      { x: 72, y: -104 }
    ]), "accent"),
    part(circle(-22, 25, 6), "muted"),
    part(circle(22, 25, 6), "muted")
  ]);
}

function createVehicleGeometry(
  length: number,
  width: number,
  cargo = false
): PortSceneGeometry {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  return group([
    part(rect(-halfLength, -halfWidth, length, width, 5)),
    part(
      rect(
        cargo ? -halfLength * 0.4 : halfLength * 0.28,
        -halfWidth * 0.72,
        cargo ? length * 0.75 : length * 0.23,
        width * 0.58,
        2
      ),
      cargo ? "cargo" : "window"
    ),
    part(circle(-halfLength * 0.55, halfWidth + 2, 3.5), "muted"),
    part(circle(halfLength * 0.55, halfWidth + 2, 3.5), "muted")
  ]);
}

const backgroundEntities: readonly PortSceneEntity[] = [
  {
    id: "harbour-water",
    layerId: "base",
    category: "water",
    label: "港口水域",
    appearance: "water",
    geometry: rect(0, 0, 2400, 310),
    details: [],
    selectable: false,
    showLabel: true,
    labelPosition: { x: 150, y: 82, anchor: "middle" }
  },
  {
    id: "terminal-land",
    layerId: "base",
    category: "land",
    label: "港口陆域",
    appearance: "land",
    geometry: rect(0, 310, 2400, 1040),
    details: [],
    selectable: false,
    showLabel: true,
    labelPosition: { x: 2220, y: 610, anchor: "middle" }
  },
  {
    id: "quay-edge",
    layerId: "infrastructure",
    category: "quay",
    label: "连续岸线",
    appearance: "quay",
    geometry: group([
      part(rect(0, 296, 2400, 164)),
      part(line([
        { x: 0, y: 310 },
        { x: 2400, y: 310 }
      ]), "accent"),
      part(line([
        { x: 0, y: 448 },
        { x: 2400, y: 448 }
      ]), "detail")
    ]),
    details: details(
      "岸线与码头前沿",
      "衔接船舶靠泊、岸桥装卸与水平运输",
      "船舶 → 岸桥 → AGV"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 1180, y: 330, anchor: "middle" }
  },
  {
    id: "agv-corridor",
    layerId: "infrastructure",
    category: "transport-lane",
    label: "AGV 专用通道",
    appearance: "lane",
    geometry: group([
      part(rect(85, 478, 1790, 112, 10)),
      part(line([
        { x: 115, y: 510 },
        { x: 1845, y: 510 }
      ]), "detail"),
      part(line([
        { x: 1845, y: 557 },
        { x: 115, y: 557 }
      ]), "detail")
    ]),
    details: details(
      "自动水平运输通道",
      "连接岸桥交接区与自动化堆场",
      "岸桥 → AGV → 堆场"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 980, y: 545, anchor: "middle" }
  },
  {
    id: "external-road",
    layerId: "infrastructure",
    category: "road",
    label: "外集卡通道",
    appearance: "road",
    geometry: group([
      part(rect(80, 1202, 2250, 92, 10)),
      part(line([
        { x: 105, y: 1248 },
        { x: 2300, y: 1248 }
      ]), "detail")
    ]),
    details: details(
      "陆侧集疏运通道",
      "组织外集卡进出与闸口衔接",
      "堆场 → 缓冲区 → 闸口"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 1000, y: 1267, anchor: "middle" }
  }
];

const macroEntities: readonly PortSceneEntity[] = [
  {
    id: "port-boundary",
    layerId: "macro",
    category: "port-boundary",
    label: "港界",
    appearance: "port-boundary",
    geometry: group([
      part(rect(12, 12, 2376, 1326, 18), "detail")
    ]),
    details: details(
      "港口总体范围",
      "界定本场景中港口水域、陆域和生产设施的管理范围",
      "外部海域与腹地 ↔ 港界 ↔ 港口生产系统",
      "教学状态 · 边界示意"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 72, y: 45, anchor: "start" }
  },
  {
    id: "outer-sea-route-entry",
    layerId: "macro",
    category: "route-entry",
    label: "港外航线入口",
    appearance: "route-entry",
    geometry: group([
      part(line([
        { x: 2375, y: 162 },
        { x: 2180, y: 166 },
        { x: 2000, y: 181 }
      ]), "detail"),
      part(polygon([
        { x: 1996, y: 181 },
        { x: 2034, y: 162 },
        { x: 2028, y: 198 }
      ]), "accent")
    ]),
    details: details(
      "港外航线衔接点",
      "表示船舶从外部航运网络进入本港交通组织范围的位置",
      "港外航线 → 锚地或进港航道 → 港池",
      "教学状态 · 船舶到港入口"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 2250, y: 140, anchor: "middle" }
  },
  {
    id: "anchorage-area",
    layerId: "macro",
    category: "anchorage",
    label: "锚地",
    appearance: "anchorage",
    geometry: circle(2135, 75, 58),
    details: details(
      "船舶候泊水域",
      "为尚未获得进港、引航或泊位条件的船舶提供等待位置",
      "港外航线 → 锚地等待 → 引航进港",
      "教学状态 · 可安排等待"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 2135, y: 82, anchor: "middle" }
  },
  {
    id: "navigation-channel",
    layerId: "macro",
    category: "navigation-channel",
    label: "进港航道",
    appearance: "navigation-channel",
    geometry: polygon([
      { x: 2380, y: 180 },
      { x: 2020, y: 184 },
      { x: 1700, y: 218 },
      { x: 1415, y: 236 },
      { x: 1425, y: 278 },
      { x: 1710, y: 260 },
      { x: 2028, y: 224 },
      { x: 2380, y: 220 }
    ]),
    details: details(
      "船舶进出港通道",
      "组织受控船舶从港外水域进入港池，并实施航道互斥",
      "锚地 → 引航与拖轮 → 航道 → 回旋水域",
      "教学状态 · 通航条件正常"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 1850, y: 245, anchor: "middle" }
  },
  {
    id: "turning-basin",
    layerId: "macro",
    category: "turning-basin",
    label: "回旋水域",
    appearance: "turning-basin",
    geometry: circle(1355, 250, 52),
    details: details(
      "船舶回旋水域",
      "为船舶靠离泊前后的转向和姿态调整提供受控水域",
      "进港航道 → 回旋 → 泊位前沿",
      "教学状态 · 水域空闲"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 1355, y: 256, anchor: "middle" }
  },
  {
    id: "hinterland-interface",
    layerId: "macro",
    category: "hinterland-interface",
    label: "腹地集疏运接口",
    appearance: "hinterland-interface",
    geometry: group([
      part(rect(1940, 1298, 420, 34, 8), "base"),
      part(line([
        { x: 1980, y: 1315 },
        { x: 2320, y: 1315 }
      ]), "detail"),
      part(polygon([
        { x: 2350, y: 1315 },
        { x: 2318, y: 1302 },
        { x: 2318, y: 1328 }
      ]), "accent")
    ]),
    details: details(
      "港口与腹地运输衔接点",
      "把港区闸口与场景外的公路、铁路和物流节点连接起来",
      "堆场与闸口 ↔ 集疏运接口 ↔ 腹地物流网络",
      "教学状态 · 公路接口开放"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 2150, y: 1282, anchor: "middle" }
  }
];

const berthEntities: readonly PortSceneEntity[] = Array.from(
  { length: 7 },
  (_, index) => {
    const x = 56 + index * 335;
    const berthNumber = String(index + 1).padStart(2, "0");
    return {
      id: `berth-${berthNumber}`,
      layerId: "infrastructure",
      category: "berth",
      label: `泊位 ${berthNumber}`,
      appearance: "berth",
      geometry: group([
        part(rect(x, 322, 310, 112, 8)),
        part(line([
          { x: x + 20, y: 420 },
          { x: x + 290, y: 420 }
        ]), "detail")
      ]),
      details: details(
        "集装箱泊位",
        "形成船舶靠泊和岸桥作业窗口",
        "进港 → 靠泊 → 装卸 → 离港",
        index === 2 ? "演示状态 · 正在作业" : "演示状态 · 待命"
      ),
      selectable: true,
      showLabel: true,
      labelPosition: { x: x + 155, y: 405, anchor: "middle" as const }
    } satisfies PortSceneEntity;
  }
);

const yardPositions = [
  { id: "a", x: 150, y: 650 },
  { id: "b", x: 1020, y: 650 },
  { id: "c", x: 150, y: 920 },
  { id: "d", x: 1020, y: 920 }
] as const;

const yardEntities: readonly PortSceneEntity[] = yardPositions.map(
  ({ id, x, y }, zoneIndex) => {
    const blockParts = Array.from({ length: 6 }, (_, blockIndex) => {
      const column = blockIndex % 3;
      const row = Math.floor(blockIndex / 3);
      return part(
        rect(column * 244, row * 104, 216, 82, 7),
        blockIndex === 4 && id === "b" ? "warning" : "cargo"
      );
    });
    const zoneName = id.toUpperCase();
    return {
      id: `yard-zone-${id}`,
      layerId: "yard",
      category: "yard-zone",
      label: `自动化堆场 ${zoneName} 区`,
      appearance: "yard",
      position: { x, y },
      geometry: group([
        part(rect(-22, -28, 752, 234, 12)),
        ...blockParts
      ]),
      details: details(
        "自动化堆场分区",
        "承接进口、出口与中转箱的暂存和交接",
        "AGV → 自动化轨道吊 → 箱区",
        zoneIndex === 1 ? "演示状态 · 局部繁忙" : "演示状态 · 周转正常"
      ),
      selectable: true,
      showLabel: true,
      labelPosition: { x: 354, y: -42, anchor: "middle" as const }
    } satisfies PortSceneEntity;
  }
);

const craneXs = [430, 700, 970, 1240, 1510, 1780] as const;
const quayTrackEntities: readonly PortSceneEntity[] = [
  {
    id: "quay-track-1",
    layerId: "infrastructure",
    category: "quay-track",
    label: "岸桥共用轨道",
    appearance: "quay-track",
    geometry: line([
      { x: 43.5, y: 434 },
      { x: 2388.5, y: 434 }
    ]),
    details: details(
      "标准化教学轨道",
      "约束岸桥顺序、轨位和最小安全间距",
      "泊位计划 → 岸桥移位 → 伸距匹配"
    ),
    selectable: true,
    showLabel: false
  },
  ...(PORT_MANUAL_DUAL_VESSEL_SCENARIO.quayTrack?.serviceSlots ?? []).map(
    (slot): PortSceneEntity => ({
      id: slot.id,
      layerId: "equipment",
      category: "quay-service-slot",
      label: `${slot.berthId.replace("berth-", "泊位 ")} 服务轨位 ${slot.position}`,
      appearance: "quay-service-slot",
      position: { x: 43.5 + slot.position * 3.35, y: 434 },
      geometry: circle(0, 0, 6),
      details: details(
        "岸桥服务轨位",
        "岸桥抵达后方可配置给当前泊位船舶",
        "岸桥移位 → 到位确认 → 装卸配置"
      ),
      selectable: true,
      showLabel: false
    })
  )
];
const craneEntities: readonly PortSceneEntity[] = craneXs.map(
  (x, index) => ({
    id: `quay-crane-${index + 1}`,
    layerId: "equipment",
    category: "quay-crane",
    label: `岸桥 ${String(index + 1).padStart(2, "0")}`,
    appearance: "quay-crane",
    position: { x, y: 434 },
    geometry: createCraneGeometry(),
    details: details(
      "远程操控岸桥",
      "在船舶与码头前沿之间完成集装箱装卸",
      "船舶 ↔ 岸桥 ↔ AGV",
      index < 3 ? "演示状态 · 作业中" : "演示状态 · 待命"
    ),
    selectable: true,
    showLabel: false
  })) satisfies readonly PortSceneEntity[];

const spreaderEntities: readonly PortSceneEntity[] = [0, 1].map(
  (index) => {
    const x = craneXs[index + 1] ?? 700;
    return {
      id: `crane-spreader-${index + 1}`,
      layerId: "motion",
      category: "crane-spreader",
      label: `岸桥吊具演示 ${index + 1}`,
      appearance: "spreader",
      geometry: group([
        part(rect(-17, -8, 34, 16, 3), "accent"),
        part(line([
          { x: 0, y: -20 },
          { x: 0, y: -8 }
        ]), "detail")
      ]),
      details: [],
      motion: {
        path: [
          { x, y: 278 },
          { x, y: 375 },
          { x, y: 278 }
        ],
        durationMs: 5_600 + index * 800,
        phase: index * 0.36
      },
      selectable: false,
      showLabel: false
    } satisfies PortSceneEntity;
  }
);

const shipEntities: readonly PortSceneEntity[] = [
  {
    id: "vessel-alongside",
    layerId: "vessels",
    category: "ship",
    label: "靠泊集装箱船",
    appearance: "ship",
    position: { x: 880, y: 222 },
    geometry: createShipGeometry(520, 92),
    details: details(
      "大型集装箱船",
      "在泊位窗口内完成装卸并衔接后续船期",
      "进港 → 靠泊 → 岸桥作业",
      "演示状态 · 靠泊作业"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 0, y: -70, anchor: "middle" }
  },
  {
    id: "vessel-approach",
    layerId: "motion",
    category: "ship",
    label: "进港集装箱船",
    appearance: "ship ship--moving",
    geometry: createShipGeometry(270, 54),
    details: details(
      "进港集装箱船",
      "沿港池接近待分配的泊位窗口",
      "港池 → 泊位计划 → 靠泊",
      "演示状态 · 进港航行"
    ),
    motion: {
      path: [
        { x: 2220, y: 132 },
        { x: 1870, y: 118 },
        { x: 1510, y: 82 },
        { x: 1160, y: 72 },
        { x: 1510, y: 32 },
        { x: 1900, y: 42 },
        { x: 2220, y: 132 }
      ],
      durationMs: 30_000,
      rotateToPath: true
    },
    selectable: true,
    showLabel: false
  }
];

const agvRoutes: readonly (readonly PortScenePoint[])[] = [
  [
    { x: 220, y: 512 },
    { x: 840, y: 512 },
    { x: 1220, y: 560 },
    { x: 1780, y: 560 },
    { x: 1220, y: 512 },
    { x: 220, y: 512 }
  ],
  [
    { x: 1760, y: 560 },
    { x: 1260, y: 560 },
    { x: 860, y: 512 },
    { x: 280, y: 512 },
    { x: 860, y: 560 },
    { x: 1760, y: 560 }
  ],
  [
    { x: 420, y: 560 },
    { x: 940, y: 560 },
    { x: 1440, y: 512 },
    { x: 1760, y: 512 },
    { x: 940, y: 512 },
    { x: 420, y: 560 }
  ],
  [
    { x: 1540, y: 512 },
    { x: 1100, y: 512 },
    { x: 640, y: 560 },
    { x: 260, y: 560 },
    { x: 940, y: 512 },
    { x: 1540, y: 512 }
  ]
];

const agvEntities: readonly PortSceneEntity[] = agvRoutes.map(
  (path, index) => ({
    id: `agv-${index + 1}`,
    layerId: "motion",
    category: "agv",
    label: `自动导引车 ${String(index + 1).padStart(2, "0")}`,
    appearance: "agv",
    geometry: createVehicleGeometry(58, 25, true),
    details: details(
      "自动导引车",
      "在岸桥交接区和自动化堆场之间运输集装箱",
      "岸桥 → AGV → 堆场",
      "演示状态 · 运输中"
    ),
    motion: {
      path,
      durationMs: 14_000 + index * 1_900,
      phase: index * 0.19,
      rotateToPath: true
    },
    selectable: true,
    showLabel: false
  })) satisfies readonly PortSceneEntity[];

const truckRoutes: readonly (readonly PortScenePoint[])[] = [
  [
    { x: 2260, y: 1230 },
    { x: 2000, y: 1230 },
    { x: 1850, y: 1258 },
    { x: 2180, y: 1258 },
    { x: 2260, y: 1230 }
  ],
  [
    { x: 1980, y: 1258 },
    { x: 1680, y: 1258 },
    { x: 1950, y: 1230 },
    { x: 2240, y: 1230 },
    { x: 1980, y: 1258 }
  ],
  [
    { x: 1470, y: 1230 },
    { x: 1940, y: 1230 },
    { x: 2240, y: 1258 },
    { x: 1740, y: 1258 },
    { x: 1470, y: 1230 }
  ]
];

const truckEntities: readonly PortSceneEntity[] = truckRoutes.map(
  (path, index) => ({
    id: `external-truck-${index + 1}`,
    layerId: "motion",
    category: "truck",
    label: `外集卡 ${String(index + 1).padStart(2, "0")}`,
    appearance: "truck",
    geometry: createVehicleGeometry(78, 28, true),
    details: details(
      "外集卡",
      "连接码头箱区、闸口和港外运输网络",
      "箱区 → 缓冲区 → 闸口",
      "演示状态 · 通行中"
    ),
    motion: {
      path,
      durationMs: 18_000 + index * 2_300,
      phase: index * 0.27,
      rotateToPath: true
    },
    selectable: true,
    showLabel: false
  })) satisfies readonly PortSceneEntity[];

const serviceEntities: readonly PortSceneEntity[] = [
  {
    id: "terminal-control-centre",
    layerId: "services",
    category: "control-centre",
    label: "生产控制中心",
    appearance: "building",
    position: { x: 1975, y: 710 },
    geometry: group([
      part(rect(0, 0, 300, 120, 12)),
      part(rect(22, 25, 256, 32, 5), "window"),
      part(line([
        { x: 22, y: 83 },
        { x: 278, y: 83 }
      ]), "detail")
    ]),
    details: details(
      "生产控制中心",
      "汇集计划、设备状态和作业指令，协调码头生产",
      "计划 → 调度 → 设备执行 → 状态回传"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 150, y: 74, anchor: "middle" }
  },
  {
    id: "agv-service-zone",
    layerId: "services",
    category: "service-zone",
    label: "AGV 维护与充电区",
    appearance: "service-zone",
    position: { x: 1975, y: 880 },
    geometry: group([
      part(rect(0, 0, 300, 118, 12)),
      part(rect(24, 28, 72, 62, 5), "accent"),
      part(rect(114, 28, 72, 62, 5), "accent"),
      part(rect(204, 28, 72, 62, 5), "accent")
    ]),
    details: details(
      "维护与充电区",
      "为自动导引车提供能源补给和检修缓冲",
      "AGV 运行 → 充电或检修 → 返回任务"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 150, y: -18, anchor: "middle" }
  },
  {
    id: "truck-gate",
    layerId: "services",
    category: "gate",
    label: "智能闸口",
    appearance: "gate",
    position: { x: 2045, y: 1060 },
    geometry: group([
      part(rect(0, 0, 230, 92, 10)),
      part(rect(22, 26, 48, 42, 4), "accent"),
      part(rect(91, 26, 48, 42, 4), "accent"),
      part(rect(160, 26, 48, 42, 4), "accent")
    ]),
    details: details(
      "智能闸口",
      "核验车辆、箱货与放行信息并组织进出场",
      "港外运输 ↔ 闸口 ↔ 堆场"
    ),
    selectable: true,
    showLabel: true,
    labelPosition: { x: 115, y: -18, anchor: "middle" }
  }
];

export const YANGSHAN_CONTAINER_SCENE: PortSceneDefinition = {
  id: "yangshan-phase-four-functional-reference",
  version: "0.0.3",
  title: "港口总体与自动化集装箱码头功能图",
  width: 2400,
  height: 1350,
  layers: [
    { id: "base", label: "水陆底图", order: 0 },
    { id: "macro", label: "港口总体环境", order: 5 },
    { id: "infrastructure", label: "码头基础设施", order: 10 },
    { id: "yard", label: "自动化堆场", order: 20 },
    { id: "services", label: "生产保障设施", order: 30 },
    { id: "vessels", label: "船舶", order: 40 },
    { id: "equipment", label: "装卸设备", order: 50 },
    { id: "motion", label: "演示运动对象", order: 60 }
  ],
  entities: [
    ...backgroundEntities,
    ...macroEntities,
    ...berthEntities,
    ...quayTrackEntities,
    ...yardEntities,
    ...serviceEntities,
    ...shipEntities,
    ...craneEntities,
    ...spreaderEntities,
    ...agvEntities,
    ...truckEntities
  ],
  attribution:
    "功能结构参考上海洋山四期自动化码头；教学示意，非工程图、非导航图，设备数量与位置不代表实装配置。"
};
