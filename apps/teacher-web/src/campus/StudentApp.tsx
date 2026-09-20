import {
  WorkspaceHome,
  TaskWorkspace,
  SubmissionHistory,
  CourseReader,
  PreferencesPage,
  NotFound,
} from "../portal/WorkspacePages";
import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import type { ClassroomIdentitySession } from "@edu/contracts";
import { api } from "../api";
import { runtimeConfig } from "./runtime";
import { StudentClassroom } from "../features/classroom/StudentClassroom";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Radio,
  GraduationCap,
} from "lucide-react";
import "./student-home.css";
const Simulation = lazy(() =>
  import(
    "../features/port-simulation/AuthenticatedLocalPortSimulationPage"
  ).then((module) => ({
    default: module.AuthenticatedLocalPortSimulationPage,
  })),
);
const Study = lazy(() =>
  import("../features/study/StudentStudyPage").then((module) => ({
    default: module.StudentStudyPage,
  })),
);
function StudentRoutes({ identity }: { identity: ClassroomIdentitySession }) {
  const location = useLocation();
  return (
    <>
      <header className="campus-student-header">
        <nav aria-label="学生主导航">
          <Link to="/">学习</Link>
          <Link to="/tasks">实验任务</Link>
          <Link to="/submissions">我的提交</Link>
        </nav>
        <Link to="/settings">{identity.actor.displayName}</Link>
        <button
          onClick={() =>
            void api
              .logoutIdentitySession()
              .then(() => window.location.assign("/"))
          }
        >
          退出登录
        </button>
      </header>
      <Suspense fallback={<p>正在加载课程…</p>}>
        <Routes>
          <Route path="/" element={<WorkspaceHome student />} />
          <Route path="/student.html" element={<WorkspaceHome student />} />
          <Route path="/courses" element={<WorkspaceHome student />} />
          <Route
            path="/join/:sessionId"
            element={<StudentClassroom key={location.pathname} />}
          />
          <Route path="/tasks" element={<TaskWorkspace />} />
          <Route path="/submissions" element={<SubmissionHistory />} />
          <Route path="/settings" element={<PreferencesPage />} />
          <Route path="/simulations" element={<Simulation />} />
          <Route path="/study/:courseId" element={<StudentReader />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
export function StudentApp({
  identity,
}: {
  identity: ClassroomIdentitySession;
}) {
  return (
    <BrowserRouter>
      <StudentRoutes identity={identity} />
    </BrowserRouter>
  );
}

function StudentReader() {
  const { courseId } = useParams();
  return courseId === "course-port-management-intro" ? (
    <Study />
  ) : (
    <CourseReader />
  );
}
