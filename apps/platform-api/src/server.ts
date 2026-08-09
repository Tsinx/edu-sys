import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

const rootEnvFile = fileURLToPath(
  new URL("../../../.env", import.meta.url)
);
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
const allowDevelopmentIdentity =
  process.env.EDU_ALLOW_DEVELOPMENT_IDENTITY === "true" || !production;

const app = await buildApp({
  dataFile,
  portSimulationDatabaseFile: simulationDatabaseFile,
  logger: true,
  allowDevelopmentIdentity,
  allowLegacyDevelopmentIdentity: !production,
  secureIdentityCookie: production
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
