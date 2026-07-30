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
const host = process.env.EDU_API_HOST ?? "127.0.0.1";
const port = Number(process.env.EDU_API_PORT ?? 4300);

const app = await buildApp({ dataFile, logger: true });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
