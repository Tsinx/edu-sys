import { availableParallelism } from "node:os";
import { Agent, request as httpRequest } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { buildApp } from "../src/app.js";

const durationMs = Number(
  process.env.PORT_LOAD_DURATION_MS ?? 20 * 60 * 1_000
);
const assertTargets = process.env.PORT_LOAD_ASSERT === "true";
const teamCapacities = [
  ...Array.from({ length: 10 }, () => 5 as const),
  ...Array.from({ length: 5 }, () => 4 as const)
];
const roles = [
  "marine_control",
  "berth_operations",
  "horizontal_transport",
  "yard_gate"
] as const;

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))]!;
}

async function jsonRequest<T>(
  baseUrl: string,
  path: string,
  input: { method?: string; cookie?: string; body?: unknown } = {}
) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: input.method ?? "GET",
    headers: {
      ...(input.cookie ? { Cookie: input.cookie } : {}),
      ...(input.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body)
  });
  const payload = response.status === 204 ? undefined : await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${JSON.stringify(payload)}`);
  }
  return {
    payload: payload as T,
    latencyMs: performance.now() - startedAt,
    cookie: response.headers.get("set-cookie")?.split(";", 1)[0] ?? null
  };
}

async function agentJsonRequest<T>(
  baseUrl: string,
  path: string,
  agent: Agent,
  input: { method?: string; cookie?: string; body?: unknown } = {}
) {
  const body = input.body === undefined ? null : JSON.stringify(input.body);
  const startedAt = performance.now();
  return new Promise<{ payload: T; latencyMs: number }>((resolve, reject) => {
    const request = httpRequest(
      new URL(path, baseUrl),
      {
        method: input.method ?? "GET",
        agent,
        headers: {
          ...(input.cookie ? { Cookie: input.cookie } : {}),
          ...(body === null
            ? {}
            : {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
              })
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const payload = text ? JSON.parse(text) : undefined;
          if ((response.statusCode ?? 500) >= 400) {
            reject(new Error(`${response.statusCode} ${path}: ${text}`));
            return;
          }
          resolve({
            payload: payload as T,
            latencyMs: performance.now() - startedAt
          });
        });
      }
    );
    request.once("error", reject);
    if (body !== null) request.write(body);
    request.end();
  });
}

async function openSse(baseUrl: string, path: string, cookie?: string) {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    signal: controller.signal
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE ${response.status}: ${path}`);
  }
  const pump = (async () => {
    const reader = response.body!.getReader();
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    } finally {
      reader.releaseLock();
    }
  })();
  return {
    close: () => controller.abort(),
    finished: pump.catch(() => undefined)
  };
}

const directory = await mkdtemp(join(tmpdir(), "edu-port-load-"));
const app = await buildApp({
  dataFile: join(directory, "state.json"),
  portSimulationDatabaseFile: join(directory, "simulation.sqlite"),
  portSimulationTickMs: 250,
  logger: false
});
const baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });
const streams: Array<Awaited<ReturnType<typeof openSse>>> = [];
const commandLatencies: number[] = [];
const renewalLatencies: number[] = [];
const terminalAgents: Agent[] = [];
const startedCpu = process.cpuUsage();
const startedAt = performance.now();

try {
  const teacherIdentity = await jsonRequest<{ actor: { actorId: string } }>(
    baseUrl,
    "/api/identity/development/session",
    { method: "POST", body: { role: "teacher", displayName: "负载测试教师" } }
  );
  const teacherCookie = teacherIdentity.cookie!;
  const live = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/courses/course-port-management-intro/class-sessions",
    { method: "POST" }
  );
  const sessionId = live.payload.id;
  await jsonRequest(
    baseUrl,
    `/api/class-sessions/${sessionId}/simulation/setup`,
    {
      method: "POST",
      cookie: teacherCookie,
      body: {
        expectedStudentCount: 70,
        teamCapacities,
        teamNames: teamCapacities.map((_, index) => `负载组 ${index + 1}`)
      }
    }
  );

  const students: Array<{
    cookie: string;
    teamId: string;
    role?: typeof roles[number];
    roleSeatToken?: string;
    supportRole?: "operations_coordinator";
    supportSeatToken?: string;
    agent: Agent;
  }> = [];
  let studentIndex = 0;
  for (let teamIndex = 0; teamIndex < teamCapacities.length; teamIndex += 1) {
    const teamId = `team-${teamIndex + 1}`;
    for (let memberIndex = 0; memberIndex < teamCapacities[teamIndex]!; memberIndex += 1) {
      studentIndex += 1;
      const identity = await jsonRequest<{ actor: { actorId: string } }>(
        baseUrl,
        "/api/identity/development/session",
        {
          method: "POST",
          body: { role: "student", displayName: `虚拟学生 ${studentIndex}` }
        }
      );
      const cookie = identity.cookie!;
      const agent = new Agent({ keepAlive: true, maxSockets: 3 });
      terminalAgents.push(agent);
      await agentJsonRequest(
        baseUrl,
        `/api/class-sessions/${sessionId}/simulation/teams/${teamId}/join`,
        agent,
        { method: "POST", cookie, body: {} }
      );
      const student: (typeof students)[number] = { cookie, teamId, agent };
      if (memberIndex < 4) {
        const role = roles[memberIndex]!;
        const claim = await agentJsonRequest<{ roleSeatToken: string }>(
          baseUrl,
          `/api/class-sessions/${sessionId}/simulation/teams/${teamId}/roles/${role}/claim`,
          agent,
          { method: "POST", cookie, body: {} }
        );
        student.role = role;
        student.roleSeatToken = claim.payload.roleSeatToken;
      } else {
        const claim = await agentJsonRequest<{ supportSeatToken: string }>(
          baseUrl,
          `/api/class-sessions/${sessionId}/simulation/teams/${teamId}/support-roles/operations_coordinator/claim`,
          agent,
          { method: "POST", cookie, body: {} }
        );
        student.supportRole = "operations_coordinator";
        student.supportSeatToken = claim.payload.supportSeatToken;
      }
      students.push(student);
    }
  }

  await jsonRequest(
    baseUrl,
    `/api/class-sessions/${sessionId}/simulation/control`,
    {
      method: "POST",
      cookie: teacherCookie,
      body: { type: "start", allowIncompleteTeams: false }
    }
  );

  const openedStreams = await Promise.all(
    students.flatMap((student) => [
      openSse(
        baseUrl,
        `/api/class-sessions/${sessionId}/snapshot/stream`,
        student.cookie
      ),
      openSse(
        baseUrl,
        `/api/class-sessions/${sessionId}/simulation/teams/${student.teamId}/events/stream?afterSequence=0`,
        student.cookie
      )
    ])
  );
  streams.push(...openedStreams);

  const renewalBurst = async () => {
    const results = await Promise.all(
      students.map((student) => {
        const started = performance.now();
        const path = student.role
          ? `/api/class-sessions/${sessionId}/simulation/teams/${student.teamId}/roles/${student.role}/renew`
          : `/api/class-sessions/${sessionId}/simulation/teams/${student.teamId}/support-roles/${student.supportRole}/renew`;
        const body = student.role
          ? { roleSeatToken: student.roleSeatToken }
          : { supportSeatToken: student.supportSeatToken };
        return agentJsonRequest(baseUrl, path, student.agent, {
          method: "POST",
          cookie: student.cookie,
          body
        }).then(() => performance.now() - started);
      })
    );
    renewalLatencies.push(...results);
  };

  const commandBurst = async () => {
    const berthOperators = students.filter(
      (student) => student.role === "berth_operations"
    );
    const results = await Promise.all(
      berthOperators.map(async (student, index) => {
        const snapshot = await agentJsonRequest<{
          runId: string;
          revision: number;
          latestSequence: number;
          stateHash: string;
        }>(
          baseUrl,
          `/api/class-sessions/${sessionId}/simulation/teams/${student.teamId}/snapshot`,
          student.agent,
          { cookie: student.cookie }
        );
        const started = performance.now();
        await agentJsonRequest(
          baseUrl,
          `/api/class-sessions/${sessionId}/simulation/teams/${student.teamId}/commands`,
          student.agent,
          {
            method: "POST",
            cookie: student.cookie,
            body: {
              requestId: `load-command-${Date.now()}-${index}`,
              runId: snapshot.payload.runId,
              roleSeatToken: student.roleSeatToken,
              expectedRevision: snapshot.payload.revision,
              lastAppliedSequence: snapshot.payload.latestSequence,
              baseStateHash: snapshot.payload.stateHash,
              command: {
                type: "berth.assign",
                vesselId: "vessel-a",
                berthId: "berth-03"
              }
            }
          }
        );
        return performance.now() - started;
      })
    );
    commandLatencies.push(...results);
  };

  await renewalBurst();
  await commandBurst();
  const burstTimer = setInterval(() => {
    void renewalBurst();
    void commandBurst();
  }, 30_000);
  burstTimer.unref();

  if (durationMs >= 20_000) {
    await wait(Math.min(10_000, Math.floor(durationMs / 2)));
    const interrupted = streams.splice(0, 20);
    interrupted.forEach((stream) => stream.close());
    await Promise.all(interrupted.map((stream) => stream.finished));
    await wait(10_000);
    const reconnected = await Promise.all(
      students.slice(0, 10).flatMap((student) => [
        openSse(
          baseUrl,
          `/api/class-sessions/${sessionId}/snapshot/stream`,
          student.cookie
        ),
        openSse(
          baseUrl,
          `/api/class-sessions/${sessionId}/simulation/teams/${student.teamId}/events/stream?afterSequence=0`,
          student.cookie
        )
      ])
    );
    streams.push(...reconnected);
  }

  const elapsedBeforeWait = performance.now() - startedAt;
  if (durationMs > elapsedBeforeWait) await wait(durationMs - elapsedBeforeWait);
  clearInterval(burstTimer);

  const elapsedMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(startedCpu);
  const totalCpuMs = (cpu.user + cpu.system) / 1_000;
  const processCpuPercent = (totalCpuMs / elapsedMs) * 100;
  const machineCpuPercent = processCpuPercent / availableParallelism();
  const result = {
    durationMs: Math.round(elapsedMs),
    students: students.length,
    teams: teamCapacities.length,
    longConnections: streams.length,
    commandSamples: commandLatencies.length,
    commandP50Ms: Math.round(percentile(commandLatencies, 0.5)),
    commandP95Ms: Math.round(percentile(commandLatencies, 0.95)),
    commandMaxMs: Math.round(Math.max(...commandLatencies)),
    renewalP50Ms: Math.round(percentile(renewalLatencies, 0.5)),
    renewalP95Ms: Math.round(percentile(renewalLatencies, 0.95)),
    processCpuPercent: Number(processCpuPercent.toFixed(2)),
    machineCpuPercent: Number(machineCpuPercent.toFixed(2)),
    rssMiB: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1))
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (assertTargets) {
    if (result.commandP95Ms >= 300) throw new Error("command P95 target failed");
    if (result.renewalP95Ms >= 500) throw new Error("renewal burst target failed");
    if (result.machineCpuPercent >= 30) throw new Error("CPU target failed");
  }
} finally {
  streams.forEach((stream) => stream.close());
  terminalAgents.forEach((agent) => agent.destroy());
  await Promise.all(streams.map((stream) => stream.finished));
  await app.close();
  await rm(directory, { recursive: true, force: true });
}
