import { practicePackSchema, type PracticeGraph, type PracticeOptionId, type PracticePack, type PracticeQuestion, type PracticeSource } from "@edu/contracts";

/** Server-only authoring: never import this directory from a browser entry point. */
export interface PrivatePracticeQuestion extends PracticeQuestion {
  correctOptionId: PracticeOptionId; solution: string;
  optionExplanations: Record<PracticeOptionId, string>;
  verification: { expression: string; options: readonly string[] };
}
export interface PrivatePracticePack extends Omit<PracticePack, "questions"> { questions: PrivatePracticeQuestion[] }
export const book = "Jacques, Mathematics for Economics and Business, 9th edition (2018)" as const;
export function source(section: string, selection: string, subpart: string, printedPage: number, wordingAdaptation = "Selected task excerpted as a standalone choice question; instruction phrasing adapted, mathematical data retained.", optionAdaptation = "Four original options supplied for a written-response exercise."): PracticeSource {
  return { book, section, selection, subpart, printedPage, pdfPage: printedPage + 17, wordingAdaptation, optionAdaptation };
}
export function question(lesson: number, number: number, stem: string, options: readonly [string, string, string, string], correct: 0|1|2|3, solution: string, explanations: readonly [string, string, string, string], reference: PracticeSource, expression: string, checkOptions: readonly [string, string, string, string], graph?: PracticeGraph): PrivatePracticeQuestion {
  const ids: PracticeOptionId[] = ["A", "B", "C", "D"];
  const rank = number <= 3 ? 1 : number <= 6 ? 2 : number <= 9 ? 3 : 4;
  return { id: `im-practice-${String(lesson).padStart(2, "0")}-${String(number).padStart(2, "0")}`, version: "1.0.0", rank, optional: rank === 4, stem,
    options: options.map((text, i) => ({ id: ids[i]!, text })), source: reference, ...(graph ? { graph } : {}),
    correctOptionId: ids[correct]!, solution,
    optionExplanations: Object.fromEntries(explanations.map((text, i) => [ids[i], text])) as Record<PracticeOptionId, string>,
    verification: { expression, options: checkOptions } };
}
export function publicQuestion(q: PrivatePracticeQuestion): PracticeQuestion {
  return { id:q.id, version:q.version, rank:q.rank, optional:q.optional, stem:q.stem,
    options:q.options.map(o => ({id:o.id,text:o.text})), source:{...q.source}, ...(q.graph ? {graph:{...q.graph}} : {}) };
}
export function publicPack(p: PrivatePracticePack): PracticePack { return practicePackSchema.parse({...p, questions:p.questions.map(publicQuestion)}); }
export function pack(lesson: number, title: string, questions: PrivatePracticeQuestion[]): PrivatePracticePack {
  const p = { schemaVersion:1 as const, id:`im-ranked-practice-${String(lesson).padStart(2,"0")}`, version:"1.0.0", courseId:"course-international-mathematics", lesson,title,locale:"en" as const,durationMinutes:20 as const,questions };
  publicPack(p); return p;
}
