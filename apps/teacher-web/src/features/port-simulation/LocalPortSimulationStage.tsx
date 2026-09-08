import type {
  PortSimulationChallengeId,
  PortSimulationCommand,
  PortSimulationRole
} from "@edu/contracts";
import {
  PORT_SIMULATION_CHALLENGES,
  PORT_SIMULATION_ROLE_LABELS,
  advancePortSimulation,
  applyPortSimulationCommand,
  calculatePortSimulationScore,
  completePortSimulation,
  createInitialPortSimulationState,
  getPortSimulationChallenge,
  getPortSimulationScenarioForChallenge,
  pausePortSimulation,
  resumePortSimulation,
  setPortSimulationSpeed,
  startPortSimulation,
  type PortSimulationEngineState
} from "@edu/port-simulation-core";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  HardDrive,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  UserRoundCog
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCAL_PORT_SIMULATION_APP_VERSION,
  createLocalPortSimulationAttemptSummary,
  createLocalPortSimulationSnapshot,
  loadLocalPortSimulationHistory,
  loadLocalPortSimulationRun,
  saveLocalPortSimulationHistory,
  saveLocalPortSimulationRun,
  type LocalPortSimulationAttemptSummary,
  type LocalPortSimulationRunSave
} from "./local-port-simulation";
import { PortSimulationWorkspace } from "./PortSimulationWorkspace";
import { IndexedSimulationStorage, restoreCloudRecords } from "../../campus/sync";
import { getRecords } from "../../campus/storage";

export interface LocalPortSimulationStageProps {
  actorId: string;
  actorDisplayName: string;
  storageScope: string;
  initialChallengeId?: PortSimulationChallengeId;
  challengeLocked?: boolean;
  sourceLabel?: string;
}

function createRunId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `local-${crypto.randomUUID()}`
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `local-command-${crypto.randomUUID()}`
    : `local-command-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextAttemptNumber(
  history: readonly LocalPortSimulationAttemptSummary[],
  challengeId: PortSimulationChallengeId
) {
  return (
    Math.max(
      0,
      ...history
        .filter((item) => item.challengeId === challengeId)
        .map((item) => item.attemptNumber)
    ) + 1
  );
}

function loadOrCreateRun(
  storage: Storage | null,
  storageScope: string,
  challengeId: PortSimulationChallengeId,
  history: readonly LocalPortSimulationAttemptSummary[]
): LocalPortSimulationRunSave {
  const challenge = getPortSimulationChallenge(challengeId);
  const scenario = getPortSimulationScenarioForChallenge(challengeId);
  const restored = storage
    ? loadLocalPortSimulationRun(
        storage,
        storageScope,
        challengeId,
        challenge.version,
        scenario.id,
        scenario.version
      )
    : null;
  if (restored) {
    return restored.state.status === "running"
      ? {
          ...restored,
          savedAt: new Date().toISOString(),
          state: pausePortSimulation(
            restored.state,
            "页面重新打开，本地时钟已安全暂停。",
            "student"
          )
        }
      : restored;
  }
  return {
    schemaVersion: "1.0",
    appVersion: "1.0.0",
    runId: createRunId(),
    challengeId,
    challengeVersion: challenge.version,
    attemptNumber: nextAttemptNumber(history, challengeId),
    selectedRole: "marine_control",
    savedAt: new Date().toISOString(),
    state: createInitialPortSimulationState(scenario)
  };
}

function advanceRunToNow(
  state: PortSimulationEngineState,
  scenario: ReturnType<typeof getPortSimulationScenarioForChallenge>,
  now = Date.now()
) {
  if (state.status !== "running" || !state.clock.wallClockAnchor) return state;
  const elapsedSeconds = Math.max(
    0,
    (now - new Date(state.clock.wallClockAnchor).getTime()) / 1_000
  );
  const next = advancePortSimulation(
    state,
    scenario,
    state.clock.simMinute + elapsedSeconds * state.clock.timeScale
  );
  if (next.status === "running") {
    next.clock.wallClockAnchor = new Date(now).toISOString();
  }
  return next;
}

function roleResponsibility(role: PortSimulationRole) {
  if (role === "marine_control") return "进出港顺序、引航拖轮与航道";
  if (role === "berth_operations") return "泊位、岸桥轨位、伸距与开工";
  if (role === "horizontal_transport") return "AGV分配、优先级与充电";
  return "堆场批次、闸口通道与集卡压力";
}

export function LocalPortSimulationStage(props:LocalPortSimulationStageProps) {
  const [storage,setStorage]=useState<IndexedSimulationStorage>();
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    void (async()=>{
      if(!(await getRecords(props.actorId)).length && !import.meta.env.DEV) {
        try {await restoreCloudRecords(props.actorId);} catch { /* A new offline run remains available. */ }
      }
      const next=await IndexedSimulationStorage.create(props.actorId,props.storageScope);
      if(active)setStorage(next);
    })().catch(reason=>{if(active)setError((reason as Error).message);});
    return()=>{active=false;};
  },[props.actorId,props.storageScope]);
  if(error)return <section className="port-local-auth-state" role="alert"><h1>本机存档暂不可用</h1><p>{error}</p><p>请检查浏览器存储空间和隐私模式后重新打开。</p></section>;
  if(!storage)return <section className="port-local-auth-state" role="status">正在读取本机存档…</section>;
  return <LocalPortSimulationRunner {...props} storage={storage}/>;
}

export function LocalPortSimulationRunner({
  actorId,
  actorDisplayName,
  storageScope,
  initialChallengeId = "joint-watch",
  challengeLocked = false,
  sourceLabel = "登录身份已确认",
  storage
}: LocalPortSimulationStageProps & {storage:IndexedSimulationStorage|null}) {
  const [history, setHistory] = useState<LocalPortSimulationAttemptSummary[]>(
    () => (storage ? loadLocalPortSimulationHistory(storage, storageScope) : [])
  );
  const [run, setRun] = useState<LocalPortSimulationRunSave>(() =>
    loadOrCreateRun(
      storage,
      storageScope,
      initialChallengeId,
      storage ? loadLocalPortSimulationHistory(storage, storageScope) : []
    )
  );
  const [notice, setNotice] = useState("本地运行器已就绪，开始后不需要实时连接服务器。");
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(run.savedAt);
  const runRef = useRef(run);
  const recordedRuns = useRef(new Set(history.map((item) => item.id)));
  runRef.current = run;
  const challenge = getPortSimulationChallenge(run.challengeId);
  const scenario = useMemo(
    () => getPortSimulationScenarioForChallenge(run.challengeId),
    [run.challengeId]
  );
  const scorecard = useMemo(
    () => calculatePortSimulationScore({ state: run.state }),
    [run.state]
  );
  const previousBestScore = useMemo(() => {
    const scores = history
      .filter((item) => item.challengeId === run.challengeId)
      .map((item) => item.totalScore);
    return scores.length ? Math.max(...scores) : null;
  }, [history, run.challengeId]);
  const snapshot = useMemo(
    () =>
      createLocalPortSimulationSnapshot({
        state: run.state,
        actorId,
        actorDisplayName,
        storageScope,
        runId: run.runId,
        challengeId: run.challengeId,
        challengeVersion: run.challengeVersion,
        attemptNumber: run.attemptNumber,
        previousBestScore
      }),
    [
      actorDisplayName,
      actorId,
      previousBestScore,
      run,
      storageScope
    ]
  );

  useEffect(() => {
    if (run.state.status !== "running") return undefined;
    const timer = window.setInterval(() => {
      setRun((current) => ({
        ...current,
        state: advanceRunToNow(current.state, scenario),
        savedAt: new Date().toISOString()
      }));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [run.state.status, scenario]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      setRun((current) => {
        if (current.state.status !== "running") return current;
        const advanced = advanceRunToNow(current.state, scenario);
        return {
          ...current,
          savedAt: new Date().toISOString(),
          state: pausePortSimulation(
            advanced,
            "页面离开，本地运行已自动暂停。",
            "student"
          )
        };
      });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [scenario]);

  useEffect(() => {
    if (!storage) return undefined;
    const timer = window.setTimeout(() => {
      try {
        const save = { ...run, savedAt: new Date().toISOString() };
        saveLocalPortSimulationRun(storage, storageScope, save);
        void storage.flush().then(()=>setLastSavedAt(save.savedAt)).catch(()=>setError("浏览器未能写入本地存档；请立即导出当前实验。"));
      } catch {
        setError("浏览器未能写入本地存档；本页关闭后进度可能丢失。");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [run, storage, storageScope]);

  useEffect(() => {
    if (!storage) return undefined;
    const saveBeforeLeaving = () => {
      try {
        saveLocalPortSimulationRun(storage, storageScope, {
          ...runRef.current,
          savedAt: new Date().toISOString()
        });
      } catch {
        // The delayed save effect already surfaces storage failures while the
        // page is visible. pagehide must remain synchronous and best-effort.
      }
    };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => window.removeEventListener("pagehide", saveBeforeLeaving);
  }, [storage, storageScope]);

  useEffect(() => {
    if (run.state.status !== "completed" || recordedRuns.current.has(run.runId)) {
      return;
    }
    recordedRuns.current.add(run.runId);
    const item = createLocalPortSimulationAttemptSummary(
      run,
      run.state,
      scorecard,
      new Date().toISOString()
    );
    setHistory((current) => [...current, item].slice(-30));
  }, [run, scorecard]);

  useEffect(() => {
    if (!storage) return;
    try {
      saveLocalPortSimulationHistory(storage, storageScope, history);
    } catch {
      setError("个人复盘历史未能写入浏览器本地存储。");
    }
  }, [history, storage, storageScope]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const switchChallenge = (challengeId: PortSimulationChallengeId) => {
    if (challengeId === run.challengeId) return;
    const next = loadOrCreateRun(storage, storageScope, challengeId, history);
    setRun(next);
    setNotice(
      next.state.status === "lobby"
        ? `已切换到“${getPortSimulationChallenge(challengeId).title}”。`
        : `已恢复“${getPortSimulationChallenge(challengeId).title}”的本机进度。`
    );
    setError("");
  };

  const startOrResume = () => {
    setRun((current) => ({
      ...current,
      savedAt: new Date().toISOString(),
      state:
        current.state.status === "paused"
          ? resumePortSimulation(
              current.state,
              new Date().toISOString(),
              "student"
            )
          : startPortSimulation(
              current.state,
              new Date().toISOString(),
              "student"
            )
    }));
    setNotice("本地仿真时钟已启动；请依次切换四个岗位完成全流程。" );
  };

  const pause = () => {
    setRun((current) => {
      const advanced = advanceRunToNow(current.state, scenario);
      return {
        ...current,
        savedAt: new Date().toISOString(),
        state: pausePortSimulation(advanced, "学生已暂停本地时钟。", "student")
      };
    });
    setNotice("本地时钟已暂停，进度已排队写入本机存档。" );
  };

  const changeSpeed = (timeScale: 0.5 | 1 | 2) => {
    setRun((current) => {
      const advanced = advanceRunToNow(current.state, scenario);
      return {
        ...current,
        savedAt: new Date().toISOString(),
        state: setPortSimulationSpeed(
          advanced,
          timeScale,
          new Date().toISOString(),
          "student"
        )
      };
    });
    setNotice(`本地速度已调整为 ${timeScale}×。`);
  };

  const finish = () => {
    setRun((current) => ({
      ...current,
      savedAt: new Date().toISOString(),
      state: completePortSimulation(
        advanceRunToNow(current.state, scenario),
        "student"
      )
    }));
    setNotice("本轮个人运行已结束，成绩和事件证据已写入本地复盘。" );
  };

  const startNewAttempt = () => {
    const next: LocalPortSimulationRunSave = {
      schemaVersion: "1.0",
      appVersion: "1.0.0",
      runId: createRunId(),
      challengeId: run.challengeId,
      challengeVersion: challenge.version,
      attemptNumber: Math.max(
        run.attemptNumber + 1,
        nextAttemptNumber(history, run.challengeId)
      ),
      selectedRole: "marine_control",
      savedAt: new Date().toISOString(),
      state: createInitialPortSimulationState(scenario)
    };
    setRun(next);
    setNotice("新一轮已恢复相同初始条件，个人历史成绩仍然保留。" );
    setError("");
  };

  const sendCommand = (command: PortSimulationCommand) => {
    const current = runRef.current;
    const advanced = advanceRunToNow(current.state, scenario);
    const outcome = applyPortSimulationCommand(
      advanced,
      scenario,
      current.selectedRole,
      command,
      {
        requestId: createRequestId(),
        actor: "student"
      }
    );
    setNotice(outcome.result.message);
    setRun({
      ...current,
      savedAt: new Date().toISOString(),
      state: outcome.state
    });
  };

  const exportReview = () => {
    const documentValue = {
      schemaVersion: "1.0",
      appVersion: LOCAL_PORT_SIMULATION_APP_VERSION,
      exportedAt: new Date().toISOString(),
      challenge: {
        id: challenge.id,
        version: challenge.version,
        title: challenge.title
      },
      attemptNumber: run.attemptNumber,
      scorecard,
      state: run.state
    };
    const blob = new Blob([JSON.stringify(documentValue, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `port-simulation-${challenge.id}-attempt-${run.attemptNumber}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("复盘文件已导出；文件不包含姓名或登录标识。" );
  };

  const recentHistory = history
    .filter((item) => item.challengeId === run.challengeId)
    .slice(-5)
    .reverse();

  return (
    <section className="port-local-simulation" aria-label="港口仿真本地单机运行器">
      <header className="port-local-simulation__hero">
        <div>
          <span>PORT SIMULATION · V1.0 LOCAL SOLO</span>
          <h1>一个人接管四个岗位，完成港口全流程</h1>
          <p>
            登录只用于确认使用者；开始后，时钟、命令、计分和存档都在当前浏览器运行。
          </p>
        </div>
        <dl>
          <div><dt><ShieldCheck aria-hidden="true" /> 身份</dt><dd>{actorDisplayName}</dd></div>
          <div><dt><HardDrive aria-hidden="true" /> 存档</dt><dd>{storage ? "本机自动保存" : "当前会话内存"}</dd></div>
          <div><dt><Clock3 aria-hidden="true" /> 最近保存</dt><dd>{new Date(lastSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</dd></div>
        </dl>
      </header>

      {(error || notice) ? (
        <div className={error ? "port-simulation-notice port-simulation-notice--error" : "port-simulation-notice"} role={error ? "alert" : "status"}>
          {error ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{error || notice}</span>
        </div>
      ) : null}

      <section className="port-local-simulation__controls" aria-label="本地运行控制">
        <label>
          挑战案例
          <select
            value={run.challengeId}
            disabled={challengeLocked || run.state.status === "running" || run.state.status === "paused"}
            onChange={(event) => switchChallenge(event.target.value as PortSimulationChallengeId)}
          >
            {PORT_SIMULATION_CHALLENGES.map((item) => (
              <option key={item.id} value={item.id}>{item.difficulty} · {item.title}</option>
            ))}
          </select>
        </label>
        <div className="port-local-simulation__run-buttons">
          {run.state.status === "lobby" || run.state.status === "ready" || run.state.status === "paused" ? (
            <button type="button" onClick={startOrResume}><Play aria-hidden="true" /> {run.state.status === "paused" ? "继续" : "开始"}</button>
          ) : run.state.status === "running" ? (
            <button type="button" onClick={pause}><Pause aria-hidden="true" /> 暂停</button>
          ) : null}
          {([0.5, 1, 2] as const).map((speed) => (
            <button type="button" key={speed} disabled={run.state.clock.timeScale === speed || run.state.status === "completed"} onClick={() => changeSpeed(speed)}>{speed}×</button>
          ))}
          {(run.state.status === "running" || run.state.status === "paused") ? (
            <button type="button" className="port-local-simulation__finish" onClick={finish}>结束并复盘</button>
          ) : null}
          {run.state.status === "completed" ? (
            <button type="button" onClick={startNewAttempt}><RotateCcw aria-hidden="true" /> 开始新一轮</button>
          ) : null}
          <button type="button" onClick={exportReview}><Download aria-hidden="true" /> 导出复盘</button>
        </div>
        <p>{sourceLabel} · 仿真在本机运行，存档检查点定期同步。</p>
      </section>

      <section className="port-local-simulation__roles" aria-label="四岗位切换">
        <header>
          <UserRoundCog aria-hidden="true" />
          <div><span>全流程岗位轮换</span><strong>任何时刻都可以切换岗位，已下达命令会继续执行</strong></div>
        </header>
        <div>
          {snapshot.roleSeats.map((seat) => {
            const metric = run.state.metrics.roleResponseMinutes.find((item) => item.role === seat.role);
            return (
              <button
                type="button"
                key={seat.role}
                aria-pressed={run.selectedRole === seat.role}
                onClick={() => setRun((current) => ({ ...current, selectedRole: seat.role, savedAt: new Date().toISOString() }))}
              >
                <span>{PORT_SIMULATION_ROLE_LABELS[seat.role]}</span>
                <small>{roleResponsibility(seat.role)}</small>
                <em>{(metric?.decisions ?? 0) > 0 ? `已完成 ${metric?.decisions} 次有效决策` : "尚未完成有效决策"}</em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="port-local-simulation__brief" aria-label="当前挑战说明">
        <div>
          <span>{challenge.difficulty}挑战 · 第{run.attemptNumber}轮</span>
          <h2>{challenge.title}</h2>
          <p>{challenge.publicBriefing}</p>
        </div>
        <ul>{challenge.missions.map((mission) => <li key={mission.id}><strong>{mission.title}</strong><span>{mission.description}</span></li>)}</ul>
        <aside>
          <span>个人记录</span>
          <strong>{previousBestScore === null ? "尚无完成记录" : `历史最佳 ${previousBestScore} 分`}</strong>
          <small>本地成绩用于诊断与自我比较，不作为服务器认证成绩。</small>
        </aside>
      </section>

      <PortSimulationWorkspace
        snapshot={snapshot}
        role={run.selectedRole}
        executionMode="local_solo"
        commandBusy={run.state.status !== "running"}
        connectionLabel="本机确定性引擎 · 无实时网络依赖"
        onCommand={sendCommand}
      />

      <section className="port-local-simulation__history" aria-label="个人复盘历史">
        <header><HardDrive aria-hidden="true" /><div><span>只保存在当前浏览器</span><h2>最近五轮个人记录</h2></div></header>
        {recentHistory.length ? (
          <div role="table" aria-label="个人最近成绩">
            <div role="row"><span role="columnheader">轮次</span><span role="columnheader">成绩</span><span role="columnheader">完成批次</span><span role="columnheader">安全拦截</span><span role="columnheader">结束时间</span></div>
            {recentHistory.map((item) => (
              <div role="row" key={item.id}>
                <span role="cell">第{item.attemptNumber}轮</span>
                <strong role="cell">{item.totalScore}</strong>
                <span role="cell">{item.completedTasks}/{item.totalTasks}</span>
                <span role="cell">{item.safetyInterlocks}</span>
                <time role="cell" dateTime={item.completedAt}>{new Date(item.completedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
              </div>
            ))}
          </div>
        ) : <p>完成并结束第一轮后，这里会出现个人复盘记录。</p>}
      </section>
    </section>
  );
}
