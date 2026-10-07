import type { EconomicMathematicsAuthoredSlide as Slide, EconomicMathematicsLessonDefinition as Lesson } from "./types.js";
import { ECONOMIC_MATHEMATICS_UNITS } from "./curriculum.js";

/** Supplies identities and metadata only. All teaching copy and page choices are authored explicitly. */
export function authoredLesson(number: number, title: string, coreQuestion: string, prerequisites: readonly string[], outcomes: readonly string[], route: NonNullable<Lesson["route"]>, pages: readonly Partial<Slide>[]): Lesson {
  const unit=ECONOMIC_MATHEMATICS_UNITS.find(u=>number>=u.lessonStart && number<=u.lessonEnd)!;
  if(route.reduce((s,r)=>s+r.minutes,0)!==90) throw new Error(`ECONOMIC_ROUTE_MINUTES:${number}`);
  const slides: Slide[]=pages.map((page,i)=>({
    slideKey:`em-v2-l${String(number).padStart(2,"0")}-p${String(i+1).padStart(3,"0")}`,
    compositionId:`editorial-v2-l${number}-p${i+1}`,
    section:"概念与应用",title:"",kicker:"",kind:"definition",visual:"formula-board",sourceLabel:"概念模型",accent:"ink",
    teachingCue:"依据当前公开材料讲解，保留学生独立思考时间。",assistantCue:"只解释当前公开内容，明确模型假设、变量单位与定义域。",
    ...page
  }));
  for(const s of slides) if(!s.title || !(s.body?.length || s.lead || s.formula || s.steps?.length || s.interactionId || s.table || s.image || s.plot || s.prompt)) throw new Error(`EMPTY_AUTHORED_PAGE:${s.slideKey}`);
  return {number,unit:unit.number,unitTitle:unit.title,title,hours:2,expectedSlides:slides.length,coreQuestion,exerciseCapability:outcomes.join("；"),prerequisites,outcomes,route,slides};
}

export function getEconomicMathematicsPresentationStep(slide: Pick<Slide,"steps">, values?: Readonly<Record<string,number|string|boolean>>): number {
  const n=values?.presentationStep;
  return typeof n === "number" && Number.isInteger(n) ? Math.max(0,Math.min(slide.steps?.length??0,n)) : 0;
}

export function economicVisibleCopy(slide: Slide, values?: Readonly<Record<string,number|string|boolean>>): string {
  const count=getEconomicMathematicsPresentationStep(slide,values);
  return [slide.title,slide.lead,...(slide.body??[]),slide.formula,slide.prompt,...(slide.table?.columns??[]),...(slide.table?.rows.flat()??[]),...(slide.steps??[]).slice(0,count).flatMap(s=>[s.title,s.text,s.formula])].filter(Boolean).join("\n");
}
