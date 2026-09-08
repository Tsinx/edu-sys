import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { resolve } from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

const rootEnvFile = process.env.EDU_ENV_FILE ?? resolve(".env");
try {
  loadEnvFile(rootEnvFile);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw error;
  }
}

const defaultDataFile = fileURLToPath(
  new URL("../../../.runtime/platform-api/state.json", import.meta.url)
);
const dataFile = process.env.EDU_DATA_FILE ?? defaultDataFile;
const defaultSimulationDatabaseFile = fileURLToPath(
  new URL(
    "../../../.runtime/platform-api/port-simulation.sqlite",
    import.meta.url
  )
);
const simulationDatabaseFile =
  process.env.EDU_PORT_SIMULATION_DB ?? defaultSimulationDatabaseFile;
const host = process.env.EDU_API_HOST ?? "127.0.0.1";
const port = Number(process.env.EDU_API_PORT ?? 4300);
const production = process.env.NODE_ENV === "production";
const campusMode = production || process.env.EDU_DEPLOYMENT_PROFILE === "campus";
const publicOrigin = process.env.EDU_PUBLIC_ORIGIN;
if (campusMode && (!publicOrigin || new URL(publicOrigin).protocol !== "https:" || new URL(publicOrigin).origin !== publicOrigin)) {
  throw new Error("校园部署需要 EDU_PUBLIC_ORIGIN=https://你的教学域名，并由 HTTPS 入口代理。");
}
if (campusMode && process.env.EDU_ALLOW_DEVELOPMENT_IDENTITY === "true") {
  throw new Error("校园部署禁止开发身份入口。");
}
const allowDevelopmentIdentity =
  process.env.EDU_ALLOW_DEVELOPMENT_IDENTITY === "true" || !campusMode;

function positiveSetting(name: string, fallback: number, maximum: number) {
  const value=Number(process.env[name] ?? fallback);
  if(!Number.isInteger(value) || value<1 || value>maximum) throw new Error(`${name} 必须为1–${maximum}的整数`);
  return value;
}

const app = await buildApp({
  dataFile,
  portSimulationDatabaseFile: simulationDatabaseFile,
  logger: true,
  allowDevelopmentIdentity,
  allowLegacyDevelopmentIdentity: !campusMode,
  secureIdentityCookie: campusMode,
  campusMode,
  publicOrigin,
  staticRoot: process.env.EDU_STATIC_ROOT ? resolve(process.env.EDU_STATIC_ROOT) : undefined,
  aiLimits: {
    concurrency: positiveSetting("EDU_AI_CONCURRENCY",6,100),
    queue: positiveSetting("EDU_AI_QUEUE",30,200),
    dailyRequests: positiveSetting("EDU_AI_DAILY_REQUESTS",100,10000),
    timeoutMs: positiveSetting("EDU_AI_TIMEOUT_MS",120000,600000)
  }
});

const pidFile=campusMode ? join(dirname(resolve(dataFile)),"server.pid") : undefined;
if(pidFile) app.addHook("onClose",async()=>{await unlink(pidFile).catch(()=>undefined);});
try {
  await app.listen({ host, port });
  if(pidFile) {await mkdir(dirname(pidFile),{recursive:true});await writeFile(pidFile,String(process.pid));}
  for(const signal of ["SIGINT","SIGTERM"] as const) process.once(signal,()=>{ void app.close().then(()=>process.exit(0)); });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
