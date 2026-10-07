import {lesson01} from './lessons/lesson-01.js';
import {lesson02} from './lessons/lesson-02.js';
import {lesson03} from './lessons/lesson-03.js';
import {lesson04} from './lessons/lesson-04.js';
import {lesson05} from './lessons/lesson-05.js';
import {lesson06} from './lessons/lesson-06.js';
import {lesson07} from './lessons/lesson-07.js';
import {lesson08} from './lessons/lesson-08.js';
import {lesson09} from './lessons/lesson-09.js';
import {lesson10} from './lessons/lesson-10.js';
import {lesson11} from './lessons/lesson-11.js';
import {lesson12} from './lessons/lesson-12.js';
import {lesson13} from './lessons/lesson-13.js';
import {lesson14} from './lessons/lesson-14.js';
import {lesson15} from './lessons/lesson-15.js';
import {lesson16} from './lessons/lesson-16.js';
import type {MathematicsLesson,MathematicsSlide,OpeningFilm} from './types.js';
import {expandV2} from './v2/index.js';
export * from './types.js';
export * from './models.js';
export const INTERNATIONAL_MATHEMATICS_COURSE_ID='course-international-mathematics';
export const INTERNATIONAL_MATHEMATICS_DECK_ID='deck-international-mathematics-jacques-2026';
export const INTERNATIONAL_MATHEMATICS_VERSION_ID='release-international-mathematics-jacques-v2';
export const INTERNATIONAL_MATHEMATICS_TOTAL_HOURS=32;
export const INTERNATIONAL_MATHEMATICS_TITLE='Higher Mathematics: Calculus for Economics and Business';
const BASE_LESSONS:readonly MathematicsLesson[]=[lesson01,lesson02,lesson03,lesson04,lesson05,lesson06,lesson07,lesson08,lesson09,lesson10,lesson11,lesson12,lesson13,lesson14,lesson15,lesson16];
export const INTERNATIONAL_MATHEMATICS_DEFINITIONS:readonly MathematicsLesson[]=BASE_LESSONS.map(expandV2);
export const INTERNATIONAL_MATHEMATICS_SLIDES:readonly MathematicsSlide[]=INTERNATIONAL_MATHEMATICS_DEFINITIONS.flatMap((l,i)=>l.slides.map((s,j)=>({...s,index:INTERNATIONAL_MATHEMATICS_DEFINITIONS.slice(0,i).reduce((n,v)=>n+v.slides.length,0)+j+1,lesson:l.number,lessonTitle:l.title,localIndex:j+1,localTotal:l.slides.length})));
export const INTERNATIONAL_MATHEMATICS_LESSONS=INTERNATIONAL_MATHEMATICS_DEFINITIONS.map(l=>{const slides=INTERNATIONAL_MATHEMATICS_SLIDES.filter(s=>s.lesson===l.number),start=slides[0]!.index;return {number:l.number,kind:'lecture' as const,title:l.title,displayLabel:`Lesson ${l.number}`,slideStart:start,slideEnd:slides.at(-1)!.index,slideTotal:slides.length,coreSlideTotal:slides.filter(s=>!s.optionalChallenge).length,optionalSlideTotal:slides.filter(s=>s.optionalChallenge).length,practiceQuestionTotal:10,practiceDurationMinutes:20,teachingSchedule:[{kind:'teaching' as const,durationMinutes:45,hour:1 as const},{kind:'teaching' as const,durationMinutes:25,hour:2 as const},{kind:'practice' as const,durationMinutes:20,hour:2 as const}],hourRanges:l.hours?.map(h=>({...h,guide:undefined,slideStart:start+h.localStart-1,slideEnd:start+h.localEnd-1})),status:'ready' as const,sources:l.sources,textbookSections:l.sources.map(s=>s.section),printedPages:l.sources.map(s=>s.printedPages),pdfPages:l.sources.map(s=>s.pdfPages),outcomes:l.outcomes,completionStatus:l.hours?'complete' as const:'in-progress' as const};});
export const INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP=BASE_LESSONS.flatMap((l,i)=>l.slides.map((s,j)=>({v1Index:BASE_LESSONS.slice(0,i).reduce((n,b)=>n+b.slides.length,0)+j+1,slideKey:s.slideKey,lesson:l.number,v2Index:INTERNATIONAL_MATHEMATICS_SLIDES.find(v=>v.slideKey===s.slideKey)!.index})));
export function resolveInternationalMathematicsSavedPosition(version:string|undefined,index:number,key?:string){
 const byKey=key?INTERNATIONAL_MATHEMATICS_SLIDES.find(s=>s.slideKey===key):undefined;if(byKey)return byKey;
 if(version==='release-international-mathematics-jacques-v1'){const mapped=INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP.find(p=>p.v1Index===index);return mapped?INTERNATIONAL_MATHEMATICS_SLIDES.find(s=>s.slideKey===mapped.slideKey):undefined;}
 return Number.isInteger(index)&&index>=1&&index<=INTERNATIONAL_MATHEMATICS_SLIDES.length?INTERNATIONAL_MATHEMATICS_SLIDES[index-1]:undefined;
}
export const INTERNATIONAL_MATHEMATICS_FILMS:readonly OpeningFilm[]=INTERNATIONAL_MATHEMATICS_DEFINITIONS.map(l=>({id:`im-film-${String(l.number).padStart(2,'0')}`,lesson:l.number,title:l.filmTitle,question:l.openingQuestion,durationMs:90000,src:`/course-assets/international-mathematics/film/lesson-${String(l.number).padStart(2,'0')}-intro.mp4`,poster:`/course-assets/international-mathematics/art/lesson-${String(l.number).padStart(2,'0')}-opening.png`,captions:`/course-assets/international-mathematics/film/lesson-${String(l.number).padStart(2,'0')}-intro.vtt`,shots:l.film}));
export function getInternationalMathematicsSlide(index:number):MathematicsSlide {const safe=Math.max(1,Math.min(INTERNATIONAL_MATHEMATICS_SLIDES.length,Math.round(index)||1));return INTERNATIONAL_MATHEMATICS_SLIDES[safe-1]!;}
export const getInternationalMathematicsSlideByKey=(key:string)=>INTERNATIONAL_MATHEMATICS_SLIDES.find(s=>s.slideKey===key);
export function getInternationalMathematicsLessonPosition(index:number){const s=INTERNATIONAL_MATHEMATICS_SLIDES[index-1];if(!s)return null;const l=INTERNATIONAL_MATHEMATICS_LESSONS[s.lesson-1]!;return {globalIndex:index,lessonNumber:s.lesson,lessonStart:l.slideStart,lessonEnd:l.slideEnd,localIndex:s.localIndex,localTotal:s.localTotal};}
export function getInternationalMathematicsGlobalIndex(lesson:number,localIndex=1){if(!Number.isInteger(lesson)||!Number.isInteger(localIndex))return null;const l=INTERNATIONAL_MATHEMATICS_LESSONS.find(v=>v.number===lesson);return l&&localIndex>=1&&localIndex<=l.slideTotal?l.slideStart+localIndex-1:null;}
export function getInternationalMathematicsInteractionDefaults(key:string):Readonly<Record<string,string|number|boolean>>|null {
 const s=getInternationalMathematicsSlideByKey(key);if(!s)return null;const values:Record<string,string|number|boolean>={};
 if(s.question||s.answer)values.revealed=false;
 if(s.interaction)values[s.interaction.key]=s.interaction.initial;
 if(s.openingFilm)Object.assign(values,{playing:false,positionMs:0,anchorMs:0,runId:'initial'});
 return Object.keys(values).length?values:null;
}
export function validateInternationalMathematicsInteractionPatch(key:string,patch:Readonly<Record<string,string|number|boolean>>,current:Readonly<Record<string,string|number|boolean>>={}) {
 const s=getInternationalMathematicsSlideByKey(key),defaults=getInternationalMathematicsInteractionDefaults(key);if(!s||!defaults||!Object.keys(patch).length)return false;
 const values={...defaults,...current,...patch};for(const [k,v]of Object.entries(patch)){
  if(!(k in defaults))return false;
  if(k==='revealed'||k==='playing'){if(typeof v!=='boolean')return false;}
  else if(k==='runId'){if(typeof v!=='string'||v.length<1||v.length>80)return false;}
  else if(typeof v!=='number'||!Number.isFinite(v))return false;
 }
 if(s.interaction){const p=s.interaction,v=values[p.key];if(typeof v!=='number'||v<p.min||v>p.max||(p.key==='n'&&!Number.isInteger(v)))return false;}
 if(s.openingFilm&&(Number(values.positionMs)<0||Number(values.positionMs)>90000||Number(values.anchorMs)<0))return false;
 return true;
}
