import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_LOGICAL_HEIGHT,
  SLIDE_LOGICAL_WIDTH,
  type Activity,
  type AvatarControlActionResult,
  type AvatarControlRequest,
  type AvatarControlResponse,
  type ClassroomAvatarRuntime,
  type ClassroomEventInput,
  type ClassroomPresence,
  type ClassroomSnapshot,
  type ClassSession,
  type Course,
  type CreateCourseInput,
  type Dashboard,
  type TeacherAvatarCommandInput,
  type TeacherAvatarCommandResponse,
  type Teacher
} from "@edu/contracts";
import {
  getPortManagementLesson,
  getPortManagementSlide,
  getPortManagementSlideByKey,
  type PortManagementLessonNumber,
  PORT_MANAGEMENT_DECK_VERSION,
  PORT_MANAGEMENT_SLIDE_TOTAL
} from "@edu/course-content";
import {
  createInitialClassroomRuntime,
  createSeedState,
  type ClassroomRuntimeState,
  type PlatformState
} from "./seed.js";

export class JsonStateStore {
  private state: PlatformState | undefined;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly classroomPresence = new Map<
    string,
    Map<string, number>
  >();

  constructor(
    private readonly dataFile: string,
    private readonly presenceTtlMs = 45_000
  ) {}

  async initialize(): Promise<void> {
    await mkdir(dirname(this.dataFile), { recursive: true });
    try {
      const raw = await readFile(this.dataFile, "utf8");
      const parsed = JSON.parse(raw) as PlatformState;
      let runtimeStateChanged = false;
      const classroomRuntimes: Record<string, ClassroomRuntimeState> = {};
      for (const [sessionId, runtime] of Object.entries(
        parsed.classroomRuntimes ?? {}
      )) {
        const {
          participantsOnline: _legacyParticipantsOnline,
          ...sanitizedRuntime
        } = runtime as Partial<ClassroomRuntimeState> & {
          participantsOnline?: unknown;
        };
        if (_legacyParticipantsOnline !== undefined) {
          runtimeStateChanged = true;
        }
        const avatarControlHistory = Array.isArray(
          sanitizedRuntime.avatarControlHistory
        )
          ? sanitizedRuntime.avatarControlHistory
          : [];
        if (!Array.isArray(sanitizedRuntime.avatarControlHistory)) {
          runtimeStateChanged = true;
        }
        const rawSlideIndex =
          typeof sanitizedRuntime.slideIndex === "number"
            ? sanitizedRuntime.slideIndex
            : 1;
        let slideSpec =
          typeof sanitizedRuntime.slideKey === "string"
            ? getPortManagementSlideByKey(sanitizedRuntime.slideKey)
            : undefined;

        if (sanitizedRuntime.deckVersion !== PORT_MANAGEMENT_DECK_VERSION) {
          if (!slideSpec) {
            const previousLesson =
              sanitizedRuntime.deckVersion ===
                "release-port-management-voyage-v3" ||
              sanitizedRuntime.deckVersion ===
                "release-port-management-voyage-v4"
                ? rawSlideIndex <= 36
                  ? 1
                  : rawSlideIndex <= 72
                    ? 2
                    : 3
                : rawSlideIndex <= 27
                  ? 1
                  : rawSlideIndex <= 56
                    ? 2
                    : 3;
            const lessonStart =
              getPortManagementLesson(
                previousLesson as PortManagementLessonNumber
              ).slideStart ?? 1;
            slideSpec = getPortManagementSlide(lessonStart);
          }
          runtimeStateChanged = true;
        } else if (!slideSpec) {
          slideSpec = getPortManagementSlide(
            Math.min(PORT_MANAGEMENT_SLIDE_TOTAL, Math.max(1, rawSlideIndex))
          );
          runtimeStateChanged = true;
        } else if (slideSpec.index !== rawSlideIndex) {
          runtimeStateChanged = true;
        }

        const fallbackRuntime = createInitialClassroomRuntime();
        classroomRuntimes[sessionId] = {
          ...fallbackRuntime,
          ...sanitizedRuntime,
          slideIndex: slideSpec.index,
          slideKey: slideSpec.slideKey,
          deckVersion: PORT_MANAGEMENT_DECK_VERSION,
          avatar: sanitizedRuntime.avatar ?? fallbackRuntime.avatar,
          runtimeVersion:
            sanitizedRuntime.runtimeVersion ?? fallbackRuntime.runtimeVersion,
          activeActivity:
            sanitizedRuntime.activeActivity ?? fallbackRuntime.activeActivity,
          avatarControlHistory
        };
      }
      this.state = {
        ...parsed,
        classroomRuntimes
      };
      if (runtimeStateChanged) {
        await this.persist();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      this.state = createSeedState();
      await this.persist();
    }
  }

  private get current(): PlatformState {
    if (!this.state) {
      throw new Error("State store has not been initialized");
    }
    return this.state;
  }

  private async persist(): Promise<void> {
    const temporaryFile = `${this.dataFile}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(this.current, null, 2)}\n`, "utf8");
    await rename(temporaryFile, this.dataFile);
  }

  private async mutate<T>(operation: (state: PlatformState) => T): Promise<T> {
    let result!: T;
    const queued = this.mutationQueue.then(async () => {
      result = operation(this.current);
      await this.persist();
    });
    this.mutationQueue = queued.catch(() => undefined);
    await queued;
    return result;
  }

  getTeacher(): Teacher {
    const teacher = this.current.teachers[0];
    if (!teacher) {
      throw new Error("Seed teacher is missing");
    }
    return teacher;
  }

  listCourses(): Course[] {
    return [...this.current.courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getCourse(id: string): Course | undefined {
    return this.current.courses.find((course) => course.id === id);
  }

  listSessions(): ClassSession[] {
    return [...this.current.classSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  getSession(id: string): ClassSession | undefined {
    return this.current.classSessions.find((session) => session.id === id);
  }

  private activeParticipantCount(sessionId: string, now = Date.now()): number {
    const sessionPresence = this.classroomPresence.get(sessionId);
    if (!sessionPresence) {
      return 0;
    }
    for (const [participantId, lastSeenAt] of sessionPresence) {
      if (now - lastSeenAt >= this.presenceTtlMs) {
        sessionPresence.delete(participantId);
      }
    }
    if (sessionPresence.size === 0) {
      this.classroomPresence.delete(sessionId);
      return 0;
    }
    return sessionPresence.size;
  }

  private buildClassroomSnapshot(
    state: PlatformState,
    session: ClassSession,
    runtime: ClassroomRuntimeState
  ): ClassroomSnapshot | undefined {
    const course = state.courses.find((candidate) => candidate.id === session.courseId);
    if (!course) {
      return undefined;
    }
    const slideSpec =
      getPortManagementSlideByKey(runtime.slideKey) ??
      getPortManagementSlide(runtime.slideIndex);
    const slideSummary = [
      slideSpec.lead,
      ...(slideSpec.bullets ?? []),
      ...(slideSpec.steps ?? [])
    ]
      .filter(Boolean)
      .join("；");

    return {
      session,
      courseId: course.id,
      courseTitle: course.title,
      chapterTitle: slideSpec.lessonTitle,
      activeActivity: runtime.activeActivity,
      slide: {
        deckId: `deck-${course.id}-foundations`,
        versionId: PORT_MANAGEMENT_DECK_VERSION,
        slideId: slideSpec.slideKey,
        index: slideSpec.index,
        total: PORT_MANAGEMENT_SLIDE_TOTAL,
        logicalWidth: SLIDE_LOGICAL_WIDTH,
        logicalHeight: SLIDE_LOGICAL_HEIGHT,
        aspectRatio: SLIDE_ASPECT_RATIO,
        title: slideSpec.title,
        lessonNumber: slideSpec.lesson,
        lessonTitle: slideSpec.lessonTitle,
        section: slideSpec.section,
        summary: slideSummary || slideSpec.title
      },
      participantsOnline: this.activeParticipantCount(session.id),
      runtimeVersion: runtime.runtimeVersion,
      avatar: { ...runtime.avatar }
    };
  }

  getClassroomSnapshot(id: string): ClassroomSnapshot | undefined {
    const session = this.getSession(id);
    if (!session) {
      return undefined;
    }
    const runtime = this.current.classroomRuntimes[id] ?? createInitialClassroomRuntime();
    return this.buildClassroomSnapshot(this.current, session, runtime);
  }

  heartbeatClassroomPresence(
    sessionId: string,
    participantId: string
  ): ClassroomPresence | undefined {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "live") {
      return undefined;
    }
    const now = Date.now();
    const sessionPresence =
      this.classroomPresence.get(sessionId) ?? new Map<string, number>();
    sessionPresence.set(participantId, now);
    this.classroomPresence.set(sessionId, sessionPresence);
    return {
      participantsOnline: this.activeParticipantCount(sessionId, now),
      lastSeenAt: new Date(now).toISOString(),
      expiresInMs: this.presenceTtlMs
    };
  }

  leaveClassroomPresence(sessionId: string, participantId: string): boolean {
    const sessionPresence = this.classroomPresence.get(sessionId);
    if (!sessionPresence) {
      return false;
    }
    const removed = sessionPresence.delete(participantId);
    if (sessionPresence.size === 0) {
      this.classroomPresence.delete(sessionId);
    }
    return removed;
  }

  getDashboard(): Dashboard {
    const featuredCourse =
      this.current.courses.find((course) => course.featured) ?? this.current.courses[0];
    if (!featuredCourse) {
      throw new Error("At least one course is required");
    }

    const activeCourses = this.current.courses.filter((course) => course.status === "active").length;
    const upcomingClasses = this.current.classSessions.filter(
      (session) => session.status === "scheduled"
    );

    return {
      teacher: this.getTeacher(),
      featuredCourse,
      metrics: {
        activeCourses,
        upcomingClasses: upcomingClasses.length,
        pendingEvaluations: 0,
        simulationResources: 0
      },
      upcomingClasses: upcomingClasses.slice(0, 3),
      recentActivities: [...this.current.activities]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 6)
    };
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    const teacher = this.getTeacher();
    return this.mutate((state) => {
      const now = new Date().toISOString();
      const course: Course = {
        id: `course-${randomUUID()}`,
        slug: `course-${Date.now()}`,
        code: input.code,
        title: input.title,
        category: input.category,
        discipline: input.discipline,
        totalHours: input.totalHours,
        progress: 0,
        status: "draft",
        featured: false,
        teacherId: teacher.id,
        currentLesson: {
          chapter: 1,
          title: "课程导论",
          summary: "待完善本节教学目标、课堂活动与教学资源。"
        },
        createdAt: now
      };
      state.courses.push(course);
      state.activities.push({
        id: `activity-${randomUUID()}`,
        type: "course_created",
        title: "新课程已建立",
        detail: `创建《${course.title}》`,
        occurredAt: now
      });
      return course;
    });
  }

  async startClass(courseId: string): Promise<ClassSession | undefined> {
    const course = this.getCourse(courseId);
    if (!course) {
      return undefined;
    }
    return this.mutate((state) => {
      const now = new Date().toISOString();
      const session: ClassSession = {
        id: `session-${randomUUID()}`,
        courseId: course.id,
        courseTitle: course.title,
        lessonTitle: course.currentLesson.title,
        room: "在线课堂",
        startsAt: now,
        status: "live",
        assistantMode: "classroom_realtime"
      };
      state.classSessions.push(session);
      state.classroomRuntimes[session.id] = createInitialClassroomRuntime();
      const activity: Activity = {
        id: `activity-${randomUUID()}`,
        type: "class_started",
        title: "课堂已启动",
        detail: `${course.title} · ${course.currentLesson.title}`,
        occurredAt: now
      };
      state.activities.push(activity);
      return session;
    });
  }

  async applyClassroomEvent(
    sessionId: string,
    input: ClassroomEventInput
  ): Promise<ClassroomSnapshot | undefined> {
    return this.mutate((state) => {
      const session = state.classSessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return undefined;
      }
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();

      if (input.type === "next_slide") {
        runtime.slideIndex = Math.min(
          PORT_MANAGEMENT_SLIDE_TOTAL,
          runtime.slideIndex + 1
        );
        runtime.activeActivity = "slides";
      } else if (input.type === "previous_slide") {
        runtime.slideIndex = Math.max(1, runtime.slideIndex - 1);
        runtime.activeActivity = "slides";
      } else if (input.type === "set_slide") {
        runtime.slideIndex = Math.min(
          PORT_MANAGEMENT_SLIDE_TOTAL,
          input.index
        );
        runtime.activeActivity = "slides";
      } else if (input.type === "set_activity") {
        runtime.activeActivity = input.activity;
      } else {
        runtime.avatar.mode = input.mode;
        runtime.avatar.status =
          input.mode === "classroom_realtime" ? "warming" : "ready";
        runtime.avatar.gpuStatus =
          input.mode === "classroom_realtime" ? "planned" : "idle";
        runtime.avatar.latencyMs = null;
        runtime.avatar.lastMessage =
          input.mode === "classroom_realtime"
            ? "已请求课堂实时数字人，等待 OpenAvatarChat LAM 建立会话。"
            : "已切换为轻量卡通助手，不占用实时 GPU。";
      }

      const currentSlide = getPortManagementSlide(runtime.slideIndex);
      runtime.slideIndex = currentSlide.index;
      runtime.slideKey = currentSlide.slideKey;
      runtime.deckVersion = PORT_MANAGEMENT_DECK_VERSION;
      runtime.runtimeVersion += 1;
      if (input.type !== "set_avatar_mode") {
        runtime.avatar.currentTask =
          runtime.activeActivity === "slides"
            ? `已连接第 ${runtime.slideIndex} 页`
            : `已连接${runtime.activeActivity}活动`;
      }
      state.classroomRuntimes[sessionId] = runtime;
      return this.buildClassroomSnapshot(state, session, runtime);
    });
  }

  async executeAvatarControl(
    sessionId: string,
    input: AvatarControlRequest
  ): Promise<AvatarControlResponse | undefined> {
    return this.mutate((state) => {
      const session = state.classSessions.find(
        (candidate) => candidate.id === sessionId
      );
      if (!session) {
        return undefined;
      }
      const runtime =
        state.classroomRuntimes[sessionId] ??
        createInitialClassroomRuntime();
      const previousReceipt = runtime.avatarControlHistory.find(
        (receipt) => receipt.requestId === input.requestId
      );
      if (previousReceipt) {
        const snapshot = this.buildClassroomSnapshot(
          state,
          session,
          runtime
        );
        if (!snapshot) return undefined;
        return {
          protocol: input.protocol,
          version: input.version,
          requestId: input.requestId,
          status: previousReceipt.status,
          duplicate: true,
          executedAt: previousReceipt.executedAt,
          results: previousReceipt.results,
          snapshot
        };
      }

      const results: AvatarControlActionResult[] = [];
      let changed = false;

      input.actions.forEach((action, index) => {
        if (action.type === "slides.next") {
          const nextSlide = Math.min(
            PORT_MANAGEMENT_SLIDE_TOTAL,
            runtime.slideIndex + 1
          );
          const actionChanged =
            nextSlide !== runtime.slideIndex ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = nextSlide;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已切换到 Slides 第 ${nextSlide} 页`
              : "已经是 Slides 最后一页"
          });
          return;
        }

        if (action.type === "slides.previous") {
          const previousSlide = Math.max(1, runtime.slideIndex - 1);
          const actionChanged =
            previousSlide !== runtime.slideIndex ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = previousSlide;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已切换到 Slides 第 ${previousSlide} 页`
              : "已经是 Slides 第一页"
          });
          return;
        }

        if (action.type === "slides.go_to") {
          const targetSlide = Math.min(
            PORT_MANAGEMENT_SLIDE_TOTAL,
            action.slide
          );
          const actionChanged =
            targetSlide !== runtime.slideIndex ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = targetSlide;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已跳转到 Slides 第 ${targetSlide} 页`
              : `已经位于 Slides 第 ${targetSlide} 页`
          });
          return;
        }

        if (action.type === "lesson.go_to") {
          const lesson = getPortManagementLesson(
            action.lesson as PortManagementLessonNumber
          );
          if (
            lesson.status !== "ready" ||
            lesson.slideStart === null ||
            lesson.title === null
          ) {
            results.push({
              index,
              type: action.type,
              status: "noop",
              message: `${lesson.label}内容待建设，未执行课堂跳转`
            });
            return;
          }

          const actionChanged =
            runtime.slideIndex !== lesson.slideStart ||
            runtime.activeActivity !== "slides";
          runtime.slideIndex = lesson.slideStart;
          runtime.activeActivity = "slides";
          changed ||= actionChanged;
          results.push({
            index,
            type: action.type,
            status: actionChanged ? "applied" : "noop",
            message: actionChanged
              ? `已跳转到${lesson.label}“${lesson.title}”封面（Slides 第 ${lesson.slideStart} 页）`
              : `已经位于${lesson.label}“${lesson.title}”封面`
          });
          return;
        }

        const actionChanged =
          runtime.activeActivity !== action.activity;
        runtime.activeActivity = action.activity;
        changed ||= actionChanged;
        results.push({
          index,
          type: action.type,
          status: actionChanged ? "applied" : "noop",
          message: actionChanged
            ? `已切换课堂活动为 ${action.activity}`
            : `课堂活动已经是 ${action.activity}`
        });
      });

      const currentSlide = getPortManagementSlide(runtime.slideIndex);
      runtime.slideIndex = currentSlide.index;
      runtime.slideKey = currentSlide.slideKey;
      runtime.deckVersion = PORT_MANAGEMENT_DECK_VERSION;
      const executedAt = new Date().toISOString();
      const status = changed ? "applied" : "noop";
      if (changed) {
        runtime.runtimeVersion += 1;
        runtime.avatar.currentTask =
          input.reason ??
          results
            .filter((result) => result.status === "applied")
            .map((result) => result.message)
            .join("；");
        runtime.avatar.lastMessage = `数字人课堂控制已执行：${runtime.avatar.currentTask}`;
      }
      runtime.avatarControlHistory.push({
        requestId: input.requestId,
        executedAt,
        status,
        results
      });
      runtime.avatarControlHistory =
        runtime.avatarControlHistory.slice(-100);
      state.classroomRuntimes[sessionId] = runtime;

      const snapshot = this.buildClassroomSnapshot(
        state,
        session,
        runtime
      );
      if (!snapshot) return undefined;
      return {
        protocol: input.protocol,
        version: input.version,
        requestId: input.requestId,
        status,
        duplicate: false,
        executedAt,
        results,
        snapshot
      };
    });
  }

  async submitAvatarCommand(
    sessionId: string,
    input: TeacherAvatarCommandInput
  ): Promise<TeacherAvatarCommandResponse | undefined> {
    return this.mutate((state) => {
      const session = state.classSessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return undefined;
      }
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();
      const acceptedAt = new Date().toISOString();
      const commandSummary =
        input.inputMode === "text"
          ? input.text
          : `语音指令 ${(input.durationMs / 1000).toFixed(1)} 秒`;

      runtime.avatar = {
        ...runtime.avatar,
        status: "thinking",
        gpuStatus: runtime.avatar.gpuStatus === "idle" ? "planned" : runtime.avatar.gpuStatus,
        currentTask: commandSummary,
        lastMessage:
          input.inputMode === "text"
            ? `教师文字已进入平台 JSON 流编排：${input.text}`
            : "语音已收到，等待 OpenAvatarChat ASR 生成可审计终稿。"
      };
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;

      return {
        id: `avatar-command-${randomUUID()}`,
        inputMode: input.inputMode,
        state: "queued",
        acceptedAt,
        message:
          input.inputMode === "text"
            ? `教师指令“${input.text}”已进入平台课堂助手队列。`
            : "语音已进入 OpenAvatarChat ASR；识别终稿将回到平台课堂助手。",
        avatar: { ...runtime.avatar }
      };
    });
  }

  async updateAvatarRuntime(
    sessionId: string,
    patch: Partial<ClassroomAvatarRuntime>
  ): Promise<ClassroomSnapshot | undefined> {
    return this.mutate((state) => {
      const session = state.classSessions.find(
        (candidate) => candidate.id === sessionId
      );
      if (!session) return undefined;

      const runtime =
        state.classroomRuntimes[sessionId] ??
        createInitialClassroomRuntime();
      runtime.avatar = {
        ...runtime.avatar,
        ...patch
      };
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;
      return this.buildClassroomSnapshot(state, session, runtime);
    });
  }

  async endClass(sessionId: string): Promise<ClassSession | undefined> {
    const session = await this.mutate((state) => {
      const session = state.classSessions.find((candidate) => candidate.id === sessionId);
      if (!session) {
        return undefined;
      }
      session.status = "completed";
      const runtime =
        state.classroomRuntimes[sessionId] ?? createInitialClassroomRuntime();
      runtime.avatar = {
        ...runtime.avatar,
        status: "off",
        gpuStatus: "idle",
        latencyMs: null,
        currentTask: null,
        lastMessage: "课堂已结束，实时数字人资源已进入释放流程。"
      };
      runtime.runtimeVersion += 1;
      state.classroomRuntimes[sessionId] = runtime;
      return session;
    });
    if (session) {
      this.classroomPresence.delete(sessionId);
    }
    return session;
  }
}
