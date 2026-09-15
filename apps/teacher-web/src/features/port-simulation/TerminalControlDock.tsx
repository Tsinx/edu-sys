import { Anchor, ArrowRight, Boxes, Check, Navigation, Pause, Play, Truck } from "lucide-react";
import {
  TERMINAL_SCENARIOS, TERMINAL_TRANSIT_SECONDS, terminalChannelVessel, terminalCommandIssue,
  terminalLiveRates, terminalMetrics, terminalVesselProgress, terminalVesselStage,
  type TerminalCommand, type TerminalOperation, type TerminalState
} from "@edu/port-simulation-core";

interface Props { state: TerminalState; playing: boolean; disabled: boolean; onCommand: (command: TerminalCommand) => void; onFocus: (step: number, entity?: string) => void }
const fmt = (n: number) => n.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
/** Controls issue real orders. Labels, interlocks and queue feedback are derived from the engine. */
export function TerminalControlDock({ state, playing, disabled, onCommand, onFocus }: Props) {
  const occupied = terminalChannelVessel(state); const rates = terminalLiveRates(state); const metrics = terminalMetrics(state.setup, state.minute, state.repairWork);
  if (state.engine === "legacy") return <div className="terminal-control-dock terminal-help">已保留旧版实验的结果与复盘。点击“新试验”，用当前方案进入实时操作。</div>;
  return <div className="terminal-control-dock" aria-label="实时作业控制台">
    <div className="terminal-control-title"><span><Navigation size={15} />实时作业台 <small>{playing ? "指令立即生效" : "可预置指令 · 启动时钟后运行"}</small></span><b>{occupied === undefined ? "航道空闲" : `船 ${occupied ? "B" : "A"} 占用航道`}</b></div>
    <div className="terminal-vessel-controls">{([0, 1] as const).map(i => {
      const name = i ? "B" : "A"; const target = i ? "crane-b" : "crane-a";
      const admitted = state.operations.admittedAt[i] !== null; const progress = terminalVesselProgress(state, i);
      const secured = state.operations.secured[i]; const running = state.operations[target];
      const finished = state.unloaded[i] >= TERMINAL_SCENARIOS[state.setup.scenario].cargo[i] - 1e-7;
      const command: TerminalCommand = !admitted ? { kind: "harbor", vessel: i, action: "admit" }
        : !secured ? { kind: "harbor", vessel: i, action: "secure" } : { kind: "operate", target, running: !running };
      const label = !admitted ? `放行船 ${name}` : progress < 1 ? `船 ${name} 引航中` : !secured ? `确认 ${name} 船系泊` : finished ? `船 ${name} 已卸毕` : `${running ? "暂停" : "启动"} ${name} 泊位岸桥`;
      const issue = terminalCommandIssue(state, command);
      const eta = admitted && progress < 1 ? Math.ceil((TERMINAL_TRANSIT_SECONDS[i] - (Math.round(state.minute * 60) - state.operations.admittedAt[i]!)) / 60) : 0;
      const guidance = eta ? `预计 ${eta} 仿真分钟后抵达泊位` : issue || (!secured ? "系泊完成后可启动岸桥" : `岸桥 ${state.setup.dispatch.berthCranes[i]} 台 · 当前 ${fmt(rates[i])} 箱/时`);
      return <div className="terminal-vessel-control" key={i} data-vessel={name}>
        <button className="terminal-object-name" type="button" onClick={() => onFocus(!admitted || progress < 1 ? 0 : !secured ? 1 : 2, `vessel-${name.toLowerCase()}`)}><Anchor size={16} /><strong>教学船 {name}</strong><small>{terminalVesselStage(state, i)}</small><ArrowRight size={13} /></button>
        <div className="terminal-vessel-order"><div><span>{fmt(state.unloaded[i])} <small>/ {TERMINAL_SCENARIOS[state.setup.scenario].cargo[i]} 箱已卸</small></span><p>{guidance}</p></div><button type="button" className={running ? "" : "terminal-primary"} disabled={disabled || finished || Boolean(issue)} onClick={() => onCommand(command)}>{running ? <Pause size={13} /> : progress < 1 && admitted ? <Navigation size={13} /> : <Play size={13} />}{label}</button></div>
        <div className="terminal-order-progress"><i style={{ width: `${(secured ? state.unloaded[i] / TERMINAL_SCENARIOS[state.setup.scenario].cargo[i] : progress) * 100}%` }} /></div>
      </div>;
    })}</div>
    <div className="terminal-chain-controls">{([
      { target: "transport", label: "水平运输", icon: Truck, step: 3, amount: state.queues[0], limit: 60, queue: "岸侧待运", rate: rates[2], available: `${metrics.activeVehicles} 台出勤` },
      { target: "yard", label: "堆场接箱", icon: Boxes, step: 4, amount: state.queues[1], limit: 40, queue: "运输交接", rate: rates[3], available: `${metrics.activeYard} 台场桥` },
      { target: "gate", label: "闸口交付", icon: Check, step: 5, amount: state.queues[2], limit: metrics.storage, queue: "堆场待提", rate: rates[4], available: `${metrics.activeGates} 道开放` }
    ] as const).map(item => {
      const running = state.operations[item.target]; const Icon = item.icon;
      const command = { kind: "operate" as const, target: item.target as TerminalOperation, running: !running };
      const issue = terminalCommandIssue(state, command);
      return <div className={`terminal-chain-control ${running ? "is-online" : ""}`} key={item.target} data-operation={item.target}>
        <button className="terminal-object-name" type="button" onClick={() => onFocus(item.step)}><Icon size={14} /><strong>{item.label}</strong><i className={running && item.rate ? "is-working" : ""} /></button>
        <div className="terminal-chain-state"><strong>{fmt(item.amount)}<small> / {item.limit} 箱</small></strong><span>{item.queue}</span></div>
        <div className="terminal-buffer-meter"><i style={{ width: `${Math.min(100, item.amount / Math.max(1, item.limit) * 100)}%` }} /></div>
        <p>{issue || (running ? item.rate ? `${item.available} · ${fmt(item.rate)} 箱/时` : "等待上游来箱或可用作业能力" : "班组待命，等待开工指令")}</p>
        <button type="button" aria-pressed={running} disabled={disabled || Boolean(issue)} onClick={() => onCommand(command)}>{running ? <Pause size={13} /> : <Play size={13} />}{running ? "暂停" : "启动"}{item.label}</button>
      </div>;
    })}</div>
    <p className="terminal-control-note">开工后持续作业；暂停某一环节会改变上下游队列。点击船舶、设施或作业链路可定位现场。</p>
  </div>;
}
