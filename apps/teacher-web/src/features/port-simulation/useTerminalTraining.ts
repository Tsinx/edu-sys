import { useEffect, useRef, useState } from "react";
import {
  applyTrainingCommand, createTerminalTraining, createNormalTrainingSetup, restoreTraining, restoreTerminal,
  serializeTraining, serializeTerminal, suspendRestoredTraining, trainingScore, trainingStorageKey,
  type TerminalTraining, type TerminalTrainingMode, type TerminalScenario, type TerminalState,
  type TerminalSetup, type TrainingCommand
} from "@edu/port-simulation-core";

export type LabStorage = Pick<Storage, "getItem" | "setItem"> & { flush?: () => Promise<unknown> };
type Run = TerminalTraining | TerminalState;
export interface TrainingArchive { key: string; mode: string; status: string; minute: number; score?: number }
const isTraining = (run: Run): run is TerminalTraining => "script" in run;
const physical = (run: Run) => isTraining(run) ? run.simulation : run;
const serialize = (run: Run) => isTraining(run) ? serializeTraining(run) : serializeTerminal(run);
function readRun(raw: string): Run {
  return JSON.parse(raw)?.schema === "terminal-training/1.0" ? suspendRestoredTraining(restoreTraining(raw)) : restoreTerminal(raw);
}
export function useTerminalTraining(storage: LabStorage | null | undefined, scope: string, scenario: TerminalScenario, initialMode: TerminalTrainingMode, modeLocked = false) {
  const selectionKey = `edu-terminal-training:selection:${scope}:${scenario}`;
  const [initial] = useState(() => {
    try {
      const savedMode = modeLocked ? initialMode : storage?.getItem(selectionKey);
      const mode = savedMode === "practice" || savedMode === "battle" ? savedMode : initialMode;
      const raw = storage?.getItem(trainingStorageKey(scope, scenario, mode));
      return { run: raw ? readRun(raw) : createTerminalTraining(mode, createNormalTrainingSetup(scenario)), issue: "", restored: Boolean(raw) };
    } catch { return { run: createTerminalTraining(initialMode, createNormalTrainingSetup(scenario)), issue: "原存档无法读取，已保留原记录。可导入复盘或开始新试验。", restored: false }; }
  });
  const [run, render] = useState<Run>(initial.run); const ref = useRef(run);
  const [speedChoice, setSpeedChoice] = useState(120); const speedRef = useRef(120);
  const [saveStatus, setSaveStatus] = useState(storage ? "正在保存" : "临时实验");
  const [preserveOriginal, setPreserveOriginal] = useState(Boolean(initial.issue)); const preserveRef = useRef(preserveOriginal);
  const [runtimeError, setRuntimeError] = useState(initial.issue);
  const wall = useRef({ at: 0, fraction: 0 }); const archiveSequence = useRef(0);
  const modeOf = (r: Run) => isTraining(r) ? r.mode : initialMode;
  const keyOf = (r: Run) => trainingStorageKey(scope, physical(r).setup.scenario, modeOf(r));
  const key = keyOf(run);
  const readArchives = (k: string): TrainingArchive[] => {
    let history: TrainingArchive[] = [];
    try { const v = JSON.parse(storage?.getItem(`${k}:history`) ?? "[]"); if (Array.isArray(v)) history = v; } catch { /* Current record remains readable even if its history index is damaged. */ }
    const oldKey = `edu-terminal-lab:v2:${scope}:${scenario}`;
    try {
      const raw = storage?.getItem(oldKey);
      if (raw && !history.some(entry => entry.key === oldKey)) history = [{ key: oldKey, mode: "legacy", status: "旧版复盘", minute: restoreTerminal(raw).minute }, ...history];
    } catch { /* Never overwrite an unreadable old file. */ }
    return history;
  };
  const [archives, setArchives] = useState(() => readArchives(key));
  const commit = (next: Run) => { ref.current = next; render(next); };
  const persist = (next: Run) => {
    if (!storage || preserveRef.current) return;
    try {
      // Store a review-safe snapshot even if the tab disappears before pagehide or an IDB write finishes.
      const snapshot = isTraining(next) ? suspendRestoredTraining(next) : next;
      if (!modeLocked && isTraining(next)) storage.setItem(selectionKey, next.mode);
      storage.setItem(keyOf(next), serialize(snapshot)); setSaveStatus("正在保存");
      Promise.resolve(storage.flush?.()).then(() => setSaveStatus("已保存在本机"), () => setSaveStatus("保存失败，请导出"));
    } catch { setSaveStatus("保存失败，请导出"); }
  };
  const advance = () => {
    const now = Date.now(); const current = ref.current;
    if (!wall.current.at) wall.current.at = now;
    const delta = Math.max(0, now - wall.current.at); wall.current.at = now;
    if (!isTraining(current) || current.status !== "running") { wall.current.fraction = 0; return; }
    wall.current.fraction += delta / 1000 * (current.mode === "battle" ? 60 : speedRef.current);
    const seconds = Math.min(28800, Math.floor(wall.current.fraction)); if (!seconds) return;
    wall.current.fraction -= seconds;
    const next = applyTrainingCommand(current, { kind: "tick", seconds });
    if (next.status !== "running") wall.current.fraction = 0;
    commit(next);
  };
  useEffect(() => { persist(run); }, [run, preserveOriginal]);
  useEffect(() => {
    wall.current.at = Date.now();
    const tick = () => { try { advance(); } catch (e) { setRuntimeError((e as Error).message); } };
    const timer = window.setInterval(tick, 100);
    const visibility = () => {
      tick(); const current = ref.current;
      if (document.hidden && isTraining(current) && current.mode === "practice") commit(applyTrainingCommand(current, { kind: "pause" }));
      persist(ref.current);
    };
    const leave = () => {
      tick(); const current = ref.current;
      if (isTraining(current)) commit(suspendRestoredTraining(current));
      persist(ref.current);
    };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", leave);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", leave); advance(); persist(ref.current); };
  }, [storage, scope]);
  const send = (command: TrainingCommand) => {
    advance(); const current = ref.current;
    if (!isTraining(current)) throw new Error("旧版存档按原规则复盘；点击新试验进入正常流程实训。");
    const next = applyTrainingCommand(current, command); commit(next); wall.current.at = Date.now();
    return next;
  };
  const archive = () => {
    advance(); const current = ref.current;
    if (!storage || !current.commands.length || isTraining(current) && current.status === "ready") return;
    const snapshot = isTraining(current) ? suspendRestoredTraining(current) : current;
    const k = keyOf(snapshot); const history = readArchives(k);
    const record: TrainingArchive = { key: `${k}:attempt:${Date.now()}-${archiveSequence.current++}`, mode: isTraining(snapshot) ? snapshot.mode : "legacy", status: isTraining(snapshot) ? snapshot.status : "旧版复盘", minute: physical(snapshot).minute, ...(isTraining(snapshot) ? { score: trainingScore(snapshot).total } : {}) };
    storage.setItem(record.key, serialize(snapshot)); storage.setItem(`${k}:history`, JSON.stringify([...history, record])); setArchives([...history, record]);
  };
  const reset = (setup: TerminalSetup, mode = modeOf(ref.current)) => {
    archive(); preserveRef.current = false; setPreserveOriginal(false);
    commit(createTerminalTraining(mode, setup)); wall.current = { at: Date.now(), fraction: 0 }; setArchives(readArchives(trainingStorageKey(scope, setup.scenario, mode)));
  };
  const load = (raw: string, lockedScenario?: TerminalScenario, lockedMode?: TerminalTrainingMode) => {
    const next = readRun(raw);
    if (lockedScenario && physical(next).setup.scenario !== lockedScenario) throw new Error("导入工况与教师发布的任务不一致。");
    if (lockedMode && isTraining(next) && next.mode !== lockedMode) throw new Error("导入场次规则与教师选择不一致。");
    archive(); preserveRef.current = false; setPreserveOriginal(false); commit(next); setArchives(readArchives(keyOf(next)));
  };
  const session = isTraining(run) ? run : null;
  return {
    state: physical(run), session, key, archives, saveStatus, preserveOriginal, runtimeError, restored: initial.restored,
    speed: session?.mode === "battle" ? 60 : speedChoice, playing: session?.status === "running",
    setSpeed: (speed: number) => { if (session?.mode === "battle") return; advance(); speedRef.current = speed; setSpeedChoice(speed); },
    setPlaying: (playing: boolean) => send({ kind: playing ? session?.status === "ready" ? "start" : "resume" : "pause" }),
    send, reset, load,
    setState: (next: TerminalState) => reset(next.setup),
    chooseTrainingMode: (mode: TerminalTrainingMode) => {
      if (session?.status !== "ready") return;
      const saved = storage?.getItem(trainingStorageKey(scope, physical(ref.current).setup.scenario, mode));
      if (saved) load(saved); else reset(physical(ref.current).setup, mode);
    },
    exportRaw: () => { advance(); return serialize(ref.current); },
    openArchive: (record: TrainingArchive) => { const raw = storage?.getItem(record.key); if (raw) load(raw); }
  };
}
