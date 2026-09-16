import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ClassroomIdentitySession, ClassSession, Course } from "@edu/contracts";
import { api } from "../api";
import { runtimeConfig } from "./runtime";
import { StudentClassroom } from "../features/classroom/StudentClassroom";
import { ArrowRight, BookOpen, FlaskConical, Radio, GraduationCap } from "lucide-react";
import "./student-home.css";
const Simulation=lazy(()=>import("../features/port-simulation/AuthenticatedLocalPortSimulationPage").then(module=>({default:module.AuthenticatedLocalPortSimulationPage})));
const Study=lazy(()=>import("../features/study/StudentStudyPage").then(module=>({default:module.StudentStudyPage})));
const courseIntroductions: Record<string,string> = {
  "course-port-management-intro":"沿货物、航线与港口网络，理解现代港口运营。",
  "statistical-analysis":"从数据描述、抽样推断走向经营问题分析。",
  "management-principles":"从组织与环境出发，理解计划、决策与管理实践。",
  "course-economic-mathematics":"用函数、导数和积分理解经济活动中的数量关系。"
};

function Home() {
  const [courses,setCourses]=useState<Course[]>([]);const [sessions,setSessions]=useState<ClassSession[]>([]);const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;const refresh=()=>void Promise.all([api.getCourses(),api.getSessions()]).then(([c,s])=>{if(active){setCourses(c);setSessions(s);setError("");}}).catch(reason=>{if(active)setError(reason.message);}).finally(()=>{if(active)setLoading(false);});refresh();const timer=setInterval(refresh,30000);return()=>{active=false;clearInterval(timer);};},[]);
  const available=courses.filter(course=>course.status!=="archived");
  const live=sessions.filter(session=>session.status==="live"&&available.some(course=>course.id===session.courseId));
  return <main className="campus-student-home student-home">
    <section className="student-home-hero"><div><p className="campus-eyebrow">LEARNING SPACE · 学习空间</p><h1>按自己的节奏，<br/>跟上每一堂课。</h1><p>回看课件，探索实验，随时回到教师正在讲解的地方。</p><div className="student-home-stats"><span><strong>{available.length}</strong> 门课程</span><span><strong>{live.length}</strong> 堂课正在进行</span></div></div><div className="student-home-mark" aria-hidden="true"><GraduationCap size={74}/><span>发现 · 理解 · 实践</span></div></section>
    {error&&<p role="alert">课程暂未更新：{error}</p>}
    <section className="student-live-section" aria-label="正在上课"><div className="student-section-title"><h2><Radio size={19}/>正在上课</h2><span>课堂位置实时更新，自主浏览随时可用</span></div>
      {loading?<p>正在读取课堂…</p>:live.length?<div className="student-live-grid">{live.map(session=><Link className="student-live-card" key={session.id} to={`/join/${session.id}`}><div><span className="student-live-badge">进行中</span><h3>{courses.find(course=>course.id===session.courseId)?.title}</h3><p>进入课堂 · 一键跟上教师</p></div><ArrowRight size={23}/></Link>)}</div>:<p className="student-home-empty">现在没有正在进行的课堂，可以先回看课件或继续实验。</p>}
    </section>
    <div className="student-section-title"><h2><BookOpen size={19}/>我的课程</h2><span>每一次探索，都可以继续</span></div>
    <div className="campus-course-grid">{available.map((course,index)=><article key={course.id}><div className="student-course-top"><span className="student-course-number">{String(index+1).padStart(2,"0")}</span><BookOpen size={21}/></div><h2>{course.title}</h2><p>{courseIntroductions[course.id] ?? course.currentLesson.summary}</p><div className="student-course-actions">{course.id!=="course-port-management-intro"&&!sessions.some(s=>s.courseId===course.id)&&<span className="student-course-waiting">等待教师开启课堂</span>}
      {course.id==="course-port-management-intro"?<><Link to={`/study/${course.id}`}>继续学习{runtimeConfig.studentAiEnabled !== false&&"与答疑"}<ArrowRight size={16}/></Link><Link to="/simulations"><FlaskConical size={16}/>仿真系统</Link></>:sessions.filter(s=>s.courseId===course.id).slice(0,1).map(s=><Link key={s.id} to={`/join/${s.id}`}>{s.status==="live"?"进入课堂":"回看课件"}<ArrowRight size={16}/></Link>)}
    </div></article>)}</div>{!loading&&!available.length&&<p className="student-home-empty">课程发布后会显示在这里。</p>}</main>;
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
