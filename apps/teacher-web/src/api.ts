import type {
  AssistantTurnEvent,
  AssistantTurnInput,
  AvatarControlCapabilities,
  AvatarControlRequest,
  AvatarControlResponse,
  AvatarPresentation,
  AvatarPresentationInput,
  ClassroomEventInput,
  ClassroomPresence,
  ClassroomSnapshot,
  ClassSession,
  Course,
  CreateCourseInput,
  Dashboard,
  LamRuntimeStatus,
  TeacherAvatarCommandInput,
  TeacherAvatarCommandResponse,
  Teacher
} from "@edu/contracts";
import { assistantTurnEventSchema } from "@edu/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers =
    init?.body === undefined
      ? init?.headers
      : {
          "Content-Type": "application/json",
          ...init.headers
        };
  const response = await fetch(path, {
    ...init,
    headers
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "请求失败，请稍后重试";
    throw new ApiError(
      message,
      response.status
    );
  }
  return payload as T;
}

async function streamAssistantTurn(
  id: string,
  input: AssistantTurnInput,
  onEvent: (event: AssistantTurnEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(
    `/api/class-sessions/${id}/assistant/turns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal
    }
  );
  if (!response.ok) {
    let message = "课堂助手请求失败";
    try {
      const payload = (await response.json()) as { message?: unknown };
      if (typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // Keep the stable fallback for a non-JSON gateway error.
    }
    throw new ApiError(message, response.status);
  }
  if (!response.body) {
    throw new ApiError("浏览器未收到课堂助手流", 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/gu, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of block.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const event = assistantTurnEventSchema.parse(
            JSON.parse(line.slice(5).trimStart()) as unknown
          );
          onEvent(event);
        }
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

export const api = {
  getMe: () => request<Teacher>("/api/me"),
  getDashboard: () => request<Dashboard>("/api/dashboard"),
  getCourses: () => request<Course[]>("/api/courses"),
  getCourse: (id: string) => request<Course>(`/api/courses/${id}`),
  getSessions: () => request<ClassSession[]>("/api/class-sessions"),
  getSession: (id: string) => request<ClassSession>(`/api/class-sessions/${id}`),
  getClassroomSnapshot: (id: string) =>
    request<ClassroomSnapshot>(`/api/class-sessions/${id}/snapshot`),
  getLamRuntimeStatus: () =>
    request<LamRuntimeStatus>("/api/avatar/runtime/status"),
  heartbeatClassroomPresence: (id: string, participantId: string) =>
    request<ClassroomPresence>(
      `/api/class-sessions/${id}/presence/heartbeat`,
      {
        method: "POST",
        body: JSON.stringify({ participantId })
      }
    ),
  leaveClassroomPresence: (id: string, participantId: string) =>
    request<void>(`/api/class-sessions/${id}/presence/leave`, {
      method: "POST",
      body: JSON.stringify({ participantId }),
      keepalive: true
    }),
  sendClassroomEvent: (id: string, input: ClassroomEventInput) =>
    request<ClassroomSnapshot>(`/api/class-sessions/${id}/events`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  sendAvatarCommand: (id: string, input: TeacherAvatarCommandInput) =>
    request<TeacherAvatarCommandResponse>(
      `/api/class-sessions/${id}/avatar/commands`,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    ),
  streamAssistantTurn,
  getAvatarControlCapabilities: (id: string) =>
    request<AvatarControlCapabilities>(
      `/api/class-sessions/${id}/avatar/control/capabilities`
    ),
  executeAvatarControl: (id: string, input: AvatarControlRequest) =>
    request<AvatarControlResponse>(
      `/api/class-sessions/${id}/avatar/control`,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    ),
  endClass: (id: string) =>
    request<ClassSession>(`/api/class-sessions/${id}/end`, {
      method: "POST"
    }),
  createCourse: (input: CreateCourseInput) =>
    request<Course>("/api/courses", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  startClass: (courseId: string) =>
    request<ClassSession>(`/api/courses/${courseId}/class-sessions`, {
      method: "POST"
    }),
  prepareAvatar: (input: AvatarPresentationInput) =>
    request<AvatarPresentation>("/api/avatar/presentations", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
