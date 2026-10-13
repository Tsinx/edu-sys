import '../../src/features/classroom/page-tools.css';
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PORT_LBL_SLIDES } from "../../../../packages/course-content/src/port-lbl";
import { PortLblStage } from "../../src/features/port-lbl/PortLblStage";
import { PageToolsProvider, PresentationToolbar } from "../../src/features/classroom/PageTools";
import { useClassroomFullscreen } from "../../src/features/classroom/useClassroomFullscreen";
import { FullscreenButtons } from "../../src/features/classroom/FullscreenButtons";
import "../../src/styles.css";
import "../../src/portal.css";
import "../../src/features/classroom/classroom.css";
import "../../src/features/classroom/classroom-fullscreen.css";
import "../../src/features/globe/interactive-earth-globe.css";
import "../../src/features/port-lbl/port-lbl.css";

function Harness() {
  const [index, setIndex] = useState(0);
  const turn = async (direction: "previous_slide" | "next_slide") => {
    setIndex(value => Math.max(0, Math.min(105, value + (direction === "next_slide" ? 1 : -1))));
  };
  const fullscreen = useClassroomFullscreen({
    canTurnPages: true, pageIndex: index + 1, pageTotal: 106, onPageTurn: turn,
    onError: message => { throw new Error(message); }
  });
  const page = PORT_LBL_SLIDES[index]!;
  return <PageToolsProvider pageKey={page.slideKey}>
    <div ref={fullscreen.containerRef} tabIndex={-1} className={`classroom-workspace ${fullscreen.fullscreenClassName}`} style={{ height: "100dvh", margin: 0, padding: 0, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <section className="teaching-runtime">
        <nav className="classroom-activity-tabs">课件</nav>
        <div className="teaching-stage-frame">
          <PortLblStage key={page.slideKey} page={page} readOnly={false}/>
        </div>
        <PresentationToolbar navigation={<div className="presentation-slide-navigation">
            <button onClick={() => void turn("previous_slide")}>上一页</button>
            <span>{page.localPage} / {page.lesson === 2 ? 52 : 54}</span>
            <button onClick={() => void turn("next_slide")}>下一页</button>
          </div>} more={<label className="lesson-select-control"><select aria-label="选择课件页" value={index} onChange={event => setIndex(Number(event.target.value))}>
            {PORT_LBL_SLIDES.map((slide, i) => <option key={slide.slideKey} value={i}>{slide.lesson} · {slide.localPage} {slide.title}</option>)}
          </select></label>} end={<FullscreenButtons controls={fullscreen}/>}/>

      </section>

    </div>
  </PageToolsProvider>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness/></StrictMode>);
