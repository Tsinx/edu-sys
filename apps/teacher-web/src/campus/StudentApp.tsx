import {ActivityHistory} from "../features/activities/ActivityWorkspace";
import {
  WorkspaceHome,
  TaskWorkspace,
  SubmissionHistory,
  CourseReader,
  PreferencesPage,
  NotFound,
} from "../portal/WorkspacePages";
import { lazy, Suspense, useEffect, useState } from "react";
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
  const [classroomLocale, setClassroomLocale] = useState("zh-CN");
  useEffect(() => {
    const update = (event: Event) => setClassroomLocale((event as CustomEvent<string>).detail);
    window.addEventListener("student-course-locale", update);
    return () => window.removeEventListener("student-course-locale", update);
  }, []);
  const english = location.pathname.includes("/course-international-mathematics") || (location.pathname.startsWith("/join/") && classroomLocale === "en");
  const t = (zh: string, en: string) => english ? en : zh;
  return (
    <>
      <header className="campus-student-header">
        <nav aria-label={t("学生主导航", "Student navigation")}>
          <Link to="/">{t("学习", "Learning")}</Link>
          <Link to="/tasks">{t("实验任务", "Tasks")}</Link>
          <Link to="/submissions">{t("我的提交", "My submissions")}</Link>
        </nav>
        <Link to="/settings">{identity.actor.displayName}</Link>
        <button
          onClick={() =>
            void api
              .logoutIdentitySession()
              .then(() => window.location.assign("/"))
          }
        >
          {t("退出登录", "Sign out")}
        </button>
      </header>
      <Suspense fallback={<p>{t("正在加载课程…", "Loading course…")}</p>}>
        <Routes>
          <Route path="/" element={<WorkspaceHome student />} />
          <Route path="/student.html" element={<WorkspaceHome student />} />
          <Route path="/courses" element={<WorkspaceHome student />} />
          <Route
            path="/join/:sessionId"
            element={<StudentClassroom key={location.pathname} />}
          />
          <Route path="/courses/:courseId/activity-history" element={<ActivityHistory student/>}/>
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
