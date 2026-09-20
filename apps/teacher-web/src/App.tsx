import {
  WorkspaceShell,
  WorkspaceHome,
  CourseCatalog,
  CourseWorkspace,
  TaskWorkspace,
  PreferencesPage,
  AllActivity,
  ClassroomRecords,
  CourseReader,
  NotFound,
} from "./portal/WorkspacePages";
import { PortResultsPage } from "./features/port-simulation/PortResultsPage";
import { getCoursePresentation } from "@edu/course-content/deck-registry";
import type { Course, CreateCourseInput } from "@edu/contracts";
import {
  BookOpen,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Plus,
  ShipWheel,
  X,
} from "lucide-react";
import { type FormEvent, lazy, Suspense, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api } from "./api";
import { ClassroomSubsystem } from "./features/classroom/ClassroomSubsystem";
import { StudentClassroom } from "./features/classroom/StudentClassroom";
import { CourseExercisePage } from "./features/classroom/ExerciseLibrary";
import { AssistantPromptEditor } from "./features/classroom/AssistantPromptEditor";

const AuthenticatedLocalPortSimulationPage = lazy(() =>
  import(
    "./features/port-simulation/AuthenticatedLocalPortSimulationPage"
  ).then((module) => ({
    default: module.AuthenticatedLocalPortSimulationPage,
  })),
);

const StudentStudyPage = lazy(() =>
  import("./features/study/StudentStudyPage").then((module) => ({
    default: module.StudentStudyPage,
  })),
);
const XiaomaiAnimationPreview = lazy(() =>
  import("./features/avatar/XiaomaiAnimationPreview").then((module) => ({
    default: module.XiaomaiAnimationPreview,
  })),
);

function StudyRoute() {
  const { courseId = "" } = useParams();
  const profile = getCoursePresentation(courseId);
  if (courseId !== "course-port-management-intro") return <CourseReader />;
  if (!profile?.supportsStudy)
    return (
      <main className="study-unavailable">
        <BookOpen size={32} />
        <h1>{profile?.shortTitle ?? "本课程"}课下学习暂未开放</h1>
        <span>请通过教师课堂与学生同步画面学习。</span>
        <Link to={`/courses/${courseId}`}>返回课程工作区</Link>
      </main>
    );
  return (
    <Suspense fallback={<LoadingState label="正在打开课下学习空间" />}>
      <StudentStudyPage />
    </Suspense>
  );
}

export function App() {
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/preview/:courseId" element={<CourseReader preview />} />
        <Route path="/signed-out" element={<SignedOutPage />} />
        <Route
          path="/avatar/xiaomai/preview"
          element={
            <Suspense fallback={<p>正在打开动画预览…</p>}>
              <XiaomaiAnimationPreview />
            </Suspense>
          }
        />
        <Route path="/classroom/:sessionId" element={<ClassroomSubsystem />} />
        <Route path="/join/:sessionId" element={<StudentClassroom />} />
        <Route path="/study/:courseId" element={<StudyRoute />} />
        <Route
          element={
            <WorkspaceShell onNewCourse={() => setCourseModalOpen(true)} />
          }
        >
          <Route index element={<WorkspaceHome />} />
          <Route path="courses" element={<CourseCatalog />} />
          <Route path="courses/:courseId" element={<CourseWorkspace />} />
          <Route
            path="courses/:courseId/experiment-results"
            element={<PortResultsPage />}
          />
          <Route
            path="courses/:courseId/exercises"
            element={<CourseExercisePage />}
          />
          <Route
            path="courses/:courseId/assistant-prompts"
            element={<AssistantPromptEditor />}
          />
          <Route path="classrooms" element={<ClassroomRecords />} />
          <Route
            path="simulations"
            element={
              <Suspense
                fallback={<LoadingState label="正在装载本地港口仿真" />}
              >
                <AuthenticatedLocalPortSimulationPage />
              </Suspense>
            }
          />
          <Route path="tasks" element={<TaskWorkspace />} />
          <Route
            path="evaluations"
            element={<Navigate to="/tasks" replace />}
          />
          <Route
            path="resources"
            element={<Navigate to="/courses" replace />}
          />
          <Route path="activity" element={<AllActivity />} />
          <Route path="settings" element={<PreferencesPage />} />
          <Route path="*" element={<NotFound />} />
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

function NewCourseModal({
  onClose,
  onCreated,
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
    totalHours: 32,
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
    <div className="modal-backdrop portal-modal" role="presentation">
      <section
        className="modal course-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-modal-title"
      >
        <button
          className="modal__close"
          onClick={onClose}
          aria-label="关闭新建课程窗口"
        >
          <X size={19} />
        </button>
        <div className="modal__heading">
          <span>
            <BookOpen size={22} />
          </span>
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
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>课程代码</span>
            <input
              required
              value={form.code}
              placeholder="例如：PORT-LOG-01"
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
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
              onChange={(event) =>
                setForm({ ...form, totalHours: Number(event.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>课程类型</span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
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
              onChange={(event) =>
                setForm({ ...form, discipline: event.target.value })
              }
            >
              <option>管理学</option>
              <option>交通运输</option>
              <option>工程技术</option>
            </select>
          </label>
          {error && (
            <div className="field--wide">
              <InlineAlert message={error} />
            </div>
          )}
          <div className="form-actions field--wide">
            <button
              type="button"
              className="button button--ghost"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
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
      <div className="signed-out__mark">
        <ShipWheel size={31} />
      </div>
      <p>TEACHING COMMAND CENTER</p>
      <h1>已退出登录</h1>
      <span>请返回系统入口重新登录。</span>
      <button className="button button--primary" onClick={() => navigate("/")}>
        返回系统入口 <ChevronRight size={17} />
      </button>
    </main>
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state">
      <CircleAlert size={30} />
      <h2>暂时无法打开</h2>
      <p>{message}</p>
      <button className="button button--secondary" onClick={onRetry}>
        重试
      </button>
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
