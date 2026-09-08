import { useState } from "react";
import type { ClassroomParticipationView } from "@edu/contracts";

export function ClassroomGroups({ view, busy, mutate }: { view: ClassroomParticipationView; busy: boolean; mutate: (path: string, body: unknown) => Promise<boolean> }) {
  const [size, setSize] = useState(4); const [actorId, setActorId] = useState(""); const [group, setGroup] = useState("");
  const disabled = busy || !view.isLive || Boolean(view.active);
  return <section className="participation-card" aria-label="学生分组管理"><h3>学生分组</h3>
    <p>讨论后仍由每位学生各自提交；分组用于组织讨论和查看参与情况。</p>
    {view.active && <p className="participation-hint">请先“收起活动”再调整分组，避免改变本题统计口径。</p>}
    <form className="participation-join" onSubmit={e => { e.preventDefault(); void mutate("/groups", { action: "auto", size }); }}>
      <label>每组目标人数<input type="number" min={2} max={10} required value={size} onChange={e => setSize(Number(e.target.value))} /></label><button disabled={disabled}>随机分组</button><small>对当前在线学生均衡分组，会替换现有分组；晚加入者显示为未分组，可手动安排。</small>
    </form>
    <form className="participation-join" onSubmit={e => { e.preventDefault(); void mutate("/groups", { action: "assign", actorId, group }); }}>
      <label>调整学生<select aria-label="调整学生" required value={actorId} onChange={e => setActorId(e.target.value)}><option value="">选择学生</option>{view.roster?.map(m => <option key={m.actorId} value={m.actorId}>{m.displayName} · {m.group || "未分组"}</option>)}</select></label>
      <label>组名<input value={group} maxLength={30} placeholder="例如 第01组；留空移出分组" onChange={e => setGroup(e.target.value)} list="classroom-group-names" /></label><datalist id="classroom-group-names">{[...new Set(view.roster?.map(m => m.group).filter(Boolean))].map(g => <option key={g} value={g} />)}</datalist><button disabled={disabled || !actorId}>保存分组</button>
    </form>
    <div className="exercise-group-list">{view.groupResults?.map(g => <article key={g.group}><strong>{g.group} · {g.members}人</strong><p>{view.roster?.filter(m => (m.group || "未分组") === g.group).map(m => m.displayName).join("、")}</p></article>)}</div>
  </section>;
}
