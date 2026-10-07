import { ActivityWorkspace } from "../features/activities/ActivityWorkspace";
import {
  BookOpen,
  ClipboardList,
  ArrowRight,
  Radio,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type {
  ClassroomActor,
  ClassSession,
  Course,
  PortalPreferences,
  PreparationNote,
  ReadingProgress,
  SlideFrame,
} from "@edu/contracts";
import {
  getCourseDeckByCourseId,
  getCoursePresentation,
} from "@edu/course-content/deck-registry";
import { PORT_COURSE_UNITS } from "@edu/port-simulation-core";
import { api, request } from "../api";
import { isLocalDevelopment } from "../campus/local-identity";
import { runtimeConfig } from "../campus/runtime";
import { SlideStage } from "../features/classroom/TeachingSlides";
import {EnglishReadingAssistant} from "../features/study/EnglishReadingAssistant";
import "../features/study/english-reading-assistant.css";
import { PortResultDetail } from "../features/port-simulation/PortResultsPage";
import {
  resultRequest,
  submissionStatus,
  type SubmissionSummary,
  type TasksResponse,
  type ResultsResponse,
} from "../features/port-simulation/submission-api";
import "./workspace.css";
const PORT = "course-port-management-intro";
type Workspace = {
  actor: ClassroomActor;
  courses: Course[];
  ownCourseIds: string[];
  sessions: ClassSession[];
  preferences: PortalPreferences;
  newSubmissions: number;
};
export const stamp = (s: string) =>
  new Date(s).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function useWorkspace() {
  const [data, setData] = useState<Workspace>(),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const refresh = () =>
      request<Workspace>("/api/workspace")
        .then((v) => {
          if (live) {
            setData(v);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener("portal-preferences", refresh);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("portal-preferences", refresh);
    };
  }, []);
  return { data, error };
}
function ErrorText({ text }: { text: string }) {
  return text ? (
    <p role="alert" className="workspace-error">
      {text}
    </p>
  ) : null;
}
export function NotFound() {
  return (
    <main className="workspace">
      <h1>页面不存在</h1>
      <p>链接可能已变更，请从工作台或学习首页继续。</p>
      <Link to="/">返回首页</Link>
    </main>
  );
}
export function WorkspaceShell({ onNewCourse }: { onNewCourse: () => void }) {
  const { data, error } = useWorkspace();
  const [open, setOpen] = useState(false),
    [notice, setNotice] = useState(false),
    [failure, setFailure] = useState("");
  async function read() {
    try {
      await request("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({ markSubmissionsRead: true }),
      });
      window.dispatchEvent(new Event("portal-preferences"));
      setNotice(false);
    } catch (e) {
      setFailure((e as Error).message);
    }
  }
  return (
    <div
      className={`workspace-shell ${data?.preferences.compactSidebar ? "workspace-shell--compact" : ""}`}
    >
      <aside
        className={open ? "workspace-sidebar is-open" : "workspace-sidebar"}
      >
        <Link className="workspace-brand" to="/">
          教学中枢
        </Link>
        <nav aria-label="教师主导航">
          {[
            ["/", "工作台"],
            ["/courses", "课程"],
            ["/tasks", "实验任务"],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to!}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <small>校园教学平台</small>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            className="workspace-menu"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            菜单
          </button>
          <Link to="/">教师工作台</Link>
          <div className="workspace-topbar-actions">
            <button onClick={() => setNotice(!notice)} aria-expanded={notice}>
              新提交{data?.newSubmissions ? ` (${data.newSubmissions})` : ""}
            </button>
            <Link to="/settings">{data?.actor.displayName ?? "个人设置"}</Link>
            <button
              onClick={() =>
                void api
                  .logoutIdentitySession()
                  .then(() => window.location.assign(isLocalDevelopment(runtimeConfig, import.meta.env.DEV) ? "/signed-out" : "/"))
              }
            >
              退出
            </button>
          </div>
        </header>
        {notice && (
          <section className="workspace-notice">
            <p>
              {data?.newSubmissions
                ? `任教课程有 ${data.newSubmissions} 份新核验通过的提交。`
                : "任教课程暂无新提交。"}
            </p>
            <Link to="/tasks">查看实验任务与成绩</Link>{" "}
            <button onClick={() => void read()}>标记已读</button>
            <ErrorText text={failure} />
          </section>
        )}
        <ErrorText text={error} />
        <Outlet context={{ openCourseModal: onNewCourse }} />
      </div>
    </div>
  );
}
function SessionCard({
  session,
  teacher,
}: {
  session: ClassSession;
  teacher: boolean;
}) {
  return (
    <article className="workspace-row">
      <div>
        <strong>
          {session.courseTitle} · {session.lessonTitle}
        </strong>
        <p>
          {session.teacherName ?? "授课教师"} · {session.room} ·{" "}
          {stamp(session.startsAt)} ·{" "}
          {
            { live: "进行中", scheduled: "待开课", completed: "已结束" }[
              session.status
            ]
          }
        </p>
      </div>
      <Link to={teacher ? `/classroom/${session.id}` : `/join/${session.id}`}>
        {session.status === "completed" ? "查看记录" : "进入课堂"}
      </Link>
    </article>
  );
}
export function WorkspaceHome({ student = false }: { student?: boolean }) {
  const { data, error } = useWorkspace();
  if (!data)
    return (
      <main className="workspace">
        <ErrorText text={error} />
        <p>正在读取课程…</p>
      </main>
    );
  const courses = student
    ? data.courses.filter((c) => c.status !== "archived")
    : data.courses.filter((c) => data.ownCourseIds.includes(c.id));
  const live = data.sessions.filter((s) => s.status === "live");
  const primary = live.filter(
    (s, i) => live.findIndex((t) => t.courseId === s.courseId) === i,
  );
  const others = live.filter((s) => !primary.includes(s));
  const scheduled = data.preferences.classReminders
    ? data.sessions.filter(
        (s) => s.status === "scheduled" && Date.parse(s.startsAt) >= Date.now(),
      )
    : [];
  return (
    <main className="workspace">
      <header className="workspace-heading">
        <div>
          <span>{student ? "学习空间" : "教师工作台"}</span>
          <h1>
            {data.actor.displayName}，{student ? "继续学习" : "开始今天的教学"}
          </h1>
          <p>
            {courses.length} 门{student ? "可学习" : "任教"}课程 · {live.length}{" "}
            堂进行中的课堂
          </p>
        </div>
        <Link className="button button--primary" to="/tasks">
          {student ? "查看实验任务" : "实验任务与学生提交"}
        </Link>
      </header>
      <ErrorText text={error} />
      {!student && (
        <div className="workspace-priorities">
          <Link to={primary[0] ? `/classroom/${primary[0].id}` : "/courses"}>
            <span className="workspace-priority-icon">
              <Radio size={22} />
            </span>
            <div>
              <small>课堂现场</small>
              <strong>
                {primary.length
                  ? `继续 ${primary[0]?.courseTitle}`
                  : "从课程开启课堂"}
              </strong>
              <p>
                {primary.length
                  ? `${live.length} 堂课堂进行中`
                  : "上课前查看课件与本讲活动"}
              </p>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link
            to={
              courses[0] ? `/courses/${courses[0].id}/activities` : "/courses"
            }
          >
            <span className="workspace-priority-icon">
              <ClipboardList size={22} />
            </span>
            <div>
              <small>课前准备</small>
              <strong>编排本讲活动</strong>
              <p>选择习题，预览学生答题画面</p>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link to="/tasks">
            <span className="workspace-priority-icon">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <small>实验反馈</small>
              <strong>
                {data.newSubmissions
                  ? `${data.newSubmissions} 份新提交`
                  : "查看实验成果"}
              </strong>
              <p>核验结果与学生成绩</p>
            </div>
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
      <section>
        <h2>{student ? "正在上课" : "继续课堂"}</h2>
        {primary.map((s) => (
          <SessionCard key={s.id} session={s} teacher={!student} />
        ))}
        {!primary.length && (
          <p className="workspace-empty">
            暂无进行中的课堂，可从课程查看课件{!student && "或开始上课"}。
          </p>
        )}
        {others.length > 0 && (
          <details>
            <summary>其他进行中的课堂（{others.length}）</summary>
            {others.map((s) => (
              <SessionCard key={s.id} session={s} teacher={!student} />
            ))}
          </details>
        )}
      </section>
      {!!scheduled.length && (
        <section>
          <h2>近期排课</h2>
          {scheduled.slice(0, 5).map((s) => (
            <Link
              key={s.id}
              className="workspace-row"
              to={
                student
                  ? `/study/${s.courseId}`
                  : `/courses/${s.courseId}?tab=classrooms`
              }
            >
              {s.courseTitle} · {s.room} · {stamp(s.startsAt)}
            </Link>
          ))}
        </section>
      )}
      <section>
        <h2>{student ? "我的课程" : "我的任教课程"}</h2>
        <CourseCards courses={courses} student={student} />
        {!courses.length && (
          <p>
            暂无任教课程。<Link to="/courses">浏览全部课程</Link>
          </p>
        )}
      </section>
      <div className="workspace-actions">
        <Link to={student ? "/submissions" : "/activity"}>
          {student ? "我的提交与核验结果" : "查看全部平台动态"}
        </Link>
        {!student && <Link to="/courses">浏览全部课程</Link>}
      </div>
    </main>
  );
}
function CourseCards({
  courses,
  student = false,
}: {
  courses: Course[];
  student?: boolean;
}) {
  return (
    <div className="workspace-grid">
      {courses.map((c) => {
        const p = getCoursePresentation(c.id),
          deck = getCourseDeckByCourseId(c.id);
        return (
          <article className="workspace-card" key={c.id}>
            {p && (
              <img
                src={p.heroImage}
                alt=""
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
            )}
            <div>
              <h2>{c.title}</h2>
              <p>{p?.description ?? c.currentLesson.summary}</p>
              {student ? (
                deck ? (
                  <Link to={`/study/${c.id}`}>{deck.locale === "en" ? "Continue reading →" : "继续阅读课件 →"}</Link>
                ) : (
                  <span>课件尚未发布</span>
                )
              ) : (
                <Link to={`/courses/${c.id}`}>打开课程工作区 →</Link>
              )}
              <div className="workspace-course-tools">
                {student ? (
                  <Link to={`/courses/${c.id}/activity-history`}>
                    {deck?.locale === "en" ? "Class activity history →" : "课堂活动记录 →"}
                  </Link>
                ) : (
                  <Link to={`/courses/${c.id}/activities`}>
                    备课与教学活动 →
                  </Link>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function CourseCatalog() {
  const { data, error } = useWorkspace(),
    [all, setAll] = useState(false);
  const context = useOutletContext<{ openCourseModal: () => void }>();
  return (
    <main className="workspace">
      <header className="workspace-heading">
        <h1>课程</h1>
        <button
          className="button button--primary"
          onClick={context.openCourseModal}
        >
          新建课程
        </button>
      </header>
      <div className="workspace-tabs">
        <button aria-pressed={!all} onClick={() => setAll(false)}>
          我的任教课程
        </button>
        <button aria-pressed={all} onClick={() => setAll(true)}>
          全部可浏览课程
        </button>
      </div>
      <ErrorText text={error} />
      {data && (
        <CourseCards
          courses={data.courses.filter(
            (c) => all || data.ownCourseIds.includes(c.id),
          )}
        />
      )}
    </main>
  );
}
export function CourseWorkspace() {
  const [activityCounts, setActivityCounts] = useState<
    Array<{ lesson: number; count: number }>
  >([]);
  const { courseId = "" } = useParams(),
    [query, setQuery] = useSearchParams(),
    navigate = useNavigate();
  const [course, setCourse] = useState<Course>(),
    [sessions, setSessions] = useState<ClassSession[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [lesson, setLesson] = useState(0),
    [room, setRoom] = useState("");
  const startRequest = useRef<{ fingerprint: string; id: string } | undefined>(
    undefined,
  );
  const tab = query.get("tab") ?? "slides";
  useEffect(() => {
    void request<Array<{ lesson: number; count: number }>>(
      `/api/courses/${courseId}/activity-plans`,
    )
      .then(setActivityCounts)
      .catch(() => setActivityCounts([]));
  }, [courseId, tab]);
  const deck = getCourseDeckByCourseId(courseId),
    profile = getCoursePresentation(courseId);
  useEffect(() => {
    setCourse(undefined);
    void Promise.all([api.getCourses(), api.getSessions()])
      .then(([c, s]) => {
        setCourse(c.find((c) => c.id === courseId));
        setSessions(s.filter((s) => s.courseId === courseId));
        if (!c.some((c) => c.id === courseId)) setError("课程不存在");
      })
      .catch((e) => setError(e.message));
    setLesson(deck?.lessons.find((l) => l.status === "ready")?.number ?? 0);
  }, [courseId]);
  async function start(mode: "resume" | "new", scheduledSessionId?: string) {
    setBusy(true);
    setError("");
    try {
      const fingerprint = JSON.stringify([
        courseId,
        mode,
        lesson,
        room,
        scheduledSessionId,
      ]);
      if (startRequest.current?.fingerprint !== fingerprint)
        startRequest.current = { fingerprint, id: crypto.randomUUID() };
      const s = await api.startClass(courseId, {
        mode,
        requestId: startRequest.current.id,
        lesson,
        room: room.trim() || undefined,
        scheduledSessionId,
      });
      startRequest.current = undefined;
      navigate(`/classroom/${s.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace">
      <Link to="/courses">← 课程</Link>
      <header className="workspace-heading workspace-course-heading">
        {profile && <img src={profile.heroImage} alt="" />}
        <div>
          <h1>{course?.title ?? "课程工作区"}</h1>
          <p>{profile?.description}</p>
        </div>
        {deck && (
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => void start("resume")}
          >
            开始 / 继续课堂
          </button>
        )}
      </header>
      <ErrorText text={error} />
      <nav className="workspace-tabs" aria-label="课程工作区">
        {[
          ["slides", "课件"],
          ["activities", "教学活动"],
          ["classrooms", "课堂记录"],
          ...(courseId === PORT ? [["experiments", "实验与成绩"]] : []),
          ["settings", "课程设置"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => setQuery({ tab: id! })}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "slides" && (
        <>
          {deck ? (
            <>
              <p>
                查看课件不会开启课堂。开始上课会优先恢复您最近的进行中课堂。
              </p>
              <div className="workspace-lesson-list">
                {deck.lessons.map((l) => (
                  <article className="workspace-lesson-row" key={l.number}>
                    <div>
                      <span>
                        {l.displayLabel ?? `第 ${l.number} 讲`} · {l.slideTotal}{" "}
                        页
                      </span>
                      <h2>{l.title}</h2>
                      <small>
                        {activityCounts.find((c) => c.lesson === l.number)
                          ?.count ?? 0}{" "}
                        项已编排活动
                      </small>
                      {l.status === "ready" ? (
                        <Link to={`/preview/${courseId}?lesson=${l.number}`}>
                          查看课件 →
                        </Link>
                      ) : (
                        <span>尚未发布</span>
                      )}
                      <Link
                        to={`/courses/${courseId}/activities?lesson=${l.number}`}
                      >
                        教学活动 →
                      </Link>
                      <button
                        onClick={() => {
                          setLesson(l.number);
                          setQuery({ tab: "settings" });
                        }}
                      >
                        备课笔记
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p>这门课程尚未发布课件。</p>
          )}
          <details className="workspace-section">
            <summary>课程资料与离线下载</summary>
            {profile?.resources.map((r) => (
              <p key={r.title}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}{" "}
                · {r.detail}
              </p>
            ))}
            <button
              onClick={() =>
                window.dispatchEvent(new Event("open-offline-panel"))
              }
            >
              管理离线课件
            </button>
          </details>
        </>
      )}
      {tab === "activities" && (
        <ActivityWorkspace courseId={courseId} embedded />
      )}
      {tab === "classrooms" && (
        <>
          <details className="workspace-section">
            <summary>为其他班级新开一堂课</summary>
            <form
              className="workspace-form"
              onSubmit={(e) => {
                e.preventDefault();
                void start("new");
              }}
            >
              <label>
                讲次
                <select
                  value={lesson}
                  onChange={(e) => setLesson(Number(e.target.value))}
                >
                  {deck?.lessons
                    .filter((l) => l.status === "ready")
                    .map((l) => (
                      <option key={l.number} value={l.number}>
                        {l.displayLabel ?? `第 ${l.number} 讲`} · {l.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                班级 / 教室
                <input
                  required
                  maxLength={120}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="例如：管理学一班 / A301"
                />
              </label>
              <button disabled={busy || !deck}>新开一堂课</button>
            </form>
          </details>
          {sessions.map((s) =>
            s.status === "scheduled" ? (
              <article className="workspace-row" key={s.id}>
                <span>
                  {s.lessonTitle} · {s.room} · {stamp(s.startsAt)}
                </span>
                <button disabled={busy} onClick={() => void start("new", s.id)}>
                  按此排课开课
                </button>
              </article>
            ) : (
              <SessionCard key={s.id} session={s} teacher />
            ),
          )}
          {!sessions.length && (
            <p>暂无课堂记录。独立阅读课件与实验成绩不依赖课堂记录。</p>
          )}
        </>
      )}
      {tab === "experiments" && <TaskWorkspace embedded />}
      {tab === "settings" && (
        <>
          <h2>备课笔记</h2>
          <p>仅当前教师可见，按讲次保存，不改变学生课件。</p>
          <select
            aria-label="备课讲次"
            value={lesson}
            onChange={(e) => setLesson(Number(e.target.value))}
          >
            {deck?.lessons.map((l) => (
              <option key={l.number} value={l.number}>
                {l.displayLabel ?? `第 ${l.number} 讲`} · {l.title}
              </option>
            ))}
          </select>
          {deck && (
            <PreparationEditor
              key={`${courseId}:${lesson}`}
              courseId={courseId}
              lesson={lesson}
            />
          )}
          <details className="workspace-section">
            <summary>教学工具与高级设置</summary>
            <p>
              <Link to={`/courses/${courseId}/activities?view=library`}>
                课程题库
              </Link>
            </p>
            <p>
              <Link to={`/courses/${courseId}/assistant-prompts`}>
                教学助手配置
              </Link>
            </p>
          </details>
        </>
      )}
    </main>
  );
}
function PreparationEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: number;
}) {
  const [note, setNote] = useState<PreparationNote>(),
    [text, setText] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const path = `/api/courses/${courseId}/preparation/${lesson}`;
  function reload() {
    void request<PreparationNote>(path)
      .then((n) => {
        setNote(n);
        setText(n.text);
        setStatus("");
      })
      .catch((e) => setStatus(e.message));
  }
  useEffect(reload, [path]);
  async function save() {
    if (!note) return;
    setBusy(true);
    try {
      const n = await request<PreparationNote>(path, {
        method: "PUT",
        body: JSON.stringify({ text, revision: note.revision }),
      });
      setNote(n);
      setStatus("已保存到服务器");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace-form">
      <textarea
        aria-label="教师备课笔记"
        rows={8}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus("有未保存修改");
        }}
      />
      <div className="workspace-actions">
        <button disabled={!note || busy} onClick={() => void save()}>
          保存备课笔记
        </button>
        <button onClick={reload}>重新加载</button>
      </div>
      <p role="status">{status}</p>
    </div>
  );
}
export function TaskWorkspace({ embedded = false }: { embedded?: boolean }) {
  const workspace = useWorkspace();
  const available = workspace.data?.courses.some((c) => c.id === PORT);
  const [data, setData] = useState<TasksResponse>(),
    [results, setResults] = useState<ResultsResponse>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    if (!available) return;
    void resultRequest<TasksResponse>(`courses/${PORT}/tasks`)
      .then((v) => {
        setData(v);
        if (!v.teacher)
          void resultRequest<ResultsResponse>(`courses/${PORT}/results`)
            .then(setResults)
            .catch((e) => setError(e.message));
      })
      .catch((e) => setError(e.message));
  }, [available]);
  async function publish(unit: string) {
    setBusy(unit);
    try {
      setData(
        await resultRequest<TasksResponse>(`courses/${PORT}/tasks`, { unit }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!available)
    return (
      <section className="workspace">
        <h1>实验任务</h1>
        <ErrorText text={workspace.error} />
        <p>
          {workspace.data ? "您当前的课程尚未开放实验任务。" : "正在读取课程…"}
        </p>
        <Link to="/">返回首页</Link>
      </section>
    );
  return (
    <section className={embedded ? "" : "workspace"}>
      <header className="workspace-heading">
        <div>
          <h1>实验任务</h1>
          <p>港口管理概论 · 各实验分别提交，成绩以服务器核验结果为准。</p>
        </div>
        {data?.teacher ? (
          <Link
            className="button button--primary"
            to={`/courses/${PORT}/experiment-results`}
          >
            查看学生提交与成绩
          </Link>
        ) : (
          <Link to="/submissions">我的提交</Link>
        )}
      </header>
      <ErrorText text={error} />
      <div className="workspace-grid">
        {PORT_COURSE_UNITS.map((u) => {
          const task = data?.tasks.find((t) => t.unit === u.id),
            row = results?.rows[0],
            result = row?.results.find((s) => s.unit === u.id),
            pending = row?.pending.find((s) => s.unit === u.id);
          return (
            <article className="workspace-card" key={u.id}>
              <div>
                <span>
                  {task ? `已发布 · ${stamp(task.publishedAt)}` : "尚未发布"}
                </span>
                <h2>{u.title}</h2>
                {!data?.teacher && (
                  <p>
                    {pending
                      ? submissionStatus[pending.status]
                      : result
                        ? "教师已收到核验通过的结果"
                        : "尚无有效提交"}
                    {result &&
                      ` · 最高${u.id === "full" ? "综合成绩" : "任务成绩"} ${result.result?.score.toFixed(2)}`}
                  </p>
                )}
                <div className="workspace-actions">
                  {data?.teacher ? (
                    <>
                      <button
                        disabled={!!busy || !data}
                        onClick={() => void publish(u.id)}
                      >
                        {task ? "重新发布任务" : "发布任务"}
                      </button>
                      <Link to={`/simulations?course=${u.id}`}>教师演示</Link>
                    </>
                  ) : (
                    <Link to={`/simulations?course=${u.id}`}>
                      {task ? "进入实验任务" : "自由练习"}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p>
        独立实验保存于个人练习空间；课堂内的实验保存于课堂任务空间。演示和练习进度各自保留。
      </p>
    </section>
  );
}
export function SubmissionHistory() {
  const [data, setData] = useState<{
      rows: SubmissionSummary[];
      total: number;
    }>(),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<SubmissionSummary>();
  useEffect(() => {
    let live = true;
    const refresh = () =>
      resultRequest<{ rows: SubmissionSummary[]; total: number }>(
        `history?page=${page}`,
      )
        .then((v) => {
          if (live) {
            setData(v);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [page]);
  return (
    <main className="workspace">
      <h1>我的提交</h1>
      <p>
        这里只显示您的正式提交。同步练习存档不会自动提交成绩。核验通过后，教师即可查看。
      </p>
      <Link to="/tasks">返回实验任务</Link>
      <ErrorText text={error} />
      {data?.rows.map((s) => (
        <article className="workspace-row" key={s.id}>
          <div>
            <strong>
              {PORT_COURSE_UNITS.find((u) => u.id === s.unit)?.title} ·{" "}
              {submissionStatus[s.status]}
            </strong>
            <p>
              {stamp(s.createdAt)} ·{" "}
              {s.classSessionId ? "课堂任务" : "个人实验"} · 提交编号{" "}
              {s.id.slice(0, 8)}
            </p>
            <p>
              {s.result
                ? `${s.unit === "full" ? "综合成绩" : "任务成绩"} ${s.result.score.toFixed(2)} · 教师已收到`
                : (s.error ?? "请稍后查看核验结果")}
            </p>
          </div>
          {s.result && (
            <button onClick={() => setSelected(s)}>查看详情与复现</button>
          )}
        </article>
      ))}
      {data && !data.total && (
        <p className="workspace-empty">
          还没有正式提交。请在实验页使用“结束并提交”。
        </p>
      )}
      <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
      {selected && (
        <PortResultDetail
          selected={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </main>
  );
}
export function Pager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (n: number) => void;
}) {
  return (
    <nav className="workspace-actions" aria-label="分页">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} / {Math.max(1, Math.ceil(total / 20))} 页 · 共 {total} 条
      </span>
      <button disabled={page * 20 >= total} onClick={() => onPage(page + 1)}>
        下一页
      </button>
    </nav>
  );
}
export function PreferencesPage() {
  const { data, error } = useWorkspace(),
    [status, setStatus] = useState("");
  async function save(input: Partial<PortalPreferences>) {
    try {
      await request("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      window.dispatchEvent(new Event("portal-preferences"));
      setStatus("设置已保存");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  return (
    <main className="workspace">
      <h1>个人设置</h1>
      <ErrorText text={error} />
      <p>{data?.actor.displayName}</p>
      {data && (
        <div className="workspace-form">
          {data.actor.roles.includes("teacher") && (
            <label>
              <input
                type="checkbox"
                checked={data.preferences.compactSidebar}
                onChange={(e) =>
                  void save({ compactSidebar: e.target.checked })
                }
              />
              紧凑导航
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={data.preferences.classReminders}
              onChange={(e) => void save({ classReminders: e.target.checked })}
            />
            首页显示近期排课提醒
          </label>
        </div>
      )}
      <p role="status">{status}</p>
      <button
        onClick={() => window.dispatchEvent(new Event("open-offline-panel"))}
      >
        离线课件与存档管理
      </button>
    </main>
  );
}
export function AllActivity() {
  const [page, setPage] = useState(1),
    [data, setData] = useState<{
      rows: Array<{
        id: string;
        title: string;
        detail: string;
        occurredAt: string;
      }>;
      total: number;
    }>(),
    [error, setError] = useState("");
  useEffect(() => {
    void request<typeof data>(`/api/activity?page=${page}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page]);
  return (
    <main className="workspace">
      <h1>全部平台动态</h1>
      <ErrorText text={error} />
      {data?.rows.map((r) => (
        <article className="workspace-row" key={r.id}>
          <div>
            <strong>{r.title}</strong>
            <p>{r.detail}</p>
          </div>
          <time>{stamp(r.occurredAt)}</time>
        </article>
      ))}
      <Pager page={page} total={data?.total ?? 0} onPage={setPage} />
    </main>
  );
}
export function ClassroomRecords() {
  const [sessions, setSessions] = useState<ClassSession[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    void api
      .getSessions()
      .then(setSessions)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="workspace">
      <h1>课堂记录</h1>
      <Link to="/courses">从课程开始 / 继续课堂</Link>
      <ErrorText text={error} />
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} teacher />
      ))}
    </main>
  );
}
export function CourseReader({ preview = false }: { preview?: boolean }) {
  const { courseId = "" } = useParams(),
    [query] = useSearchParams();
  const deck = getCourseDeckByCourseId(courseId),
    [index, setIndex] = useState(1),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("");
  const t = (zh: string, en: string) => deck?.locale === "en" ? en : zh;
  const [interactions, setInteractions] = useState<Record<string, import("@edu/contracts").SlideInteractionValues>>({});
  const revision = useRef(0),
    queue = useRef(Promise.resolve());
  useEffect(() => {
    const synced = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.path === `/api/courses/${courseId}/reading`) {
        revision.current = detail.value.revision;
        setStatus(t("阅读位置已同步", "Reading position synchronized"));
      }
    };
    const conflict = (event: Event) => {
      if (
        (event as CustomEvent).detail.path ===
        `/api/courses/${courseId}/reading`
      )
        setStatus(
          t("其他设备已更新进度，当前页仍保留。请选择重新加载服务器位置，或将当前页保存为最新位置。", "Another device updated your progress. Reload the server position or save this page as the latest position."),
        );
    };
    window.addEventListener("reading-synced", synced);
    window.addEventListener("reading-conflict", conflict);
    return () => {
      window.removeEventListener("reading-synced", synced);
      window.removeEventListener("reading-conflict", conflict);
    };
  }, [courseId]);
  useEffect(() => {
    let live = true;
    setReady(false);
    if (!deck) return;
    const load = async () => {
      await api.getCourses().then((c) => {
        if (!c.some((c) => c.id === courseId))
          throw new Error(t("无法访问这门课程", "This course is not accessible"));
      });
      let saved: ReadingProgress | null = null;
      if (!preview) saved = await request(`/api/courses/${courseId}/reading`);
      if (!live) return;
      revision.current = saved?.revision ?? 0;
      const lesson = query.get("lesson");
      setIndex(
        lesson !== null
          ? (deck.getGlobalIndex(Number(lesson)) ?? 1)
          : (saved && deck.getSlideByKey(saved.slideKey)?.index) || 1,
      );
      setReady(true);
    };
    void load().catch((e) => {
      if (live) setStatus(e.message);
    });
    return () => {
      live = false;
    };
  }, [courseId, preview]);
  function go(next: number) {
    if (!deck) return;
    setIndex(next);
    if (preview) return;
    setStatus(t("正在保存阅读位置…", "Saving reading position\u2026"));
    queue.current = queue.current
      .then(async () => {
        const value = await request<
          ReadingProgress & { pendingSync?: boolean }
        >(`/api/courses/${courseId}/reading`, {
          method: "PUT",
          body: JSON.stringify({
            slideKey: deck.getSlide(next).slideKey,
            deckVersion: deck.versionId,
            revision: revision.current,
          }),
        });
        revision.current = value.revision;
        setStatus(
          value.pendingSync
            ? t("阅读位置已保存到本机，联网后同步", "Position saved on this device; synchronization will resume online")
            : t("阅读位置已保存", "Reading position saved"),
        );
      })
      .catch((e) => {
        setStatus(e.message);
      });
  }
  async function resolveReading(useCurrent: boolean) {
    try {
      const response = await fetch(`/api/courses/${courseId}/reading`, {
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(t("请联网后再处理阅读进度", "Connect to the network to resolve reading progress"));
      const remote = (await response.json()) as ReadingProgress | null;
      const { localDelete, localGet } = await import("../campus/storage");
      const identity = await api.getIdentitySession();
      await localDelete(
        `reading:${identity.actor.actorId}:/api/courses/${courseId}/reading`,
      );
      revision.current = remote?.revision ?? 0;
      if (useCurrent) go(index);
      else {
        setIndex((remote && deck?.getSlideByKey(remote.slideKey)?.index) || 1);
        setStatus(t("已读取服务器位置", "Server position loaded"));
      }
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  if (!deck) return <NotFound />;
  const slide = deck.getSlide(index);
  const frame: SlideFrame = {
    deckId: deck.deckId,
    versionId: deck.versionId,
    slideId: slide.slideKey,
    index,
    total: deck.slideTotal,
    logicalWidth: 1600,
    logicalHeight: 1000,
    aspectRatio: "16:10",
    title: slide.title,
    lessonNumber: slide.lessonNumber,
    lessonTitle: slide.lessonTitle,
    section: slide.section,
    summary: slide.summary,
  };
  const prev = deck.getAdjacentIndex
      ? deck.getAdjacentIndex(index, -1)
      : index > 1
        ? index - 1
        : null,
    next = deck.getAdjacentIndex
      ? deck.getAdjacentIndex(index, 1)
      : index < deck.slideTotal
        ? index + 1
        : null;
  return (
    <main lang={deck.locale ?? "zh-CN"} className="workspace-reader">
      <header>
        <Link to={preview ? `/courses/${courseId}` : "/"}>
          ← {preview ? t("返回课程", "Back to course") : t("返回学习", "Back to learning")}
        </Link>
        <strong>
          {deck.title} · {preview ? t("课件预览", "Slide preview") : t("独立阅读", "Independent reading")}
        </strong>
        <span role="status">{status}</span>
        {!preview && status.includes(t("其他", "Another device")) && (
          <>
            <button onClick={() => void resolveReading(false)}>
              {t("重新加载服务器位置", "Reload server position")}
            </button>
            <button onClick={() => void resolveReading(true)}>
              {t("将当前页保存为最新位置", "Save current position")}
            </button>
          </>
        )}
      </header>
      {ready && (
        <>
          <nav>
            <label>
              {t("讲次", "Lesson")}
              <select
                value={slide.lessonNumber}
                onChange={(e) =>
                  go(deck.getGlobalIndex(Number(e.target.value)) ?? 1)
                }
              >
                {deck.lessons
                  .filter((l) => l.status === "ready")
                  .map((l) => (
                    <option key={l.number} value={l.number}>
                      {l.displayLabel ?? t(`第 ${l.number} 讲`, `Lecture ${l.number}`)} · {l.title}
                    </option>
                  ))}
              </select>
            </label>
            <button
              disabled={prev === null}
              onClick={() => prev !== null && go(prev)}
            >
              {t("上一页", "Previous")}
            </button>
            <span>
              {index} / {deck.slideTotal}
            </span>
            <button
              disabled={next === null}
              onClick={() => next !== null && go(next)}
            >
              {t("下一页", "Next")}
            </button>
          </nav>
          <div className="workspace-reader-stage">
            <SlideStage frame={frame} readOnly={deck.locale !== "en"} playbackMode="reader" onNavigate={go}
              interaction={deck.locale === "en" && deck.getInteractionDefaults(slide.slideKey) ? {deckId: deck.deckId, slideId: slide.slideKey, revision: 1, values: interactions[slide.slideKey] ?? {...deck.getInteractionDefaults(slide.slideKey)}} : null}
              onInteractionPatch={patch => setInteractions(old => {const current = old[slide.slideKey] ?? {...deck.getInteractionDefaults(slide.slideKey)}; return deck.validateInteractionPatch(slide.slideKey, patch, current) ? {...old, [slide.slideKey]: {...current, ...patch}} : old;})}
              onInteractionReset={() => setInteractions(old => ({...old, [slide.slideKey]: {...deck.getInteractionDefaults(slide.slideKey)}}))}/>
          </div>
          {deck.locale === "en" && deck.presentation.supportsStudy && !preview && <EnglishReadingAssistant key={courseId} courseId={courseId} globalIndex={index} onNavigate={go}/>}
        </>
      )}
      {!ready && <p role="status">{status || t("正在读取课件…", "Loading slides\u2026")}</p>}
    </main>
  );
}
