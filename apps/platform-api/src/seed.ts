import type {
  Activity,
  AvatarControlActionResult,
  ClassroomActivity,
  ClassroomAvatarRuntime,
  SlideInteractionValues,
  GlobePlayback,
  PortSimulationCollaborationItem,
  PortSimulationCollaborationResult,
  PortSimulationChallengeId,
  PortSimulationCommandResult,
  PortSimulationDeliveryMode,
  PortSimulationMemberCapacity,
  PortSimulationRole,
  PortSimulationSyncMode,
  PortSimulationSupportRole,
  ClassSession,
  Course,
  StudySession,
  Teacher
} from "@edu/contracts";
import type { PortSimulationEngineState } from "@edu/port-simulation-core";
import {
  ECONOMIC_MATHEMATICS_COURSE_CODE,
  ECONOMIC_MATHEMATICS_COURSE_ID,
  ECONOMIC_MATHEMATICS_COURSE_SLUG
} from "@edu/course-content/economic-mathematics";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";

export interface AvatarControlReceipt {
  requestId: string;
  executedAt: string;
  status: "applied" | "noop";
  results: AvatarControlActionResult[];
}

export interface ClassroomRuntimeState {
  activeActivity: ClassroomActivity;
  slideIndex: number;
  slideKey: string;
  deckId: string;
  deckVersion: string;
  runtimeVersion: number;
  avatar: ClassroomAvatarRuntime;
  globePlayback: GlobePlayback;
  simulation: PortSimulationClassroomRuntimeState | null;
  avatarControlHistory: AvatarControlReceipt[];
  slideInteractions: Record<
    string,
    { revision: number; values: SlideInteractionValues }
  >;
}

export interface PortSimulationRoleSeatRuntime {
  role: PortSimulationRole;
  participantId: string | null;
  participantDisplayName: string | null;
  roleSeatToken: string | null;
  claimedAt: string | null;
  lastSeenAt: string | null;
}

export interface PortSimulationCommandReceipt {
  requestId: string;
  result: PortSimulationCommandResult;
}

export interface PortSimulationSupportSeatRuntime {
  role: PortSimulationSupportRole;
  participantId: string | null;
  participantDisplayName: string | null;
  supportSeatToken: string | null;
  claimedAt: string | null;
  lastSeenAt: string | null;
}

export interface PortSimulationCollaborationReceipt {
  requestId: string;
  result: PortSimulationCollaborationResult;
}

export interface PortSimulationTeamRuntimeState {
  id: string;
  name: string;
  runId: string;
  challengeId: PortSimulationChallengeId;
  challengeVersion: string;
  attemptNumber: number;
  scoreHistory: Array<{
    attemptNumber: number;
    totalScore: number;
    rankEligible: boolean;
    completedAt: string;
  }>;
  syncMode: PortSimulationSyncMode;
  latestSequence: number;
  presenceRevision: number;
  lastCheckpointAt: string | null;
  eventsSinceCheckpoint: number;
  engine: PortSimulationEngineState;
  memberCapacity: PortSimulationMemberCapacity;
  memberParticipantIds: string[];
  memberDisplayNames: Record<string, string>;
  roleSeats: PortSimulationRoleSeatRuntime[];
  supportSeats: PortSimulationSupportSeatRuntime[];
  collaborationRevision: number;
  collaborationItems: PortSimulationCollaborationItem[];
  collaborationReceipts: PortSimulationCollaborationReceipt[];
  commandReceipts: PortSimulationCommandReceipt[];
  startedWithMissingRoles: boolean;
}

export interface PortSimulationClassroomRuntimeState {
  scenarioId: string;
  scenarioVersion: string;
  challengeId: PortSimulationChallengeId;
  challengeVersion: string;
  deliveryMode: PortSimulationDeliveryMode;
  assignmentSource: "self_select" | "external_fixed";
  assignmentAdjusted: boolean;
  expectedStudentCount: number;
  classroomObserverCount: number;
  teams: PortSimulationTeamRuntimeState[];
}

export interface PlatformState {
  teachers: Teacher[];
  courses: Course[];
  classSessions: ClassSession[];
  studySessions: StudySession[];
  activities: Activity[];
  classroomRuntimes: Record<string, ClassroomRuntimeState>;
}

export function createInitialClassroomRuntime(
  courseId = "course-port-management-intro"
): ClassroomRuntimeState {
  const deck = getCourseDeckByCourseId(courseId);
  if (!deck) throw new Error(`COURSE_DECK_NOT_READY:${courseId}`);
  const firstSlide = deck.getSlide(1);
  return {
    activeActivity: "slides",
    slideIndex: firstSlide.index,
    slideKey: firstSlide.slideKey,
    deckId: deck.deckId,
    deckVersion: deck.versionId,
    runtimeVersion: 1,
    simulation: null,
    globePlayback: {
      cueId: null,
      runId: null,
      stepIndex: 0,
      status: "idle",
      stepStartedAt: null,
      stepElapsedMs: 0
    },
    avatarControlHistory: [],
    slideInteractions: {},
    avatar: {
      status: "off",
      mode: "classroom_realtime",
      gpuStatus: "idle",
      latencyMs: null,
      currentTask: null,
      lastMessage:
        courseId === ECONOMIC_MATHEMATICS_COURSE_ID
          ? "经数助教已连接课程上下文，等待课堂指令。"
          : "等待课堂前端连接 OpenAvatarChat LAM 服务。"
    }
  };
}

export function createSeedState(): PlatformState {
  const teacher: Teacher = {
    id: "teacher-li-xingzhi",
    name: "李行之",
    role: "teacher",
    title: "教师",
    institution: "重庆交通大学"
  };

  const course: Course = {
    id: "course-port-management-intro",
    slug: "gangkou-guanli-gailun",
    code: "PM-INTRO-001",
    title: "港口管理概论",
    category: "本科课程",
    discipline: "管理学",
    totalHours: 32,
    progress: 45,
    status: "active",
    featured: true,
    teacherId: teacher.id,
    currentLesson: {
      chapter: 1,
      title: "港口与港口管理",
      summary: "认识港口的基本构成、功能演进与现代港口管理对象。"
    },
    createdAt: "2026-07-28T08:00:00.000Z"
  };

  const economicMathematicsCourse: Course = {
    id: ECONOMIC_MATHEMATICS_COURSE_ID,
    slug: ECONOMIC_MATHEMATICS_COURSE_SLUG,
    code: ECONOMIC_MATHEMATICS_COURSE_CODE,
    title: "经济数学",
    category: "本科课程",
    discipline: "经济与管理",
    totalHours: 64,
    progress: 0,
    status: "active",
    featured: false,
    teacherId: teacher.id,
    currentLesson: {
      chapter: 1,
      title: "谁是输入，谁是结果？——从促销记录到函数",
      summary:
        "从重庆消费品牌的价格、曝光、订单与成本记录中识别变量、定义域和函数关系。"
    },
    createdAt: "2026-08-09T08:00:00.000Z"
  };

  return {
    teachers: [teacher],
    courses: [course, economicMathematicsCourse],
    classSessions: [
      {
        id: "session-port-20260803",
        courseId: course.id,
        courseTitle: course.title,
        lessonTitle: "港口的构成与功能",
        room: "明德楼 A301",
        startsAt: "2026-08-03T01:50:00.000Z",
        status: "scheduled",
        assistantMode: "classroom_realtime"
      },
      {
        id: "session-port-20260806",
        courseId: course.id,
        courseTitle: course.title,
        lessonTitle: "现代港口管理体系",
        room: "明德楼 A301",
        startsAt: "2026-08-06T06:30:00.000Z",
        status: "scheduled",
        assistantMode: "classroom_realtime"
      }
    ],
    studySessions: [],
    classroomRuntimes: {},
    activities: [
      {
        id: "activity-lesson-prepared",
        type: "lesson_prepared",
        title: "备课内容已更新",
        detail: "完成《港口与港口管理》第一版课堂结构",
        occurredAt: "2026-07-28T08:40:00.000Z"
      },
      {
        id: "activity-course-created",
        type: "course_created",
        title: "课程已建立",
        detail: "创建《港口管理概论》并设为当前课程",
        occurredAt: "2026-07-28T08:00:00.000Z"
      }
    ]
  };
}
