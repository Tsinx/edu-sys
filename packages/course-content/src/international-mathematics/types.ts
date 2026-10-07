export type Ink = 'ink' | 'blue' | 'coral' | 'green' | 'yellow' | 'muted' | 'paper';
export interface SourceReference { section: string; printedPages: [number, number]; pdfPages: [number, number]; supplement?: string; }
export interface Curve { kind: 'polynomial' | 'exponential' | 'logarithm' | 'power'; coefficients?: readonly number[]; scale?: number; rate?: number; shift?: number; power?: number; color?: Ink; label?: string; }
export interface PlotSpec {
  xRange: [number, number]; yRange: [number, number]; xLabel: string; yLabel: string;
  curves: readonly Curve[]; points?: readonly {x:number;y:number;label?:string}[];
  tangent?: {curve:number;x:number}; secant?: {curve:number;x:number;h:number};
  area?: {curve:number;from:number;to:number;baseline?:number};
  rectangles?: {curve:number;from:number;to:number;n:number};
  annotations?: readonly {x:number;y:number;text:string}[];
}
interface Positioned { x: number; y: number; w: number; h: number; }
export type SlideElement = Positioned & (
  | {kind:'text';text:string;size?:number;weight?:number;color?:Ink;align?:'left'|'center'|'right'}
  | {kind:'math';tex:string;size?:number;color?:Ink}
  | {kind:'image';asset:'opening'|'case'|'module';alt:string;rotation?:number}
  | {kind:'shape';shape:'rect'|'circle'|'line';color:Ink;rotation?:number;radius?:number}
  | {kind:'plot';plot:PlotSpec}
  | {kind:'table';columns:readonly string[];rows:readonly (readonly string[])[];highlightRow?:number}
  | {kind:'diagram';name:'machine'|'receipt'|'number-line'|'flow'|'balance'|'nested'|'steps';labels:readonly string[];values?:readonly string[]}
);
export interface LessonSlide {
  slideKey: string; compositionId: string; title: string; kicker: string;
  elements: readonly SlideElement[]; source: SourceReference; publicLabel?: 'Teaching scenario'|'Mathematical model'|'Worked example';
  optionalChallenge?: boolean; question?: string; answer?: string;
  teachingCue: string; assistantCue: string;
  interaction?: {kind:'parameter';key:'x'|'h'|'n'|'price'|'quantity';label:string;min:number;max:number;step:number;initial:number};
  openingFilm?: boolean;
  /** Teacher planning only; never serialized into student DOM attributes. */
  pedagogy?: {role:'scene'|'concept'|'worked-step'|'checkpoint'|'misconception'|'exit';sequence?:string;seconds?:number;hour?:1|2};
}
export interface TeachingHour {number:1|2;title:string;durationMinutes:45;coreSlides:number;localStart:number;localEnd:number;guide:string;}
export interface Exercise { id:string; question:string; answer:string; solution:string; optional?:boolean; }
export interface FilmShot { from:number;to:number;title:string;narration:string;caption:string;scene:string; }
export interface MathematicsLesson {
  number:number;title:string;filmTitle:string;openingQuestion:string;outcomes:readonly string[];
  vocabulary:readonly [string,string][];sources:readonly SourceReference[];
  slides:readonly LessonSlide[];exercises:readonly Exercise[];teacherGuide:string;
  film:readonly FilmShot[];
  hours?:readonly TeachingHour[];
}
export interface MathematicsSlide extends LessonSlide { index:number;lesson:number;lessonTitle:string;localIndex:number;localTotal:number; }
export interface OpeningFilm {id:string;lesson:number;title:string;question:string;durationMs:number;src:string;poster:string;captions:string;shots:readonly FilmShot[];}
