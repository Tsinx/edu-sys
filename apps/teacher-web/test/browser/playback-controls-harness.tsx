import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PORT_LBL_SLIDES } from "../../../../packages/course-content/src/port-lbl";
import { PortLblStage } from "../../src/features/port-lbl/PortLblStage";
import { ClassroomPlaybackSlot } from "../../src/features/classroom/ClassroomPlaybackSlot";
import { ClassroomFullscreenControls } from "../../src/features/classroom/ClassroomFullscreenControls";
import { useClassroomFullscreen } from "../../src/features/classroom/useClassroomFullscreen";
import "../../src/styles.css";
import "../../src/portal.css";
import "../../src/features/classroom/classroom.css";
import "../../src/features/classroom/classroom-fullscreen.css";
import "../../src/features/globe/interactive-earth-globe.css";
import "../../src/features/port-lbl/port-lbl.css";

function Harness() {
  const [index, setIndex] = useState(0);
  const [normalSlot, setNormalSlot] = useState<HTMLDivElement | null>(null);
  const [fullscreenSlot, setFullscreenSlot] = useState<HTMLDivElement | null>(null);
  const turn = async (direction: "previous_slide" | "next_slide") => {
    setIndex(value => Math.max(0, Math.min(105, value + (direction === "next_slide" ? 1 : -1))));
  };
  const { containerRef, isFullscreen, toggleFullscreen } = useClassroomFullscreen({
    canTurnPages: true, pageIndex: index + 1, pageTotal: 106, onPageTurn: turn,
    onError: message => { throw new Error(message); }
  });
  const page = PORT_LBL_SLIDES[index]!;
  return <ClassroomPlaybackSlot.Provider value={isFullscreen ? fullscreenSlot : normalSlot}>
    <div ref={containerRef} tabIndex={-1} className="classroom-workspace" style={{ height: "100dvh", margin: 0, padding: 0, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <section className="teaching-runtime">
        <nav className="classroom-activity-tabs">课件</nav>
        <div className="teaching-stage-frame">
          <PortLblStage key={page.slideKey} page={page} readOnly={false}/>
        </div>
        <footer className="teaching-controlbar">
          <div className="slide-navigation-controls">
            <button onClick={() => void turn("previous_slide")}>上一页</button>
            <span>{page.localPage} / {page.lesson === 2 ? 52 : 54}</span>
            <button onClick={() => void turn("next_slide")}>下一页</button>
          </div>
          <div className="classroom-playback-slot" ref={setNormalSlot}/>
          <label className="lesson-select-control"><select aria-label="选择课件页" value={index} onChange={event => setIndex(Number(event.target.value))}>
            {PORT_LBL_SLIDES.map((slide, i) => <option key={slide.slideKey} value={i}>{slide.lesson} · {slide.localPage} {slide.title}</option>)}
          </select></label>
          <button aria-label="全屏" onClick={() => void toggleFullscreen()}>全屏</button>
        </footer>
      </section>
      {isFullscreen && <ClassroomFullscreenControls activity="slides" allowedActivities={["slides"]} busy={false} isLive
        pageIndex={index + 1} pageTotal={106} localIndex={page.localPage} localTotal={page.lesson === 2 ? 52 : 54}
        lessonNumber={page.lesson} avatarCollapsed playbackControlsRef={setFullscreenSlot}
        onPageTurn={direction => void turn(direction)} onActivityChange={() => {}} onToggleAvatar={() => {}}
        onExit={() => void toggleFullscreen()} onWorkspace={() => {}} onParticipation={() => {}}/>}
    </div>
  </ClassroomPlaybackSlot.Provider>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness/></StrictMode>);
