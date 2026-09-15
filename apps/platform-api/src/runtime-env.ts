import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

export function loadRuntimeEnvironment() {
  // An explicitly supplied shell variable takes precedence over a file value.
  const environmentKey = process.env.DASHSCOPE_API_KEY || process.env.dashscope_api_key;
  // pnpm runs package scripts from apps/platform-api, while the classroom
  // launcher runs from the repository. Both must load the same configuration.
  const envFile = process.env.EDU_ENV_FILE ?? fileURLToPath(new URL("../../../.env", import.meta.url));
  try {
    loadEnvFile(envFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  process.env.DASHSCOPE_API_KEY = environmentKey || process.env.DASHSCOPE_API_KEY || process.env.dashscope_api_key || "";
}
