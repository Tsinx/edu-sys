// Development-only entry, excluded from the production application.
import { RealtimeVoiceClient } from "../src/features/classroom/realtime-voice";
import { StreamingPcmPlayer } from "../src/features/avatar/StreamingPcmPlayer";
import { SpeechMeter } from "../src/features/avatar/SpeechMeter";
import type { RealtimeServerEvent } from "@edu/contracts";

const assets = import.meta.glob(["../../../output/realtime-voice-qa/*.pcm", "../../../output/realtime-voice-qa/*fixtures.json"], { query: "?url", import: "default", eager: true }) as Record<string, string>;
const asset = (name: string) => {
  const url = Object.entries(assets).find(([path]) => path.endsWith(`/${name}`))?.[1];
  if (!url) throw new Error(`缺少缓存录音 ${name}；请先生成 output/realtime-voice-qa/ 中的测试录音。`);
  return url;
};
const byId = (id: string) => document.getElementById(id)!;
const button = (id: string) => byId(id) as HTMLButtonElement;
const status = (text: string) => { byId("status").textContent = text; };
type Fixture = { name: string; text: string; durationMs: number };
let stopped = false;
let client: RealtimeVoiceClient | undefined;
let player: StreamingPcmPlayer | undefined;
let report: { measuredAt: string; mode: string; metric: string; results: Record<string, unknown>[]; error?: string };
async function json(path: string, body?: unknown) {
  const response = await fetch(path, body === undefined ? {} : {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
const refresh = () => { byId("results").textContent = JSON.stringify(report, null, 2); };
async function run(probe: boolean) {
  stopped = false;
  for (const id of ["probe", "benchmark", "download"]) button(id).disabled = true;
  button("stop").disabled = false;
  byId("progress").textContent = "";
  report = { measuredAt: new Date().toISOString(), mode: probe ? "direct-probe" : "direct-30", metric: "browser scheduled first non-silent PCM sample after submit; excludes microphone duration; not acoustic speaker measurement", results: [] };
  const audio = new AudioContext({sampleRate:24000});
  let sessionId: string | undefined;
  try {
    await audio.resume();
    if (audio.state !== "running") throw new Error("浏览器音频尚未启动。");
    const fixtures: Fixture[] = await json(asset(probe ? "probe-fixtures.json" : "fixtures.json"));
    const session = await json("/api/courses/course-port-management-intro/class-sessions", {});
    sessionId = session.id;
    let events: RealtimeServerEvent[] = [];
    client = new RealtimeVoiceClient(session.id, event => {
      events.push(event);
      if (event.type === "audio.delta") player?.push(event.audioBase64, event.sampleRate);
      if (event.type === "error") player?.stop();
    });
    for (let round = 0; round < (probe ? 1 : 3); round++) {
      for (const [i, fixture] of fixtures.entries()) {
        if (stopped) throw new Error("测试已停止。");
        status(`第 ${report.results.length + 1} / ${fixtures.length * (probe ? 1 : 3)} 次：${fixture.text}`);
        events = [];
        const marks: Array<{event: string; at: number}> = [];
        const listener = (event: Event) => marks.push((event as CustomEvent).detail);
        window.addEventListener("edu:voice-timing", listener);
        let result: Record<string, unknown> = {path:"realtime-direct",round,fixture:fixture.name,text:fixture.text,connection:i === 0 ? "cold" : "warm",sessionId};
        try {
          const raw = await fetch(asset(`${fixture.name}.pcm`)).then(r => r.arrayBuffer());
          const data = new DataView(raw), samples = new Float32Array(raw.byteLength / 2);
          for (let j = 0; j < samples.length; j++) samples[j] = data.getInt16(j * 2, true) / 32768;
          const prepareAt = performance.now(); await client.prepare();
          result.prepareMs = performance.now() - prepareAt;
          client.begin();
          player = new StreamingPcmPlayer(audio, new SpeechMeter(), client.turnId!);
          // Replay at the same 100ms pacing as the browser microphone.
          for (let j = 0; j < samples.length; j += 1600) {
            if (stopped) throw new Error("测试已停止。");
            client.append(samples.subarray(j, j + 1600));
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          const commitAt = performance.now(); await client.commit();
          const firstAudio = marks.find(m => m.event === "first-audio");
          await player.finish();
          const snapshot = await json(`/api/class-sessions/${session.id}/snapshot`);
          result = {...result,firstAudioMs:firstAudio ? firstAudio.at - commitAt : null,totalMs:performance.now() - commitAt,
            timing:events.find(e => e.type === "turn.completed")?.timing,
            transcript:events.filter(e => e.type === "input.transcript").map(e => e.text).join(""),
            dialogue:events.filter(e => e.type === "dialogue.delta").map(e => e.delta).join(""),
            controls:events.filter(e => e.type === "control.result").map(e => ({status:e.result.status,results:e.result.results,slide:e.result.snapshot.slide})),
            finalSlide:snapshot.slide,audioChunks:events.filter(e => e.type === "audio.delta").length};
          if (!firstAudio) throw new Error("没有可播放的非静音音频。");
        } catch (error) {
          result.error = (error as Error).message; client.cancel(); player?.stop();
        } finally { window.removeEventListener("edu:voice-timing", listener); }
        result.events = events.map(e => e.type); result.recordedAt = new Date().toISOString();
        report.results.push(result); refresh();
        byId("progress").textContent += `${report.results.length}. ${fixture.name} ${result.error ?? `${Number(result.firstAudioMs).toFixed(0)} ms`}\n`;
        if (probe && result.error) throw new Error(String(result.error));
      }
      client.close();
    }
    status(`已完成 ${report.results.length} 次，失败 ${report.results.filter(r => r.error).length} 次。`);
  } catch (error) { report.error = (error as Error).message; status(report.error); }
  finally {
    client?.close(); player?.stop(); await audio.close();
    if (sessionId) await json(`/api/class-sessions/${sessionId}/end`, {}).catch(error => { report.error = `测试课堂清理失败：${error.message}`; });
    refresh();
    for (const id of ["probe", "benchmark", "download"]) button(id).disabled = false;
    button("stop").disabled = true;
  }
}
button("probe").onclick = () => { void run(true); };
button("benchmark").onclick = () => { void run(false); };
button("stop").onclick = () => { stopped = true; client?.cancel(); player?.stop(); };
button("download").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type:"application/json"}));
  const a = document.createElement("a"); a.href = url; a.download = `${report.mode}-${Date.now()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
status("准备就绪；点击按钮会播放音频并进行真实模型调用。");
