import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ClassroomIdentitySession, ClassSession, Course } from "@edu/contracts";
import { api } from "../api";
import { StudentClassroom } from "../features/classroom/StudentClassroom";
const Simulation=lazy(()=>import("../features/port-simulation/AuthenticatedLocalPortSimulationPage").then(module=>({default:module.AuthenticatedLocalPortSimulationPage})));
const Study=lazy(()=>import("../features/study/StudentStudyPage").then(module=>({default:module.StudentStudyPage})));

function Home() {
  const [courses,setCourses]=useState<Course[]>([]);const [sessions,setSessions]=useState<ClassSession[]>([]);const [error,setError]=useState("");
  useEffect(()=>{void Promise.all([api.getCourses(),api.getSessions()]).then(([c,s])=>{setCourses(c);setSessions(s);}).catch(reason=>setError(reason.message));},[]);
  return <main className="campus-student-home"><p className="campus-eyebrow">学习空间</p><h1>从今天的课堂开始</h1><p>课前下载课程资源，课后继续实验与复盘。</p>{error&&<p role="alert">{error}</p>}
    <div className="campus-course-grid">{courses.filter(course=>course.status!=="archived").map(course=><article key={course.id}><h2>{course.title}</h2><p>{course.currentLesson.summary}</p>
      {sessions.filter(session=>session.courseId===course.id&&session.status==="live").map(session=><Link key={session.id} to={`/join/${session.id}`}>进入正在进行的课堂</Link>)}
      {course.id==="course-port-management-intro"&&<><Link to={`/study/${course.id}`}>课下学习与答疑</Link><Link to="/simulations">本地港口仿真</Link></>}
    </article>)}</div></main>;
}
function StudentRoutes({identity}:{identity:ClassroomIdentitySession}) {
  const location=useLocation();
  return <><header className="campus-student-header"><Link to="/">我的学习</Link><span>{identity.actor.displayName}</span><button onClick={()=>void api.logoutIdentitySession().then(()=>window.location.assign("/"))}>退出登录</button></header>
    <Suspense fallback={<p>正在加载课程…</p>}><Routes>
      <Route path="/" element={<Home/>}/><Route path="/student.html" element={<Home/>}/><Route path="/courses" element={<Home/>}/>
      <Route path="/join/:sessionId" element={<StudentClassroom key={location.pathname}/>}/>
      <Route path="/simulations" element={<Simulation/>}/><Route path="/study/:courseId" element={<Study/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes></Suspense></>;
}
export function StudentApp({identity}:{identity:ClassroomIdentitySession}) {return <BrowserRouter><StudentRoutes identity={identity}/></BrowserRouter>;}
