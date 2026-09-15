import { createRoot } from "react-dom/client";
import {
  ECONOMIC_MATHEMATICS_DECK_ID,
  ECONOMIC_MATHEMATICS_LESSONS,
  ECONOMIC_MATHEMATICS_SLIDES,
  getEconomicMathematicsInteractionDefinition
} from "../../packages/course-content/src/economic-mathematics/index.ts";
import { EconomicMathematicsTeachingSlides } from "../../apps/teacher-web/src/features/economic-mathematics/EconomicMathematicsTeachingSlides.tsx";
import "../../apps/teacher-web/node_modules/katex/dist/katex.min.css";
import "../../apps/teacher-web/src/features/economic-mathematics/economic-mathematics.css";
import "../../apps/teacher-web/src/features/economic-mathematics/art-directed/lesson-01-art.css";
import "../../apps/teacher-web/src/features/economic-mathematics/art-directed/lesson-02-art.css";
import "../../apps/teacher-web/src/features/economic-mathematics/art-directed/lesson-03-art.css";
import "../../apps/teacher-web/src/features/economic-mathematics/art-directed/lesson-04-art.css";
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
              values: { ...definition.defaults }
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
createRoot(root).render(metadataOnly ? null : <ExportDeck />);

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
