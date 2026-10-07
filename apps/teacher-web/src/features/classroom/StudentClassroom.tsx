import type { ClassroomActor, ClassroomSnapshot, SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import { lessonFiveExperimentUrl } from "../port-lesson-five/navigation";
import { PortLessonSixControls } from '../port-lesson-six/PortLessonSixStage';
import { getPortLessonFourDemo } from "@edu/course-content";
import { getCourseAdjacentIndex, getCourseLessonLabel, type CourseDeckDescriptor } from "@edu/course-content/deck-registry";
import { BookOpen, ChevronLeft, ChevronRight, CircleAlert, FlaskConical, Focus, List, LoaderCircle, Maximize2, Radio, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { StudentParticipation } from "./ClassroomParticipation";
import { ClassroomRankedPractice } from "../ranked-practice/RankedPractice";
import { ActivityStage, SlideStage } from "./TeachingSlides";
import { ClassroomPlaybackSlot } from "./ClassroomPlaybackSlot";
import { useStudentClassroom } from "./useStudentClassroom";
import { restoreStudentNavigation, simulationUnitLabels, studentFrame, teacherLocation, type StudentLocation, type StudentNavigation } from "./student-navigation";
import { PortLessonFourControls } from "../port-lesson-four/PortLessonFourStage";
import type { PortCourseSelection } from "@edu/port-simulation-core";
import "./classroom.css";
import "./student-classroom.css";

const Globe = lazy(() => import("./ClassroomGlobeStage").then(m => ({default:m.ClassroomGlobeStage})));
const Simulation = lazy(() => import("../port-simulation/LocalPortSimulationStage").then(m => ({default:m.LocalPortSimulationStage})));

export function StudentClassroom() {
  const { sessionId = "" } = useParams();
  const classroom = useStudentClassroom(sessionId);
  const t = (zh: string, en: string) => classroom.snapshot?.courseId === "course-international-mathematics" ? en : zh;
  const [deck, setDeck] = useState<CourseDeckDescriptor>();
  const [deckError, setDeckError] = useState("");
  useEffect(() => {
    let active = true; setDeck(undefined); setDeckError("");
    if (classroom.snapshot?.courseId) void import("@edu/course-content/deck-registry").then(module => {
      const next = module.getCourseDeckByCourseId(classroom.snapshot!.courseId);
      if (!next) throw new Error(t("当前课程尚未发布课件", "Course slides are not published yet"));
      if (active) setDeck(next);
    }).catch(reason => { if (active) setDeckError(reason.message); });
    return () => { active = false; };
  }, [classroom.snapshot?.courseId]);
  const failure = deckError || classroom.error;
  if (!classroom.snapshot || !classroom.actor || !deck) return <main className="student-classroom student-classroom--centered">
    {failure ? <CircleAlert size={32}/> : <LoaderCircle className="spin" size={32}/>}
    <h1>{failure ? t("暂时无法打开课堂", "Unable to open this classroom") : t("正在加入课堂", "Joining classroom")}</h1><p>{failure || t("正在准备课程与教师位置…", "Preparing course and teacher position\u2026")}</p><Link to="/">{t("返回学习首页", "Return to learning home")}</Link>
  </main>;
  return <StudentWorkspace key={`${sessionId}:${classroom.actor.actorId}`} sessionId={sessionId} deck={deck} actor={classroom.actor}
    snapshot={classroom.snapshot} connected={classroom.connected} error={classroom.error}/>;
}

function StudentWorkspace({sessionId, deck, actor, snapshot, connected, error}: {
  sessionId: string; deck: CourseDeckDescriptor; actor: ClassroomActor; snapshot: ClassroomSnapshot; connected: boolean; error: string;
}) {
  const t = (zh: string, en: string) => deck.locale === "en" ? en : zh;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("student-course-locale", {detail: deck.locale ?? "zh-CN"}));
    return () => {window.dispatchEvent(new CustomEvent("student-course-locale", {detail: "zh-CN"}));};
  }, [deck.locale]);
  const storageKey = `edu-student-navigation:${actor.actorId}:${sessionId}`;
  const [navigation, setNavigation] = useState<StudentNavigation>(() => {
    try { const restored = restoreStudentNavigation(sessionStorage.getItem(storageKey), deck); if (restored) return restored; } catch { /* Browsing also works without storage. */ }
    return {following:true, location:teacherLocation(snapshot)};
  });
  const [directory, setDirectory] = useState(false);
  const [pageDraft, setPageDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [playbackSlot, setPlaybackSlot] = useState<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState<Element | null>(null);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const [interactions, setInteractions] = useState<Record<string, SlideInteractionValues>>({});
  const frozen = useRef(snapshot);
  const live = snapshot.session.status === "live";
  const syncOnly = snapshot.courseId === "management-principles";
  const teacher = teacherLocation(snapshot);
  const current = syncOnly || (navigation.following && live) ? teacher : navigation.location;
  const frame = syncOnly ? snapshot.slide : studentFrame(deck, current.index);
  const position = deck.getLessonPosition(frame.index)!;
  const teacherPosition = deck.getLessonPosition(teacher.index)!;
  const following = syncOnly || (navigation.following && live);
  const simulation = current.activity === "simulation";
  const pageList = Array.from({length:position.localTotal}, (_, i) => deck.getSlide(position.lessonStart + i));
  useEffect(() => {
    const saved = {following, location:current,deckVersion:deck.versionId,slideKey:deck.getSlide(current.index).slideKey};
    try { sessionStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Optional session persistence. */ }
    if (navigation.following) setNavigation(old => JSON.stringify(old.location) === JSON.stringify(current) && old.following === following ? old : saved);
  }, [following, current.index, current.activity, current.unit, current.challenge?.id, current.challenge?.trainingMode, storageKey]);
  useEffect(() => { setPageDraft(String(position.localIndex)); }, [position.localIndex]);
  function browse(location: StudentLocation = current) { if(syncOnly)return; frozen.current = snapshot; setNavigation({following:false, location}); }
  function go(index: number) { browse({activity:"slides", index:Math.max(1, Math.min(deck.slideTotal, index))}); }
  function follow() { frozen.current = snapshot; setNavigation({following:true, location:teacher}); }
  function openSimulation(unit: PortCourseSelection = "arrival") { browse({activity:"simulation", index:frame.index, unit}); }
  function jump() {
    const value = Number(pageDraft);
    if (Number.isInteger(value) && value >= 1 && value <= position.localTotal) { if (value !== position.localIndex) go(position.lessonStart + value - 1); }
    else setPageDraft(String(position.localIndex));
  }
  const teacherLabel = teacher.activity === "simulation" ? `仿真系统 · ${simulationUnitLabels[teacher.unit ?? "full"]}`
    : teacher.activity === "globe" ? "地球仪 · 航线观察" : `${getCourseLessonLabel(deck.lessons.find(l=>l.number===teacherPosition.lessonNumber)!, deck.locale)} · ${t(`第${teacherPosition.localIndex}页`, `Page ${teacherPosition.localIndex}`)} · ${snapshot.slide.title}`;
  const defaults = deck.getInteractionDefaults(frame.slideId);
  const localInteraction: SlideInteractionState | null = defaults ? {deckId:frame.deckId, slideId:frame.slideId, revision:1, values:interactions[frame.slideId] ?? {...defaults}} : null;
  const interaction = following ? snapshot.slideInteraction : localInteraction;
  function editInteraction(patch: SlideInteractionValues) { if(syncOnly)return; browse(); setInteractions(old => ({...old, [frame.slideId]:{...(interaction?.values ?? defaults), ...patch}})); }
  const detachOnControl = (target: EventTarget) => { if (following && target instanceof Element && !target.closest("[data-l6-audio-control],[data-im-audio-control]") && target.closest("button,input,select,canvas,[role=button]")) browse(); };
  return <main lang={deck.locale ?? "zh-CN"} className={`student-learning ${directory ? "student-learning--directory" : ""}`} data-following={following}>
    {fullscreen && createPortal(<div className="student-fullscreen-position"><span>{teacherLabel}</span><button disabled={!live || Boolean(error)} onClick={follow}><Focus size={16}/>{following?t("正在跟随教师", "Following teacher"):t("一键跟上教师", "Follow teacher")}</button></div>, fullscreen)}
    <header className="student-learning__heading"><a className="student-activity-link" href="#student-activities" onClick={()=>{const panel=document.getElementById("student-activities");if(panel instanceof HTMLDetailsElement)panel.open=true;}}>{t("课堂活动", "Class activities")}</a>
      <Link to="/" className="student-learning__brand" aria-label={t("返回学习首页", "Return to learning home")}><BookOpen size={23}/></Link>
      <div><p className="student-eyebrow">{t("我的课堂", "My classroom")}</p><h1>{snapshot.courseTitle}</h1></div>
      <span className={`student-connection ${connected && live ? "is-live" : ""}`}><Radio size={14}/>{!live ? t("课堂已结束", "Class ended") : connected ? t("课堂已连接", "Connected") : error ? t("正在重新连接", "Reconnecting") : t("轮询同步", "Synchronizing")}</span>
    </header>
    <section className="student-teacher-position" aria-label={t("教师当前位置", "Teacher position")}>
      <div><span>{live ? t("教师正在讲", "Teacher is presenting") : t("本次课堂最后位置", "Last classroom position")}</span><strong>{teacherLabel}</strong></div>
      <button className="student-follow-button" onClick={follow} disabled={!live || Boolean(error)}><Focus size={18}/>{following ? t("正在跟随教师", "Following teacher") : t("一键跟上教师", "Follow teacher")}</button>
    </section>
    {(!connected || error) && <p className="student-notice" role="status">{error || t("连接恢复中，当前内容仍可浏览。教师位置将通过轮询更新。", "Reconnecting. You can still browse; teacher position updates continue.")}</p>}
    <div className="student-learning__layout">
      {!syncOnly && directory && <><button className="student-directory-scrim" aria-label={t("关闭课程目录", "Close course contents")} onClick={()=>setDirectory(false)}/><aside className="student-directory" aria-label={t("课程目录", "Course contents")}>
        <div className="student-directory__heading"><strong>{t("课程目录", "Course contents")}</strong><button onClick={()=>setDirectory(false)} aria-label={t("关闭目录", "Close contents")}><X size={18}/></button></div>
        <label>{t("选择课次", "Select lecture")}<select aria-label={t("目录课次", "Lecture in contents")} value={position.lessonNumber} onChange={e=>{const index=deck.getGlobalIndex(Number(e.target.value));if(index)go(index);}}>{deck.lessons.map(lesson=><option key={lesson.number} value={lesson.number} disabled={lesson.status!=="ready"}>{getCourseLessonLabel(lesson, deck.locale)} · {lesson.title}</option>)}</select></label>
        <nav>{pageList.map((slide,i)=><button key={slide.slideKey} aria-current={frame.index===slide.index?"page":undefined} onClick={()=>{go(slide.index);if(window.innerWidth<800)setDirectory(false);}}><span>{String(i+1).padStart(2,"0")}</span><div>{slide.title}{teacher.index===slide.index&&<small>{t("教师所在页", "Teacher is here")}</small>}</div></button>)}</nav>
      </aside></>}
      <section className="student-reader" aria-label={t("学生课堂画面", "Classroom view")}>
        <div className="student-reader__heading">{!syncOnly&&<button onClick={()=>setDirectory(!directory)} aria-expanded={directory}><List size={18}/>{t("目录", "Contents")}</button>}<span className="student-mode">{following ? t("跟随教师", "Following teacher") : t("自由浏览", "Independent browsing")}</span><span className="student-reader__title">{simulation ? simulationUnitLabels[current.unit ?? "arrival"] : frame.title}</span>{following && !syncOnly && <button onClick={()=>browse()}>{t("自主浏览", "Browse independently")}</button>}</div>
        <div className={`student-reader__stage ${simulation ? "student-reader__stage--simulation" : ""}`} onPointerDownCapture={e=>detachOnControl(e.target)} onKeyDownCapture={e=>{if(e.key==="Enter"||e.key===" ")detachOnControl(e.target);}}>
          <ClassroomPlaybackSlot.Provider value={playbackSlot}><Suspense fallback={<div className="student-loading"><LoaderCircle className="spin"/>{t("正在装载内容…", "Loading content\u2026")}</div>}>
            {simulation ? !current.unit ? <div className="student-loading">{t("等待教师发布课堂实验；也可以通过目录自由浏览课件。", "Waiting for the teacher. You can browse slides using the contents.")}</div> : <Simulation courseId={snapshot.courseId} classSessionId={sessionId} actorId={actor.actorId} actorDisplayName={actor.displayName} storageScope={`${snapshot.courseId}:${actor.actorId}`} initialChallengeId={current.challenge?.id ?? "joint-watch"}
              initialTrainingMode={current.challenge?.trainingMode} challengeLocked={Boolean(current.challenge)}
              initialLearningStage={current.unit} navigationUnit={current.unit} onModuleChange={unit=>browse({...current,unit})} sourceLabel={current.challenge?"课堂实验 · 个人进度独立保存":"个人实验 · 进度独立保存"}/>
              : current.activity === "globe" ? <Globe snapshot={following?snapshot:frozen.current} role="student" lamConnected={false}/>
              : current.activity === "slides" ? <PortLessonSixControls.Provider value={{scope:`browse:${actor.actorId}:${sessionId}`}}><PortLessonFourControls.Provider value={{scope:`student:${actor.actorId}:${sessionId}`,openDemo:cueId=>openSimulation(getPortLessonFourDemo(cueId)!.unit)}}>
                <SlideStage frame={frame} interaction={interaction} playbackMode={following ? "student" : "reader"} serverNowMs={following ? snapshot.serverNowMs : undefined} readOnly={[5,7,8,9,10].includes(position.lessonNumber)&&snapshot.courseId==="course-port-management-intro"?true:following} onNavigate={following?undefined:index=>browse({...current,index,activity:'slides'})} lessonFivePresentation={following?(snapshot.lessonFivePresentation?.slideKey===frame.slideId?snapshot.lessonFivePresentation:{progress:0,revealed:false}):undefined} onInteractionPatch={editInteraction} onInteractionReset={()=>{browse();setInteractions(old=>({...old,[frame.slideId]:{...defaults}}));}}
                  portExpansionPresentation={following?(snapshot.portExpansionPresentation?.slideKey===frame.slideId?snapshot.portExpansionPresentation:{progress:0,revealed:false,option:0}):undefined}
                  lessonSixPresentation={following?(snapshot.lessonSixPresentation?.slideKey===frame.slideId?snapshot.lessonSixPresentation:{progress:0,revealed:false,option:0}):undefined}
                  presentationProgress={following && snapshot.lessonFourPresentation?.slideKey===frame.slideId?snapshot.lessonFourPresentation.progress:undefined}/>
              </PortLessonFourControls.Provider></PortLessonSixControls.Provider> : <ActivityStage activity={current.activity} frame={frame}/>}
          </Suspense></ClassroomPlaybackSlot.Provider>
        </div>
        {snapshot.courseId==="course-port-management-intro"&&position.lessonNumber===5&&<div className="l5-live-note">{following&&snapshot.simulationNavigation?.experiment==="l5-capacity"?`教师正在演示方案${snapshot.simulationNavigation.plan}；个人实验独立保存。`:"第5讲个人任务：从同一起点只增加运输岗位。"}<a className="l5-personal-link" href={lessonFiveExperimentUrl('C',`/join/${sessionId}`,sessionId,true)}>进入个人C实验</a></div>}
        <div className="student-playback-slot" ref={setPlaybackSlot}/>
        <nav className="student-reader__navigation" aria-label={t("课件导航", "Slide navigation")}>
          <button aria-label={t("上一页", "Previous")} disabled={syncOnly || getCourseAdjacentIndex(deck,frame.index,-1)===null} onClick={()=>go(getCourseAdjacentIndex(deck,frame.index,-1)??frame.index)}><ChevronLeft size={18}/><span>{t("上一页", "Previous")}</span></button>
          <label><span className="sr-only">{t("选择课次", "Select lecture")}</span><select disabled={syncOnly} aria-label={t("选择课次", "Select lecture")} value={position.lessonNumber} onChange={e=>{const index=deck.getGlobalIndex(Number(e.target.value));if(index)go(index);}}>{deck.lessons.map(lesson=><option key={lesson.number} value={lesson.number} disabled={lesson.status!=="ready"}>{getCourseLessonLabel(lesson, deck.locale)}</option>)}</select></label>
          <label className="student-page-input"><input readOnly={syncOnly} aria-label={t("当前讲页码", "Page in this lecture")} inputMode="numeric" value={pageDraft} onChange={e=>setPageDraft(e.target.value)} onBlur={jump} onKeyDown={e=>{if(e.key==="Enter")jump();if(e.key==="Escape")setPageDraft(String(position.localIndex));}}/><span>/ {position.localTotal}</span></label>
          <button aria-label={t("下一页", "Next")} disabled={syncOnly || getCourseAdjacentIndex(deck,frame.index,1)===null} onClick={()=>go(getCourseAdjacentIndex(deck,frame.index,1)??frame.index)}><span>{t("下一页", "Next")}</span><ChevronRight size={18}/></button>
          {snapshot.courseId==="course-port-management-intro"&&position.lessonNumber===4&&<button className="student-simulation-entry" onClick={()=>openSimulation()}><FlaskConical size={18}/>仿真系统</button>}
          {simulation&&<button onClick={()=>go(frame.index)}>{t("返回课件", "Back to slides")}</button>}
          <button aria-label={t("全屏学习", "Fullscreen")} onClick={()=>{const el=document.querySelector('.student-reader');const result=document.fullscreenElement?document.exitFullscreen():el?.requestFullscreen?.();if(!result)setNotice(t("当前浏览器暂不支持全屏，请横屏阅读。", "Fullscreen is unavailable. Rotate your device to landscape."));void result?.catch(()=>setNotice(t("当前浏览器暂不支持全屏，请横屏阅读。", "Fullscreen is unavailable. Rotate your device to landscape.")));}}><Maximize2 size={18}/></button>
        </nav>
        <p className="student-reader__hint">{syncOnly?t("教师控制翻页与演示，当前画面同步显示", "The teacher controls slides and demonstrations."):following?t("手动翻页或操作实验即可自由浏览", "Navigate to browse independently."):t("你正在自由浏览，可以随时跟上教师", "You are browsing independently. Follow the teacher at any time.")}{notice&&` · ${notice}`}</p>
      </section>
    </div>
    {snapshot.courseId==='course-international-mathematics'&&<ClassroomRankedPractice sessionId={sessionId} actor={actor}/>}
    <details id="student-activities" className="student-participation"><summary>{t("课堂互动", "Class activities")}</summary><StudentParticipation sessionId={sessionId} actor={actor} locale={deck.locale}/></details>
  </main>;
}
