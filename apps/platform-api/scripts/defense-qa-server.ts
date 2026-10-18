// Isolated browser acceptance fixture. Never uses live course data or external AI.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
import type { AssistantJsonStreamRequest } from "../src/assistant/provider.js";
const dataFile = resolve(`../../.runtime/defense-qa-${randomUUID()}/state.json`);
const identity = new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
await identity.createAccount("defense-teacher", "李行之", "teacher", "defense-fixture-password");
const student = await identity.createAccount("defense-student", "答辩验收学生", "student", "defense-fixture-password");
identity.setCourseAccess(student.id, ["course-economic-mathematics"]);
const app = await buildApp({ dataFile, campusMode: true, identityProvider: identity, secureIdentityCookie: false,
  portSimulationTickMs: 0, publicOrigin: "http://127.0.0.1:4312", staticRoot: resolve("../teacher-web/dist"),
  assistantProvider: { name: "defense-browser-fixture", async *streamJson(r: AssistantJsonStreamRequest) {
    const data = JSON.parse(r.messages[1]!.content), previous = data.history.at(-1)?.answer as string | undefined;
    if (data.history.length === 1) throw new Error("Simulated temporary outage");
    const anchor = (previous || data.work).slice(0, 40);
    yield JSON.stringify({ question: data.finished ? null : { prompt: `针对“${anchor}”，请结合${data.nextDimension.label}说明判断依据，并给出一个检验步骤。`, anchor },
      evaluation: previous ? { level: 2, evidence: previous.slice(0, 20), rationale: "能说明比较依据，还需补充假设检验。此为验收模型输出。" } : null });
  } } });
await app.listen({ port: 4312, host: "127.0.0.1" });
console.log("DEFENSE_QA_READY http://127.0.0.1:4312");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void app.close().then(() => process.exit(0)); });
