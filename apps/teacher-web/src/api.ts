import type {
  AssistantTurnEvent,
  AssistantTurnInput,
  AvatarControlCapabilities,
  AvatarControlRequest,
  AvatarControlResponse,
  AvatarPresentation,
  AvatarPresentationInput,
  ClassroomEventInput,
  ClassroomActor,
  ClassroomIdentitySession,
  ClassroomPresence,
  ClassroomSnapshot,
  ClassSession,
  Course,
  CreateCourseInput,
  Dashboard,
  LamRuntimeStatus,
  PortSimulationCollaborationCreateInput,
  PortSimulationCollaborationResponse,
  PortSimulationCollaborationResponseInput,
  PortSimulationCommandEnvelope,
  PortSimulationCommandEnvelopeV2,
  PortSimulationCommandResultV2,
  PortSimulationCommandResponse,
  PortSimulationControlInput,
  PortSimulationRole,
  PortSimulationRoleClaimResponse,
  PortSimulationSetupInput,
  PortSimulationSupportRole,
  PortSimulationSupportSeatClaimResponse,
  PortSimulationTeamConfigurationInput,
  PortSimulationTeamSnapshot,
  PortSimulationCheckpoint,
  PortSimulationEventBatch,
  PortSimulationPreflightReport,
  PortSimulationStreamMessage,
  PortSimulationTeacherCommandInput,
  PortSimulationTeacherCommandInputV2,
  TeacherAvatarCommandInput,
  TeacherAvatarCommandResponse,
  Teacher
} from "@edu/contracts";
import {
  assistantTurnEventSchema,
  classroomSnapshotSchema,
  portSimulationStreamMessageSchema,
  portSimulationTeamSnapshotSchema
} from "@edu/contracts";

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
    headers,
    credentials: "same-origin"
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
      credentials: "same-origin",
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

function subscribeClassroomSnapshot(
  id: string,
  onSnapshot: (snapshot: ClassroomSnapshot) => void,
  onConnectionChange?: (connected: boolean) => void
) {
  const source = new EventSource(
    `/api/class-sessions/${id}/snapshot/stream`,
    { withCredentials: true }
  );
  source.addEventListener("open", () => onConnectionChange?.(true));
  source.addEventListener("snapshot", (event) => {
    const snapshot = classroomSnapshotSchema.parse(
      JSON.parse((event as MessageEvent<string>).data) as unknown
    );
    onSnapshot(snapshot);
  });
  source.addEventListener("error", () => onConnectionChange?.(false));
  return () => {
    onConnectionChange?.(false);
    source.close();
  };
}

function subscribePortSimulationTeamSnapshot(
  sessionId: string,
  teamId: string,
  onSnapshot: (snapshot: PortSimulationTeamSnapshot) => void,
  onConnectionChange?: (connected: boolean) => void
) {
  const source = new EventSource(
    `/api/class-sessions/${sessionId}/simulation/teams/${teamId}/snapshot/stream`,
    { withCredentials: true }
  );
  source.addEventListener("open", () => onConnectionChange?.(true));
  source.addEventListener("simulation-snapshot", (event) => {
    const snapshot = portSimulationTeamSnapshotSchema.parse(
      JSON.parse((event as MessageEvent<string>).data) as unknown
    );
    onSnapshot(snapshot);
  });
  source.addEventListener("error", () => onConnectionChange?.(false));
  return () => {
    onConnectionChange?.(false);
    source.close();
  };
}

function subscribePortSimulationEventStream(
  sessionId: string,
  teamId: string,
  afterSequence: number,
  onMessage: (message: PortSimulationStreamMessage) => void,
  onConnectionChange?: (connected: boolean) => void
) {
  const source = new EventSource(
    `/api/class-sessions/${sessionId}/simulation/teams/${teamId}/events/stream?afterSequence=${afterSequence}`,
    { withCredentials: true }
  );
  source.addEventListener("open", () => onConnectionChange?.(true));
  for (const eventName of [
    "event",
    "time_sync",
    "presence",
    "resync_required"
  ]) {
    source.addEventListener(eventName, (event) => {
      const message = portSimulationStreamMessageSchema.parse(
        JSON.parse((event as MessageEvent<string>).data) as unknown
      );
      onMessage(message);
    });
  }
  source.addEventListener("error", () => onConnectionChange?.(false));
  return () => {
    onConnectionChange?.(false);
    source.close();
  };
}

export const api = {
  getIdentitySession: () =>
    request<ClassroomIdentitySession>("/api/identity/session"),
  createDevelopmentIdentitySession: (
    role: "teacher" | "student",
    displayName?: string
  ) =>
    request<ClassroomIdentitySession>("/api/identity/development/session", {
      method: "POST",
      body: JSON.stringify({ role, displayName })
    }),
  logoutIdentitySession: () =>
    request<void>("/api/identity/logout", { method: "POST" }),
  getMe: () => request<Teacher>("/api/me"),
  getDashboard: () => request<Dashboard>("/api/dashboard"),
  getCourses: () => request<Course[]>("/api/courses"),
  getCourse: (id: string) => request<Course>(`/api/courses/${id}`),
  getSessions: () => request<ClassSession[]>("/api/class-sessions"),
  getSession: (id: string) => request<ClassSession>(`/api/class-sessions/${id}`),
  getClassroomSnapshot: (id: string) =>
    request<ClassroomSnapshot>(`/api/class-sessions/${id}/snapshot`),
  subscribeClassroomSnapshot,
  setupPortSimulation: (id: string, input: PortSimulationSetupInput) =>
    request<ClassroomSnapshot>(`/api/class-sessions/${id}/simulation/setup`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  configurePortSimulationTeams: (
    id: string,
    input: PortSimulationTeamConfigurationInput
  ) =>
    request<ClassroomSnapshot>(
      `/api/class-sessions/${id}/simulation/configuration`,
      { method: "PATCH", body: JSON.stringify(input) }
    ),
  controlPortSimulation: (id: string, input: PortSimulationControlInput) =>
    request<ClassroomSnapshot>(`/api/class-sessions/${id}/simulation/control`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getPortSimulationTeamSnapshot: (id: string, teamId: string) =>
    request<PortSimulationTeamSnapshot>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/snapshot`
    ),
  joinPortSimulationTeam: (
    id: string,
    teamId: string
  ) =>
    request<PortSimulationTeamSnapshot>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/join`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  subscribePortSimulationTeamSnapshot,
  claimPortSimulationRole: (
    id: string,
    teamId: string,
    role: PortSimulationRole
  ) =>
    request<PortSimulationRoleClaimResponse>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/roles/${role}/claim`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  releasePortSimulationRole: (
    id: string,
    teamId: string,
    role: PortSimulationRole,
    roleSeatToken: string
  ) =>
    request<PortSimulationTeamSnapshot>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/roles/${role}/release`,
      {
        method: "POST",
        body: JSON.stringify({ roleSeatToken })
      }
    ),
  renewPortSimulationRoleLease: (
    id: string,
    teamId: string,
    role: PortSimulationRole,
    roleSeatToken: string
  ) =>
    request<{ expiresAt: string; presenceRevision: number }>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/roles/${role}/renew`,
      { method: "POST", body: JSON.stringify({ roleSeatToken }) }
    ),
  teacherReleasePortSimulationRole: (
    id: string,
    teamId: string,
    role: PortSimulationRole
  ) =>
    request<PortSimulationTeamSnapshot>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/roles/${role}/teacher-release`,
      { method: "POST" }
    ),
  claimPortSimulationSupportSeat: (
    id: string,
    teamId: string,
    role: PortSimulationSupportRole
  ) =>
    request<PortSimulationSupportSeatClaimResponse>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/support-roles/${role}/claim`,
      { method: "POST", body: JSON.stringify({}) }
    ),
  releasePortSimulationSupportSeat: (
    id: string,
    teamId: string,
    role: PortSimulationSupportRole,
    supportSeatToken: string
  ) =>
    request<PortSimulationTeamSnapshot>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/support-roles/${role}/release`,
      {
        method: "POST",
        body: JSON.stringify({ supportSeatToken })
      }
    ),
  renewPortSimulationSupportLease: (
    id: string,
    teamId: string,
    role: PortSimulationSupportRole,
    supportSeatToken: string
  ) =>
    request<{ expiresAt: string; presenceRevision: number }>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/support-roles/${role}/renew`,
      { method: "POST", body: JSON.stringify({ supportSeatToken }) }
    ),
  teacherReleasePortSimulationSupportSeat: (
    id: string,
    teamId: string,
    role: PortSimulationSupportRole
  ) =>
    request<PortSimulationTeamSnapshot>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/support-roles/${role}/teacher-release`,
      { method: "POST" }
    ),
  createPortSimulationCollaborationItem: (
    id: string,
    teamId: string,
    input: PortSimulationCollaborationCreateInput
  ) => {
    const { participantId: _participantId, ...authenticatedInput } = input;
    return (
    request<PortSimulationCollaborationResponse>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/collaboration-items`,
      { method: "POST", body: JSON.stringify(authenticatedInput) }
    ));
  },
  respondToPortSimulationCollaborationItem: (
    id: string,
    teamId: string,
    itemId: string,
    input: PortSimulationCollaborationResponseInput
  ) => {
    const { participantId: _participantId, ...authenticatedInput } = input;
    return (
    request<PortSimulationCollaborationResponse>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/collaboration-items/${itemId}/respond`,
      { method: "POST", body: JSON.stringify(authenticatedInput) }
    ));
  },
  sendPortSimulationCommand: (
    id: string,
    teamId: string,
    input: PortSimulationCommandEnvelope
  ) => {
    const { participantId: _participantId, ...authenticatedInput } = input;
    return (
    request<PortSimulationCommandResponse>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/commands`,
      { method: "POST", body: JSON.stringify(authenticatedInput) }
    ));
  },
  sendPortSimulationTeacherCommand: (
    id: string,
    teamId: string,
    input: PortSimulationTeacherCommandInput
  ) =>
    request<PortSimulationCommandResponse>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/teacher-commands`,
      { method: "POST", body: JSON.stringify(input) }
    ),
  sendPortSimulationCommandV2: (
    id: string,
    teamId: string,
    input: PortSimulationCommandEnvelopeV2
  ) =>
    request<PortSimulationCommandResultV2>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/commands`,
      { method: "POST", body: JSON.stringify(input) }
    ),
  sendPortSimulationTeacherCommandV2: (
    id: string,
    teamId: string,
    input: PortSimulationTeacherCommandInputV2
  ) =>
    request<PortSimulationCommandResultV2>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/teacher-commands`,
      { method: "POST", body: JSON.stringify(input) }
    ),
  getPortSimulationCheckpoint: (id: string, teamId: string) =>
    request<PortSimulationCheckpoint>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/checkpoint`
    ),
  getPortSimulationEventsAfter: (
    id: string,
    teamId: string,
    afterSequence: number
  ) =>
    request<PortSimulationEventBatch>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/events?afterSequence=${afterSequence}`
    ),
  subscribePortSimulationEventStream,
  forcePortSimulationResync: (id: string, teamId: string) =>
    request<{ status: string }>(
      `/api/class-sessions/${id}/simulation/teams/${teamId}/resync`,
      { method: "POST" }
    ),
  getPortSimulationPreflight: (id: string) =>
    request<PortSimulationPreflightReport>(
      `/api/class-sessions/${id}/simulation/preflight`
    ),
  getLamRuntimeStatus: () =>
    request<LamRuntimeStatus>("/api/avatar/runtime/status"),
  heartbeatClassroomPresence: (id: string) =>
    request<ClassroomPresence>(
      `/api/class-sessions/${id}/presence/heartbeat`,
      {
        method: "POST",
        body: JSON.stringify({})
      }
    ),
  leaveClassroomPresence: (id: string) =>
    request<void>(`/api/class-sessions/${id}/presence/leave`, {
      method: "POST",
      body: JSON.stringify({}),
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
