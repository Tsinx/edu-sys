import { QuestionPreview } from "./QuestionPreview";
import { CoursePracticePreview } from "../ranked-practice/RankedPractice";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  Eye,
  History,
  Layers,
  Save,
  Trash2,
} from "lucide-react";
import type {
  ActivityPlan,
  ActivityPlanItem,
  ActivityExecution,
  ClassroomExercise,
  ActivityHistoryDetail,
  ActivityHistoryPage,
  ActivitySessionPage,
} from "@edu/contracts";
import { getCourseDeckByCourseId } from "@edu/course-content/deck-registry";
import { request } from "../../api";
import { ExerciseLibrary } from "../classroom/ExerciseLibrary";
import "./activities.css";
const labels = {
  pending: "待发布",
  open: "进行中",
  closed: "已结束",
  revealed: "已公布",
  skipped: "已跳过",
};
const date = (value: string) => new Date(value).toLocaleString("zh-CN");
function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="activity-error">
      {message}
    </p>
  ) : null;
}
export function LegacyExercises() {
  const { courseId } = useParams();
  return (
    <Navigate to={`/courses/${courseId}/activities?view=library`} replace />
  );
}
export function ActivityWorkspace({
  courseId: specified,
  embedded = false,
}: {
  courseId?: string;
  embedded?: boolean;
}) {
  const params = useParams(),
    courseId = specified ?? params.courseId ?? "",
    deck = getCourseDeckByCourseId(courseId),
    [query, setQuery] = useSearchParams();
  const lesson = Number(query.get("lesson") ?? deck?.lessons[0]?.number ?? 1),
    view = query.get("view") ?? "plan";
  const [plan, setPlan] = useState<ActivityPlan>(),
    [items, setItems] = useState<ActivityPlanItem[]>([]),
    [library, setLibrary] = useState<ClassroomExercise[]>([]),
    [selected, setSelected] = useState(""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [picker, setPicker] = useState(false),
    [reload, setReload] = useState(0),
    [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (previewOpen)
      previewRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
  }, [previewOpen, selected]);
  const path = `/api/courses/${courseId}/activity-plans/${lesson}`;
  useEffect(() => {
    let live = true;
    setPlan(undefined);
    setItems([]);
    setError("");
    setNotice("");
    setDirty(false);
    setPicker(false);
    setPreviewOpen(false);
    if(view==='practice') return ()=>{live=false;};
    void Promise.all([
      request<ActivityPlan>(path),
      request<ClassroomExercise[]>(`/api/courses/${courseId}/exercises`),
    ])
      .then(([p, l]) => {
        if (live) {
          setPlan(p);
          setItems(p.items);
          setLibrary(l);
          setSelected(p.items[0]?.id ?? "");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [path, view, reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const leave = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const link = target?.closest("a[href]");
      const courseTab = target?.closest(".workspace-tabs button");
      if (
        (!link && !courseTab) ||
        link?.getAttribute("target") === "_blank" ||
        link?.getAttribute("href")?.startsWith("#")
      )
        return;
      if (!window.confirm("活动单尚未保存，离开会丢弃当前修改。是否继续？")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  function navigate(patch: Record<string, string>) {
    if (
      dirty &&
      !window.confirm("活动单尚未保存，离开会丢弃当前修改。是否继续？")
    )
      return;
    const next = new URLSearchParams(query);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    next.delete("session");
    setQuery(next);
  }
  function change(next: ActivityPlanItem[]) {
    setItems(next);
    setDirty(true);
    setNotice("有未保存修改");
  }
  async function save() {
    if (!plan || busy) return;
    setBusy(true);
    setError("");
    try {
      const p = await request<ActivityPlan>(path, {
        method: "PUT",
        body: JSON.stringify({
          expectedVersion: plan.version,
          items: items.map(
            ({
              id,
              exerciseId,
              exerciseVersion,
              minute,
              durationSeconds,
              slide,
              optional,
            }) => ({
              id,
              exerciseId,
              exerciseVersion,
              minute,
              durationSeconds,
              slide,
              optional,
            }),
          ),
        }),
      });
      setPlan(p);
      setItems(p.items);
      setDirty(false);
      setNotice("活动单已保存，可在课堂中载入");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function add(exercise: ClassroomExercise) {
    const { id, version, publishedCount: _count, ...snapshot } = exercise;
    const item: ActivityPlanItem = {
      id: crypto.randomUUID(),
      exerciseId: id,
      exerciseVersion: version,
      snapshot,
      minute: exercise.minute,
      durationSeconds: exercise.durationSeconds,
      slide:
        deck?.getLessonPosition(exercise.slide)?.lessonNumber === lesson
          ? exercise.slide
          : (deck?.getGlobalIndex(lesson) ?? 1),
      optional: exercise.optional,
      availableVersion: version,
      archived: false,
    };
    change([...items, item]);
    setSelected(item.id);
    setPicker(false);
  }
  function move(index: number, delta: number) {
    const next = [...items];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    change(next);
  }
  function patch(id: string, value: Partial<ActivityPlanItem>) {
    change(items.map((i) => (i.id === id ? { ...i, ...value } : i)));
  }
  const chosen = items.find((i) => i.id === selected),
    lessonData = deck?.lessons.find((l) => l.number === lesson);
  return (
    <section
      className={`${embedded ? "activity-workspace" : "workspace activity-workspace"} ${previewOpen ? "is-previewing" : ""}`}
    >
      {!embedded && (
        <>
          <Link className="activity-back" to={`/courses/${courseId}`}>
            ← {deck?.title ?? "课程工作区"}
          </Link>
          <header className="workspace-heading">
            <div>
              <span className="workspace-eyebrow">TEACHING ACTIVITIES</span>
              <h1>教学活动</h1>
              <p>准备一讲，轻松带进每一堂课。</p>
            </div>
            <Link
              className="button button--secondary"
              to={`/courses/${courseId}`}
            >
              返回课程
            </Link>
          </header>
        </>
      )}
      <div className="activity-segments" role="group" aria-label="教学活动视图">
        {[
          ["plan", "本讲活动单", ClipboardList],
          ["library", "课程题库", Layers],
          ["history", "课堂复盘", History],
          ...(courseId==='course-international-mathematics'?[["practice","Ranked Practice",ClipboardList]]:[]),
        ].map(([key, title, Icon]) => {
          const I = Icon as typeof ClipboardList;
          return (
            <button
              key={String(key)}
              aria-pressed={view === key}
              disabled={busy}
              onClick={() => navigate({ view: String(key) })}
            >
              <I size={17} />
              {String(title)}
            </button>
          );
        })}
      </div>
      {view === "history" ? (
        <ActivityHistory courseId={courseId} />
      ) : (
        <div className="activity-layout">
          <aside className="activity-lessons">
            <h3>
              <BookOpen size={17} />
              选择讲次
            </h3>
            <select
              aria-label="活动讲次"
              value={lesson}
              disabled={busy}
              onChange={(e) => navigate({ lesson: e.target.value })}
            >
              {deck?.lessons.map((l) => (
                <option value={l.number} key={l.number}>
                  {l.displayLabel ?? `第 ${l.number} 讲`} · {l.title}
                </option>
              ))}
            </select>
            <nav aria-label="讲次列表">
              {deck?.lessons.map((l) => (
                <button
                  key={l.number}
                  disabled={busy}
                  aria-current={lesson === l.number ? "page" : undefined}
                  onClick={() => navigate({ lesson: String(l.number) })}
                >
                  <span>{l.displayLabel ?? `第 ${l.number} 讲`}</span>
                  <strong>{l.title}</strong>
                </button>
              ))}
            </nav>
          </aside>
          <div className="activity-main">
            <ErrorMessage message={error} />
            {view === "practice" ? <CoursePracticePreview courseId={courseId} lesson={lesson}/> : view === "library" ? (
              <ExerciseLibrary
                key={`${courseId}:${lesson}`}
                base={`/api/courses/${courseId}/exercises`}
                open
                initialLesson={lesson}
                initialSlide={deck?.getGlobalIndex(lesson) ?? 1}
              />
            ) : (
              <>
                <header className="activity-plan-heading">
                  <div>
                    <span className="activity-badge">
                      {lessonData?.displayLabel ?? `第 ${lesson} 讲`}
                    </span>
                    <h2>{lessonData?.title ?? "本讲活动单"}</h2>
                    <p>
                      {items.length} 项活动 · 共{" "}
                      {Math.round(
                        (items.reduce((n, i) => n + i.durationSeconds, 0) /
                          60) *
                          10,
                      ) / 10}{" "}
                      分钟建议作答时间
                    </p>
                  </div>
                  <div className="activity-actions">
                    <button
                      disabled={!plan || busy}
                      onClick={() => setPicker(!picker)}
                    >
                      <Plus size={16} />
                      添加题库习题
                    </button>
                    <button
                      className="activity-primary"
                      disabled={!plan || busy || !dirty}
                      onClick={() => void save()}
                    >
                      <Save size={16} />
                      {busy ? "正在保存" : "保存活动单"}
                    </button>
                  </div>
                </header>
                <p role="status" className="activity-save-state">
                  {notice || "时间仅供参考，上课时由教师手动发布。"}
                </p>
                {error && dirty && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "请先复制需要保留的修改。重新加载将丢弃当前草稿。",
                        )
                      )
                        setReload((n) => n + 1);
                    }}
                  >
                    重新加载活动单
                  </button>
                )}
                <fieldset className="activity-editor-shell" disabled={busy}>
                  {picker && (
                    <section
                      className="activity-picker"
                      aria-label="添加题库习题"
                    >
                      <h3>本讲题库</h3>
                      {library
                        .filter((e) => !e.archived && e.lesson === lesson)
                        .map((e) => (
                          <button key={e.id} onClick={() => add(e)}>
                            <span>{e.title}</span>
                            <Plus size={17} />
                          </button>
                        ))}
                      {!library.some(
                        (e) => !e.archived && e.lesson === lesson,
                      ) && (
                        <p>
                          本讲还没有习题。
                          <button onClick={() => navigate({ view: "library" })}>
                            前往题库新建
                          </button>
                        </p>
                      )}
                    </section>
                  )}
                  <div className="activity-plan-body">
                    <div className="activity-ordered-list">
                      {items.map((item, index) => (
                        <article
                          className={`activity-plan-card ${selected === item.id ? "is-selected" : ""}`}
                          key={item.id}
                        >
                          <div className="activity-card-heading">
                            <span className="activity-order">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <button
                              className="activity-card-title"
                              onClick={() => setSelected(item.id)}
                            >
                              <strong>{item.snapshot.title}</strong>
                              <span>
                                {item.snapshot.collaboration === "discussion"
                                  ? "讨论后各自作答"
                                  : "独立作答"}{" "}
                                · 版本 {item.exerciseVersion}
                              </span>
                            </button>
                            <div className="activity-order-actions">
                              <button
                                aria-label={`上移${item.snapshot.title}`}
                                disabled={index === 0 || busy}
                                onClick={() => move(index, -1)}
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                aria-label={`下移${item.snapshot.title}`}
                                disabled={index === items.length - 1 || busy}
                                onClick={() => move(index, 1)}
                              >
                                <ArrowDown size={16} />
                              </button>
                              <button
                                aria-label={`移除${item.snapshot.title}`}
                                disabled={busy}
                                onClick={() =>
                                  change(items.filter((i) => i.id !== item.id))
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p>{item.snapshot.content.question}</p>
                          {!item.archived &&
                            item.availableVersion !== null &&
                            item.availableVersion !== item.exerciseVersion && (
                              <p className="activity-update">
                                题库有新版本{" "}
                                <button
                                  onClick={() => {
                                    const newer = library.find(
                                      (e) => e.id === item.exerciseId,
                                    );
                                    if (newer) {
                                      const {
                                        id: _id,
                                        version,
                                        publishedCount: _c,
                                        ...snapshot
                                      } = newer;
                                      patch(item.id, {
                                        exerciseVersion: version,
                                        snapshot,
                                      });
                                    }
                                  }}
                                >
                                  采用题库新版本
                                </button>
                              </p>
                            )}
                          {item.archived && (
                            <p>来源题目已归档，本活动单保留已确认的内容。</p>
                          )}
                          {selected === item.id && (
                            <div className="activity-item-settings">
                              <label>
                                建议发布分钟
                                <input
                                  type="number"
                                  min={0}
                                  max={240}
                                  value={item.minute}
                                  onChange={(e) =>
                                    patch(item.id, {
                                      minute: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                建议作答秒数
                                <input
                                  type="number"
                                  min={10}
                                  max={1800}
                                  value={item.durationSeconds}
                                  onChange={(e) =>
                                    patch(item.id, {
                                      durationSeconds: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                              <label>
                                关联课件页
                                <select
                                  value={item.slide}
                                  onChange={(e) =>
                                    patch(item.id, {
                                      slide: Number(e.target.value),
                                    })
                                  }
                                >
                                  {lessonData?.slideStart &&
                                    Array.from(
                                      { length: lessonData.slideTotal },
                                      (_, n) => {
                                        const s = deck!.getSlide(
                                          lessonData.slideStart! + n,
                                        );
                                        return (
                                          <option key={s.index} value={s.index}>
                                            本讲 {n + 1} 页 · {s.title}
                                          </option>
                                        );
                                      },
                                    )}
                                </select>
                              </label>
                              <label className="activity-check">
                                <input
                                  type="checkbox"
                                  checked={item.optional}
                                  onChange={(e) =>
                                    patch(item.id, {
                                      optional: e.target.checked,
                                    })
                                  }
                                />
                                时间紧时可跳过
                              </label>
                            </div>
                          )}
                          <button
                            className="activity-preview-link"
                            onClick={() => {
                              setSelected(item.id);
                              setPreviewOpen(true);
                            }}
                          >
                            <Eye size={15} />
                            学生预览
                          </button>
                        </article>
                      ))}
                      {plan && !items.length && (
                        <div className="activity-empty">
                          <ClipboardList size={40} />
                          <h3>为这一讲安排一次互动</h3>
                          <p>
                            从已有题库选择习题，调整顺序后保存。各班课堂将分别记录发布和作答。
                          </p>
                          <button onClick={() => setPicker(true)}>
                            添加第一项活动
                          </button>
                        </div>
                      )}
                      {!plan && !error && <p role="status">正在读取活动单…</p>}
                    </div>
                    {chosen && (
                      <div ref={previewRef} className="activity-preview-step">
                        <button
                          className="activity-preview-back"
                          onClick={() => setPreviewOpen(false)}
                        >
                          ← 返回活动编排
                        </button>
                        <QuestionPreview
                          key={`${chosen.id}:${chosen.exerciseVersion}`}
                          exercise={chosen.snapshot}
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
export function ClassroomActivityPlan({
  sessionId,
  courseId,
  lesson,
  revision,
  live,
  onPublished,
}: {
  sessionId: string;
  courseId: string;
  lesson: number;
  revision: number;
  live: boolean;
  onPublished: () => void;
}) {
  const [data, setData] = useState<{
      execution: ActivityExecution | null;
      plan: ActivityPlan;
    }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    keys = useRef(new Map<string, string>());
  const base = `/api/class-sessions/${sessionId}/participation/plans/${lesson}`;
  useEffect(() => {
    setData(undefined);
    setError("");
  }, [base]);
  useEffect(() => {
    let active = true;
    void request<typeof data>(base)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, revision]);
  async function mutate(suffix: string, body: unknown) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const execution = await request<ActivityExecution>(base + suffix, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setData((old) => (old ? { ...old, execution } : old));
      if (
        suffix.includes("/items/") &&
        (body as { action: string }).action === "publish"
      )
        onPublished();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function act(id: string, action: "publish" | "skip" | "restore") {
    const key = `${lesson}:${id}:${action}`;
    if (!keys.current.has(key)) keys.current.set(key, crypto.randomUUID());
    void mutate(`/items/${id}`, { action, requestId: keys.current.get(key) });
  }
  return (
    <section className="activity-live-plan">
      <header className="activity-section-title">
        <h3>本讲活动单 · 第 {lesson} 讲</h3>
        <Link
          to={`/courses/${courseId}/activities?lesson=${lesson}`}
          target="_blank"
          rel="noreferrer"
        >
          课前编排 ↗
        </Link>
      </header>
      <ErrorMessage message={error} />
      {!data ? (
        <p>正在读取活动单…</p>
      ) : !data.execution ? (
        <div className="activity-empty">
          <p>
            {data.plan.items.length
              ? `已准备 ${data.plan.items.length} 项活动，可载入本课堂。`
              : "本讲尚未编排活动，可使用题库或临时出题。"}
          </p>
          <button
            className="activity-primary"
            disabled={busy || !live || !data.plan.items.length}
            onClick={() =>
              void mutate("/attach", { expectedVersion: data.plan.version })
            }
          >
            载入本讲活动单
          </button>
        </div>
      ) : (
        <>
          <p>
            本课堂使用活动单版本 {data.execution.planVersion}
            ，后续备课修改不会影响本堂。
          </p>
          {data.execution.items.map((i, n) => (
            <article className="activity-live-item" key={i.id}>
              <span className="activity-order">{n + 1}</span>
              <div>
                <strong>{i.snapshot.title}</strong>
                <p>
                  {labels[i.status]} · 建议第 {i.minute} 分钟 · 作答{" "}
                  {i.durationSeconds} 秒{i.optional ? " · 可选" : ""}
                </p>
              </div>
              <div className="activity-actions">
                {i.status === "pending" && (
                  <>
                    <button
                      className="activity-primary"
                      disabled={
                        busy ||
                        !live ||
                        data.execution!.items.some((x) => x.status === "open")
                      }
                      onClick={() => act(i.id, "publish")}
                    >
                      发布
                    </button>
                    <button
                      disabled={busy || !live}
                      onClick={() => act(i.id, "skip")}
                    >
                      跳过
                    </button>
                  </>
                )}
                {i.status === "skipped" && (
                  <button
                    disabled={busy || !live}
                    onClick={() => act(i.id, "restore")}
                  >
                    恢复
                  </button>
                )}
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="activity-pagination" aria-label="活动记录分页">
      <button disabled={page === 1} onClick={() => onPage(page - 1)}>
        上一页
      </button>
      <span>
        {page} / {Math.max(1, Math.ceil(total / 20))} · 共 {total} 条
      </span>
      <button disabled={page * 20 >= total} onClick={() => onPage(page + 1)}>
        下一页
      </button>
    </nav>
  );
}
export function ActivityHistory({
  courseId: specified,
  student = false,
}: {
  courseId?: string;
  student?: boolean;
}) {
  const params = useParams(),
    courseId = specified ?? params.courseId ?? "",
    deck = getCourseDeckByCourseId(courseId);
  const [sessions, setSessions] = useState<ActivitySessionPage>(),
    [session, setSession] = useState(""),
    [history, setHistory] = useState<ActivityHistoryPage>(),
    [detail, setDetail] = useState<ActivityHistoryDetail>(),
    [page, setPage] = useState(1),
    [historyPage, setHistoryPage] = useState(1),
    [lesson, setLesson] = useState(""),
    [error, setError] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const detailRequest = useRef(0);
  useEffect(() => {
    let active = true;
    setError("");
    detailRequest.current++;
    setSessions(undefined);
    setSession("");
    setHistory(undefined);
    setDetail(undefined);
    void request<ActivitySessionPage>(
      `/api/courses/${courseId}/activity-history?page=${page}${lesson !== "" ? `&lesson=${lesson}` : ""}`,
    )
      .then((v) => {
        if (active) setSessions(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [courseId, page, lesson]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setError("");
    detailRequest.current++;
    setHistory(undefined);
    setDetail(undefined);
    void request<ActivityHistoryPage>(
      `/api/class-sessions/${session}/participation/history?page=${historyPage}`,
    )
      .then((v) => {
        if (active) setHistory(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session, historyPage]);
  async function show(id: string) {
    const current = ++detailRequest.current;
    setError("");
    try {
      const next = await request<ActivityHistoryDetail>(
        `/api/class-sessions/${session}/participation/history/${id}`,
      );
      if (current === detailRequest.current) setDetail(next);
    } catch (e) {
      if (current === detailRequest.current) setError((e as Error).message);
    }
  }
  useEffect(() => {
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    detailRef.current?.focus({ preventScroll: true });
  }, [detail?.id]);
  return (
    <section
      className={student ? "workspace activity-workspace" : "activity-history"}
    >
      {student && (
        <>
          <Link to="/">← 返回学习</Link>
          <h1>课堂活动记录</h1>
          <p>{deck?.title} · 只显示您的作答，答案由教师公布后可见。</p>
        </>
      )}
      <div className="activity-section-title">
        <h2>{student ? "我的课堂" : "课堂复盘"}</h2>
        <label>
          讲次
          <select
            aria-label="复盘讲次"
            value={lesson}
            onChange={(e) => {
              setLesson(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部讲次</option>
            {deck?.lessons.map((l) => (
              <option key={l.number} value={l.number}>
                {l.displayLabel ?? `第 ${l.number} 讲`} · {l.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorMessage message={error} />
      <div className="activity-history-layout">
        <div>
          {sessions?.rows.map((s) => (
            <button
              key={s.id}
              className={`activity-session-card ${session === s.id ? "is-selected" : ""}`}
              onClick={() => {
                setSession(s.id);
                setHistoryPage(1);
              }}
            >
              <strong>{s.lessonTitle}</strong>
              <span>
                {s.room} · {s.teacherName ?? "授课教师"}
              </span>
              <small>
                {date(s.startsAt)} · {s.activityCount} 项
                {student ? "已作答活动" : "活动"}
              </small>
            </button>
          ))}
          {sessions && !sessions.total && (
            <div className="activity-empty">
              <History size={32} />
              <p>
                {student
                  ? "还没有课堂作答记录"
                  : "本课程尚无活动记录。课前保存活动单，上课时发布后即可在这里复盘。"}
              </p>
            </div>
          )}
          <Pagination
            page={page}
            total={sessions?.total ?? 0}
            onPage={setPage}
          />
        </div>
        <div>
          {!session && !!sessions?.total && (
            <div className="activity-empty">选择一次课堂，查看活动记录。</div>
          )}
          {history?.rows.map((r) => (
            <button
              className="activity-history-row"
              key={r.id}
              onClick={() => void show(r.id)}
            >
              <div>
                <strong>{r.title}</strong>
                <span>
                  {date(r.createdAt)} ·{" "}
                  {labels[r.status as keyof typeof labels] ?? r.status}
                </span>
              </div>
              <span>
                {student ? "查看我的作答" : `${r.responseCount} 人回应 →`}
              </span>
            </button>
          ))}
          {history && (
            <Pagination
              page={historyPage}
              total={history.total}
              onPage={setHistoryPage}
            />
          )}
        </div>
      </div>
      {detail && (
        <section
          className="activity-history-detail"
          ref={detailRef}
          tabIndex={-1}
          aria-label="活动作答详情"
        >
          <header className="activity-section-title">
            <h2>{detail.title}</h2>
            <button onClick={() => setDetail(undefined)}>关闭详情</button>
          </header>
          <p>
            {date(detail.createdAt)} ·{" "}
            {detail.revealedAt ? "教师已公布结果" : "结果尚未公布"}
          </p>
          {detail.ownAnswer && (
            <p>
              我的提交：{detail.ownAnswer.optionIds.join("、") || "已确认点名"}{" "}
              · {date(detail.ownAnswer.submittedAt)}
            </p>
          )}
          {detail.options.map((o) => (
            <div className="activity-distribution" key={o.id}>
              <span>
                {o.id} · {o.text}
              </span>
              {detail.counts && (
                <>
                  <meter
                    min={0}
                    max={Math.max(1, detail.responseCount ?? 0)}
                    value={detail.counts[o.id] ?? 0}
                  />
                  <strong>{detail.counts[o.id] ?? 0} 人</strong>
                </>
              )}
            </div>
          ))}
          {detail.correctOptionIds !== null && (
            <div className="activity-explanation">
              <strong>
                {detail.kind === "roll_call"
                  ? "课堂点名"
                  : detail.correctOptionIds.length
                    ? `参考答案：${detail.correctOptionIds.join("、")}`
                    : "观点投票，无标准答案"}
              </strong>
              <p>{detail.explanation}</p>
            </div>
          )}
          {!student && (
            <>
              <div className="activity-metrics">
                <span>
                  <strong>{detail.responseCount}</strong>已提交
                </span>
                <span>
                  <strong>{detail.members ?? "—"}</strong>活动参与名单
                </span>
                <span>
                  <strong>
                    {detail.correctRate === null
                      ? "—"
                      : `${(detail.correctRate * 100).toFixed(1)}%`}
                  </strong>
                  已提交者正确率
                </span>
              </div>
              <p>
                多选题完全匹配才算正确；投票及点名不计算正确率。历史未记录的参与名单显示“—”。
              </p>
              {detail.groups?.map((g) => (
                <p key={g.group}>
                  {g.group} · {g.responded} / {g.members} 人已提交
                </p>
              ))}
              <div className="activity-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>学生</th>
                      <th>小组</th>
                      <th>作答</th>
                      <th>结果</th>
                      <th>提交时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.answers?.map((a) => (
                      <tr key={a.actorId}>
                        <td>{a.displayName}</td>
                        <td>{a.group || "未分组"}</td>
                        <td>{a.optionIds.join("、") || "已回应"}</td>
                        <td>
                          {a.correct === null
                            ? "不计分"
                            : a.correct
                              ? "正确"
                              : "需回顾"}
                        </td>
                        <td>{date(a.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
