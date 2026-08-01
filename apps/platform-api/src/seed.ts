import type {
  Activity,
  AvatarControlActionResult,
  ClassroomActivity,
  ClassroomAvatarRuntime,
  GlobePlayback,
  ClassSession,
  Course,
  Teacher
} from "@edu/contracts";
import {
  getPortManagementSlide,
  PORT_MANAGEMENT_DECK_VERSION
} from "@edu/course-content";

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
  deckVersion: string;
  runtimeVersion: number;
  avatar: ClassroomAvatarRuntime;
  globePlayback: GlobePlayback;
  avatarControlHistory: AvatarControlReceipt[];
}

export interface PlatformState {
  teachers: Teacher[];
  courses: Course[];
  classSessions: ClassSession[];
  activities: Activity[];
  classroomRuntimes: Record<string, ClassroomRuntimeState>;
}

export function createInitialClassroomRuntime(): ClassroomRuntimeState {
  const firstSlide = getPortManagementSlide(1);
  return {
    activeActivity: "slides",
    slideIndex: firstSlide.index,
    slideKey: firstSlide.slideKey,
    deckVersion: PORT_MANAGEMENT_DECK_VERSION,
    runtimeVersion: 1,
    globePlayback: {
      cueId: null,
      runId: null,
      stepIndex: 0,
      status: "idle",
      stepStartedAt: null,
      stepElapsedMs: 0
    },
    avatarControlHistory: [],
    avatar: {
      status: "off",
      mode: "classroom_realtime",
      gpuStatus: "idle",
      latencyMs: null,
      currentTask: null,
      lastMessage: "等待课堂前端连接 OpenAvatarChat LAM 服务。"
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

  return {
    teachers: [teacher],
    courses: [course],
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
