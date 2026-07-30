import type {
  AvatarPresentation,
  ClassSession,
  Course,
  CreateCourseInput,
  Dashboard,
  Teacher
} from "@edu/contracts";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  GraduationCap,
  Home,
  Library,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MonitorPlay,
  PencilLine,
  Play,
  Plus,
  Save,
  Settings,
  ShipWheel,
  Sparkles,
  X,
  type LucideIcon
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams
} from "react-router-dom";
import { api } from "./api";
import { HarborAssistant, PortScene } from "./art";
import { ClassroomSubsystem } from "./features/classroom/ClassroomSubsystem";
import { StudentClassroom } from "./features/classroom/StudentClassroom";

interface PortalContextValue {
  openCourseModal: () => void;
}

const navItems: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/", label: "首页", icon: Home },
  { to: "/courses", label: "我的课程", icon: BookOpen },
  { to: "/classrooms", label: "课堂教学", icon: MonitorPlay },
  { to: "/simulations", label: "模拟实验", icon: FlaskConical },
  { to: "/evaluations", label: "教学评价", icon: ClipboardCheck },
  { to: "/resources", label: "资源中心", icon: Library }
];

const routeTitles: Record<string, string> = {
  "/": "教学工作台",
  "/courses": "我的课程",
  "/classrooms": "课堂教学",
  "/simulations": "模拟实验",
  "/evaluations": "教学评价",
  "/resources": "资源中心",
  "/activity": "全部动态",
  "/settings": "个人设置"
};

export function App() {
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signed-out" element={<SignedOutPage />} />
        <Route path="/classroom/:sessionId" element={<ClassroomSubsystem />} />
        <Route path="/join/:sessionId" element={<StudentClassroom />} />
        <Route element={<Shell onNewCourse={() => setCourseModalOpen(true)} />}>
          <Route index element={<DashboardPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseDetailPage />} />
          <Route path="classrooms" element={<ClassroomsPage />} />
          <Route
            path="simulations"
            element={
              <ModulePage
                icon={FlaskConical}
                eyebrow="SIMULATION LAB"
                title="模拟实验"
                description="这里将接入自研港口生产模拟软件，组织实验场景、参数方案与学生操作记录。"
                status="模块边界已预留"
                details={["实验场景编排", "模拟软件启动协议", "操作过程留痕"]}
              />
            }
          />
          <Route
            path="evaluations"
            element={
              <ModulePage
                icon={ClipboardCheck}
                eyebrow="TEACHING ASSESSMENT"
                title="教学评价"
                description="统一汇集课堂互动、作业、实验与阶段测评，形成可解释的教学反馈。"
                status="等待评价模型接入"
                details={["形成性评价", "量规与作业", "学习风险提示"]}
              />
            }
          />
          <Route
            path="resources"
            element={
              <ModulePage
                icon={Library}
                eyebrow="RESOURCE HUB"
                title="资源中心"
                description="管理课堂 slides、讲义、案例、视频以及数字人轻量素材，并保留课程版本关系。"
                status="资源服务接口已预留"
                details={["课堂 Slides", "案例与讲义", "数字人动作素材"]}
              />
            }
          />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {courseModalOpen && (
        <NewCourseModal
          onClose={() => setCourseModalOpen(false)}
          onCreated={() => setCourseModalOpen(false)}
        />
      )}
    </BrowserRouter>
  );
}

function Shell({ onNewCourse }: { onNewCourse: () => void }) {
  const [teacher, setTeacher] = useState<Teacher>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    void api.getMe().then(setTeacher);
  }, []);

  const title =
    routeTitles[location.pathname] ??
    (location.pathname.startsWith("/courses/") ? "课程工作区" : "课堂工作区");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <Link className="brand" to="/" onClick={() => setSidebarOpen(false)}>
          <span className="brand__mark">
            <ShipWheel size={24} />
          </span>
          <span>
            <strong>教学中枢</strong>
            <small>EDU COMMAND</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => (isActive ? "nav-item nav-item--active" : "nav-item")}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>平台服务正常</strong>
              <small>本地开发环境</small>
            </div>
          </div>
          <p>教育系统 · v0.1</p>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="关闭导航"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="app-main">
        <header className="topbar">
          <div className="topbar__title">
            <button
              className="icon-button mobile-menu"
              aria-label="打开导航"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <span className="topbar__eyebrow">TEACHER PORTAL</span>
              <h1>{title}</h1>
            </div>
          </div>

          <div className="topbar__actions">
            <button className="button button--primary topbar__create" onClick={onNewCourse}>
              <Plus size={18} />
              新建课程
            </button>

            <div className="popover-anchor">
              <button
                className="icon-button"
                aria-label="查看通知"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
              >
                <Bell size={20} />
                <span className="notification-dot" />
              </button>
              {notificationsOpen && (
                <div className="popover notification-popover">
                  <div className="popover__header">
                    <strong>通知</strong>
                    <button onClick={() => setNotificationsOpen(false)}>标记已读</button>
                  </div>
                  <p>“港口管理概论”有 2 次待进行课堂。</p>
                  <Link to="/classrooms" onClick={() => setNotificationsOpen(false)}>
                    查看课堂安排 <ChevronRight size={15} />
                  </Link>
                </div>
              )}
            </div>

            <div className="popover-anchor">
              <button
                className="profile-button"
                aria-label="打开个人菜单"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                <span className="avatar">李</span>
                <span className="profile-button__copy">
                  <strong>{teacher?.name ?? "李行之"}</strong>
                  <small>{teacher?.institution ?? "重庆交通大学"}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="popover profile-popover">
                  <Link to="/settings" onClick={() => setProfileOpen(false)}>
                    <Settings size={16} /> 个人设置
                  </Link>
                  <Link to="/signed-out" onClick={() => setProfileOpen(false)}>
                    <LogOut size={16} /> 退出当前演示
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-container">
          <Outlet context={{ openCourseModal: onNewCourse } satisfies PortalContextValue} />
        </div>
      </main>
    </div>
  );
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const navigate = useNavigate();
  const { openCourseModal } = useOutletContext<PortalContextValue>();

  useEffect(() => {
    void api.getDashboard().then(setDashboard).catch((reason: Error) => setError(reason.message));
  }, []);

  async function startClass(courseId: string) {
    setStarting(true);
    setError("");
    try {
      const session = await api.startClass(courseId);
      navigate(`/classroom/${session.id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setStarting(false);
    }
  }

  if (error && !dashboard) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }
  if (!dashboard) {
    return <LoadingState label="正在载入教师工作台" />;
  }

  const course = dashboard.featuredCourse;

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="section-kicker">2026 秋季学期 · 教师工作台</p>
          <h2>{dashboard.teacher.name}老师，下午好</h2>
          <p>今天从一门课开始，把备课、上课、实验与评价连成一条教学链路。</p>
        </div>
        <div className="date-chip">
          <CalendarDays size={19} />
          <span>
            <strong>7 月 28 日</strong>
            <small>星期二</small>
          </span>
        </div>
      </section>

      {error && <InlineAlert message={error} />}

      <section className="dashboard-grid">
        <article className="course-hero">
          <PortScene />
          <div className="course-hero__shade" />
          <div className="course-hero__content">
            <span className="hero-tag">
              <span className="live-dot" /> 当前课程
            </span>
            <div>
              <p>{course.category} · {course.code}</p>
              <h2>{course.title}</h2>
              <p className="hero-lesson">
                第一章 <span /> {course.currentLesson.title}
              </p>
            </div>
            <div className="hero-progress">
              <div>
                <span>备课进度</span>
                <strong>{course.progress}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${course.progress}%` }} />
              </div>
            </div>
            <div className="hero-actions">
              <button
                className="button button--light"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <PencilLine size={17} /> 继续备课
              </button>
              <button
                className="button button--coral"
                disabled={starting}
                onClick={() => void startClass(course.id)}
              >
                {starting ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
                {starting ? "正在启动" : "开始上课"}
              </button>
            </div>
          </div>
        </article>

        <article className="assistant-card">
          <div className="assistant-card__copy">
            <span className="assistant-label">
              <Sparkles size={15} /> 港航教学助手
            </span>
            <h3>需要我一起准备吗？</h3>
            <p>课堂用实时数字人，课下用轻量预录形象，两种模式按场景调度。</p>
            <button className="text-action" onClick={() => setAssistantOpen(true)}>
              配置助手模式 <ChevronRight size={16} />
            </button>
          </div>
          <HarborAssistant />
        </article>
      </section>

      <MetricsGrid metrics={dashboard.metrics} />

      <section className="lower-grid">
        <article className="panel upcoming-panel">
          <PanelHeader
            title="近期课堂"
            detail="按时间进入备课或直接启动"
            action={<Link to="/classrooms">查看全部 <ChevronRight size={15} /></Link>}
          />
          <div className="class-list">
            {dashboard.upcomingClasses.map((session) => (
              <div className="class-row" key={session.id}>
                <DateBadge date={session.startsAt} />
                <div className="class-row__content">
                  <strong>{session.lessonTitle}</strong>
                  <span>{session.courseTitle}</span>
                  <small>
                    <Clock3 size={13} /> {formatTime(session.startsAt)}
                    <MapPin size={13} /> {session.room}
                  </small>
                </div>
                <button
                  className="button button--ghost button--small"
                  onClick={() => navigate(`/courses/${session.courseId}`)}
                >
                  进入备课
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel activity-panel">
          <PanelHeader
            title="最近动态"
            detail="系统中的真实操作记录"
            action={<Link to="/activity">全部动态 <ChevronRight size={15} /></Link>}
          />
          <div className="activity-list">
            {dashboard.recentActivities.map((activityItem) => (
              <div className="activity-row" key={activityItem.id}>
                <span className={`activity-icon activity-icon--${activityItem.type}`}>
                  {activityItem.type === "course_created" ? (
                    <BookOpen size={17} />
                  ) : activityItem.type === "class_started" ? (
                    <Play size={17} />
                  ) : (
                    <PencilLine size={17} />
                  )}
                </span>
                <div>
                  <strong>{activityItem.title}</strong>
                  <p>{activityItem.detail}</p>
                  <small>{formatDateTime(activityItem.occurredAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <button className="floating-create" onClick={openCourseModal}>
        <Plus size={18} /> 新建课程
      </button>

      {assistantOpen && (
        <AssistantModal course={course} onClose={() => setAssistantOpen(false)} />
      )}
    </>
  );
}

function MetricsGrid({ metrics }: { metrics: Dashboard["metrics"] }) {
  const cards = [
    {
      label: "进行中课程",
      value: metrics.activeCourses,
      detail: "当前教学周期",
      icon: BookOpen,
      to: "/courses",
      tone: "teal"
    },
    {
      label: "近期课堂",
      value: metrics.upcomingClasses,
      detail: "已排入课程表",
      icon: MonitorPlay,
      to: "/classrooms",
      tone: "blue"
    },
    {
      label: "待评价任务",
      value: metrics.pendingEvaluations,
      detail: "当前无需处理",
      icon: ClipboardCheck,
      to: "/evaluations",
      tone: "amber"
    },
    {
      label: "模拟实验资源",
      value: metrics.simulationResources,
      detail: "等待首个资源接入",
      icon: FlaskConical,
      to: "/simulations",
      tone: "coral"
    }
  ];

  return (
    <section className="metrics-grid" aria-label="教学概览">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link className="metric-card" to={card.to} key={card.label}>
            <span className={`metric-card__icon metric-card__icon--${card.tone}`}>
              <Icon size={22} />
            </span>
            <div>
              <span>{card.label}</span>
              <strong>{String(card.value).padStart(2, "0")}</strong>
              <small>{card.detail}</small>
            </div>
            <ChevronRight size={17} className="metric-card__arrow" />
          </Link>
        );
      })}
    </section>
  );
}

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>();
  const [error, setError] = useState("");
  const { openCourseModal } = useOutletContext<PortalContextValue>();

  useEffect(() => {
    void api.getCourses().then(setCourses).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!courses) return <LoadingState label="正在读取课程" />;

  return (
    <section>
      <PageHeading
        eyebrow="COURSE WORKSPACE"
        title="我的课程"
        description="课程不是孤立文件夹：每门课都连接备课、课堂、实验、评价与资源。"
        action={
          <button className="button button--primary" onClick={openCourseModal}>
            <Plus size={17} /> 新建课程
          </button>
        }
      />
      <div className="course-grid">
        {courses.map((course) => (
          <Link className="course-card" to={`/courses/${course.id}`} key={course.id}>
            <div className="course-card__art">
              <PortScene />
              <span className={`status-pill status-pill--${course.status}`}>
                {course.status === "active" ? "进行中" : course.status === "draft" ? "草稿" : "已归档"}
              </span>
            </div>
            <div className="course-card__body">
              <span>{course.category} · {course.code}</span>
              <h3>{course.title}</h3>
              <p>{course.currentLesson.title}</p>
              <div className="mini-progress">
                <span style={{ width: `${course.progress}%` }} />
              </div>
              <footer>
                <small>{course.totalHours} 学时</small>
                <strong>进入课程 <ChevronRight size={15} /></strong>
              </footer>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const [course, setCourse] = useState<Course>();
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void api.getCourse(courseId).then(setCourse).catch((reason: Error) => setError(reason.message));
  }, [courseId]);

  async function startClass() {
    if (!course) return;
    setStarting(true);
    try {
      const session = await api.startClass(course.id);
      navigate(`/classroom/${session.id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setStarting(false);
    }
  }

  if (error && !course) return <ErrorState message={error} onRetry={() => navigate("/courses")} />;
  if (!course) return <LoadingState label="正在打开课程工作区" />;

  return (
    <section>
      <div className="detail-hero">
        <PortScene />
        <div className="detail-hero__shade" />
        <div className="detail-hero__content">
          <Link to="/courses">我的课程</Link>
          <span>/</span>
          <strong>{course.title}</strong>
          <div>
            <span className="hero-tag">{course.category}</span>
            <h2>{course.title}</h2>
            <p>{course.code} · {course.totalHours} 学时 · {course.discipline}</p>
          </div>
        </div>
      </div>

      {error && <InlineAlert message={error} />}

      <div className="detail-layout">
        <article className="panel lesson-editor">
          <PanelHeader
            title={`第 ${course.currentLesson.chapter} 章 · ${course.currentLesson.title}`}
            detail="当前备课节点"
            action={
              <button className="text-action" onClick={() => setEditorOpen((open) => !open)}>
                <PencilLine size={15} /> {editorOpen ? "收起编辑" : "编辑本节"}
              </button>
            }
          />
          <p className="lesson-summary">{course.currentLesson.summary}</p>
          {editorOpen && (
            <div className="editor-preview">
              <label>
                本节教学目标
                <textarea
                  defaultValue="理解港口的基本构成；能够区分港口主要功能；建立港口管理对象的整体框架。"
                />
              </label>
              <button
                className="button button--secondary"
                onClick={() => setEditorOpen(false)}
              >
                <Check size={16} /> 保存本次编辑
              </button>
              <small>本轮入口原型先保存界面状态；正式内容版本服务将在下一纵切接入。</small>
            </div>
          )}
          <div className="lesson-steps">
            {["教学目标", "课堂 Slides", "课堂活动", "课后资源"].map((step, index) => (
              <div key={step} className={index < 2 ? "lesson-step lesson-step--done" : "lesson-step"}>
                <span>{index < 2 ? <Check size={15} /> : index + 1}</span>
                <div>
                  <strong>{step}</strong>
                  <small>{index < 2 ? "已建立初稿" : "等待完善"}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel launch-card">
          <span className="launch-card__icon"><MonitorPlay size={23} /></span>
          <h3>准备进入课堂</h3>
          <p>启动后将创建一条真实课堂记录，并进入教师课堂控制台。</p>
          <button
            className="button button--coral button--wide"
            onClick={() => void startClass()}
            disabled={starting}
          >
            {starting ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
            {starting ? "正在创建课堂" : "开始上课"}
          </button>
          <ul>
            <li><CheckCircle2 size={15} /> 课程与章节已关联</li>
            <li><CheckCircle2 size={15} /> 实时数字人接口已预留</li>
            <li><CircleAlert size={15} /> GPU 服务按需启动</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

function ClassroomsPage() {
  const [sessions, setSessions] = useState<ClassSession[]>();
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    void api.getSessions().then(setSessions).catch((reason: Error) => setError(reason.message));
  }, []);

  async function enterSession(session: ClassSession) {
    if (session.status === "live") {
      navigate(`/classroom/${session.id}`);
      return;
    }
    setStartingId(session.id);
    try {
      const liveSession = await api.startClass(session.courseId);
      navigate(`/classroom/${liveSession.id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setStartingId("");
    }
  }

  if (!sessions && !error) return <LoadingState label="正在读取课堂安排" />;

  return (
    <section>
      <PageHeading
        eyebrow="CLASSROOM ORCHESTRATION"
        title="课堂教学"
        description="这里负责课堂启动、教学节奏与实时数字人助手的按需调度。"
      />
      {error && <InlineAlert message={error} />}
      <div className="schedule-list">
        {sessions?.map((session) => (
          <article className="schedule-card" key={session.id}>
            <DateBadge date={session.startsAt} />
            <div className="schedule-card__body">
              <span className={`status-pill status-pill--${session.status}`}>
                {session.status === "live" ? "进行中" : session.status === "scheduled" ? "已排课" : "已结束"}
              </span>
              <h3>{session.lessonTitle}</h3>
              <p>{session.courseTitle}</p>
              <small>
                <Clock3 size={14} /> {formatDateTime(session.startsAt)}
                <MapPin size={14} /> {session.room}
              </small>
            </div>
            <button
              className="button button--secondary"
              onClick={() => void enterSession(session)}
              disabled={session.status === "completed" || startingId === session.id}
            >
              {startingId === session.id ? (
                <LoaderCircle className="spin" size={16} />
              ) : session.status === "live" ? (
                <MonitorPlay size={16} />
              ) : (
                <Play size={16} />
              )}
              {startingId === session.id ? "正在启动" : session.status === "live" ? "进入课堂" : "立即开课"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityPage() {
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [error, setError] = useState("");

  useEffect(() => {
    void api.getDashboard().then(setDashboard).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!dashboard) return <LoadingState label="正在读取系统动态" />;

  return (
    <section>
      <PageHeading
        eyebrow="AUDIT TRAIL"
        title="全部动态"
        description="课程建立、备课与课堂启动都会在这里留下可追踪记录。"
      />
      <article className="panel timeline">
        {dashboard.recentActivities.map((item) => (
          <div className="timeline__item" key={item.id}>
            <span />
            <div>
              <small>{formatDateTime(item.occurredAt)}</small>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </article>
    </section>
  );
}

function SettingsPage() {
  const initialSettings = useMemo(() => {
    const saved = localStorage.getItem("edu-portal-preferences");
    return saved
      ? (JSON.parse(saved) as { compactSidebar: boolean; classReminders: boolean })
      : { compactSidebar: false, classReminders: true };
  }, []);
  const [settings, setSettings] = useState(initialSettings);
  const [saved, setSaved] = useState(false);

  function saveSettings() {
    localStorage.setItem("edu-portal-preferences", JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section>
      <PageHeading
        eyebrow="PERSONAL PREFERENCES"
        title="个人设置"
        description="本轮先提供本地偏好保存；账号与学校统一认证将在认证服务接入时迁移。"
      />
      <article className="panel settings-panel">
        <h3>工作台偏好</h3>
        <label className="toggle-row">
          <span>
            <strong>课堂提醒</strong>
            <small>在工作台显示即将开始的课堂</small>
          </span>
          <input
            type="checkbox"
            checked={settings.classReminders}
            onChange={(event) => setSettings({ ...settings, classReminders: event.target.checked })}
          />
        </label>
        <label className="toggle-row">
          <span>
            <strong>紧凑导航偏好</strong>
            <small>记录未来导航密度设置</small>
          </span>
          <input
            type="checkbox"
            checked={settings.compactSidebar}
            onChange={(event) => setSettings({ ...settings, compactSidebar: event.target.checked })}
          />
        </label>
        <button className="button button--primary" onClick={saveSettings}>
          {saved ? <Check size={17} /> : <Save size={17} />}
          {saved ? "已保存" : "保存偏好"}
        </button>
      </article>
    </section>
  );
}

function ModulePage({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  details
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  details: string[];
}) {
  return (
    <section>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <article className="module-preview">
        <div className="module-preview__icon"><Icon size={34} /></div>
        <span className="module-status"><span /> {status}</span>
        <h3>{title}模块已经进入系统导航</h3>
        <p>当前入口是真实路由，不是无响应占位按钮。下一纵切可以在该模块边界内继续接入业务服务。</p>
        <div className="module-detail-grid">
          {details.map((detail, index) => (
            <div key={detail}>
              <span>0{index + 1}</span>
              <strong>{detail}</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function AssistantModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [loading, setLoading] = useState<"classroom" | "selfstudy" | "">("");
  const [result, setResult] = useState<AvatarPresentation>();
  const [error, setError] = useState("");

  async function prepare(scene: "classroom" | "selfstudy") {
    setLoading(scene);
    setError("");
    try {
      setResult(await api.prepareAvatar({ courseId: course.id, scene }));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal assistant-modal" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
        <button className="modal__close" onClick={onClose} aria-label="关闭助手设置">
          <X size={19} />
        </button>
        <div className="assistant-modal__heading">
          <span><Sparkles size={21} /></span>
          <div>
            <p>港航教学助手</p>
            <h2 id="assistant-title">为“{course.title}”选择场景</h2>
          </div>
        </div>
        <div className="mode-grid">
          <button
            className="mode-card"
            disabled={Boolean(loading)}
            onClick={() => void prepare("classroom")}
          >
            <MonitorPlay size={24} />
            <strong>课堂实时助手</strong>
            <p>接入 OpenAvatarChat，按课堂时段申请 GPU 资源。</p>
            <span>{loading === "classroom" ? "正在创建…" : "创建课堂计划"}</span>
          </button>
          <button
            className="mode-card mode-card--light"
            disabled={Boolean(loading)}
            onClick={() => void prepare("selfstudy")}
          >
            <GraduationCap size={24} />
            <strong>课下轻量助手</strong>
            <p>使用卡通形象、预录动作与表情，不占用实时 GPU。</p>
            <span>{loading === "selfstudy" ? "正在准备…" : "启用轻量模式"}</span>
          </button>
        </div>
        {error && <InlineAlert message={error} />}
        {result && (
          <div className="mode-result">
            <CheckCircle2 size={20} />
            <div>
              <strong>{result.requiresGpu ? "实时模式计划已建立" : "轻量模式已经就绪"}</strong>
              <p>{result.message}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function NewCourseModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (course: Course) => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateCourseInput>({
    title: "",
    code: "",
    category: "本科课程",
    discipline: "管理学",
    totalHours: 32
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const course = await api.createCourse(form);
      onCreated(course);
      navigate(`/courses/${course.id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal course-modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
        <button className="modal__close" onClick={onClose} aria-label="关闭新建课程窗口">
          <X size={19} />
        </button>
        <div className="modal__heading">
          <span><BookOpen size={22} /></span>
          <div>
            <p>COURSE CREATION</p>
            <h2 id="course-modal-title">建立一门新课程</h2>
          </div>
        </div>
        <form className="course-form" onSubmit={submit}>
          <label className="field field--wide">
            <span>课程名称</span>
            <input
              required
              minLength={2}
              value={form.title}
              placeholder="例如：港口物流专题"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label className="field">
            <span>课程代码</span>
            <input
              required
              value={form.code}
              placeholder="例如：PORT-LOG-01"
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </label>
          <label className="field">
            <span>总学时</span>
            <input
              required
              type="number"
              min={1}
              max={300}
              value={form.totalHours}
              onChange={(event) => setForm({ ...form, totalHours: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>课程类型</span>
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              <option>本科课程</option>
              <option>研究生课程</option>
              <option>培训课程</option>
            </select>
          </label>
          <label className="field">
            <span>学科领域</span>
            <select
              value={form.discipline}
              onChange={(event) => setForm({ ...form, discipline: event.target.value })}
            >
              <option>管理学</option>
              <option>交通运输</option>
              <option>工程技术</option>
            </select>
          </label>
          {error && <div className="field--wide"><InlineAlert message={error} /></div>}
          <div className="form-actions field--wide">
            <button type="button" className="button button--ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
              {saving ? "正在建立" : "建立课程"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SignedOutPage() {
  const navigate = useNavigate();
  return (
    <main className="signed-out">
      <div className="signed-out__mark"><ShipWheel size={31} /></div>
      <p>TEACHING COMMAND CENTER</p>
      <h1>已退出本次本地演示</h1>
      <span>统一身份认证接入前，可直接返回李行之老师的教师工作台。</span>
      <button className="button button--primary" onClick={() => navigate("/")}>
        返回系统入口 <ChevronRight size={17} />
      </button>
    </main>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
      {action}
    </div>
  );
}

function PanelHeader({
  title,
  detail,
  action
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="panel-header">
      <div>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      {action}
    </header>
  );
}

function DateBadge({ date }: { date: string }) {
  const parsed = new Date(date);
  return (
    <div className="date-badge">
      <strong>{parsed.getDate().toString().padStart(2, "0")}</strong>
      <span>{parsed.getMonth() + 1} 月</span>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-state">
      <LoaderCircle className="spin" size={27} />
      <p>{label}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state">
      <CircleAlert size={30} />
      <h2>暂时无法打开</h2>
      <p>{message}</p>
      <button className="button button--secondary" onClick={onRetry}>重试</button>
    </div>
  );
}

function InlineAlert({ message }: { message: string }) {
  return (
    <div className="inline-alert" role="alert">
      <CircleAlert size={17} /> {message}
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}
