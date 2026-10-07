import {ClassroomActivityPlan} from "../activities/ActivityWorkspace";
import type { ClassroomActor, ClassroomParticipationCreate, ClassroomParticipationView } from "@edu/contracts";
import { useEffect, useRef, useState } from "react";
import { Check, Radio, UsersRound, X } from "lucide-react";
import { useParticipation } from "./useParticipation";
import "./participation.css";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { ClassroomGroups } from "./ClassroomGroups";
import { activityRequestId } from "./participation-id";

const statusLabel = { open: "进行中", closed: "已结束", revealed: "已公布" };
function QuestionResults({ active, locale }: { active: NonNullable<ClassroomParticipationView["active"]>; locale?: "zh-CN" | "en" }) {
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  if (!active.counts) return null;
  return <div className="participation-results" aria-label={t("答题统计", "Response statistics")}>
    <p>{active.responseCount} {t("人已提交", "responses submitted")}{active.mode === "multiple" ? t(" · 多选题按选项分别计数", " \u00b7 Options are counted separately") : ""}</p>
    {active.options.map(option => <div className="participation-result" key={option.id}>
      <span>{option.id} · {option.text}{active.correctOptionIds?.includes(option.id) && <Check size={16} aria-label={t("正确选项", "Correct option")} />}</span>
      <meter min={0} max={Math.max(1, active.responseCount ?? 0)} value={active.counts?.[option.id] ?? 0} />
      <b>{active.counts?.[option.id] ?? 0}</b>
    </div>)}
    {active.correctOptionIds?.length ? <p>{t("参考答案：", "Reference answer: ")}{active.correctOptionIds.join(locale === "en" ? ", " : "、")}</p> : <p>{t("本题为观点投票，无标准答案。", "Opinion poll: no standard answer.")}</p>}
    {active.explanation && <p className="participation-explanation">{active.explanation}</p>}
  </div>;
}

export function StudentParticipation({ sessionId, actor, locale }: { sessionId: string; actor: ClassroomActor; locale?: "zh-CN" | "en" }) {
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const { view, busy, error, connected, mutate } = useParticipation(sessionId);
  const [name, setName] = useState(actor.identitySource === "development" ? "" : actor.displayName);
  const [selected, setSelected] = useState<string[]>([]);
  const active = view?.active;
  useEffect(() => { setSelected(active?.ownAnswer?.optionIds ?? []); }, [active?.id, active?.ownAnswer?.submittedAt]);
  const preview = actor.roles.includes("teacher");
  const joining=useRef(false),root=useRef<HTMLElement>(null);
  useEffect(()=>{if(!preview&&actor.identitySource!=="development"&&view?.isLive&&!view.joined&&!joining.current){joining.current=true;void mutate('/join',{displayName:actor.displayName}).finally(()=>{joining.current=false;});}},[view?.isLive,view?.joined,preview,actor.actorId]);
  useEffect(()=>{if(active?.id){const details=root.current?.closest('details');if(details)details.open=true;}},[active?.id]);

  return <section ref={root} className="participation student-participation" aria-label={t("课堂活动", "Class activities")}>
    <header className="participation-heading"><div><span className="participation-eyebrow">CLASSROOM LIVE</span><h2><UsersRound size={20} />{t("课堂活动", "Class activities")}</h2></div>
      <span className="participation-connection"><Radio size={14} />{connected ? t("实时同步", "Live updates") : t("正在重连", "Reconnecting")}</span></header>
    {error && <p role="alert" className="participation-error">{error}</p>}
    {!view ? <p>{t("正在连接课堂活动…", "Connecting to class activities\u2026")}</p> : preview ? <p>{t("教师预览 · 学生可在这里加入、答题和回应点名。", "Teacher preview: students can join and answer here.")}</p> : <>
      {!view.isLive && <p role="status">{t("课堂已结束，活动记录已保留。", "Class ended. Activity records are saved.")}</p>}
      {!view.joined ? view.isLive && <form className="participation-join" onSubmit={event => { event.preventDefault(); void mutate("/join", { displayName: name }); }}>
        <label>{t("课堂账号", "Classroom name")}<input autoComplete="name" value={name} maxLength={40} required readOnly={actor.identitySource !== "development"} placeholder={t("填写老师能认出的姓名", "Enter a name your teacher recognizes")} onChange={event => setName(event.target.value)} /></label>
        <button className="participation-primary" disabled={busy || !name.trim()}>{t("加入活动", "Join activities")}</button>
        <small>{t("在当前浏览器加入后，刷新页面会保留提交记录。", "Your responses are kept when you refresh this browser.")}</small>
      </form> : <>
        <p className="participation-identity">{view.displayName}，{active ? t("请参与本次课堂活动", "please answer the current activity") : t("已就位，等待老师发起活动。", "ready. Waiting for the teacher.")}</p>
        {view.group && <p className="participation-tag">{t("我的小组：", "My group: ")}{view.group} · {t("讨论后各自提交", "Submit individually after discussion")}</p>}
        {active && <article className="participation-card" aria-live="polite">
          <span className="participation-tag">{active.kind === "roll_call" ? t("课堂点名", "Called to respond") : active.mode === "single" ? t("单选题", "Single choice") : t("多选题", "Multiple choice")} · {locale === "en" ? ({open:"Open",closed:"Closed",revealed:"Released"} as const)[active.status] : statusLabel[active.status]}</span>
          {active.kind === "roll_call" ? <>
            <h3>{active.calledStudent?.displayName}</h3><p>{active.calledStudent?.isYou ? t("老师邀请你回答，请先确认已收到点名。", "The teacher invites you to respond. Confirm that you are ready.") : t("请听这位同学的回答。", "Listen to your classmate.")}</p>
            {active.ownAnswer || active.responseCount ? <p className="participation-success">{t("已确认回应", "Confirmed")}</p> : active.calledStudent?.isYou && <button className="participation-primary" disabled={busy || !view.isLive || active.status !== "open"} onClick={() => void mutate(`/activities/${active.id}/answer`, { optionIds: [] })}>{t("我在，准备回答", "Ready to respond")}</button>}
          </> : <>
            <h3>{active.question}</h3>
            <fieldset disabled={busy || !view.isLive || active.status !== "open" || Boolean(active.ownAnswer)} className="participation-options">
              <legend>{active.mode === "single" ? t("请选择一项", "Select one option") : t("请选择所有符合的选项", "Select all suitable options")}</legend>
              {active.options.map(option => <label key={option.id} className={selected.includes(option.id) ? "is-selected" : ""}>
                <input type={active.mode === "single" ? "radio" : "checkbox"} name={`answer-${active.id}`} checked={selected.includes(option.id)} onChange={() => setSelected(values => active.mode === "single" ? [option.id] : values.includes(option.id) ? values.filter(id => id !== option.id) : [...values, option.id])} />
                <b>{option.id}</b><span>{option.text}</span>
              </label>)}
            </fieldset>
            {active.ownAnswer ? <p className="participation-success">{t("已提交：", "Submitted: ")}{active.ownAnswer.optionIds.join(locale === "en" ? ", " : "、")} · {active.status === "revealed" ? t("结果已公布", "Results released") : t("等待老师公布结果", "Waiting for results")}</p> : active.status === "open" ? <>
              <button className="participation-primary" disabled={busy || !selected.length || !view.isLive} onClick={() => void mutate(`/activities/${active.id}/answer`, { optionIds: selected })}>{busy ? t("提交中…", "Submitting\u2026") : t("确认提交", "Submit response")}</button><small>{t("提交后不可修改，请确认选择。", "Check your choices. Responses cannot be changed after submission.")}</small>
            </> : <p>{t("本题已收题，你未提交答案。", "This question is closed. You did not submit a response.")}</p>}
            <QuestionResults active={active} locale={locale} />
          </>}
        </article>}
      </>}
    </>}
  </section>;
}

export function TeacherParticipation({ sessionId, courseId, lesson, open, onClose }: { sessionId: string; courseId:string; lesson:number; open: boolean; onClose: () => void }) {
  const { view, busy, error, connected, mutate } = useParticipation(sessionId);
  const dialog = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [avoidRepeats, setAvoidRepeats] = useState(true);
  const [tab, setTab] = useState<"plan" | "live" | "library" | "groups">("plan");
  const requestKey = useRef({ body: "", id: "" });
  const start = async (input: Omit<Extract<ClassroomParticipationCreate, { kind: "question" }>, "requestId"> | Omit<Extract<ClassroomParticipationCreate, { kind: "roll_call" }>, "requestId">) => {
    const body = JSON.stringify(input);
    if (body !== requestKey.current.body) requestKey.current = { body, id: activityRequestId() };
    if (await mutate("/activities", { ...input, requestId: requestKey.current.id })) requestKey.current = { body: "", id: "" };
  };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === "Tab") {
        const elements = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]') ?? [])].filter(element => element.getClientRects().length > 0);
        const first = elements[0]; const last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const element = dialog.current;
    element?.addEventListener("keydown", keydown);
    return () => { element?.removeEventListener("keydown", keydown); previous?.isConnected && previous.focus(); };
  }, [onClose, open]);
  const active = view?.active;
  const locked = busy || !view?.isLive || active?.status === "open";
  useEffect(() => {
    if (open && active?.id) dialog.current?.scrollTo({ top: 0 });
  }, [active?.id, open]);
  useEffect(() => { if (open) dialog.current?.focus(); }, [tab, open]);
  if (!open) return null;
  return <div className="participation-backdrop"><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="participation-title" className="participation participation-teacher">
    <header className="participation-heading"><div><span className="participation-eyebrow">CLASSROOM LIVE · {connected ? "实时同步" : "重连中"}</span><h2 id="participation-title">课堂活动</h2></div><button type="button" aria-label="关闭课堂活动" onClick={onClose}><X size={20} /></button></header>
    {error && <p className="participation-error" role="alert">{error}</p>}
    {!view ? <p>正在连接活动…</p> : !view.isTeacher ? <p>请使用教师身份打开活动面板。</p> : <>
      <div className="participation-summary"><strong>{view.roster?.filter(m => m.online).length ?? 0}<small>在线</small></strong><strong>{view.roster?.length ?? 0}<small>已加入活动</small></strong><span>{view.isLive ? "学生使用登录账号进入课堂即可参与。" : "课堂已结束，以下为活动记录。"}</span></div>
      <label className="participation-invite">学生加入链接<input readOnly value={new URL(`/join/${sessionId}`, window.location.origin).toString()} onFocus={event => event.target.select()} /></label>
      <nav className="exercise-tabs" aria-label="活动管理"><button aria-pressed={tab === "plan"} onClick={()=>setTab("plan")}>本讲活动单</button><button aria-pressed={tab === "live"} onClick={() => setTab("live")}>当前活动</button><button aria-pressed={tab === "library"} onClick={() => setTab("library")}>习题库与发布</button><button aria-pressed={tab === "groups"} onClick={() => setTab("groups")}>学生分组</button></nav>
      {tab==="plan"&&<ClassroomActivityPlan sessionId={sessionId} courseId={courseId} lesson={lesson} revision={view.revision} live={view.isLive} onPublished={()=>setTab("live")}/>}
      <div hidden={tab !== "library"}><ExerciseLibrary base={`/api/class-sessions/${sessionId}/participation/library`} open={open && tab === "library"} locked={locked} publish={async (id, version, requestId) => {
        const ok = await mutate(`/library/${encodeURIComponent(id)}/publish`, { requestId, expectedVersion: version });
        if (ok) setTab("live"); return ok;
      }} /></div>
      <div hidden={tab !== "groups"}><ClassroomGroups view={view} busy={busy} mutate={mutate} /></div>
      <div hidden={tab !== "live"}><div className="participation-teacher-grid"><div>
        {active && <article className="participation-card">
          <span className="participation-tag">{statusLabel[active.status]} · {active.kind === "question" ? "选择题" : "点名"}</span>
          <h3>{active.kind === "roll_call" ? active.calledStudent?.displayName : active.question}</h3>
          <p>{active.kind === "roll_call" ? active.responseCount ? "学生已确认回应" : "等待学生确认回应" : `${active.responseCount} 人已提交`}</p>
          <QuestionResults active={active} />
          <div className="participation-actions">
            <button disabled={busy || !view.isLive || active.status !== "open"} onClick={() => void mutate(`/activities/${active.id}/action`, { action: "close" })}>结束{active.kind === "question" ? "收题" : "点名"}</button>
            {active.kind === "question" && <button className="participation-primary" disabled={busy || !view.isLive || active.status === "revealed"} onClick={() => void mutate(`/activities/${active.id}/action`, { action: "reveal" })}>公布结果</button>}
            <button disabled={busy || !view.isLive} onClick={() => void mutate(`/activities/${active.id}/action`, { action: "dismiss" })}>收起活动</button>
          </div>
        </article>}
        <section className="participation-card"><h3>点名互动</h3><label className="participation-check"><input type="checkbox" checked={avoidRepeats} onChange={e => setAvoidRepeats(e.target.checked)} />避开已经点过的同学</label><button disabled={locked} onClick={() => void start({ kind: "roll_call", avoidRepeats })}>随机点名</button></section>
        <form className="participation-card participation-compose" onSubmit={event => { event.preventDefault(); void start({ kind: "question", question, mode, options: options.map((text, i) => ({ id: String.fromCharCode(65 + i), text })), correctOptionIds: correct, explanation }); }}>
          <h3>发起选择题</h3>
          <label>题目<textarea value={question} maxLength={300} required placeholder="输入本次讨论的问题" onChange={e => setQuestion(e.target.value)} /></label>
          <label>题型<select aria-label="题型" value={mode} onChange={e => { setMode(e.target.value as "single" | "multiple"); setCorrect([]); }}><option value="single">单选</option><option value="multiple">多选</option></select></label>
          <p className="participation-hint">勾选参考答案；全部不勾选时作为观点投票。</p>
          {options.map((option, i) => { const id = String.fromCharCode(65 + i); return <div key={id} className="participation-compose-option"><label className="participation-check"><input type="checkbox" aria-label={`${id} 为正确答案`} checked={correct.includes(id)} onChange={e => setCorrect(values => e.target.checked ? mode === "single" ? [id] : [...values, id] : values.filter(v => v !== id))} />{id}</label><input aria-label={`选项 ${id}`} required maxLength={200} value={option} onChange={e => setOptions(values => values.map((value, index) => index === i ? e.target.value : value))} /></div>; })}
          <div className="participation-actions"><button type="button" disabled={options.length >= 6} onClick={() => setOptions(values => [...values, ""])}>添加选项</button><button type="button" disabled={options.length <= 2} onClick={() => { setCorrect(values => values.filter(v => v !== String.fromCharCode(64 + options.length))); setOptions(values => values.slice(0, -1)); }}>减少选项</button></div>
          <label>答案讲解（公布结果后学生可见）<textarea value={explanation} maxLength={1200} onChange={e => setExplanation(e.target.value)} /></label>
          <button className="participation-primary" disabled={locked}>{active?.status === "open" ? "请先结束当前活动" : "发布题目"}</button>
        </form>
      </div><aside>
        <section className="participation-card"><h3>课堂名单</h3><p className="participation-hint">在线状态会在断开约 45 秒后更新。</p><ul className="participation-roster">{view.roster?.map(m => <li key={m.actorId}><span><i className={m.online ? "is-online" : ""} />{m.displayName}<small>{m.answered ? "已回应" : m.online ? "在线" : "离线"} · 已点名 {m.calledCount} 次</small></span><button disabled={locked || !m.online} onClick={() => void start({ kind: "roll_call", participantId: m.actorId, avoidRepeats: false })}>点名</button></li>)}</ul>{!view.roster?.length && <p>等待学生加入…</p>}</section>
        <section className="participation-card"><h3>本堂活动记录</h3><ol className="participation-history">{view.history?.map(item => <li key={item.id}><span>{item.title}</span><small>{statusLabel[item.status as keyof typeof statusLabel]} · {item.responseCount} 人回应</small></li>)}</ol></section>
        {active?.kind === "question" && <section className="participation-card"><h3>各组参与</h3>{view.groupResults?.map(g => <p key={g.group}>{g.group}：{g.responded} / {g.members} 人已提交</p>)}</section>}
      </aside></div>
      </div>
    </>}
  </div></div>;
}
