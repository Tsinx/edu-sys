import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ClipboardCheck, MessageSquareText, Plus, RefreshCw } from "lucide-react";
import { defaultDefenseCriteria, defenseLevelLabels, type ClassroomActor, type Course, type DefenseAssignment, type DefenseAssignmentInput, type DefenseSession } from "@edu/contracts";
import { request } from "../../api";
import "./defense.css";

type Workspace = { actor: ClassroomActor; courses: Course[]; ownCourseIds: string[] };
type Summary = { id: string; displayName: string; status: DefenseSession["status"]; createdAt: string; total: number | null };
type TaskSummary = DefenseAssignment & { sessions: Summary[] };
type TaskDetail = { teacher: boolean; assignment: DefenseAssignment; sessions: DefenseSession[] };
const labels = { draft: "草稿", published: "收取解答中", closed: "已停止收取", submitted: "待开始答辩", in_progress: "答辩中", completed: "待教师复核", reviewed: "已复核" };
const date = (s: string) => new Date(s).toLocaleString("zh-CN");
const send = <T,>(path: string, body: unknown, method = "POST") => request<T>(path, { method, body: JSON.stringify(body) });
function ErrorBox({ error }: { error: string }) { return error ? <p role="alert" className="defense-error">{error}</p> : null; }
function Header({ title, text }: { title: string; text: string }) {
  return <header className="defense-heading"><span className="defense-icon"><MessageSquareText size={26} /></span><div><p className="defense-eyebrow">作业 · 追问 · 能力证据</p><h1>{title}</h1><p>{text}</p></div></header>;
}

export function DefenseHub() {
  const [workspace, setWorkspace] = useState<Workspace>(), [tasks, setTasks] = useState<TaskSummary[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(false), [create, setCreate] = useState(false);
  const [query, setQuery] = useSearchParams(), navigate = useNavigate(), courseId = query.get("course") ?? "";
  const teacher = workspace?.actor.roles.includes("teacher") ?? false;
  const courses = workspace?.courses.filter(c => teacher ? workspace.ownCourseIds.includes(c.id) : c.status !== "archived") ?? [];
  useEffect(() => { let live = true; request<Workspace>("/api/workspace").then(v => { if (live) setWorkspace(v); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, []);
  const selected = courses.find(c => c.id === courseId)?.id ?? courses[0]?.id ?? "";
  useEffect(() => {
    if (!selected) return;
    let live = true; setTasks([]); setError(""); setLoading(true); setCreate(false);
    request<{ assignments: TaskSummary[] }>(`/api/courses/${selected}/defense-assignments`).then(v => { if (live) setTasks(v.assignments); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [selected]);
  return <main className="workspace defense">
    <Header title="作业答辩" text={teacher ? "从学生自己的解答出发，考察解释、检验与迁移能力。" : "提交你的解答，逐题说明思路，并在条件变化时检验自己的方法。"} />
    <ErrorBox error={error} />
    <div className="defense-actions"><label>课程<select aria-label="答辩课程" value={selected} onChange={e => setQuery({ course: e.target.value })}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      {teacher && selected && <button className="button button--primary" onClick={() => setCreate(!create)}><Plus size={17} />{create ? "收起新建" : "新建答辩作业"}</button>}</div>
    {create && workspace && <AssignmentForm key={selected} actorId={workspace.actor.actorId} courseId={selected} onSaved={v => navigate(`/defenses/assignments/${v.id}`)} />}
    <div className="defense-flow" aria-label="答辩流程">{["01 提交解答", "02 针对性追问", "03 检验与迁移", "04 教师复核"].map(v => <span key={v}>{v}</span>)}</div>
    {loading && <p role="status">正在读取答辩作业…</p>}
    {!loading && !tasks.length && <section className="defense-empty"><ClipboardCheck size={32} /><h2>暂无答辩作业</h2><p>{teacher ? "选择课程，设置作业要求与能力维度，保存后即可发布。" : "教师发布后，作业会出现在这里。"}</p></section>}
    <section className="defense-task-list">{tasks.map(t => <article key={t.id} className="defense-card"><div className="defense-actions"><span className="defense-badge">{labels[t.status]}</span><small>{t.questionCount} 题 · {t.criteria.length} 个能力维度</small></div><h2><Link to={`/defenses/assignments/${t.id}`}>{t.title}</Link></h2><p className="defense-preview">{t.prompt}</p><p className="defense-muted">{t.dueAt ? `解答截止：${date(t.dueAt)}` : "未设置解答截止时间"}</p><footer className="defense-actions"><span>{teacher ? `${t.sessions.length} 人已提交 · ${t.sessions.filter(s => s.status === "completed").length} 人待复核` : t.sessions[0] ? labels[t.sessions[0].status] : "尚未提交"}</span><Link to={`/defenses/assignments/${t.id}`}>{teacher ? "管理作业" : "进入作业"} <ArrowRight size={16} /></Link></footer></article>)}</section>
    <p className="defense-note">答辩提供能力证据，无法单凭线上回答确认是否使用了外部协助。重要考核可结合教师现场追问；最终评价由教师确认。</p>
  </main>;
}

function AssignmentForm({ courseId, actorId, assignment, onSaved }: { courseId: string; actorId: string; assignment?: DefenseAssignment; onSaved: (v: DefenseAssignment) => void }) {
  const key = `defense-task:${actorId}:${assignment?.id ?? courseId}`;
  const initial: DefenseAssignmentInput = { requestId: crypto.randomUUID(), title: assignment?.title ?? "", prompt: assignment?.prompt ?? "", referenceAnswer: assignment?.referenceAnswer ?? "", criteria: assignment?.criteria ?? defaultDefenseCriteria.map(c => ({ ...c })), questionCount: assignment?.questionCount ?? 4, dueAt: assignment?.dueAt ?? null };
  const [form, setForm] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? "null") as DefenseAssignmentInput ?? initial; } catch { return initial; } });
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(form)); } catch { /* Browser draft storage is optional. */ } }, [key, form]);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = assignment ? await send<DefenseAssignment>(`/api/defense-assignments/${assignment.id}`, { ...form, revision: assignment.revision }, "PUT") : await send<DefenseAssignment>(`/api/courses/${courseId}/defense-assignments`, form);
      sessionStorage.removeItem(key); onSaved(result);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <form className="defense-card defense-form" onSubmit={e => void save(e)}><h2>{assignment ? "编辑草稿" : "设置答辩作业"}</h2><ErrorBox error={error} />
    <label>作业名称<input required minLength={2} maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：容量方案分析与答辩" /></label>
    <label>作业要求<textarea required minLength={10} maxLength={8000} rows={5} value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} placeholder="说明题目、提交要求、允许使用的工具及需要展示的能力。" /></label>
    <label>教师参考答案与评分要点（仅教师可见）<textarea maxLength={8000} rows={3} value={form.referenceAnswer} onChange={e => setForm({ ...form, referenceAnswer: e.target.value })} placeholder="可选。用于约束追问和辅助评价。" /></label>
    <fieldset><legend>能力维度与权重（合计100%）</legend>{form.criteria.map((c, index) => <div className="defense-criterion" key={c.id}><label>维度名称<input aria-label={`维度${index + 1}名称`} required maxLength={40} value={c.label} onChange={e => setForm({ ...form, criteria: form.criteria.map((v, i) => i === index ? { ...v, label: e.target.value } : v) })} /></label><label>权重 %<input aria-label={`维度${index + 1}权重`} type="number" required min={1} max={100} value={c.weight} onChange={e => setForm({ ...form, criteria: form.criteria.map((v, i) => i === index ? { ...v, weight: Number(e.target.value) } : v) })} /></label><label className="defense-criterion-description">考察要求<input aria-label={`维度${index + 1}要求`} required maxLength={500} value={c.description} onChange={e => setForm({ ...form, criteria: form.criteria.map((v, i) => i === index ? { ...v, description: e.target.value } : v) })} /></label></div>)}</fieldset>
    <div className="defense-actions"><label>答辩题数<input type="number" required min={Math.max(3, form.criteria.length)} max={8} value={form.questionCount} onChange={e => setForm({ ...form, questionCount: Number(e.target.value) })} /></label><label>解答提交截止（可选）<input type="datetime-local" value={form.dueAt ? toLocalDate(form.dueAt) : ""} onChange={e => setForm({ ...form, dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label></div>
    <p className="defense-muted">发布后题目与评分要求锁定。停止收取或超过截止时间后，已提交的学生仍可完成答辩。</p><button className="button button--primary" disabled={busy}>{busy ? "正在保存…" : "保存草稿"}</button>
  </form>;
}
function toLocalDate(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export function DefenseAssignmentPage() {
  const { assignmentId = "" } = useParams(), navigate = useNavigate();
  const [data, setData] = useState<TaskDetail>(), [error, setError] = useState(""), [busy, setBusy] = useState(false), [edit, setEdit] = useState(false), [actorId, setActorId] = useState("");
  const load = async () => { const d = await request<TaskDetail>(`/api/defense-assignments/${assignmentId}`); setData(d); return d; };
  useEffect(() => { let live = true; setData(undefined); Promise.all([request<TaskDetail>(`/api/defense-assignments/${assignmentId}`), request<Workspace>("/api/workspace")]).then(([d, w]) => { if (live) { setData(d); setActorId(w.actor.actorId); } }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [assignmentId]);
  async function action(action: "publish" | "close") { if (!data) return; setBusy(true); setError(""); try { await send(`/api/defense-assignments/${assignmentId}/action`, { action, revision: data.assignment.revision }); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  const t = data?.assignment, own = data?.sessions[0];
  return <main className="workspace defense"><Link to={t ? `/defenses?course=${t.courseId}` : "/defenses"}>← 作业答辩</Link><ErrorBox error={error} />{!data || !t ? <p role="status">正在读取作业…</p> : <>
    <Header title={t.title} text={`${labels[t.status]} · ${t.questionCount}道追问${t.dueAt ? ` · 解答截止 ${date(t.dueAt)}` : ""}`} />
    <section className="defense-card"><h2>作业要求</h2><p className="defense-prose">{t.prompt}</p><div className="defense-rubric">{t.criteria.map(c => <div key={c.id}><strong>{c.label} <span>{c.weight}%</span></strong><p>{c.description}</p></div>)}</div>
      {data.teacher && <><details><summary>教师参考答案与评分要点</summary><p className="defense-prose">{t.referenceAnswer || "未填写"}</p></details><div className="defense-actions">{t.status === "draft" && <><button onClick={() => setEdit(!edit)} disabled={busy}>编辑草稿</button><button className="button button--primary" onClick={() => void action("publish")} disabled={busy}>发布给本课程学生</button></>}{t.status === "published" && <button onClick={() => void action("close")} disabled={busy}>停止收取新解答</button>}<button onClick={() => void load().catch(e => setError(e.message))}><RefreshCw size={16} />刷新记录</button></div></>}
    </section>
    {data.teacher && edit && t.status === "draft" && <AssignmentForm courseId={t.courseId} actorId={actorId} assignment={t} onSaved={v => { setData({ ...data, assignment: v }); setEdit(false); }} />}
    {data.teacher ? <section className="defense-card"><h2>提交与答辩记录 <small>{data.sessions.length} 人</small></h2>{!data.sessions.length ? <p className="defense-muted">学生提交解答后，记录会出现在这里。</p> : <div className="defense-table-wrap"><table><thead><tr><th>学生</th><th>进度</th><th>提交时间</th><th>教师评分</th><th>记录</th></tr></thead><tbody>{data.sessions.map(s => <tr key={s.id}><td>{s.displayName}</td><td>{labels[s.status]} · {s.questions.filter(q => q.answer).length}/{Math.max(t.questionCount, s.questions.length)}</td><td>{date(s.createdAt)}</td><td>{s.review ? `${s.review.total} / 100${s.review.released ? " · 已公布" : " · 未公布"}` : "待复核"}</td><td><Link to={`/defenses/sessions/${s.id}`}>查看与追问</Link></td></tr>)}</tbody></table></div>}</section> : own ? <section className="defense-card"><h2>{labels[own.status]}</h2><p>已回答 {own.questions.filter(q => q.answer).length} 题。你的解答与已提交回答均已保存。</p><Link className="button button--primary" to={`/defenses/sessions/${own.id}`}>{["reviewed", "completed"].includes(own.status) ? "查看答辩记录" : "继续答辩"}<ArrowRight size={16} /></Link></section> : t.status === "published" && (!t.dueAt || Date.parse(t.dueAt) > Date.now()) ? <SubmissionForm actorId={actorId} assignment={t} onSaved={s => navigate(`/defenses/sessions/${s.id}`)} /> : <p>该作业已停止收取新解答。</p>}
  </>}</main>;
}

function useDraft(key: string) {
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; } });
  useEffect(() => { try { sessionStorage.setItem(key, text); } catch { /* optional */ } }, [text, key]);
  return [text, setText] as const;
}
function SubmissionForm({ actorId, assignment, onSaved }: { actorId: string; assignment: DefenseAssignment; onSaved: (s: DefenseSession) => void }) {
  const [work, setWork] = useDraft(`defense-work:${actorId}:${assignment.id}`), [disclosure, setDisclosure] = useDraft(`defense-disclosure:${actorId}:${assignment.id}`);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), requestId = useRef(crypto.randomUUID());
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await send<DefenseSession>(`/api/defense-assignments/${assignment.id}/submissions`, { requestId: requestId.current, work, aiDisclosure: disclosure }); onSaved(result); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <form className="defense-card defense-form" onSubmit={e => void submit(e)}><h2>提交你的解答</h2><p>提交后解答将锁定，答辩问题会针对其中的步骤和判断展开。请保留推导、方法选择及结果检验。</p><ErrorBox error={error} /><label>解答正文<textarea required minLength={20} maxLength={20000} rows={12} value={work} onChange={e => setWork(e.target.value)} placeholder="粘贴文字、计算步骤或代码。请将图表中的关键数据转写为文字。" /></label><label>工具与AI使用说明（可选）<textarea rows={3} maxLength={2000} value={disclosure} onChange={e => setDisclosure(e.target.value)} placeholder="说明哪些环节使用了工具，以及你如何检查其结果。" /></label><p className="defense-muted">本页输入暂存在当前浏览器标签页；点击提交且收到成功响应后，解答才保存到服务器。答辩需要联网。</p><button className="button button--primary" disabled={busy}>{busy ? "正在保存…" : "提交并锁定解答，进入答辩"}</button></form>;
}

export function DefenseSessionPage() {
  const { sessionId = "" } = useParams();
  const [session, setSession] = useState<DefenseSession>(), [workspace, setWorkspace] = useState<Workspace>(), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const teacher = workspace?.actor.roles.includes("teacher") ?? false;
  const load = async () => { const s = await request<DefenseSession>(`/api/defense-sessions/${sessionId}`); setSession(s); return s; };
  useEffect(() => {
    let live = true; setSession(undefined); setError("");
    const refresh = () => request<DefenseSession>(`/api/defense-sessions/${sessionId}`).then(s => { if (live) setSession(s); }).catch(e => { if (live) setError(e.message); });
    void refresh(); request<Workspace>("/api/workspace").then(w => { if (live) setWorkspace(w); }).catch(e => { if (live) setError(e.message); });
    const timer = setInterval(() => void refresh(), 10000);
    return () => { live = false; clearInterval(timer); };
  }, [sessionId]);
  async function next() {
    setBusy(true); setError("");
    try { setSession(await send<DefenseSession>(`/api/defense-sessions/${sessionId}/next`, {})); }
    catch (e) { setError((e as Error).message); await load().catch(() => {}); } finally { setBusy(false); }
  }
  const current = session?.questions.at(-1), finished = session && ["completed", "reviewed"].includes(session.status);
  return <main className="workspace defense"><Link to={session ? `/defenses/assignments/${session.assignmentId}` : "/defenses"}>← 返回作业</Link><ErrorBox error={error} />{!session || !workspace ? <p role="status">正在恢复答辩记录…</p> : <>
    <Header title={teacher ? `${session.displayName}的答辩` : "我的作业答辩"} text={`${session.assignment.title} · ${labels[session.status]}`} />
    <div className="defense-actions"><span className="defense-badge">已回答 {session.questions.filter(q => q.answer).length} / {Math.max(session.assignment.questionCount, session.questions.length)} 题</span><button disabled={busy} onClick={() => void load().then(() => setError("")).catch(e => setError(e.message))}><RefreshCw size={16} />刷新进度</button>{teacher && <button onClick={() => exportRecord(session)}>导出答辩记录</button>}</div>
    <div className="defense-session-grid"><aside><section className="defense-card"><h2>提交的解答</h2><p className="defense-muted">提交于 {date(session.createdAt)} · 已锁定</p><p className="defense-prose">{session.work}</p><details><summary>作业要求与工具说明</summary><p className="defense-prose">{session.assignment.prompt}</p><p className="defense-prose">工具与AI：{session.aiDisclosure || "未填写"}</p></details></section></aside><section className="defense-conversation" aria-label="答辩记录">
      {session.questions.map((q, i) => <article className="defense-card defense-question" key={q.id}><div className="defense-actions"><span className="defense-badge">第 {i + 1} 题 · {session.assignment.criteria.find(c => c.id === q.dimensionId)?.label}</span><small>{{ ai: "AI追问", rules: "规则追问", teacher: "教师追问" }[q.source]}</small></div><h2>{q.prompt}</h2>{q.anchor && <blockquote>引用原文：{q.anchor}</blockquote>}{q.source === "rules" && <p className="defense-muted">此题使用规则追问，评价由教师复核。</p>}{q.answer ? <div className="defense-answer"><strong>{teacher ? "学生回答" : "我的回答"}</strong><p className="defense-prose">{q.answer.text}</p><small>{date(q.answer.submittedAt)}</small></div> : teacher ? <p className="defense-muted">等待学生回答</p> : <AnswerForm key={q.id} session={session} onSaved={setSession} />}
        {teacher && q.evaluation && <details className="defense-evaluation"><summary>辅助评价 · {q.evaluation.level === null ? "待人工判断" : `参考等级 ${q.evaluation.level}/4`}</summary>{q.evaluation.evidence && <blockquote>{q.evaluation.evidence}</blockquote>}<p>{q.evaluation.rationale}</p><small>模型评价仅供参考，请依据完整回答核验。</small></details>}</article>)}
      {!teacher && !finished && (!current || current.answer) && <section className="defense-card"><h2>{session.questions.length === 0 ? "准备好开始了吗？" : session.questions.length >= session.assignment.questionCount ? "回答已保存，完成答辩" : "回答已保存，继续追问"}</h2><p>请独立解释自己的思路。每道题提交后不能修改；遇到不确定处可以明确说明。</p><button className="button button--primary" disabled={busy} onClick={() => void next()}>{busy ? "正在准备，请稍候…" : session.questions.length === 0 ? "开始答辩" : session.questions.length >= session.assignment.questionCount ? "完成答辩" : "获取下一题"}</button></section>}
      {finished && <section className="defense-card"><h2>{session.review?.released ? `教师评价：${session.review.total} / 100` : "答辩已完成"}</h2>{session.review?.released ? <><p className="defense-prose">{session.review.feedback}</p>{session.review.scores.map(s => <div key={s.dimensionId}><strong>{session.assignment.criteria.find(c => c.id === s.dimensionId)?.label} · {defenseLevelLabels[s.level]}</strong><p className="defense-prose">{s.comment}</p></div>)}</> : <p>{teacher ? "请逐项查看证据后保存评价，可选择公布给学生。" : "你的回答已保存。教师复核并公布后，可在这里查看评价。"}</p>}</section>}
    </section></div>
    {teacher && <TeacherPanel key={`${session.id}:${session.status}`} session={session} onSaved={setSession} />}
  </>}</main>;
}

function AnswerForm({ session, onSaved }: { session: DefenseSession; onSaved: (s: DefenseSession) => void }) {
  const q = session.questions.at(-1)!;
  const key = `defense-answer:${session.actorId}:${session.id}:${q.id}`, [text, setText] = useDraft(key);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), attempt = useRef<{ text: string; revision: number; requestId: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    if (!attempt.current || attempt.current.text !== text) attempt.current = { text, revision: session.revision, requestId: crypto.randomUUID() };
    try { const value = await send<DefenseSession>(`/api/defense-sessions/${session.id}/answer`, { ...attempt.current, questionId: q.id }, "PUT"); sessionStorage.removeItem(key); onSaved(value); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <form className="defense-form" onSubmit={e => void submit(e)}><label>你的回答<textarea aria-label="你的回答" required maxLength={6000} rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="说明依据、展开过程；不确定时请指出具体疑问。" /></label><ErrorBox error={error} /><button className="button button--primary" disabled={busy}>{busy ? "正在保存…" : "提交本题回答"}</button><small>输入暂存在当前标签页。收到成功响应后才算提交。</small></form>;
}

function TeacherPanel({ session, onSaved }: { session: DefenseSession; onSaved: (s: DefenseSession) => void }) {
  const reviewRevision = useRef(session.revision);
  const [prompt, setPrompt] = useState(""), [dimensionId, setDimensionId] = useState(session.assignment.criteria[0]!.id), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [scores, setScores] = useState(session.review?.scores ?? session.assignment.criteria.map(c => ({ dimensionId: c.id, level: -1, comment: "" }))), [feedback, setFeedback] = useState(session.review?.feedback ?? ""), [released, setReleased] = useState(session.review?.released ?? false);
  const finished = ["completed", "reviewed"].includes(session.status);
  async function manual(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { onSaved(await send<DefenseSession>(`/api/defense-sessions/${session.id}/questions`, { revision: session.revision, prompt, dimensionId })); setPrompt(""); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function review(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const saved = await send<DefenseSession>(`/api/defense-sessions/${session.id}/review`, { revision: reviewRevision.current, scores, feedback, released }, "PUT"); reviewRevision.current = saved.revision; onSaved(saved); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="defense-card defense-teacher"><h2>教师复核</h2><ErrorBox error={error} />{session.status !== "reviewed" && <details><summary>追加一次教师追问（可用于现场答辩）</summary><form className="defense-form" onSubmit={e => void manual(e)}><label>考察维度<select value={dimensionId} onChange={e => setDimensionId(e.target.value)}>{session.assignment.criteria.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>教师问题<textarea aria-label="教师问题" required minLength={5} maxLength={1200} rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} /></label><button disabled={busy || Boolean(session.questions.at(-1) && !session.questions.at(-1)!.answer) || session.questions.length >= 12}>发送追问</button><small>学生刷新或等待进度同步后即可看到；当前题提交后才能追加，最多12题。</small></form></details>}
    {finished ? <form className="defense-form" onSubmit={e => void review(e)}><p>每项按0–4级评分，按教师设定的权重换算为百分制。请写明回答证据及需要改进之处。</p>{session.assignment.criteria.map((c, index) => <fieldset key={c.id}><legend>{c.label} · 权重 {c.weight}%</legend><p>{c.description}</p><label>掌握等级<select required aria-label={`${c.label}等级`} value={scores[index]?.level ?? -1} onChange={e => setScores(scores.map((s, i) => index === i ? { ...s, level: Number(e.target.value) } : s))}><option value={-1} disabled>请选择</option>{defenseLevelLabels.map((s, i) => <option key={s} value={i}>{i} · {s}</option>)}</select></label><label>评价依据<textarea aria-label="评价依据" required rows={2} maxLength={1000} value={scores[index]?.comment ?? ""} onChange={e => setScores(scores.map((s, i) => index === i ? { ...s, comment: e.target.value } : s))} /></label></fieldset>)}<label>综合反馈<textarea aria-label="综合反馈" required rows={3} maxLength={3000} value={feedback} onChange={e => setFeedback(e.target.value)} /></label><label className="defense-checkbox"><input type="checkbox" checked={released} onChange={e => setReleased(e.target.checked)} />公布本次评价给学生</label><button className="button button--primary" disabled={busy || scores.some(s => s.level < 0)}>{busy ? "正在保存…" : released ? "保存并公布教师评价" : "保存教师评价（暂不公布）"}</button>{session.review && <p role="status">已保存教师评价：{session.review.total} / 100 · {session.review.released ? "已公布" : "未公布"} · {date(session.review.reviewedAt)}</p>}</form> : <p>学生完成答辩后，可逐维度评分并公布评价。</p>}
  </section>;
}
function exportRecord(session: DefenseSession) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `defense-${session.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
