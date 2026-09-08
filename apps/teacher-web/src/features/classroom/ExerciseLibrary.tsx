import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ClassroomExercise, ClassroomExerciseInput } from "@edu/contracts";
import { api, ApiError } from "../../api";
import { activityRequestId } from "./participation-id";
import "./participation.css";

type Props = { base: string; open: boolean; locked?: boolean; publish?: (id: string, version: number, requestId: string) => Promise<boolean> };
const newDraft = (): ClassroomExercise => ({ id: activityRequestId(), version: 0, publishedCount: 0,
  title: "", lesson: 1, pack: "课堂练习", category: "概念理解", order: 130, minute: 0, slide: 1, durationSeconds: 60,
  optional: false, collaboration: "individual", teachingCue: "", assistantCue: "", archived: false,
  content: { kind: "question", requestId: activityRequestId(), question: "", mode: "single", options: [{ id: "A", text: "" }, { id: "B", text: "" }], correctOptionIds: [], explanation: "" }
});

export function ExerciseLibrary({ base, open, locked = false, publish }: Props) {
  const [items, setItems] = useState<ClassroomExercise[]>([]);
  const [draft, setDraft] = useState<ClassroomExercise | null>(null);
  const [query, setQuery] = useState(""); const [lesson, setLesson] = useState("");
  const [pack, setPack] = useState(""); const [category, setCategory] = useState("");
  const [archived, setArchived] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const pending = useRef(false); const publishRequest = useRef({ key: "", id: "" });
  const editor = useRef<HTMLFormElement>(null);
  const read = useCallback(async () => {
    const response = await fetch(base, { credentials: "same-origin" }); const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "读取题库失败");
    setItems(result as ClassroomExercise[]);
  }, [base]);
  useEffect(() => { if (open) void read().catch(reason => setError((reason as Error).message)); }, [open, read]);
  useEffect(() => { if (draft) editor.current?.scrollIntoView({ block: "start" }); }, [draft?.id]);
  const save = async (exercise: ClassroomExercise, closeEditor = true) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    const { id, version, publishedCount: _count, ...body } = exercise;
    try {
      const response = await fetch(base, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, expectedVersion: version, exercise: body }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "保存失败");
      setItems(result); if (closeEditor) setDraft(null);
      setNotice("已保存到课程题库；已发布的活动内容保持本次发布时的样子。");
    } catch (reason) { setError((reason as Error).message); }
    finally { pending.current = false; setBusy(false); }
  };
  const launch = async (exercise: ClassroomExercise) => {
    if (!publish || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    const key = `${exercise.id}:${exercise.version}`;
    if (publishRequest.current.key !== key) publishRequest.current = { key, id: activityRequestId() };
    try {
      if (await publish(exercise.id, exercise.version, publishRequest.current.id)) {
        publishRequest.current = { key: "", id: "" }; await read(); setNotice(`已发布：${exercise.title}`);
      } else await read();
    } catch (reason) { setError((reason as Error).message); }
    finally { pending.current = false; setBusy(false); }
  };
  const change = (patch: Partial<ClassroomExerciseInput>) => setDraft(current => current ? { ...current, ...patch } : current);
  const content = (patch: Partial<ClassroomExerciseInput["content"]>) => setDraft(current => current ? { ...current, content: { ...current.content, ...patch } } : current);
  const visible = items.filter(item => item.archived === archived && (!lesson || item.lesson === Number(lesson)) && (!pack || item.pack === pack) && (!category || item.category === category) && `${item.title} ${item.content.question}`.includes(query.trim()));
  return <section className="exercise-library" aria-label="课程习题库">
    <div className="exercise-library-heading"><div><h3>备课与发布</h3><p className="participation-hint">按讲次、题组和分类整理；分钟与页码供现场参考，可随试课修改。</p></div><button type="button" disabled={busy || Boolean(draft)} onClick={() => { setDraft(newDraft()); setNotice(""); }}>新建习题</button></div>
    {error && <p className="participation-error" role="alert">{error}</p>}{notice && <p role="status" className="participation-success">{notice}</p>}
    <div className="exercise-filters">
      <label>搜索题目<input value={query} onChange={e => setQuery(e.target.value)} placeholder="标题或题干" /></label>
      <label>讲次<select aria-label="筛选讲次" value={lesson} onChange={e => setLesson(e.target.value)}><option value="">全部讲次</option>{[...new Set(items.map(i => i.lesson))].sort((a, b) => a - b).map(n => <option key={n} value={n}>第{n}讲</option>)}</select></label>
      <label>题组<select aria-label="筛选题组" value={pack} onChange={e => setPack(e.target.value)}><option value="">全部题组</option>{[...new Set(items.map(i => i.pack))].map(p => <option key={p}>{p}</option>)}</select></label>
      <label>分类<select aria-label="筛选分类" value={category} onChange={e => setCategory(e.target.value)}><option value="">全部分类</option>{[...new Set(items.map(i => i.category))].map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="participation-check"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)} />查看归档</label>
      <button type="button" disabled={busy} onClick={() => void read().then(() => setError("")).catch(e => setError((e as Error).message))}>刷新题库</button>
    </div>
    {draft && <form ref={editor} className="participation-card exercise-editor" aria-label="编辑习题" onSubmit={e => { e.preventDefault(); void save(draft); }}>
      <h3>{draft.version ? "编辑习题" : "新建习题"}</h3>
      <label>管理标题<input required maxLength={100} value={draft.title} onChange={e => change({ title: e.target.value })} /></label>
      <div className="exercise-editor-grid">
        <label>所属讲次<input type="number" required min={1} max={100} value={draft.lesson} onChange={e => change({ lesson: Number(e.target.value) })} /></label>
        <label>题组名称<input required maxLength={60} value={draft.pack} onChange={e => change({ pack: e.target.value })} /></label>
        <label>分类名称<input required maxLength={40} value={draft.category} onChange={e => change({ category: e.target.value })} /></label>
        <label>排序号<input type="number" required min={0} max={999} value={draft.order} onChange={e => change({ order: Number(e.target.value) })} /></label>
        <label>建议发布分钟<input type="number" required min={0} max={240} step={0.5} value={draft.minute} onChange={e => change({ minute: Number(e.target.value) })} /></label>
        <label>对应课件页<input type="number" required min={1} max={2000} value={draft.slide} onChange={e => change({ slide: Number(e.target.value) })} /></label>
        <label>建议作答秒数<input type="number" required min={10} max={1800} value={draft.durationSeconds} onChange={e => change({ durationSeconds: Number(e.target.value) })} /></label>
        <label>组织方式<select aria-label="组织方式" value={draft.collaboration} onChange={e => change({ collaboration: e.target.value as "individual" | "discussion" })}><option value="individual">独立作答</option><option value="discussion">讨论后各自作答</option></select></label>
      </div>
      <label className="participation-check"><input type="checkbox" checked={draft.optional} onChange={e => change({ optional: e.target.checked })} />可选加问，时间紧可跳过</label>
      <label>题干<textarea required maxLength={300} value={draft.content.question} onChange={e => content({ question: e.target.value })} /></label>
      <label>题型<select aria-label="习题题型" value={draft.content.mode} onChange={e => content({ mode: e.target.value as "single" | "multiple", correctOptionIds: [] })}><option value="single">单选</option><option value="multiple">多选</option></select></label>
      <p className="participation-hint">勾选参考答案；全部不勾选即观点投票或反馈。</p>
      {draft.content.options.map(option => <div className="participation-compose-option" key={option.id}><label className="participation-check"><input type="checkbox" aria-label={`正确答案 ${option.id}`} checked={draft.content.correctOptionIds.includes(option.id)} onChange={e => content({ correctOptionIds: e.target.checked ? draft.content.mode === "single" ? [option.id] : [...draft.content.correctOptionIds, option.id] : draft.content.correctOptionIds.filter(id => id !== option.id) })} />{option.id}</label><input aria-label={`习题选项 ${option.id}`} required maxLength={200} value={option.text} onChange={e => content({ options: draft.content.options.map(o => o.id === option.id ? { ...o, text: e.target.value } : o) })} /></div>)}
      <div className="participation-actions"><button type="button" disabled={draft.content.options.length >= 6} onClick={() => content({ options: [...draft.content.options, { id: String.fromCharCode(65 + draft.content.options.length), text: "" }] })}>添加选项</button><button type="button" disabled={draft.content.options.length <= 2} onClick={() => content({ options: draft.content.options.slice(0, -1), correctOptionIds: draft.content.correctOptionIds.filter(id => id !== draft.content.options.at(-1)?.id) })}>减少选项</button></div>
      <label>公布后的讲解<textarea maxLength={1200} value={draft.content.explanation} onChange={e => content({ explanation: e.target.value })} /></label>
      <label>教师操作与接话（仅教师可见）<textarea maxLength={3000} value={draft.teachingCue} onChange={e => change({ teachingCue: e.target.value })} /></label>
      <label>数字人提示（仅教师可见）<textarea maxLength={1500} value={draft.assistantCue} onChange={e => change({ assistantCue: e.target.value })} /></label>
      <div className="participation-actions"><button className="participation-primary" disabled={busy}>保存到题库</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>取消编辑</button></div>
    </form>}
    <p className="participation-hint">当前 {visible.length} 项 · 按排序号排列{!publish && " · 备课页只保存，进入课堂后再发布"}</p>
    <div className="exercise-list">{visible.map(item => <article key={item.id} className="participation-card exercise-item">
      <span className="participation-tag">第{item.lesson}讲 · P{String(item.slide).padStart(2, "0")} · {item.minute}分 · 作答{item.durationSeconds}秒{item.optional ? " · 可选" : ""}</span>
      <h3>{item.title}</h3><p className="participation-hint">{item.pack} / {item.category} · {item.collaboration === "discussion" ? "讨论后各自作答" : "独立作答"}{item.publishedCount > 0 && ` · 本堂已发布${item.publishedCount}次`}</p>
      <p>{item.content.question}</p>
      <details><summary>预览选项、答案与授课提示</summary><ul>{item.content.options.map(o => <li key={o.id}>{o.id} · {o.text}</li>)}</ul><p>参考答案：{item.content.correctOptionIds.join("、") || "观点投票 / 反馈，无标准答案"}</p><p>{item.content.explanation}</p><h4>教师操作与接话</h4><p>{item.teachingCue || "暂无"}</p><h4>数字人提示（手动复制到助教）</h4><textarea aria-label={`数字人提示：${item.title}`} readOnly value={item.assistantCue} onFocus={e => e.target.select()} /><small>提示不会自动发送；可在讨论期间复制使用。</small></details>
      <div className="participation-actions">
        {publish && !item.archived && <button className="participation-primary" disabled={busy || locked || Boolean(draft)} onClick={() => void launch(item)}>{item.publishedCount ? "再次发布" : "发布这道题"}</button>}
        <button disabled={busy || Boolean(draft)} onClick={() => { setDraft(structuredClone(item)); setNotice(""); }}>编辑</button>
        <button disabled={busy || Boolean(draft)} onClick={() => setDraft({ ...structuredClone(item), id: activityRequestId(), version: 0, publishedCount: 0, title: `${item.title.slice(0, 95)}（副本）`, archived: false })}>复制</button>
        <button disabled={busy || Boolean(draft)} onClick={() => void save({ ...item, archived: !item.archived }, false)}>{item.archived ? "恢复" : "归档"}</button>
      </div>
    </article>)}</div>
    {!visible.length && <p>当前筛选下没有习题，可调整筛选或新建。</p>}
  </section>;
}

let identity: ReturnType<typeof api.getIdentitySession> | undefined;
export function CourseExercisePage() {
  const { courseId = "" } = useParams(); const [ready, setReady] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    identity ??= api.getIdentitySession().catch(reason => { if (reason instanceof ApiError && reason.status === 401) return api.createDevelopmentIdentitySession("teacher"); throw reason; }).finally(() => { identity = undefined; });
    void identity.then(session => { if (!session.actor.roles.includes("teacher")) throw new Error("请使用教师身份管理题库"); if (active) setReady(true); }).catch(reason => { if (active) setError((reason as Error).message); });
    return () => { active = false; };
  }, []);
  return <main className="participation course-exercise-page"><Link to={`/courses/${courseId}`}>← 返回课程</Link><h2>课程习题库</h2><p>提前备课、分组归类，课堂上逐题发布。</p>{error && <p role="alert">{error}</p>}{ready && <ExerciseLibrary key={courseId} base={`/api/courses/${encodeURIComponent(courseId)}/exercises`} open />}</main>;
}
