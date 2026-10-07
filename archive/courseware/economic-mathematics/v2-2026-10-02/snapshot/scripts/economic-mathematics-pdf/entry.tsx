import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  ECONOMIC_MATHEMATICS_DECK_ID,
  ECONOMIC_MATHEMATICS_VERSION_ID,
  ECONOMIC_MATHEMATICS_LESSONS,
  ECONOMIC_MATHEMATICS_SLIDES,
  getEconomicMathematicsInteractionDefinition
} from "../../packages/course-content/src/economic-mathematics/index.ts";
import { EconomicMathematicsTeachingSlides } from "../../apps/teacher-web/src/features/economic-mathematics/EconomicMathematicsTeachingSlides.tsx";
import { EconomicMathematicsSlideStage } from "../../apps/teacher-web/src/features/economic-mathematics/EconomicMathematicsSlideStage.tsx";
import "../../apps/teacher-web/node_modules/katex/dist/katex.min.css";
import "../../apps/teacher-web/src/features/economic-mathematics/economic-mathematics.css";
import "./print.css";

declare global {
  interface Window {
    __ECON_PDF_READY__?: {
      ready: boolean;
      slideCount: number;
      firstSlide: number;
      lastSlide: number;
      imageFailures: string[];
      sections: Array<{
        lesson: number;
        lessonTitle: string;
        slideCount: number;
        firstSlide: number;
        lastSlide: number;
      }>;
    };
  }
}

const query = new URLSearchParams(window.location.search);
const metadataOnly = query.get("metadata") === "1";
const selectedLessonNumbers = (query.get("lessons") ?? query.get("lesson") ?? "1")
  .split(",")
  .map((value) => Number(value))
  .filter((value, index, values) => Number.isInteger(value) && values.indexOf(value) === index)
  .sort((a, b) => a - b);
const selectedLessons = selectedLessonNumbers.map((lessonNumber) => {
  const lesson = ECONOMIC_MATHEMATICS_LESSONS.find(
    (candidate) => candidate.number === lessonNumber
  );
  if (!lesson) {
    throw new Error(`ECONOMIC_MATHEMATICS_PDF_UNKNOWN_LESSON:${lessonNumber}`);
  }
  return lesson;
});

const slides = ECONOMIC_MATHEMATICS_SLIDES.filter(
  (slide) => selectedLessonNumbers.includes(slide.lesson)
);

function ExportDeck() {
  return (
    <div className="econmath-pdf-deck" aria-label={`经济数学第${selectedLessonNumbers.join("、")}讲课件`}>
      {slides.map((spec) => {
        const definition = getEconomicMathematicsInteractionDefinition(spec);
        const interaction = definition
          ? {
              deckId: ECONOMIC_MATHEMATICS_DECK_ID,
              slideId: spec.slideKey,
              revision: 1,
              values: { ...definition.defaults, presentationStep:spec.steps?.length??0, ...Object.fromEntries(Object.keys(definition.defaults).filter(k=>k.startsWith("reveal")).map(k=>[k,true])) }
            }
          : null;
        return (
          <section
            className="econmath-pdf-sheet"
            data-export-index={spec.index}
            key={spec.slideKey}
          >
            <EconomicMathematicsTeachingSlides
              interaction={interaction}
              readOnly
              spec={spec}
            />
          </section>
        );
      })}
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("ECONOMIC_MATHEMATICS_PDF_ROOT_MISSING");
function PreviewDeck(){
 const [index,setIndex]=useState(slides[0]?.index??1);
 const [states,setStates]=useState<Record<string,Record<string,number|string|boolean>>>({});
 const spec=ECONOMIC_MATHEMATICS_SLIDES[index-1]!,definition=getEconomicMathematicsInteractionDefinition(spec);
 const [student,setStudent]=useState(false);
 const interaction=definition?{deckId:ECONOMIC_MATHEMATICS_DECK_ID,slideId:spec.slideKey,revision:1,values:{...definition.defaults,...states[spec.slideKey]}}:null;
 const frame={deckId:ECONOMIC_MATHEMATICS_DECK_ID,versionId:ECONOMIC_MATHEMATICS_VERSION_ID,slideId:spec.slideKey,index:spec.index,total:ECONOMIC_MATHEMATICS_SLIDES.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:"16:10" as const,title:spec.title,lessonNumber:spec.lesson,lessonTitle:spec.lessonTitle,section:spec.section,summary:spec.lead??spec.title};
 return <div className="em-preview"><nav><button onClick={()=>setIndex(Math.max(1,index-1))}>上一页</button><select aria-label="讲次" value={spec.lesson} onChange={e=>setIndex(ECONOMIC_MATHEMATICS_LESSONS[Number(e.target.value)-1]!.slideStart)}>{ECONOMIC_MATHEMATICS_LESSONS.map(l=><option key={l.number} value={l.number}>{l.number+" · "+l.title}</option>)}</select><label>全局页码 <input aria-label="全局页码" type="number" min="1" max={ECONOMIC_MATHEMATICS_SLIDES.length} value={index} onChange={e=>setIndex(Math.max(1,Math.min(ECONOMIC_MATHEMATICS_SLIDES.length,Number(e.target.value))))}/></label><button onClick={()=>setIndex(Math.min(ECONOMIC_MATHEMATICS_SLIDES.length,index+1))}>下一页</button><button onClick={()=>setStudent(!student)}>{student?"教师预览":"学生预览"}</button></nav><EconomicMathematicsSlideStage frame={frame} interaction={interaction} readOnly={student} onInteractionPatch={patch=>setStates({...states,[spec.slideKey]:{...interaction?.values,...patch}})} onInteractionReset={()=>setStates({...states,[spec.slideKey]:{...definition?.defaults}})}/></div>;
}
createRoot(root).render(metadataOnly ? null : query.get("preview")==="1"?<PreviewDeck/>:<ExportDeck />);

async function markReady() {
  await document.fonts.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  const images = Array.from(document.images);
  const imageFailures: string[] = [];
  await Promise.all(
    images.map(async (image) => {
      try {
        if (!image.complete) {
          await new Promise<void>((resolve, reject) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => reject(new Error(image.currentSrc || image.src)), {
              once: true
            });
          });
        }
        if (image.naturalWidth === 0) throw new Error(image.currentSrc || image.src);
        await image.decode().catch(() => undefined);
      } catch {
        imageFailures.push(image.currentSrc || image.src || "unknown-image");
      }
    })
  );

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  window.__ECON_PDF_READY__ = {
    ready: true,
    slideCount: slides.length,
    firstSlide: slides.at(0)?.index ?? 0,
    lastSlide: slides.at(-1)?.index ?? 0,
    imageFailures,
    sections: selectedLessons.map((lesson) => {
      const lessonSlides = slides.filter((slide) => slide.lesson === lesson.number);
      return {
        lesson: lesson.number,
        lessonTitle: lesson.title,
        slideCount: lessonSlides.length,
        firstSlide: lessonSlides.at(0)?.index ?? 0,
        lastSlide: lessonSlides.at(-1)?.index ?? 0
      };
    })
  };
  document.documentElement.dataset.pdfReady = "true";
}

void markReady();
