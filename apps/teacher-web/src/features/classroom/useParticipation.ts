import type { ClassroomParticipationView } from "@edu/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

export function useParticipation(sessionId: string) {
  const [view, setView] = useState<ClassroomParticipationView>();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const currentSession = useRef(sessionId);
  currentSession.current = sessionId;
  const base = `/api/class-sessions/${encodeURIComponent(sessionId)}/participation`;
  const merge = useCallback((next: ClassroomParticipationView) => {
    if (currentSession.current !== sessionId) return;
    setView(old => !old || next.revision >= old.revision ? next : old);
  }, [sessionId]);
  const request = useCallback(async (suffix = "", body?: unknown) => {
    const response = await fetch(base + suffix, { credentials: "same-origin", ...(body === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "课堂活动连接失败");
    merge(result as ClassroomParticipationView);
  }, [base, merge]);
  useEffect(() => {
    setView(undefined); setError(""); setConnected(false);
    let active = true;
    const source = new EventSource(`${base}/stream`);
    source.addEventListener("participation", event => {
      if (!active) return;
      try { merge(JSON.parse((event as MessageEvent<string>).data)); setConnected(true); setError(""); }
      catch { setConnected(false); }
    });
    source.onerror = () => { if (active) setConnected(false); };
    return () => { active = false; source.close(); };
  }, [base, merge]);
  useEffect(() => {
    if (connected) return;
    let active = true;
    const refresh = () => { void request().catch((reason: Error) => { if (active) setError(reason.message); }); };
    refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => { active = false; clearInterval(timer); };
  }, [connected, request]);
  const mutate = async (suffix: string, body: unknown) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError("");
    try { await request(suffix, body); return true; }
    catch (reason) { setError((reason as Error).message); void request().catch(() => undefined); return false; }
    finally { pending.current = false; setBusy(false); }
  };
  return { view, connected, busy, error, mutate };
}
