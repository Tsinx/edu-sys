import type { ClassroomActor, ClassroomSnapshot } from "@edu/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api";

let pendingIdentity: ReturnType<typeof api.getIdentitySession> | undefined;
function identity() {
  pendingIdentity ??= api.getIdentitySession().catch(reason => {
    if (import.meta.env.DEV && reason instanceof ApiError && reason.status === 401) return api.createDevelopmentIdentitySession("student");
    throw reason;
  }).finally(() => { pendingIdentity = undefined; });
  return pendingIdentity;
}
export function useStudentClassroom(sessionId: string) {
  const [actor, setActor] = useState<ClassroomActor>();
  const [snapshot, setSnapshot] = useState<ClassroomSnapshot>();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const id = useRef(sessionId); id.current = sessionId;
  const merge = useCallback((next: ClassroomSnapshot) => {
    if (next.session.id !== id.current) return;
    setSnapshot(current => !current || current.session.id !== next.session.id || next.runtimeVersion >= current.runtimeVersion ? next : current);
    setError("");
  }, []);
  useEffect(() => { setSnapshot(undefined); setConnected(false); setError(""); }, [sessionId]);
  useEffect(() => {
    let active = true;
    void identity().then(value => {
      if (!value.actor.roles.some(role => role === "student" || role === "teacher")) throw new Error("当前身份没有课堂访问权限");
      if (active) setActor(value.actor);
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!actor) return;
    let active = true;
    const refresh = () => void api.getClassroomSnapshot(sessionId).then(value => { if (active) merge(value); }).catch(reason => { if (active) setError(reason.message); });
    refresh();
    const timer = connected ? undefined : window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [actor, sessionId, connected, merge]);
  useEffect(() => {
    if (!actor) return;
    return api.subscribeClassroomSnapshot(sessionId, merge, setConnected);
  }, [actor, sessionId, merge]);
  useEffect(() => {
    if (!actor?.roles.includes("student")) return;
    let active = true;
    const beat = () => { if (active) void api.heartbeatClassroomPresence(sessionId).catch(() => undefined); };
    const first = window.setTimeout(beat, 0), timer = window.setInterval(beat, 15000);
    const leave = () => {
      const queued = navigator.sendBeacon(`/api/class-sessions/${sessionId}/presence/leave`, new Blob(["{}"], {type:"application/json"}));
      if (!queued) void api.leaveClassroomPresence(sessionId).catch(() => undefined);
    };
    const show = () => beat();
    window.addEventListener("pagehide", leave); window.addEventListener("pageshow", show);
    return () => { active = false; clearTimeout(first); clearInterval(timer); window.removeEventListener("pagehide", leave); window.removeEventListener("pageshow", show); leave(); };
  }, [actor, sessionId]);
  return { actor, snapshot, connected, error };
}
