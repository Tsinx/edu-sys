import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, copyFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const exec = promisify(execFile);

test("package and repository starts load root voice configuration, preserving explicit environment settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "edu-runtime-env-"));
  const packageDir = join(root, "apps/platform-api");
  const modulePath = join(packageDir, "src/runtime-env.ts");
  try {
    await mkdir(join(packageDir, "src"), { recursive: true });
    await copyFile(new URL("../src/runtime-env.ts", import.meta.url), modulePath);
    await writeFile(join(root, ".env"), "DASHSCOPE_API_KEY=fixture-key\nEDU_SELFSTUDY_TTS_VOICE_ID=root-voice\n");
    await writeFile(join(packageDir, ".env"), "EDU_SELFSTUDY_TTS_VOICE_ID=wrong-package-voice\n");
    await writeFile(join(packageDir, "custom.env"), "DASHSCOPE_API_KEY=file-key\nEDU_SELFSTUDY_TTS_VOICE_ID=custom-voice\n");
    const script = `const {loadRuntimeEnvironment}=await import(${JSON.stringify(pathToFileURL(modulePath).href)});loadRuntimeEnvironment();console.log(JSON.stringify({key:process.env.DASHSCOPE_API_KEY,voice:process.env.EDU_SELFSTUDY_TTS_VOICE_ID}));`;
    const run = async (cwd: string, overrides: Record<string, string> = {}) => {
      // Only synthetic credentials enter the child fixture; never print host secrets.
      const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, ...overrides };
      const { stdout } = await exec(process.execPath, ["--import", import.meta.resolve("tsx"), "--input-type=module", "-e", script], { cwd, env });
      return JSON.parse(stdout);
    };
    for (const cwd of [root, packageDir, tmpdir()]) {
      assert.deepEqual(await run(cwd), { key: "fixture-key", voice: "root-voice" });
    }
    assert.deepEqual(await run(packageDir, { EDU_ENV_FILE: "custom.env", DASHSCOPE_API_KEY: "process-key" }), { key: "process-key", voice: "custom-voice" });
    assert.deepEqual(await run(packageDir, { EDU_ENV_FILE: "custom.env", dashscope_api_key: "lowercase-process-key" }), { key: "lowercase-process-key", voice: "custom-voice" });
    await writeFile(join(packageDir, "lowercase.env"), "dashscope_api_key=lowercase-file-key\n");
    assert.deepEqual(await run(packageDir, { EDU_ENV_FILE: "lowercase.env" }), { key: "lowercase-file-key" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
