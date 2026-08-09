import { randomUUID } from "node:crypto";
import type {
  ClassroomActor,
  ClassroomActorRole,
  ClassroomIdentityCredential,
  ClassroomIdentityProvider,
  DevelopmentIdentitySessionInput,
  ExternalClassroomRosterSnapshot
} from "@edu/contracts";

export const CLASSROOM_IDENTITY_COOKIE = "edu_identity_session";

interface DevelopmentIdentitySessionRecord {
  token: string;
  actor: ClassroomActor;
  expiresAt: number;
}

export class DevelopmentIdentityProvider implements ClassroomIdentityProvider {
  readonly source = "development" as const;
  private readonly sessions = new Map<string, DevelopmentIdentitySessionRecord>();

  constructor(
    private readonly options: {
      allowRoleSelection: boolean;
      sessionTtlMs?: number;
    }
  ) {}

  createSession(input: DevelopmentIdentitySessionInput) {
    if (!this.options.allowRoleSelection) {
      throw Object.assign(new Error("生产环境未启用开发身份入口"), {
        statusCode: 403,
        code: "DEVELOPMENT_IDENTITY_DISABLED"
      });
    }
    const token = randomUUID();
    const suffix = token.slice(0, 4).toUpperCase();
    const actor: ClassroomActor = {
      actorId: `development:${input.role}:${randomUUID()}`,
      displayName:
        input.displayName ??
        (input.role === "teacher" ? "李行之" : `学生 ${suffix}`),
      roles: [input.role],
      identitySource: "development"
    };
    const expiresAt = Date.now() + (this.options.sessionTtlMs ?? 8 * 60 * 60 * 1_000);
    this.sessions.set(token, { token, actor, expiresAt });
    return { token, actor, expiresAt };
  }

  async resolveActor(credential: ClassroomIdentityCredential) {
    const token = credential.sessionToken;
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session.actor;
  }

  revokeSession(token: string | null) {
    if (token) this.sessions.delete(token);
  }
}

export function parseCookieHeader(cookieHeader: string | undefined) {
  const result: Record<string, string> = {};
  for (const part of cookieHeader?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

export function identityCookie(
  token: string,
  options: { secure: boolean; maxAgeSeconds: number }
) {
  return [
    `${CLASSROOM_IDENTITY_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAgeSeconds}`,
    options.secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
}

export function expiredIdentityCookie(options: { secure: boolean }) {
  return [
    `${CLASSROOM_IDENTITY_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    options.secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
}

export interface ExternalRosterGroupIssue {
  fixedGroupRef: string;
  memberCount: number;
  code: "GROUP_TOO_SMALL" | "GROUP_TOO_LARGE";
  message: string;
}

export function validateExternalRosterGroups(
  roster: ExternalClassroomRosterSnapshot
): ExternalRosterGroupIssue[] {
  const counts = new Map<string, number>();
  for (const member of roster.members) {
    if (member.role !== "student" || !member.fixedGroupRef) continue;
    counts.set(member.fixedGroupRef, (counts.get(member.fixedGroupRef) ?? 0) + 1);
  }
  return [...counts.entries()].flatMap<ExternalRosterGroupIssue>(([
    fixedGroupRef,
    memberCount
  ]) => {
    if (memberCount < 4) {
      return [{
        fixedGroupRef,
        memberCount,
        code: "GROUP_TOO_SMALL" as const,
        message: `${fixedGroupRef} 只有 ${memberCount} 人，需要教师在开局前调整到 4–6 人。`
      }];
    }
    if (memberCount > 6) {
      return [{
        fixedGroupRef,
        memberCount,
        code: "GROUP_TOO_LARGE" as const,
        message: `${fixedGroupRef} 有 ${memberCount} 人，需要教师调组或设置观察员。`
      }];
    }
    return [];
  });
}

export function actorHasRole(actor: ClassroomActor, role: ClassroomActorRole) {
  return actor.roles.includes(role);
}
