import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const nonEmpty = (...values: (string | undefined)[]) => values.map(value => value?.trim()).find(Boolean);

export function dashScopeApiKey(env: NodeJS.ProcessEnv = process.env) {
  return nonEmpty(env.DASHSCOPE_API_KEY, env.dashscope_api_key);
}

export function assistantApiKey(env: NodeJS.ProcessEnv = process.env) {
  return nonEmpty(env.EDU_ASSISTANT_API_KEY, dashScopeApiKey(env));
}

export function loadRuntimeEnvironment() {
  // An explicitly supplied shell variable takes precedence over a file value.
  const environmentKey = dashScopeApiKey();
  const environmentAssistantKey = nonEmpty(process.env.EDU_ASSISTANT_API_KEY);
  // pnpm runs package scripts from apps/platform-api, while the classroom
  // launcher runs from the repository. Both must load the same configuration.
  const envFile = process.env.EDU_ENV_FILE ?? fileURLToPath(new URL("../../../.env", import.meta.url));
  let fileEnvironment: NodeJS.ProcessEnv = {};
  try {
    fileEnvironment = parseEnv(readFileSync(envFile, "utf8"));
    for (const [key, value] of Object.entries(fileEnvironment)) {
      if (process.env[key] === undefined && value !== undefined) process.env[key] = value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  // Empty inherited placeholders must not hide a real key in the service file.
  process.env.DASHSCOPE_API_KEY = environmentKey ?? dashScopeApiKey(fileEnvironment) ?? "";
  process.env.EDU_ASSISTANT_API_KEY = environmentAssistantKey ?? nonEmpty(fileEnvironment.EDU_ASSISTANT_API_KEY) ?? "";
}
