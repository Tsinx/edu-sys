import type {
  PortSimulationChallengeId,
  PortSimulationCollaborationItem,
  PortSimulationRole,
  PortSimulationScoreBreakdown,
  PortSimulationScorecard
} from "@edu/contracts";
import type { PortSimulationEngineState } from "./engine.js";
import {
  PORT_MANUAL_DUAL_VESSEL_SCENARIO,
  getPortSimulationScenario,
  type PortSimulationScenarioDefinition
} from "./scenario.js";

export interface PortSimulationChallengeMission {
  id: string;
  title: string;
  description: string;
  evidenceHint: string;
}

export interface PortSimulationRoleBriefing {
  role: PortSimulationRole;
  headline: string;
  knownInformation: readonly string[];
  coordinationPrompt: string;
}

export interface PortSimulationChallengeDefinition {
  id: PortSimulationChallengeId;
  version: "1.0.0";
  title: string;
  shortTitle: string;
  difficulty: "入门" | "进阶" | "挑战";
  scenarioId: string;
  scenarioVersion: "0.0.3";
  durationLabel: string;
  publicBriefing: string;
  learningObjectives: readonly string[];
  missions: readonly PortSimulationChallengeMission[];
  roleBriefings: readonly PortSimulationRoleBriefing[];
  observationPrompts: readonly string[];
  eventBriefing: string;
}

const COMMON_ROLE_BRIEFINGS: readonly PortSimulationRoleBriefing[] = [
  {
    role: "marine_control",
    headline: "守住航道安全，也要决定谁先等待。",
    knownInformation: [
      "两艘教学船到港时段重叠，主航道同一时刻只能服务一个航行任务。",
      "引航组和两艘拖轮是共享资源，进港与离港都需要提前协调。"
    ],
    coordinationPrompt: "把预计放行时刻同步给泊位与岸桥岗位。"
  },
  {
    role: "berth_operations",
    headline: "泊位、轨位和伸距必须作为一个方案考虑。",
    knownInformation: [
      "教学船B必须使用大伸距岸桥，标准岸桥不能替代。",
      "岸桥跨泊位移动需要时间，移动中不能参加装卸。"
    ],
    coordinationPrompt: "在船舶进港前确认泊位和可到位岸桥。"
  },
  {
    role: "horizontal_transport",
    headline: "岸桥开工之前，AGV方案就应该准备好。",
    knownInformation: [
      "四台AGV由两艘船共享，没有AGV时装卸会形成设备阻塞。",
      "设备故障不会触发自动重新分配。"
    ],
    coordinationPrompt: "向泊位岗位确认开工顺序，并向堆场岗位确认批次去向。"
  },
  {
    role: "yard_gate",
    headline: "堆场和闸口是海侧作业的下游，不是独立系统。",
    knownInformation: [
      "堆场块容量有限，运输距离会影响水平运输周转。",
      "外集卡集中到达时，需要明确开放通道和处理优先级。"
    ],
    coordinationPrompt: "提前告诉水平运输岗位哪些批次可以进入堆场。"
  }
];

export const PORT_SIMULATION_CHALLENGES: readonly PortSimulationChallengeDefinition[] = [
  {
    id: "joint-watch",
    version: "1.0.0",
    title: "第一次联合值班",
    shortTitle: "联合值班",
    difficulty: "入门",
    scenarioId: PORT_MANUAL_DUAL_VESSEL_SCENARIO.id,
    scenarioVersion: "0.0.3",
    durationLabel: "建议 12–15 分钟",
    publicBriefing:
      "两艘教学船先后抵港。操作者需要在没有自动托管的情况下完成进港、靠泊、装卸、集疏运和离港协同。",
    learningObjectives: [
      "识别海域、泊位、装卸、水平运输和陆域集疏运之间的作业链",
      "理解一个岗位的等待如何成为另一个岗位的前置条件",
      "用事件记录解释船舶等待的来源"
    ],
    missions: [
      {
        id: "joint-watch-flow",
        title: "打通第一条完整作业链",
        description: "让至少一艘船完成全部批次并安全离港。",
        evidenceHint: "观察船舶阶段、未完成批次和各岗位最近命令。"
      },
      {
        id: "joint-watch-handoffs",
        title: "完成四岗位交接",
        description: "每个主操岗位至少作出一次有效决策。",
        evidenceHint: "复盘时查看岗位响应记录。"
      }
    ],
    roleBriefings: COMMON_ROLE_BRIEFINGS,
    observationPrompts: [
      "现在的等待是安全前置条件，还是资源没有配置？",
      "如果某岗位暂时没有操作，是否仍需要向下一岗位通报计划？"
    ],
    eventBriefing: "本案例没有额外故障事件，重点是建立稳定的联合值班流程。"
  },
  {
    id: "scarce-deep-reach",
    version: "1.0.0",
    title: "稀缺岸桥的选择",
    shortTitle: "岸桥匹配",
    difficulty: "进阶",
    scenarioId: PORT_MANUAL_DUAL_VESSEL_SCENARIO.id,
    scenarioVersion: "0.0.3",
    durationLabel: "建议 12–15 分钟",
    publicBriefing:
      "教学船B提前抵近港区，但只有QC-05和QC-06具备大伸距。把稀缺岸桥提前交给错误的船舶，会形成可执行却低效的后果。",
    learningObjectives: [
      "理解泊位兼容、轨位距离和岸桥伸距的联合约束",
      "区分局部设备利用率与全港系统效率",
      "识别无效移位和稀缺资源机会成本"
    ],
    missions: [
      {
        id: "scarce-protect-deep-reach",
        title: "保护稀缺大伸距能力",
        description: "为教学船B保留至少一台能够及时到位的大伸距岸桥。",
        evidenceHint: "观察QC-05、QC-06的轨位、移动时间和服务对象。"
      },
      {
        id: "scarce-reduce-relocation",
        title: "减少无效移位",
        description: "在完成双船任务的同时控制岸桥移动距离。",
        evidenceHint: "复盘时比较岸桥移动距离、轨位等待与船舶装卸阻塞。"
      }
    ],
    roleBriefings: COMMON_ROLE_BRIEFINGS,
    observationPrompts: [
      "当前最忙的岸桥是否服务了最需要它的船？",
      "泊位更近，是否一定意味着全流程更快？"
    ],
    eventBriefing: "本案例不加入设备故障；教学船B到港更早，岸桥稀缺性会更快显现。"
  },
  {
    id: "compound-disruption",
    version: "1.0.0",
    title: "故障与高峰叠加",
    shortTitle: "复合扰动",
    difficulty: "挑战",
    scenarioId: PORT_MANUAL_DUAL_VESSEL_SCENARIO.id,
    scenarioVersion: "0.0.3",
    durationLabel: "建议 15 分钟",
    publicBriefing:
      "两船作业期间将出现设备故障与陆侧到达高峰。系统不会自动托管，操作者必须识别瓶颈转移并恢复作业。",
    learningObjectives: [
      "识别故障引发的瓶颈转移和上下游传播",
      "在安全约束下组织人工恢复",
      "用恢复时间和等待构成评价方案韧性"
    ],
    missions: [
      {
        id: "compound-recover-agv",
        title: "应对AGV能力下降",
        description: "AGV-03故障后重新安排水平运输，避免岸桥长期无车等待。",
        evidenceHint: "观察AGV占用、装卸阻塞和故障恢复时刻。"
      },
      {
        id: "compound-gate-wave",
        title: "消化闸口到达高峰",
        description: "在不打乱船舶关键作业的情况下缓解外集卡队列。",
        evidenceHint: "观察闸口峰值、堆场容量和水平运输优先级。"
      }
    ],
    roleBriefings: COMMON_ROLE_BRIEFINGS,
    observationPrompts: [
      "故障发生后，瓶颈首先出现在哪里，又转移到了哪里？",
      "恢复动作是在减少总等待，还是把等待转移给另一个岗位？"
    ],
    eventBriefing: "04:30 AGV-03故障60分钟；06:00外集卡集中到达。所有运行使用相同事件脚本。"
  }
];

export const DEFAULT_PORT_SIMULATION_CHALLENGE_ID: PortSimulationChallengeId =
  "compound-disruption";

export function getPortSimulationChallenge(
  challengeId: PortSimulationChallengeId | string | undefined
): PortSimulationChallengeDefinition {
  return (
    PORT_SIMULATION_CHALLENGES.find((item) => item.id === challengeId) ??
    PORT_SIMULATION_CHALLENGES.find(
      (item) => item.id === DEFAULT_PORT_SIMULATION_CHALLENGE_ID
    )!
  );
}

export function getPortSimulationScenarioForChallenge(
  challengeId: PortSimulationChallengeId | string | undefined,
  scenarioVersion = PORT_MANUAL_DUAL_VESSEL_SCENARIO.version
): PortSimulationScenarioDefinition {
  const scenario = getPortSimulationScenario(scenarioVersion);
  if (scenario.version !== PORT_MANUAL_DUAL_VESSEL_SCENARIO.version) {
    return scenario;
  }
  if (challengeId === "joint-watch") {
    return { ...scenario, title: "第一次联合值班", incidents: [] };
  }
  if (challengeId === "scarce-deep-reach") {
    return {
      ...scenario,
      title: "稀缺岸桥的选择",
      vessels: scenario.vessels.map((vessel) =>
        vessel.id === "vessel-b" ? { ...vessel, etaSimMinute: 30 } : vessel
      ),
      incidents: []
    };
  }
  return scenario;
}

function clampPoints(value: number, maxPoints: number) {
  return Math.max(0, Math.min(maxPoints, Math.round(value)));
}

function evidenceEventIds(
  state: PortSimulationScoreState,
  predicate: (event: PortSimulationEngineState["recentEvents"][number]) => boolean
) {
  return state.recentEvents.filter(predicate).slice(-6).map((event) => event.id);
}

export type PortSimulationScoreState = Pick<
  PortSimulationEngineState,
  | "status"
  | "clock"
  | "vessels"
  | "tasks"
  | "incidents"
  | "metrics"
  | "recentEvents"
>;

export interface CalculatePortSimulationScoreInput {
  state: PortSimulationScoreState;
  collaborationItems?: readonly PortSimulationCollaborationItem[];
}

export function calculatePortSimulationScore({
  state
}: CalculatePortSimulationScoreInput): PortSimulationScorecard {
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((task) => task.status === "completed").length;
  const totalWaitMinutes = state.vessels.reduce(
    (total, vessel) =>
      total +
      vessel.waitMinutes.anchorage +
      vessel.waitMinutes.channel +
      vessel.waitMinutes.berth +
      vessel.waitMinutes.cargo,
    0
  );
  const blockedMinutes = state.metrics.resourceMinutes.reduce(
    (total, resource) => total + resource.blocked,
    0
  );
  const safetyPoints = clampPoints(
    250 -
      state.metrics.rejectedCommands * 20 -
      state.metrics.craneMoves.matchingBlocks * 5,
    250
  );
  const completionPoints = clampPoints(
    totalTasks === 0 ? 250 : (completedTasks / totalTasks) * 250,
    250
  );
  const vesselFlowPoints = clampPoints(200 - totalWaitMinutes / 4, 200);
  const resourcePoints = clampPoints(
    150 -
      blockedMinutes / 20 -
      state.metrics.craneMoves.totalDistance / 10 -
      state.metrics.craneMoves.matchingBlocks * 3,
    150
  );
  const incidentMinutes = state.incidents.reduce((total, incident) => {
    if (incident.status === "scheduled") return total;
    if (incident.startedAtSimMinute === null) return total;
    return (
      total +
      ((incident.resolvedAtSimMinute ?? state.clock.simMinute) -
        incident.startedAtSimMinute)
    );
  }, 0);
  const incidentPoints = clampPoints(100 - incidentMinutes / 3, 100);
  const rolesWithDecisions = state.metrics.roleResponseMinutes.filter(
    (metric) => metric.decisions > 0
  );
  const totalDecisions = rolesWithDecisions.reduce(
    (total, metric) => total + metric.decisions,
    0
  );
  // Reward complete cross-role participation, not command volume. This keeps
  // repeated low-value commands from becoming a scoring strategy.
  const teamworkPoints = clampPoints(rolesWithDecisions.length * 12.5, 50);

  const breakdown: PortSimulationScoreBreakdown[] = [
    {
      dimension: "safety",
      label: "安全规范",
      maxPoints: 250,
      points: safetyPoints,
      summary:
        state.metrics.rejectedCommands === 0
          ? "尚无安全或前置条件拦截。"
          : `${state.metrics.rejectedCommands}次命令被安全或前置条件拦截，其中岸桥匹配拦截${state.metrics.craneMoves.matchingBlocks}次。`,
      evidenceEventIds: evidenceEventIds(
        state,
        (event) => event.outcome === "rejected"
      )
    },
    {
      dimension: "completion",
      label: "任务完成",
      maxPoints: 250,
      points: completionPoints,
      summary: `已完成${completedTasks}/${totalTasks}个教学批次。`,
      evidenceEventIds: evidenceEventIds(
        state,
        (event) => /cargo|depart/u.test(event.type)
      )
    },
    {
      dimension: "vessel_flow",
      label: "船舶周转",
      maxPoints: 200,
      points: vesselFlowPoints,
      summary: `两船累计等待${Math.round(totalWaitMinutes)}个仿真分钟。`,
      evidenceEventIds: evidenceEventIds(
        state,
        (event) => /vessel|marine|berth/u.test(event.type)
      )
    },
    {
      dimension: "resource_coordination",
      label: "资源协同",
      maxPoints: 150,
      points: resourcePoints,
      summary: `设备阻塞${Math.round(blockedMinutes)}分钟，岸桥移动${Math.round(state.metrics.craneMoves.totalDistance)}轨位单位。`,
      evidenceEventIds: evidenceEventIds(
        state,
        (event) => /quay|transport|yard|gate/u.test(event.type)
      )
    },
    {
      dimension: "incident_recovery",
      label: "故障恢复",
      maxPoints: 100,
      points: incidentPoints,
      summary:
        state.incidents.length === 0
          ? "本案例没有额外故障事件。"
          : `已发生事件累计占用恢复窗口${Math.round(incidentMinutes)}分钟。`,
      evidenceEventIds: evidenceEventIds(
        state,
        (event) => /incident/u.test(event.type)
      )
    },
    {
      dimension: "teamwork",
      label: "岗位协作",
      maxPoints: 50,
      points: teamworkPoints,
      summary: `${rolesWithDecisions.length}/4个主操岗位已经作出有效决策，累计${totalDecisions}次。`,
      evidenceEventIds: evidenceEventIds(
        state,
        (event) => event.outcome === "applied" && event.actor === "student"
      )
    }
  ];
  const totalScore = breakdown.reduce((total, item) => total + item.points, 0);
  const practice = state.metrics.teacherTakeovers > 0;
  const rankingActive =
    state.status === "running" ||
    state.status === "paused" ||
    state.status === "completed";
  return {
    schemaVersion: "1.0",
    totalScore,
    maxScore: 1000,
    rankingStatus: practice
      ? "practice"
      : state.status === "completed"
        ? "final"
        : "provisional",
    rankEligible: !practice && rankingActive,
    eligibilityMessage: practice
      ? "本轮发生教师接管，保留复盘成绩但不进入正式排名。"
      : state.status === "completed"
        ? "本轮成绩已封存，可以进入正式排名。"
        : state.status === "running" || state.status === "paused"
          ? "当前为实时暂定成绩，结束后封存。"
          : state.status === "aborted"
            ? "本轮已经中止，保留复盘成绩但不进入正式排名。"
            : "尚未开局，本轮暂不进入排名。",
    updatedAtSimMinute: state.clock.simMinute,
    breakdown,
    tieBreakers: {
      safetyPoints,
      completedTasks,
      totalWaitMinutes,
      simMinute: state.clock.simMinute
    }
  };
}
