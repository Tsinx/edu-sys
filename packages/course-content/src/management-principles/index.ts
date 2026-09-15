import pages from './pages.json' with {type:'json'};
import lessons from './lessons.json' with {type:'json'};
import type { ManagementSlide } from './types.js';
export * from './types.js';
export * from './interactions.js';
export const MANAGEMENT_COURSE_ID='management-principles';
export const MANAGEMENT_DECK_ID='deck-management-principles';
export const MANAGEMENT_VERSION_ID='management-principles-2026-v1';
export const MANAGEMENT_ATTRIBUTION='管理学课程组 · 韦笑';
export const MANAGEMENT_SLIDES=pages as ManagementSlide[];
export const MANAGEMENT_LESSONS=lessons.map(l=>({...l,status:'ready' as const}));
export function getManagementSlide(index:number):ManagementSlide {
  return MANAGEMENT_SLIDES[Math.max(1,Math.min(MANAGEMENT_SLIDES.length,Math.trunc(index)||1))-1]!;
}
export function getManagementSlideByKey(key:string){return MANAGEMENT_SLIDES.find(p=>p.slideKey===key);}
export function getManagementLessonPosition(index:number){
  if(!Number.isInteger(index)||index<1||index>MANAGEMENT_SLIDES.length)return null;
  const p=getManagementSlide(index),l=MANAGEMENT_LESSONS[p.lessonNumber-1]!;
  return {globalIndex:index,lessonNumber:p.lessonNumber,lessonStart:l.slideStart,lessonEnd:l.slideEnd,localIndex:p.localIndex,localTotal:p.localTotal};
}
export function getManagementGlobalIndex(lesson:number,local=1){
  const l=MANAGEMENT_LESSONS.find(x=>x.number===lesson);
  return l&&Number.isInteger(local)&&local>=1&&local<=l.slideTotal?l.slideStart+local-1:null;
}
