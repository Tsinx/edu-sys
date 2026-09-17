import type { ClassroomActor, ClassroomSnapshot, SlideInteractionState, SlideInteractionValues } from "@edu/contracts";
import { lessonFiveExperimentUrl } from "../port-lesson-five/navigation";
import { getPortLessonFourDemo } from "@edu/course-content";
import type { CourseDeckDescriptor } from "@edu/course-content/deck-registry";
import { BookOpen, ChevronLeft, ChevronRight, CircleAlert, FlaskConical, Focus, List, LoaderCircle, Maximize2, Radio, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { StudentParticipation } from "./ClassroomParticipation";
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
  const [deck, setDeck] = useState<CourseDeckDescriptor>();
  const [deckError, setDeckError] = useState("");
  useEffect(() => {
    let active = true; setDeck(undefined); setDeckError("");
    if (classroom.snapshot?.courseId) void import("@edu/course-content/deck-registry").then(module => {
      const next = module.getCourseDeckByCourseId(classroom.snapshot!.courseId);
      if (!next) throw new Error("当前课程尚未发布课件");
      if (active) setDeck(next);
    }).catch(reason => { if (active) setDeckError(reason.message); });
    return () => { active = false; };
  }, [classroom.snapshot?.courseId]);
  const failure = deckError || classroom.error;
  if (!classroom.snapshot || !classroom.actor || !deck) return <main className="student-classroom student-classroom--centered">
    {failure ? <CircleAlert size={32}/> : <LoaderCircle className="spin" size={32}/>}
    <h1>{failure ? "暂时无法打开课堂" : "正在加入课堂"}</h1><p>{failure || "正在准备课程与教师位置…"}</p><Link to="/">返回学习首页</Link>
  </main>;
  return <StudentWorkspace key={`${sessionId}:${classroom.actor.actorId}`} sessionId={sessionId} deck={deck} actor={classroom.actor}
    snapshot={classroom.snapshot} connected={classroom.connected} error={classroom.error}/>;
}

function StudentWorkspace({sessionId, deck, actor, snapshot, connected, error}: {
  sessionId: string; deck: CourseDeckDescriptor; actor: ClassroomActor; snapshot: ClassroomSnapshot; connected: boolean; error: string;
}) {
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
  const teacher = teacherLocation(snapshot);
  const current = navigation.following && live ? teacher : navigation.location;
  const frame = studentFrame(deck, current.index);
  const position = deck.getLessonPosition(frame.index)!;
  const teacherPosition = deck.getLessonPosition(teacher.index)!;
  const following = navigation.following && live;
  const simulation = current.activity === "simulation";
  const pageList = Array.from({length:position.localTotal}, (_, i) => deck.getSlide(position.lessonStart + i));
  useEffect(() => {
    const saved = {following, location:current};
    try { sessionStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* Optional session persistence. */ }
    if (navigation.following) setNavigation(old => JSON.stringify(old.location) === JSON.stringify(current) && old.following === following ? old : saved);
  }, [following, current.index, current.activity, current.unit, current.challenge?.id, current.challenge?.trainingMode, storageKey]);
  useEffect(() => { setPageDraft(String(position.localIndex)); }, [position.localIndex]);
  function browse(location: StudentLocation = current) { frozen.current = snapshot; setNavigation({following:false, location}); }
  function go(index: number) { browse({activity:"slides", index:Math.max(1, Math.min(deck.slideTotal, index))}); }
  function follow() { frozen.current = snapshot; setNavigation({following:true, location:teacher}); }
  function openSimulation(unit: PortCourseSelection = "arrival") { browse({activity:"simulation", index:frame.index, unit}); }
  function jump() {
    const value = Number(pageDraft);
    if (Number.isInteger(value) && value >= 1 && value <= position.localTotal) { if (value !== position.localIndex) go(position.lessonStart + value - 1); }
    else setPageDraft(String(position.localIndex));
  }
  const teacherLabel = teacher.activity === "simulation" ? `仿真系统 · ${simulationUnitLabels[teacher.unit ?? "full"]}`
    : teacher.activity === "globe" ? "地球仪 · 航线观察" : `第${teacherPosition.lessonNumber}讲 · 第${teacherPosition.localIndex}页 · ${snapshot.slide.title}`;
  const defaults = deck.getInteractionDefaults(frame.slideId);
  const localInteraction: SlideInteractionState | null = defaults ? {deckId:frame.deckId, slideId:frame.slideId, revision:1, values:interactions[frame.slideId] ?? {...defaults}} : null;
  const interaction = following ? snapshot.slideInteraction : localInteraction;
  function editInteraction(patch: SlideInteractionValues) { browse(); setInteractions(old => ({...old, [frame.slideId]:{...(interaction?.values ?? defaults), ...patch}})); }
  const detachOnControl = (target: EventTarget) => { if (following && target instanceof Element && target.closest("button,input,select,canvas,[role=button]")) browse(); };
  return <main className={`student-learning ${directory ? "student-learning--directory" : ""}`} data-following={following}>
    {fullscreen && createPortal(<div className="student-fullscreen-position"><span>{teacherLabel}</span><button disabled={!live || Boolean(error)} onClick={follow}><Focus size={16}/>{following?"正在跟随教师":"一键跟上教师"}</button></div>, fullscreen)}
    <header className="student-learning__heading">
      <Link to="/" className="student-learning__brand" aria-label="返回学习首页"><BookOpen size={23}/></Link>
      <div><p className="student-eyebrow">我的课堂</p><h1>{snapshot.courseTitle}</h1></div>
      <span className={`student-connection ${connected && live ? "is-live" : ""}`}><Radio size={14}/>{!live ? "课堂已结束" : connected ? "课堂已连接" : error ? "正在重新连接" : "轮询同步"}</span>
    </header>
    <section className="student-teacher-position" aria-label="教师当前位置">
      <div><span>{live ? "教师正在讲" : "本次课堂最后位置"}</span><strong>{teacherLabel}</strong></div>
      <button className="student-follow-button" onClick={follow} disabled={!live || Boolean(error)}><Focus size={18}/>{following ? "正在跟随教师" : "一键跟上教师"}</button>
    </section>
    {(!connected || error) && <p className="student-notice" role="status">{error || "连接恢复中，当前内容仍可浏览。教师位置将通过轮询更新。"}</p>}
    <div className="student-learning__layout">
      {directory && <><button className="student-directory-scrim" aria-label="关闭课程目录" onClick={()=>setDirectory(false)}/><aside className="student-directory" aria-label="课程目录">
        <div className="student-directory__heading"><strong>课程目录</strong><button onClick={()=>setDirectory(false)} aria-label="关闭目录"><X size={18}/></button></div>
        <label>选择课次<select aria-label="目录课次" value={position.lessonNumber} onChange={e=>{const index=deck.getGlobalIndex(Number(e.target.value));if(index)go(index);}}>{deck.lessons.map(lesson=><option key={lesson.number} value={lesson.number} disabled={lesson.status!=="ready"}>第{lesson.number}讲 · {lesson.title}</option>)}</select></label>
        <nav>{pageList.map((slide,i)=><button key={slide.slideKey} aria-current={frame.index===slide.index?"page":undefined} onClick={()=>{go(slide.index);if(window.innerWidth<800)setDirectory(false);}}><span>{String(i+1).padStart(2,"0")}</span><div>{slide.title}{teacher.index===slide.index&&<small>教师所在页</small>}</div></button>)}</nav>
      </aside></>}
      <section className="student-reader" aria-label="学生课堂画面">
        <div className="student-reader__heading"><button onClick={()=>setDirectory(!directory)} aria-expanded={directory}><List size={18}/>目录</button><span className="student-mode">{following ? "跟随教师" : "自由浏览"}</span><span className="student-reader__title">{simulation ? simulationUnitLabels[current.unit ?? "arrival"] : frame.title}</span>{following && <button onClick={()=>browse()}>自主浏览</button>}</div>
        <div className={`student-reader__stage ${simulation ? "student-reader__stage--simulation" : ""}`} onPointerDownCapture={e=>detachOnControl(e.target)} onKeyDownCapture={e=>{if(e.key==="Enter"||e.key===" ")detachOnControl(e.target);}}>
          <ClassroomPlaybackSlot.Provider value={playbackSlot}><Suspense fallback={<div className="student-loading"><LoaderCircle className="spin"/>正在装载内容…</div>}>
            {simulation ? !current.unit ? <div className="student-loading">等待教师发布课堂实验；也可以通过目录自由浏览课件。</div> : <Simulation courseId={snapshot.courseId} classSessionId={sessionId} actorId={actor.actorId} actorDisplayName={actor.displayName} storageScope={`${snapshot.courseId}:${actor.actorId}`} initialChallengeId={current.challenge?.id ?? "joint-watch"}
              initialTrainingMode={current.challenge?.trainingMode} trainingModeLocked={Boolean(current.challenge)} challengeLocked={Boolean(current.challenge)} learningStageLocked={Boolean(current.challenge)}
              initialLearningStage={current.unit} navigationUnit={current.unit} onModuleChange={unit=>browse({...current,unit})} sourceLabel={current.challenge?"课堂实验 · 个人进度独立保存":"个人实验 · 进度独立保存"}/>
              : current.activity === "globe" ? <Globe snapshot={following?snapshot:frozen.current} role="student" lamConnected={false}/>
              : current.activity === "slides" ? <PortLessonFourControls.Provider value={{scope:`student:${actor.actorId}:${sessionId}`,openDemo:cueId=>openSimulation(getPortLessonFourDemo(cueId)!.unit)}}>
                <SlideStage frame={frame} interaction={interaction} readOnly={position.lessonNumber===5&&snapshot.courseId==="course-port-management-intro"?true:following} lessonFivePresentation={following?(snapshot.lessonFivePresentation?.slideKey===frame.slideId?snapshot.lessonFivePresentation:{progress:0,revealed:false}):undefined} onInteractionPatch={editInteraction} onInteractionReset={()=>{browse();setInteractions(old=>({...old,[frame.slideId]:{...defaults}}));}}
                  presentationProgress={following && snapshot.lessonFourPresentation?.slideKey===frame.slideId?snapshot.lessonFourPresentation.progress:undefined}/>
              </PortLessonFourControls.Provider> : <ActivityStage activity={current.activity} frame={frame}/>}
          </Suspense></ClassroomPlaybackSlot.Provider>
        </div>
        {snapshot.courseId==="course-port-management-intro"&&position.lessonNumber===5&&<div className="l5-live-note">{following&&snapshot.simulationNavigation?.experiment==="l5-capacity"?`教师正在演示方案${snapshot.simulationNavigation.plan}；个人实验独立保存。`:"第5讲个人任务：从同一起点只增加运输岗位。"}<a className="l5-personal-link" href={lessonFiveExperimentUrl('C',`/join/${sessionId}`,sessionId,true)}>进入个人C实验</a></div>}
        <div className="student-playback-slot" ref={setPlaybackSlot}/>
        <nav className="student-reader__navigation" aria-label="课件导航">
          <button aria-label="上一页" disabled={frame.index<=1} onClick={()=>go(frame.index-1)}><ChevronLeft size={18}/><span>上一页</span></button>
          <label><span className="sr-only">选择课次</span><select aria-label="选择课次" value={position.lessonNumber} onChange={e=>{const index=deck.getGlobalIndex(Number(e.target.value));if(index)go(index);}}>{deck.lessons.map(lesson=><option key={lesson.number} value={lesson.number} disabled={lesson.status!=="ready"}>第{lesson.number}讲</option>)}</select></label>
          <label className="student-page-input"><input aria-label="当前讲页码" inputMode="numeric" value={pageDraft} onChange={e=>setPageDraft(e.target.value)} onBlur={jump} onKeyDown={e=>{if(e.key==="Enter")jump();if(e.key==="Escape")setPageDraft(String(position.localIndex));}}/><span>/ {position.localTotal}</span></label>
          <button aria-label="下一页" disabled={frame.index>=deck.slideTotal} onClick={()=>go(frame.index+1)}><span>下一页</span><ChevronRight size={18}/></button>
          {snapshot.courseId==="course-port-management-intro"&&position.lessonNumber===4&&<button className="student-simulation-entry" onClick={()=>openSimulation()}><FlaskConical size={18}/>仿真系统</button>}
          {simulation&&<button onClick={()=>go(frame.index)}>返回课件</button>}
          <button aria-label="全屏学习" onClick={()=>{const el=document.querySelector('.student-reader');const result=document.fullscreenElement?document.exitFullscreen():el?.requestFullscreen?.();if(!result)setNotice("当前浏览器暂不支持全屏，请横屏阅读。");void result?.catch(()=>setNotice("当前浏览器暂不支持全屏，请横屏阅读。"));}}><Maximize2 size={18}/></button>
        </nav>
        <p className="student-reader__hint">{following?"手动翻页或操作实验即可自由浏览":"你正在自由浏览，可以随时跟上教师"}{notice&&` · ${notice}`}</p>
      </section>
    </div>
    {!['statistical-analysis','management-principles'].includes(snapshot.courseId)&&<details className="student-participation"><summary>课堂互动</summary><StudentParticipation sessionId={sessionId} actor={actor}/></details>}
  </main>;
}
