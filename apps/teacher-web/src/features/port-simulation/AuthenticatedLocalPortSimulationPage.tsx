import { AuthenticatedCapacityPage } from "../port-lesson-five/AuthenticatedCapacityPage";
import type { ClassroomActor } from "@edu/contracts";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import type { PortCourseSelection } from "@edu/port-simulation-core";
import { simulationUnitLabels } from "../classroom/student-navigation";
import { api } from "../../api";
import { LocalPortSimulationStage } from "./LocalPortSimulationStage";
import { getPortLessonFourDemo, type PortDemoCueId } from "@edu/course-content";
import { lessonFourReturnPath } from "../port-lesson-four/experiment-navigation";

export function AuthenticatedLocalPortSimulationPage() {
  const [actor, setActor] = useState<ClassroomActor>();
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [origin, setOrigin] = useState<string>();
  const queue = useRef(Promise.resolve());
  const query = new URLSearchParams(window.location.search);
  const isCapacity = query.get("experiment") === "l5-capacity";
  const lectureDemo = getPortLessonFourDemo(query.get("lesson4") as PortDemoCueId);
  const returnTo = lessonFourReturnPath(query.get("returnTo"));
  const sessionId = query.get("session");
  const initialUnit = query.get("course") as PortCourseSelection;

  useEffect(() => {
    if (isCapacity || !sessionId || !actor?.roles.includes("teacher")) return;
    let active = true;
    void api.getClassroomSnapshot(sessionId).then(snapshot => {
      if (active) setOrigin(snapshot.simulationNavigation?.originSlideKey ?? snapshot.slide.slideId);
    }).catch(reason => { if (active) setSyncError(reason.message); });
    return () => { active = false; };
  }, [sessionId, actor]);

  function publish(unit: PortCourseSelection) {
    if (isCapacity || !sessionId || !origin || !actor?.roles.includes("teacher")) return;
    queue.current = queue.current.then(async () => {
      await api.sendClassroomEvent(sessionId, {type:"set_simulation_navigation",navigation:{unit,originSlideKey:origin}});
      setSyncError("");
    }).catch(reason => setSyncError(`课堂定位尚未更新：${reason.message}`));
  }
  function selectModule(unit: PortCourseSelection) {
    const next = new URL(window.location.href);
    next.searchParams.set("course", unit);
    window.history.replaceState(window.history.state, "", next);
    publish(unit);
  }
  useEffect(() => {
    if (origin) publish(Object.hasOwn(simulationUnitLabels, initialUnit) ? initialUnit : lectureDemo?.unit ?? "arrival");
  }, [origin]);

  async function returnToSlides() {
    if (sessionId && actor?.roles.includes("teacher")) {
      await queue.current;
      try { await api.sendClassroomEvent(sessionId, {type:"set_simulation_navigation",navigation:null}); }
      catch (reason) { setSyncError((reason as Error).message); }
    }
    if (returnTo) window.location.assign(returnTo);
  }

  useEffect(() => {
    let active = true;
    const resolveIdentity = async () => {
      try {
        let identity;
        try {
          identity = await api.getIdentitySession();
        } catch (reason) {
          if (!import.meta.env.DEV) throw reason;
          identity = await api.createDevelopmentIdentitySession("student");
        }
        if (active) setActor(identity.actor);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void resolveIdentity();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <section className="port-local-auth-state" role="alert">
        <CircleAlert aria-hidden="true" />
        <h1>请先登录教学信息系统</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!actor) {
    return (
      <section className="port-local-auth-state" role="status">
        <LoaderCircle className="spin" aria-hidden="true" />
        <h1>正在确认登录身份</h1>
        <p>身份确认完成后，港口仿真将在当前浏览器本地运行。</p>
      </section>
    );
  }

  if (isCapacity) return <AuthenticatedCapacityPage actor={actor}/>;
  if (sessionId && !actor.roles.includes("teacher")) return <Navigate to={`/join/${encodeURIComponent(sessionId)}`} replace/>;
  return (
    <>
    {returnTo && <nav className="port-course-return" aria-label="课件与实验导航">
      <a href={returnTo} onClick={event=>{event.preventDefault();void returnToSlides();}}>← 返回课件</a>
      <span>第4讲 · 完整实验系统{sessionId ? " · 课堂关联实验" : ""}</span>
    </nav>}
    {syncError && <p role="status">{syncError}</p>}
    <LocalPortSimulationStage
      classSessionId={sessionId ?? undefined}
      actorId={actor.actorId}
      actorDisplayName={actor.displayName}
      storageScope={lectureDemo ? `teacher-lesson-four:${actor.actorId}:${query.get("scope") ?? "standalone"}` : `standalone:${actor.actorId}`}
      initialLearningStage={Object.hasOwn(simulationUnitLabels, initialUnit) ? initialUnit : lectureDemo?.unit}
      onModuleChange={selectModule}
      initialChallengeId="joint-watch"
      sourceLabel={`${actor.identitySource === "development" ? "开发身份" : "校园账号"}已确认`}
    />
    </>
  );
}
