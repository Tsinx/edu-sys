import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { ClassroomSnapshot } from "@edu/contracts";
import type { LamAvatarController } from "./LamAvatarSurface";
import { realtimeErrorMessage, RealtimeVoiceClient, type RealtimeCaptureSink } from "./realtime-voice";

export function useRealtimeClassroom(sessionId: string, enabled: boolean, contextKey: string, callbacks: {
  avatar: RefObject<LamAvatarController | null>;
  phase(value: "idle" | "thinking" | "streaming"): void;
  transcript(value: string): void;
  notice(value: string): void;
  error(value: string): void;
  snapshot(value: ClassroomSnapshot): unknown;
}) {
  const latest = useRef(callbacks); latest.current = callbacks;
  const context = useRef(contextKey); context.current = contextKey;
  const playback = useRef<{ id: string; context: string } | undefined>(undefined);
  const client = useMemo(() => {
    let text = "";
    return new RealtimeVoiceClient(sessionId, event => {
      const cb = latest.current;
      if (event.type === "session.ready") { cb.error(""); cb.notice("实时语音连接已就绪。"); }
      if (event.type === "input.transcript") cb.notice(`语音识别：“${event.text}”`);
      if (event.type === "turn.started") text = "";
      if (event.type === "dialogue.delta") { text += event.delta; cb.transcript(text); cb.phase("streaming"); cb.avatar.current?.pushRealtimeText?.(event.turnId, event.delta); }
      if (event.type === "audio.delta") {
        cb.phase("streaming");
        try { cb.avatar.current?.pushRealtimeAudio?.(event.turnId, event.audioBase64, event.sampleRate); }
        catch (error) { cb.error((error as Error).message); client.cancel(); cb.avatar.current?.interrupt(); cb.phase("idle"); }
      }
      if (event.type === "control.result") { cb.snapshot(event.result.snapshot); cb.notice(event.result.results.map(r => r.message).join("；")); }
      if (event.type === "turn.completed") {
        const completedPlayback = { id: event.turnId, context: context.current };
        playback.current = completedPlayback;
        window.dispatchEvent(new CustomEvent("edu:voice-timing", { detail: { path: "realtime", turnId: event.turnId, event: "completed", at: performance.now(), ...event.timing } }));
        void cb.avatar.current?.finishRealtime?.(event.turnId).then(completed => {
          if (playback.current === completedPlayback) playback.current = undefined;
          if (completed) cb.phase("idle");
        });
      }
      if (event.type === "error" || event.type === "turn.cancelled") {
        playback.current = undefined;
        cb.avatar.current?.interrupt(); cb.phase("idle");
        if (event.type === "error") cb.error(realtimeErrorMessage(event.message));
      }
    });
  }, [sessionId]);
  useEffect(() => {
    // Generation is guarded by the server. Once it finishes, the browser may
    // still have queued speech; discard that queue when the visible page moves.
    if (playback.current && playback.current.context !== contextKey) {
      playback.current = undefined;
      latest.current.avatar.current?.interrupt(); latest.current.phase("idle");
    }
  }, [contextKey]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void client.prepare().catch(error => { if (active) latest.current.error(realtimeErrorMessage(error.message)); });
    return () => { active = false; playback.current = undefined; client.close(); latest.current.avatar.current?.interrupt(); latest.current.phase("idle"); };
  }, [client, enabled]);
  const sink = useMemo<RealtimeCaptureSink>(() => ({
    prepare: () => { latest.current.avatar.current?.interrupt(); return client.prepare(); },
    begin: () => { latest.current.error(""); client.begin(); },
    append: samples => client.append(samples),
    commit: async () => {
      const cb = latest.current;
      if (!client.turnId) throw new Error("录音轮次已失效，请重新开始。");
      cb.transcript(""); cb.phase("thinking"); cb.avatar.current?.beginRealtime?.(client.turnId);
      try { await client.commit(); }
      catch (error) { cb.avatar.current?.interrupt(); cb.phase("idle"); throw error; }
    },
    cancel: () => client.cancel()
  }), [client]);
  return { sink: enabled ? sink : undefined, cancel: () => client.cancel() };
}
